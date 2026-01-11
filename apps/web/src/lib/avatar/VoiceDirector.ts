/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE DIRECTOR - Emotion-Aware TTS Orchestration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes persona context + LLM output and produces:
 * 1. ElevenLabs request parameters (voice settings, emotion modulation)
 * 2. Emotion curve for avatar animation timing
 * 3. Viseme timeline hints (when available)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Emotion } from "./store";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaVoiceConfig {
  voiceId: string;
  archetype?: string;
  baseStability?: number;
  baseSimilarityBoost?: number;
}

export interface TTSRequest {
  text: string;
  emotion: Emotion;
  intensity: number;
  pacing?: "slow" | "normal" | "fast";
}

export interface VoiceDirectorOutput {
  // ElevenLabs parameters
  elevenlabs: {
    voiceId: string;
    modelId: string;
    voiceSettings: {
      stability: number;
      similarity_boost: number;
      style: number;
      use_speaker_boost: boolean;
    };
  };

  // Emotion curve for avatar (time -> emotion intensity)
  emotionCurve: Array<{
    time: number;  // 0-1 normalized
    emotion: Emotion;
    intensity: number;
  }>;

  // Clean text for TTS (no action markers)
  cleanText: string;

  // Estimated duration (for timing)
  estimatedDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION VOICE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_VOICE_SETTINGS: Record<Emotion, {
  stability: number;
  similarity_boost: number;
  style: number;
}> = {
  neutral: { stability: 0.5, similarity_boost: 0.75, style: 0 },
  happy: { stability: 0.35, similarity_boost: 0.8, style: 0.6 },
  sad: { stability: 0.7, similarity_boost: 0.65, style: 0.2 },
  angry: { stability: 0.3, similarity_boost: 0.7, style: 0.8 },
  surprised: { stability: 0.25, similarity_boost: 0.75, style: 0.7 },
  curious: { stability: 0.45, similarity_boost: 0.8, style: 0.4 },
  focused: { stability: 0.6, similarity_boost: 0.75, style: 0.2 },
  playful: { stability: 0.3, similarity_boost: 0.85, style: 0.7 },
  concerned: { stability: 0.55, similarity_boost: 0.7, style: 0.3 },
  confident: { stability: 0.5, similarity_boost: 0.8, style: 0.5 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PACING MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════════════════

const PACING_MULTIPLIERS = {
  slow: 1.3,
  normal: 1.0,
  fast: 0.75,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE DIRECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class VoiceDirector {
  private voiceConfig: PersonaVoiceConfig;

  constructor(voiceConfig: PersonaVoiceConfig) {
    this.voiceConfig = voiceConfig;
  }

  /**
   * Process a TTS request and return voice parameters + emotion curve
   */
  process(request: TTSRequest): VoiceDirectorOutput {
    const { text, emotion, intensity, pacing = "normal" } = request;

    // Get emotion-based voice settings
    const emotionSettings = EMOTION_VOICE_SETTINGS[emotion] || EMOTION_VOICE_SETTINGS.neutral;

    // Apply persona base settings with emotion modulation
    const stability = this.blend(
      this.voiceConfig.baseStability ?? 0.5,
      emotionSettings.stability,
      intensity
    );

    const similarityBoost = this.blend(
      this.voiceConfig.baseSimilarityBoost ?? 0.75,
      emotionSettings.similarity_boost,
      intensity
    );

    // Clean text for TTS (remove action markers)
    const cleanText = this.cleanTextForTTS(text);

    // Estimate duration
    const words = cleanText.split(/\s+/).length;
    const wordsPerMinute = 150 / PACING_MULTIPLIERS[pacing];
    const estimatedDurationMs = (words / wordsPerMinute) * 60 * 1000;

    // Generate simple emotion curve (start strong, sustain, fade)
    const emotionCurve = this.generateEmotionCurve(emotion, intensity);

    return {
      elevenlabs: {
        voiceId: this.voiceConfig.voiceId,
        modelId: "eleven_turbo_v2",
        voiceSettings: {
          stability,
          similarity_boost: similarityBoost,
          style: emotionSettings.style * intensity,
          use_speaker_boost: true,
        },
      },
      emotionCurve,
      cleanText,
      estimatedDurationMs,
    };
  }

  /**
   * Clean text for TTS (remove all markers)
   */
  private cleanTextForTTS(text: string): string {
    return text
      // Remove [TAG:content] style markers
      .replace(/\[EMOTION:[^\]]+\]/gi, "")
      .replace(/\[ACTION:[^\]]+\]/gi, "")
      .replace(/\[PAUSE:[^\]]+\]/gi, "")
      .replace(/\[TONE:[^\]]+\]/gi, "")
      .replace(/\[GESTURE:[^\]]+\]/gi, "")
      // Remove *asterisk actions* and _underscore actions_
      .replace(/\*[^*]+\*/g, "")
      .replace(/_[^_]+_/g, "")
      // Remove stage directions in parentheses
      .replace(/\([^)]{1,50}\)/g, "")
      // Clean up whitespace
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Blend two values based on intensity (0 = base, 1 = emotion)
   */
  private blend(base: number, emotion: number, intensity: number): number {
    return base + (emotion - base) * intensity;
  }

  /**
   * Generate emotion curve for avatar animation timing
   */
  private generateEmotionCurve(
    emotion: Emotion,
    intensity: number
  ): VoiceDirectorOutput["emotionCurve"] {
    return [
      { time: 0.0, emotion, intensity: intensity * 0.7 },    // Start
      { time: 0.1, emotion, intensity: intensity * 1.0 },    // Ramp up
      { time: 0.3, emotion, intensity: intensity * 1.0 },    // Sustain
      { time: 0.7, emotion, intensity: intensity * 0.9 },    // Sustain
      { time: 0.9, emotion, intensity: intensity * 0.6 },    // Fade
      { time: 1.0, emotion: "neutral", intensity: 0.3 },     // Return
    ];
  }

  /**
   * Detect emotion from text (simple heuristic)
   */
  static detectEmotion(text: string): { emotion: Emotion; intensity: number } {
    const lower = text.toLowerCase();

    // Happy indicators
    if (/\b(happy|joy|wonderful|amazing|love|great|fantastic|excited|yay|haha)\b/.test(lower)) {
      return { emotion: "happy", intensity: 0.7 };
    }

    // Sad indicators
    if (/\b(sad|sorry|unfortunately|regret|miss|lonely|cry|tears)\b/.test(lower)) {
      return { emotion: "sad", intensity: 0.6 };
    }

    // Curious indicators
    if (/\?|curious|wonder|interesting|hmm|what if|tell me|how|why/.test(lower)) {
      return { emotion: "curious", intensity: 0.5 };
    }

    // Surprised indicators
    if (/\b(wow|oh|really|amazing|incredible|can't believe)\b|!{2,}/.test(lower)) {
      return { emotion: "surprised", intensity: 0.6 };
    }

    // Playful indicators
    if (/\b(hehe|haha|joke|fun|play|silly|tease|wink)\b/.test(lower)) {
      return { emotion: "playful", intensity: 0.6 };
    }

    // Concerned indicators
    if (/\b(worried|concern|careful|warning|danger|problem|issue)\b/.test(lower)) {
      return { emotion: "concerned", intensity: 0.5 };
    }

    // Confident indicators
    if (/\b(absolutely|certainly|definitely|sure|confident|trust me|of course)\b/.test(lower)) {
      return { emotion: "confident", intensity: 0.6 };
    }

    // Default neutral
    return { emotion: "neutral", intensity: 0.4 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createVoiceDirector(config: PersonaVoiceConfig): VoiceDirector {
  return new VoiceDirector(config);
}

export default VoiceDirector;
