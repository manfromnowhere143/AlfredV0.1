/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAL ENGINE: ANIMATEDIFF INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Image-to-video diffusion for cinematic character animations.
 * Creates smooth, stylized motion from static persona images.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnimateDiffConfig {
  /** GPU provider endpoint */
  endpoint: string;
  /** API key */
  apiKey: string;
  /** Timeout in ms */
  timeout?: number;
}

export interface MotionPreset {
  name: string;
  description: string;
  motionModule: string;
  motionLora?: string;
  motionLoraWeight?: number;
  settings: {
    motionScale: number;
    headMovement: 'none' | 'subtle' | 'natural' | 'dynamic';
    blinkRate: number;
    breathing: boolean;
    eyeMovement: 'static' | 'natural' | 'expressive';
    cameraMotion?: string;
  };
  fps: number;
  defaultDuration: number;
}

export interface AnimationRequest {
  /** Source image URL */
  sourceImageUrl: string;
  /** Motion preset to use */
  motionPreset: keyof typeof MOTION_PRESETS;
  /** Target emotion for expression */
  emotion?: EmotionState;
  /** Duration in seconds */
  duration?: number;
  /** Custom motion prompt */
  motionPrompt?: string;
  /** Output format */
  outputFormat?: 'mp4' | 'webm' | 'gif';
  /** Output quality */
  quality?: 'draft' | 'standard' | 'high';
  /** Include audio track */
  includeAudio?: boolean;
  /** Audio narration text */
  audioText?: string;
}

