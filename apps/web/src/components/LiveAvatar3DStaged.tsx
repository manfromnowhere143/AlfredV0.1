"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIVE AVATAR - Full Screen Persona Display
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LIVE MODE: Static image + audio playback
 *
 * For REAL animation (lips moving, eyes blinking), use CINEMATIC MODE
 * which generates actual video via MuseTalk/LatentSync.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect } from "react";
import { useAvatarStore } from "@/lib/avatar/store";
import { useLipSync } from "@/lib/avatar/useLipSync";
import { AvatarDiagnosticsOverlay } from "./AvatarDiagnosticsOverlay";

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCREEN PERSONA - Clean, no fake effects
// ═══════════════════════════════════════════════════════════════════════════════

function FullScreenPersona({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const state = useAvatarStore((s) => s.state);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);

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
      {/* FULL SCREEN PERSONA IMAGE - No fake animation */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
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
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}

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
      <AvatarDiagnosticsOverlay rendererName="LiveAvatar → FullScreen (Static + Audio)" />
    </>
  );
}

export default LiveAvatar3DStaged;
