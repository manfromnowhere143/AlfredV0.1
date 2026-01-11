/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUDIO POST SERVICE - Cinematic Sound Design
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Creates the "rise and fall" cinematic feel through:
 * - Music bed with intelligent ducking under speech
 * - Impact SFX at timestamp events
 * - Ambience for atmosphere
 * - Final audio mix
 *
 * This is what makes PersonaForge videos feel "professional" vs amateur.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MusicPlan, SFXEvent, WordTiming, getMusicVolumeAtTime } from "./DirectorTypes";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AudioTrack {
  id: string;
  type: "voice" | "music" | "sfx" | "ambience";
  url: string;
  startTime: number;      // seconds
  duration?: number;      // seconds (optional, uses full length)
  volume: number;         // 0-1
  fadeIn?: number;        // seconds
  fadeOut?: number;       // seconds
  loop?: boolean;
}

export interface AudioMixConfig {
  voiceTrack: AudioTrack;
  musicTrack?: AudioTrack;
  ambienceTrack?: AudioTrack;
  sfxTracks: AudioTrack[];
  wordTimings: WordTiming[];
  musicPlan: MusicPlan;
  totalDuration: number;
}

export interface AudioMixResult {
  mixedAudioUrl: string;
  duration: number;
  tracks: AudioTrack[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUND LIBRARIES
// ═══════════════════════════════════════════════════════════════════════════════

// Premium royalty-free music by mood
export const MUSIC_LIBRARY: Record<string, Record<string, string>> = {
  epic: {
    orchestral: "/audio/music/epic-orchestral.mp3",
    electronic: "/audio/music/epic-electronic.mp3",
    cinematic: "/audio/music/epic-cinematic.mp3",
  },
  dramatic: {
    orchestral: "/audio/music/dramatic-strings.mp3",
    piano: "/audio/music/dramatic-piano.mp3",
    ambient: "/audio/music/dramatic-ambient.mp3",
  },
  inspirational: {
    orchestral: "/audio/music/inspirational-orchestra.mp3",
    piano: "/audio/music/inspirational-piano.mp3",
    ambient: "/audio/music/inspirational-ambient.mp3",
  },
  mysterious: {
    ambient: "/audio/music/mysterious-ambient.mp3",
    electronic: "/audio/music/mysterious-electronic.mp3",
  },
  dark: {
    ambient: "/audio/music/dark-ambient.mp3",
    electronic: "/audio/music/dark-electronic.mp3",
  },
  happy: {
    acoustic: "/audio/music/happy-acoustic.mp3",
    electronic: "/audio/music/happy-electronic.mp3",
  },
  sad: {
    piano: "/audio/music/sad-piano.mp3",
    strings: "/audio/music/sad-strings.mp3",
  },
  tense: {
    orchestral: "/audio/music/tense-orchestral.mp3",
    electronic: "/audio/music/tense-electronic.mp3",
  },
  peaceful: {
    ambient: "/audio/music/peaceful-ambient.mp3",
    piano: "/audio/music/peaceful-piano.mp3",
  },
  energetic: {
    electronic: "/audio/music/energetic-electronic.mp3",
    rock: "/audio/music/energetic-rock.mp3",
  },
};

// SFX library for impact moments
export const SFX_LIBRARY: Record<string, string> = {
  // Transitions
  whoosh: "/audio/sfx/whoosh.mp3",
  swoosh: "/audio/sfx/swoosh.mp3",

  // Impacts
  impact: "/audio/sfx/impact-deep.mp3",
  impact_soft: "/audio/sfx/impact-soft.mp3",
  boom: "/audio/sfx/boom.mp3",

  // Build/release
  rise: "/audio/sfx/riser.mp3",
  drop: "/audio/sfx/drop.mp3",

  // Accents
  sparkle: "/audio/sfx/sparkle.mp3",
  chime: "/audio/sfx/chime.mp3",
  ding: "/audio/sfx/ding.mp3",

  // Dramatic
  thunder: "/audio/sfx/thunder-distant.mp3",
  heartbeat: "/audio/sfx/heartbeat.mp3",
  breath: "/audio/sfx/breath-deep.mp3",
};

// Ambience library
export const AMBIENCE_LIBRARY: Record<string, string> = {
  room: "/audio/ambience/room-tone.mp3",
  outdoor: "/audio/ambience/outdoor-birds.mp3",
  rain: "/audio/ambience/rain-gentle.mp3",
  wind: "/audio/ambience/wind-light.mp3",
  crowd: "/audio/ambience/crowd-murmur.mp3",
  space: "/audio/ambience/space-ambient.mp3",
  fire: "/audio/ambience/fire-crackle.mp3",
  ocean: "/audio/ambience/ocean-waves.mp3",
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO POST SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class AudioPostService {
  /**
   * Select music track based on plan
   */
  selectMusic(plan: MusicPlan): string {
    const moodTracks = MUSIC_LIBRARY[plan.mood];
    if (!moodTracks) {
      return Object.values(MUSIC_LIBRARY.inspirational)[0];
    }

    // Try to match genre
    if (plan.genre && moodTracks[plan.genre]) {
      return moodTracks[plan.genre];
    }

    // Return first available for mood
    return Object.values(moodTracks)[0];
  }

  /**
   * Get SFX URL for event
   */
  getSFXUrl(event: SFXEvent): string {
    if (event.customUrl) return event.customUrl;
    return SFX_LIBRARY[event.type] || SFX_LIBRARY.impact;
  }

  /**
   * Get ambience URL
   */
  getAmbienceUrl(type: string): string {
    return AMBIENCE_LIBRARY[type] || AMBIENCE_LIBRARY.room;
  }

  /**
   * Create audio mix configuration
   * This defines all tracks and their timing
   */
  createMixConfig(
    voiceAudioUrl: string,
    voiceDuration: number,
    wordTimings: WordTiming[],
    musicPlan: MusicPlan,
    sfxEvents: SFXEvent[],
    ambienceType?: string
  ): AudioMixConfig {
    const totalDuration = voiceDuration + 1; // Add 1s buffer at end

    // Voice track (primary)
    const voiceTrack: AudioTrack = {
      id: "voice",
      type: "voice",
      url: voiceAudioUrl,
      startTime: 0,
      volume: 1.0,
    };

    // Music track (with ducking)
    const musicTrack: AudioTrack | undefined = musicPlan.customUrl || this.selectMusic(musicPlan)
      ? {
          id: "music",
          type: "music",
          url: musicPlan.customUrl || this.selectMusic(musicPlan),
          startTime: 0,
          volume: musicPlan.baseVolume,
          fadeIn: 0.5,
          fadeOut: 1.0,
          loop: true,
        }
      : undefined;

    // Ambience track
    const ambienceTrack: AudioTrack | undefined = ambienceType
      ? {
          id: "ambience",
          type: "ambience",
          url: this.getAmbienceUrl(ambienceType),
          startTime: 0,
          volume: 0.08,
          loop: true,
        }
      : undefined;

    // SFX tracks
    const sfxTracks: AudioTrack[] = sfxEvents.map((event, index) => ({
      id: `sfx_${index}`,
      type: "sfx",
      url: this.getSFXUrl(event),
      startTime: event.time,
      volume: event.volume,
      duration: event.duration,
    }));

    return {
      voiceTrack,
      musicTrack,
      ambienceTrack,
      sfxTracks,
      wordTimings,
      musicPlan,
      totalDuration,
    };
  }

  /**
   * Generate volume automation for music ducking
   * Returns an array of [time, volume] keyframes
   */
  generateDuckingAutomation(
    wordTimings: WordTiming[],
    musicPlan: MusicPlan,
    totalDuration: number,
    resolution: number = 0.05 // 50ms resolution
  ): Array<{ time: number; volume: number }> {
    const automation: Array<{ time: number; volume: number }> = [];

    for (let t = 0; t <= totalDuration; t += resolution) {
      const volume = getMusicVolumeAtTime(musicPlan, t, wordTimings);
      automation.push({ time: t, volume });
    }

    return automation;
  }

  /**
   * Generate ffmpeg filter complex for audio mixing
   * This would be used by the render service
   */
  generateFFmpegFilter(config: AudioMixConfig): string {
    const filters: string[] = [];
    let inputIndex = 0;

    // Voice input
    filters.push(`[${inputIndex}:a]volume=1.0[voice]`);
    inputIndex++;

    // Music with ducking (simplified - real ducking would use sidechaincompress)
    if (config.musicTrack) {
      filters.push(`[${inputIndex}:a]volume=${config.musicPlan.baseVolume}[music]`);
      inputIndex++;
    }

    // Ambience
    if (config.ambienceTrack) {
      filters.push(`[${inputIndex}:a]volume=0.08[ambience]`);
      inputIndex++;
    }

    // SFX tracks
    const sfxLabels: string[] = [];
    for (let i = 0; i < config.sfxTracks.length; i++) {
      const sfx = config.sfxTracks[i];
      filters.push(`[${inputIndex}:a]adelay=${sfx.startTime * 1000}|${sfx.startTime * 1000},volume=${sfx.volume}[sfx${i}]`);
      sfxLabels.push(`[sfx${i}]`);
      inputIndex++;
    }

    // Mix all tracks
    const mixInputs = ["[voice]"];
    if (config.musicTrack) mixInputs.push("[music]");
    if (config.ambienceTrack) mixInputs.push("[ambience]");
    mixInputs.push(...sfxLabels);

    filters.push(`${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=longest[out]`);

    return filters.join(";");
  }

  /**
   * Match SFX events to word timings
   * For "impact on key words" functionality
   */
  createSFXEventsFromEmphasis(
    emphasisWords: string[],
    wordTimings: WordTiming[],
    sfxType: string = "impact"
  ): SFXEvent[] {
    const events: SFXEvent[] = [];

    for (const emphasis of emphasisWords) {
      const timing = wordTimings.find(
        w => w.word.toLowerCase() === emphasis.toLowerCase()
      );

      if (timing) {
        events.push({
          type: sfxType as any,
          time: timing.start - 0.1, // Slightly before the word
          volume: 0.3,
          trigger: emphasis,
        });
      }
    }

    return events;
  }

  /**
   * Add intro/outro SFX
   */
  createIntroOutroSFX(duration: number): SFXEvent[] {
    return [
      // Intro whoosh
      {
        type: "whoosh",
        time: 0,
        volume: 0.25,
      },
      // Outro fade
      {
        type: "swoosh",
        time: duration - 0.5,
        volume: 0.2,
      },
    ];
  }
}

// Export singleton
export const audioPostService = new AudioPostService();
