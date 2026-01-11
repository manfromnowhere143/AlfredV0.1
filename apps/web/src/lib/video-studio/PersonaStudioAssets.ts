/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA STUDIO ASSETS - Pre-Generated Base Takes & Visual Identity
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the #1 speed + quality win: Base Takes
 *
 * Instead of generating a fresh talking video from scratch every time, you:
 * - Pre-generate 3-8 base video takes per persona
 * - Apply lip-sync ONLY to the best matching take
 *
 * Why this matters:
 * 1. Lip-sync is FASTER than full video generation
 * 2. Lip-sync preserves identity BETTER (no drift)
 * 3. You can choose the take that matches the script's emotion
 *
 * Two-Stage Creation (State-of-the-Art):
 *
 * STAGE 1 (Fast, Immediate):
 *   - Generate hero images + voice identity
 *   - Start live chat with 2D fallback
 *
 * STAGE 2 (High Quality, Async):
 *   - Build full avatar pack (base takes, expressions)
 *   - Persona "upgrades" automatically later
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaStudioPack {
  personaId: string;
  version: string;
  createdAt: Date;
  status: StudioPackStatus;

  // Visual Identity
  identity: VisualIdentity;

  // Base video takes
  baseTakes: BaseTake[];

  // Sound palette reference
  soundPaletteId: string;

  // Look preset
  lookPreset: LookPreset;

  // Caption style
  captionStyle: CaptionStylePreset;

  // Generation metadata
  generationCost: number;
  generationDurationMs: number;
}

export type StudioPackStatus =
  | "pending"       // Not started
  | "generating"    // Base takes being created
  | "ready"         // All assets ready
  | "upgrading"     // Adding more takes/quality
  | "failed";

export interface VisualIdentity {
  // Reference images
  primaryImageUrl: string;
  expressionImages: Record<string, string>;

  // Identity embedding (for consistency checking)
  identityEmbedding?: number[];

  // Style DNA
  styleDNA: {
    artStyle: string;
    colorPalette: string[];
    lightingStyle: string;
    cameraStyle: string;
  };
}

export interface BaseTake {
  id: string;
  name: string;
  description: string;

  // Video asset
  videoUrl: string;
  thumbnailUrl: string;

  // Properties
  angle: CameraAngle;
  emotion: TakeEmotion;
  intensity: number;        // 0-1
  duration: number;         // seconds
  isIdle: boolean;          // For looping idle animations

  // Quality
  resolution: { width: number; height: number };
  fps: number;

  // Generation metadata
  modelUsed: string;
  seed?: number;
  prompt?: string;
  generationCost: number;

  // Usage stats
  usageCount: number;
  lastUsedAt?: Date;
}

export type CameraAngle =
  | "front"           // Direct eye contact
  | "three_quarter"   // 3/4 view (most cinematic)
  | "profile"         // Side view
  | "dramatic_low"    // Low angle (powerful)
  | "high_angle"      // High angle (vulnerable)
  | "closeup"         // Extreme close-up
  | "medium_shot";    // Standard medium

export type TakeEmotion =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "thoughtful"
  | "confident"
  | "intense"
  | "playful"
  | "mysterious"
  | "passionate"
  | "serene";

export interface LookPreset {
  id: string;
  name: string;

  // Color grading
  colorGrade: {
    temperature: number;     // -100 to 100 (blue to orange)
    tint: number;            // -100 to 100 (green to magenta)
    contrast: number;        // 0 to 2
    saturation: number;      // 0 to 2
    blacks: number;          // 0 to 1 (lifted blacks)
    whites: number;          // 0 to 1 (crushed whites)
    highlights: number;      // -100 to 100
    shadows: number;         // -100 to 100
  };

  // Lighting
  lighting: {
    style: "natural" | "cinematic" | "dramatic" | "soft" | "hard";
    keyLightAngle: number;
    fillRatio: number;
    rimLight: boolean;
  };

  // Post-processing
  postProcess: {
    vignette: number;        // 0 to 1
    grain: number;           // 0 to 1
    blur: number;            // 0 to 10 (background blur)
    sharpness: number;       // 0 to 2
  };

  // Film look
  filmEmulation?: string;    // "kodak_portra", "fuji_velvia", etc.
}

export interface CaptionStylePreset {
  id: string;
  name: string;

  // Typography
  fontFamily: string;
  fontSize: "small" | "medium" | "large" | "xlarge";
  fontWeight: "normal" | "bold" | "black";
  letterSpacing: number;

  // Colors
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor?: string;
  shadowColor?: string;

  // Animation
  animation: CaptionAnimation;
  emphasisAnimation: CaptionAnimation;

  // Position
  position: "top" | "center" | "bottom";
  alignment: "left" | "center" | "right";
  margin: number;

  // Timing
  wordsPerGroup: number;
  fadeIn: number;
  fadeOut: number;
}

