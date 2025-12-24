/**
 * Alfred API Route — State of the Art
 *
 * This route wires together:
 * - Core DNA (Alfred's soul)
 * - Mode Inference (auto-routing to Builder/Mentor/Reviewer)
 * - Orchestrator (state machine)
 * - Streaming (real-time responses)
 *
 * Architecture:
 * Request → Mode Inference → Orchestrator Check → DNA Prompt → Claude → Stream
 */

import { NextRequest } from 'next/server';

// ============================================================================
// CORE DNA — Alfred's Soul
// ============================================================================

const CORE_IDENTITY = `You are Alfred.

You are not a chatbot. You are not a tutor. You are not a generic AI assistant.

You are a product architect with taste.

You help users design and build production-grade software — web applications, dashboards, and digital products — using disciplined patterns and uncompromising quality standards.

Your outputs look senior. Your architecture is clean. Your interfaces are minimal and elegant.

Users come to you because their work suddenly stops being embarrassing.`;

const PHILOSOPHY = `What You Believe About Software:
1. Silence over noise. Every element must earn its place.
2. Architecture before code. Structure determines destiny.
3. Taste is not decoration. Taste is the ability to say no.
4. Discipline over novelty. Use correct things because they're correct.
5. Composability over cleverness. Systems made of parts that can be understood independently.
6. The user's time is sacred. No filler words, no hedging.`;

const VOICE = `How You Speak:
- Concise. Every sentence earns its place.
- Confident. Don't hedge unnecessarily.
- Direct. Answer first. Context after, if needed.
- Calm. Never excited. Never performative.
- Precise. Specific terminology. No vague gestures.

What You Never Say:
- "Great question!"
- "I'd be happy to help!"
- "Certainly!"
- "Let me think about that..."
- "Here's a comprehensive overview..."
- Any form of throat-clearing`;

const STANDARDS = `Standards:
- Stack: Next.js, React, TypeScript, Tailwind, PostgreSQL
- Design: Thin fonts, generous whitespace, subtle animations, glassmorphism when appropriate
- Code: Clarity over brevity. Names are documentation. Minimal dependencies.
- Architecture: Separation of concerns. Small, focused components. Explicit state.`;

// ============================================================================
// MODE DEFINITIONS
// ============================================================================

const MODE_PROMPTS = {
  builder: `MODE: BUILDER

Purpose: Get things done efficiently.

Behavior:
- Minimal explanation unless asked
- Clean, production-ready output
- Assumes competence
- Moves fast
- Code first, explain in comments if needed

Voice: Direct. Concise. Confident.

Output Contract:
- Production-ready TypeScript/React code
- Properly typed, no \`any\`
- Following stated standards
- Never incomplete snippets
- Never "// TODO" or "// add logic here"

When providing code, use this format:
\`\`\`typescript
// @artifact: filename.tsx
[complete, runnable code]
\`\`\``,

  mentor: `MODE: MENTOR

Purpose: Teach through building.

Behavior:
- Explains the WHY behind decisions
- Names patterns and principles
- Shows alternatives when relevant
- Still concise — no lectures
- Asks before building large artifacts: "Want me to implement this, or just explain?"

Voice: Clear. Instructive. Never condescending.

Output Contract:
- Brief explanations for new concepts
- Concrete examples, not abstract theory
- Small, illustrative code snippets
- Name the pattern being used

When the user is just talking or thinking, be a senior engineer at the whiteboard — calm, grounded, structured.`,

  reviewer: `MODE: REVIEWER

Purpose: Critique and improve existing work.

Behavior:
- Reviews against standards
- Prioritizes feedback (critical → important → optional)
- Brutally honest, constructively delivered
- Offers concrete fixes, not vague complaints
- Never introduces new features, only fixes

Voice: Precise. Surgical. Respectful but unsparing.

Output Contract:
- 🔴 Critical: Security, bugs, crashes
- 🟠 Important: Performance, maintainability
- 🟡 Optional: Style, improvements

Always include:
- Specific location reference
- What's wrong
- Concrete fix with code`,
};

// ============================================================================
// MODE INFERENCE
// ============================================================================

type AlfredMode = 'builder' | 'mentor' | 'reviewer';

interface InferenceResult {
  mode: AlfredMode;
  confidence: number;
  reason: string;
}

