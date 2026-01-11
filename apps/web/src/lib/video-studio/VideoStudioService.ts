/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDEO STUDIO SERVICE - Pixar-Grade Video Generation Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The complete pipeline that makes PersonaForge videos "Pixar would be proud":
 *
 * 1. DIRECTOR PHASE
 *    - LLM generates DirectorJSON from raw script
 *    - Defines emotion curve, SFX events, music plan, camera moves, caption plan
 *
 * 2. VOICE PHASE
 *    - ElevenLabs TTS with word-level timestamps
 *    - This timing data drives EVERYTHING else
 *
 * 3. LIP-SYNC PHASE
 *    - LatentSync/MuseTalk for identity-consistent talking portraits
 *    - No identity drift across videos
 *
 * 4. AUDIO POST PHASE
 *    - Music bed with intelligent ducking
 *    - SFX hits at timestamp events
 *    - Ambience layering
 *
 * 5. CAPTION PHASE
 *    - Word-level highlighting using voice timestamps
 *    - TikTok-style emphasis animations
 *
 * 6. RENDER PHASE
 *    - ffmpeg composition of all layers
 *    - Camera moves, color grading
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { db, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import { sql } from "drizzle-orm";
import { DirectorJSON, generateCaptionGroups } from "./DirectorTypes";
import { directorService, PersonaContext } from "./DirectorService";
import { elevenLabsService, TTSWithTimestampsResult } from "./ElevenLabsService";
import { lipSyncService, LipSyncResult } from "./LipSyncService";
import { audioPostService } from "./AudioPostService";
import { renderService } from "./RenderService";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VideoFormat =
  | "tiktok_vertical"
  | "instagram_reel"
  | "instagram_square"
  | "youtube_short"
  | "youtube_standard"
  | "twitter_video"
  | "custom";

export type VideoQuality = "draft" | "standard" | "premium" | "cinematic";

export type VideoJobStatus =
  | "pending"
  | "directing"        // LLM generating Director JSON
  | "voice_generation" // ElevenLabs TTS with timestamps
  | "lip_sync"         // LatentSync/MuseTalk
  | "audio_post"       // Music, SFX, mixing
  | "caption_burn"     // Caption rendering
  | "final_render"     // ffmpeg composition
  | "completed"
  | "failed";

export interface VideoJobConfig {
  personaId: string;
  userId: string;
  title?: string;
  rawScript: string;
  format?: VideoFormat;
  quality?: VideoQuality;
  durationTarget?: number;
  emotion?: string;
  musicMood?: string;
  captionStyle?: "tiktok" | "minimal" | "bold" | "typewriter";
  lipSyncModel?: "latentsync" | "musetalk" | "sadtalker";
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  style?: string;
  animation?: string;
  position?: { x: number; y: number };
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
const QUALITY_PRESETS: Record<VideoQuality, { bitrate: string; enhancer: boolean; lipSyncQuality: string }> = {
  draft: { bitrate: "2M", enhancer: false, lipSyncQuality: "fast" },
  standard: { bitrate: "5M", enhancer: true, lipSyncQuality: "standard" },
  premium: { bitrate: "10M", enhancer: true, lipSyncQuality: "high" },
  cinematic: { bitrate: "20M", enhancer: true, lipSyncQuality: "high" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STUDIO SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class VideoStudioService {
  /**
   * Create a new video generation job
   */
  async createJob(config: VideoJobConfig): Promise<string> {
    const [job] = await db
      .insert(schema.videoJobs)
      .values({
        personaId: config.personaId,
        userId: config.userId,
        title: config.title || "Untitled Video",
        rawScript: config.rawScript,
        format: config.format || "tiktok_vertical",
        quality: config.quality || "standard",
        durationTarget: config.durationTarget,
        status: "pending",
        currentStep: "pending",
        progress: 0,
      })
      .returning({ id: schema.videoJobs.id });

    return job.id;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    const [job] = await db
      .select()
      .from(schema.videoJobs)
      .where(eq(schema.videoJobs.id, jobId))
      .limit(1);
    return job;
  }

  /**
   * List jobs for a persona
   */
  async listJobs(personaId: string, limit = 20) {
    return db
      .select()
      .from(schema.videoJobs)
      .where(eq(schema.videoJobs.personaId, personaId))
      .orderBy(sql`created_at DESC`)
      .limit(limit);
  }

  /**
   * Update job status and progress
   */
  async updateJob(
    jobId: string,
    updates: Partial<{
      status: VideoJobStatus;
      currentStep: string;
      progress: number;
      error: string | null;
      [key: string]: unknown;
    }>
  ) {
    await db
      .update(schema.videoJobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.videoJobs.id, jobId));
  }

  /**
   * Execute the full Pixar-grade video pipeline
   */
  async executeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error("Job not found");

    // Get persona
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, job.personaId))
      .limit(1);

    if (!persona) throw new Error("Persona not found");

    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Mark job as started
      await this.updateJob(jobId, {
        status: "directing",
        currentStep: "directing",
        progress: 5,
        startedAt: new Date(),
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 1: DIRECTOR - LLM generates the timeline
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 1: Director generating timeline...`);

      const personaContext: PersonaContext = {
        id: persona.id,
        name: persona.name,
        archetype: persona.archetype || "sage",
        traits: (persona.traits as string[]) || [],
        temperament: persona.temperament || undefined,
        visualStyle: persona.visualStylePreset || undefined,
      };

      const directorJSON = await directorService.generateDirectorJSON({
        rawScript: job.rawScript!,
        persona: personaContext,
        format: job.format as any,
        quality: job.quality as any,
        mood: job.soundDesignMetadata?.musicMood as string | undefined,
        targetDuration: job.durationTarget || undefined,
      });

      await this.updateJob(jobId, {
        polishedScript: directorJSON.polishedScript,
        scriptEmotion: directorJSON.emotionCurve.defaultEmotion,
        scriptMetadata: {
          wordCount: directorJSON.polishedScript.split(/\s+/).length,
          estimatedDuration: directorJSON.estimatedDuration,
          emotionTags: directorJSON.emotionCurve.keyframes.map(k => k.emotion),
        },
        progress: 15,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 2: VOICE - ElevenLabs TTS with timestamps
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 2: Generating voice with timestamps...`);
      await this.updateJob(jobId, { status: "voice_generation", currentStep: "voice_generation", progress: 20 });

      const voiceId = persona.voiceId || elevenLabsService.selectVoiceForPersona(
        persona.archetype || "sage",
        persona.name
      );

      const voiceResult = await elevenLabsService.generateWithTimestamps(
        directorJSON.polishedScript,
        voiceId,
        directorJSON.emotionCurve.defaultEmotion
      );

      totalCost += voiceResult.cost;

      await this.updateJob(jobId, {
        voiceAudioUrl: voiceResult.audioUrl,
        voiceAudioDuration: voiceResult.duration,
        voiceMetadata: {
          voiceId,
          provider: "elevenlabs",
          wordTimings: voiceResult.wordTimings,
        },
        voiceCostUsd: voiceResult.cost,
        progress: 35,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 3: LIP-SYNC - LatentSync/MuseTalk talking portrait
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 3: Generating lip-synced video...`);
      await this.updateJob(jobId, { status: "lip_sync", currentStep: "lip_sync", progress: 40 });

      const imageUrl = persona.primaryImageUrl;
      if (!imageUrl) {
        throw new Error("Persona has no image for lip-sync");
      }

      const qualityPreset = QUALITY_PRESETS[job.quality as VideoQuality];
      const lipSyncModel = lipSyncService.recommendModel({
        quality: qualityPreset.lipSyncQuality as any,
        identityConsistency: "high",
      });

      const lipSyncResult = await lipSyncService.generate(imageUrl, voiceResult.audioBase64, {
        model: lipSyncModel,
        quality: qualityPreset.lipSyncQuality as any,
        enhancer: qualityPreset.enhancer,
      });

      totalCost += lipSyncResult.cost;

      await this.updateJob(jobId, {
        talkingVideoUrl: lipSyncResult.videoUrl,
        talkingVideoMetadata: {
          model: lipSyncResult.model,
          resolution: FORMAT_SPECS[job.format as VideoFormat].width + "x" + FORMAT_SPECS[job.format as VideoFormat].height,
          fps: FORMAT_SPECS[job.format as VideoFormat].fps,
          processingTime: lipSyncResult.processingTime,
        },
        videoCostUsd: lipSyncResult.cost,
        progress: 60,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 4: AUDIO POST - Music ducking, SFX, mixing
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 4: Audio post-processing...`);
      await this.updateJob(jobId, { status: "audio_post", currentStep: "audio_post", progress: 65 });

      const audioMixConfig = audioPostService.createMixConfig(
        voiceResult.audioUrl,
        voiceResult.duration,
        voiceResult.wordTimings,
        directorJSON.musicPlan,
        directorJSON.sfxEvents,
        directorJSON.ambiencePlan?.type
      );

      await this.updateJob(jobId, {
        backgroundMusicUrl: audioMixConfig.musicTrack?.url || null,
        backgroundMusicVolume: directorJSON.musicPlan.baseVolume,
        ambienceUrl: audioMixConfig.ambienceTrack?.url || null,
        sfxTracks: audioMixConfig.sfxTracks,
        soundDesignMetadata: {
          musicMood: directorJSON.musicPlan.mood,
          musicGenre: directorJSON.musicPlan.genre,
          ambienceType: directorJSON.ambiencePlan?.type,
        },
        progress: 75,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 5: CAPTIONS - Word-level highlighting
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 5: Generating captions...`);
      await this.updateJob(jobId, { status: "caption_burn", currentStep: "caption_burn", progress: 80 });

      const captionGroups = generateCaptionGroups(
        voiceResult.wordTimings,
        directorJSON.captionPlan.wordsPerGroup
      );

      const captions: Caption[] = captionGroups.map(group => ({
        text: group.text,
        start: group.start,
        end: group.end,
        style: directorJSON.captionPlan.style,
        animation: directorJSON.captionPlan.animation,
        position: directorJSON.captionPlan.position,
      }));

      await this.updateJob(jobId, {
        captions,
        captionStyle: directorJSON.captionPlan.style,
        captionMetadata: {
          font: directorJSON.captionPlan.fontFamily,
          fontSize: directorJSON.captionPlan.fontSize === "xlarge" ? 72 :
                   directorJSON.captionPlan.fontSize === "large" ? 56 :
                   directorJSON.captionPlan.fontSize === "medium" ? 42 : 32,
          color: directorJSON.captionPlan.color,
          strokeColor: directorJSON.captionPlan.strokeColor,
          animation: directorJSON.captionPlan.animation,
        },
        progress: 85,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 6: FINAL RENDER - ffmpeg composition
      // ═══════════════════════════════════════════════════════════════════════
      console.log(`[VideoStudio] Phase 6: Final render...`);
      await this.updateJob(jobId, { status: "final_render", currentStep: "final_render", progress: 90 });

      // Get updated job with all URLs
      const updatedJob = await this.getJob(jobId);
      const formatSpec = FORMAT_SPECS[job.format as VideoFormat];

      // Use the render service to compose final video
      const renderResult = await renderService.render({
        talkingVideoUrl: updatedJob!.talkingVideoUrl || imageUrl,
        voiceAudioUrl: voiceResult.audioUrl,
        backgroundMusicUrl: audioMixConfig.musicTrack?.url,
        ambienceUrl: audioMixConfig.ambienceTrack?.url,
        sfxTracks: audioMixConfig.sfxTracks.map(t => ({
          url: t.url,
          startTime: t.startTime,
          volume: t.volume,
        })),
        captions,
        captionStyle: {
          fontFamily: directorJSON.captionPlan.fontFamily || "Arial",
          fontSize: directorJSON.captionPlan.fontSize === "xlarge" ? 72 :
                   directorJSON.captionPlan.fontSize === "large" ? 56 :
                   directorJSON.captionPlan.fontSize === "medium" ? 42 : 32,
          color: directorJSON.captionPlan.color,
          strokeColor: directorJSON.captionPlan.strokeColor || "#000000",
          strokeWidth: directorJSON.captionPlan.strokeWidth || 2,
          animation: directorJSON.captionPlan.animation,
        },
        cameraPlan: directorJSON.cameraPlan,
        format: job.format as VideoFormat,
        quality: job.quality as VideoQuality,
      });

      const finalVideoUrl = renderResult.videoUrl;
      const renderCost = 0.02;
      totalCost += renderCost;

      // ═══════════════════════════════════════════════════════════════════════
      // COMPLETE
      // ═══════════════════════════════════════════════════════════════════════
      const actualDurationMs = Date.now() - startTime;

      await this.updateJob(jobId, {
        status: "completed",
        currentStep: "completed",
        progress: 100,
        finalVideoUrl,
        thumbnailUrl: finalVideoUrl,
        finalMetadata: {
          resolution: `${formatSpec.width}x${formatSpec.height}`,
          fps: formatSpec.fps,
          bitrate: parseInt(qualityPreset.bitrate),
          codec: "h264",
          duration: voiceResult.duration,
        },
        renderCostUsd: renderCost,
        totalCostUsd: totalCost,
        actualDurationMs,
        completedAt: new Date(),
      });

      console.log(`[VideoStudio] Job ${jobId} completed in ${actualDurationMs}ms, cost: $${totalCost.toFixed(3)}`);
    } catch (error: any) {
      console.error(`[VideoStudio] Job ${jobId} failed:`, error);
      await this.updateJob(jobId, {
        status: "failed",
        error: error.message || "Unknown error",
      });
      throw error;
    }
  }
}

// Export singleton
export const videoStudioService = new VideoStudioService();
