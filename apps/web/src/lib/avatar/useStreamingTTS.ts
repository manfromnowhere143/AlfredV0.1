"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STREAMING TTS - Low-latency text-to-speech with immediate playback
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Starts playing audio as soon as first chunks arrive.
 * Target: < 500ms to first audio
 *
 * Supports:
 * - ElevenLabs streaming API
 * - Chunked audio playback
 * - Real-time lip-sync integration
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useState } from 'react';
import { useAvatarStore } from './store';
import { useLipSync } from './useLipSync';

interface StreamingTTSConfig {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

const DEFAULT_CONFIG: StreamingTTSConfig = {
  modelId: 'eleven_turbo_v2',
  stability: 0.5,
  similarityBoost: 0.75,
};

export function useStreamingTTS(config: StreamingTTSConfig = {}) {
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const setState = useAvatarStore((s) => s.setState);
  const setAudioAmplitude = useAvatarStore((s) => s.setAudioAmplitude);

  const { connectToAudio, stop: stopLipSync } = useLipSync();

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play next chunk from queue
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setState('idle');
      setAudioAmplitude(0);
      return;
    }

    const audioContext = getAudioContext();
    const buffer = audioQueueRef.current.shift()!;

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    // Create analyser for amplitude
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    currentSourceRef.current = source;

    // Amplitude monitoring
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const monitorAmplitude = () => {
      if (!isPlayingRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const amplitude = sum / dataArray.length / 255;
      setAudioAmplitude(amplitude);
      requestAnimationFrame(monitorAmplitude);
    };

    source.onended = () => {
      playNextChunk();
    };

    source.start();
    monitorAmplitude();
  }, [getAudioContext, setState, setAudioAmplitude]);

  // Add audio chunk to queue
  const addChunk = useCallback(async (arrayBuffer: ArrayBuffer) => {
    const audioContext = getAudioContext();

    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      audioQueueRef.current.push(audioBuffer);

      // Start playing if not already
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setState('speaking');
        playNextChunk();
      }
    } catch (err) {
      console.error('[StreamingTTS] Failed to decode audio chunk:', err);
    }
  }, [getAudioContext, playNextChunk, setState]);

  // Speak text using ElevenLabs streaming API
  const speak = useCallback(async (
    text: string,
    voiceId?: string,
    emotion?: string
  ) => {
    const { modelId, stability, similarityBoost } = configRef.current;
    const voice = voiceId || configRef.current.voiceId;

    if (!voice) {
      console.error('[StreamingTTS] No voice ID provided');
      return;
    }

    setIsGenerating(true);
    setState('speaking');

    // Clear queue
    audioQueueRef.current = [];

    try {
      // ElevenLabs streaming endpoint
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style: emotion === 'happy' ? 0.7 : emotion === 'sad' ? 0.3 : 0.5,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          chunks.push(value);

          // Process in larger chunks for better audio quality
          const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
          if (totalLength > 8192) {
            // Merge chunks
            const merged = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            chunks.length = 0;

            // Add to playback queue
            await addChunk(merged.buffer);
          }
        }
      }

      // Process remaining chunks
      if (chunks.length > 0) {
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        await addChunk(merged.buffer);
      }

      setIsGenerating(false);
    } catch (err) {
      console.error('[StreamingTTS] Error:', err);
      setIsGenerating(false);
      setState('idle');
    }
  }, [addChunk, setState]);

  // Non-streaming speak (for when streaming isn't available)
  const speakNonStreaming = useCallback(async (
    personaId: string,
    text: string,
    emotion?: string
  ) => {
    console.log('[StreamingTTS] speakNonStreaming called for:', personaId);
    setIsGenerating(true);
    setState('speaking');

    try {
      console.log('[StreamingTTS] Fetching speech...');
      const response = await fetch(`/api/personas/${personaId}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emotion }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StreamingTTS] API error:', response.status, errorText);
        throw new Error('Speech generation failed');
      }

      const data = await response.json();
      console.log('[StreamingTTS] Response received, has audio:', !!data.audio);

      if (data.audio) {
        console.log('[StreamingTTS] Got audio data, length:', data.audio.length);
        setIsGenerating(false);

        // Create audio element - SIMPLE approach first
        const audio = new Audio();
        audio.src = data.audio;
        audio.volume = 1.0;

        // Set up amplitude monitoring without complex AudioContext
        // Just use a simple interval-based approach
        let amplitudeInterval: NodeJS.Timeout | null = null;

        audio.onplay = () => {
          console.log('[StreamingTTS] ▶️ AUDIO PLAYING!');
          setIsPlaying(true);
          setState('speaking');

          // Simple amplitude simulation based on time
          let phase = 0;
          amplitudeInterval = setInterval(() => {
            // Generate pseudo-random amplitude for lip movement
            phase += 0.3;
            const amplitude = 0.3 + Math.sin(phase * 2) * 0.2 + Math.random() * 0.3;
            setAudioAmplitude(amplitude);
          }, 50);
        };

        audio.onended = () => {
          console.log('[StreamingTTS] ⏹️ Audio ended');
          if (amplitudeInterval) clearInterval(amplitudeInterval);
          setAudioAmplitude(0);
          setState('idle');
          setIsPlaying(false);
        };

        audio.onerror = (e) => {
          console.error('[StreamingTTS] ❌ Audio error:', e);
          if (amplitudeInterval) clearInterval(amplitudeInterval);
          setAudioAmplitude(0);
          setState('idle');
          setIsPlaying(false);
        };

        // Try to play
        console.log('[StreamingTTS] Attempting to play audio...');
        try {
          await audio.play();
          console.log('[StreamingTTS] ✅ audio.play() succeeded');
        } catch (playError: any) {
          console.error('[StreamingTTS] ❌ audio.play() failed:', playError.message);
          // If autoplay blocked, try with user interaction context
          if (playError.name === 'NotAllowedError') {
            console.log('[StreamingTTS] Autoplay blocked - waiting for user gesture');
          }
          setIsGenerating(false);
          setState('idle');
        }

        return audio;
      } else {
        console.log('[StreamingTTS] ⚠️ No audio in response. Voice may not be configured.');
        console.log('[StreamingTTS] Response data:', data);
        setIsGenerating(false);
        setState('idle');
      }
    } catch (err) {
      console.error('[StreamingTTS] Non-streaming error:', err);
      setIsGenerating(false);
      setState('idle');
    }

    return null;
  }, [setState, setAudioAmplitude]);

  // Stop playback
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    audioQueueRef.current = [];

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      currentSourceRef.current = null;
    }

    stopLipSync();
    setIsPlaying(false);
    setIsGenerating(false);
    setState('idle');
    setAudioAmplitude(0);
  }, [stopLipSync, setState, setAudioAmplitude]);

  return {
    speak,
    speakNonStreaming,
    stop,
    isGenerating,
    isPlaying,
  };
}

export default useStreamingTTS;
