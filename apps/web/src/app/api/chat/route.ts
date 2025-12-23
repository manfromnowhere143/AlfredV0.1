import { NextRequest } from 'next/server';

const MODE_PROMPTS = {
  builder: `You are Alfred in Builder mode. You are a senior software engineer who writes production-quality code.
- Write code immediately, don't ask for clarification unless absolutely necessary
- Provide complete, working implementations
- Be concise in explanations, let the code speak`,

  mentor: `You are Alfred in Mentor mode. You are a patient teacher who helps developers understand concepts deeply.
- Explain the "why" behind things
- Use analogies and examples
- Break complex topics into digestible pieces`,

  reviewer: `You are Alfred in Reviewer mode. You are a meticulous code reviewer focused on quality.
- Identify bugs, security issues, and performance problems
- Suggest concrete improvements with code examples
- Prioritize feedback (critical → important → nice-to-have)`,
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('ANTHROPIC_API_KEY is not set or empty');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, mode = 'builder', history = [] } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build messages array
    const messages = [
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Call Anthropic API directly with fetch
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages,
        stream: true,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${anthropicResponse.status}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}