/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROGRESSIVE PREVIEW - "Feels Fast" Trick
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Even if final video takes 40 seconds, you show:
 * - Voice preview in 1-2 seconds
 * - Low-res draft video in 10-15 seconds
 * - Final upscale in 30-60 seconds
 *
 * Users LOVE this. It reduces perceived latency dramatically.
 *
 * The Psychology:
 * - Seeing progress feels faster than waiting
 * - Hearing the voice immediately confirms "it's working"
 * - Draft video gives 90% of the experience immediately
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { EventEmitter } from "events";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreviewStage {
  id: PreviewStageId;
  name: string;
  description: string;
  status: PreviewStatus;
  url?: string;
  duration?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export type PreviewStageId =
  | "script"          // Polished script text
  | "voice"           // Audio-only preview
  | "draft_video"     // Low-res lip-synced video
  | "audio_mix"       // Voice + music preview
  | "final"           // Full quality final video

export type PreviewStatus = "pending" | "generating" | "ready" | "failed";

export interface PreviewConfig {
  enableScriptPreview: boolean;
  enableVoicePreview: boolean;
  enableDraftVideo: boolean;
  enableAudioMixPreview: boolean;
  draftVideoQuality: "very_fast" | "fast" | "balanced";
  onStageReady?: (stage: PreviewStage) => void;
}

export interface PreviewState {
  jobId: string;
  stages: Map<PreviewStageId, PreviewStage>;
  currentStage: PreviewStageId | null;
  overallProgress: number;
}

// Stage definitions
const STAGE_DEFINITIONS: Record<PreviewStageId, { name: string; description: string; targetMs: number }> = {
  script: {
    name: "Script",
    description: "Polished script ready for review",
    targetMs: 500,
  },
  voice: {
    name: "Voice Preview",
    description: "Listen to the voice-over (audio only)",
    targetMs: 2000,
  },
  draft_video: {
    name: "Draft Video",
    description: "Low-res preview of the talking video",
    targetMs: 15000,
  },
  audio_mix: {
    name: "Audio Mix",
    description: "Voice with background music and effects",
    targetMs: 5000,
  },
  final: {
    name: "Final Video",
    description: "Full quality export ready",
    targetMs: 45000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESSIVE PREVIEW SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class ProgressivePreviewService extends EventEmitter {
  private state: PreviewState;
  private config: PreviewConfig;

  constructor(jobId: string, config: Partial<PreviewConfig> = {}) {
    super();

    this.config = {
      enableScriptPreview: true,
      enableVoicePreview: true,
      enableDraftVideo: true,
      enableAudioMixPreview: true,
      draftVideoQuality: "fast",
      ...config,
    };

    this.state = {
      jobId,
      stages: new Map(),
      currentStage: null,
      overallProgress: 0,
    };

    this.initializeStages();
  }

  /**
   * Initialize preview stages
   */
  private initializeStages() {
    const stageOrder: PreviewStageId[] = ["script", "voice", "draft_video", "audio_mix", "final"];

    for (const stageId of stageOrder) {
      const def = STAGE_DEFINITIONS[stageId];
      this.state.stages.set(stageId, {
        id: stageId,
        name: def.name,
        description: def.description,
        status: "pending",
      });
    }
  }

  /**
   * Mark a stage as generating
   */
  startStage(stageId: PreviewStageId) {
    const stage = this.state.stages.get(stageId);
    if (!stage) return;

    stage.status = "generating";
    stage.startedAt = new Date();
    this.state.currentStage = stageId;

    this.emit("stageStarted", { stageId, stage });
    this.updateProgress();
  }

  /**
   * Mark a stage as ready with its preview URL
   */
  completeStage(stageId: PreviewStageId, url: string, duration?: number) {
    const stage = this.state.stages.get(stageId);
    if (!stage) return;

    stage.status = "ready";
    stage.url = url;
    stage.duration = duration;
    stage.completedAt = new Date();

    this.emit("stageReady", { stageId, stage });
    this.config.onStageReady?.(stage);
    this.updateProgress();

    // Log timing
    if (stage.startedAt) {
      const elapsed = stage.completedAt.getTime() - stage.startedAt.getTime();
      const target = STAGE_DEFINITIONS[stageId].targetMs;
      const status = elapsed <= target ? "✅" : "⚠️";
      console.log(`[Preview] ${status} ${stage.name}: ${elapsed}ms (target: ${target}ms)`);
    }
  }

  /**
   * Mark a stage as failed
   */
  failStage(stageId: PreviewStageId, error: string) {
    const stage = this.state.stages.get(stageId);
    if (!stage) return;

    stage.status = "failed";
    stage.completedAt = new Date();

    this.emit("stageFailed", { stageId, stage, error });
    this.updateProgress();
  }

  /**
   * Update overall progress based on stage completion
   */
  private updateProgress() {
    const stages = Array.from(this.state.stages.values());
    const completed = stages.filter((s) => s.status === "ready").length;
    this.state.overallProgress = Math.round((completed / stages.length) * 100);
    this.emit("progressUpdated", { progress: this.state.overallProgress });
  }

  /**
   * Get the latest available preview
   */
  getLatestPreview(): PreviewStage | null {
    const order: PreviewStageId[] = ["final", "audio_mix", "draft_video", "voice", "script"];

    for (const stageId of order) {
      const stage = this.state.stages.get(stageId);
      if (stage?.status === "ready" && stage.url) {
        return stage;
      }
    }

    return null;
  }

  /**
   * Get all available previews
   */
  getAvailablePreviews(): PreviewStage[] {
    return Array.from(this.state.stages.values()).filter(
      (stage) => stage.status === "ready" && stage.url
    );
  }

  /**
   * Get current state
   */
  getState(): PreviewState {
    return { ...this.state };
  }

  /**
   * Check if a specific preview is ready
   */
  isPreviewReady(stageId: PreviewStageId): boolean {
    const stage = this.state.stages.get(stageId);
    return stage?.status === "ready" && !!stage.url;
  }

  /**
   * Get stage by ID
   */
  getStage(stageId: PreviewStageId): PreviewStage | undefined {
    return this.state.stages.get(stageId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW TIMELINE - For UI Display
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreviewTimelineItem {
  stageId: PreviewStageId;
  name: string;
  status: PreviewStatus;
  estimatedMs: number;
  actualMs?: number;
  url?: string;
  isPlayable: boolean;
}

export function buildPreviewTimeline(service: ProgressivePreviewService): PreviewTimelineItem[] {
  const timeline: PreviewTimelineItem[] = [];

  const stageOrder: PreviewStageId[] = ["script", "voice", "draft_video", "audio_mix", "final"];

  for (const stageId of stageOrder) {
    const stage = service.getStage(stageId);
    if (!stage) continue;

    let actualMs: number | undefined;
    if (stage.startedAt && stage.completedAt) {
      actualMs = stage.completedAt.getTime() - stage.startedAt.getTime();
    }

    const isPlayable =
      stage.status === "ready" &&
      !!stage.url &&
      (stageId === "voice" || stageId === "draft_video" || stageId === "audio_mix" || stageId === "final");

    timeline.push({
      stageId,
      name: stage.name,
      status: stage.status,
      estimatedMs: STAGE_DEFINITIONS[stageId].targetMs,
      actualMs,
      url: stage.url,
      isPlayable,
    });
  }

  return timeline;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createPreviewService(
  jobId: string,
  onStageReady?: (stage: PreviewStage) => void
): ProgressivePreviewService {
  return new ProgressivePreviewService(jobId, { onStageReady });
}