export interface AnimationResult {
  /** Generated video URL */
  videoUrl: string;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Frame count */
  frameCount: number;
  /** FPS */
  fps: number;
  /** Generation time in ms */
  generationTimeMs: number;
  /** Cost in USD */
  cost: number;
  /** Seed used */
  seed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const MOTION_PRESETS = {
  cinematic_slow: {
    name: 'Cinematic Slow',
    description: 'Dramatic, slow movements with subtle camera drift. Perfect for trailers and intros.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'cinematic_smooth_v2',
    motionLoraWeight: 0.7,
    settings: {
      motionScale: 0.6,
      headMovement: 'subtle',
      blinkRate: 0.15,
      breathing: true,
      eyeMovement: 'natural',
      cameraMotion: 'slow_push_in',
    },
    fps: 24,
    defaultDuration: 5,
  },

  energetic: {
    name: 'Energetic',
    description: 'Dynamic, lively motion for marketing and social content.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'energetic_motion_v1',
    motionLoraWeight: 0.8,
    settings: {
      motionScale: 1.2,
      headMovement: 'dynamic',
      blinkRate: 0.25,
      breathing: true,
      eyeMovement: 'expressive',
      cameraMotion: 'dynamic_orbit',
    },
    fps: 30,
    defaultDuration: 3,
  },

  conversational: {
    name: 'Conversational',
    description: 'Natural, realistic movements for dialogue and chatbots.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'natural_talk_v3',
    motionLoraWeight: 0.75,
    settings: {
      motionScale: 0.8,
      headMovement: 'natural',
      blinkRate: 0.2,
      breathing: true,
      eyeMovement: 'natural',
      cameraMotion: 'static',
    },
    fps: 30,
    defaultDuration: 4,
  },

  professional: {
    name: 'Professional',
    description: 'Minimal, controlled movements for corporate content.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'professional_v2',
    motionLoraWeight: 0.6,
    settings: {
      motionScale: 0.5,
      headMovement: 'subtle',
      blinkRate: 0.18,
      breathing: true,
      eyeMovement: 'natural',
      cameraMotion: 'static',
    },
    fps: 30,
    defaultDuration: 4,
  },

  dreamy: {
    name: 'Dreamy',
    description: 'Ethereal, floating movements with soft focus transitions.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'dreamy_float_v1',
    motionLoraWeight: 0.8,
    settings: {
      motionScale: 0.7,
      headMovement: 'subtle',
      blinkRate: 0.1,
      breathing: true,
      eyeMovement: 'natural',
      cameraMotion: 'gentle_float',
    },
    fps: 24,
    defaultDuration: 6,
  },

  intense: {
    name: 'Intense',
    description: 'Powerful, dramatic movements for action and tension.',
    motionModule: 'mm_sd_v15_v2',
    motionLora: 'intense_drama_v1',
    motionLoraWeight: 0.85,
    settings: {
      motionScale: 1.0,
      headMovement: 'dynamic',
      blinkRate: 0.12,
      breathing: true,
      eyeMovement: 'expressive',
      cameraMotion: 'shake_subtle',
    },
    fps: 30,
    defaultDuration: 3,
  },

  idle_loop: {
    name: 'Idle Loop',
    description: 'Seamless looping animation for persistent avatars.',
    motionModule: 'mm_sd_v15_v2',
    settings: {
      motionScale: 0.4,
      headMovement: 'subtle',
      blinkRate: 0.2,
      breathing: true,
      eyeMovement: 'natural',
      cameraMotion: 'none',
    },
    fps: 24,
    defaultDuration: 4,
  },
} as const;

export type MotionPresetName = keyof typeof MOTION_PRESETS;

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION TO MOTION MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const EMOTION_MOTION_MODIFIERS: Record<EmotionState, {
  motionScaleMultiplier: number;
  headMovementOverride?: 'none' | 'subtle' | 'natural' | 'dynamic';
  eyeMovementOverride?: 'static' | 'natural' | 'expressive';
  additionalPrompt: string;
}> = {
  neutral: {
    motionScaleMultiplier: 1.0,
    additionalPrompt: 'calm neutral expression, relaxed',
  },
  happy: {
    motionScaleMultiplier: 1.2,
    eyeMovementOverride: 'expressive',
    additionalPrompt: 'happy smile, joyful movement, bright eyes',
  },
  sad: {
    motionScaleMultiplier: 0.7,
    headMovementOverride: 'subtle',
    additionalPrompt: 'sad expression, slow movement, downcast eyes',
  },
  angry: {
    motionScaleMultiplier: 1.1,
    eyeMovementOverride: 'expressive',
    additionalPrompt: 'intense expression, tense movement, piercing gaze',
  },
  surprised: {
    motionScaleMultiplier: 1.3,
    eyeMovementOverride: 'expressive',
    additionalPrompt: 'surprised expression, wide eyes, raised eyebrows',
  },
  thoughtful: {
    motionScaleMultiplier: 0.8,
    headMovementOverride: 'subtle',
    additionalPrompt: 'contemplative expression, slight head tilt, pondering',
  },
  excited: {
    motionScaleMultiplier: 1.4,
    headMovementOverride: 'dynamic',
    eyeMovementOverride: 'expressive',
    additionalPrompt: 'excited expression, energetic movement, bright smile',
  },
  calm: {
    motionScaleMultiplier: 0.6,
    headMovementOverride: 'subtle',
    additionalPrompt: 'serene expression, peaceful, relaxed breathing',
  },
  confident: {
    motionScaleMultiplier: 0.9,
    additionalPrompt: 'confident expression, assured posture, slight smirk',
  },
  curious: {
    motionScaleMultiplier: 1.0,
    eyeMovementOverride: 'expressive',
    additionalPrompt: 'curious expression, interested gaze, head tilt',
  },
  concerned: {
    motionScaleMultiplier: 0.85,
    additionalPrompt: 'concerned expression, empathetic, soft eyes',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATEDIFF CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class AnimateDiffClient {
  private config: AnimateDiffConfig;

  constructor(config: AnimateDiffConfig) {
    this.config = {
      timeout: 180000, // 3 minutes default
      ...config,
    };
  }

  /**
   * Generate animated video from static image
   */
  async animate(request: AnimationRequest): Promise<AnimationResult> {
    const preset = MOTION_PRESETS[request.motionPreset];
    const emotionMod = request.emotion 
      ? EMOTION_MOTION_MODIFIERS[request.emotion] 
      : null;

    // Build motion parameters
    const motionScale = preset.settings.motionScale 
      * (emotionMod?.motionScaleMultiplier || 1.0);

    const motionPrompt = [
      request.motionPrompt,
      emotionMod?.additionalPrompt,
      `${preset.settings.headMovement} head movement`,
      preset.settings.breathing ? 'natural breathing' : '',
      `${preset.settings.eyeMovement} eye movement`,
    ].filter(Boolean).join(', ');

    // Prepare API request
    const payload = {
      input: {
        image: request.sourceImageUrl,
        motion_module: preset.motionModule,
        motion_lora: 'motionLora' in preset ? (preset as any).motionLora : undefined,
        motion_lora_weight: 'motionLoraWeight' in preset ? (preset as any).motionLoraWeight : 0.8,
        motion_prompt: motionPrompt,
        motion_scale: motionScale,
        fps: preset.fps,
        frames: Math.round((request.duration || preset.defaultDuration) * preset.fps),
        seed: Math.floor(Math.random() * 2147483647),
        quality: request.quality || 'standard',
        output_format: request.outputFormat || 'mp4',
      },
    };

    const startTime = Date.now();

    // Submit job
    const response = await fetch(`${this.config.endpoint}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AnimateDiff API error: ${response.statusText}`);
    }

    const job = await response.json();
    const jobId = job.id;

    // Poll for completion
    const result = await this.pollForCompletion(jobId);

    const generationTimeMs = Date.now() - startTime;
    const duration = request.duration || preset.defaultDuration;
    const cost = this.calculateCost(duration, request.quality || 'standard');

    return {
      videoUrl: result.output.video_url,
      thumbnailUrl: result.output.thumbnail_url || result.output.video_url,
      duration,
      frameCount: payload.input.frames,
      fps: preset.fps,
      generationTimeMs,
      cost,
      seed: payload.input.seed,
    };
  }

  /**
   * Generate idle loop animation (seamless)
   */
  async generateIdleLoop(
    sourceImageUrl: string,
    options: {
      duration?: number;
      emotion?: EmotionState;
    } = {}
  ): Promise<AnimationResult> {
    return this.animate({
      sourceImageUrl,
      motionPreset: 'idle_loop',
      emotion: options.emotion,
      duration: options.duration || 4,
      outputFormat: 'webm', // Better for looping
    });
  }

  /**
   * Generate expression transition animation
   */
  async generateExpressionTransition(
    sourceImageUrl: string,
    fromEmotion: EmotionState,
    toEmotion: EmotionState,
    options: {
      duration?: number;
      motionPreset?: MotionPresetName;
    } = {}
  ): Promise<AnimationResult> {
    const transitionPrompt = `smooth transition from ${fromEmotion} expression to ${toEmotion} expression`;

    return this.animate({
      sourceImageUrl,
      motionPreset: options.motionPreset || 'conversational',
      emotion: toEmotion,
      duration: options.duration || 2,
      motionPrompt: transitionPrompt,
    });
  }

  /**
   * Poll for job completion
   */
  private async pollForCompletion(jobId: string): Promise<any> {
    const maxAttempts = Math.ceil((this.config.timeout || 180000) / 2000);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000);

      const response = await fetch(`${this.config.endpoint}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const status = await response.json();

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(`Animation failed: ${status.error || 'Unknown error'}`);
      }
    }

    throw new Error('Animation timed out');
  }

  /**
   * Calculate cost based on duration and quality
   */
  private calculateCost(durationSeconds: number, quality: string): number {
    const baseCostPerSecond = 0.10; // $0.10 per second at standard
    const qualityMultipliers: Record<string, number> = {
      draft: 0.5,
      standard: 1.0,
      high: 2.0,
    };

    return durationSeconds * baseCostPerSecond * (qualityMultipliers[quality] || 1.0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createAnimateDiffClient(config: AnimateDiffConfig): AnimateDiffClient {
  return new AnimateDiffClient(config);
}