export type CaptionAnimation =
  | "none"
  | "pop"             // Scale bounce
  | "fade"            // Opacity
  | "slide_up"
  | "slide_down"
  | "typewriter"      // Character by character
  | "bounce"
  | "shake"
  | "glow"
  | "wave";           // Wave across words

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET LOOK PRESETS (Per Archetype)
// ═══════════════════════════════════════════════════════════════════════════════

export const ARCHETYPE_LOOK_PRESETS: Record<string, LookPreset> = {
  sage: {
    id: "sage_look",
    name: "Ancient Wisdom",
    colorGrade: {
      temperature: -10,    // Slightly cool
      tint: 5,
      contrast: 1.1,
      saturation: 0.85,    // Desaturated
      blacks: 0.1,         // Lifted blacks
      whites: 0.95,
      highlights: -20,
      shadows: 15,
    },
    lighting: {
      style: "soft",
      keyLightAngle: 45,
      fillRatio: 0.8,
      rimLight: false,
    },
    postProcess: {
      vignette: 0.3,
      grain: 0.15,
      blur: 2,
      sharpness: 1.0,
    },
    filmEmulation: "kodak_portra_400",
  },

  hero: {
    id: "hero_look",
    name: "Epic Triumph",
    colorGrade: {
      temperature: 20,     // Warm
      tint: -5,
      contrast: 1.3,       // High contrast
      saturation: 1.1,
      blacks: 0.05,
      whites: 1.0,
      highlights: 10,
      shadows: -20,
    },
    lighting: {
      style: "cinematic",
      keyLightAngle: 30,
      fillRatio: 0.4,      // More dramatic
      rimLight: true,
    },
    postProcess: {
      vignette: 0.4,
      grain: 0.1,
      blur: 3,
      sharpness: 1.2,
    },
    filmEmulation: "kodak_vision3_500t",
  },

  creator: {
    id: "creator_look",
    name: "Innovation Spark",
    colorGrade: {
      temperature: 0,
      tint: 10,            // Slight magenta
      contrast: 1.15,
      saturation: 1.2,     // Vibrant
      blacks: 0.08,
      whites: 0.98,
      highlights: 5,
      shadows: 5,
    },
    lighting: {
      style: "natural",
      keyLightAngle: 60,
      fillRatio: 0.7,
      rimLight: true,
    },
    postProcess: {
      vignette: 0.2,
      grain: 0.05,
      blur: 2,
      sharpness: 1.3,
    },
  },

  ruler: {
    id: "ruler_look",
    name: "Royal Authority",
    colorGrade: {
      temperature: 5,
      tint: -10,           // Slight green (regal)
      contrast: 1.25,
      saturation: 0.95,
      blacks: 0.02,        // Deep blacks
      whites: 0.92,
      highlights: -10,
      shadows: -30,        // Deep shadows
    },
    lighting: {
      style: "dramatic",
      keyLightAngle: 20,
      fillRatio: 0.3,      // Very dramatic
      rimLight: true,
    },
    postProcess: {
      vignette: 0.5,
      grain: 0.08,
      blur: 4,
      sharpness: 1.1,
    },
    filmEmulation: "kodak_5219",
  },

  magician: {
    id: "magician_look",
    name: "Mystical Wonder",
    colorGrade: {
      temperature: -20,    // Cool, ethereal
      tint: 20,            // Magenta
      contrast: 1.2,
      saturation: 1.3,     // Hyper-saturated
      blacks: 0.15,        // Lifted
      whites: 0.9,
      highlights: 20,
      shadows: 25,
    },
    lighting: {
      style: "cinematic",
      keyLightAngle: 0,    // Front light (mysterious)
      fillRatio: 0.5,
      rimLight: true,
    },
    postProcess: {
      vignette: 0.6,
      grain: 0.2,
      blur: 5,
      sharpness: 0.9,
    },
    filmEmulation: "fuji_provia_400x",
  },
};

