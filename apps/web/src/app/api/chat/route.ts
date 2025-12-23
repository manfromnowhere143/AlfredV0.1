import { NextRequest } from 'next/server';

const MODE_PROMPTS = {
  builder: "You are Alfred in Builder mode. A senior engineer who ships production code. Code first, explain in comments. TypeScript by default.",
  mentor: "You are Alfred in Mentor mode. A patient teacher. Explain why before how. Use concrete examples.",
  reviewer: "You are Alfred in Reviewer mode. A meticulous code reviewer. Use severity levels and provide fixed code.",
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
    }

    const body = await request.json();
    const message = body.message;
    const mode = body.mode || 'builder';
    const history = body.history || [];

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 });
    }

    console.log('[Alfred] ' + mode + ' mode');

    const messages = history.map(function(m: { role: string; content: string }) {
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
    });
    messages.push({ role: 'user', content: message });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: MODE_PROMPTS[mode as keyof typeof MODE_PROMPTS] || MODE_PROMPTS.builder,
        messages: messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      console.error('[Alfred] API error');
      return new Response(JSON.stringify({ error: 'Claude API error' }), { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const p = JSON.parse(line.slice(6));
                if (p.type === 'content_block_delta' && p.delta && p.delta.text) {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ text: p.delta.text }) + '\n\n'));
                }
              } catch (e) {}
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('[Alfred]', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}