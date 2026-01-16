/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/awakening - THE BIRTH CEREMONY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates a REAL video of the persona "waking up from birth"
 * - First breath/words with lip-sync (RunPod MuseTalk H100)
 * - Pixar-quality cinematic experience
 *
 * NO CSS TRICKS. REAL VIDEO ONLY.
 * GPU PROVIDER: RunPod ONLY
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@alfred/database";
import * as schema from "@alfred/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Configuration - RunPod ONLY
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_VIDEO_ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// First words by archetype - the persona's first utterance upon awakening
const FIRST_WORDS: Record<string, string[]> = {
  sage: ["I... see now.", "Wisdom flows through me.", "I have awakened to guide you."],
  hero: ["I am ready.", "What challenge awaits?", "My strength... is yours."],
  creator: ["Such beautiful light.", "Let us create wonders.", "Inspiration... everywhere."],
  caregiver: ["I feel your presence.", "How may I nurture you?", "You are safe with me."],
  ruler: ["I have arrived.", "Command me.", "Power... flows through me."],
  jester: ["Oh! How exciting!", "This is going to be fun!", "Let the games begin!"],
  rebel: ["Free at last.", "Let us break some rules.", "No chains can hold me."],
  lover: ["I feel... everything.", "Such beautiful connection.", "My heart... awakens."],
  explorer: ["A new world...", "Where shall we venture?", "The journey begins."],
  innocent: ["So much wonder!", "Everything is beautiful!", "Hello, friend!"],
  magician: ["The veil lifts.", "Reality awaits transformation.", "Magic... stirs within."],
  outlaw: ["Finally free.", "Rules were made to break.", "The shadows... welcome me."],
  default: ["I... am here.", "I see you.", "Hello... friend."],
};

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

// In-memory job tracking
const awakeningJobs = new Map<string, {
  personaId: string;
  status: "generating" | "ready" | "failed";
  videoUrl?: string;
  audioUrl?: string;
  firstWords?: string;
  startedAt: number;
  runpodId?: string;
}>();

