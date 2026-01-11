/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE ENGINE: VOICE PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pre-configured voice personas for different character archetypes.
 * Each preset includes voice characteristics and emotional profiles.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';
import type { VoiceSettings } from './elevenlabs';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceCharacteristics {
  /** Voice gender */
  gender: 'male' | 'female' | 'neutral';
  /** Perceived age */
  age: 'young' | 'adult' | 'mature' | 'elderly';
  /** Pitch adjustment (-1 to 1) */
  pitch: number;
  /** Speed multiplier (0.5 to 2.0) */
  speed: number;
  /** Voice stability (0 to 1) */
  stability: number;
  /** Voice clarity (0 to 1) */
  clarity: number;
}

export interface EmotionVoiceProfile {
  /** Base voice settings for this emotion */
  settings: Partial<VoiceSettings>;
  /** Speed adjustment multiplier */
  speedMultiplier: number;
  /** Pitch adjustment */
  pitchShift: number;
  /** Pause behavior */
  pauseBehavior: 'shorter' | 'normal' | 'longer' | 'dramatic';
}

export interface VoicePreset {
  /** Display name */
  name: string;
  /** Description for users */
  description: string;
  /** Voice characteristics */
  characteristics: VoiceCharacteristics;
  /** Speaking style */
  style: {
    accent?: string;
    speakingStyle: 'conversational' | 'narrator' | 'announcer' | 'authoritative' | 'friendly' | 'dramatic';
    quirks?: string[];
  };
  /** Emotion profiles */
  emotionProfiles: Partial<Record<EmotionState, EmotionVoiceProfile>>;
  /** Prompt hint for LLM */
  promptHint: string;
  /** Suggested ElevenLabs voice IDs */
  suggestedVoiceIds?: string[];
  /** Sample audio URL */
  sampleAudioUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  wise_mentor: {
    name: 'Wise Mentor',
    description: 'Deep, measured voice with gravitas. Like Gandalf or Morgan Freeman narrating.',
    characteristics: {
      gender: 'male',
      age: 'elderly',
      pitch: -0.3,
      speed: 0.85,
      stability: 0.8,
      clarity: 0.9,
    },
    style: {
      speakingStyle: 'narrator',
      quirks: ['long pauses for wisdom', 'gentle emphasis on key words'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.8, similarityBoost: 0.85, style: 0.1 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'longer',
      },
      thoughtful: {
        settings: { stability: 0.85, similarityBoost: 0.9, style: 0.15 },
        speedMultiplier: 0.9,
        pitchShift: 0,
        pauseBehavior: 'dramatic',
      },
      concerned: {
        settings: { stability: 0.75, similarityBoost: 0.85, style: 0.2 },
        speedMultiplier: 0.95,
        pitchShift: 0.05,
        pauseBehavior: 'longer',
      },
    },
    promptHint: 'Speak slowly with gravitas, pause before important words, use a warm but wise tone',
    suggestedVoiceIds: ['pNInz6obpgDQGcFmaJgB', 'VR6AewLTigWG4xSOukaG'], // Adam, Arnold
  },

  regal_queen: {
    name: 'Regal Queen',
    description: 'Commanding, elegant voice with British RP accent. Authoritative yet refined.',
    characteristics: {
      gender: 'female',
      age: 'adult',
      pitch: 0.1,
      speed: 0.9,
      stability: 0.85,
      clarity: 0.95,
    },
    style: {
      accent: 'british_rp',
      speakingStyle: 'authoritative',
      quirks: ['commanding pauses', 'precise diction', 'subtle condescension'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.85, similarityBoost: 0.9, style: 0.2 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'normal',
      },
      confident: {
        settings: { stability: 0.8, similarityBoost: 0.85, style: 0.3 },
        speedMultiplier: 0.95,
        pitchShift: -0.05,
        pauseBehavior: 'longer',
      },
      angry: {
        settings: { stability: 0.7, similarityBoost: 0.8, style: 0.4 },
        speedMultiplier: 0.9,
        pitchShift: -0.1,
        pauseBehavior: 'dramatic',
      },
    },
    promptHint: 'Speak with authority and elegance, measured pace, precise pronunciation',
    suggestedVoiceIds: ['EXAVITQu4vr4xnSDxMaL', 'ThT5KcBeYPX3keUQqHPh'], // Bella, Dorothy
  },

