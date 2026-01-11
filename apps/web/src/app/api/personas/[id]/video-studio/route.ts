/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/video-studio - Video Studio API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STATE-OF-THE-ART: Premium video generation for personas
 *
 * POST - Create a new video generation job
 * GET  - List video jobs for the persona
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";
import { videoStudioService, VideoFormat, VideoQuality } from "@/lib/video-studio/VideoStudioService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get user ID from session cookie
 */
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  return session?.userId || null;
}

/**
 * POST /api/personas/[id]/video-studio
 * Create a new video generation job
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify persona ownership
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (persona.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      script,
      format = "tiktok_vertical",
      quality = "standard",
      durationTarget,
      emotion = "neutral",
      musicMood = "inspirational",
      captionStyle = "tiktok",
      startImmediately = false,
    } = body;

    if (!script || typeof script !== "string") {
      return new Response(JSON.stringify({ error: "Script is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate format and quality
    const validFormats: VideoFormat[] = [
      "tiktok_vertical",
      "instagram_reel",
      "instagram_square",
      "youtube_short",
      "youtube_standard",
      "twitter_video",
      "custom",
    ];
    const validQualities: VideoQuality[] = ["draft", "standard", "premium", "cinematic"];

    if (!validFormats.includes(format)) {
      return new Response(
        JSON.stringify({ error: `Invalid format. Valid options: ${validFormats.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!validQualities.includes(quality)) {
      return new Response(
        JSON.stringify({ error: `Invalid quality. Valid options: ${validQualities.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[VideoStudio] Creating job for persona: ${persona.name}`);
    console.log(`[VideoStudio] Format: ${format}, Quality: ${quality}`);
    console.log(`[VideoStudio] Script: "${script.substring(0, 100)}..."`);

    // Create the job
    const jobId = await videoStudioService.createJob({
      personaId,
      userId,
      title: title || `${persona.name} Video`,
      rawScript: script,
      format,
      quality,
      durationTarget,
      emotion,
      musicMood,
      captionStyle,
    });

    console.log(`[VideoStudio] Created job: ${jobId}`);

    // Optionally start processing immediately
    if (startImmediately) {
      // Start job in background (non-blocking)
      videoStudioService.executeJob(jobId).catch((error) => {
        console.error(`[VideoStudio] Background job ${jobId} failed:`, error);
      });
    }

    // Get the created job
    const job = await videoStudioService.getJob(jobId);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        job,
        message: startImmediately
          ? "Video generation started"
          : "Video job created. Call /start to begin processing.",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VideoStudio] Error creating job:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create video job", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/personas/[id]/video-studio
 * List video jobs for the persona
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify persona ownership
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (persona.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // List jobs
    const jobs = await videoStudioService.listJobs(personaId, limit);

    return new Response(
      JSON.stringify({
        personaId,
        personaName: persona.name,
        jobs,
        count: jobs.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VideoStudio] Error listing jobs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to list video jobs" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
