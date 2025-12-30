import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TRANSCRIPTION API
// Supports: Groq (FREE!), OpenAI Whisper
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Get audio from FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('[Transcribe] Received:', { 
      type: audioFile.type, 
      size: `${(audioFile.size / 1024).toFixed(1)}KB` 
    });

    // Get API keys
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 1: GROQ (FREE!)
    // ═══════════════════════════════════════════════════════════════════════════
    if (groqKey) {
      console.log('[Transcribe] Using Groq (FREE)...');
      
      const groqFormData = new FormData();
      groqFormData.append('file', audioFile, 'recording.webm');
      groqFormData.append('model', 'whisper-large-v3-turbo');
      groqFormData.append('response_format', 'json');
      groqFormData.append('language', 'en');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
        },
        body: groqFormData,
      });

      if (response.ok) {
        const data = await response.json();
        const text = cleanTranscription(data.text);
        console.log('[Transcribe] Groq success:', text.substring(0, 50));
        return NextResponse.json({ text, provider: 'groq' });
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Transcribe] Groq error:', err);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 2: OPENAI WHISPER ($0.006/min)
    // ═══════════════════════════════════════════════════════════════════════════
    if (openaiKey) {
      console.log('[Transcribe] Using OpenAI Whisper...');
      
      const openaiFormData = new FormData();
      openaiFormData.append('file', audioFile, 'recording.webm');
      openaiFormData.append('model', 'whisper-1');
      openaiFormData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: openaiFormData,
      });

      if (response.ok) {
        const data = await response.json();
        const text = cleanTranscription(data.text);
        console.log('[Transcribe] OpenAI success:', text.substring(0, 50));
        return NextResponse.json({ text, provider: 'openai' });
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Transcribe] OpenAI error:', err);
      }
    }

    // No provider available
    console.log('[Transcribe] No API key configured');
    return NextResponse.json({
      error: 'No transcription service configured',
      message: 'Add GROQ_API_KEY (free!) or OPENAI_API_KEY to .env.local',
    }, { status: 500 });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function cleanTranscription(text: string): string {
  if (!text) return '';
  
  return text
    // Remove filler words
    .replace(/\b(um|uh|er|ah|like,?\s*you know|you know,?\s*like)\b/gi, '')
    // Fix spacing
    .replace(/\s+/g, ' ')
    // Capitalize first letter
    .replace(/^\s*\w/, c => c.toUpperCase())
    // Add period if missing
    .replace(/([a-zA-Z])$/, '$1.')
    .trim();
}