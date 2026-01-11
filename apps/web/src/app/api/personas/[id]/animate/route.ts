/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/animate - Generate Lip-Synced Video (SadTalker via Replicate)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STATE-OF-THE-ART: Disney-quality talking persona videos
 * Takes persona image + audio → Returns lip-synced video
 *
 * Uses Replicate's SadTalker model for high-quality lip-sync generation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";

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

// Replicate API configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

// SadTalker model on Replicate - using the latest stable version
const SADTALKER_MODEL = "cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3";

/**
 * POST /api/personas/[id]/animate
 * Generate lip-synced video from audio using Replicate's SadTalker
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

    const body = await request.json();
    const { audioBase64, emotion = "neutral", quality = "fast" } = body;

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Audio is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch persona to get image
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

    const sourceImageUrl = persona.primaryImageUrl;
    if (!sourceImageUrl) {
      return new Response(JSON.stringify({ error: "Persona has no image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if Replicate is configured
    if (!REPLICATE_API_TOKEN) {
      console.log("[Animate] Replicate not configured, returning placeholder");
      return new Response(
        JSON.stringify({
          videoUrl: null,
          message: "Video generation not configured - add REPLICATE_API_TOKEN",
          fallbackToImage: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Animate] Generating lip-sync video for "${persona.name}"`);
    console.log(`[Animate] Emotion: ${emotion}, Quality: ${quality}`);

    // Get expression settings based on emotion
    const expressionSettings = getExpressionSettings(emotion);

    const startTime = Date.now();

    // Create audio data URL for Replicate
    const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;

    // Replicate SadTalker payload
    const replicatePayload = {
      version: SADTALKER_MODEL.split(":")[1],
      input: {
        source_image: sourceImageUrl,
        driven_audio: audioDataUrl,

        // Expression settings
        expression_scale: expressionSettings.scale,

        // Animation settings
        enhancer: "gfpgan",
        still_mode: false,
        preprocess: "crop",

        // Head pose (use expression settings)
        pose_style: Math.round((expressionSettings.yaw[1] + 10) / 20 * 46), // Map to 0-46

        // Quality - batch size affects speed
        batch_size: quality === "fast" ? 2 : quality === "high" ? 1 : 2,
        size: quality === "high" ? 512 : quality === "fast" ? 256 : 256,
      },
    };

    // Submit prediction to Replicate
    console.log("[Animate] Submitting to Replicate...");
    console.log("[Animate] Payload:", JSON.stringify({
      version: replicatePayload.version,
      input: {
        ...replicatePayload.input,
        driven_audio: `[base64 audio ${audioBase64.length} chars]`,
        source_image: sourceImageUrl.substring(0, 100) + "..."
      }
    }, null, 2));

    const submitResponse = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(replicatePayload),
    });

    const responseText = await submitResponse.text();
    console.log("[Animate] Replicate response status:", submitResponse.status);
    console.log("[Animate] Replicate response:", responseText.substring(0, 500));

    if (!submitResponse.ok) {
      console.error("[Animate] Replicate submit error:", responseText);
      return new Response(
        JSON.stringify({
          videoUrl: null,
          error: `Video generation failed: ${responseText.substring(0, 200)}`,
          fallbackToImage: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let prediction;
    try {
      prediction = JSON.parse(responseText);
    } catch (e) {
      console.error("[Animate] Failed to parse response:", e);
      return new Response(
        JSON.stringify({
          videoUrl: null,
          error: "Invalid API response",
          fallbackToImage: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Animate] Prediction started: ${prediction.id}`);

    // Poll for completion (with timeout)
    const maxWaitMs = quality === "fast" ? 60000 : 120000; // Replicate can be slow
    const pollIntervalMs = 2000;
    let result = null;

    for (let elapsed = 0; elapsed < maxWaitMs; elapsed += pollIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      const statusResponse = await fetch(prediction.urls.get, {
        headers: {
          "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        },
      });

      if (!statusResponse.ok) {
        console.log(`[Animate] Status check failed, retrying...`);
        continue;
      }

      const status = await statusResponse.json();

      if (status.status === "succeeded") {
        result = status;
        break;
      }

      if (status.status === "failed") {
        console.error("[Animate] Prediction failed:", status.error);
        break;
      }

      if (status.status === "canceled") {
        console.error("[Animate] Prediction was canceled");
        break;
      }

      console.log(`[Animate] Status: ${status.status}, elapsed: ${elapsed}ms`);
    }

    const generationTimeMs = Date.now() - startTime;

    // Replicate returns output as a URL directly
    const videoUrl = result?.output;

    if (!videoUrl) {
      console.log("[Animate] Video generation timed out or failed");
      return new Response(
        JSON.stringify({
          videoUrl: null,
          error: "Video generation timed out",
          fallbackToImage: true,
          generationTimeMs,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Animate] Video generated in ${generationTimeMs}ms`);
    console.log(`[Animate] Video URL: ${videoUrl}`);

    return new Response(
      JSON.stringify({
        videoUrl,
        thumbnailUrl: videoUrl, // SadTalker doesn't provide separate thumbnail
        duration: 5, // Estimate based on audio
        generationTimeMs,
        emotion,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Animate] Error:", error);
    return new Response(
      JSON.stringify({
        videoUrl: null,
        error: "Animation failed",
        fallbackToImage: true,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Get expression settings for emotion
 */
function getExpressionSettings(emotion: string): {
  scale: number;
  yaw: number[];
  pitch: number[];
  roll: number[];
} {
  const base = {
    scale: 1.0,
    yaw: [0, 0, 0],
    pitch: [0, 0, 0],
    roll: [0, 0, 0],
  };

  const emotionSettings: Record<string, typeof base> = {
    happy: {
      scale: 1.2,
      yaw: [-5, 0, 5],
      pitch: [0, 5, 0],
      roll: [0, 0, 0],
    },
    sad: {
      scale: 0.8,
      yaw: [0, 0, 0],
      pitch: [5, 0, 5],
      roll: [0, 0, 0],
    },
    excited: {
      scale: 1.4,
      yaw: [-10, 0, 10],
      pitch: [-5, 0, -5],
      roll: [-3, 0, 3],
    },
    angry: {
      scale: 1.1,
      yaw: [-3, 0, 3],
      pitch: [-5, 0, -5],
      roll: [0, 0, 0],
    },
    thoughtful: {
      scale: 0.9,
      yaw: [0, -5, 0],
      pitch: [0, 5, 0],
      roll: [0, 0, 0],
    },
    confident: {
      scale: 1.1,
      yaw: [-3, 0, 3],
      pitch: [-3, 0, -3],
      roll: [0, 0, 0],
    },
    curious: {
      scale: 1.0,
      yaw: [5, 0, -5],
      pitch: [-5, 0, 5],
      roll: [2, 0, -2],
    },
    amused: {
      scale: 1.15,
      yaw: [-5, 0, 5],
      pitch: [0, 3, 0],
      roll: [-2, 0, 2],
    },
  };

  return emotionSettings[emotion] || base;
}
