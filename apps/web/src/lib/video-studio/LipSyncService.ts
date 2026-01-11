/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIP SYNC SERVICE - State-of-the-Art Talking Portrait Generation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Best-in-class models for identity-consistent + temporally stable talking faces:
 *
 * 1. LatentSync (ByteDance) - Diffusion-based, best quality
 * 2. MuseTalk - Real-time capable, good quality
 * 3. SadTalker - Reliable fallback
 *
 * Key strategy for Pixar-level consistency:
 * - Create 3-5 base takes per persona (idle/front, 3/4 angle, dramatic)
 * - Lip-sync onto the best take per script
 * - Never generate "image → new video" every time (causes identity drift)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Replicate from "replicate";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LipSyncModel = "latentsync" | "musetalk" | "sadtalker";

export interface LipSyncConfig {
  model?: LipSyncModel;
  quality?: "fast" | "standard" | "high";
  enhancer?: boolean;
  faceRestoration?: boolean;
}

export interface LipSyncResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  model: LipSyncModel;
  processingTime: number;
  cost: number;
}

// Model configurations on Replicate
const MODELS = {
  // LatentSync - ByteDance's diffusion-based lip sync (best quality)
  // Verified model version from Replicate
  latentsync: {
    id: "bytedance/latentsync:637ce1919f807ca20da3a448ddc2743535d2853649574cd52a933120e9b9e293",
    inputFormat: "latentsync",
    costPerRun: 0.10,
  },
  // MuseTalk - Good quality, faster
  musetalk: {
    id: "douwantech/musetalk:34bae378728dfa1b74dff3a2bc989f9062536a1b866dfb576ef0f87b3a7a5633",
    inputFormat: "musetalk",
    costPerRun: 0.05,
  },
  // SadTalker - Reliable fallback
  sadtalker: {
    id: "cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3",
    inputFormat: "sadtalker",
    costPerRun: 0.03,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LIP SYNC SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class LipSyncService {
  private replicate: Replicate | null = null;

  constructor() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (token) {
      this.replicate = new Replicate({ auth: token });
    }
  }

  /**
   * Generate lip-synced video from image + audio
   */
  async generate(
    imageUrl: string,
    audioBase64: string,
    config: LipSyncConfig = {}
  ): Promise<LipSyncResult> {
    const {
      model = "latentsync",
      quality = "standard",
      enhancer = true,
      faceRestoration = true,
    } = config;

    if (!this.replicate) {
      console.warn("[LipSync] No Replicate API token, returning placeholder");
      return {
        videoUrl: imageUrl,
        model,
        processingTime: 0,
        cost: 0,
      };
    }

    const modelConfig = MODELS[model];
    const startTime = Date.now();

    console.log(`[LipSync] Generating with ${model} model...`);
    console.log(`[LipSync] Image: ${imageUrl.substring(0, 100)}...`);
    console.log(`[LipSync] Audio: ${audioBase64.length} chars`);

    try {
      let output: any;

      // Create audio data URL
      const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;

      if (model === "latentsync") {
        output = await this.generateLatentSync(imageUrl, audioDataUrl, quality);
      } else if (model === "musetalk") {
        output = await this.generateMuseTalk(imageUrl, audioDataUrl, quality);
      } else {
        output = await this.generateSadTalker(imageUrl, audioDataUrl, quality, enhancer);
      }

      const processingTime = Date.now() - startTime;
      const videoUrl = this.extractVideoUrl(output);

      console.log(`[LipSync] Generated in ${processingTime}ms`);
      console.log(`[LipSync] Output: ${videoUrl?.substring(0, 100)}...`);

      return {
        videoUrl: videoUrl || imageUrl,
        model,
        processingTime,
        cost: modelConfig.costPerRun,
      };
    } catch (error: any) {
      console.error(`[LipSync] ${model} failed:`, error);

      // Fallback to SadTalker if primary model fails
      if (model !== "sadtalker") {
        console.log("[LipSync] Falling back to SadTalker...");
        return this.generate(imageUrl, audioBase64, { ...config, model: "sadtalker" });
      }

      return {
        videoUrl: imageUrl,
        model,
        processingTime: Date.now() - startTime,
        cost: 0,
      };
    }
  }

  /**
   * LatentSync - ByteDance's diffusion-based lip sync
   * Best quality, but slower
   */
  private async generateLatentSync(
    imageUrl: string,
    audioUrl: string,
    quality: string
  ): Promise<any> {
    // LatentSync parameters based on quality
    const params = {
      fast: { inference_steps: 10 },
      standard: { inference_steps: 20 },
      high: { inference_steps: 30 },
    }[quality] || { inference_steps: 20 };

    return this.replicate!.run(
      MODELS.latentsync.id as `${string}/${string}:${string}`,
      {
        input: {
          audio: audioUrl,
          video: imageUrl, // LatentSync can take image or video
          ...params,
        },
      }
    );
  }

  /**
   * MuseTalk - Fast, good quality
   */
  private async generateMuseTalk(
    imageUrl: string,
    audioUrl: string,
    quality: string
  ): Promise<any> {
    return this.replicate!.run(
      MODELS.musetalk.id as `${string}/${string}:${string}`,
      {
        input: {
          source_image: imageUrl,
          driven_audio: audioUrl,
          fps: quality === "fast" ? 25 : 30,
        },
      }
    );
  }

  /**
   * SadTalker - Reliable fallback
   */
  private async generateSadTalker(
    imageUrl: string,
    audioUrl: string,
    quality: string,
    enhancer: boolean
  ): Promise<any> {
    const batchSize = quality === "fast" ? 2 : quality === "high" ? 1 : 2;
    const size = quality === "high" ? 512 : 256;

    return this.replicate!.run(
      MODELS.sadtalker.id as `${string}/${string}:${string}`,
      {
        input: {
          source_image: imageUrl,
          driven_audio: audioUrl,
          enhancer: enhancer ? "gfpgan" : "none",
          still_mode: false,
          preprocess: "crop",
          batch_size: batchSize,
          size,
        },
      }
    );
  }

  /**
   * Extract video URL from model output
   */
  private extractVideoUrl(output: any): string | null {
    if (typeof output === "string") {
      return output;
    }

    if (Array.isArray(output)) {
      // Find video file in array
      return output.find(
        (item: string) =>
          typeof item === "string" &&
          (item.endsWith(".mp4") || item.endsWith(".webm") || item.includes("video"))
      );
    }

    if (output && typeof output === "object") {
      return output.video || output.output || output.result || null;
    }

    return null;
  }

  /**
   * Get recommended model based on requirements
   */
  recommendModel(requirements: {
    quality: "fast" | "standard" | "high";
    budgetSensitive?: boolean;
    identityConsistency?: "low" | "medium" | "high";
  }): LipSyncModel {
    const { quality, budgetSensitive, identityConsistency } = requirements;

    // High quality + high identity = LatentSync
    if (quality === "high" && identityConsistency === "high") {
      return "latentsync";
    }

    // Budget sensitive = SadTalker
    if (budgetSensitive) {
      return "sadtalker";
    }

    // Standard quality = MuseTalk (good balance)
    if (quality === "standard") {
      return "musetalk";
    }

    // Fast = SadTalker
    if (quality === "fast") {
      return "sadtalker";
    }

    return "latentsync";
  }

  /**
   * Check if models are available
   */
  isAvailable(): boolean {
    return !!this.replicate;
  }
}

// Export singleton
export const lipSyncService = new LipSyncService();
