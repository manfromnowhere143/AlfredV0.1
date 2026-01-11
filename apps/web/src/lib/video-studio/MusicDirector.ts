/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MUSIC DIRECTOR - AI-Driven Procedural Film Scoring
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is NOT "add background music."
 * This is **procedural film scoring** — the same thing Hans Zimmer teams do.
 *
 * Key insight: You don't generate "a song."
 * You generate **a score tied to a timeline**.
 *
 * The Architecture:
 *
 * 1. MUSIC DIRECTOR LAYER (LLM)
 *    - Analyzes script + persona
 *    - Outputs score blueprint: emotion curve, instrumentation, hit points
 *
 * 2. SOUND PALETTE (Persona-specific)
 *    - Each persona has: scale, tempo, signature instruments
 *    - So even same script sounds different per persona
 *
 * 3. LAYERED SCORING
 *    - Layer 1: Ambience (wide, reverb)
 *    - Layer 2: Rhythm bed (sidechained under voice)
 *    - Layer 3: Texture pads (drones, swells)
 *    - Layer 4: Impact hits (full volume, short)
 *
 * 4. TIMELINE SYNC
 *    - Everything locks to voice timestamps
 *    - Crescendos before key words
 *    - Drops after climax
 *    - Ducking during speech
 *
 * This is how Disney, Pixar & Hans Zimmer actually work.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WordTiming } from "./DirectorTypes";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaSoundPalette {
  id: string;
  name: string;
  description: string;

  // Musical identity
  scale: MusicScale;
  keySignature: string;
  tempo: { min: number; max: number; default: number };

  // Instrumentation
  signatureInstruments: string[];
  percussionStyle: PercussionStyle;
  bassStyle: BassStyle;
  padStyle: PadStyle;

  // Mood mapping
  defaultMood: MusicMood;
  emotionToMood: Record<string, MusicMood>;

  // Audio assets
  loops: Record<string, string[]>;
  oneShots: Record<string, string[]>;
  ambiences: string[];
}

export type MusicScale =
  | "major"           // Happy, triumphant
  | "minor"           // Sad, mysterious
  | "dorian"          // Cool, jazzy
  | "phrygian"        // Dark, exotic
  | "lydian"          // Ethereal, dreamy
  | "mixolydian"      // Heroic, folk
  | "aeolian"         // Natural minor
  | "pentatonic"      // Eastern, meditative
  | "chromatic";      // Tense, dissonant

export type PercussionStyle =
  | "epic_taiko"      // War drums, massive
  | "orchestral"      // Timpani, snares
  | "electronic"      // 808s, synth drums
  | "acoustic"        // Kit drums, brushes
  | "tribal"          // Hand drums, shakers
  | "minimal"         // Subtle, sparse
  | "none";           // No percussion

export type BassStyle =
  | "orchestral"      // Double bass, cello
  | "synth_sub"       // Deep sub bass
  | "electric"        // Bass guitar
  | "upright"         // Jazz upright
  | "none";

export type PadStyle =
  | "strings"         // Orchestral strings
  | "synth_warm"      // Warm analog pads
  | "synth_dark"      // Dark, evolving
  | "choir"           // Vocal pads
  | "ambient"         // Texture, noise
  | "none";

export type MusicMood =
  | "epic"
  | "dramatic"
  | "inspirational"
  | "mysterious"
  | "dark"
  | "happy"
  | "sad"
  | "tense"
  | "peaceful"
  | "energetic"
  | "ethereal"
  | "romantic"
  | "playful"
  | "aggressive"
  | "contemplative";

export interface ScoreBlueprint {
  // Metadata
  personaId: string;
  paletteName: string;

  // Musical settings
  scale: MusicScale;
  keySignature: string;
  tempo: number;

  // Emotion timeline
  emotionCurve: EmotionKeyframe[];

  // Instrumentation for this score
  activeInstruments: string[];
  percussionEnabled: boolean;

  // Hit points (synced to word timings)
  hitPoints: HitPoint[];

  // Crescendo/drop points
  dynamicEvents: DynamicEvent[];

  // Layer assignments
  layers: ScoreLayer[];
}

export interface EmotionKeyframe {
  time: number;
  mood: MusicMood;
  intensity: number; // 0-1
}

