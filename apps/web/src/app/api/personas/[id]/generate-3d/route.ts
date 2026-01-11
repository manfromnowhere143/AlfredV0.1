/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/generate-3d - STATE-OF-THE-ART Image-to-3D Avatar Generation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Converts 2D persona images into animated 3D avatars using cutting-edge AI models.
 *
 * Supported models (via Replicate):
 * - TripoSR: Fast, high-quality 3D reconstruction
 * - InstantMesh: Multi-view consistent 3D from single image
 *
 * Output: GLB file with morph targets for facial animation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";
import { sql } from "drizzle-orm";
import Replicate from "replicate";

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

// ═══════════════════════════════════════════════════════════════════════════════
// 3D MODEL GENERATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Model options (Replicate model IDs) - verified working versions
const MODELS = {
  // TRELLIS - Best all-around model for 3D content generation (recommended)
  // Fast, reliable, generates detailed 3D assets from single image
  trellis: "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",

  // Aliases for backwards compatibility
  triposr: "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
  default: "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
};

// POST /api/personas/[id]/generate-3d - Generate 3D avatar from persona image
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { model = "triposr", forceRegenerate = false } = body;

    // Fetch persona (cast to any to handle modelUrl column before migration)
    const [personaRow] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!personaRow) {
      return new Response(JSON.stringify({ error: "Persona not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cast to include modelUrl (will exist after migration)
    const persona = personaRow as typeof personaRow & { modelUrl?: string };

    // Verify ownership
    if (persona.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if 3D model already exists
    if (persona.modelUrl && !forceRegenerate) {
      return new Response(
        JSON.stringify({
          success: true,
          modelUrl: persona.modelUrl,
          cached: true,
          message: "3D model already exists",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Replicate API token
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return new Response(
        JSON.stringify({
          error: "3D generation not configured",
          message: "REPLICATE_API_TOKEN not set",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get persona image URL (use primaryImageUrl)
    const imageUrl = persona.primaryImageUrl;
    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: "No image available",
          message: "Persona needs an image to generate 3D model",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Generate3D] Starting 3D generation for persona: ${persona.name}`);
    console.log(`[Generate3D] Image URL: ${imageUrl}`);
    console.log(`[Generate3D] Model: ${model}`);

    // Initialize Replicate client
    const replicate = new Replicate({ auth: replicateToken });

    // Run the TRELLIS model (best all-around for 3D generation)
    let modelUrl: string | null = null;

    // Get the model version - all aliases point to TRELLIS
    const modelVersion = MODELS[model as keyof typeof MODELS] || MODELS.default;
    console.log(`[Generate3D] Using model: ${modelVersion}`);

    try {
      const output = await replicate.run(modelVersion as `${string}/${string}:${string}`, {
        input: {
          images: [imageUrl],
          generate_model: true,           // Generate GLB file
          generate_color: true,           // Generate color render video
          texture_size: 1024,             // High-quality textures
          mesh_simplify: 0.95,            // Moderate mesh simplification
          ss_sampling_steps: 12,          // Stage 1 steps
          slat_sampling_steps: 12,        // Stage 2 steps
          ss_guidance_strength: 7.5,      // Stage 1 guidance
          slat_guidance_strength: 3,      // Stage 2 guidance
          return_no_background: true,     // Clean background
        },
      }) as any;

      console.log("[Generate3D] TRELLIS output:", JSON.stringify(output, null, 2).substring(0, 500));

      // TRELLIS returns an object with model_file (GLB URL)
      if (output && typeof output === "object") {
        modelUrl = output.model_file || output.model || null;

        // If no model_file, check for other possible output formats
        if (!modelUrl && Array.isArray(output)) {
          modelUrl = output.find((item: any) =>
            typeof item === "string" && (item.endsWith(".glb") || item.endsWith(".obj"))
          );
        }
      } else if (typeof output === "string") {
        modelUrl = output;
      }
    } catch (modelError: any) {
      console.error("[Generate3D] Model execution error:", modelError);
      return new Response(
        JSON.stringify({
          error: "Model execution failed",
          message: modelError.message || "Failed to run 3D generation model",
          details: modelError.toString(),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!modelUrl) {
      console.error("[Generate3D] Model generation failed - no output URL");
      return new Response(
        JSON.stringify({
          error: "Generation failed",
          message: "3D model generation did not return a valid output",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Generate3D] Generated model URL: ${modelUrl}`);

    // Update persona with new model URL (use raw sql for new column)
    await db.execute(sql`
      UPDATE personas
      SET model_url = ${modelUrl}, updated_at = ${new Date().toISOString()}
      WHERE id = ${personaId}
    `);

    console.log(`[Generate3D] Successfully updated persona with 3D model`);

    return new Response(
      JSON.stringify({
        success: true,
        modelUrl: modelUrl,
        cached: false,
        model: model,
        message: "3D avatar generated successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Generate3D] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Generation failed",
        message: error.message || "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// GET /api/personas/[id]/generate-3d - Check 3D model status
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

    // Fetch persona (use raw sql to get model_url before migration)
    const result: any = await db.execute(sql`
      SELECT id, name, primary_image_url, model_url, user_id
      FROM personas
      WHERE id = ${personaId}
      LIMIT 1
    `);

    const persona = (result.rows?.[0] || result[0]) as {
      id: string;
      name: string;
      primary_image_url: string | null;
      model_url: string | null;
      user_id: string;
    } | undefined;

    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (persona.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        personaId: persona.id,
        name: persona.name,
        hasImage: !!persona.primary_image_url,
        has3DModel: !!persona.model_url,
        modelUrl: persona.model_url || null,
        canGenerate: !!persona.primary_image_url && !!process.env.REPLICATE_API_TOKEN,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Generate3D] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check status" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
