"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AMBIENT SOUNDSCAPE SYSTEM — Atmospheric Audio for Living Personas
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Creates an immersive atmosphere with:
 * - Archetype-specific ambient sounds
 * - Dynamic volume based on persona state
 * - Smooth fade transitions
 * - Low-latency playback
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// AMBIENT SOUND MAPPING BY ARCHETYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Each archetype has a unique ambient soundscape that creates atmosphere.
 * These are royalty-free, generated/curated for each character type.
 *
 * For production: Replace with actual high-quality ambient tracks
 * For now: Uses placeholder paths that can be filled in later
 */
const AMBIENT_SOUNDSCAPES: Record<string, {
  url: string;
  description: string;
  volume: number;
  fadeInMs: number;
}> = {
  sage: {
    url: "/sounds/ambient/mystical-library.mp3",
    description: "Ancient library with distant chimes and soft wind",
    volume: 0.15,
    fadeInMs: 2000,
  },
  hero: {
    url: "/sounds/ambient/epic-horizon.mp3",
    description: "Sweeping winds on a mountain peak, distant drums",
    volume: 0.12,
    fadeInMs: 1500,
  },
  creator: {
    url: "/sounds/ambient/creative-workshop.mp3",
    description: "Soft mechanical sounds, creative energy hum",
    volume: 0.1,
    fadeInMs: 1500,
  },
  caregiver: {
    url: "/sounds/ambient/peaceful-garden.mp3",
    description: "Birds, gentle water, rustling leaves",
    volume: 0.12,
    fadeInMs: 2000,
  },
  ruler: {
    url: "/sounds/ambient/throne-grandeur.mp3",
    description: "Grand hall ambience, distant footsteps, authority",
    volume: 0.1,
    fadeInMs: 1500,
  },
  jester: {
    url: "/sounds/ambient/playful-carnival.mp3",
    description: "Light carnival music, distant laughter",
    volume: 0.08,
    fadeInMs: 1000,
  },
  rebel: {
    url: "/sounds/ambient/urban-underground.mp3",
    description: "Urban night sounds, distant bass, rebellion",
    volume: 0.1,
    fadeInMs: 1500,
  },
  lover: {
    url: "/sounds/ambient/romantic-evening.mp3",
    description: "Soft jazz undertones, candlelight ambience",
    volume: 0.1,
    fadeInMs: 2000,
  },
  explorer: {
    url: "/sounds/ambient/wilderness-discovery.mp3",
    description: "Nature sounds, wind, distant wildlife",
    volume: 0.12,
    fadeInMs: 1500,
  },
  innocent: {
    url: "/sounds/ambient/morning-wonder.mp3",
    description: "Birdsong, gentle morning light feel",
    volume: 0.1,
    fadeInMs: 2000,
  },
  magician: {
    url: "/sounds/ambient/mystical-energy.mp3",
    description: "Ethereal tones, magical resonance",
    volume: 0.12,
    fadeInMs: 2000,
  },
  outlaw: {
    url: "/sounds/ambient/desert-dusk.mp3",
    description: "Lonely wind, distant coyote, tension",
    volume: 0.1,
    fadeInMs: 1500,
  },
  default: {
    url: "/sounds/ambient/neutral-presence.mp3",
    description: "Soft, neutral ambient tone",
    volume: 0.08,
    fadeInMs: 2000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseAmbientSoundOptions {
  archetype?: string;
  enabled?: boolean;
  volume?: number; // Override default volume (0-1)
}

export interface UseAmbientSoundReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  setVolume: (volume: number) => void;
  fadeOut: (durationMs?: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAmbientSound({
  archetype = "default",
  enabled = true,
  volume: customVolume,
}: UseAmbientSoundOptions = {}): UseAmbientSoundReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get soundscape config for archetype
  const soundscape = AMBIENT_SOUNDSCAPES[archetype.toLowerCase()] || AMBIENT_SOUNDSCAPES.default;
  const targetVolume = customVolume ?? soundscape.volume;

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZE AUDIO
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0; // Start silent for fade-in
    audio.preload = "auto";

    audioRef.current = audio;

    // Load the audio
    setIsLoading(true);
    audio.src = soundscape.url;

    audio.oncanplaythrough = () => {
      setIsLoading(false);
      console.log(`[AmbientSound] Loaded: ${archetype} (${soundscape.description})`);
    };

    audio.onerror = () => {
      setIsLoading(false);
      // Don't treat as error - ambient sound is optional
      console.log(`[AmbientSound] Not available for ${archetype} - continuing without ambient sound`);
    };

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      audio.pause();
      audio.src = "";
    };
  }, [archetype, enabled, soundscape.url, soundscape.description]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAY WITH FADE-IN
  // ─────────────────────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    // Clear any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    // Start playing (muted)
    audio.volume = 0;
    audio.play().catch((err) => {
      // Autoplay blocked - need user interaction first
      console.log("[AmbientSound] Autoplay blocked, will play on user interaction");
    });

    // Fade in
    const steps = 20;
    const stepMs = soundscape.fadeInMs / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
      }
    }, stepMs);

    setIsPlaying(true);
    console.log(`[AmbientSound] Playing: ${archetype}`);
  }, [enabled, archetype, soundscape.fadeInMs, targetVolume]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PAUSE
  // ─────────────────────────────────────────────────────────────────────────────

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audio.pause();
    setIsPlaying(false);
    console.log(`[AmbientSound] Paused: ${archetype}`);
  }, [archetype]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FADE OUT
  // ─────────────────────────────────────────────────────────────────────────────

  const fadeOut = useCallback((durationMs = 1000) => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 20;
    const stepMs = durationMs / steps;
    const currentVolume = audio.volume;
    const volumeStep = currentVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(currentVolume - volumeStep * currentStep, 0);

      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
        audio.pause();
        setIsPlaying(false);
      }
    }, stepMs);

    console.log(`[AmbientSound] Fading out: ${archetype}`);
  }, [isPlaying, archetype]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SET VOLUME
  // ─────────────────────────────────────────────────────────────────────────────

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = Math.max(0, Math.min(1, volume));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-PLAY ON MOUNT (if enabled)
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (enabled && !isPlaying && !isLoading) {
      // Small delay to ensure audio is loaded
      const timer = setTimeout(() => {
        play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [enabled, isPlaying, isLoading, play]);

  return {
    isPlaying,
    isLoading,
    error,
    play,
    pause,
    setVolume,
    fadeOut,
  };
}

export default useAmbientSound;
