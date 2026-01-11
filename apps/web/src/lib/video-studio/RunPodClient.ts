/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNPOD CLIENT - Call PersonaForge Studio Pod
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This client calls your RunPod serverless endpoint for:
 * - Lip-sync video generation
 * - Full video rendering
 * - Persona base take generation
 *
 * Usage:
 *
 *   const result = await runpodClient.renderVideo({
 *     image: imageUrl,
 *     audio: audioUrl,
 *     captions: [...],
 *     quality: "premium"
 *   });
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunPodConfig {
  endpointId: string;
  apiKey: string;
  timeoutMs?: number;
  pollingIntervalMs?: number;
}

export type JobType = "lipsync_only" | "video_render" | "persona_build";

export type JobStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface LipSyncInput {
  jobId?: string;
  image: string;        // URL or base64
  audio: string;        // URL or base64
  quality?: "fast" | "standard" | "high";
}

export interface VideoRenderInput {
  jobId?: string;
  image: string;
  audio: string;
  musicUrl?: string;
  ambienceUrl?: string;
  sfxTracks?: Array<{
    url: string;
    startTime: number;
    volume: number;
  }>;
  captions?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  captionStyle?: {
    fontSize?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    positionY?: number;
  };
  format?: {
    width?: number;
    height?: number;
    fps?: number;
  };
  quality?: "draft" | "standard" | "premium" | "cinematic";
  duckingConfig?: {
    baseVolume?: number;
    attackMs?: number;
    releaseMs?: number;
  };
}

export interface PersonaBuildInput {
  personaId: string;
  primaryImage: string;
  archetype: string;
  takesToGenerate?: Array<{
    emotion: string;
    angle: string;
    intensity: number;
  }>;
}

export interface RunPodJobResponse {
  id: string;
  status: JobStatus;
}

export interface RunPodJobResult {
  success: boolean;
  output?: {
    video?: string;
    thumbnail?: string;
  };
  metadata?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNPOD CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class RunPodClient {
  private endpointId: string;
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private pollingIntervalMs: number;

  constructor(config: RunPodConfig) {
    this.endpointId = config.endpointId;
    this.apiKey = config.apiKey;
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
    this.timeoutMs = config.timeoutMs || 300000; // 5 minutes default
    this.pollingIntervalMs = config.pollingIntervalMs || 2000; // 2 seconds
  }

  /**
   * Lip-sync only (fastest path)
   */
  async lipSync(input: LipSyncInput): Promise<RunPodJobResult> {
    return this.runJob("lipsync_only", {
      job_id: input.jobId || this.generateJobId(),
      image: input.image,
      audio: input.audio,
      quality: input.quality || "standard",
    });
  }

  /**
   * Full video render (lip-sync + audio mix + captions)
   */
  async renderVideo(input: VideoRenderInput): Promise<RunPodJobResult> {
    return this.runJob("video_render", {
      job_id: input.jobId || this.generateJobId(),
      image: input.image,
      audio: input.audio,
      music_url: input.musicUrl,
      ambience_url: input.ambienceUrl,
      sfx_tracks: input.sfxTracks?.map((t) => ({
        url: t.url,
        start_time: t.startTime,
        volume: t.volume,
      })),
      captions: input.captions,
      caption_style: input.captionStyle
        ? {
            font_size: input.captionStyle.fontSize || 48,
            color: input.captionStyle.color || "white",
            stroke_color: input.captionStyle.strokeColor || "black",
            stroke_width: input.captionStyle.strokeWidth || 2,
            position_y: input.captionStyle.positionY || 0.75,
          }
        : undefined,
      format: input.format
        ? {
            width: input.format.width || 1080,
            height: input.format.height || 1920,
            fps: input.format.fps || 30,
          }
        : undefined,
      quality: input.quality || "standard",
      ducking_config: input.duckingConfig
        ? {
            base_volume: input.duckingConfig.baseVolume || 0.15,
            attack_ms: input.duckingConfig.attackMs || 50,
            release_ms: input.duckingConfig.releaseMs || 300,
          }
        : undefined,
    });
  }

  /**
   * Build persona base takes
   */
  async buildPersona(input: PersonaBuildInput): Promise<RunPodJobResult> {
    return this.runJob("persona_build", {
      persona_id: input.personaId,
      primary_image: input.primaryImage,
      archetype: input.archetype,
      takes_to_generate: input.takesToGenerate || [
        { emotion: "neutral", angle: "front", intensity: 0.5 },
        { emotion: "neutral", angle: "three_quarter", intensity: 0.5 },
        { emotion: "happy", angle: "three_quarter", intensity: 0.7 },
      ],
    });
  }

  /**
   * Run a job and wait for completion
   */
  private async runJob(
    jobType: JobType,
    input: Record<string, unknown>
  ): Promise<RunPodJobResult> {
    // Submit job
    const jobResponse = await this.submitJob(jobType, input);
    console.log(`[RunPod] Job submitted: ${jobResponse.id}`);

    // Poll for completion
    const result = await this.waitForCompletion(jobResponse.id);
    return result;
  }

  /**
   * Submit job to RunPod
   */
  private async submitJob(
    jobType: JobType,
    input: Record<string, unknown>
  ): Promise<RunPodJobResponse> {
    const response = await fetch(`${this.baseUrl}/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          job_type: jobType,
          ...input,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunPod submit failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
    };
  }

  /**
   * Poll job status until completion
   */
  private async waitForCompletion(jobId: string): Promise<RunPodJobResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.timeoutMs) {
      const status = await this.getJobStatus(jobId);

      if (status.status === "COMPLETED") {
        return status.output as RunPodJobResult;
      }

      if (status.status === "FAILED") {
        throw new Error(`RunPod job failed: ${JSON.stringify(status.output)}`);
      }

      if (status.status === "CANCELLED") {
        throw new Error("RunPod job was cancelled");
      }

      // Wait before next poll
      await this.sleep(this.pollingIntervalMs);
    }

    throw new Error(`RunPod job timed out after ${this.timeoutMs}ms`);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    output?: unknown;
  }> {
    const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunPod status failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      output: data.output,
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cancel/${jobId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunPod cancel failed: ${response.status} - ${error}`);
    }
  }

  /**
   * Health check
   */
  async health(): Promise<{ workers: { ready: number; running: number } }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("RunPod health check failed");
    }

    return response.json();
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `pf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a RunPod client from environment variables
 */
export function createRunPodClient(): RunPodClient {
  // Use VIDEO endpoint for video studio, fallback to general endpoint
  const endpointId = process.env.RUNPOD_VIDEO_ENDPOINT_ID || process.env.RUNPOD_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!endpointId || !apiKey) {
    throw new Error(
      "Missing RUNPOD_VIDEO_ENDPOINT_ID or RUNPOD_API_KEY environment variables"
    );
  }

  return new RunPodClient({
    endpointId,
    apiKey,
    timeoutMs: 300000, // 5 minutes
    pollingIntervalMs: 2000, // 2 seconds
  });
}

// Export singleton (lazy initialized)
let _runpodClient: RunPodClient | null = null;

export function getRunPodClient(): RunPodClient {
  if (!_runpodClient) {
    _runpodClient = createRunPodClient();
  }
  return _runpodClient;
}
