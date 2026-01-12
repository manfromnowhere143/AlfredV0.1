"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIVE AVATAR - Full Screen ANIMATED Persona Display
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LIVE MODE with REAL animation:
 * - Breathing (subtle scale/translate)
 * - Blinking (brightness overlay)
 * - Mouth movement driven by audioAmplitude
 * - Gaze shifts
 * - Head micro-movements
 *
 * All driven by store.tick() called every frame.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useAvatarStore } from "@/lib/avatar/store";
import { useLipSync } from "@/lib/avatar/useLipSync";
import { AvatarDiagnosticsOverlay } from "./AvatarDiagnosticsOverlay";

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCREEN ANIMATED PERSONA - Real breathing, blinking, mouth movement
// ═══════════════════════════════════════════════════════════════════════════════

function FullScreenPersona({ imageUrl, name }: { imageUrl?: string; name: string }) {
  // Read all animation state from store
  const state = useAvatarStore((s) => s.state);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const isBlinking = useAvatarStore((s) => s.isBlinking);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);
  const gazeX = useAvatarStore((s) => s.gazeX);
  const gazeY = useAvatarStore((s) => s.gazeY);
  const headPitch = useAvatarStore((s) => s.headPitch);
  const headYaw = useAvatarStore((s) => s.headYaw);
  const headRoll = useAvatarStore((s) => s.headRoll);
  const tick = useAvatarStore((s) => s.tick);

  // Tick counter for diagnostics
  const tickCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Main animation loop - calls store.tick() every frame
  useEffect(() => {
    console.log('[LiveAvatar] Starting presence loop');

    const loop = (now: number) => {
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Call store tick to update all animation state
      tick(deltaTime);
      tickCountRef.current++;

      // Log every 60 frames to prove loop is running
      if (tickCountRef.current % 60 === 0) {
        console.log(`[LiveAvatar] tick #${tickCountRef.current}, deltaTime: ${deltaTime.toFixed(1)}ms`);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        console.log('[LiveAvatar] Presence loop stopped');
      }
    };
  }, [tick]);

  // Calculate visual transforms from store state
  const breathScale = 1 + Math.sin(breathingPhase * Math.PI * 2) * 0.008;
  const breathY = Math.sin(breathingPhase * Math.PI * 2) * 2;

  // Mouth opening based on audio amplitude (for overlay indicator)
  const mouthOpen = state === 'speaking' ? audioAmplitude * 20 : 0;

  // Head transform from store values (subtle, natural)
  const headTransform = `
    translateY(${breathY + headPitch * 50}px)
    translateX(${headYaw * 30}px)
    scale(${breathScale})
    rotate(${headRoll * 5}deg)
  `;

  // State colors for indicator
  const stateColor =
    state === 'speaking' ? '#22c55e' :
    state === 'listening' ? '#3b82f6' :
    state === 'thinking' ? '#8b5cf6' :
    '#71717a';

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* ANIMATED PERSONA CONTAINER */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: headTransform,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                // Blink effect: darken when blinking
                filter: isBlinking ? 'brightness(0.85)' : 'brightness(1)',
                transition: 'filter 0.08s ease-out',
              }}
            />

            {/* BLINK OVERLAY - darkens eye region when blinking */}
            {isBlinking && (
              <div
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '30%',
                  width: '40%',
                  height: '10%',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* MOUTH MOVEMENT OVERLAY - jaw drop effect when speaking */}
            {mouthOpen > 2 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '20%',
                  left: '35%',
                  width: '30%',
                  height: `${6 + mouthOpen * 0.5}%`,
                  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  transform: `scaleY(${1 + mouthOpen / 30})`,
                }}
              />
            )}
          </>
        ) : (
          <div style={{
            width: '50vmin',
            height: '50vmin',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20vmin',
            fontWeight: 200,
            color: 'white',
            filter: isBlinking ? 'brightness(0.85)' : 'brightness(1)',
            transition: 'filter 0.08s ease-out',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* STATE INDICATOR - Shows what's happening */}
      <div style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: `2px solid ${stateColor}`,
        boxShadow: `0 0 20px ${stateColor}40`,
        zIndex: 10,
      }}>
        {/* Pulsing indicator */}
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: stateColor,
          boxShadow: `0 0 10px ${stateColor}`,
          animation: state !== 'idle' ? 'pulse 1s infinite' : 'none',
        }} />

        <span style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {state}
        </span>

        {/* Audio level when speaking */}
        {state === 'speaking' && (
          <div style={{
            width: 80,
            height: 6,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(audioAmplitude * 100, 100)}%`,
              height: '100%',
              background: stateColor,
              transition: 'width 0.05s ease-out',
            }} />
          </div>
        )}
      </div>

      {/* PERSONA NAME */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 28px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 30,
        zIndex: 10,
      }}>
        <span style={{
          color: '#fff',
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 1,
        }}>
          {name}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveAvatar3DStagedProps {
  modelUrl?: string;
  imageUrl?: string;
  name: string;
  audioData?: string;
  onReady?: () => void;
  onAudioEnd?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LiveAvatar3DStaged({
  imageUrl,
  name,
  audioData,
  onReady,
  onAudioEnd,
}: LiveAvatar3DStagedProps) {
  const { connectToAudioData, stop } = useLipSync();
  const setState = useAvatarStore((s) => s.setState);

  // Connect audio data for playback
  useEffect(() => {
    if (audioData) {
      setState('speaking');
      connectToAudioData(audioData).then((audio) => {
        audio.onended = () => {
          stop();
          setState('idle');
          onAudioEnd?.();
        };
      }).catch((err) => {
        console.error('[LiveAvatar] Audio connection failed:', err);
        setState('idle');
      });
    }

    return () => {
      stop();
    };
  }, [audioData, connectToAudioData, stop, setState, onAudioEnd]);

  // Signal ready
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <>
      <FullScreenPersona imageUrl={imageUrl} name={name} />
      <AvatarDiagnosticsOverlay rendererName="LiveAvatar → Animated (tick loop)" />
    </>
  );
}

export default LiveAvatar3DStaged;
