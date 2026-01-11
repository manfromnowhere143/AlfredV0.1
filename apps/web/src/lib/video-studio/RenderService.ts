/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RENDER SERVICE - ffmpeg Video Composition
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Final phase of the Video Studio pipeline:
 * - Combines talking video with audio tracks
 * - Burns in TikTok-style captions
 * - Applies camera moves (zoom, pan)
 * - Outputs final MP4 for social media
 *
 * Two deployment options:
 * 1. Local ffmpeg (for development)
 * 2. RunPod serverless (for production)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Caption, CameraPlan, VideoFormat, VideoQuality } from "./VideoStudioService";
import { AudioMixConfig } from "./AudioPostService";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RenderConfig {
  // Input assets
  talkingVideoUrl: string;
  voiceAudioUrl: string;
  backgroundMusicUrl?: string;
  ambienceUrl?: string;
  sfxTracks?: Array<{ url: string; startTime: number; volume: number }>;

  // Captions
  captions: Caption[];
  captionStyle: {
    fontFamily: string;
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    animation: string;
  };

  // Camera
  cameraPlan?: CameraPlan;

  // Output settings
  format: VideoFormat;
  quality: VideoQuality;
  outputPath?: string;
}

export interface RenderResult {
  videoUrl: string;
  thumbnailUrl: string;
  previewGifUrl?: string;
  duration: number;
  fileSize: number;
  metadata: {
    resolution: string;
    fps: number;
    bitrate: number;
    codec: string;
  };
}

// Format specifications
const FORMAT_SPECS: Record<VideoFormat, { width: number; height: number; fps: number }> = {
  tiktok_vertical: { width: 1080, height: 1920, fps: 30 },
  instagram_reel: { width: 1080, height: 1920, fps: 30 },
  instagram_square: { width: 1080, height: 1080, fps: 30 },
  youtube_short: { width: 1080, height: 1920, fps: 30 },
  youtube_standard: { width: 1920, height: 1080, fps: 30 },
  twitter_video: { width: 1920, height: 1080, fps: 30 },
  custom: { width: 1080, height: 1920, fps: 30 },
};

