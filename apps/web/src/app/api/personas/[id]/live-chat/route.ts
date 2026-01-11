/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/live-chat - REALTIME CONVERSATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * MODE: Rudy / Woody style
 * PURPOSE: Instant, realtime conversation
 * LATENCY: < 3 seconds
 * OUTPUT: Audio stream (no video)
 *
 * PIPELINE:
 * 1. Get text (from message or direct)
 * 2. Stream response immediately
 * 3. NO video generation
 * 4. NO waiting
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import Anthropic from "@anthropic-ai/sdk";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice mapping by archetype
const ARCHETYPE_VOICES: Record<string, string> = {
  sage: "ErXwobaYiN019PkySvjV",
  hero: "VR6AewLTigWG4xSOukaG",
  creator: "21m00Tcm4TlvDq8ikWAM",
  caregiver: "EXAVITQu4vr4xnSDxMaL",
  ruler: "ErXwobaYiN019PkySvjV",
  jester: "pNInz6obpgDQGcFmaJgB",
  rebel: "VR6AewLTigWG4xSOukaG",
  lover: "AZnzlk1XvdvUeBnXmlld",
  explorer: "TxGEqnHWrfWFTfGW9XjX",
  innocent: "MF3mGyEYCl7XYWbV9V6O",
  magician: "pFZP5JQG7iQjIQuC4Bku",
  outlaw: "VR6AewLTigWG4xSOukaG",
};

/**
 * POST /api/personas/[id]/live-chat
 *
 * Body:
 * - message: string (user message)
 * - sessionId?: string (optional session for context)
 *
 * Returns:
 * - audioUrl: string (audio data URL)
 * - text: string (what the persona said)
 * - latencyMs: number (time to first audio)
 * - emotion?: string (detected emotion)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: personaId } = await params;

  try {
    console.log(`\n[LiveChat] ═════════════════════════════════════════════════════`);
    console.log(`[LiveChat] Starting realtime chat for: ${personaId}`);

    // Get persona
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Get LLM response (optimized for speed)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[LiveChat] Getting LLM response...`);
    const llmStart = Date.now();

    const anthropic = new Anthropic();

    // Use Haiku for fastest response
    const llmResponse = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 200, // Shorter for speed
      system: `You are ${persona.name}, a ${persona.archetype || "wise"} persona.
Respond naturally in 1-2 sentences. Be engaging and in character.
Keep it brief and conversational.`,
      messages: [{ role: "user", content: message }],
    });

    const speechText = llmResponse.content[0].type === "text"
      ? llmResponse.content[0].text
      : "I understand.";

    const llmTime = Date.now() - llmStart;
    console.log(`[LiveChat] LLM done in ${llmTime}ms: "${speechText.slice(0, 60)}..."`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Generate voice FAST (no video)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[LiveChat] Generating voice...`);
    const voiceStart = Date.now();

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 });
    }

    const voiceId = persona.voiceId || ARCHETYPE_VOICES[persona.archetype || "sage"] || ARCHETYPE_VOICES.sage;

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: speechText,
          model_id: "eleven_turbo_v2", // Fastest model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error(`[LiveChat] ElevenLabs error:`, error);
      return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    const voiceTime = Date.now() - voiceStart;
    const totalTime = Date.now() - startTime;

    console.log(`[LiveChat] Voice done in ${voiceTime}ms`);
    console.log(`[LiveChat] ✅ Complete in ${totalTime}ms (LLM: ${llmTime}ms, Voice: ${voiceTime}ms)`);
    console.log(`[LiveChat] ═════════════════════════════════════════════════════`);

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      text: speechText,
      latencyMs: totalTime,
      timing: {
        llmMs: llmTime,
        voiceMs: voiceTime,
        totalMs: totalTime,
      },
      sessionId: sessionId || undefined,
    });

  } catch (error: any) {
    console.error(`[LiveChat] ❌ Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Live chat failed",
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
