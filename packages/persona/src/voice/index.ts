/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete voice synthesis and audio processing pipeline.
 * Powers natural, expressive character voices in PersonaForge.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ElevenLabs Integration
export {
  ElevenLabsClient,
  createElevenLabsClient,
  EMOTION_VOICE_SETTINGS,
  type ElevenLabsConfig,
  type ElevenLabsModel,
  type VoiceSettings,
  type SynthesisRequest,
  type SynthesisResult,
  type Voice,
  type VoiceCloneRequest,
} from './elevenlabs';

// Voice Presets
export {
  VOICE_PRESETS,
  getVoicePreset,
  getAvailableVoicePresets,
  getVoiceSettingsForEmotion,
  matchArchetypeToVoicePreset,
  type VoiceCharacteristics,
  type EmotionVoiceProfile,
  type VoicePreset,
} from './presets';

// SSML Builder
export {
  SSMLBuilder,
  textToSSML,
  addPunctuationPauses,
  parseEmotionTags,
  stripSSML,
  EMOTION_PROSODY,
  PAUSE_DURATIONS,
  type SSMLOptions,
  type ProsodySettings,
} from './ssml';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED VOICE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

import type { EmotionState } from '../types';
import type { VoiceDNA } from '../genome/types';

import { ElevenLabsClient, type ElevenLabsConfig } from './elevenlabs';
import { VOICE_PRESETS, getVoiceSettingsForEmotion, type VoicePreset } from './presets';
import { textToSSML, parseEmotionTags, stripSSML } from './ssml';

export interface VoiceEngineConfig {
  /** ElevenLabs API key */
  elevenLabsApiKey: string;
  /** Default voice ID */
  defaultVoiceId?: string;
  /** Default model */
  defaultModel?: 'eleven_turbo_v2' | 'eleven_multilingual_v2';
  /** Enable SSML processing */
  useSSML?: boolean;
}

export interface SpeakRequest {
  /** Text to speak */
  text: string;
  /** Voice ID override */
  voiceId?: string;
  /** Voice preset name */
  preset?: string;
  /** Current emotion */
  emotion?: EmotionState;
  /** Voice DNA for persona-specific settings */
  voiceDNA?: VoiceDNA;
  /** Stream output */
  stream?: boolean;
}

export interface SpeakResult {
  /** Audio data */
  audio: ArrayBuffer;
  /** Audio URL (if uploaded) */
  audioUrl?: string;
  /** Duration in seconds */
  duration: number;
  /** Characters used */
  charactersUsed: number;
  /** Cost in USD */
  cost: number;
}

/**
 * Unified Voice Engine
 * 
 * Orchestrates all voice synthesis capabilities for PersonaForge.
 */
export class VoiceEngine {
  private config: VoiceEngineConfig;
  private elevenLabs: ElevenLabsClient;

  constructor(config: VoiceEngineConfig) {
    this.config = {
      useSSML: false, // ElevenLabs doesn't support full SSML
      ...config,
    };

    this.elevenLabs = new ElevenLabsClient({
      apiKey: config.elevenLabsApiKey,
      defaultVoiceId: config.defaultVoiceId,
      defaultModel: config.defaultModel || 'eleven_turbo_v2',
    });
  }