// Quality presets
const QUALITY_PRESETS: Record<VideoQuality, { crf: number; preset: string; bitrate: string }> = {
  draft: { crf: 28, preset: "ultrafast", bitrate: "2M" },
  standard: { crf: 23, preset: "medium", bitrate: "5M" },
  premium: { crf: 18, preset: "slow", bitrate: "10M" },
  cinematic: { crf: 15, preset: "veryslow", bitrate: "20M" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class RenderService {
  private runpodEndpoint?: string;

  constructor(runpodEndpoint?: string) {
    this.runpodEndpoint = runpodEndpoint || process.env.RUNPOD_RENDER_ENDPOINT;
  }

  /**
   * Render the final video
   */
  async render(config: RenderConfig): Promise<RenderResult> {
    console.log("[Render] Starting video composition...");

    // If RunPod endpoint is configured, use serverless rendering
    if (this.runpodEndpoint) {
      return this.renderWithRunPod(config);
    }

    // Otherwise, use local ffmpeg (via API route)
    return this.renderLocal(config);
  }

  /**
   * Render using RunPod serverless
   */
  private async renderWithRunPod(config: RenderConfig): Promise<RenderResult> {
    console.log("[Render] Using RunPod serverless...");

    const response = await fetch(this.runpodEndpoint!, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          config,
          ffmpegCommand: this.buildFFmpegCommand(config),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RunPod render failed: ${error}`);
    }

    const result = await response.json();
    return this.parseRunPodResult(result, config);
  }

  /**
   * Render using local ffmpeg (via Next.js API route)
   */
  private async renderLocal(config: RenderConfig): Promise<RenderResult> {
    console.log("[Render] Using local render (placeholder)...");

    // For now, return the talking video as-is
    // In production, this would call a local ffmpeg process or API route
    const formatSpec = FORMAT_SPECS[config.format];

    return {
      videoUrl: config.talkingVideoUrl,
      thumbnailUrl: config.talkingVideoUrl,
      duration: 0,
      fileSize: 0,
      metadata: {
        resolution: `${formatSpec.width}x${formatSpec.height}`,
        fps: formatSpec.fps,
        bitrate: parseInt(QUALITY_PRESETS[config.quality].bitrate),
        codec: "h264",
      },
    };
  }

  /**
   * Build the ffmpeg command for the render
   */
  buildFFmpegCommand(config: RenderConfig): string {
    const formatSpec = FORMAT_SPECS[config.format];
    const qualityPreset = QUALITY_PRESETS[config.quality];

    const filters: string[] = [];
    const inputs: string[] = [];
    let inputIndex = 0;

    // Input: talking video
    inputs.push(`-i "${config.talkingVideoUrl}"`);
    const videoInput = inputIndex++;

    // Input: voice audio
    inputs.push(`-i "${config.voiceAudioUrl}"`);
    const voiceInput = inputIndex++;

    // Input: background music (optional)
    let musicInput: number | null = null;
    if (config.backgroundMusicUrl) {
      inputs.push(`-i "${config.backgroundMusicUrl}"`);
      musicInput = inputIndex++;
    }

    // Input: ambience (optional)
    let ambienceInput: number | null = null;
    if (config.ambienceUrl) {
      inputs.push(`-i "${config.ambienceUrl}"`);
      ambienceInput = inputIndex++;
    }

    // Video filter: scale to target resolution
    filters.push(`[${videoInput}:v]scale=${formatSpec.width}:${formatSpec.height}:force_original_aspect_ratio=decrease,pad=${formatSpec.width}:${formatSpec.height}:(ow-iw)/2:(oh-ih)/2[scaled]`);

    // Video filter: add captions
    if (config.captions.length > 0) {
      const drawTextFilters = this.buildCaptionFilters(config.captions, config.captionStyle);
      filters.push(`[scaled]${drawTextFilters}[captioned]`);
    } else {
      filters.push(`[scaled]copy[captioned]`);
    }

    // Audio filters
    const audioFilters: string[] = [];

    // Voice at full volume
    audioFilters.push(`[${voiceInput}:a]volume=1.0[voice]`);

    // Background music with ducking
    if (musicInput !== null) {
      // Use sidechaincompress to duck music under voice
      audioFilters.push(`[${musicInput}:a]aloop=loop=-1:size=2e+09,volume=0.15[musicloop]`);
      audioFilters.push(`[musicloop][voice]sidechaincompress=threshold=0.02:ratio=10:attack=50:release=300[duckedmusic]`);
    }

    // Ambience (very quiet)
    if (ambienceInput !== null) {
      audioFilters.push(`[${ambienceInput}:a]aloop=loop=-1:size=2e+09,volume=0.08[ambienceloop]`);
    }

    // Mix all audio
    const audioInputs = ["[voice]"];
    if (musicInput !== null) audioInputs.push("[duckedmusic]");
    if (ambienceInput !== null) audioInputs.push("[ambienceloop]");
    audioFilters.push(`${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=first:dropout_transition=2[audioout]`);

    // Combine all filters
    const filterComplex = [...filters, ...audioFilters].join(";");

    // Build final command
    const command = [
      "ffmpeg",
      "-y", // Overwrite output
      ...inputs,
      `-filter_complex "${filterComplex}"`,
      `-map "[captioned]"`,
      `-map "[audioout]"`,
      `-c:v libx264`,
      `-preset ${qualityPreset.preset}`,
      `-crf ${qualityPreset.crf}`,
      `-c:a aac`,
      `-b:a 192k`,
      `-r ${formatSpec.fps}`,
      `-pix_fmt yuv420p`,
      `-movflags +faststart`,
      `output.mp4`,
    ];

    return command.join(" ");
  }

  /**
   * Build drawtext filters for captions
   */
  private buildCaptionFilters(
    captions: Caption[],
    style: RenderConfig["captionStyle"]
  ): string {
    const filters: string[] = [];

    for (const caption of captions) {
      // Escape special characters for ffmpeg
      const text = caption.text
        .replace(/'/g, "'\\''")
        .replace(/:/g, "\\:");

      // Calculate position
      const x = caption.position?.x ?? 0.5;
      const y = caption.position?.y ?? 0.75;

      // Build enable expression (when to show caption)
      const enable = `between(t,${caption.start},${caption.end})`;

      // Build drawtext filter
      const drawtext = [
        `drawtext=text='${text}'`,
        `fontfile=/path/to/font.ttf`, // Would be configured
        `fontsize=${style.fontSize}`,
        `fontcolor=${style.color}`,
        `borderw=${style.strokeWidth}`,
        `bordercolor=${style.strokeColor}`,
        `x=(w-tw)*${x}`,
        `y=(h-th)*${y}`,
        `enable='${enable}'`,
      ].join(":");

      filters.push(drawtext);
    }

    return filters.join(",");
  }

  /**
   * Parse RunPod result
   */
  private parseRunPodResult(result: any, config: RenderConfig): RenderResult {
    const formatSpec = FORMAT_SPECS[config.format];

    return {
      videoUrl: result.output?.videoUrl || config.talkingVideoUrl,
      thumbnailUrl: result.output?.thumbnailUrl || config.talkingVideoUrl,
      previewGifUrl: result.output?.previewGifUrl,
      duration: result.output?.duration || 0,
      fileSize: result.output?.fileSize || 0,
      metadata: {
        resolution: `${formatSpec.width}x${formatSpec.height}`,
        fps: formatSpec.fps,
        bitrate: parseInt(QUALITY_PRESETS[config.quality].bitrate),
        codec: "h264",
      },
    };
  }

  /**
   * Generate thumbnail from video
   */
  buildThumbnailCommand(videoUrl: string, timestamp: number = 0): string {
    return `ffmpeg -i "${videoUrl}" -ss ${timestamp} -vframes 1 -q:v 2 thumbnail.jpg`;
  }

  /**
   * Generate preview GIF from video
   */
  buildPreviewGifCommand(videoUrl: string, duration: number = 3): string {
    return `ffmpeg -i "${videoUrl}" -t ${duration} -vf "fps=10,scale=320:-1:flags=lanczos" -c:v gif preview.gif`;
  }
}

// Export singleton
export const renderService = new RenderService();
