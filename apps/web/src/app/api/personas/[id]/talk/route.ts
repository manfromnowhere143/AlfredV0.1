/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/talk - LIVING PERSONA ENDPOINT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE DELIVERY PIPELINE:
 * 1. Receive text (or get LLM response)
 * 2. Generate voice with ElevenLabs
 * 3. Send to RunPod for lip-synced VIDEO
 * 4. Return VIDEO URL
 *
 * This is what makes the persona ALIVE - not CSS effects.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";
import Anthropic from "@anthropic-ai/sdk";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// RunPod configuration
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID || process.env.RUNPOD_ENDPOINT_ID;
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
 * POST /api/personas/[id]/talk
 *
 * Body:
 * - message: string (user message, will get LLM response)
 * - OR text: string (direct text to speak)
 * - quality: "fast" | "standard" | "high" (default: "standard")
 *
 * Returns:
 * - videoUrl: string (URL to the lip-synced video)
 * - text: string (what the persona said)
 * - audioUrl: string (audio URL)
 * - duration: number (video duration in seconds)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: personaId } = await params;

  try {
    console.log(`\n[Talk] ═══════════════════════════════════════════════`);
    console.log(`[Talk] Starting talk pipeline for persona: ${personaId}`);

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
    const { message, text: directText, quality = "standard" } = body;

    let speechText = directText;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Get text to speak (from LLM if message provided)
    // ═══════════════════════════════════════════════════════════════════════
    if (message && !directText) {
      console.log(`[Talk] Step 1: Getting LLM response for: "${message.slice(0, 50)}..."`);

      const anthropic = new Anthropic();
      const llmResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `You are ${persona.name}, a ${persona.archetype || "wise"} persona.
Respond naturally in 1-3 sentences. Be engaging and in character.
Do not use any special tags or formatting.`,
        messages: [{ role: "user", content: message }],
      });

      speechText = llmResponse.content[0].type === "text"
        ? llmResponse.content[0].text
        : "I understand.";

      console.log(`[Talk] LLM response: "${speechText.slice(0, 100)}..."`);
    }

    if (!speechText) {
      return NextResponse.json({ error: "No text to speak" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Generate voice with ElevenLabs
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[Talk] Step 2: Generating voice with ElevenLabs`);

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
          model_id: "eleven_turbo_v2",
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
      console.error(`[Talk] ElevenLabs error:`, error);
      return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`[Talk] Voice generated: ${audioBuffer.byteLength} bytes`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Call RunPod for lip-synced video
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[Talk] Step 3: Calling RunPod for lip-sync video`);

    if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
      // Fallback: Return audio only (no video)
      console.log(`[Talk] RunPod not configured - returning audio only`);
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText),
        timing: {
          totalMs: Date.now() - startTime,
        },
        note: "RunPod not configured - video generation unavailable",
      });
    }

    // Get persona image
    const personaImage = persona.primaryImageUrl;
    if (!personaImage) {
      console.log(`[Talk] No persona image - returning audio only`);
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText),
      });
    }

    // Submit job to RunPod
    const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`;
    console.log(`[Talk] Calling RunPod: ${runpodUrl}`);

    const runpodResponse = await fetch(runpodUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          job_type: "lipsync_only",
          job_id: `talk_${Date.now()}`,
          image: personaImage,
          audio: audioDataUrl,
          quality: quality,
        },
      }),
    });

    if (!runpodResponse.ok) {
      const error = await runpodResponse.text();
      console.error(`[Talk] RunPod error:`, error);
      // Fallback to audio only
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText),
        note: "RunPod video generation failed - audio only",
      });
    }

    const runpodResult = await runpodResponse.json();
    console.log(`[Talk] RunPod result:`, JSON.stringify(runpodResult).slice(0, 200));

    // Extract video URL
    let videoUrl = null;
    if (runpodResult.output?.video) {
      videoUrl = runpodResult.output.video;
    } else if (runpodResult.output?.output?.video) {
      videoUrl = runpodResult.output.output.video;
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Talk] ═══════════════════════════════════════════════`);
    console.log(`[Talk] Pipeline complete in ${totalTime}ms`);
    console.log(`[Talk] Video URL: ${videoUrl ? "YES" : "NO"}`);

    return NextResponse.json({
      success: true,
      text: speechText,
      audioUrl: audioDataUrl,
      videoUrl: videoUrl,
      duration: estimateDuration(speechText),
      timing: {
        totalMs: totalTime,
      },
    });

  } catch (error: any) {
    console.error(`[Talk] Error:`, error);
    return NextResponse.json(
      { error: "Talk pipeline failed", message: error.message },
      { status: 500 }
    );
  }
}

function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.ceil((words / 150) * 60); // ~150 words per minute
}
