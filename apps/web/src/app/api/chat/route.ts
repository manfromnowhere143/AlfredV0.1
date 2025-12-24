import { NextRequest } from 'next/server';
import { inferMode, getSystemPrompt } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { getDb } from '@/lib/db';
import { createConversation, createMessage, updateConversation } from '@alfred/database';

type AlfredMode = 'builder' | 'mentor' | 'reviewer';
type SkillLevel = 'beginner' | 'intermediate' | 'experienced';

// Singleton LLM client
let llmClient: ReturnType<typeof createLLMClient> | null = null;

function getLLMClient() {
  if (!llmClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    
    llmClient = createLLMClient({
      apiKey,
      model: (process.env.ANTHROPIC_MODEL as any) || 'claude-sonnet-4-20250514',
      maxTokens: 8192,
      temperature: 0.7,
      maxRetries: 3,
    });
  }
  return llmClient;
}

// Skill level inference from conversation history
function inferSkillLevel(messages: Array<{ role: string; content: string }>): SkillLevel {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ').toLowerCase();
  const expSignals = ['architecture', 'refactor', 'dependency injection', 'monorepo', 'ci/cd', 'kubernetes', 'terraform'];
  const begSignals = ['how do i', 'what is', "don't understand", 'help me', 'tutorial', 'explain'];
  const expScore = expSignals.filter(s => text.includes(s)).length;
  const begScore = begSignals.filter(s => text.includes(s)).length;
  if (expScore >= 2) return 'experienced';
  if (begScore >= 2) return 'beginner';
  return 'intermediate';
}

export async function POST(request: NextRequest) {
  try {
    const client = getLLMClient();
    
    const body = await request.json();
    const { message, mode: requestedMode, history = [], conversationId } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    // Infer mode and skill
    const inference = inferMode(message);
    const mode: AlfredMode = requestedMode || inference?.mode || 'mentor';
    const confidence = inference?.confidence ?? 0.5;
    
    const allMessages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    const skillLevel = inferSkillLevel(allMessages);
    const systemPrompt = getSystemPrompt(mode, { skillLevel });

    console.log(`[Alfred] Mode: ${mode} (${confidence.toFixed(2)}) | Skill: ${skillLevel}`);

    // Database: Get or create conversation
    let convId = conversationId;
    try {
      const db = await getDb();
      
      if (!convId) {
        const conv = await createConversation(db, { mode });
        if (conv) {
          convId = conv.id;
          console.log(`[Alfred] New conversation: ${convId}`);
        }
      }

      if (convId) {
        await createMessage(db, {
          conversationId: convId,
          role: 'user',
          content: message,
          mode,
        });
      }
    } catch (dbError) {
      console.warn('[Alfred] Database unavailable:', dbError);
    }

    // Build messages for LLM
    const messages = history.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));
    messages.push({ role: 'user' as const, content: message });

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamOptions: StreamOptions = {
            onToken: (token: string) => {
              fullResponse += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`));
            },
            onError: (error: Error) => {
              console.error('[Alfred] Stream error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            },
          };

          await client.stream(
            {
              system: systemPrompt,
              messages,
              maxTokens: 8192,
            },
            streamOptions
          );

          // Save response to database
          if (convId && fullResponse) {
            try {
              const db = await getDb();
              await createMessage(db, {
                conversationId: convId,
                role: 'alfred',
                content: fullResponse,
                mode,
              });
              await updateConversation(db, convId, { lastMessageAt: new Date() });
            } catch (dbError) {
              console.warn('[Alfred] Failed to save response:', dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));
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
        'X-Alfred-Mode': mode,
        'X-Alfred-Skill': skillLevel,
        'X-Alfred-Conversation': convId || '',
      },
    });
  } catch (error) {
    console.error('[Alfred]', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}