  /**
   * Synthesize speech from text
   */
  async speak(request: SpeakRequest): Promise<SpeakResult> {
    // Determine voice ID
    const voiceId = this.resolveVoiceId(request);

    // Process text
    let processedText = request.text;
    
    // Strip any emotion/action tags from the text
    processedText = processedText
      .replace(/\[EMOTION:\w+\]/gi, '')
      .replace(/\[ACTION:\w+\]/gi, '')
      .replace(/\[PAUSE:\w+\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Get voice settings based on emotion and preset
    const voiceSettings = this.resolveVoiceSettings(request);

    // Synthesize
    const result = await this.elevenLabs.synthesize({
      text: processedText,
      voiceId,
      emotion: request.emotion,
      settings: voiceSettings,
    });

    return {
      audio: result.audio,
      duration: result.duration,
      charactersUsed: result.charactersUsed,
      cost: result.cost,
    };
  }

  /**
   * Synthesize speech with streaming output
   */
  async *speakStream(request: SpeakRequest): AsyncGenerator<ArrayBuffer> {
    const voiceId = this.resolveVoiceId(request);

    let processedText = request.text
      .replace(/\[EMOTION:\w+\]/gi, '')
      .replace(/\[ACTION:\w+\]/gi, '')
      .replace(/\[PAUSE:\w+\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const voiceSettings = this.resolveVoiceSettings(request);

    yield* this.elevenLabs.synthesizeStream({
      text: processedText,
      voiceId,
      emotion: request.emotion,
      settings: voiceSettings,
      outputFormat: 'mp3_44100_128',
    });
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(
    name: string,
    samples: Array<{ filename: string; data: ArrayBuffer }>,
    description?: string
  ) {
    return this.elevenLabs.cloneVoice({
      name,
      samples,
      description,
    });
  }

  /**
   * List available voices
   */
  async listVoices() {
    return this.elevenLabs.listVoices();
  }

  /**
   * Get voice details
   */
  async getVoice(voiceId: string) {
    return this.elevenLabs.getVoice(voiceId);
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string) {
    return this.elevenLabs.deleteVoice(voiceId);
  }

  /**
   * Get subscription/usage info
   */
  async getUsage() {
    return this.elevenLabs.getSubscription();
  }

  /**
   * Get all available voice presets
   */
  getPresets(): Record<string, VoicePreset> {
    return VOICE_PRESETS;
  }

  /**
   * Preview a voice preset with sample text
   */
  async previewPreset(
    presetName: string,
    sampleText: string = 'Hello! This is a preview of my voice. How does it sound?'
  ): Promise<SpeakResult> {
    const preset = VOICE_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Voice preset not found: ${presetName}`);
    }

    const voiceId = preset.suggestedVoiceIds?.[0] || this.config.defaultVoiceId;
    if (!voiceId) {
      throw new Error('No voice ID available for preview');
    }

    return this.speak({
      text: sampleText,
      voiceId,
      preset: presetName,
      emotion: 'neutral',
    });
  }

  /**
   * Estimate cost for text synthesis
   */
  estimateCost(text: string, model?: string): number {
    const cleanText = text
      .replace(/\[EMOTION:\w+\]/gi, '')
      .replace(/\[ACTION:\w+\]/gi, '')
      .replace(/\[PAUSE:\w+\]/gi, '')
      .trim();

    const characters = cleanText.length;
    const ratePerThousand = model === 'eleven_turbo_v2' ? 0.15 : 0.30;
    
    return (characters / 1000) * ratePerThousand;
  }

  /**
   * Resolve voice ID from request
   */
  private resolveVoiceId(request: SpeakRequest): string {
    // Explicit voice ID
    if (request.voiceId) {
      return request.voiceId;
    }

    // From VoiceDNA
    if (request.voiceDNA?.voiceId) {
      return request.voiceDNA.voiceId;
    }

    // From preset
    if (request.preset && VOICE_PRESETS[request.preset]) {
      const preset = VOICE_PRESETS[request.preset];
      if (preset.suggestedVoiceIds?.[0]) {
        return preset.suggestedVoiceIds[0];
      }
    }

    // Default
    if (this.config.defaultVoiceId) {
      return this.config.defaultVoiceId;
    }

    throw new Error('No voice ID specified');
  }

  /**
   * Resolve voice settings from request
   */
  private resolveVoiceSettings(request: SpeakRequest) {
    // Start with defaults
    let settings = {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
    };

    // Apply VoiceDNA settings
    if (request.voiceDNA?.characteristics) {
      const chars = request.voiceDNA.characteristics;
      // stability not in characteristics type - use default
    }

    // Apply preset settings for emotion
    if (request.preset && request.emotion) {
      const emotionSettings = getVoiceSettingsForEmotion(request.preset, request.emotion);
      settings = {
        ...settings,
        ...emotionSettings,
      };
    }

    // Apply VoiceDNA emotion profile
    if (request.voiceDNA?.emotionProfiles && request.emotion) {
      const emotionProfile = request.voiceDNA.emotionProfiles[request.emotion];
      if (emotionProfile) {
        // Map VoiceDNA emotion profile to ElevenLabs settings
        settings.stability *= (1 - (emotionProfile.intensity || 0) * 0.3);
        settings.style = emotionProfile.intensity || 0;
      }
    }

    return settings;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createVoiceEngine(config: VoiceEngineConfig): VoiceEngine {
  return new VoiceEngine(config);
}
