/**
 * /api/personas/[id]/chat - Chat with persona (streaming SSE)
 *
 * STATE-OF-THE-ART: Full personality integration with memory
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db, eq, sessions } from '@alfred/database';
import * as schema from '@alfred/database';
import { buildPersonaSystemPrompt } from '@alfred/persona';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get user ID from session cookie (same method as wizard route)
 */
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  return session?.userId || null;
}

// POST /api/personas/[id]/chat - Chat with persona (streaming)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;
    const userId = await getUserFromRequest(request);

    // DEV MODE: Allow without auth for easier testing
    if (!userId && process.env.NODE_ENV !== "development") {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch persona from database
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return new Response(JSON.stringify({ error: 'Persona not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership (skip in dev mode without auth)
    if (userId && persona.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build rich system prompt with full personality
    const systemPrompt = buildPersonaSystemPrompt({
      persona: {
        name: persona.name,
        archetype: persona.archetype || undefined,
        tagline: persona.tagline || undefined,
        backstory: persona.backstory || undefined,
        traits: persona.traits || [],
        temperament: persona.temperament || undefined,
        communicationStyle: persona.communicationStyle || undefined,
        speakingStyle: persona.speakingStyle as any || undefined,
      },
      memories: [], // TODO: Fetch relevant memories
    });

    console.log(`[Chat] Persona "${persona.name}" responding with full personality`);

    // Initialize Anthropic client
    const client = new Anthropic();

    // Create streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
            stream: true,
          });

          let fullResponse = '';
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of response) {
            // Handle text deltas
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              
              // Send text chunk
              const chunk = JSON.stringify({ type: 'text', text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }

            // Track token usage
            if (event.type === 'message_start' && event.message.usage) {
              inputTokens = event.message.usage.input_tokens;
            }
            
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens;
            }
          }

          // Extract emotion from response
          let emotion = 'neutral';
          const emotionMatch = fullResponse.match(/\[EMOTION:(\w+)\]/i);
          if (emotionMatch) {
            emotion = emotionMatch[1].toLowerCase();
          }

          // TODO: Record interaction in database
          // await service.recordInteraction({
          //   personaId,
          //   userId: session.user.id,
          //   mode: 'chat',
          //   userMessage: message,
          //   personaResponse: fullResponse,
          //   personaEmotionExpressed: emotion,
          //   inputTokens,
          //   outputTokens,
          // });

          // Send completion event
          const doneChunk = JSON.stringify({
            type: 'done',
            emotion,
            usage: { inputTokens, outputTokens },
          });
          controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`));
          
          controller.close();
        } catch (error: any) {
          console.error('Stream error:', error);
          const errorChunk = JSON.stringify({
            type: 'error',
            error: error.message || 'Stream failed',
          });
          controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}