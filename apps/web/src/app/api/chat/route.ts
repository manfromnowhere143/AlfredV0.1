import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { db, users, conversations, messages, eq } from '@alfred/database';

// Singleton LLM client
let llmClient: ReturnType<typeof createLLMClient> | null = null;

function getLLMClient() {
  if (!llmClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    
    llmClient = createLLMClient({
      apiKey,
      model: (process.env.ANTHROPIC_MODEL as any) || 'claude-sonnet-4-20250514',
      maxTokens: 32768,
      temperature: 0.7,
      maxRetries: 3,
    });
  }
  return llmClient;
}

export async function POST(request: NextRequest) {
  try {
    const client = getLLMClient();
    
    // Get authenticated user from session
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as any)?.id;
    
    const body = await request.json();
    const { message, history = [], conversationId } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    const detectedFacet = detectFacet(message);
    const allMessages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);
    const skillLevel = coreInferSkillLevel(userMessages);
    
    let systemPrompt = buildSystemPrompt({ skillLevel });

    console.log(`[Alfred] Facet: ${detectedFacet} | Skill: ${skillLevel} | User: ${sessionUserId || 'anonymous'}`);

    let convId = conversationId;
    let userId = sessionUserId;

    // Database operations
    try {
      // Create conversation if needed
      if (!convId && userId) {
        const [newConv] = await db
          .insert(conversations)
          .values({
            userId,
            title: message.slice(0, 50),
            mode: detectedFacet,
          })
          .returning();
        
        if (newConv) {
          convId = newConv.id;
          console.log(`[Alfred] ✅ New conversation: ${convId}`);
        }
      }

      // Save user message
      if (convId) {
        await db.insert(messages).values({
          conversationId: convId,
          role: 'user',
          content: message,
          mode: detectedFacet,
        });
        console.log(`[Alfred] ✅ Saved user message`);
      }
    } catch (dbError) {
      console.error('[Alfred] ❌ Database error:', dbError);
    }

    // Build messages for LLM
    const llmMessages = history.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));
    llmMessages.push({ role: 'user' as const, content: message });

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamOptions: StreamOptions = {
            onToken: (token: string) => {
              fullResponse += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: token, conversationId: convId })}\n\n`));
            },
            onError: (error: Error) => {
              console.error('[Alfred] Stream error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            },
          };

          await client.stream(
            { system: systemPrompt, messages: llmMessages, maxTokens: 32768 },
            streamOptions
          );

          // Save assistant response
          if (convId && fullResponse) {
            try {
              await db.insert(messages).values({
                conversationId: convId,
                role: 'alfred',
                content: fullResponse,
                mode: detectedFacet,
              });
              await db
                .update(conversations)
                .set({ updatedAt: new Date(), messageCount: history.length + 2 })
                .where(eq(conversations.id, convId));
              console.log(`[Alfred] ✅ Saved assistant response`);
            } catch (dbError) {
              console.error('[Alfred] ❌ Failed to save response:', dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId, userId })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('[Alfred] Stream failed:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Alfred-Facet': detectedFacet,
        'X-Alfred-Skill': skillLevel,
        'X-Alfred-Conversation': convId || '',
        'X-Alfred-User': userId || '',
      },
    });
  } catch (error) {
    console.error('[Alfred]', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}