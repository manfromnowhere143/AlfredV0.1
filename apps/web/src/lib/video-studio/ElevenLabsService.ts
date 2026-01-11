/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ELEVENLABS SERVICE - TTS with Word-Level Timestamps
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The killer feature: audio + timing metadata for:
 * - Beat/music ducking under speech
 * - Impact SFX exactly on key words
 * - Captions that highlight THE word at THE moment
 * - Gesture timing (nod on punchline)
 *
 * Uses streaming with timestamps API:
 * https://elevenlabs.io/docs/api-reference/text-to-speech/stream-with-timestamps
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WordTiming, CharacterTiming } from "./DirectorTypes";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ElevenLabsVoiceSettings {
  stability: number;          // 0-1
  similarity_boost: number;   // 0-1
  style?: number;             // 0-1, for v2 voices
  use_speaker_boost?: boolean;
}

export interface ElevenLabsTimestampChunk {
  audio_base64: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  normalized_alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export interface TTSWithTimestampsResult {
  audioBuffer: Buffer;
  audioBase64: string;
  audioUrl: string;           // data URL
  duration: number;
  wordTimings: WordTiming[];
  characterTimings: CharacterTiming[];
  cost: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

export const ELEVEN_LABS_VOICES = {
  // Male voices
  male: {
    deep: { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
    warm: { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
    intense: { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
    youthful: { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  },
  // Female voices
  female: {
    warm: { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
    confident: { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
    energetic: { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
    sultry: { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  },
  // Ethereal
  ethereal: {
    divine: { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
    androgynous: { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry" },
  },
} as const;

// Emotion to voice settings mapping
export const EMOTION_VOICE_SETTINGS: Record<string, ElevenLabsVoiceSettings> = {
  neutral: { stability: 0.5, similarity_boost: 0.75, style: 0.5 },
  happy: { stability: 0.3, similarity_boost: 0.8, style: 0.7 },
  sad: { stability: 0.7, similarity_boost: 0.6, style: 0.3 },
  angry: { stability: 0.2, similarity_boost: 0.9, style: 0.8 },
  surprised: { stability: 0.25, similarity_boost: 0.85, style: 0.6 },
  thoughtful: { stability: 0.6, similarity_boost: 0.7, style: 0.4 },
  excited: { stability: 0.2, similarity_boost: 0.85, style: 0.9 },
  intense: { stability: 0.3, similarity_boost: 0.9, style: 0.85 },
  calm: { stability: 0.8, similarity_boost: 0.6, style: 0.2 },
  confident: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
  dramatic: { stability: 0.35, similarity_boost: 0.85, style: 0.75 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ELEVENLABS SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || "";
  }

  /**
   * Generate TTS with word-level timestamps
   * This is the KEY API for Pixar-grade timing
   */
  async generateWithTimestamps(
    text: string,
    voiceId: string,
    emotion: string = "neutral"
  ): Promise<TTSWithTimestampsResult> {
    if (!this.apiKey) {
      console.warn("[ElevenLabs] No API key, returning mock data");
      return this.getMockTimestamps(text);
    }

    const voiceSettings = EMOTION_VOICE_SETTINGS[emotion] || EMOTION_VOICE_SETTINGS.neutral;

    // Use the stream-with-timestamps endpoint
    const url = `${this.baseUrl}/text-to-speech/${voiceId}/stream/with-timestamps`;

    console.log(`[ElevenLabs] Generating TTS with timestamps for: "${text.substring(0, 50)}..."`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",  // Latest turbo model
        voice_settings: {
          stability: voiceSettings.stability,
          similarity_boost: voiceSettings.similarity_boost,
          style: voiceSettings.style || 0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[ElevenLabs] API error:", error);
      throw new Error(`ElevenLabs API failed: ${response.status}`);
    }

    // Parse the streaming response (NDJSON format)
    const responseText = await response.text();
    const chunks: ElevenLabsTimestampChunk[] = responseText
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Combine audio chunks
    const audioChunks = chunks
      .filter(c => c.audio_base64)
      .map(c => Buffer.from(c.audio_base64, "base64"));

    const audioBuffer = Buffer.concat(audioChunks);
    const audioBase64 = audioBuffer.toString("base64");

    // Extract character timings from alignment data
    const characterTimings: CharacterTiming[] = [];
    let allCharacters: string[] = [];
    let allStarts: number[] = [];
    let allEnds: number[] = [];

    for (const chunk of chunks) {
      const alignment = chunk.normalized_alignment || chunk.alignment;
      if (alignment) {
        allCharacters.push(...alignment.characters);
        allStarts.push(...alignment.character_start_times_seconds);
        allEnds.push(...alignment.character_end_times_seconds);
      }
    }

    for (let i = 0; i < allCharacters.length; i++) {
      characterTimings.push({
        character: allCharacters[i],
        start: allStarts[i],
        end: allEnds[i],
      });
    }

    // Convert character timings to word timings
    const wordTimings = this.characterTimingsToWordTimings(characterTimings);

    // Calculate duration
    const duration = wordTimings.length > 0
      ? wordTimings[wordTimings.length - 1].end
      : 0;

    // Estimate cost (~$0.30 per 1000 chars for turbo)
    const cost = (text.length / 1000) * 0.30;

    console.log(`[ElevenLabs] Generated ${wordTimings.length} word timings, duration: ${duration.toFixed(2)}s`);

    return {
      audioBuffer,
      audioBase64,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      duration,
      wordTimings,
      characterTimings,
      cost,
    };
  }

  /**
   * Convert character-level timings to word-level timings
   */
  private characterTimingsToWordTimings(chars: CharacterTiming[]): WordTiming[] {
    const words: WordTiming[] = [];
    let currentWord = "";
    let wordStart = 0;
    let wordEnd = 0;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (char.character === " " || char.character === "\n") {
        // Word boundary
        if (currentWord.trim()) {
          words.push({
            word: currentWord.trim(),
            start: wordStart,
            end: wordEnd,
          });
        }
        currentWord = "";
        continue;
      }

      if (currentWord === "") {
        wordStart = char.start;
      }

      currentWord += char.character;
      wordEnd = char.end;
    }

    // Don't forget the last word
    if (currentWord.trim()) {
      words.push({
        word: currentWord.trim(),
        start: wordStart,
        end: wordEnd,
      });
    }

    return words;
  }

  /**
   * Get mock timestamps for development without API key
   */
  private getMockTimestamps(text: string): TTSWithTimestampsResult {
    const words = text.split(/\s+/).filter(w => w.trim());
    const avgWordDuration = 0.4; // ~150 words/minute
    const wordTimings: WordTiming[] = [];
    const characterTimings: CharacterTiming[] = [];

    let currentTime = 0;

    for (const word of words) {
      const duration = avgWordDuration * (word.length / 5); // Longer words take longer
      wordTimings.push({
        word,
        start: currentTime,
        end: currentTime + duration,
      });

      // Character timings
      const charDuration = duration / word.length;
      for (let i = 0; i < word.length; i++) {
        characterTimings.push({
          character: word[i],
          start: currentTime + i * charDuration,
          end: currentTime + (i + 1) * charDuration,
        });
      }

      currentTime += duration + 0.1; // Small gap between words
    }

    const totalDuration = currentTime;

    return {
      audioBuffer: Buffer.from([]),
      audioBase64: "",
      audioUrl: "",
      duration: totalDuration,
      wordTimings,
      characterTimings,
      cost: 0,
    };
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    if (!this.apiKey) return [];

    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { "xi-api-key": this.apiKey },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.voices || [];
  }

  /**
   * Select best voice for persona
   */
  selectVoiceForPersona(archetype: string, name: string): string {
    // Map archetype to voice style
    const archetypeToVoice: Record<string, { gender: keyof typeof ELEVEN_LABS_VOICES; style: string }> = {
      sage: { gender: "male", style: "deep" },
      hero: { gender: "male", style: "intense" },
      creator: { gender: "female", style: "confident" },
      caregiver: { gender: "female", style: "warm" },
      ruler: { gender: "male", style: "deep" },
      jester: { gender: "male", style: "youthful" },
      rebel: { gender: "male", style: "intense" },
      lover: { gender: "female", style: "sultry" },
      explorer: { gender: "male", style: "warm" },
      innocent: { gender: "female", style: "energetic" },
      magician: { gender: "ethereal", style: "divine" },
    };

    const mapping = archetypeToVoice[archetype?.toLowerCase()] || archetypeToVoice.sage;

    // Check if name suggests a specific gender
    const femalePatterns = /^(sarah|emma|sophia|isabella|mia|medusa|athena|hera|aphrodite|luna|stella)/i;
    const malePatterns = /^(james|john|michael|william|david|zeus|poseidon|thor|odin)/i;

    let gender = mapping.gender;
    if (femalePatterns.test(name)) gender = "female";
    else if (malePatterns.test(name)) gender = "male";

    const voiceCategory = ELEVEN_LABS_VOICES[gender];
    const voice = (voiceCategory as any)[mapping.style];

    return voice?.id || ELEVEN_LABS_VOICES.male.deep.id;
  }
}

// Export singleton
export const elevenLabsService = new ElevenLabsService();
