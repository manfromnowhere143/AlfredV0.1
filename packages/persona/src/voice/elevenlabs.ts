/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE ENGINE: ELEVENLABS INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Professional voice synthesis using ElevenLabs API.
 * Supports streaming, emotion modulation, and voice cloning.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId?: string;
  defaultModel?: ElevenLabsModel;
}

export type ElevenLabsModel = 
  | 'eleven_monolingual_v1'
  | 'eleven_multilingual_v1'
  | 'eleven_multilingual_v2'
  | 'eleven_turbo_v2'
  | 'eleven_turbo_v2_5';

export interface VoiceSettings {
  /** Stability (0-1): Higher = more consistent, lower = more expressive */
  stability: number;
  /** Similarity boost (0-1): How closely to match the original voice */
  similarityBoost: number;
  /** Style (0-1): Expressiveness intensity */
  style?: number;
  /** Use speaker boost for clarity */
  useSpeakerBoost?: boolean;
}

export interface SynthesisRequest {
  /** Text to synthesize */
  text: string;
  /** Voice ID to use */
  voiceId: string;
  /** Model to use */
  model?: ElevenLabsModel;
  /** Voice settings */
  settings?: Partial<VoiceSettings>;
  /** Target emotion */
  emotion?: EmotionState;
  /** Output format */
  outputFormat?: 'mp3_44100_128' | 'mp3_44100_192' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
}

export interface SynthesisResult {
  /** Audio data as ArrayBuffer */
  audio: ArrayBuffer;
  /** Audio duration in seconds */
  duration: number;
  /** Characters used */
  charactersUsed: number;
  /** Cost in USD */
  cost: number;
}

export interface Voice {
  voiceId: string;
  name: string;
  category: 'premade' | 'cloned' | 'generated';
  labels: Record<string, string>;
  previewUrl?: string;
}

export interface VoiceCloneRequest {
  /** Name for the cloned voice */
  name: string;
  /** Description of the voice */
  description?: string;
  /** Audio samples (1-25 files, max 10MB each) */
  samples: Array<{
    filename: string;
    data: ArrayBuffer;
  }>;
  /** Labels for categorization */
  labels?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION VOICE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const EMOTION_VOICE_SETTINGS: Record<EmotionState, Partial<VoiceSettings>> = {
  neutral: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
  },
  happy: {
    stability: 0.35,
    similarityBoost: 0.7,
    style: 0.4,
  },
  sad: {
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.3,
  },
  angry: {
    stability: 0.3,
    similarityBoost: 0.75,
    style: 0.6,
  },
  surprised: {
    stability: 0.25,
    similarityBoost: 0.7,
    style: 0.5,
  },
  thoughtful: {
    stability: 0.55,
    similarityBoost: 0.8,
    style: 0.2,
  },
  excited: {
    stability: 0.25,
    similarityBoost: 0.65,
    style: 0.7,
  },
  calm: {
    stability: 0.7,
    similarityBoost: 0.85,
    style: 0.1,
  },
  confident: {
    stability: 0.45,
    similarityBoost: 0.8,
    style: 0.35,
  },
  curious: {
    stability: 0.4,
    similarityBoost: 0.75,
    style: 0.3,
  },
  concerned: {
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.25,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELEVENLABS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class ElevenLabsClient {
  private config: ElevenLabsConfig;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(config: ElevenLabsConfig) {
    this.config = {
      defaultModel: 'eleven_turbo_v2',
      ...config,
    };
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(request: SynthesisRequest): Promise<SynthesisResult> {
    const voiceId = request.voiceId || this.config.defaultVoiceId;
    if (!voiceId) {
      throw new Error('Voice ID required');
    }

    // Apply emotion settings
    const emotionSettings = request.emotion 
      ? EMOTION_VOICE_SETTINGS[request.emotion] 
      : {};

    const settings: VoiceSettings = {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
      ...emotionSettings,
      ...request.settings,
    };

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model || this.config.defaultModel,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: settings.useSpeakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs API error: ${error.detail?.message || response.statusText}`);
    }

    const audio = await response.arrayBuffer();
    const charactersUsed = request.text.length;

    // Estimate duration (rough: ~150 chars per second for speech)
    const estimatedDuration = charactersUsed / 150;

    return {
      audio,
      duration: estimatedDuration,
      charactersUsed,
      cost: this.calculateCost(charactersUsed, request.model),
    };
  }

  /**
   * Synthesize with streaming output
   */
  async *synthesizeStream(request: SynthesisRequest): AsyncGenerator<ArrayBuffer> {
    const voiceId = request.voiceId || this.config.defaultVoiceId;
    if (!voiceId) {
      throw new Error('Voice ID required');
    }

    const emotionSettings = request.emotion 
      ? EMOTION_VOICE_SETTINGS[request.emotion] 
      : {};

    const settings: VoiceSettings = {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
      ...emotionSettings,
      ...request.settings,
    };

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model || this.config.defaultModel,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: settings.useSpeakerBoost,
          },
          output_format: request.outputFormat || 'mp3_44100_128',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs stream error: ${error.detail?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value.buffer;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<Voice[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.voices.map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels || {},
      previewUrl: v.preview_url,
    }));
  }

  /**
   * Get voice details
   */
  async getVoice(voiceId: string): Promise<Voice> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get voice: ${response.statusText}`);
    }

    const v = await response.json();
    
    return {
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels || {},
      previewUrl: v.preview_url,
    };
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<Voice> {
    const formData = new FormData();
    formData.append('name', request.name);
    
    if (request.description) {
      formData.append('description', request.description);
    }

    if (request.labels) {
      formData.append('labels', JSON.stringify(request.labels));
    }

    for (const sample of request.samples) {
      formData.append('files', new Blob([sample.data]), sample.filename);
    }

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.config.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Voice cloning failed: ${error.detail?.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      voiceId: data.voice_id,
      name: request.name,
      category: 'cloned',
      labels: request.labels || {},
    };
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete voice: ${response.statusText}`);
    }
  }

  /**
   * Get user subscription info
   */
  async getSubscription(): Promise<{
    characterCount: number;
    characterLimit: number;
    canExtendCharacterLimit: boolean;
    tier: string;
  }> {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get subscription: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      canExtendCharacterLimit: data.can_extend_character_limit,
      tier: data.tier,
    };
  }

  /**
   * Calculate cost based on character count
   */
  private calculateCost(characters: number, model?: ElevenLabsModel): number {
    // ElevenLabs pricing varies by plan
    // Approximate: $0.30 per 1000 characters on standard plan
    const ratePerThousand = model === 'eleven_turbo_v2' || model === 'eleven_turbo_v2_5'
      ? 0.15 // Turbo is cheaper
      : 0.30;

    return (characters / 1000) * ratePerThousand;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createElevenLabsClient(config: ElevenLabsConfig): ElevenLabsClient {
  return new ElevenLabsClient(config);
}
