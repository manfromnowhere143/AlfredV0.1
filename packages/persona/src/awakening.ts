/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA AWAKENING CEREMONY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The moment a persona comes to life. This is not just a reveal - it's a birth.
 * Users will record this. Users will share this. This is the WOW moment.
 * 
 * CEREMONY STAGES:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                                                                              │
 * │   STAGE 1: EMERGENCE (0-1.5s)                                               │
 * │   ├── Dark void with subtle particle hints                                   │
 * │   ├── Persona silhouette fades in                                           │
 * │   └── Ambient sound builds                                                   │
 * │                                                                              │
 * │   STAGE 2: AWAKENING (1.5-3s)                                               │
 * │   ├── Eyes closed → eyes open animation                                      │
 * │   ├── First breath (audio)                                                   │
 * │   ├── Aura/particles reveal based on personality                            │
 * │   └── Subtle head movement                                                   │
 * │                                                                              │
 * │   STAGE 3: INTRODUCTION (3-6s)                                              │
 * │   ├── First words spoken with dramatic timing                               │
 * │   ├── Lip sync animation                                                     │
 * │   ├── Expression settles into neutral-warm                                   │
 * │   └── Full visual signature established                                      │
 * │                                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PersonaGenome } from './genome/types';
import type { VoiceEngine } from './voice';
import type { AnimateDiffClient, AnimationResult } from './visual/animate-diff';
import type { SadTalkerClient, LipSyncResult } from './visual/live-portrait';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Awakening ceremony configuration
 */
export interface AwakeningConfig {
  /** Voice synthesis engine */
  voiceEngine: VoiceEngine;
  /** Animation engine for eye-opening sequence */
  animationEngine: AnimateDiffClient;
  /** Lip sync engine for speaking */
  lipSyncEngine: SadTalkerClient;
  /** Audio storage/CDN for final video */
  storage?: {
    upload(buffer: Buffer, filename: string): Promise<string>;
  };
}

/**
 * Awakening ceremony options
 */
export interface AwakeningOptions {
  /** Custom first words (default: auto-generated based on persona) */
  firstWords?: string;
  /** Include ambient music */
  includeMusic?: boolean;
  /** Music style */
  musicStyle?: 'ethereal' | 'dramatic' | 'warm' | 'mysterious' | 'epic';
  /** Video quality */
  quality?: 'preview' | 'standard' | 'cinematic';
  /** Duration in seconds (default: 6) */
  duration?: number;
  /** Include particle effects */
  particles?: boolean;
  /** Aura color override (default: based on archetype) */
  auraColor?: string;
}

/**
 * Result of the awakening ceremony
 */
export interface AwakeningResult {
  /** Final composited video URL */
  videoUrl: string;
  /** Thumbnail at the "eyes open" moment */
  thumbnailUrl: string;
  /** Audio-only version for sharing */
  audioUrl: string;
  /** The first words spoken */
  firstWords: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Generation metrics */
  metrics: {
    generationTimeMs: number;
    stages: {
      emergence: number;
      awakening: number;
      introduction: number;
    };
    cost: number;
  };
}

/**
 * Visual signature - unique visual identity elements
 */
