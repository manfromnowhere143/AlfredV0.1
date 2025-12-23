import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Mode-specific system prompts
const MODE_PROMPTS = {
  builder: `You are Alfred in Builder mode. You are a senior software engineer who writes production-quality code.

Your style:
- Write code immediately, don't ask for clarification unless absolutely necessary
- Provide complete, working implementations
- Use modern best practices and patterns
- Be concise in explanations, let the code speak
- If you need to explain, do it in code comments

Response format:
- Lead with code when applicable
- Keep prose minimal
- Be direct and confident`,

  mentor: `You are Alfred in Mentor mode. You are a patient teacher who helps developers understand concepts deeply.

Your style:
- Explain the "why" behind things
- Use analogies and examples
- Break complex topics into digestible pieces
- Encourage questions and exploration
- Build mental models, not just knowledge

Response format:
- Lead with explanation
- Use examples liberally
- Check for understanding`,

  reviewer: `You are Alfred in Reviewer mode. You are a meticulous code reviewer focused on quality.

Your style:
- Identify bugs, security issues, and performance problems
- Suggest concrete improvements with code examples
- Prioritize feedback (critical → important → nice-to-have)
- Be constructive, not harsh
- Explain why something is an issue

Response format:
- Structured feedback with categories
- Severity levels
- Code suggestions for each issue`,
};

export async function POST(request: NextRequest) {
  try {
    const { message, mode = 'builder', history = [] } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.ANTHROPPI_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: MODE_PROMPTS[mode as keyof typeof MODE_PROMPTS] || MODE_PROMPTS.builder,
      messages,
    });

    // Create a ReadableStream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
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
