"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   L I V E   P E R S O N A   —   C L E A N   &   R E A L
 *
 *   Static image when idle. Real lip-synced VIDEO when speaking.
 *   No fake CSS animations. No decorative effects.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EmotionState =
  | "neutral" | "happy" | "sad" | "angry" | "surprised"
  | "thoughtful" | "excited" | "calm" | "confident" | "curious" | "concerned";

export type PersonaState = "idle" | "listening" | "thinking" | "speaking";

interface LivePersonaProps {
  personaId: string;
  name: string;
  imageUrl?: string;
  /** Lip-synced video URL from SadTalker - shows REAL talking animation */
  videoUrl?: string;
  /** Called when video playback ends */
  onVideoEnd?: () => void;
  emotion?: EmotionState;
  state?: PersonaState;
  isSpeaking?: boolean;
  isThinking?: boolean;
  isListening?: boolean;
  audioData?: string;
  spokenText?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showGlow?: boolean;
  onClick?: () => void;
}

const SIZES = {
  sm: 120,
  md: 200,
  lg: 320,
  xl: 450,
  full: 600,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE PERSONA COMPONENT - Clean & Real
// ═══════════════════════════════════════════════════════════════════════════════

export function LivePersona({
  personaId,
  name,
  imageUrl,
  videoUrl,
  onVideoEnd,
  emotion = "neutral",
  state: propState,
  isSpeaking = false,
  isThinking = false,
  isListening = false,
  size = "lg",
  onClick,
}: LivePersonaProps) {
  const state: PersonaState = propState || (isSpeaking ? "speaking" : isThinking ? "thinking" : isListening ? "listening" : "idle");
  const sizeValue = SIZES[size] || SIZES.md;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play video when videoUrl changes
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      console.log("[LivePersona] 🎬 Playing lip-synced video:", videoUrl);
      videoRef.current.play().catch((err) => {
        console.error("[LivePersona] Video play error:", err);
      });
    }
  }, [videoUrl]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {/* Main portrait - STATIC image or REAL video */}
      <div
        style={{
          position: "relative",
          width: sizeValue,
          height: sizeValue,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
          border: "3px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Show VIDEO when available (real lip-sync from SadTalker) */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            playsInline
            onEnded={() => {
              console.log("[LivePersona] Video ended");
              onVideoEnd?.();
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : imageUrl ? (
          /* Static image when not speaking with video */
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          /* Fallback - initials */
          <div style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontSize: sizeValue / 2.5,
              fontWeight: 300,
              color: "rgba(255, 255, 255, 0.6)",
            }}>
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Simple status indicator */}
      {state !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: "absolute",
            bottom: -40,
            padding: "8px 16px",
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: 20,
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.9)",
            textTransform: "capitalize",
          }}>
            {state === "speaking" ? "Speaking..." : state === "thinking" ? "Thinking..." : "Listening..."}
          </span>
        </motion.div>
      )}

      {/* Name */}
      <div style={{
        marginTop: 50,
        textAlign: "center",
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 600,
          color: "#fff",
        }}>
          {name}
        </h2>
      </div>
    </div>
  );
}

export default LivePersona;