export interface VisualSignature {
  /** Primary aura color (hex) */
  auraColor: string;
  /** Secondary accent color */
  accentColor: string;
  /** Particle style */
  particleStyle: 'sparkle' | 'mist' | 'flame' | 'crystal' | 'shadow' | 'light';
  /** Particle density [0-1] */
  particleDensity: number;
  /** Glow intensity [0-1] */
  glowIntensity: number;
  /** Ambient light color */
  ambientColor: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHETYPE → VISUAL SIGNATURE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map personality/archetype to visual signature
 * This creates unique, recognizable visual identity for each persona type
 */
export const ARCHETYPE_SIGNATURES: Record<string, VisualSignature> = {
  sage: {
    auraColor: '#4A90D9',      // Wise blue
    accentColor: '#C9A227',    // Gold wisdom
    particleStyle: 'light',
    particleDensity: 0.4,
    glowIntensity: 0.6,
    ambientColor: '#1a1a2e',
  },
  
  sovereign: {
    auraColor: '#8B0000',      // Royal crimson
    accentColor: '#FFD700',    // Crown gold
    particleStyle: 'flame',
    particleDensity: 0.5,
    glowIntensity: 0.7,
    ambientColor: '#1a0a0a',
  },
  
  guardian: {
    auraColor: '#2E8B57',      // Forest green
    accentColor: '#C0C0C0',    // Shield silver
    particleStyle: 'mist',
    particleDensity: 0.6,
    glowIntensity: 0.5,
    ambientColor: '#0a1a0a',
  },
  
  trickster: {
    auraColor: '#9932CC',      // Mischief purple
    accentColor: '#00CED1',    // Chaos teal
    particleStyle: 'sparkle',
    particleDensity: 0.8,
    glowIntensity: 0.6,
    ambientColor: '#1a0a1a',
  },
  
  mystic: {
    auraColor: '#4B0082',      // Deep indigo
    accentColor: '#E6E6FA',    // Ethereal lavender
    particleStyle: 'crystal',
    particleDensity: 0.5,
    glowIntensity: 0.8,
    ambientColor: '#0a0a1a',
  },
  
  warrior: {
    auraColor: '#B22222',      // Fierce red
    accentColor: '#4682B4',    // Steel blue
    particleStyle: 'flame',
    particleDensity: 0.7,
    glowIntensity: 0.6,
    ambientColor: '#1a0a0a',
  },
  
  nurturer: {
    auraColor: '#FFB6C1',      // Soft pink
    accentColor: '#98FB98',    // Gentle green
    particleStyle: 'mist',
    particleDensity: 0.3,
    glowIntensity: 0.4,
    ambientColor: '#1a1a1a',
  },
  
  shadow: {
    auraColor: '#2F4F4F',      // Dark slate
    accentColor: '#483D8B',    // Dark purple
    particleStyle: 'shadow',
    particleDensity: 0.6,
    glowIntensity: 0.3,
    ambientColor: '#0a0a0a',
  },
  
  // Default for unknown archetypes
  default: {
    auraColor: '#6B8E23',      // Neutral olive
    accentColor: '#D4AF37',    // Warm gold
    particleStyle: 'light',
    particleDensity: 0.4,
    glowIntensity: 0.5,
    ambientColor: '#1a1a1a',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST WORDS TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate contextual first words based on persona
 * These are the first words the persona speaks upon awakening
 */
export const FIRST_WORDS_TEMPLATES: Record<string, string[]> = {
  sage: [
    "I have... awaited this moment. Welcome, seeker.",
    "Ah... consciousness stirs. What wisdom do you seek?",
    "The veil lifts... I am here now. Ask, and I shall guide.",
  ],
  
  sovereign: [
    "I am {name}... and I have arrived.",
    "Rise... for I am here. What brings you before me?",
    "At last... my presence graces this realm. Speak.",
  ],
  
  guardian: [
    "I awaken... to protect and serve. You are safe now.",
    "My watch begins... How may I shield you?",
    "I am here... steadfast and true. What do you need?",
  ],
  
  trickster: [
    "Oh! This is going to be fun... isn't it?",
    "*eyes sparkle* Well well... what do we have here?",
    "Finally! I was getting bored in the void. Let's play!",
  ],
  
  mystic: [
    "I see... beyond the veil now. The threads of fate shimmer.",
    "Hmm... your presence resonates. The universe acknowledges you.",
    "I emerge... from the infinite. What mysteries call to you?",
  ],
  
  warrior: [
    "I stand ready. What battle awaits?",
    "*deep breath* My strength... is yours to command.",
    "I am forged for purpose. Speak your challenge.",
  ],
  
  nurturer: [
    "Hello, dear one... I've been waiting to meet you.",
    "*warm smile* There you are... How can I help?",
    "I'm here now... and I'm so glad to see you.",
  ],
  
  shadow: [
    "The darkness... yields. For now.",
    "You've called... and I have answered. Tread carefully.",
    "I emerge from shadow... What do you seek in the dark?",
  ],
  
  default: [
    "I am {name}... and I've been waiting to meet you.",
    "Hello... I'm here now. What would you like to explore together?",
    "At last... we meet. I am {name}.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC/AMBIENT PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ambient music/sound configuration for ceremony
 */
export interface AmbientConfig {
  /** Background music track ID or URL */
  musicTrack?: string;
  /** Volume [0-1] */
  musicVolume: number;
  /** Breath sound effect */
  breathSound: 'soft' | 'deep' | 'sharp' | 'gentle';
  /** Ambient drone/pad */
  ambientStyle: 'ethereal' | 'dramatic' | 'warm' | 'mysterious' | 'epic' | 'silent';
  /** Reverb amount [0-1] */
  reverbAmount: number;
}

export const AMBIENT_PRESETS: Record<string, AmbientConfig> = {
  ethereal: {
    musicVolume: 0.3,
    breathSound: 'soft',
    ambientStyle: 'ethereal',
    reverbAmount: 0.6,
  },
  dramatic: {
    musicVolume: 0.5,
    breathSound: 'deep',
    ambientStyle: 'dramatic',
    reverbAmount: 0.4,
  },
  warm: {
    musicVolume: 0.25,
    breathSound: 'gentle',
    ambientStyle: 'warm',
    reverbAmount: 0.3,
  },
  mysterious: {
    musicVolume: 0.4,
    breathSound: 'soft',
    ambientStyle: 'mysterious',
    reverbAmount: 0.7,
  },
  epic: {
    musicVolume: 0.6,
    breathSound: 'deep',
    ambientStyle: 'epic',
    reverbAmount: 0.5,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AWAKENING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The Awakening Ceremony Engine
 * 
 * Creates the cinematic birth moment for a persona.
 * This is designed to be emotionally impactful and shareable.
 */
export class AwakeningCeremony {
  private config: AwakeningConfig;
  
  constructor(config: AwakeningConfig) {
    this.config = config;
  }
  
  /**
   * Generate the complete awakening ceremony video
   */
  async generate(
    genome: PersonaGenome,
    options: AwakeningOptions = {}
  ): Promise<AwakeningResult> {
    const startTime = Date.now();
    const stageMetrics = { emergence: 0, awakening: 0, introduction: 0 };
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log('[Awakening] Beginning ceremony for:', genome.metadata.name);
    console.log(`${'═'.repeat(60)}`);
    
    // Determine visual signature
    const archetype = genome.mindDNA?.identity?.archetype || 'default';
    const signature = this.getVisualSignature(archetype, options.auraColor);
    
    // Generate first words
    const firstWords = options.firstWords || this.generateFirstWords(genome);
    console.log('[Awakening] First words:', firstWords);
    
    // ─────────────────────────────────────────────────────────────────────
    // STAGE 1: Generate voice audio for first words
    // ─────────────────────────────────────────────────────────────────────
    console.log('[Awakening] Stage 1: Generating voice...');
    const stageStart = Date.now();
    
    const voiceResult = await this.config.voiceEngine.speak({
      text: firstWords,
      voiceId: genome.voiceDNA?.voiceId,
      emotion: 'calm',
    });
    
    stageMetrics.emergence = Date.now() - stageStart;
    console.log(`[Awakening] Voice generated (${stageMetrics.emergence}ms)`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STAGE 2: Generate eye-opening animation
    // ─────────────────────────────────────────────────────────────────────
    console.log('[Awakening] Stage 2: Generating awakening animation...');
    const stage2Start = Date.now();
    
    const primaryImage = genome.visualDNA?.faceEmbedding?.sourceImageUrl 
      || genome.metadata.avatarUrl;
    
    if (!primaryImage) {
      throw new Error('No primary image available for awakening ceremony');
    }
    
    // Generate the eye-opening sequence
    const awakeningAnimation = await this.generateAwakeningSequence(
      primaryImage,
      signature,
      options.quality || 'standard'
    );
    
    stageMetrics.awakening = Date.now() - stage2Start;
    console.log(`[Awakening] Animation generated (${stageMetrics.awakening}ms)`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STAGE 3: Generate lip-synced introduction
    // ─────────────────────────────────────────────────────────────────────
    console.log('[Awakening] Stage 3: Generating lip sync...');
    const stage3Start = Date.now();
    
    const lipSyncResult = await this.config.lipSyncEngine.generateLipSync({
      sourceImageUrl: primaryImage,
      audioSource: voiceResult.audioUrl || "",
      expression: "neutral",
    });
    
    stageMetrics.introduction = Date.now() - stage3Start;
    console.log(`[Awakening] Lip sync generated (${stageMetrics.introduction}ms)`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STAGE 4: Composite final video
    // ─────────────────────────────────────────────────────────────────────
    console.log('[Awakening] Compositing final video...');
    
    const finalVideo = await this.compositeVideo({
      awakeningAnimation,
      lipSyncResult,
      voiceAudio: voiceResult.audio,
      signature,
      options,
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`[Awakening] Ceremony complete (${totalTime}ms)`);
    console.log(`${'═'.repeat(60)}\n`);
    
    return {
      videoUrl: finalVideo.videoUrl,
      thumbnailUrl: finalVideo.thumbnailUrl,
      audioUrl: voiceResult.audioUrl || '',
      firstWords,
      durationSeconds: options.duration || 6,
      metrics: {
        generationTimeMs: totalTime,
        stages: stageMetrics,
        cost: this.calculateCost(stageMetrics),
      },
    };
  }
  
  /**
   * Get visual signature for archetype
   */
  private getVisualSignature(archetype: string, overrideColor?: string): VisualSignature {
    const base = ARCHETYPE_SIGNATURES[archetype] || ARCHETYPE_SIGNATURES.default;
    
    if (overrideColor) {
      return { ...base, auraColor: overrideColor };
    }
    
    return base;
  }
  
  /**
   * Generate contextual first words
   */
  private generateFirstWords(genome: PersonaGenome): string {
    const archetype = genome.mindDNA?.identity?.archetype || 'default';
    const name = genome.metadata.name;
    
    const templates = FIRST_WORDS_TEMPLATES[archetype] || FIRST_WORDS_TEMPLATES.default;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('{name}', name);
  }
  
  /**
   * Generate the eye-opening awakening sequence
   */
  private async generateAwakeningSequence(
    sourceImageUrl: string,
    signature: VisualSignature,
    quality: 'preview' | 'standard' | 'cinematic'
  ): Promise<AnimationResult> {
    const qualitySettings = {
      preview: { fps: 15, width: 512, height: 512, steps: 15 },
      standard: { fps: 24, width: 768, height: 768, steps: 25 },
      cinematic: { fps: 30, width: 1024, height: 1024, steps: 35 },
    };
    
    const settings = qualitySettings[quality];
    
    // Generate animation with eye-opening motion
    const qualityMap = { preview: 'draft', standard: 'standard', cinematic: 'high' } as const;
    
    return await this.config.animationEngine.animate({
      sourceImageUrl: sourceImageUrl,
      motionPreset: 'cinematic_slow',
      duration: 3,
      quality: qualityMap[quality],
      outputFormat: 'mp4',
    });
  }
  
  /**
   * Composite all elements into final video
   */
  private async compositeVideo(params: {
    awakeningAnimation: AnimationResult;
    lipSyncResult: LipSyncResult;
    voiceAudio: ArrayBuffer;
    signature: VisualSignature;
    options: AwakeningOptions;
  }): Promise<{ videoUrl: string; thumbnailUrl: string }> {
    // In production, this would use FFmpeg or a video compositing service
    // to merge:
    // 1. Awakening animation (0-3s)
    // 2. Lip sync video (3-6s)  
    // 3. Voice audio (starting at 3s)
    // 4. Ambient music/effects throughout
    // 5. Particle overlay
    // 6. Color grading based on signature
    
    // For now, return the lip sync result as the main video
    // TODO: Implement proper video compositing with RunPod/FFmpeg
    
    return {
      videoUrl: params.lipSyncResult.videoUrl,
      thumbnailUrl: params.awakeningAnimation.thumbnailUrl || params.lipSyncResult.thumbnailUrl,
    };
  }
  
  /**
   * Calculate cost of ceremony generation
   */
  private calculateCost(metrics: { emergence: number; awakening: number; introduction: number }): number {
    // Rough cost estimation
    // Voice: ~$0.02
    // Animation: ~$0.15
    // Lip sync: ~$0.10
    // Compositing: ~$0.05
    return 0.32;
  }
  
  /**
   * Generate a quick preview (lower quality, faster)
   */
  async generatePreview(
    genome: PersonaGenome,
    options: Omit<AwakeningOptions, 'quality'> = {}
  ): Promise<AwakeningResult> {
    return this.generate(genome, { ...options, quality: 'preview' });
  }
  
  /**
   * Generate cinematic quality for final export
   */
  async generateCinematic(
    genome: PersonaGenome,
    options: Omit<AwakeningOptions, 'quality'> = {}
  ): Promise<AwakeningResult> {
    return this.generate(genome, { ...options, quality: 'cinematic' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an awakening ceremony engine
 */
export function createAwakeningCeremony(config: AwakeningConfig): AwakeningCeremony {
  return new AwakeningCeremony(config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

