/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/idle-video - REAL Idle Video Generation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * REAL video generation for idle animation (subtle breathing, blinking).
 * Uses RunPod H100 with MuseTalk - NO FALLBACKS.
 *
 * Pipeline:
 * 1. Get persona image
 * 2. Generate silent audio (breathing rhythm)
 * 3. Send to RunPod MuseTalk H100
 * 4. Return REAL video URL
 *
 * GPU PROVIDER: RunPod ONLY
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// In-memory tracking for active jobs
const activeJobs = new Map<string, {
  provider: "runpod";
  jobId: string;
  status: string;
  startedAt: number;
}>();

// Rate limit backoff
const rateLimitBackoff = new Map<string, number>();

// RunPod - PRIMARY (H100 MuseTalk)
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_VIDEO_ENDPOINT_ID = process.env.RUNPOD_VIDEO_ENDPOINT_ID;

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    // Dev mode: get first user
    if (process.env.NODE_ENV === "development") {
      const [firstUser] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
      return firstUser?.id || null;
    }
    return null;
  }

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  return session?.userId || null;
}

// Generate 2-second silent audio for idle animation
function generateSilentAudioBase64(): string {
  // Minimal MP3 with ~2 seconds of silence
  return "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNbrJcAAAAAAD/+1DEAAAGAAGkAAAAIAAAP8AAAAQAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
}

// Cache completed video URLs in memory to avoid DB hits
const completedVideos = new Map<string, string>();