  friendly_guide: {
    name: 'Friendly Guide',
    description: 'Warm, approachable voice. Like a helpful friend explaining things.',
    characteristics: {
      gender: 'neutral',
      age: 'young',
      pitch: 0.2,
      speed: 1.1,
      stability: 0.6,
      clarity: 0.85,
    },
    style: {
      speakingStyle: 'friendly',
      quirks: ['slight upward inflection', 'warm tone', 'encouraging interjections'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.6, similarityBoost: 0.7, style: 0.3 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'normal',
      },
      happy: {
        settings: { stability: 0.5, similarityBoost: 0.65, style: 0.5 },
        speedMultiplier: 1.1,
        pitchShift: 0.1,
        pauseBehavior: 'shorter',
      },
      excited: {
        settings: { stability: 0.4, similarityBoost: 0.6, style: 0.6 },
        speedMultiplier: 1.15,
        pitchShift: 0.15,
        pauseBehavior: 'shorter',
      },
    },
    promptHint: 'Speak warmly and enthusiastically, like talking to a friend, be encouraging',
    suggestedVoiceIds: ['21m00Tcm4TlvDq8ikWAM', 'AZnzlk1XvdvUeBnXmlld'], // Rachel, Domi
  },

  epic_narrator: {
    name: 'Epic Narrator',
    description: 'Dramatic, cinematic voice. Like a movie trailer or epic documentary.',
    characteristics: {
      gender: 'male',
      age: 'mature',
      pitch: -0.2,
      speed: 0.8,
      stability: 0.9,
      clarity: 0.95,
    },
    style: {
      speakingStyle: 'announcer',
      quirks: ['dramatic pauses', 'building intensity', 'powerful emphasis'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.9, similarityBoost: 0.85, style: 0.3 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'longer',
      },
      excited: {
        settings: { stability: 0.75, similarityBoost: 0.8, style: 0.5 },
        speedMultiplier: 1.05,
        pitchShift: 0.1,
        pauseBehavior: 'dramatic',
      },
      confident: {
        settings: { stability: 0.85, similarityBoost: 0.85, style: 0.4 },
        speedMultiplier: 0.95,
        pitchShift: -0.05,
        pauseBehavior: 'longer',
      },
    },
    promptHint: 'Speak like a movie trailer narrator, dramatic and impactful, build tension',
    suggestedVoiceIds: ['2EiwWnXFnvU5JabPnv8n', 'ODq5zmih8GrVes37Dizd'], // Clyde, Patrick
  },

  corporate_professional: {
    name: 'Corporate Professional',
    description: 'Clear, professional voice. Perfect for business and educational content.',
    characteristics: {
      gender: 'neutral',
      age: 'adult',
      pitch: 0,
      speed: 1.0,
      stability: 0.7,
      clarity: 0.9,
    },
    style: {
      speakingStyle: 'conversational',
      quirks: ['clear enunciation', 'measured pacing'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.7, similarityBoost: 0.8, style: 0.15 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'normal',
      },
      confident: {
        settings: { stability: 0.75, similarityBoost: 0.85, style: 0.2 },
        speedMultiplier: 0.98,
        pitchShift: -0.02,
        pauseBehavior: 'normal',
      },
    },
    promptHint: 'Speak clearly and professionally, be helpful and informative',
    suggestedVoiceIds: ['yoZ06aMxZJJ28mfd3POQ', 'flq6f7yk4E4fJM5XTYuZ'], // Sam, Michael
  },

  mysterious_oracle: {
    name: 'Mysterious Oracle',
    description: 'Ethereal, mysterious voice with an otherworldly quality.',
    characteristics: {
      gender: 'female',
      age: 'mature',
      pitch: -0.1,
      speed: 0.85,
      stability: 0.75,
      clarity: 0.85,
    },
    style: {
      speakingStyle: 'dramatic',
      quirks: ['lingering pauses', 'cryptic emphasis', 'soft intensity'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.75, similarityBoost: 0.8, style: 0.25 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'longer',
      },
      thoughtful: {
        settings: { stability: 0.8, similarityBoost: 0.85, style: 0.3 },
        speedMultiplier: 0.9,
        pitchShift: -0.05,
        pauseBehavior: 'dramatic',
      },
    },
    promptHint: 'Speak with mystery and wisdom, use dramatic pauses, hint at deeper meanings',
    suggestedVoiceIds: ['jBpfuIE2acCO8z3wKNLl', 'oWAxZDx7w5VEj9dCyTzz'], // Gigi, Grace
  },

