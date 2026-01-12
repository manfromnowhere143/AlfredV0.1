"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STREAMING TTS - Pixar-Quality Voice with Emotion Curves
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art text-to-speech with:
 * - Low-latency streaming playback (<500ms to first audio)
 * - Emotion curves that drive facial animation throughout speech
 * - Real-time amplitude monitoring for lip sync
 * - Smooth state transitions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useState } from 'react';
import { useAvatarStore, type Emotion, type EmotionCurvePoint } from './store';
import { useLipSync } from './useLipSync';
import { VoiceDirector } from './VoiceDirector';

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

/**
 * Generate emotion curve for speech duration
 * Creates natural emotion arc: build → sustain → fade
 */
function generateEmotionCurve(
  emotion: Emotion,
  intensity: number,
  durationMs: number
): EmotionCurvePoint[] {
  // Convert duration to seconds for the curve
  const durationSec = durationMs / 1000;

  return [
    { time: 0.0, emotion, intensity: intensity * 0.6 },     // Start building
    { time: 0.1, emotion, intensity: intensity * 0.9 },     // Quick ramp
    { time: 0.2, emotion, intensity: intensity * 1.0 },     // Peak
    { time: 0.6, emotion, intensity: intensity * 0.95 },    // Sustain
    { time: 0.85, emotion, intensity: intensity * 0.7 },    // Begin fade
    { time: 0.95, emotion, intensity: intensity * 0.4 },    // Fade
    { time: 1.0, emotion: 'neutral', intensity: 0.2 },      // Return to neutral
  ];
}

/**
 * Detect emotion from text content
 */
function detectEmotionFromText(text: string): { emotion: Emotion; intensity: number } {
  const lower = text.toLowerCase();

  // Happy indicators
  if (/\b(happy|joy|wonderful|amazing|love|great|fantastic|excited|yay|haha|delighted|thrilled)\b/.test(lower)) {
    return { emotion: 'happy', intensity: 0.75 };
  }

  // Sad indicators
  if (/\b(sad|sorry|unfortunately|regret|miss|lonely|cry|tears|heartbroken)\b/.test(lower)) {
    return { emotion: 'sad', intensity: 0.65 };
  }

  // Curious indicators
  if (/\?|curious|wonder|interesting|hmm|what if|tell me|how|why|fascinating/.test(lower)) {
    return { emotion: 'curious', intensity: 0.6 };
  }

  // Surprised indicators
  if (/\b(wow|oh|really|amazing|incredible|can't believe|astonishing)\b|!{2,}/.test(lower)) {
    return { emotion: 'surprised', intensity: 0.7 };
  }

  // Playful indicators
  if (/\b(hehe|haha|joke|fun|play|silly|tease|wink|kidding)\b/.test(lower)) {
    return { emotion: 'playful', intensity: 0.65 };
  }

  // Concerned indicators
  if (/\b(worried|concern|careful|warning|danger|problem|issue|afraid)\b/.test(lower)) {
    return { emotion: 'concerned', intensity: 0.6 };
  }

  // Confident indicators
  if (/\b(absolutely|certainly|definitely|sure|confident|trust me|of course|guaranteed)\b/.test(lower)) {
    return { emotion: 'confident', intensity: 0.65 };
  }

  // Focused indicators
  if (/\b(focus|important|listen|attention|note|remember|key|crucial)\b/.test(lower)) {
    return { emotion: 'focused', intensity: 0.55 };
  }

  // Angry indicators (rare but should handle)
  if (/\b(angry|furious|outraged|unacceptable|terrible|awful)\b/.test(lower)) {
    return { emotion: 'angry', intensity: 0.6 };
  }

  // Default neutral with slight warmth
  return { emotion: 'neutral', intensity: 0.4 };
}

/**
 * Estimate speech duration from text
 * Average speaking rate: ~150 words per minute
 */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  return (words / wordsPerMinute) * 60 * 1000; // ms
}

