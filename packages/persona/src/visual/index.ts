/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA VISUAL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete visual pipeline for PersonaForge.
 * Handles image generation, animation, lip sync, and enhancement.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Style Presets
export {
  STYLE_PRESETS,
  COLOR_GRADES,
  EXPRESSION_PROMPTS,
  ANGLE_PROMPTS,
  buildVisualPrompt,
  getStylePreset,
  getAvailableStyles,
  type StylePreset,
  type ExpressionType,
  type AngleType,
} from './presets';

// AnimateDiff - Image to Video
export {
  AnimateDiffClient,
  createAnimateDiffClient,
  MOTION_PRESETS,
  EMOTION_MOTION_MODIFIERS,
  type AnimateDiffConfig,
  type MotionPreset,
  type MotionPresetName,
  type AnimationRequest,
  type AnimationResult,
} from './animate-diff';

// LivePortrait & SadTalker - Real-time Animation & Lip Sync
export {
  LivePortraitClient,
  SadTalkerClient,
  createLivePortraitClient,
  createSadTalkerClient,
  type LivePortraitConfig,
  type SadTalkerConfig,
  type FaceRig,
  type MouthShape,
  type DrivingParams,
  type LipSyncRequest,
  type LipSyncResult,
  type RealTimeFrameResult,
} from './live-portrait';

// Image Enhancement
export {
  ImageEnhancer,
  createImageEnhancer,
  COLOR_PRESETS,
  type EnhancerConfig,
  type EnhancementOptions,
  type EnhancementResult,
  type ColorGradeOptions,
  type ColorPresetName,
} from './enhancer';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED VISUAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

import type { PersonaVisualStyle, EmotionState } from '../types';
import type { VisualDNA, ExpressionGrid } from '../genome/types';

import { STYLE_PRESETS, EXPRESSION_PROMPTS, buildVisualPrompt } from './presets';
import { AnimateDiffClient, type AnimateDiffConfig, MOTION_PRESETS } from './animate-diff';
import { LivePortraitClient, SadTalkerClient, type LivePortraitConfig, type SadTalkerConfig } from './live-portrait';
import { ImageEnhancer, type EnhancerConfig } from './enhancer';

export interface VisualEngineConfig {
  /** AnimateDiff endpoint config */
  animateDiff?: AnimateDiffConfig;
  /** LivePortrait endpoint config */
  livePortrait?: LivePortraitConfig;
  /** SadTalker endpoint config */
  sadTalker?: SadTalkerConfig;
  /** Image enhancer endpoint config */
  enhancer?: EnhancerConfig;
  /** GPU provider for image generation (RunPod/Replicate) */
  gpuProvider: {
    endpoint: string;
    apiKey: string;
  };
}

export interface GenerationRequest {
  /** Style preset to use */
  style: PersonaVisualStyle;
  /** Character description */
  description: string;
  /** Expression to generate */
  expression?: keyof typeof EXPRESSION_PROMPTS;
  /** Custom prompt additions */
  customPrompt?: string;
  /** Number of variations to generate */
  variations?: number;
  /** Seed for reproducibility */
  seed?: number;
  /** Apply face restoration */
  enhanceFace?: boolean;
}

export interface GenerationResult {
  images: Array<{
    url: string;
    seed: number;
    expression: string;
    generationTimeMs: number;
  }>;
  totalCost: number;
}

/**
 * Unified Visual Engine
 * 
 * Orchestrates all visual generation and animation for personas.
 */
export class PersonaVisualEngine {
  private animateDiff?: AnimateDiffClient;
  private livePortrait?: LivePortraitClient;
  private sadTalker?: SadTalkerClient;
  private enhancer?: ImageEnhancer;
  private gpuConfig: VisualEngineConfig['gpuProvider'];

  constructor(config: VisualEngineConfig) {
    this.gpuConfig = config.gpuProvider;

    if (config.animateDiff) {
      this.animateDiff = new AnimateDiffClient(config.animateDiff);
    }
    if (config.livePortrait) {
      this.livePortrait = new LivePortraitClient(config.livePortrait);
    }
    if (config.sadTalker) {
      this.sadTalker = new SadTalkerClient(config.sadTalker);
    }
    if (config.enhancer) {
      this.enhancer = new ImageEnhancer(config.enhancer);
    }
  }