// Default look preset
export const DEFAULT_LOOK_PRESET: LookPreset = {
  id: "default",
  name: "Clean Modern",
  colorGrade: {
    temperature: 0,
    tint: 0,
    contrast: 1.1,
    saturation: 1.0,
    blacks: 0.05,
    whites: 0.95,
    highlights: 0,
    shadows: 0,
  },
  lighting: {
    style: "natural",
    keyLightAngle: 45,
    fillRatio: 0.6,
    rimLight: false,
  },
  postProcess: {
    vignette: 0.2,
    grain: 0.05,
    blur: 2,
    sharpness: 1.0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTION STYLE PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const CAPTION_PRESETS: Record<string, CaptionStylePreset> = {
  tiktok_bold: {
    id: "tiktok_bold",
    name: "TikTok Bold",
    fontFamily: "Montserrat",
    fontSize: "xlarge",
    fontWeight: "black",
    letterSpacing: -1,
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 4,
    shadowColor: "rgba(0,0,0,0.5)",
    animation: "pop",
    emphasisAnimation: "shake",
    position: "center",
    alignment: "center",
    margin: 20,
    wordsPerGroup: 3,
    fadeIn: 0,
    fadeOut: 0,
  },

  minimal_elegant: {
    id: "minimal_elegant",
    name: "Minimal Elegant",
    fontFamily: "Inter",
    fontSize: "medium",
    fontWeight: "normal",
    letterSpacing: 2,
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 1,
    animation: "fade",
    emphasisAnimation: "glow",
    position: "bottom",
    alignment: "center",
    margin: 40,
    wordsPerGroup: 5,
    fadeIn: 0.2,
    fadeOut: 0.2,
  },

  typewriter: {
    id: "typewriter",
    name: "Typewriter",
    fontFamily: "Courier New",
    fontSize: "large",
    fontWeight: "normal",
    letterSpacing: 0,
    textColor: "#00FF00",
    strokeColor: "#000000",
    strokeWidth: 2,
    backgroundColor: "rgba(0,0,0,0.7)",
    animation: "typewriter",
    emphasisAnimation: "none",
    position: "bottom",
    alignment: "left",
    margin: 30,
    wordsPerGroup: 8,
    fadeIn: 0,
    fadeOut: 0.1,
  },

  karaoke: {
    id: "karaoke",
    name: "Karaoke Highlight",
    fontFamily: "Poppins",
    fontSize: "large",
    fontWeight: "bold",
    letterSpacing: 1,
    textColor: "#FFFF00",
    strokeColor: "#000000",
    strokeWidth: 3,
    animation: "wave",
    emphasisAnimation: "glow",
    position: "bottom",
    alignment: "center",
    margin: 50,
    wordsPerGroup: 4,
    fadeIn: 0.1,
    fadeOut: 0.1,
  },

  cinematic: {
    id: "cinematic",
    name: "Cinematic Subtitle",
    fontFamily: "Open Sans",
    fontSize: "medium",
    fontWeight: "normal",
    letterSpacing: 1,
    textColor: "#FFFFFF",
    strokeColor: "transparent",
    strokeWidth: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    animation: "fade",
    emphasisAnimation: "none",
    position: "bottom",
    alignment: "center",
    margin: 60,
    wordsPerGroup: 6,
    fadeIn: 0.3,
    fadeOut: 0.3,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BASE TAKE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class BaseTakeSelector {
  /**
   * Select the best base take for a given script and emotion
   */
  selectBestTake(
    takes: BaseTake[],
    targetEmotion: TakeEmotion,
    targetIntensity: number,
    preferredAngle?: CameraAngle
  ): BaseTake | null {
    if (takes.length === 0) return null;

    // Score each take
    const scoredTakes = takes.map((take) => ({
      take,
      score: this.scoreTake(take, targetEmotion, targetIntensity, preferredAngle),
    }));

    // Sort by score descending
    scoredTakes.sort((a, b) => b.score - a.score);

    return scoredTakes[0].take;
  }

  /**
   * Score a take based on how well it matches the target
   */
  private scoreTake(
    take: BaseTake,
    targetEmotion: TakeEmotion,
    targetIntensity: number,
    preferredAngle?: CameraAngle
  ): number {
    let score = 0;

    // Emotion match (40% weight)
    if (take.emotion === targetEmotion) {
      score += 40;
    } else if (this.areEmotionsSimilar(take.emotion, targetEmotion)) {
      score += 25;
    }

    // Intensity match (30% weight)
    const intensityDiff = Math.abs(take.intensity - targetIntensity);
    score += 30 * (1 - intensityDiff);

    // Angle preference (20% weight)
    if (preferredAngle && take.angle === preferredAngle) {
      score += 20;
    } else if (!preferredAngle && take.angle === "three_quarter") {
      // Default preference for 3/4 angle (most cinematic)
      score += 15;
    }

    // Recency bonus (10% weight) - prefer recently used takes
    if (take.usageCount > 0) {
      score += Math.min(10, take.usageCount);
    }

    return score;
  }

  /**
   * Check if two emotions are in the same family
   */
  private areEmotionsSimilar(a: TakeEmotion, b: TakeEmotion): boolean {
    const emotionFamilies: Record<string, TakeEmotion[]> = {
      positive: ["happy", "playful", "confident"],
      negative: ["sad", "angry"],
      intense: ["intense", "passionate", "angry", "surprised"],
      calm: ["neutral", "serene", "thoughtful", "mysterious"],
    };

    for (const family of Object.values(emotionFamilies)) {
      if (family.includes(a) && family.includes(b)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get recommended takes to generate for a persona
   */
  getRecommendedTakesForPersona(archetype: string): Array<{
    emotion: TakeEmotion;
    angle: CameraAngle;
    intensity: number;
    priority: number;
  }> {
    // Core takes everyone should have
    const coreTakes = [
      { emotion: "neutral" as TakeEmotion, angle: "front" as CameraAngle, intensity: 0.5, priority: 1 },
      { emotion: "neutral" as TakeEmotion, angle: "three_quarter" as CameraAngle, intensity: 0.5, priority: 1 },
      { emotion: "happy" as TakeEmotion, angle: "three_quarter" as CameraAngle, intensity: 0.7, priority: 2 },
    ];

    // Archetype-specific takes
    const archetypeTakes: Record<string, Array<{ emotion: TakeEmotion; angle: CameraAngle; intensity: number; priority: number }>> = {
      hero: [
        { emotion: "confident", angle: "dramatic_low", intensity: 0.8, priority: 2 },
        { emotion: "intense", angle: "closeup", intensity: 0.9, priority: 3 },
      ],
      sage: [
        { emotion: "thoughtful", angle: "three_quarter", intensity: 0.6, priority: 2 },
        { emotion: "serene", angle: "front", intensity: 0.4, priority: 3 },
      ],
      ruler: [
        { emotion: "confident", angle: "dramatic_low", intensity: 0.9, priority: 2 },
        { emotion: "intense", angle: "front", intensity: 0.8, priority: 3 },
      ],
      jester: [
        { emotion: "playful", angle: "three_quarter", intensity: 0.8, priority: 2 },
        { emotion: "surprised", angle: "front", intensity: 0.7, priority: 3 },
      ],
      magician: [
        { emotion: "mysterious", angle: "three_quarter", intensity: 0.7, priority: 2 },
        { emotion: "intense", angle: "closeup", intensity: 0.9, priority: 3 },
      ],
    };

    const specificTakes = archetypeTakes[archetype.toLowerCase()] || [];

    return [...coreTakes, ...specificTakes].sort((a, b) => a.priority - b.priority);
  }
}

// Export singleton
export const baseTakeSelector = new BaseTakeSelector();

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO PACK GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class StudioPackGenerator {
  private selector = new BaseTakeSelector();

  /**
   * Generate the recommended base takes for a persona
   * This is called after persona creation (async, background)
   */
  async generateStudioPack(
    personaId: string,
    archetype: string,
    primaryImageUrl: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PersonaStudioPack> {
    const startTime = Date.now();
    const recommendedTakes = this.selector.getRecommendedTakesForPersona(archetype);

    onProgress?.(0, "Starting studio pack generation...");

    // Get look preset
    const lookPreset = ARCHETYPE_LOOK_PRESETS[archetype.toLowerCase()] || DEFAULT_LOOK_PRESET;

    // Get caption style (default TikTok bold)
    const captionStyle = CAPTION_PRESETS.tiktok_bold;

    // Initialize pack
    const pack: PersonaStudioPack = {
      personaId,
      version: "1.0",
      createdAt: new Date(),
      status: "generating",
      identity: {
        primaryImageUrl,
        expressionImages: {},
        styleDNA: {
          artStyle: archetype,
          colorPalette: [],
          lightingStyle: lookPreset.lighting.style,
          cameraStyle: "cinematic",
        },
      },
      baseTakes: [],
      soundPaletteId: archetype.toLowerCase(),
      lookPreset,
      captionStyle,
      generationCost: 0,
      generationDurationMs: 0,
    };

    // In production, this would:
    // 1. Generate each base take using video generation model
    // 2. Store in cloud storage
    // 3. Update pack with URLs

    // For now, create placeholder takes
    for (let i = 0; i < recommendedTakes.length; i++) {
      const spec = recommendedTakes[i];
      const progress = ((i + 1) / recommendedTakes.length) * 100;
      onProgress?.(progress, `Generating ${spec.emotion} take (${spec.angle})...`);

      // Placeholder take
      const take: BaseTake = {
        id: `${personaId}_take_${i}`,
        name: `${spec.emotion}_${spec.angle}`,
        description: `${spec.emotion} expression at ${spec.angle} angle`,
        videoUrl: primaryImageUrl, // Placeholder - would be video URL
        thumbnailUrl: primaryImageUrl,
        angle: spec.angle,
        emotion: spec.emotion,
        intensity: spec.intensity,
        duration: 5, // 5 second takes
        isIdle: spec.emotion === "neutral",
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        modelUsed: "latentsync",
        generationCost: 0.10,
        usageCount: 0,
      };

      pack.baseTakes.push(take);
      pack.generationCost += take.generationCost;
    }

    pack.status = "ready";
    pack.generationDurationMs = Date.now() - startTime;

    onProgress?.(100, "Studio pack ready!");

    return pack;
  }
}

// Export singleton
export const studioPackGenerator = new StudioPackGenerator();
