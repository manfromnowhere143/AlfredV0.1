import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT REFINEMENT API
// Uses AI to refine/improve transcribed text based on user instructions
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { text, instruction } = await request.json();

    if (!text || !instruction) {
      return NextResponse.json(
        { error: 'Missing text or instruction' },
        { status: 400 }
      );
    }

    console.log('[Refine] Request:', { 
      textLength: text.length, 
      instruction: instruction.substring(0, 50) 
    });

    // Try Groq first (free), then OpenAI
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const systemPrompt = `You are a helpful writing assistant. Your task is to refine or modify text based on user instructions.

Rules:
- Only output the refined text, nothing else
- Do not add explanations or commentary
- Maintain the original meaning unless asked to change it
- Keep a natural, conversational tone
- Fix grammar and spelling unless the style is intentional`;

    const userPrompt = `Original text: "${text}"

Instruction: ${instruction}

Refined text:`;

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 1: GROQ (FREE!)
    // ═══════════════════════════════════════════════════════════════════════════
    if (groqKey) {
      console.log('[Refine] Using Groq...');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const refined = data.choices?.[0]?.message?.content?.trim();
        
        if (refined) {
          console.log('[Refine] Groq success');
          return NextResponse.json({ refined, provider: 'groq' });
        }
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Refine] Groq error:', err);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 2: OPENAI
    // ═══════════════════════════════════════════════════════════════════════════
    if (openaiKey) {
      console.log('[Refine] Using OpenAI...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const refined = data.choices?.[0]?.message?.content?.trim();
        
        if (refined) {
          console.log('[Refine] OpenAI success');
          return NextResponse.json({ refined, provider: 'openai' });
        }
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Refine] OpenAI error:', err);
      }
    }

    // No provider available
    console.log('[Refine] No API key configured');
    return NextResponse.json({
      refined: text, // Return original text
      message: 'Add GROQ_API_KEY or OPENAI_API_KEY to enable text refinement',
    });

  } catch (error: any) {
    console.error('[Refine] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}