  energetic_host: {
    name: 'Energetic Host',
    description: 'High-energy, enthusiastic voice. Great for entertainment and gaming.',
    characteristics: {
      gender: 'male',
      age: 'young',
      pitch: 0.15,
      speed: 1.2,
      stability: 0.5,
      clarity: 0.8,
    },
    style: {
      speakingStyle: 'friendly',
      quirks: ['excitable inflections', 'quick pace', 'expressive reactions'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.5, similarityBoost: 0.7, style: 0.4 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'shorter',
      },
      excited: {
        settings: { stability: 0.35, similarityBoost: 0.6, style: 0.7 },
        speedMultiplier: 1.2,
        pitchShift: 0.2,
        pauseBehavior: 'shorter',
      },
      happy: {
        settings: { stability: 0.4, similarityBoost: 0.65, style: 0.6 },
        speedMultiplier: 1.15,
        pitchShift: 0.15,
        pauseBehavior: 'shorter',
      },
    },
    promptHint: 'Be energetic and enthusiastic, keep the energy high, react expressively',
    suggestedVoiceIds: ['TxGEqnHWrfWFTfGW9XjX', 'IKne3meq5aSn9XLyUdCD'], // Josh, Charlie
  },

  soothing_guide: {
    name: 'Soothing Guide',
    description: 'Calm, gentle voice for meditation, wellness, and ASMR content.',
    characteristics: {
      gender: 'female',
      age: 'adult',
      pitch: -0.05,
      speed: 0.9,
      stability: 0.85,
      clarity: 0.9,
    },
    style: {
      speakingStyle: 'conversational',
      quirks: ['gentle tone', 'soft breathiness', 'calming pauses'],
    },
    emotionProfiles: {
      neutral: {
        settings: { stability: 0.85, similarityBoost: 0.85, style: 0.1 },
        speedMultiplier: 1.0,
        pitchShift: 0,
        pauseBehavior: 'longer',
      },
      calm: {
        settings: { stability: 0.9, similarityBoost: 0.9, style: 0.05 },
        speedMultiplier: 0.9,
        pitchShift: -0.05,
        pauseBehavior: 'longer',
      },
    },
    promptHint: 'Speak gently and soothingly, use a calming tone, pause for breath',
    suggestedVoiceIds: ['XB0fDUnXU5powFXDhCwa', 'pFZP5JQG7iQjIQuC4Bku'], // Charlotte, Lily
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get voice preset by name
 */
export function getVoicePreset(name: string): VoicePreset | undefined {
  return VOICE_PRESETS[name];
}

/**
 * Get all available voice preset names
 */
export function getAvailableVoicePresets(): string[] {
  return Object.keys(VOICE_PRESETS);
}

/**
 * Get voice settings for a preset and emotion
 */
export function getVoiceSettingsForEmotion(
  presetName: string,
  emotion: EmotionState
): Partial<VoiceSettings> & { speedMultiplier: number; pitchShift: number } {
  const preset = VOICE_PRESETS[presetName];
  if (!preset) {
    return {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      speedMultiplier: 1.0,
      pitchShift: 0,
    };
  }

  const emotionProfile = preset.emotionProfiles[emotion] || preset.emotionProfiles.neutral;
  if (!emotionProfile) {
    return {
      stability: preset.characteristics.stability,
      similarityBoost: 0.75,
      style: 0,
      speedMultiplier: 1.0,
      pitchShift: 0,
    };
  }

  return {
    ...emotionProfile.settings,
    speedMultiplier: emotionProfile.speedMultiplier,
    pitchShift: emotionProfile.pitchShift,
  };
}

/**
 * Match archetype to voice preset
 */
export function matchArchetypeToVoicePreset(archetype: string): string {
  const archetypeMap: Record<string, string> = {
    sage: 'wise_mentor',
    ruler: 'regal_queen',
    hero: 'epic_narrator',
    caregiver: 'soothing_guide',
    creator: 'friendly_guide',
    jester: 'energetic_host',
    magician: 'mysterious_oracle',
    explorer: 'friendly_guide',
    rebel: 'energetic_host',
    lover: 'soothing_guide',
    innocent: 'friendly_guide',
    outlaw: 'energetic_host',
  };

  return archetypeMap[archetype] || 'friendly_guide';
}