export interface HitPoint {
  time: number;
  type: HitType;
  intensity: number;
  triggerWord?: string;
  instrument?: string;
}

export type HitType =
  | "impact"          // Big drum hit
  | "accent"          // Musical accent
  | "stinger"         // Short dramatic phrase
  | "swell"           // Rising to peak
  | "drop"            // Sudden silence or bass drop
  | "transition"      // Whoosh/riser
  | "sparkle";        // High-end shimmer

export interface DynamicEvent {
  type: "crescendo" | "diminuendo" | "drop" | "swell";
  startTime: number;
  endTime: number;
  fromIntensity: number;
  toIntensity: number;
}

export interface ScoreLayer {
  id: string;
  type: "ambience" | "rhythm" | "bass" | "pad" | "melody" | "hit";
  url: string;
  startTime: number;
  endTime?: number;
  volume: number;
  loop: boolean;
  ducking: {
    enabled: boolean;
    amount: number;      // dB reduction during speech
    attackMs: number;
    releaseMs: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA SOUND PALETTES - Character Audio Identity
// ═══════════════════════════════════════════════════════════════════════════════

export const PERSONA_SOUND_PALETTES: Record<string, PersonaSoundPalette> = {
  sage: {
    id: "sage",
    name: "Ancient Wisdom",
    description: "Meditative, eastern-influenced, contemplative",
    scale: "pentatonic",
    keySignature: "D minor",
    tempo: { min: 60, max: 80, default: 70 },
    signatureInstruments: ["koto", "shakuhachi", "tibetan_bowls", "soft_strings"],
    percussionStyle: "minimal",
    bassStyle: "none",
    padStyle: "ambient",
    defaultMood: "contemplative",
    emotionToMood: {
      neutral: "contemplative",
      thoughtful: "contemplative",
      intense: "mysterious",
      happy: "peaceful",
      sad: "contemplative",
    },
    loops: {
      contemplative: ["/audio/music/sage/contemplative-loop.mp3"],
      peaceful: ["/audio/music/sage/peaceful-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/sage/bowl-strike.mp3"],
      accent: ["/audio/sfx/sage/koto-pluck.mp3"],
    },
    ambiences: ["/audio/ambience/sage/temple-bells.mp3"],
  },

  hero: {
    id: "hero",
    name: "Epic Triumph",
    description: "Orchestral, powerful, inspiring",
    scale: "mixolydian",
    keySignature: "C major",
    tempo: { min: 80, max: 140, default: 110 },
    signatureInstruments: ["brass_fanfare", "epic_strings", "war_drums", "male_choir"],
    percussionStyle: "epic_taiko",
    bassStyle: "orchestral",
    padStyle: "strings",
    defaultMood: "epic",
    emotionToMood: {
      neutral: "inspirational",
      confident: "epic",
      intense: "dramatic",
      happy: "inspirational",
      sad: "dramatic",
    },
    loops: {
      epic: ["/audio/music/hero/epic-strings-loop.mp3"],
      inspirational: ["/audio/music/hero/triumphant-loop.mp3"],
      dramatic: ["/audio/music/hero/tension-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/hero/taiko-hit.mp3", "/audio/sfx/hero/brass-stab.mp3"],
      swell: ["/audio/sfx/hero/choir-swell.mp3"],
    },
    ambiences: ["/audio/ambience/hero/battlefield.mp3"],
  },

  creator: {
    id: "creator",
    name: "Innovation Spark",
    description: "Electronic, futuristic, creative energy",
    scale: "lydian",
    keySignature: "F major",
    tempo: { min: 100, max: 130, default: 115 },
    signatureInstruments: ["synth_leads", "arpeggios", "glitch_percussion", "electric_piano"],
    percussionStyle: "electronic",
    bassStyle: "synth_sub",
    padStyle: "synth_warm",
    defaultMood: "energetic",
    emotionToMood: {
      neutral: "energetic",
      excited: "energetic",
      thoughtful: "contemplative",
      happy: "playful",
      intense: "aggressive",
    },
    loops: {
      energetic: ["/audio/music/creator/synth-pulse-loop.mp3"],
      playful: ["/audio/music/creator/glitch-hop-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/creator/synth-stab.mp3"],
      sparkle: ["/audio/sfx/creator/digital-sparkle.mp3"],
    },
    ambiences: ["/audio/ambience/creator/studio-hum.mp3"],
  },

  caregiver: {
    id: "caregiver",
    name: "Warm Embrace",
    description: "Soft, nurturing, acoustic warmth",
    scale: "major",
    keySignature: "G major",
    tempo: { min: 60, max: 90, default: 75 },
    signatureInstruments: ["acoustic_guitar", "soft_piano", "strings_pizzicato", "gentle_harp"],
    percussionStyle: "minimal",
    bassStyle: "upright",
    padStyle: "strings",
    defaultMood: "peaceful",
    emotionToMood: {
      neutral: "peaceful",
      warm: "peaceful",
      happy: "happy",
      sad: "contemplative",
      intense: "inspirational",
    },
    loops: {
      peaceful: ["/audio/music/caregiver/lullaby-loop.mp3"],
      happy: ["/audio/music/caregiver/gentle-joy-loop.mp3"],
    },
    oneShots: {
      accent: ["/audio/sfx/caregiver/harp-gliss.mp3"],
      sparkle: ["/audio/sfx/caregiver/chime.mp3"],
    },
    ambiences: ["/audio/ambience/caregiver/hearth-fire.mp3"],
  },

  ruler: {
    id: "ruler",
    name: "Royal Authority",
    description: "Regal, commanding, orchestral grandeur",
    scale: "minor",
    keySignature: "D minor",
    tempo: { min: 70, max: 100, default: 85 },
    signatureInstruments: ["brass_ensemble", "timpani", "grand_piano", "cello_section"],
    percussionStyle: "orchestral",
    bassStyle: "orchestral",
    padStyle: "choir",
    defaultMood: "dramatic",
    emotionToMood: {
      neutral: "dramatic",
      commanding: "dramatic",
      intense: "aggressive",
      thoughtful: "mysterious",
      happy: "inspirational",
    },
    loops: {
      dramatic: ["/audio/music/ruler/throne-room-loop.mp3"],
      mysterious: ["/audio/music/ruler/intrigue-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/ruler/timpani-roll.mp3"],
      stinger: ["/audio/sfx/ruler/fanfare-stinger.mp3"],
    },
    ambiences: ["/audio/ambience/ruler/castle-echo.mp3"],
  },

  jester: {
    id: "jester",
    name: "Playful Chaos",
    description: "Quirky, comedic, unpredictable",
    scale: "dorian",
    keySignature: "D dorian",
    tempo: { min: 120, max: 160, default: 140 },
    signatureInstruments: ["pizzicato_strings", "xylophone", "clarinet", "tuba"],
    percussionStyle: "acoustic",
    bassStyle: "upright",
    padStyle: "none",
    defaultMood: "playful",
    emotionToMood: {
      neutral: "playful",
      happy: "playful",
      excited: "energetic",
      thoughtful: "mysterious",
      sad: "contemplative",
    },
    loops: {
      playful: ["/audio/music/jester/circus-loop.mp3"],
      energetic: ["/audio/music/jester/chase-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/jester/honk.mp3"],
      sparkle: ["/audio/sfx/jester/slide-whistle.mp3"],
      accent: ["/audio/sfx/jester/cymbal-crash.mp3"],
    },
    ambiences: ["/audio/ambience/jester/carnival.mp3"],
  },

  rebel: {
    id: "rebel",
    name: "Dark Defiance",
    description: "Heavy, aggressive, industrial",
    scale: "phrygian",
    keySignature: "E phrygian",
    tempo: { min: 100, max: 150, default: 125 },
    signatureInstruments: ["distorted_guitar", "synth_bass", "industrial_drums", "dark_synth"],
    percussionStyle: "electronic",
    bassStyle: "synth_sub",
    padStyle: "synth_dark",
    defaultMood: "aggressive",
    emotionToMood: {
      neutral: "tense",
      intense: "aggressive",
      confident: "aggressive",
      thoughtful: "dark",
      happy: "energetic",
    },
    loops: {
      aggressive: ["/audio/music/rebel/industrial-loop.mp3"],
      tense: ["/audio/music/rebel/tension-loop.mp3"],
      dark: ["/audio/music/rebel/dark-ambient-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/rebel/distortion-hit.mp3"],
      drop: ["/audio/sfx/rebel/bass-drop.mp3"],
    },
    ambiences: ["/audio/ambience/rebel/city-rain.mp3"],
  },

  lover: {
    id: "lover",
    name: "Romantic Passion",
    description: "Sensual, emotional, sweeping",
    scale: "minor",
    keySignature: "A minor",
    tempo: { min: 60, max: 90, default: 72 },
    signatureInstruments: ["solo_violin", "romantic_piano", "cellos", "soft_harp"],
    percussionStyle: "none",
    bassStyle: "orchestral",
    padStyle: "strings",
    defaultMood: "romantic",
    emotionToMood: {
      neutral: "romantic",
      passionate: "romantic",
      happy: "peaceful",
      sad: "sad",
      intense: "dramatic",
    },
    loops: {
      romantic: ["/audio/music/lover/romance-loop.mp3"],
      sad: ["/audio/music/lover/heartbreak-loop.mp3"],
    },
    oneShots: {
      swell: ["/audio/sfx/lover/string-swell.mp3"],
      sparkle: ["/audio/sfx/lover/harp-flourish.mp3"],
    },
    ambiences: ["/audio/ambience/lover/candlelit-room.mp3"],
  },

  explorer: {
    id: "explorer",
    name: "Grand Adventure",
    description: "Sweeping, adventurous, world-music influenced",
    scale: "mixolydian",
    keySignature: "G mixolydian",
    tempo: { min: 90, max: 130, default: 110 },
    signatureInstruments: ["french_horn", "adventure_strings", "ethnic_percussion", "pan_flute"],
    percussionStyle: "tribal",
    bassStyle: "orchestral",
    padStyle: "strings",
    defaultMood: "inspirational",
    emotionToMood: {
      neutral: "inspirational",
      curious: "mysterious",
      excited: "energetic",
      thoughtful: "contemplative",
      happy: "playful",
    },
    loops: {
      inspirational: ["/audio/music/explorer/adventure-loop.mp3"],
      mysterious: ["/audio/music/explorer/discovery-loop.mp3"],
    },
    oneShots: {
      impact: ["/audio/sfx/explorer/drum-fill.mp3"],
      transition: ["/audio/sfx/explorer/whoosh-reveal.mp3"],
    },
    ambiences: ["/audio/ambience/explorer/jungle-birds.mp3"],
  },

  magician: {
    id: "magician",
    name: "Mystical Wonder",
    description: "Ethereal, mysterious, otherworldly",
    scale: "chromatic",
    keySignature: "B diminished",
    tempo: { min: 70, max: 100, default: 85 },
    signatureInstruments: ["theremin", "glass_harmonica", "reverse_effects", "ethereal_choir"],
    percussionStyle: "minimal",
    bassStyle: "none",
    padStyle: "ambient",
    defaultMood: "ethereal",
    emotionToMood: {
      neutral: "ethereal",
      mysterious: "mysterious",
      intense: "dark",
      happy: "playful",
      thoughtful: "contemplative",
    },
    loops: {
      ethereal: ["/audio/music/magician/mystical-loop.mp3"],
      mysterious: ["/audio/music/magician/spell-loop.mp3"],
    },
    oneShots: {
      sparkle: ["/audio/sfx/magician/magic-chime.mp3"],
      impact: ["/audio/sfx/magician/arcane-boom.mp3"],
      transition: ["/audio/sfx/magician/portal-whoosh.mp3"],
    },
    ambiences: ["/audio/ambience/magician/crystalline-cave.mp3"],
  },
};

// Default palette for unknown archetypes
export const DEFAULT_SOUND_PALETTE = PERSONA_SOUND_PALETTES.sage;

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC DIRECTOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class MusicDirector {
  /**
   * Get sound palette for a persona archetype
   */
  getPalette(archetype: string): PersonaSoundPalette {
    return PERSONA_SOUND_PALETTES[archetype.toLowerCase()] || DEFAULT_SOUND_PALETTE;
  }

  /**
   * Generate a score blueprint from script and word timings
   * This is the "AI Director" that creates the score plan
   */
  generateScoreBlueprint(
    personaId: string,
    archetype: string,
    wordTimings: WordTiming[],
    emotionKeyframes: Array<{ time: number; emotion: string; intensity: number }>,
    emphasisWords: string[] = []
  ): ScoreBlueprint {
    const palette = this.getPalette(archetype);
    const duration = wordTimings.length > 0 ? wordTimings[wordTimings.length - 1].end : 0;

    // Convert emotion keyframes to mood keyframes
    const emotionCurve: EmotionKeyframe[] = emotionKeyframes.map((kf) => ({
      time: kf.time,
      mood: palette.emotionToMood[kf.emotion] || palette.defaultMood,
      intensity: kf.intensity,
    }));

    // Generate hit points for emphasis words
    const hitPoints = this.generateHitPoints(wordTimings, emphasisWords, emotionCurve);

    // Generate dynamic events (crescendos, drops)
    const dynamicEvents = this.generateDynamicEvents(emotionCurve, duration);

    // Build layer assignments
    const layers = this.buildLayers(palette, duration, emotionCurve);

    return {
      personaId,
      paletteName: palette.name,
      scale: palette.scale,
      keySignature: palette.keySignature,
      tempo: palette.tempo.default,
      emotionCurve,
      activeInstruments: palette.signatureInstruments,
      percussionEnabled: palette.percussionStyle !== "none",
      hitPoints,
      dynamicEvents,
      layers,
    };
  }

  /**
   * Generate hit points at emphasis words
   */
  private generateHitPoints(
    wordTimings: WordTiming[],
    emphasisWords: string[],
    emotionCurve: EmotionKeyframe[]
  ): HitPoint[] {
    const hits: HitPoint[] = [];

    // Find emphasis words in timings
    for (const emphasisWord of emphasisWords) {
      const timing = wordTimings.find(
        (w) => w.word.toLowerCase().replace(/[.,!?]/g, "") === emphasisWord.toLowerCase()
      );

      if (timing) {
        // Get intensity at this time
        const intensity = this.getIntensityAtTime(emotionCurve, timing.start);

        hits.push({
          time: timing.start - 0.05, // Slightly before the word
          type: intensity > 0.7 ? "impact" : "accent",
          intensity: Math.min(intensity + 0.2, 1),
          triggerWord: emphasisWord,
        });
      }
    }

    // Add natural hit points at high-intensity moments
    for (const kf of emotionCurve) {
      if (kf.intensity > 0.8) {
        // Check if there's already a hit nearby
        const hasNearbyHit = hits.some((h) => Math.abs(h.time - kf.time) < 0.5);
        if (!hasNearbyHit) {
          hits.push({
            time: kf.time,
            type: "swell",
            intensity: kf.intensity,
          });
        }
      }
    }

    return hits.sort((a, b) => a.time - b.time);
  }

  /**
   * Generate crescendos and drops based on emotion curve
   */
  private generateDynamicEvents(
    emotionCurve: EmotionKeyframe[],
    duration: number
  ): DynamicEvent[] {
    const events: DynamicEvent[] = [];

    for (let i = 0; i < emotionCurve.length - 1; i++) {
      const current = emotionCurve[i];
      const next = emotionCurve[i + 1];
      const intensityDelta = next.intensity - current.intensity;

      // Crescendo: intensity rising significantly
      if (intensityDelta > 0.3) {
        events.push({
          type: "crescendo",
          startTime: current.time,
          endTime: next.time,
          fromIntensity: current.intensity,
          toIntensity: next.intensity,
        });
      }

      // Drop: intensity falling significantly
      if (intensityDelta < -0.3) {
        events.push({
          type: "drop",
          startTime: current.time,
          endTime: next.time,
          fromIntensity: current.intensity,
          toIntensity: next.intensity,
        });
      }
    }

    // Add final diminuendo if not ending on a drop
    const lastKf = emotionCurve[emotionCurve.length - 1];
    if (lastKf && lastKf.intensity > 0.3 && duration > lastKf.time) {
      events.push({
        type: "diminuendo",
        startTime: lastKf.time,
        endTime: duration,
        fromIntensity: lastKf.intensity,
        toIntensity: 0.2,
      });
    }

    return events;
  }

  /**
   * Build audio layers for the score
   */
  private buildLayers(
    palette: PersonaSoundPalette,
    duration: number,
    emotionCurve: EmotionKeyframe[]
  ): ScoreLayer[] {
    const layers: ScoreLayer[] = [];
    const dominantMood = this.getDominantMood(emotionCurve) || palette.defaultMood;

    // Layer 1: Ambience (always on, very subtle)
    if (palette.ambiences.length > 0) {
      layers.push({
        id: "ambience",
        type: "ambience",
        url: palette.ambiences[0],
        startTime: 0,
        volume: 0.08,
        loop: true,
        ducking: { enabled: false, amount: 0, attackMs: 0, releaseMs: 0 },
      });
    }

    // Layer 2: Main music bed (ducked under voice)
    const moodLoops = palette.loops[dominantMood] || palette.loops[palette.defaultMood];
    if (moodLoops && moodLoops.length > 0) {
      layers.push({
        id: "music_bed",
        type: "rhythm",
        url: moodLoops[0],
        startTime: 0,
        volume: 0.15,
        loop: true,
        ducking: {
          enabled: true,
          amount: -8, // -8dB during speech
          attackMs: 50,
          releaseMs: 300,
        },
      });
    }

    // Layer 3: Pad/texture (subtle, always ducked)
    // This would be generated dynamically in production

    return layers;
  }

  /**
   * Get intensity at a specific time (interpolated)
   */
  private getIntensityAtTime(curve: EmotionKeyframe[], time: number): number {
    if (curve.length === 0) return 0.5;
    if (time <= curve[0].time) return curve[0].intensity;
    if (time >= curve[curve.length - 1].time) return curve[curve.length - 1].intensity;

    for (let i = 0; i < curve.length - 1; i++) {
      const curr = curve[i];
      const next = curve[i + 1];
      if (time >= curr.time && time < next.time) {
        const t = (time - curr.time) / (next.time - curr.time);
        return curr.intensity + (next.intensity - curr.intensity) * t;
      }
    }

    return 0.5;
  }

  /**
   * Get the dominant mood from emotion curve
   */
  private getDominantMood(curve: EmotionKeyframe[]): MusicMood | null {
    if (curve.length === 0) return null;

    const moodCounts = new Map<MusicMood, number>();
    for (const kf of curve) {
      const count = moodCounts.get(kf.mood) || 0;
      moodCounts.set(kf.mood, count + kf.intensity);
    }

    let maxMood: MusicMood | null = null;
    let maxCount = 0;
    for (const [mood, count] of moodCounts) {
      if (count > maxCount) {
        maxCount = count;
        maxMood = mood;
      }
    }

    return maxMood;
  }

  /**
   * Generate ffmpeg filter for layered audio mixing with ducking
   */
  generateMixFilter(
    layers: ScoreLayer[],
    wordTimings: WordTiming[],
    totalDuration: number
  ): string {
    // This generates the ffmpeg filter_complex for professional audio mixing
    // In production, this would create sidechain compression and volume automation

    const filters: string[] = [];
    let inputIndex = 0;

    // Voice is always input 0
    filters.push(`[0:a]volume=1.0[voice]`);
    inputIndex++;

    const mixInputs = ["[voice]"];

    for (const layer of layers) {
      const label = `layer_${layer.id}`;

      if (layer.loop) {
        // Loop the audio to cover full duration
        filters.push(
          `[${inputIndex}:a]aloop=loop=-1:size=2e+09,` +
            `atrim=0:${totalDuration},` +
            `volume=${layer.volume}[${label}_raw]`
        );
      } else {
        filters.push(
          `[${inputIndex}:a]adelay=${layer.startTime * 1000}|${layer.startTime * 1000},` +
            `volume=${layer.volume}[${label}_raw]`
        );
      }

      if (layer.ducking.enabled) {
        // Apply sidechain compression for ducking
        filters.push(
          `[${label}_raw][voice]sidechaincompress=` +
            `threshold=0.02:ratio=10:` +
            `attack=${layer.ducking.attackMs}:` +
            `release=${layer.ducking.releaseMs}[${label}]`
        );
      } else {
        filters.push(`[${label}_raw]acopy[${label}]`);
      }

      mixInputs.push(`[${label}]`);
      inputIndex++;
    }

    // Final mix
    filters.push(
      `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2[out]`
    );

    return filters.join(";");
  }
}

// Export singleton
export const musicDirector = new MusicDirector();