export function useStreamingTTS(config: StreamingTTSConfig = {}) {
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get avatar store actions
  const setState = useAvatarStore((s) => s.setState);
  const setAudioAmplitude = useAvatarStore((s) => s.setAudioAmplitude);
  const setEmotion = useAvatarStore((s) => s.setEmotion);
  const setEmotionCurve = useAvatarStore((s) => s.setEmotionCurve);
  const setEnergy = useAvatarStore((s) => s.setEnergy);

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
      setEmotion('neutral', 0.3, 0.05); // Smooth return to neutral
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
  }, [getAudioContext, setState, setAudioAmplitude, setEmotion]);

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

    // Detect emotion and set up emotion curve
    const detectedEmotion = emotion as Emotion || detectEmotionFromText(text).emotion;
    const { intensity } = detectEmotionFromText(text);
    const duration = estimateDuration(text);

    // Set emotion with smooth transition
    setEmotion(detectedEmotion, intensity, 0.1);
    setEnergy(intensity);

    // Generate and apply emotion curve for the speech duration
    const curve = generateEmotionCurve(detectedEmotion, intensity, duration);
    setEmotionCurve(curve);

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
              style: detectedEmotion === 'happy' ? 0.7 : detectedEmotion === 'sad' ? 0.3 : 0.5,
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
      setEmotion('neutral', 0.3, 0.05);
    }
  }, [addChunk, setState, setEmotion, setEmotionCurve, setEnergy]);

  // Non-streaming speak (for when streaming isn't available)
  const speakNonStreaming = useCallback(async (
    personaId: string,
    text: string,
    emotion?: string
  ) => {
    console.log('[StreamingTTS] speakNonStreaming called for:', personaId);

    // Detect emotion and set up emotion curve
    const detectedEmotion = (emotion as Emotion) || detectEmotionFromText(text).emotion;
    const { intensity } = detectEmotionFromText(text);
    const duration = estimateDuration(text);

    // Set emotion with smooth transition
    setEmotion(detectedEmotion, intensity, 0.08);
    setEnergy(intensity);

    // Generate and apply emotion curve
    const curve = generateEmotionCurve(detectedEmotion, intensity, duration);
    setEmotionCurve(curve);

    console.log('[StreamingTTS] Emotion:', detectedEmotion, 'Intensity:', intensity);

    setIsGenerating(true);
    setState('speaking');

    try {
      console.log('[StreamingTTS] Fetching speech...');
      const response = await fetch(`/api/personas/${personaId}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emotion: detectedEmotion }),
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

        // Create audio element
        const audio = new Audio();
        audio.src = data.audio;
        audio.volume = 1.0;
        currentAudioRef.current = audio;

        // Set up amplitude monitoring
        let amplitudeInterval: NodeJS.Timeout | null = null;
        let speechStartTime = 0;

        audio.onplay = () => {
          console.log('[StreamingTTS] ▶️ AUDIO PLAYING!');
          setIsPlaying(true);
          setState('speaking');
          speechStartTime = Date.now();

          // Amplitude simulation with natural variation
          let phase = 0;
          amplitudeInterval = setInterval(() => {
            phase += 0.25;
            // More natural amplitude curve with breath patterns
            const breathCycle = Math.sin(phase * 0.5) * 0.1;
            const speechPattern = Math.sin(phase * 2.5) * 0.15;
            const randomVariation = (Math.random() - 0.5) * 0.2;
            const baseAmplitude = 0.35;

            const amplitude = Math.max(0, Math.min(1,
              baseAmplitude + breathCycle + speechPattern + randomVariation
            ));
            setAudioAmplitude(amplitude);
          }, 40); // 25fps for smooth animation
        };

        audio.onended = () => {
          console.log('[StreamingTTS] ⏹️ Audio ended');
          if (amplitudeInterval) clearInterval(amplitudeInterval);
          setAudioAmplitude(0);
          setState('idle');
          setIsPlaying(false);
          setEmotion('neutral', 0.3, 0.05); // Smooth return to neutral
          currentAudioRef.current = null;
        };

        audio.onerror = (e) => {
          console.error('[StreamingTTS] ❌ Audio error:', e);
          if (amplitudeInterval) clearInterval(amplitudeInterval);
          setAudioAmplitude(0);
          setState('idle');
          setIsPlaying(false);
          setEmotion('neutral', 0.3, 0.05);
          currentAudioRef.current = null;
        };

        // Try to play
        console.log('[StreamingTTS] Attempting to play audio...');
        try {
          await audio.play();
          console.log('[StreamingTTS] ✅ audio.play() succeeded');
        } catch (playError: any) {
          console.error('[StreamingTTS] ❌ audio.play() failed:', playError.message);
          if (playError.name === 'NotAllowedError') {
            console.log('[StreamingTTS] Autoplay blocked - waiting for user gesture');
          }
          setIsGenerating(false);
          setState('idle');
          setEmotion('neutral', 0.3, 0.05);
        }

        return audio;
      } else {
        console.log('[StreamingTTS] ⚠️ No audio in response. Voice may not be configured.');
        console.log('[StreamingTTS] Response data:', data);
        setIsGenerating(false);
        setState('idle');
        setEmotion('neutral', 0.3, 0.05);
      }
    } catch (err) {
      console.error('[StreamingTTS] Non-streaming error:', err);
      setIsGenerating(false);
      setState('idle');
      setEmotion('neutral', 0.3, 0.05);
    }

    return null;
  }, [setState, setAudioAmplitude, setEmotion, setEmotionCurve, setEnergy]);

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

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    stopLipSync();
    setIsPlaying(false);
    setIsGenerating(false);
    setState('idle');
    setAudioAmplitude(0);
    setEmotion('neutral', 0.3, 0.05);
  }, [stopLipSync, setState, setAudioAmplitude, setEmotion]);

  return {
    speak,
    speakNonStreaming,
    stop,
    isGenerating,
    isPlaying,
  };
}

export default useStreamingTTS;
