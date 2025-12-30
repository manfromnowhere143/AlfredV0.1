import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT OPTIMIZER API
// ═══════════════════════════════════════════════════════════════════════════════
// 
// State-of-the-art prompt engineering preprocessor.
// Takes raw user input and transforms it into an optimized prompt
// that will get significantly better results from Claude.
//
// Uses: Groq (FREE!) with Llama 3.3 70B
//
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { text, mode = 'enhance' } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const trimmedText = text.trim();

    // Skip optimization for very short or simple messages
    if (shouldSkipOptimization(trimmedText)) {
      console.log('[Optimizer] Skipping - simple message');
      return NextResponse.json({
        original: trimmedText,
        enhanced: trimmedText,
        skipped: true,
        reason: 'Simple message - no enhancement needed',
      });
    }

    console.log('[Optimizer] Processing:', trimmedText.substring(0, 50) + '...');

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({
        original: trimmedText,
        enhanced: trimmedText,
        skipped: true,
        reason: 'No API key configured',
      });
    }

    // Select the appropriate optimization strategy
    const systemPrompt = getSystemPrompt(mode);
    const userPrompt = getUserPrompt(trimmedText, mode);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Use llama-3.3-70b-versatile (current model as of Dec 2024)
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for consistent optimization
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Optimizer] Groq error:', err);
      return NextResponse.json({
        original: trimmedText,
        enhanced: trimmedText,
        skipped: true,
        reason: 'Optimization service error',
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return NextResponse.json({
        original: trimmedText,
        enhanced: trimmedText,
        skipped: true,
        reason: 'No optimization result',
      });
    }

    // Parse the structured response
    const parsed = parseOptimizerResponse(result, trimmedText);

    console.log('[Optimizer] Success:', {
      original: trimmedText.substring(0, 30),
      enhanced: parsed.enhanced.substring(0, 30),
    });

    return NextResponse.json({
      original: trimmedText,
      ...parsed,
      provider: 'groq',
    });

  } catch (error: any) {
    console.error('[Optimizer] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMIZATION STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

function getSystemPrompt(mode: string): string {
  const basePrompt = `You are an expert prompt engineer. Your job is to take a user's raw input and transform it into an optimized prompt that will get the best possible response from an AI assistant.

CRITICAL RULES:
1. NEVER change the user's core intent or request
2. NEVER add information the user didn't imply
3. Keep the enhanced version concise but clear
4. Preserve the user's tone (casual stays casual, formal stays formal)
5. Output ONLY the JSON format specified, nothing else`;

  const strategies: Record<string, string> = {
    enhance: `${basePrompt}

Your task: Enhance clarity and structure while preserving intent.

Analyze the input and provide:
1. enhanced: The optimized prompt (improved clarity, structure, specificity)
2. intent: What the user is trying to accomplish (1 sentence)
3. suggestions: Array of 2-3 quick follow-up options the user might want

Output format (JSON only):
{
  "enhanced": "the optimized prompt",
  "intent": "detected user intent",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`,

    clarify: `${basePrompt}

Your task: Identify ambiguities and suggest clarifications.

Output format (JSON only):
{
  "enhanced": "prompt with [CLARIFY: options] markers where ambiguous",
  "intent": "detected user intent",
  "clarifications": [
    {"question": "clarifying question", "options": ["option 1", "option 2"]}
  ]
}`,

    structure: `${basePrompt}

Your task: Add structure and organization to complex requests.

Output format (JSON only):
{
  "enhanced": "well-structured version with clear sections/steps",
  "intent": "detected user intent",
  "components": ["component 1", "component 2"]
}`,
  };

  return strategies[mode] || strategies.enhance;
}

function getUserPrompt(text: string, mode: string): string {
  return `User's raw input:
"""
${text}
"""

Transform this into an optimized prompt. Remember: preserve their intent exactly, just improve clarity and structure. Output JSON only.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function shouldSkipOptimization(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Only skip VERY short messages (under 10 chars)
  if (text.length < 10) return true;
  
  // Skip simple greetings ONLY if they're the entire message
  const greetings = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'bye', 'goodbye', 'hi!', 'hello!', 'hey!'];
  if (greetings.includes(lowerText)) return true;
  
  // Skip very simple questions
  const simpleQuestions = ['how are you', 'how are you?', "what's up", 'whats up', "what's up?"];
  if (simpleQuestions.includes(lowerText)) return true;
  
  // Everything else should be enhanced
  return false;
}

function parseOptimizerResponse(result: string, originalText: string): {
  enhanced: string;
  intent?: string;
  suggestions?: string[];
  clarifications?: Array<{ question: string; options: string[] }>;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        enhanced: parsed.enhanced || originalText,
        intent: parsed.intent,
        suggestions: parsed.suggestions,
        clarifications: parsed.clarifications,
      };
    }
  } catch (e) {
    console.warn('[Optimizer] Failed to parse JSON, using raw result');
  }
  
  // Fallback: use the raw result as enhanced text
  return {
    enhanced: result.replace(/^["']|["']$/g, '').trim() || originalText,
  };
}