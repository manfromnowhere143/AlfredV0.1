import { NextRequest } from 'next/server';
import { inferMode, getSystemPrompt } from '@alfred/core';
import { getDb } from '@/lib/db';
import { createConversation, createMessage, updateConversation } from '@alfred/database';

type AlfredMode = 'builder' | 'mentor' | 'reviewer';
type SkillLevel = 'beginner' | 'intermediate' | 'experienced';

// Local skill inference (simpler than core version)
function inferSkillLevel(messages: Array<{ role: string; content: string }>): SkillLevel {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ').toLowerCase();
  const expSignals = ['architecture', 'refactor', 'dependency injection', 'monorepo', 'ci/cd'];
  const begSignals = ['how do i', 'what is', "don't understand", 'help me', 'tutorial'];
  const expScore = expSignals.filter(s => text.includes(s)).length;
  const begScore = begSignals.filter(s => text.includes(s)).length;
  if (expScore >= 2) return 'experienced';
  if (begScore >= 2) return 'beginner';
  return 'intermediate';
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key missing' }), { status: 500 });
    }

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

    // Build messages for Claude
    const messages = history.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Claude API error' }), { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const line of decoder.decode(value).split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  const text = data.delta.text;
                  fullResponse += text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {}
            }
          }
        }

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
