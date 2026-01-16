"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDEO PERSONA — REAL Living Digital Being from H100 GPUs
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO CSS TRICKS. REAL VIDEO ONLY.
 *
 * - Real idle video loop from RunPod MuseTalk H100
 * - Real lip-sync video when speaking
 * - Instant audio playback while video generates
 * - Video swap when ready
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PersonaState = "idle" | "listening" | "thinking" | "speaking";
export type EmotionState = "neutral" | "happy" | "sad" | "angry" | "surprised" | "excited" | "thoughtful" | "confident" | "curious" | "amused" | "concerned" | "calm";

export interface VideoPersonaProps {
  personaId: string;
  imageUrl?: string;
  name: string;
  state: PersonaState;
  emotion?: EmotionState;
  audioData?: string;
  audioContext?: AudioContext; // Pass pre-unlocked AudioContext from parent
  onVideoReady?: () => void;
  onVideoEnd?: () => void;
  onError?: (error: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO PERSONA COMPONENT — REAL VIDEO ONLY
// ═══════════════════════════════════════════════════════════════════════════════

export function VideoPersona({
  personaId,
  imageUrl,
  name,
  state,
  emotion = "neutral",
  audioData,
  audioContext: externalAudioContext,
  onVideoReady,
  onVideoEnd,
  onError,
}: VideoPersonaProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────

  // Idle video (real video loop)
  const [idleVideoUrl, setIdleVideoUrl] = useState<string | null>(null);
  const [isLoadingIdle, setIsLoadingIdle] = useState(true);
  const [idleJobId, setIdleJobId] = useState<string | null>(null);

  // Speaking video (real lip-sync)
  const [speakingVideoUrl, setSpeakingVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [speakingJobId, setSpeakingJobId] = useState<string | null>(null);

  // Audio playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Track active speaking session - stays true until video finishes (not just audio)
  const [isSpeakingSession, setIsSpeakingSession] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  // Refs
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const speakingVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAudioDataRef = useRef<string | null>(null);
  const hasFetchedIdleRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // IDLE VIDEO — Real video from H100 GPUs
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!personaId) return;
    if (hasFetchedIdleRef.current) return;
    hasFetchedIdleRef.current = true;

    const fetchIdleVideo = async () => {
      setIsLoadingIdle(true);
      setStatusMessage("Checking for idle video...");

      try {
        // Check status (Quick Check mode - skip DB for fast cache lookup)
        const response = await fetch(`/api/personas/${personaId}/idle-video`, {
          headers: {
            "X-Quick-Check": "true"
          }
        });
        const data = await response.json();

        console.log(`[VideoPersona] Idle status:`, data.status, data.source || "");

        if (data.status === "ready" && data.videoUrl) {
          console.log(`[VideoPersona] REAL idle video ready!`);
          setIdleVideoUrl(data.videoUrl);
          setIsLoadingIdle(false);
          setStatusMessage("Live");
          return;
        }

        if (data.status === "processing") {
          setIdleJobId(data.jobId);
          setStatusMessage("Generating idle video on GPU...");
          startPolling();
          return;
        }

        // Start generation
        if (data.status === "not_started") {
          setStatusMessage("Starting GPU video generation...");

          const genResponse = await fetch(`/api/personas/${personaId}/idle-video`, {
            method: "POST",
          });
          const genData = await genResponse.json();

          if (genData.status === "ready" && genData.videoUrl) {
            setIdleVideoUrl(genData.videoUrl);
            setIsLoadingIdle(false);
            setStatusMessage("Live");
            return;
          }

          if (genData.status === "processing") {
            setIdleJobId(genData.jobId);
            setStatusMessage(`Rendering on ${genData.source === "runpod" ? "H100 GPU" : "cloud"}...`);
            startPolling();
            return;
          }

          if (genData.status === "throttled") {
            setStatusMessage("Rate limited, retrying...");
            setTimeout(fetchIdleVideo, (genData.retryAfterMs || 10000) + 1000);
            return;
          }

          // Failed or not configured
          setStatusMessage(genData.error || "Video generation unavailable");
          setIsLoadingIdle(false);
        }
      } catch (err) {
        console.error("[VideoPersona] Idle video error:", err);
        setStatusMessage("Video unavailable");
        setIsLoadingIdle(false);
      }
    };

    const startPolling = () => {
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Quick Check mode - polls memory cache, no DB hit
          const resp = await fetch(`/api/personas/${personaId}/idle-video`, {
            headers: {
              "X-Quick-Check": "true"
            }
          });
          const data = await resp.json();

          if (data.status === "ready" && data.videoUrl) {
            console.log(`[VideoPersona] REAL idle video ready (polled)!`);
            setIdleVideoUrl(data.videoUrl);
            setIsLoadingIdle(false);
            setStatusMessage("Live");
            setIdleJobId(null);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (data.status === "failed") {
            setStatusMessage(data.error || "Generation failed");
            setIsLoadingIdle(false);
            setIdleJobId(null);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (data.elapsedMs) {
            const seconds = Math.round(data.elapsedMs / 1000);
            setStatusMessage(`Rendering on GPU (${seconds}s)...`);
          }
        } catch (err) {
          console.error("[VideoPersona] Poll error:", err);
        }
      }, 4000); // Reduced from 2s to 4s to prevent connection pool exhaustion
    };

    fetchIdleVideo();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [personaId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEAKING — Play audio instantly, generate video in background
  // ─────────────────────────────────────────────────────────────────────────────

  const handleNewAudio = useCallback(async (audioDataUrl: string) => {
    console.log(`[VideoPersona] New audio received, starting playback...`);

    // Start speaking session - stays active until video finishes
    setIsSpeakingSession(true);

    // Clear previous
    setSpeakingVideoUrl(null);
    setSpeakingJobId(null);

    // INSTANT: Play audio now using Web Audio API for better browser compatibility
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Use external AudioContext if provided (already unlocked by user interaction in EngageView)
    // This is critical for Safari and iOS which require AudioContext to be unlocked in user gesture
    if (externalAudioContext) {
      audioContextRef.current = externalAudioContext;
    } else if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Resume AudioContext if suspended
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
        console.log("[VideoPersona] AudioContext resumed");
      } catch (err) {
        console.error("[VideoPersona] Failed to resume AudioContext:", err);
      }
    }

    const audio = new Audio(audioDataUrl);
    audioRef.current = audio;

    // Connect to Web Audio API for guaranteed playback
    try {
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(audioContextRef.current.destination);
    } catch (err) {
      // May fail if already connected, that's OK
      console.log("[VideoPersona] Audio source connection:", err);
    }

    audio.onplay = () => {
      console.log(`[VideoPersona] Audio playing`);
      setIsPlayingAudio(true);
      onVideoReady?.();
    };

    audio.onended = () => {
      console.log(`[VideoPersona] Audio ended`);
      setIsPlayingAudio(false);
      audioRef.current = null;
      // If no video generated, clear ref and end session
      if (!speakingVideoUrl && !isGeneratingVideo) {
        lastAudioDataRef.current = null;
        setIsSpeakingSession(false);
        onVideoEnd?.();
      }
      // Otherwise wait for video to finish or generation to complete
    };

    audio.onerror = (e) => {
      console.log(`[VideoPersona] Audio error:`, e);
      setIsPlayingAudio(false);
      audioRef.current = null;
      // Don't end session here - video might still be generating
    };

    console.log("[VideoPersona] Attempting audio.play() with AudioContext state:", audioContextRef.current?.state);
    audio.play()
      .then(() => {
        console.log("[VideoPersona] audio.play() promise resolved successfully");
      })
      .catch((err) => {
        console.error(`[VideoPersona] Audio play FAILED:`, err.name, err.message);
        // Fallback: Try to play without Web Audio API connection
        console.log("[VideoPersona] Attempting fallback playback...");
        const fallbackAudio = new Audio(audioDataUrl);
        audioRef.current = fallbackAudio;
        fallbackAudio.onplay = () => setIsPlayingAudio(true);
        fallbackAudio.onended = () => {
          setIsPlayingAudio(false);
          audioRef.current = null;
        };
        fallbackAudio.play().catch((fallbackErr) => {
          console.error("[VideoPersona] Fallback audio also failed:", fallbackErr);
          setIsPlayingAudio(false);
          // Even if audio fails, let the video generation continue
        });
      });

    // BACKGROUND: Generate real lip-sync video
    setIsGeneratingVideo(true);

    try {
      const response = await fetch(`/api/personas/${personaId}/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directAudio: audioDataUrl,
          quality: "fast",
          sync: false, // Async mode for faster response
        }),
      });

      const result = await response.json();

      if (result.videoUrl) {
        console.log(`[VideoPersona] REAL lip-sync video ready!`);
        setSpeakingVideoUrl(result.videoUrl);
        setIsGeneratingVideo(false);
      } else if (result.jobId) {
        // Poll for video
        setSpeakingJobId(result.jobId);
        pollForSpeakingVideo(result.jobId);
      } else {
        console.log(`[VideoPersona] No video job started: ${result.note || result.error || "unknown"}`);
        setIsGeneratingVideo(false);
        // No video coming - session ends when audio ends (or immediately if audio already ended)
        if (!isPlayingAudio && !audioRef.current) {
          setIsSpeakingSession(false);
          onVideoEnd?.();
        }
      }
    } catch (err) {
      console.error("[VideoPersona] Video generation error:", err);
      setIsGeneratingVideo(false);
      // Error - session ends when audio ends (or immediately if audio already ended)
      if (!isPlayingAudio && !audioRef.current) {
        setIsSpeakingSession(false);
        onVideoEnd?.();
      }
    }
  }, [personaId, onVideoReady, onVideoEnd, isPlayingAudio]);

  // Poll for async video job completion
  const pollForSpeakingVideo = useCallback((jobId: string) => {
    console.log(`[VideoPersona] 🎬 Starting to poll for video job: ${jobId}`);

    const pollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/personas/${personaId}/talk?jobId=${jobId}`);
        const data = await resp.json();

        console.log(`[VideoPersona] Poll response:`, { status: data.status, hasVideoUrl: !!data.videoUrl });

        // Accept both "completed" and "succeeded" for compatibility
        if ((data.status === "completed" || data.status === "succeeded") && data.videoUrl) {
          console.log(`[VideoPersona] 🎉 REAL lip-sync video ready (polled)!`);
          console.log(`[VideoPersona] 📹 Full video URL: ${data.videoUrl}`);
          console.log(`[VideoPersona] 🎭 Setting speakingVideoUrl state...`);

          // CRITICAL: Ensure speaking session stays active
          setIsSpeakingSession(true);
          setSpeakingVideoUrl(data.videoUrl);
          setIsGeneratingVideo(false);
          setSpeakingJobId(null);
          clearInterval(pollInterval);

          console.log(`[VideoPersona] ✅ State updated, video should now render`);
        } else if (data.status === "failed") {
          console.log(`[VideoPersona] ❌ Video generation failed: ${data.error}`);
          setIsGeneratingVideo(false);
          setSpeakingJobId(null);
          setIsSpeakingSession(false); // End session on failure
          onVideoEnd?.(); // Signal end
          clearInterval(pollInterval);
        } else {
          console.log(`[VideoPersona] ⏳ Still processing (${data.status})...`);
        }
      } catch (err) {
        console.error("[VideoPersona] Speaking poll error:", err);
      }
    }, 1500);

    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      if (speakingJobId === jobId) {
        console.log(`[VideoPersona] Video generation timed out after 60s`);
        setIsGeneratingVideo(false);
        setSpeakingJobId(null);
        setIsSpeakingSession(false); // End session on timeout
        onVideoEnd?.(); // Signal end
      }
    }, 60000);
  }, [personaId, speakingJobId, onVideoEnd]);

  // Trigger on new audio
  useEffect(() => {
    console.log("[VideoPersona] audioData effect triggered, audioData:", audioData ? `${audioData.length} chars` : "null");
    if (!audioData) return;
    if (audioData === lastAudioDataRef.current) {
      console.log("[VideoPersona] Same audio as before, skipping");
      return;
    }
    console.log("[VideoPersona] NEW audio detected, calling handleNewAudio");
    lastAudioDataRef.current = audioData;
    handleNewAudio(audioData);
  }, [audioData, handleNewAudio]);

  // ─────────────────────────────────────────────────────────────────────────────
  // VIDEO PLAYBACK
  // ─────────────────────────────────────────────────────────────────────────────

  // Auto-play idle video
  useEffect(() => {
    if (idleVideoUrl && idleVideoRef.current && !isPlayingAudio && !speakingVideoUrl) {
      idleVideoRef.current.play().catch(() => {});
    }
  }, [idleVideoUrl, isPlayingAudio, speakingVideoUrl]);

  // Swap to speaking video when ready - play even if audio has finished
  useEffect(() => {
    if (speakingVideoUrl && speakingVideoRef.current && isSpeakingSession) {
      console.log(`[VideoPersona] Swapping to REAL lip-sync video (audio playing: ${isPlayingAudio})`);

      // Stop separate audio - video has its own audio track
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsPlayingAudio(false);
      }

      // Play the video - it includes the audio
      speakingVideoRef.current.play().catch(console.error);
    }
  }, [speakingVideoUrl, isSpeakingSession, isPlayingAudio]);

  const handleSpeakingVideoEnded = useCallback(() => {
    console.log(`[VideoPersona] Speaking video ended`);
    setSpeakingVideoUrl(null);
    setIsPlayingAudio(false);
    setIsSpeakingSession(false); // NOW we end the speaking session
    lastAudioDataRef.current = null; // Clear ref so next message can process
    onVideoEnd?.();
  }, [onVideoEnd]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Real video prioritized
  // ─────────────────────────────────────────────────────────────────────────────

  // Show speaking video when available AND in active speaking session
  const showSpeakingVideo = speakingVideoUrl && isSpeakingSession;
  // FIX: Show idle video OR image during speaking session while waiting for lip-sync video
  const showIdleVideo = idleVideoUrl && !showSpeakingVideo;
  // FIX: Show image as fallback during speaking session if no idle video
  const showImage = !showIdleVideo && !showSpeakingVideo && imageUrl;
  const isSpeaking = isSpeakingSession || isPlayingAudio || state === "speaking";

  // Debug logging for render decisions
  console.log(`[VideoPersona] 🎬 RENDER DECISION:`, {
    speakingVideoUrl: !!speakingVideoUrl,
    isSpeakingSession,
    showSpeakingVideo,
    idleVideoUrl: !!idleVideoUrl,
    showIdleVideo,
    showImage,
    imageUrl: imageUrl ? `${imageUrl.slice(0, 50)}...` : null,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 10,
        background: "#000",
      }}
    >
      {/* REAL SPEAKING VIDEO — Lip-synced from H100 GPU */}
      <AnimatePresence>
        {showSpeakingVideo && (
          <motion.video
            key="speaking-real"
            ref={speakingVideoRef}
            src={speakingVideoUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onEnded={handleSpeakingVideoEnded}
            onLoadStart={() => console.log("[VideoPersona] 📼 Speaking video load started")}
            onLoadedData={() => console.log("[VideoPersona] 📼 Speaking video data loaded")}
            onCanPlay={() => console.log("[VideoPersona] ▶️ Speaking video can play")}
            onPlay={() => console.log("[VideoPersona] ▶️ Speaking video PLAYING")}
            onError={(e) => {
              const error = e.currentTarget.error;
              console.error("[VideoPersona] 🚨 Speaking video ERROR:", {
                code: error?.code,
                message: error?.message,
                src: speakingVideoUrl?.slice(0, 100)
              });
              // Show fallback on error
              setSpeakingVideoUrl(null);
              setIsSpeakingSession(false);
            }}
            crossOrigin="anonymous"
            autoPlay
            playsInline
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </AnimatePresence>

      {/* REAL IDLE VIDEO — From GPU generation */}
      <AnimatePresence>
        {showIdleVideo && (
          <motion.video
            key="idle-real"
            ref={idleVideoRef}
            src={idleVideoUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            loop
            playsInline
            muted
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </AnimatePresence>

      {/* STATIC IMAGE — Only while waiting for real video */}
      <AnimatePresence>
        {showImage && (
          <motion.img
            key="static-image"
            src={imageUrl}
            alt={name}
            initial={{ opacity: 0 }}
            animate={{ opacity: isSpeaking ? 0.7 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: isSpeaking ? "brightness(1.1)" : "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* NO IMAGE FALLBACK */}
      {!showIdleVideo && !showSpeakingVideo && !imageUrl && (
        <div
          style={{
            width: "40vmin",
            height: "40vmin",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15vmin",
            fontWeight: 200,
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* STATUS DISPLAY */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Generation status */}
        {(isLoadingIdle || isGeneratingVideo) && (
          <div
            style={{
              padding: "10px 20px",
              background: "rgba(0,0,0,0.9)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: isGeneratingVideo ? "#22c55e" : "#3b82f6",
                animation: "pulse 1s infinite",
              }}
            />
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
              {isGeneratingVideo ? "Generating lip-sync..." : statusMessage}
            </span>
          </div>
        )}

        {/* State indicator */}
        <div
          style={{
            padding: "6px 16px",
            background: "rgba(0,0,0,0.8)",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            color: isSpeaking ? "#22c55e" : idleVideoUrl ? "#3b82f6" : "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isSpeaking && (
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse 0.8s infinite",
            }} />
          )}
          {state.toUpperCase()}
          {idleVideoUrl && !isSpeaking && " • REAL VIDEO"}
          {isSpeaking && speakingVideoUrl && " • LIP-SYNC"}
          {isSpeaking && !speakingVideoUrl && " • AUDIO"}
        </div>
      </div>

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default VideoPersona;
