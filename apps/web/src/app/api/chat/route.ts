import { NextRequest } from 'next/server';
import { detectFacet, buildSystemPrompt, inferSkillLevel as coreInferSkillLevel, type Facet, type SkillLevel } from '@alfred/core';
import { createLLMClient, type StreamOptions } from '@alfred/llm';
import { getDb } from '@/lib/db';
import { createConversation, createMessage, updateConversation, getOrCreateUser } from '@alfred/database';
import { recordSkillSignals, recordStackPreferences, getContextForPrompt } from '@/lib/memory-service';
import { buildRAGContext } from '@/lib/rag-service';

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

export async function POST(request: NextRequest) {
  try {
    const client = getLLMClient();
    
    const body = await request.json();
    const { message, history = [], conversationId, userId: clientUserId } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    // Detect facet from message (unified mind)
    const detectedFacet = detectFacet(message);
    
    const allMessages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];
    
    // Use core's skill inference
    const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);
    const skillLevel = coreInferSkillLevel(userMessages);
    
    // Build system prompt with facet-aware config
    let systemPrompt = buildSystemPrompt({ 
      skillLevel,
    });

    console.log(`[Alfred] Facet: ${detectedFacet} | Skill: ${skillLevel}`);

    // Database operations
    let convId = conversationId;
    let userId = clientUserId;

    try {
      const db = await getDb();
      
      // Get or create user
      if (!userId) {
        const user = await getOrCreateUser(db, { externalId: 'anonymous' });
        if (user) {
          userId = user.id;
        }
      }

      // Get user context from memory
      if (userId) {
        try {
          const userContext = await getContextForPrompt(db, userId);
          if (userContext) {
            systemPrompt += userContext;
            console.log('[Alfred] Added user context to prompt');
          }
        } catch (memError) {
          console.warn('[Alfred] Memory context unavailable:', memError);
        }
      }

      // Get RAG context
      try {
        const ragContext = await buildRAGContext(db, message);
        if (ragContext) {
          systemPrompt += ragContext;
          console.log('[Alfred] Added RAG context to prompt');
        }
      } catch (ragError) {
        console.warn('[Alfred] RAG context unavailable:', ragError);
      }

      // Create conversation if needed
      if (!convId) {
        const conv = await createConversation(db, { 
          mode: detectedFacet,
          userId: userId || undefined,
        });
        if (conv) {
          convId = conv.id;
          console.log(`[Alfred] New conversation: ${convId}`);
        }
      }

      // Save user message
      if (convId) {
        const savedMsg = await createMessage(db, {
          conversationId: convId,
          role: 'user',
          content: message,
          mode: detectedFacet,
        });

        // Record skill signals and stack preferences (async, don't wait)
        if (userId) {
          recordSkillSignals(db, userId, message, convId, savedMsg?.id).catch(e => 
            console.warn('[Alfred] Failed to record skill signals:', e)
          );
          recordStackPreferences(db, userId, message, convId).catch(e =>
            console.warn('[Alfred] Failed to record stack preferences:', e)
          );
        }
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
              // IMPORTANT: Frontend expects { content: ... } not { text: ... }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: token, conversationId: convId })}\n\n`));
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
                mode: detectedFacet,
              });
              await updateConversation(db, convId, { lastMessageAt: new Date() });
            } catch (dbError) {
              console.warn('[Alfred] Failed to save response:', dbError);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            conversationId: convId,
            userId,
          })}\n\n`));
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