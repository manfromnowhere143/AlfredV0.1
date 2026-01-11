/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/video-studio/[jobId] - Video Job Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GET    - Get job status and details
 * POST   - Start/stop job processing
 * DELETE - Cancel/delete job
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";
import { videoStudioService } from "@/lib/video-studio/VideoStudioService";

interface RouteParams {
  params: Promise<{ id: string; jobId: string }>;
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
 * GET /api/personas/[id]/video-studio/[jobId]
 * Get job status and details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId, jobId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get job
    const job = await videoStudioService.getJob(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (job.personaId !== personaId || job.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get persona name for context
    const [persona] = await db
      .select({ name: schema.personas.name })
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    return new Response(
      JSON.stringify({
        job,
        personaName: persona?.name,
        isComplete: job.status === "completed",
        isFailed: job.status === "failed",
        isProcessing: !["pending", "completed", "failed"].includes(job.status),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VideoStudio] Error getting job:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get job" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/personas/[id]/video-studio/[jobId]
 * Start or control job processing
 *
 * Body: { action: "start" | "retry" | "cancel" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId, jobId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get job
    const job = await videoStudioService.getJob(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (job.personaId !== personaId || job.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse action
    const body = await request.json().catch(() => ({}));
    const { action = "start" } = body;

    switch (action) {
      case "start": {
        if (job.status !== "pending") {
          return new Response(
            JSON.stringify({
              error: "Cannot start job",
              message: `Job is already ${job.status}`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Start job in background
        console.log(`[VideoStudio] Starting job: ${jobId}`);
        videoStudioService.executeJob(jobId).catch((error) => {
          console.error(`[VideoStudio] Job ${jobId} failed:`, error);
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Video generation started",
            jobId,
            status: "script_polish",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "retry": {
        if (job.status !== "failed") {
          return new Response(
            JSON.stringify({
              error: "Cannot retry job",
              message: "Only failed jobs can be retried",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Reset job status and retry
        await videoStudioService.updateJob(jobId, {
          status: "pending",
          currentStep: "pending",
          progress: 0,
          error: null,
        });

        // Start job in background
        console.log(`[VideoStudio] Retrying job: ${jobId}`);
        videoStudioService.executeJob(jobId).catch((error) => {
          console.error(`[VideoStudio] Job ${jobId} failed:`, error);
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Video generation restarted",
            jobId,
            status: "script_polish",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        if (job.status === "completed" || job.status === "failed") {
          return new Response(
            JSON.stringify({
              error: "Cannot cancel job",
              message: "Job is already completed or failed",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Mark job as failed with cancellation message
        await videoStudioService.updateJob(jobId, {
          status: "failed",
          error: "Cancelled by user",
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Job cancelled",
            jobId,
            status: "failed",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: "Invalid action",
            message: `Unknown action: ${action}. Valid actions: start, retry, cancel`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("[VideoStudio] Error controlling job:", error);
    return new Response(
      JSON.stringify({ error: "Failed to control job", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/personas/[id]/video-studio/[jobId]
 * Delete a job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId, jobId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get job
    const job = await videoStudioService.getJob(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (job.personaId !== personaId || job.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Soft delete the job
    await videoStudioService.updateJob(jobId, {
      deletedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Job deleted",
        jobId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VideoStudio] Error deleting job:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete job" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
