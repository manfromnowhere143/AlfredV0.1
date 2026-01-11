"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVATAR STAGE - Living, Breathing Persona
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The persona ITSELF animates. Not borders. Not rings. THE FACE.
 * - Mouth opens when speaking (audio amplitude driven)
 * - Eyes blink naturally
 * - Subtle breathing
 * - Head movement based on state
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAvatarStore } from "@/lib/avatar/store";

interface AvatarStageProps {
  imageUrl?: string;
  modelUrl?: string; // 3D GLB model URL
  name: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function AvatarStage({
  imageUrl,
  modelUrl,
  name,
  onReady,
  onError,
}: AvatarStageProps) {
  // Avatar store state
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);

  // Local animation state
  const [eyesClosed, setEyesClosed] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Animation loop for breathing
  useEffect(() => {
    let startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      setBreathPhase(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Natural blinking (every 3-6 seconds)
  useEffect(() => {
    const blink = () => {
      setEyesClosed(true);
      setTimeout(() => setEyesClosed(false), 150);
    };

    const scheduleNextBlink = () => {
      const delay = 3000 + Math.random() * 3000; // 3-6 seconds
      return setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, delay);
    };

    const timeout = scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Calculate animations
  const breathScale = 1 + Math.sin(breathPhase * 0.8) * 0.008; // Very subtle breathing
  const breathY = Math.sin(breathPhase * 0.8) * 1.5;

  // Mouth opening based on audio amplitude (0-1 maps to 0-15px)
  const mouthOpen = state === "speaking" ? audioAmplitude * 18 : 0;

  // Head tilt based on state
  let headTilt = 0;
  let headShift = 0;
  if (state === "thinking") {
    headTilt = 3 + Math.sin(breathPhase * 0.3) * 2;
    headShift = -5;
  } else if (state === "listening") {
    headTilt = -2;
    headShift = 3;
  } else if (state === "speaking") {
    headTilt = Math.sin(breathPhase * 2) * 2;
    headShift = Math.sin(breathPhase * 1.5) * 3;
  }

  // Status color
  const statusColor = state === "speaking" ? "#22c55e" :
                      state === "thinking" ? "#8b5cf6" :
                      state === "listening" ? "#3b82f6" : "#71717a";

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        background: "#0a0a0f",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Persona Name */}
      <div style={{
        position: "absolute",
        top: 20,
        padding: "8px 20px",
        background: "rgba(0, 0, 0, 0.6)",
        borderRadius: 24,
      }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
          {name}
        </span>
      </div>

      {/* THE AVATAR - This is what animates */}
      <div
        style={{
          position: "relative",
          transform: `
            translateY(${breathY + headShift}px)
            scale(${breathScale})
            rotate(${headTilt}deg)
          `,
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Main persona image */}
        <div style={{ position: "relative" }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              style={{
                width: 280,
                height: 280,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.15)",
              }}
              onLoad={() => onReady?.()}
              onError={() => onError?.(new Error("Failed to load avatar"))}
            />
          ) : (
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 100,
                fontWeight: 200,
                color: "white",
                border: "3px solid rgba(255,255,255,0.15)",
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Eye blink overlay (darkens eye area when blinking) */}
          {eyesClosed && (
            <div
              style={{
                position: "absolute",
                top: "28%",
                left: "20%",
                width: "60%",
                height: "12%",
                background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Mouth animation overlay - jaw drop effect */}
          {mouthOpen > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: "18%",
                left: "30%",
                width: "40%",
                height: `${8 + mouthOpen}%`,
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
                transform: `scaleY(${1 + mouthOpen / 20})`,
              }}
            />
          )}
        </div>
      </div>

      {/* Status indicator - simple, not distracting */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 20,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
          }}
        />
        <span style={{
          color: "#fff",
          fontSize: 13,
          textTransform: "capitalize",
          fontWeight: 500,
        }}>
          {state}
        </span>
        {state === "speaking" && (
          <span style={{ color: "#888", fontSize: 11 }}>
            {Math.round(audioAmplitude * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default AvatarStage;