  /**
   * Generate character images
   */
  async generateImages(request: GenerationRequest): Promise<GenerationResult> {
    const {
      style,
      description,
      expression = 'neutral',
      customPrompt,
      variations = 4,
      seed,
      enhanceFace = true,
    } = request;

    const preset = STYLE_PRESETS[style];
    const { positive, negative } = buildVisualPrompt({
      style,
      description,
      expression,
      customPrompt,
    });

    const images: GenerationResult['images'] = [];
    let totalCost = 0;

    // Generate variations
    for (let i = 0; i < variations; i++) {
      const imageSeed = seed ? seed + i : Math.floor(Math.random() * 2147483647);
      const startTime = Date.now();

      const response = await fetch(`${this.gpuConfig.endpoint}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.gpuConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: positive,
            negative_prompt: negative,
            width: 1024,
            height: 1024,
            steps: preset.steps,
            cfg_scale: preset.cfgScale,
            sampler: preset.sampler,
            seed: imageSeed,
            checkpoint: preset.checkpoint,
            loras: preset.loras,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      let imageUrl = result.output?.image_url || result.output;

      // Enhance if requested
      if (enhanceFace && this.enhancer) {
        const enhanced = await this.enhancer.enhance(imageUrl, {
          faceRestore: true,
          faceRestoreStrength: 0.7,
          upscaleFactor: 1, // No upscale for now
        });
        imageUrl = enhanced.imageUrl;
        totalCost += enhanced.cost;
      }

      images.push({
        url: imageUrl,
        seed: imageSeed,
        expression,
        generationTimeMs: Date.now() - startTime,
      });

      totalCost += 0.05; // Base generation cost
    }

    return { images, totalCost };
  }

  /**
   * Generate expression grid for a persona
   */
  async generateExpressionGrid(
    sourceImageUrl: string,
    style: PersonaVisualStyle,
    identityEmbedding?: number[]
  ): Promise<ExpressionGrid> {
    const expressions: (keyof typeof EXPRESSION_PROMPTS)[] = [
      'neutral', 'happy', 'sad', 'angry', 'surprised', 'thoughtful',
      'excited', 'concerned', 'confident', 'curious', 'loving', 'disappointed',
    ];

    const grid: ExpressionGrid = {};

    for (const expression of expressions) {
      const result = await this.generateImages({
        style,
        description: `Same character, ${EXPRESSION_PROMPTS[expression].prompt}`,
        expression,
        variations: 1,
        enhanceFace: true,
      });

      if (result.images.length > 0) {
        grid[expression] = {
          imageUrl: result.images[0]!.url,
          seed: result.images[0]!.seed,
          generatedAt: new Date().toISOString(),
        };
      }
    }

    return grid;
  }

  /**
   * Generate animated video from static image
   */
  async animate(
    sourceImageUrl: string,
    options: {
      motionPreset?: keyof typeof MOTION_PRESETS;
      emotion?: EmotionState;
      duration?: number;
      includeAudio?: boolean;
      audioText?: string;
    } = {}
  ) {
    if (!this.animateDiff) {
      throw new Error('AnimateDiff not configured');
    }

    return this.animateDiff.animate({
      sourceImageUrl,
      motionPreset: options.motionPreset || 'cinematic_slow',
      emotion: options.emotion,
      duration: options.duration,
      includeAudio: options.includeAudio,
      audioText: options.audioText,
    });
  }

  /**
   * Generate lip-synced video from image and audio
   */
  async lipSync(
    sourceImageUrl: string,
    audioSource: string,
    options: {
      expression?: EmotionState;
      quality?: 'fast' | 'balanced' | 'high';
    } = {}
  ) {
    if (!this.sadTalker) {
      throw new Error('SadTalker not configured');
    }

    return this.sadTalker.generateLipSync({
      sourceImageUrl,
      audioSource,
      expression: options.expression,
      quality: options.quality,
    });
  }

  /**
   * Initialize real-time animation for video calls
   */
  async initializeRealTime(sourceImageUrl: string) {
    if (!this.livePortrait) {
      throw new Error('LivePortrait not configured');
    }

    await this.livePortrait.initialize(sourceImageUrl);
    return this.livePortrait;
  }

  /**
   * Full visual pipeline: generate base image, expression grid, intro video
   */
  async fullPipeline(options: {
    description: string;
    style: PersonaVisualStyle;
    generateVideo?: boolean;
    videoDuration?: number;
  }): Promise<{
    primaryImage: string;
    expressionGrid: ExpressionGrid;
    introVideo?: string;
    totalCost: number;
  }> {
    let totalCost = 0;

    // Step 1: Generate primary image (4 variations, user picks one)
    const variations = await this.generateImages({
      style: options.style,
      description: options.description,
      variations: 4,
      enhanceFace: true,
    });
    totalCost += variations.totalCost;

    // For demo, use first image as primary
    const primaryImage = variations.images[0]!.url;

    // Step 2: Generate expression grid
    const expressionGrid = await this.generateExpressionGrid(
      primaryImage,
      options.style
    );
    totalCost += Object.keys(expressionGrid).length * 0.05;

    // Step 3: Generate intro video (optional)
    let introVideo: string | undefined;
    if (options.generateVideo && this.animateDiff) {
      const animation = await this.animate(primaryImage, {
        motionPreset: 'cinematic_slow',
        duration: options.videoDuration || 5,
      });
      introVideo = animation.videoUrl;
      totalCost += animation.cost;
    }

    return {
      primaryImage,
      expressionGrid,
      introVideo,
      totalCost,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.livePortrait) {
      await this.livePortrait.cleanup();
    }
  }
}

// Factory function
export function createVisualEngine(config: VisualEngineConfig): PersonaVisualEngine {
  return new PersonaVisualEngine(config);
}
