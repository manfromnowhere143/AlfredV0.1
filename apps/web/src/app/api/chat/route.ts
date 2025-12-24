import { NextRequest } from 'next/server';
import { inferMode, inferSkillLevel, getSystemPrompt, type AlfredMessage } from '@alfred/core';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key missing' }), { status: 500 });
    }

    const body = await request.json();
    const { message, mode: requestedMode, history = [] } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    // inferMode can return null, so handle that
    const inference = inferMode(message);
    const mode = requestedMode || inference?.mode || 'mentor';
    const confidence = inference?.confidence ?? 0.5;
    const reason = inference?.reason || 'Default fallback';
    
    const allMessages: AlfredMessage[] = [
      ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message }
    ];
    const skillLevel = inferSkillLevel(allMessages);
    const systemPrompt = getSystemPrompt(mode, { skillLevel });

    console.log(`[Alfred] Mode: ${mode} (${confidence.toFixed(2)}) | Skill: ${skillLevel} | Reason: ${reason}`);

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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`));
                }
              } catch {}
            }
          }
        }
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
        'X-Alfred-Reason': reason,
      },
    });
  } catch (error) {
    console.error('[Alfred]', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
