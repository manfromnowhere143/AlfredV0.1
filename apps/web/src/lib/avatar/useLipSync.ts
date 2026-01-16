"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REAL-TIME LIP SYNC - Audio-driven mouth animation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Analyzes audio in real-time (20-40ms frames) and drives lip-sync.
 * Uses amplitude analysis + frequency bands for viseme estimation.
 *
 * Target latency: < 40ms per frame
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useEffect } from 'react';
import { useAvatarStore, Viseme } from './store';

interface LipSyncConfig {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

const DEFAULT_CONFIG: LipSyncConfig = {
  fftSize: 256,
  smoothingTimeConstant: 0.3,
  minDecibels: -90,
  maxDecibels: -10,
};

// Frequency ranges for phoneme estimation
const FREQ_BANDS = {
  bass: { min: 20, max: 250 },      // m, b, p sounds
  lowMid: { min: 250, max: 500 },   // vowels foundation
  mid: { min: 500, max: 2000 },     // vowel formants
  highMid: { min: 2000, max: 4000 }, // s, f, th sounds
  high: { min: 4000, max: 8000 },   // sibilants
};

export function useLipSync(config: LipSyncConfig = {}) {
  const { fftSize, smoothingTimeConstant, minDecibels, maxDecibels } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const setAudioAmplitude = useAvatarStore((state) => state.setAudioAmplitude);
  const setViseme = useAvatarStore((state) => state.setViseme);
  const setAudioContextState = useAvatarStore((state) => state.setAudioContextState);
  const setAnalyserConnected = useAvatarStore((state) => state.setAnalyserConnected);

  // Get frequency band energy
  const getBandEnergy = useCallback((
    dataArray: Uint8Array,
    sampleRate: number,
    band: { min: number; max: number }
  ): number => {
    const binSize = sampleRate / (fftSize! * 2);
    const minBin = Math.floor(band.min / binSize);
    const maxBin = Math.ceil(band.max / binSize);

    let sum = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin && i < dataArray.length; i++) {
      sum += dataArray[i];
      count++;
    }

    return count > 0 ? sum / count / 255 : 0;
  }, [fftSize]);

  // Estimate viseme from frequency analysis
  const estimateViseme = useCallback((
    dataArray: Uint8Array,
    sampleRate: number
  ): { viseme: Viseme; weight: number } => {
    const bass = getBandEnergy(dataArray, sampleRate, FREQ_BANDS.bass);
    const lowMid = getBandEnergy(dataArray, sampleRate, FREQ_BANDS.lowMid);
    const mid = getBandEnergy(dataArray, sampleRate, FREQ_BANDS.mid);
    const highMid = getBandEnergy(dataArray, sampleRate, FREQ_BANDS.highMid);
    const high = getBandEnergy(dataArray, sampleRate, FREQ_BANDS.high);

    const total = bass + lowMid + mid + highMid + high;

    if (total < 0.05) {
      return { viseme: 'sil', weight: 0 };
    }

    // Normalize
    const weight = Math.min(1, total * 2);

    // Heuristic viseme estimation based on frequency profile
    if (high > 0.4 && highMid > 0.3) {
      // Sibilants: s, z, sh
      return { viseme: 'SS', weight };
    }
    if (highMid > 0.35 && mid < 0.3) {
      // Fricatives: f, v
      return { viseme: 'FF', weight };
    }
    if (bass > 0.5 && mid < 0.2) {
      // Bilabials: p, b, m
      return { viseme: 'PP', weight };
    }
    if (mid > 0.5 && lowMid > 0.4) {
      // Open vowel: a
      return { viseme: 'aa', weight };
    }
    if (mid > 0.4 && highMid > 0.3) {
      // Front vowel: e, i
      return { viseme: lowMid > 0.3 ? 'E' : 'I', weight };
    }
    if (lowMid > 0.5 && bass > 0.3) {
      // Back vowel: o, u
      return { viseme: bass > 0.4 ? 'O' : 'U', weight };
    }
    if (mid > 0.3) {
      // Default speaking
      return { viseme: 'aa', weight: weight * 0.7 };
    }

    return { viseme: 'sil', weight: 0 };
  }, [getBandEnergy]);

