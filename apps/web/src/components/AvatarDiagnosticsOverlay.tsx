"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVATAR DIAGNOSTICS OVERLAY - Dev-only telemetry overlay
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shows real-time avatar system state to make debugging trivial.
 * Displays:
 * - Renderer path (which component is rendering)
 * - AudioContext state (running/suspended/closed)
 * - RMS audio level (0-1, realtime)
 * - Avatar state (idle/listening/thinking/speaking)
 * - Blink countdown timer
 * - Mouth open value
 * - FPS counter
 *
 * Usage:
 *   <AvatarDiagnosticsOverlay rendererName="LiveAvatar3DStaged" />
 *
 * Only renders in development mode.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from "react";
import { useAvatarStore } from "@/lib/avatar/store";

interface AvatarDiagnosticsOverlayProps {
  rendererName: string;
  className?: string;
}

export function AvatarDiagnosticsOverlay({
  rendererName,
  className = "",
}: AvatarDiagnosticsOverlayProps) {
  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Read from store
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const currentViseme = useAvatarStore((s) => s.currentViseme);
  const visemeWeight = useAvatarStore((s) => s.visemeWeight);
  const lastBlinkTime = useAvatarStore((s) => s.lastBlinkTime);
  const isBlinking = useAvatarStore((s) => s.isBlinking);
  const audioContextState = useAvatarStore((s) => s.audioContextState);
  const analyserConnected = useAvatarStore((s) => s.analyserConnected);

  // Local state for FPS counter
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFpsUpdate, setLastFpsUpdate] = useState(Date.now());
  const [blinkCountdown, setBlinkCountdown] = useState(0);

  // FPS counter
  useEffect(() => {
    let animationId: number;

    const countFrame = () => {
      setFrameCount((prev) => {
        const now = Date.now();
        const elapsed = now - lastFpsUpdate;

        // Update FPS every second
        if (elapsed >= 1000) {
          setFps(Math.round((prev * 1000) / elapsed));
          setLastFpsUpdate(now);
          return 0;
        }

        return prev + 1;
      });

      animationId = requestAnimationFrame(countFrame);
    };

    animationId = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(animationId);
  }, [lastFpsUpdate]);

  // Blink countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastBlinkTime;
      // Assuming target blink interval is 3-5 seconds
      const targetInterval = 4000;
      const remaining = Math.max(0, targetInterval - elapsed);
      setBlinkCountdown(remaining / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [lastBlinkTime]);

  // Calculate mouth open percentage (based on audioAmplitude)
  const mouthOpenPercent = Math.round(audioAmplitude * 100);

  // Color coding for states
  const getStateColor = (state: string) => {
    switch (state) {
      case "idle":
        return "#71717a"; // Gray
      case "listening":
        return "#3b82f6"; // Blue
      case "thinking":
        return "#8b5cf6"; // Purple
      case "speaking":
        return "#22c55e"; // Green
      default:
        return "#71717a";
    }
  };

  const getAudioContextColor = (state: string | null) => {
    switch (state) {
      case "running":
        return "#22c55e"; // Green
      case "suspended":
        return "#f59e0b"; // Orange
      case "closed":
        return "#ef4444"; // Red
      default:
        return "#71717a"; // Gray
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] bg-black/90 text-white text-xs font-mono p-3 rounded-lg border border-white/20 backdrop-blur-sm min-w-[280px] ${className}`}
      style={{
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
        <span className="font-bold text-emerald-400">AVATAR DIAGNOSTICS</span>
        <span className="text-white/50 text-[10px]">DEV ONLY</span>
      </div>

      {/* Renderer Path */}
      <div className="mb-2">
        <span className="text-white/50">Renderer:</span>
        <span className="ml-2 text-cyan-400 font-semibold">{rendererName}</span>
      </div>

      {/* FPS */}
      <div className="mb-2">
        <span className="text-white/50">FPS:</span>
        <span
          className="ml-2 font-semibold"
          style={{
            color: fps >= 55 ? "#22c55e" : fps >= 30 ? "#f59e0b" : "#ef4444",
          }}
        >
          {fps}
        </span>
      </div>

      {/* AudioContext State */}
      <div className="mb-2">
        <span className="text-white/50">AudioContext:</span>
        <span
          className="ml-2 font-semibold uppercase"
          style={{ color: getAudioContextColor(audioContextState) }}
        >
          {audioContextState || "not-created"}
        </span>
      </div>

      {/* Analyser Connected */}
      <div className="mb-2">
        <span className="text-white/50">Analyser:</span>
        <span
          className="ml-2 font-semibold"
          style={{ color: analyserConnected ? "#22c55e" : "#ef4444" }}
        >
          {analyserConnected ? "CONNECTED" : "DISCONNECTED"}
        </span>
      </div>

      {/* Avatar State */}
      <div className="mb-2">
        <span className="text-white/50">State:</span>
        <span
          className="ml-2 font-semibold uppercase"
          style={{ color: getStateColor(state) }}
        >
          {state}
        </span>
      </div>

      {/* Emotion */}
      <div className="mb-2">
        <span className="text-white/50">Emotion:</span>
        <span className="ml-2 text-purple-400 capitalize">{emotion}</span>
      </div>

      {/* RMS Audio Level */}
      <div className="mb-2">
        <span className="text-white/50">RMS Level:</span>
        <span className="ml-2 font-semibold text-yellow-400">
          {audioAmplitude.toFixed(3)}
        </span>
        <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-yellow-400 transition-all duration-100"
            style={{ width: `${mouthOpenPercent}%` }}
          />
        </div>
      </div>

      {/* Mouth Open */}
      <div className="mb-2">
        <span className="text-white/50">Mouth Open:</span>
        <span className="ml-2 font-semibold text-green-400">
          {mouthOpenPercent}%
        </span>
      </div>

      {/* Viseme */}
      <div className="mb-2">
        <span className="text-white/50">Viseme:</span>
        <span className="ml-2 text-orange-400 font-semibold uppercase">
          {currentViseme}
        </span>
        <span className="ml-1 text-white/50 text-[10px]">
          ({visemeWeight.toFixed(2)})
        </span>
      </div>

      {/* Blink Status */}
      <div className="mb-0">
        <span className="text-white/50">Blink:</span>
        <span
          className="ml-2 font-semibold"
          style={{ color: isBlinking ? "#22c55e" : "#71717a" }}
        >
          {isBlinking ? "👁️ BLINKING" : `Next: ${blinkCountdown.toFixed(1)}s`}
        </span>
        {!isBlinking && blinkCountdown === 0 && (
          <span className="ml-2 text-red-400 text-[10px]">⚠️ OVERDUE</span>
        )}
      </div>
    </div>
  );
}

export default AvatarDiagnosticsOverlay;
