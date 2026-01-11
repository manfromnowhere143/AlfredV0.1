/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/make-video - CINEMATIC VIDEO GENERATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * MODE: TikTok / Medusa style
 * PURPOSE: Create polished, cinematic video with lip-sync
 * LATENCY: 60-90 seconds
 * OUTPUT: MP4 video URL
 *
 * PIPELINE:
 * 1. Get text (from message or direct)
 * 2. Generate voice (ElevenLabs)
 * 3. Generate lip-synced video (RunPod)
 * 4. Poll until complete
 * 5. Return video URL
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import Anthropic from "@anthropic-ai/sdk";
import { getRunPodClient } from "@/lib/video-studio/RunPodClient";

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
 * POST /api/personas/[id]/make-video
 *
 * Body:
 * - message: string (user message, will get LLM response)
 * - OR text: string (direct text to speak)
 * - quality: "fast" | "standard" | "high" (default: "standard")
 * - async: boolean (default: true) - Return jobId immediately instead of waiting
 *
 * Returns (async mode):
 * - jobId: string (poll with GET /api/personas/[id]/make-video/[jobId])
 * - text: string (what the persona said)
 * - audioUrl: string (audio URL)
 * - estimatedTimeMs: number
 *
 * Returns (sync mode):
 * - videoUrl: string (URL to the lip-synced video)
 * - text: string (what the persona said)
 * - audioUrl: string (audio URL)
 * - durationMs: number (total generation time)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const pipelineStart = Date.now();
  const { id: personaId } = await params;

  try {
    console.log(`\n[MakeVideo] ═════════════════════════════════════════════════════`);
    console.log(`[MakeVideo] Starting cinematic video generation for: ${personaId}`);

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
    const { message, text: directText, quality = "standard", async = true } = body;

    let speechText = directText;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Get text to speak (from LLM if message provided)
    // ═══════════════════════════════════════════════════════════════════════
    if (message && !directText) {
      console.log(`[MakeVideo] STEP 1/3: Getting LLM response...`);
      const llmStart = Date.now();

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

      console.log(`[MakeVideo] LLM done in ${Date.now() - llmStart}ms`);
      console.log(`[MakeVideo] Response: "${speechText.slice(0, 80)}..."`);
    }

    if (!speechText) {
      return NextResponse.json({ error: "No text to speak" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Generate voice with ElevenLabs
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[MakeVideo] STEP 2/3: Generating voice with ElevenLabs...`);
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
      console.error(`[MakeVideo] ElevenLabs error:`, error);
      return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`[MakeVideo] Voice done in ${Date.now() - voiceStart}ms (${audioBuffer.byteLength} bytes)`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Call RunPod for lip-synced video (with polling)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[MakeVideo] STEP 3/3: Generating lip-synced video with RunPod...`);
    const runpodStart = Date.now();

    // Get persona image
    const personaImage = persona.primaryImageUrl;
    if (!personaImage) {
      console.log(`[MakeVideo] No persona image - cannot generate video`);
      return NextResponse.json({
        success: false,
        error: "No persona image available",
        audioUrl: audioDataUrl,
        text: speechText,
      }, { status: 400 });
    }

    // Use RunPodClient
    const runpodClient = getRunPodClient();

    // ASYNC MODE - Return jobId immediately for frontend polling
    if (async) {
      console.log(`[MakeVideo] Submitting async job to RunPod...`);
      const jobId = `pf_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Submit job without waiting (fire and forget on server)
      runpodClient.lipSync({
        jobId,
        image: personaImage,
        audio: audioDataUrl,
        quality: quality as "fast" | "standard" | "high",
      }).catch((error) => {
        console.error(`[MakeVideo] Async job ${jobId} failed:`, error);
      });

      const totalTime = Date.now() - pipelineStart;
      console.log(`[MakeVideo] ✅ Job submitted: ${jobId}`);
      console.log(`[MakeVideo] Total time: ${totalTime}ms (async)`);
      console.log(`[MakeVideo] ═════════════════════════════════════════════════════`);

      return NextResponse.json({
        success: true,
        jobId,
        audioUrl: audioDataUrl,
        text: speechText,
        estimatedTimeMs: 120000, // 2 minutes estimated
        durationMs: totalTime,
      });
    }

    // SYNC MODE - Wait for completion (legacy behavior)
    console.log(`[MakeVideo] Submitting sync job to RunPod...`);
    const result = await runpodClient.lipSync({
      image: personaImage,
      audio: audioDataUrl,
      quality: quality as "fast" | "standard" | "high",
    });

    const runpodTime = Date.now() - runpodStart;
    console.log(`[MakeVideo] RunPod complete in ${runpodTime}ms`);

    if (!result.success || !result.output?.video) {
      console.error(`[MakeVideo] RunPod failed:`, result.error);
      return NextResponse.json({
        success: false,
        error: result.error || "Video generation failed",
        audioUrl: audioDataUrl,
        text: speechText,
      }, { status: 500 });
    }

    const videoUrl = result.output.video;
    const totalTime = Date.now() - pipelineStart;

    console.log(`[MakeVideo] ✅ SUCCESS!`);
    console.log(`[MakeVideo] Total time: ${totalTime}ms`);
    console.log(`[MakeVideo] Video URL: ${videoUrl.slice(0, 80)}...`);
    console.log(`[MakeVideo] ═════════════════════════════════════════════════════`);

    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      audioUrl: audioDataUrl,
      text: speechText,
      durationMs: totalTime,
      timing: {
        llmMs: message ? voiceStart - pipelineStart : 0,
        voiceMs: runpodStart - voiceStart,
        videoMs: runpodTime,
        totalMs: totalTime,
      },
    });

  } catch (error: any) {
    console.error(`[MakeVideo] ❌ Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Video generation pipeline failed",
        message: error.message
      },
      { status: 500 }
    );
  }
}