  // Main analysis loop
  const analyze = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !audioContextRef.current) {
      return;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate overall amplitude
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const amplitude = sum / dataArrayRef.current.length / 255;

    // Set amplitude for jaw movement
    setAudioAmplitude(amplitude);

    // Log amplitude every ~60 frames when speaking
    if (amplitude > 0.05 && Math.random() < 0.02) {
      console.log('[LipSync] Amplitude:', amplitude.toFixed(3));
    }

    // Estimate viseme
    const { viseme, weight } = estimateViseme(
      dataArrayRef.current,
      audioContextRef.current.sampleRate
    );
    setViseme(viseme, weight);

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [setAudioAmplitude, setViseme, estimateViseme]);

  // Connect to audio element
  const connectToAudio = useCallback(async (audioElement: HTMLAudioElement): Promise<void> => {
    console.log('[LipSync] connectToAudio called');

    // Cleanup previous
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.log('[LipSync] Previous source cleanup:', e);
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Create or reuse audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      console.log('[LipSync] Created new AudioContext, state:', audioContextRef.current.state);
    }

    // Update store with current state
    setAudioContextState(audioContextRef.current.state as 'running' | 'suspended' | 'closed');

    // Resume if suspended - AWAIT this!
    if (audioContextRef.current.state === 'suspended') {
      console.log('[LipSync] AudioContext suspended, attempting resume...');
      try {
        await audioContextRef.current.resume();
        console.log('[LipSync] ✅ AudioContext resumed, state:', audioContextRef.current.state);
      } catch (resumeError) {
        console.error('[LipSync] ❌ AudioContext resume FAILED:', resumeError);
        console.error('[LipSync] Audio will NOT play - user interaction required');
      }
      setAudioContextState(audioContextRef.current.state as 'running' | 'suspended' | 'closed');
    }

    console.log('[LipSync] AudioContext final state:', audioContextRef.current.state);

    // Create analyser
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = fftSize!;
    analyser.smoothingTimeConstant = smoothingTimeConstant!;
    analyser.minDecibels = minDecibels!;
    analyser.maxDecibels = maxDecibels!;
    analyserRef.current = analyser;

    // Create data array
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    try {
      // Connect audio element
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      sourceRef.current = source;
      setAnalyserConnected(true);
      console.log('[LipSync] ✅ Audio source connected successfully');
      console.log('[LipSync] AudioContext state:', audioContextRef.current.state);
      console.log('[LipSync] Analyser FFT size:', analyser.fftSize);
    } catch (e) {
      console.error('[LipSync] ❌ FAILED to connect audio source:', e);
      console.error('[LipSync] This means lip-sync will NOT work - audio will play but mouth won\'t move');
      console.error('[LipSync] Common cause: Audio element already has a MediaElementSource node');
      console.error('[LipSync] AudioContext state:', audioContextRef.current.state);
      setAnalyserConnected(false);

      // Still try to play without lip-sync
      console.warn('[LipSync] Will try to play audio anyway (without lip-sync)');
    }

    // Start analysis loop
    analyze();

    console.log('[LipSync] Connected to audio element, analysis loop started');
  }, [fftSize, smoothingTimeConstant, minDecibels, maxDecibels, analyze, setAudioContextState, setAnalyserConnected]);

  // Connect to audio stream (for streaming TTS)
  const connectToStream = useCallback((stream: MediaStream) => {
    // Cleanup previous
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Create or reuse audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Resume if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Create analyser
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = fftSize!;
    analyser.smoothingTimeConstant = smoothingTimeConstant!;
    analyser.minDecibels = minDecibels!;
    analyser.maxDecibels = maxDecibels!;
    analyserRef.current = analyser;

    // Create data array
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    // Connect stream
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyser);
    // Note: don't connect to destination for input streams
    sourceRef.current = source;
    setAnalyserConnected(true);

    // Update AudioContext state
    setAudioContextState(audioContextRef.current.state as 'running' | 'suspended' | 'closed');

    // Start analysis loop
    analyze();

    console.log('[LipSync] Connected to audio stream');
  }, [fftSize, smoothingTimeConstant, minDecibels, maxDecibels, analyze, setAudioContextState, setAnalyserConnected]);

  // Connect to raw audio data (base64 or ArrayBuffer)
  const connectToAudioData = useCallback(async (audioData: string | ArrayBuffer) => {
    console.log('[LipSync] connectToAudioData called with', typeof audioData === 'string' ? 'base64 string' : 'ArrayBuffer');

    // Create audio element
    const audio = new Audio();

    if (typeof audioData === 'string') {
      // Base64 data URL - use the data as-is if it already has the data: prefix
      // ElevenLabs returns audio/mpeg format
      audio.src = audioData.startsWith('data:') ? audioData : `data:audio/mpeg;base64,${audioData}`;
      console.log('[LipSync] Audio src set, length:', audioData.length, 'starts with data:', audioData.startsWith('data:'));
    } else {
      // ArrayBuffer
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      audio.src = URL.createObjectURL(blob);
      console.log('[LipSync] Audio blob created from ArrayBuffer');
    }

    // Wait for loadedmetadata
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
        console.log('[LipSync] Audio metadata loaded, duration:', audio.duration);
        resolve();
      }, { once: true });
      audio.addEventListener('error', (e) => {
        console.error('[LipSync] Audio load error:', e);
        reject(e);
      }, { once: true });
      audio.load();
    });

    // CRITICAL: Connect audio BEFORE playing (await this!)
    await connectToAudio(audio);

    // Auto-play - must happen AFTER AudioContext is connected and running
    console.log('[LipSync] Attempting audio.play()...');
    try {
      await audio.play();
      console.log('[LipSync] ✅ Audio playback STARTED successfully');
    } catch (e) {
      console.error('[LipSync] ❌ Autoplay blocked:', e);
      console.error('[LipSync] User must interact with page first (click, tap, etc)');
      console.error('[LipSync] Try: Click anywhere on the page, then send message again');
    }

    return audio;
  }, [connectToAudio]);

  // Pre-warm AudioContext (call this on user interaction)
  const warmUp = useCallback(async (): Promise<boolean> => {
    console.log('[LipSync] warmUp called - ensuring AudioContext is ready');

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      console.log('[LipSync] Created new AudioContext during warmUp, state:', audioContextRef.current.state);
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('[LipSync] ✅ AudioContext warmed up successfully, state:', audioContextRef.current.state);
        setAudioContextState('running');
        return true;
      } catch (e) {
        console.error('[LipSync] ❌ warmUp failed:', e);
        return false;
      }
    }

    console.log('[LipSync] AudioContext already running');
    setAudioContextState(audioContextRef.current.state as 'running' | 'suspended' | 'closed');
    return audioContextRef.current.state === 'running';
  }, [setAudioContextState]);

  // Stop analysis
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAudioAmplitude(0);
    setViseme('sil', 0);
    setAnalyserConnected(false);

    console.log('[LipSync] Stopped');
  }, [setAudioAmplitude, setViseme, setAnalyserConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stop]);

  return {
    connectToAudio,
    connectToStream,
    connectToAudioData,
    warmUp,
    stop,
  };
}

export default useLipSync;
