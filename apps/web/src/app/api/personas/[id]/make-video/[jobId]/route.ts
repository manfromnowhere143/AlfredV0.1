/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/make-video/[jobId] - POLL VIDEO JOB STATUS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * GET endpoint to check the status of an async video generation job.
 *
 * Returns:
 * - status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
 * - videoUrl?: string (when status === "COMPLETED")
 * - progress?: number (0-100, estimated progress)
 * - estimatedRemainingMs?: number
 * - error?: string (when status === "FAILED")
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { getRunPodClient } from "@/lib/video-studio/RunPodClient";

interface RouteParams {
  params: Promise<{ id: string; jobId: string }>;
}

/**
 * GET /api/personas/[id]/make-video/[jobId]
 *
 * Check the status of a RunPod video generation job
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: personaId, jobId } = await params;

  try {
    console.log(`[MakeVideoStatus] Checking status for job: ${jobId}`);

    const runpodClient = getRunPodClient();
    const status = await runpodClient.getJobStatus(jobId);

    console.log(`[MakeVideoStatus] Job ${jobId} status: ${status.status}`);

    if (status.status === "COMPLETED" && status.output) {
      const output = status.output as any;
      return NextResponse.json({
        status: "COMPLETED",
        videoUrl: output.video || output.output?.video,
        thumbnail: output.thumbnail || output.output?.thumbnail,
      });
    }

    if (status.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        error: status.output?.toString() || "Video generation failed",
      });
    }

    // IN_QUEUE or IN_PROGRESS
    return NextResponse.json({
      status: status.status,
      progress: status.status === "IN_PROGRESS" ? 50 : 10,
      estimatedRemainingMs: status.status === "IN_PROGRESS" ? 60000 : 120000,
    });

  } catch (error: any) {
    console.error(`[MakeVideoStatus] Error checking job ${jobId}:`, error);
    return NextResponse.json(
      {
        status: "FAILED",
        error: error.message || "Failed to check job status",
      },
      { status: 500 }
    );
  }
}
