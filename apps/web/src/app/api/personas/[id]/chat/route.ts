/**
 * /api/personas/[id]/chat - Chat with persona (streaming SSE)
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
// import { db } from '@alfred/database';
// import { PersonaRepository, PersonaService, buildPersonaSystemPrompt } from '@alfred/persona';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/personas/[id]/chat - Chat with persona (streaming)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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

    // TODO: Fetch persona and build system prompt
    // const repository = new PersonaRepository(db, db.schema);
    // const service = new PersonaService(repository);
    // const persona = await service.getById(...)
    // const systemPrompt = buildPersonaSystemPrompt({ persona, memories: [] });

    // Placeholder system prompt
    const systemPrompt = `You are a helpful AI persona. Your ID is ${personaId}.
    
Respond naturally and helpfully. Include emotion tags like [EMOTION:happy] or [EMOTION:thoughtful] 
to indicate your current emotional state during the response.

Stay in character and be engaging.`;

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