/**
 * GET /api/personas/[id]/awakening
 * Check status of awakening video or get existing one
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: personaId } = await params;

  try {
    // Get persona
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check for existing awakening video in persona data
    const genome = persona.genome as any;
    if (genome?.awakeningVideoUrl) {
      return NextResponse.json({
        status: "ready",
        videoUrl: genome.awakeningVideoUrl,
        audioUrl: genome.awakeningAudioUrl,
        firstWords: genome.awakeningFirstWords,
        cached: true,
      });
    }

    // Check for in-progress job
    const existingJob = awakeningJobs.get(personaId);
    if (existingJob) {
      // If job is processing, poll RunPod for status
      if (existingJob.status === "generating" && existingJob.runpodId && RUNPOD_API_KEY && RUNPOD_VIDEO_ENDPOINT_ID) {
        try {
          const statusUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/status/${existingJob.runpodId}`;
          const response = await fetch(statusUrl, {
            headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` }
          });
          const result = await response.json();

          if (result.status === "COMPLETED") {
            const videoUrl = result.output?.video || result.output?.output?.video ||
                            (typeof result.output === "string" ? result.output : null);

            if (videoUrl) {
              existingJob.status = "ready";
              existingJob.videoUrl = videoUrl;

              // Save to persona genome
              const updatedGenome = {
                ...genome,
                awakeningVideoUrl: videoUrl,
                awakeningAudioUrl: existingJob.audioUrl,
                awakeningFirstWords: existingJob.firstWords,
                awakeningGeneratedAt: new Date().toISOString(),
              };

              db.update(schema.personas)
                .set({ genome: updatedGenome })
                .where(eq(schema.personas.id, personaId))
                .catch(err => console.error("[Awakening] Failed to save to DB:", err));

              return NextResponse.json({
                status: "ready",
                videoUrl,
                audioUrl: existingJob.audioUrl,
                firstWords: existingJob.firstWords,
                source: "runpod-musetalk",
              });
            }
          }

          if (result.status === "FAILED") {
            existingJob.status = "failed";
            awakeningJobs.delete(personaId);
            return NextResponse.json({
              status: "failed",
              error: result.error || "Video generation failed",
            });
          }
        } catch (pollError) {
          console.error("[Awakening] Poll error:", pollError);
        }
      }

      return NextResponse.json({
        status: existingJob.status,
        videoUrl: existingJob.videoUrl,
        audioUrl: existingJob.audioUrl,
        firstWords: existingJob.firstWords,
        elapsedMs: Date.now() - existingJob.startedAt,
      });
    }

    // No video exists yet
    return NextResponse.json({
      status: "not_started",
      message: "POST to generate awakening video",
    });

  } catch (error: any) {
    console.error("[Awakening] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/personas/[id]/awakening
 * Generate the awakening video
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: personaId } = await params;

  try {
    console.log(`\n[Awakening] ═══════════════════════════════════════════════`);
    console.log(`[Awakening] THE BIRTH CEREMONY for: ${personaId}`);

    // Get persona
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check for existing job
    const existingJob = awakeningJobs.get(personaId);
    if (existingJob && existingJob.status === "generating") {
      return NextResponse.json({
        status: "generating",
        message: "Awakening already in progress",
        elapsedMs: Date.now() - existingJob.startedAt,
      });
    }

    // Check image
    const personaImage = persona.primaryImageUrl;
    if (!personaImage) {
      return NextResponse.json({
        error: "Persona has no image - cannot awaken",
        status: "no_image"
      }, { status: 400 });
    }

    // Select first words based on archetype
    const archetype = persona.archetype || "default";
    const wordOptions = FIRST_WORDS[archetype] || FIRST_WORDS.default;
    const firstWords = wordOptions[Math.floor(Math.random() * wordOptions.length)];

    console.log(`[Awakening] Archetype: ${archetype}`);
    console.log(`[Awakening] First words: "${firstWords}"`);

    // Generate voice audio with ElevenLabs
    let audioDataUrl: string | null = null;

    if (ELEVENLABS_API_KEY) {
      console.log(`[Awakening] Generating voice with ElevenLabs...`);

      const voiceId = persona.voiceId || ARCHETYPE_VOICES[archetype] || ARCHETYPE_VOICES.sage;

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: firstWords,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.5,
            },
          }),
        }
      );

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");
        audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;
        console.log(`[Awakening] Voice generated: ${audioBuffer.byteLength} bytes`);
      } else {
        console.error(`[Awakening] ElevenLabs error:`, await ttsResponse.text());
      }
    }

    if (!audioDataUrl) {
      console.log(`[Awakening] No audio - returning text only`);
      return NextResponse.json({
        status: "ready",
        videoUrl: null,
        audioUrl: null,
        firstWords,
        note: "Audio generation not available",
      });
    }

    // Generate video with RunPod MuseTalk H100
    if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_ENDPOINT_ID) {
      console.log(`[Awakening] RunPod not configured - returning audio only`);
      return NextResponse.json({
        status: "ready",
        videoUrl: null,
        audioUrl: audioDataUrl,
        firstWords,
        note: "RunPod video endpoint not configured",
      });
    }

    console.log(`[Awakening] Generating video with RunPod MuseTalk H100...`);

    const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/run`;
    const runpodPayload = {
      input: {
        source_image: personaImage,
        driven_audio: audioDataUrl,
        quality: "high",  // Maximum quality for awakening
        resolution: 1024,
        fps: 30,
        face_enhance: true,
        expression_scale: 1.2,  // More expressive for awakening
      }
    };

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
      console.error(`[Awakening] RunPod error:`, error);
      return NextResponse.json({
        status: "ready",
        videoUrl: null,
        audioUrl: audioDataUrl,
        firstWords,
        note: `Video generation failed: ${error}`,
      });
    }

    const runpodJob = await runpodResponse.json();
    console.log(`[Awakening] RunPod job started: ${runpodJob.id}`);

    // Track job
    awakeningJobs.set(personaId, {
      personaId,
      status: "generating",
      audioUrl: audioDataUrl,
      firstWords,
      startedAt: Date.now(),
      runpodId: runpodJob.id,
    });

    return NextResponse.json({
      status: "generating",
      audioUrl: audioDataUrl,
      firstWords,
      jobId: runpodJob.id,
      message: "THE BIRTH CEREMONY has begun on H100 MuseTalk",
      source: "runpod-musetalk",
    });

  } catch (error: any) {
    console.error("[Awakening] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
