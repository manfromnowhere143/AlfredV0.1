/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/talk - LIVING PERSONA VIDEO GENERATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REAL video generation with lip-sync.
 *
 * PROVIDERS (in order of preference):
 * 1. Replicate (SadTalker) - WORKING, real lip-sync
 * 2. RunPod (MuseTalk) - Requires deployed handler
 *
 * PIPELINE:
 * 1. Get text (from LLM or direct)
 * 2. Generate voice with ElevenLabs
 * 3. Generate REAL lip-sync video
 * 4. Return video URL
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

// Configuration
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_VIDEO_ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Video provider preference: "replicate" (working) or "runpod" (needs handler fix)
const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER || "replicate";

// In-memory job tracking for async polling
const activeJobs = new Map<string, {
  provider: "runpod" | "replicate";
  jobId: string;
  personaId: string;
  startedAt: number;
}>();

// ═══════════════════════════════════════════════════════════════════════════════
// REPLICATE LIP-SYNC - Real working lip-sync using SadTalker
// ═══════════════════════════════════════════════════════════════════════════════

async function generateVideoWithReplicate(
  imageUrl: string,
  audioDataUrl: string,
  quality: string
): Promise<{ videoUrl: string | null; jobId?: string; error?: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { videoUrl: null, error: "REPLICATE_API_TOKEN not configured" };
  }

  console.log(`[Talk] 🎬 Using Replicate SadTalker for REAL lip-sync`);

  try {
    // SadTalker model on Replicate
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // SadTalker model - produces real lip-sync videos
        version: "cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
        input: {
          source_image: imageUrl,
          driven_audio: audioDataUrl,
          enhancer: quality === "high" ? "gfpgan" : null,
          preprocess: "crop",
          still_mode: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Talk] Replicate error:`, error);
      return { videoUrl: null, error: `Replicate failed: ${error}` };
    }

    const prediction = await response.json();
    console.log(`[Talk] Replicate prediction started: ${prediction.id}`);

    // Poll for completion (Replicate predictions can complete quickly)
    const videoUrl = await pollReplicateUntilComplete(prediction.id, 120000);

    return { videoUrl, jobId: prediction.id };
  } catch (err: any) {
    console.error(`[Talk] Replicate error:`, err);
    return { videoUrl: null, error: err.message };
  }
}

async function pollReplicateUntilComplete(
  predictionId: string,
  timeoutMs: number
): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
        }
      );

      if (!response.ok) {
        console.error(`[Talk] Replicate poll error: ${response.status}`);
        await sleep(pollInterval);
        continue;
      }

      const prediction = await response.json();
      console.log(`[Talk] Replicate status: ${prediction.status}`);

      if (prediction.status === "succeeded") {
        // SadTalker returns video URL in output
        const videoUrl = prediction.output;
        console.log(`[Talk] ✅ Replicate SUCCEEDED! Video URL: ${videoUrl?.slice(0, 80)}...`);
        return typeof videoUrl === "string" ? videoUrl : null;
      }

      if (prediction.status === "failed") {
        console.error(`[Talk] Replicate failed:`, prediction.error);
        return null;
      }

      if (prediction.status === "canceled") {
        console.error(`[Talk] Replicate canceled`);
        return null;
      }

      // Still processing - wait and poll again
      await sleep(pollInterval);
    } catch (err) {
      console.error(`[Talk] Replicate poll error:`, err);
      await sleep(pollInterval);
    }
  }

  console.error(`[Talk] Replicate timed out after ${timeoutMs}ms`);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════

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
 * - message: string (user message → LLM response)
 * - text: string (direct text to speak)
 * - directAudio: string (base64 audio, skip TTS)
 * - quality: "fast" | "standard" | "high"
 * - sync: boolean (wait for video or return immediately)
 *
 * Returns:
 * - videoUrl: string (lip-synced video from H100)
 * - audioUrl: string (ElevenLabs audio)
 * - text: string (what persona said)
 * - jobId: string (for async polling)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: personaId } = await params;

  try {
    console.log(`\n[Talk] ═══════════════════════════════════════════════`);
    console.log(`[Talk] RunPod MuseTalk H100 pipeline starting for: ${personaId}`);

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
    const {
      message,
      text: directText,
      directAudio,
      quality = "standard",
      sync = true
    } = body;

    let speechText = directText;
    let audioDataUrl: string | null = null;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Get text (from LLM if needed)
    // ═══════════════════════════════════════════════════════════════════════
    if (message && !directText) {
      console.log(`[Talk] Step 1: Getting LLM response...`);

      const anthropic = new Anthropic();
      const llmResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `You are ${persona.name}, a ${persona.archetype || "wise"} persona.
Respond naturally in 1-3 sentences. Be engaging and in character.
Keep responses concise for video generation. No special formatting.`,
        messages: [{ role: "user", content: message }],
      });

      speechText = llmResponse.content[0].type === "text"
        ? llmResponse.content[0].text
        : "I understand.";

      console.log(`[Talk] LLM: "${speechText.slice(0, 80)}..."`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Generate voice with ElevenLabs
    // ═══════════════════════════════════════════════════════════════════════
    if (directAudio) {
      console.log(`[Talk] Step 2: Using provided audio`);
      audioDataUrl = directAudio.startsWith("data:") ? directAudio : `data:audio/mpeg;base64,${directAudio}`;
    } else if (speechText && ELEVENLABS_API_KEY) {
      console.log(`[Talk] Step 2: Generating ElevenLabs voice...`);

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
      audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

      console.log(`[Talk] Voice: ${audioBuffer.byteLength} bytes`);
    }

    if (!audioDataUrl) {
      return NextResponse.json({
        error: "No audio generated",
        text: speechText || null,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Generate REAL lip-sync video
    // Provider: Replicate (SadTalker) - WORKING real lip-sync
    // Fallback: RunPod (if configured and Replicate fails)
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`[Talk] Step 3: Generating REAL lip-sync video...`);
    console.log(`[Talk] Video provider preference: ${VIDEO_PROVIDER}`);

    const personaImage = persona.primaryImageUrl;
    if (!personaImage) {
      console.log(`[Talk] No image - returning audio only`);
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText || ""),
        note: "No persona image available",
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Try Replicate first (SadTalker - WORKING real lip-sync)
    // ─────────────────────────────────────────────────────────────────────────
    if (REPLICATE_API_TOKEN && (VIDEO_PROVIDER === "replicate" || !RUNPOD_API_KEY)) {
      console.log(`[Talk] 🎬 Using Replicate SadTalker for REAL lip-sync`);

      const replicateResult = await generateVideoWithReplicate(
        personaImage,
        audioDataUrl,
        quality
      );

      if (replicateResult.videoUrl) {
        const totalTime = Date.now() - startTime;
        console.log(`[Talk] ═══════════════════════════════════════════════`);
        console.log(`[Talk] ✅ Pipeline complete in ${totalTime}ms`);
        console.log(`[Talk] Video URL: ${replicateResult.videoUrl?.slice(0, 60)}...`);
        console.log(`[Talk] Provider: Replicate SadTalker`);

        return NextResponse.json({
          success: true,
          text: speechText,
          audioUrl: audioDataUrl,
          videoUrl: replicateResult.videoUrl,
          duration: estimateDuration(speechText || ""),
          source: "replicate-sadtalker",
          timing: { totalMs: totalTime },
        });
      }

      // Replicate failed - log but continue to try RunPod
      console.log(`[Talk] Replicate failed: ${replicateResult.error}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fallback: RunPod MuseTalk (if configured)
    // ─────────────────────────────────────────────────────────────────────────
    if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_ENDPOINT_ID) {
      console.log(`[Talk] No video provider available - returning audio only`);
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText || ""),
        note: "No video provider configured (set REPLICATE_API_TOKEN or RUNPOD_VIDEO_ENDPOINT_ID)",
      });
    }

    console.log(`[Talk] Trying RunPod MuseTalk as fallback...`);

    try {
      // H100 optimized settings for maximum quality
      const runpodPayload = {
        input: {
          source_image: personaImage,
          driven_audio: audioDataUrl,
          // MuseTalk H100 settings
          quality: quality === "fast" ? "draft" : quality === "high" ? "high" : "standard",
          resolution: quality === "high" ? 1024 : 512,
          fps: 30,
          face_enhance: true,  // GFPGAN post-processing
          upscale: quality === "high",  // Real-ESRGAN for high quality
        }
      };

      console.log(`[Talk] 🚀 RunPod MuseTalk SETTINGS:`);
      console.log(`[Talk]    Quality: ${runpodPayload.input.quality}`);
      console.log(`[Talk]    Resolution: ${runpodPayload.input.resolution}px`);
      console.log(`[Talk]    FPS: ${runpodPayload.input.fps}`);
      console.log(`[Talk]    Face Enhance: ${runpodPayload.input.face_enhance}`);

      const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/run`;
      const runpodResponse = await fetch(runpodUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RUNPOD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(runpodPayload),
      });

      if (!runpodResponse.ok) {
        const error = await runpodResponse.text();
        console.error(`[Talk] RunPod error:`, error);
        throw new Error(`RunPod failed: ${error}`);
      }

      const runpodJob = await runpodResponse.json();
      console.log(`[Talk] RunPod job started: ${runpodJob.id}, status: ${runpodJob.status}`);

      // If sync mode requested, poll for completion
      if (sync) {
        const videoUrl = await pollRunPodUntilComplete(runpodJob.id, 120000); // 2 min timeout

        const totalTime = Date.now() - startTime;
        console.log(`[Talk] ═══════════════════════════════════════════════`);
        console.log(`[Talk] Pipeline complete in ${totalTime}ms`);
        console.log(`[Talk] Video URL: ${videoUrl ? "YES" : "NO"}`);
        console.log(`[Talk] Quality Level: H100 MuseTalk (${quality})`);

        return NextResponse.json({
          success: true,
          text: speechText,
          audioUrl: audioDataUrl,
          videoUrl: videoUrl,
          duration: estimateDuration(speechText || ""),
          source: "runpod-musetalk",
          timing: { totalMs: totalTime },
        });
      }

      // Async mode - store job and return immediately
      activeJobs.set(runpodJob.id, {
        provider: "runpod",
        jobId: runpodJob.id,
        personaId,
        startedAt: Date.now(),
      });

      const totalTime = Date.now() - startTime;
      console.log(`[Talk] Async job started in ${totalTime}ms: ${runpodJob.id}`);

      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        jobId: runpodJob.id,
        status: "processing",
        source: "runpod-musetalk",
        duration: estimateDuration(speechText || ""),
        timing: { totalMs: totalTime },
      });

    } catch (runpodError: any) {
      console.error(`[Talk] RunPod error:`, runpodError.message);
      // Return audio only on failure
      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        text: speechText,
        audioUrl: audioDataUrl,
        videoUrl: null,
        duration: estimateDuration(speechText || ""),
        note: `Video generation failed: ${runpodError.message}`,
        timing: { totalMs: totalTime },
      });
    }

  } catch (error: any) {
    console.error(`[Talk] Error:`, error);
    return NextResponse.json(
      { error: "Talk pipeline failed", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/personas/[id]/talk?jobId=xxx
 * Check status of async video generation job (RunPod only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: personaId } = await params;
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Check if we have this job tracked
  const trackedJob = activeJobs.get(jobId);

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // RunPod job status check
    // ─────────────────────────────────────────────────────────────────────────
    if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_ENDPOINT_ID) {
      return NextResponse.json({ error: "RunPod not configured" }, { status: 500 });
    }

    const statusUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/status/${jobId}`;

    const response = await fetch(statusUrl, {
      headers: { "Authorization": `Bearer ${RUNPOD_API_KEY}` },
    });

    if (response.ok) {
      const result = await response.json();

      console.log(`[Talk] Job ${jobId.slice(0, 8)}... status: ${result.status}`);

      if (result.status === "COMPLETED") {
        const videoUrl = result.output?.video || result.output?.output?.video || result.output;
        console.log(`[Talk] ✅ Job COMPLETED!`);
        activeJobs.delete(jobId);
        return NextResponse.json({
          status: "completed",
          videoUrl: typeof videoUrl === "string" ? videoUrl : null,
          output: result.output,
          source: "runpod-musetalk",
        });
      }

      if (result.status === "FAILED") {
        console.log(`[Talk] ❌ Job FAILED: ${result.error}`);
        activeJobs.delete(jobId);
        return NextResponse.json({
          status: "failed",
          error: result.error || "Video generation failed",
          source: "runpod-musetalk",
        });
      }

      // Still processing
      const elapsed = trackedJob ? Date.now() - trackedJob.startedAt : 0;
      return NextResponse.json({
        status: "processing",
        jobId: jobId,
        elapsedMs: elapsed,
        runpodStatus: result.status,
        source: "runpod-musetalk",
      });
    }

    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  } catch (error: any) {
    console.error(`[Talk] Status check error:`, error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}

/**
 * Poll RunPod until job completes or times out
 */
async function pollRunPodUntilComplete(jobId: string, timeoutMs: number): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    try {
      const statusUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/status/${jobId}`;
      const response = await fetch(statusUrl, {
        headers: { "Authorization": `Bearer ${RUNPOD_API_KEY}` },
      });

      if (!response.ok) {
        console.error(`[Talk] RunPod poll error: ${response.status}`);
        await sleep(pollInterval);
        continue;
      }

      const result = await response.json();
      console.log(`[Talk] RunPod status: ${result.status}`);

      if (result.status === "COMPLETED") {
        // Extract video URL from various possible output formats
        const videoUrl = result.output?.video || result.output?.output?.video ||
                        (typeof result.output === "string" ? result.output : null);
        return videoUrl;
      }

      if (result.status === "FAILED") {
        console.error(`[Talk] RunPod job failed:`, result.error);
        return null;
      }

      // Still processing - wait and poll again
      await sleep(pollInterval);
    } catch (err) {
      console.error(`[Talk] Poll error:`, err);
      await sleep(pollInterval);
    }
  }

  console.error(`[Talk] RunPod timed out after ${timeoutMs}ms`);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.ceil((words / 150) * 60); // ~150 words per minute
}
