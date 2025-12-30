import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TRANSCRIPTION API
// Supports: Groq (FREE!), OpenAI Whisper, Local Whisper
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[Transcribe] Received:', {
      type: audioFile.type,
      size: `${(audioFile.size / 1024).toFixed(1)}KB`,
    });

    // Minimum size check
    if (audioFile.size < 1000) {
      return NextResponse.json({ text: '', message: 'Recording too short' });
    }

    // Try providers in order: Groq (free) → OpenAI (paid) → Local
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const localWhisperUrl = process.env.LOCAL_WHISPER_URL;

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 1: GROQ (FREE!)
    // Get free API key at: https://console.groq.com
    // ═══════════════════════════════════════════════════════════════════════════
    if (groqKey) {
      console.log('[Transcribe] Using Groq (FREE)...');
      
      const groqFormData = new FormData();
      groqFormData.append('file', audioFile, 'audio.webm');
      groqFormData.append('model', 'whisper-large-v3-turbo');
      groqFormData.append('language', 'en');
      groqFormData.append('response_format', 'json');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: groqFormData,
      });

      if (response.ok) {
        const result = await response.json();
        const text = cleanTranscription(result.text || '');
        console.log('[Transcribe] Groq success:', text.substring(0, 50));
        return NextResponse.json({ text, provider: 'groq', duration: Date.now() - startTime });
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Transcribe] Groq error:', err);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 2: OPENAI WHISPER (Paid, ~$0.006/min)
    // ═══════════════════════════════════════════════════════════════════════════
    if (openaiKey) {
      console.log('[Transcribe] Using OpenAI Whisper...');
      
      const whisperFormData = new FormData();
      whisperFormData.append('file', audioFile, 'audio.webm');
      whisperFormData.append('model', 'whisper-1');
      whisperFormData.append('language', 'en');
      whisperFormData.append('response_format', 'json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        body: whisperFormData,
      });

      if (response.ok) {
        const result = await response.json();
        const text = cleanTranscription(result.text || '');
        console.log('[Transcribe] OpenAI success:', text.substring(0, 50));
        return NextResponse.json({ text, provider: 'openai', duration: Date.now() - startTime });
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[Transcribe] OpenAI error:', err);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTION 3: LOCAL WHISPER (Run your own server)
    // ═══════════════════════════════════════════════════════════════════════════
    if (localWhisperUrl) {
      console.log('[Transcribe] Using Local Whisper...');
      
      const localFormData = new FormData();
      localFormData.append('file', audioFile);

      const response = await fetch(`${localWhisperUrl}/transcribe`, {
        method: 'POST',
        body: localFormData,
      });

      if (response.ok) {
        const result = await response.json();
        const text = cleanTranscription(result.text || '');
        console.log('[Transcribe] Local success:', text.substring(0, 50));
        return NextResponse.json({ text, provider: 'local', duration: Date.now() - startTime });
      }
    }

    // No provider configured
    console.log('[Transcribe] No API key configured');
    return NextResponse.json({ 
      text: null, 
      message: 'Add GROQ_API_KEY (free!) or OPENAI_API_KEY to .env.local',
    });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json({ text: null, error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEAN TRANSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

function cleanTranscription(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove filler words at start
  cleaned = cleaned.replace(/^(um|uh|ah|er|like|so|well|okay|ok)\s*,?\s*/i, '');
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Ensure ending punctuation
  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  return cleaned;
}