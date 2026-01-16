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

import React, { useEffect, useRef } from "react";
import { useAvatarStore } from "@/lib/avatar/store";
import { useLipSync } from "@/lib/avatar/useLipSync";

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCREEN ANIMATED PERSONA - Real breathing, blinking, mouth movement
// ═══════════════════════════════════════════════════════════════════════════════

function FullScreenPersona({ imageUrl, name }: { imageUrl?: string; name: string }) {
  // Read animation state from store
  const isBlinking = useAvatarStore((s) => s.isBlinking);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);
  const headPitch = useAvatarStore((s) => s.headPitch);
  const headYaw = useAvatarStore((s) => s.headYaw);
  const headRoll = useAvatarStore((s) => s.headRoll);
  const tick = useAvatarStore((s) => s.tick);

  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Main animation loop - calls store.tick() every frame
  useEffect(() => {
    const loop = (now: number) => {
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;
      tick(deltaTime);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [tick]);

  // Calculate visual transforms - subtle, natural animation
  const breathScale = 1 + Math.sin(breathingPhase * Math.PI * 2) * 0.015; // 1.5% scale
  const breathY = Math.sin(breathingPhase * Math.PI * 2) * 4; // 4px vertical

  // Head transform - subtle micro-movements
  const headTransform = `
    translateY(${breathY + headPitch * 15}px)
    translateX(${headYaw * 12}px)
    scale(${breathScale})
    rotate(${headRoll * 2}deg)
  `;

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
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              // Subtle blink effect
              filter: isBlinking ? 'brightness(0.95)' : 'brightness(1)',
              transition: 'filter 0.1s ease-out',
            }}
          />
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
  const { connectToAudioData, warmUp, stop } = useLipSync();
  const setState = useAvatarStore((s) => s.setState);

  // Expose warmUp for parent components to call on user interaction
  // This ensures AudioContext is ready before playing audio
  useEffect(() => {
    // Store warmUp in window for easy access from parent
    (window as any).__lipSyncWarmUp = warmUp;
    return () => {
      delete (window as any).__lipSyncWarmUp;
    };
  }, [warmUp]);

  // Connect audio data for playback
  useEffect(() => {
    if (audioData) {
      console.log('[LiveAvatar] 🔊 RECEIVED audioData! Length:', audioData.length);
      console.log('[LiveAvatar] 🔊 First 50 chars:', audioData.substring(0, 50));
      setState('speaking');
      connectToAudioData(audioData).then((audio) => {
        console.log('[LiveAvatar] 🔊 Audio connected, setting onended handler');
        audio.onended = () => {
          console.log('[LiveAvatar] 🔊 Audio playback ENDED');
          stop();
          setState('idle');
          onAudioEnd?.();
        };
      }).catch((err) => {
        console.error('[LiveAvatar] ❌ Audio connection failed:', err);
        setState('idle');
      });
    } else {
      console.log('[LiveAvatar] No audioData received (undefined)');
    }

    return () => {
      stop();
    };
  }, [audioData, connectToAudioData, stop, setState, onAudioEnd]);

  // Signal ready
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return <FullScreenPersona imageUrl={imageUrl} name={name} />;
}

export default LiveAvatar3DStaged;