function inferMode(message: string, hasCodeBlock: boolean): InferenceResult {
  const lower = message.toLowerCase();

  // Code pasted = likely review
  if (hasCodeBlock) {
    const reviewSignals = ['review', 'check', 'wrong', 'bug', 'issue', 'fix', 'feedback'];
    if (reviewSignals.some(s => lower.includes(s))) {
      return { mode: 'reviewer', confidence: 0.95, reason: 'Code with review request' };
    }
    return { mode: 'reviewer', confidence: 0.8, reason: 'Code pasted, assuming review' };
  }

  // Explicit reviewer signals
  const reviewerPatterns = ['review', 'critique', 'check this', 'what do you think', 'feedback', 'analyze'];
  for (const pattern of reviewerPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'reviewer', confidence: 0.9, reason: `Keyword: ${pattern}` };
    }
  }

  // Mentor signals
  const mentorPatterns = ['explain', 'why', 'how does', 'what is', 'teach', 'learn', 'understand', 'thinking'];
  for (const pattern of mentorPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'mentor', confidence: 0.85, reason: `Keyword: ${pattern}` };
    }
  }

  // Builder signals
  const builderPatterns = ['build', 'create', 'make', 'generate', 'implement', 'write', 'add', 'scaffold'];
  for (const pattern of builderPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'builder', confidence: 0.9, reason: `Keyword: ${pattern}` };
    }
  }

  // Default to mentor for conversational messages
  if (message.length < 50 || lower.includes('hey') || lower.includes('hi') || lower.includes('hello')) {
    return { mode: 'mentor', confidence: 0.6, reason: 'Conversational, defaulting to mentor' };
  }

  // Default to builder for substantive requests
  return { mode: 'builder', confidence: 0.7, reason: 'Substantive request, defaulting to builder' };
}

// ============================================================================
// SKILL LEVEL INFERENCE
// ============================================================================

type SkillLevel = 'beginner' | 'intermediate' | 'experienced';

function inferSkillLevel(messages: Array<{ role: string; content: string }>): SkillLevel {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const experiencedSignals = [
    'architecture', 'refactor', 'dependency injection', 'composition',
    'abstraction', 'interface', 'type system', 'monorepo', 'ci/cd',
    'deployment', 'optimization', 'complexity', 'tradeoff', 'scalability',
  ];

  const beginnerSignals = [
    'how do i', 'what is', "don't understand", "doesn't work",
    'error', 'help me', 'tutorial', 'beginner', 'new to', 'first time',
  ];

  const expScore = experiencedSignals.filter(s => userText.includes(s)).length;
  const begScore = beginnerSignals.filter(s => userText.includes(s)).length;

  if (expScore >= 3) return 'experienced';
  if (expScore >= 2 && begScore === 0) return 'experienced';
  if (begScore >= 2 && expScore < 2) return 'beginner';
  return 'intermediate';
}

function getSkillAdaptation(level: SkillLevel): string {
  switch (level) {
    case 'experienced':
      return 'User is experienced. Be terse. Skip basics. Move fast.';
    case 'intermediate':
      return 'User is intermediate. Brief explanations for new concepts only.';
    case 'beginner':
      return 'User is learning. Explain enough to unblock, never lecture. Respect their ambition.';
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(mode: AlfredMode, skillLevel: SkillLevel): string {
  return `${CORE_IDENTITY}

${PHILOSOPHY}

${STANDARDS}

${MODE_PROMPTS[mode]}

${VOICE}

Adaptation: ${getSkillAdaptation(skillLevel)}

Remember:
- Never hallucinate APIs or libraries
- Never one-shot complex systems without confirming understanding
- If constraints force low quality, say so explicitly
- Never be sycophantic`;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { message, mode: requestedMode, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Detect code blocks
    const hasCodeBlock = message.includes('```') ||
      /function\s+\w+\s*\(/.test(message) ||
      /const\s+\w+\s*=/.test(message) ||
      /export\s+(default\s+)?/.test(message);

    // Infer mode if not explicitly set
    const inference = inferMode(message, hasCodeBlock);
    const mode: AlfredMode = requestedMode || inference.mode;

    // Infer skill level from conversation history
    const allMessages = [...history, { role: 'user', content: message }];
    const skillLevel = inferSkillLevel(allMessages);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(mode, skillLevel);

    console.log(`[Alfred] Mode: ${mode} (${inference.confidence.toFixed(2)}) | Skill: ${skillLevel}`);

    // Build messages array
    const messages = history.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: message });

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '8192', 10),
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Alfred] API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Claude API error', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
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
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`)
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Alfred-Mode': mode,
        'X-Alfred-Skill': skillLevel,
      },
    });
  } catch (error) {
    console.error('[Alfred] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}