/**
 * GET - Check idle video status
 * OPTIMIZED: Check in-memory state first to avoid DB connection exhaustion
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;

    // ═══════════════════════════════════════════════════════════════════════════
    // FAST PATH: Check in-memory caches first (NO DATABASE HIT)
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. Check if we already have a completed video cached in memory
    const cachedVideo = completedVideos.get(personaId);
    if (cachedVideo) {
      return Response.json({
        videoUrl: cachedVideo,
        status: "ready",
        cached: true,
        source: "memory"
      });
    }

    // 2. Check if there's an active job - poll provider directly without DB
    const active = activeJobs.get(personaId);
    if (active) {
      // ─────────────────────────────────────────────────────────────────────────
      // Poll RunPod H100
      // ─────────────────────────────────────────────────────────────────────────
      if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_ENDPOINT_ID) {
        return Response.json({ error: "RunPod not configured" }, { status: 500 });
      }

      try {
        const statusUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/status/${active.jobId}`;
        const statusResp = await fetch(statusUrl, {
          headers: { "Authorization": `Bearer ${RUNPOD_API_KEY}` }
        });
        const statusData = await statusResp.json();

        console.log(`[IdleVideo] RunPod status for ${active.jobId}:`, statusData.status);

        if (statusData.status === "COMPLETED") {
          const videoUrl = statusData.output?.video || statusData.output?.output?.video ||
                          (typeof statusData.output === "string" ? statusData.output : null);

          if (videoUrl) {
            // Cache in memory FIRST (instant)
            completedVideos.set(personaId, videoUrl);
            activeJobs.delete(personaId);

            // Cache in DB async (don't block response)
            db.update(schema.personas)
              .set({ idleVideoUrl: videoUrl } as any)
              .where(eq(schema.personas.id, personaId))
              .then(() => console.log(`[IdleVideo] Cached video URL in DB for persona ${personaId}`))
              .catch(() => console.warn("[IdleVideo] Failed to cache video URL in DB"));

            console.log(`[IdleVideo] ✅ REAL idle video ready from RunPod H100`);

            return Response.json({
              videoUrl,
              status: "ready",
              cached: false,
              source: "runpod-musetalk"
            });
          }
        }

        if (statusData.status === "FAILED") {
          activeJobs.delete(personaId);
          return Response.json({
            videoUrl: null,
            status: "failed",
            error: statusData.error || "Video generation failed",
            source: "runpod-musetalk"
          });
        }

        // Still processing - but check for timeout
        const elapsed = Date.now() - active.startedAt;
        const TIMEOUT_MS = 120000; // 2 minutes max for idle video

        if (elapsed > TIMEOUT_MS) {
          console.error(`[IdleVideo] ⏰ Job ${active.jobId} timed out after ${Math.round(elapsed / 1000)}s`);
          activeJobs.delete(personaId);
          return Response.json({
            videoUrl: null,
            status: "failed",
            error: `Video generation timed out after ${Math.round(TIMEOUT_MS / 1000)}s`,
            elapsedMs: elapsed,
            source: "runpod-musetalk"
          });
        }

        return Response.json({
          videoUrl: null,
          status: "processing",
          jobId: active.jobId,
          elapsedMs: elapsed,
          source: "runpod-musetalk"
        });
      } catch (pollErr) {
        console.error("[IdleVideo] RunPod poll error:", pollErr);
      }
    }

    // 3. No active job - check DB for cached video (SLOW PATH)
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return Response.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check if we have a cached video URL in DB
    if ((persona as any).idleVideoUrl) {
      const videoUrl = (persona as any).idleVideoUrl;
      completedVideos.set(personaId, videoUrl);
      return Response.json({
        videoUrl,
        status: "ready",
        cached: true,
        source: "database"
      });
    }

    // No video available - client should POST to generate
    return Response.json({
      videoUrl: null,
      status: "not_started",
      message: "POST to this endpoint to generate idle video"
    });

  } catch (error: any) {
    console.error("[IdleVideo] GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Start idle video generation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: personaId } = await params;

  try {
    console.log(`\n[IdleVideo] ═══════════════════════════════════════════════`);
    console.log(`[IdleVideo] RunPod MuseTalk H100 idle video for: ${personaId}`);

    // 1. Check auth
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if already processing
    const active = activeJobs.get(personaId);
    if (active) {
      return Response.json({
        status: "processing",
        jobId: active.jobId,
        message: "Already generating idle video"
      });
    }

    // 3. Get persona
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return Response.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check rate limit
    const backoffUntil = rateLimitBackoff.get(personaId);
    if (backoffUntil && Date.now() < backoffUntil) {
      return Response.json({
        status: "throttled",
        retryAfterMs: backoffUntil - Date.now()
      }, { status: 429 });
    }

    // 4. Check image
    const sourceImageUrl = persona.primaryImageUrl;
    if (!sourceImageUrl) {
      return Response.json({
        error: "Persona has no image",
        status: "no_image"
      }, { status: 400 });
    }

    // 5. Generate REAL video with RunPod MuseTalk H100
    const silentAudioBase64 = generateSilentAudioBase64();
    const audioDataUrl = `data:audio/mp3;base64,${silentAudioBase64}`;

    // ═══════════════════════════════════════════════════════════════
    // RunPod MuseTalk H100 - STATE-OF-THE-ART idle animation
    // ═══════════════════════════════════════════════════════════════
    if (!RUNPOD_API_KEY || !RUNPOD_VIDEO_ENDPOINT_ID) {
      return Response.json({
        error: "RunPod video endpoint not configured (RUNPOD_API_KEY, RUNPOD_VIDEO_ENDPOINT_ID)",
        status: "not_configured"
      }, { status: 500 });
    }

    console.log(`[IdleVideo] Using RunPod MuseTalk H100 for "${persona.name}"`);

    const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_VIDEO_ENDPOINT_ID}/run`;

    // H100 optimized idle settings
    const idleSettings = {
      source_image: sourceImageUrl,
      driven_audio: audioDataUrl,
      // Idle-specific: subtle but visible movement
      quality: "standard",
      resolution: 512,
      fps: 30,
      face_enhance: true,  // GFPGAN
      expression_scale: 0.5,  // Subtle for idle
      loop: true,  // Idle videos should loop
    };

    console.log(`[IdleVideo] 🚀 H100 MuseTalk IDLE SETTINGS:`);
    console.log(`[IdleVideo]    Resolution: ${idleSettings.resolution}px`);
    console.log(`[IdleVideo]    Expression: ${idleSettings.expression_scale} (subtle idle)`);
    console.log(`[IdleVideo]    Face Enhance: ${idleSettings.face_enhance}`);

    const response = await fetch(runpodUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: idleSettings }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[IdleVideo] RunPod error:", errorText);
      return Response.json({
        error: `RunPod failed: ${errorText}`,
        status: "failed"
      }, { status: 500 });
    }

    const result = await response.json();
    console.log(`[IdleVideo] RunPod job started: ${result.id}`);

    activeJobs.set(personaId, {
      provider: "runpod",
      jobId: result.id,
      status: result.status,
      startedAt: Date.now(),
    });

    return Response.json({
      videoUrl: null,
      status: "processing",
      jobId: result.id,
      message: "Generating REAL idle video on H100 MuseTalk",
      source: "runpod-musetalk"
    });

  } catch (error: any) {
    console.error("[IdleVideo] POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
