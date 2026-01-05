"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * E N G A G E  V I E W
 * The Immersive Persona Experience
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "Design is not just what it looks like and feels like. 
 *  Design is how it works." — Steve Jobs
 * 
 * This is where the persona comes ALIVE. Not a chat interface.
 * A living, breathing presence that responds to you.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS — Refined for Immersion
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  void: "#000000",
  deep: "#050508",
  surface: "#0a0a0f",
  elevated: "#12121a",
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.12)",
  text: {
    primary: "#ffffff",
    secondary: "rgba(255,255,255,0.7)",
    muted: "rgba(255,255,255,0.4)",
  },
  accent: {
    primary: "#ffffff",
    glow: "rgba(255,255,255,0.15)",
  },
  state: {
    listening: "#22c55e",
    thinking: "#3b82f6",
    speaking: "#a855f7",
    idle: "#6b7280",
  },
};

// Persona aura colors by archetype
const AURA_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  sage: { primary: "#4A90D9", secondary: "#C9A227", glow: "rgba(74,144,217,0.3)" },
  hero: { primary: "#DC2626", secondary: "#FCD34D", glow: "rgba(220,38,38,0.3)" },
  creator: { primary: "#8B5CF6", secondary: "#EC4899", glow: "rgba(139,92,246,0.3)" },
  caregiver: { primary: "#10B981", secondary: "#6EE7B7", glow: "rgba(16,185,129,0.3)" },
  ruler: { primary: "#F59E0B", secondary: "#7C3AED", glow: "rgba(245,158,11,0.3)" },
  jester: { primary: "#F472B6", secondary: "#38BDF8", glow: "rgba(244,114,182,0.3)" },
  rebel: { primary: "#EF4444", secondary: "#1F2937", glow: "rgba(239,68,68,0.3)" },
  lover: { primary: "#EC4899", secondary: "#F9A8D4", glow: "rgba(236,72,153,0.3)" },
  explorer: { primary: "#06B6D4", secondary: "#22D3EE", glow: "rgba(6,182,212,0.3)" },
  innocent: { primary: "#FCD34D", secondary: "#FEF3C7", glow: "rgba(252,211,77,0.3)" },
  magician: { primary: "#8B5CF6", secondary: "#C4B5FD", glow: "rgba(139,92,246,0.3)" },
  outlaw: { primary: "#374151", secondary: "#9CA3AF", glow: "rgba(55,65,81,0.3)" },
  default: { primary: "#6366F1", secondary: "#A5B4FC", glow: "rgba(99,102,241,0.3)" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type PersonaState = "idle" | "listening" | "thinking" | "speaking";
type InputMode = "voice" | "text";

interface Persona {
  id: string;
  name: string;
  archetype: string;
  imageUrl?: string;
  description?: string;
}

interface EngageViewProps {
  persona: Persona;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SPRING_GENTLE = { type: "spring", stiffness: 120, damping: 20 };
const SPRING_SNAPPY = { type: "spring", stiffness: 400, damping: 30 };
const EASE_OUT = { duration: 0.4, ease: [0.16, 1, 0.3, 1] };

// ═══════════════════════════════════════════════════════════════════════════════
// BREATHING ANIMATION HOOK — Creates lifelike presence
// ═══════════════════════════════════════════════════════════════════════════════

function useBreathing(isActive: boolean = true) {
  const breathCycle = useMotionValue(0);
  
  useEffect(() => {
    if (!isActive) return;
    
    let frame: number;
    let start: number | null = null;
    const duration = 4000; // 4 second breath cycle
    
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = ((timestamp - start) % duration) / duration;
      // Smooth sine wave for natural breathing
      const breath = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
      breathCycle.set(breath);
      frame = requestAnimationFrame(animate);
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isActive, breathCycle]);
  
  return breathCycle;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLINK ANIMATION HOOK — Natural eye blinking
// ═══════════════════════════════════════════════════════════════════════════════

function useBlink() {
  const [isBlinking, setIsBlinking] = useState(false);
  
  useEffect(() => {
    const scheduleNextBlink = () => {
      // Random interval between 2-6 seconds
      const interval = 2000 + Math.random() * 4000;
      return setTimeout(() => {
        setIsBlinking(true);
        // Blink duration ~150ms
        setTimeout(() => setIsBlinking(false), 150);
        scheduleNextBlink();
      }, interval);
    };
    
    const timeout = scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);
  
  return isBlinking;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO VISUALIZER HOOK — For voice input feedback
// ═══════════════════════════════════════════════════════════════════════════════

function useAudioVisualizer(isListening: boolean) {
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0.1));
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    if (!isListening) {
      setLevels(Array(12).fill(0.1));
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }
    
    const startListening = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateLevels = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const newLevels = Array(12).fill(0).map((_, i) => {
            const index = Math.floor((i / 12) * dataArray.length);
            return Math.max(0.1, dataArray[index] / 255);
          });
          
          setLevels(newLevels);
          animationRef.current = requestAnimationFrame(updateLevels);
        };
        
        updateLevels();
      } catch (err) {
        console.error("Microphone access denied:", err);
        // Simulate levels for demo
        const simulateLevels = () => {
          setLevels(prev => prev.map(() => 0.1 + Math.random() * 0.6));
          animationRef.current = requestAnimationFrame(simulateLevels);
        };
        simulateLevels();
      }
    };
    
    startListening();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isListening]);
  
  return levels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM — Ambient floating particles
// ═══════════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function ParticleField({ color, count = 30 }: { color: string; count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    setParticles(
      Array(count).fill(null).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 10 + Math.random() * 20,
        delay: Math.random() * 10,
        opacity: 0.1 + Math.random() * 0.3,
      }))
    );
  }, [count]);
  
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 0 }}
          animate={{
            y: [`${p.y}vh`, `${p.y - 30}vh`],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: color,
            filter: `blur(${p.size / 2}px)`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA AVATAR — The living presence
// ═══════════════════════════════════════════════════════════════════════════════

function PersonaAvatar({
  persona,
  state,
  auraColors,
}: {
  persona: Persona;
  state: PersonaState;
  auraColors: { primary: string; secondary: string; glow: string };
}) {
  const breathCycle = useBreathing(state !== "speaking");
  const isBlinking = useBlink();
  
  // Transform breath to scale
  const scale = useTransform(breathCycle, [0, 1], [1, 1.02]);
  const glowIntensity = useTransform(breathCycle, [0, 1], [0.3, 0.6]);
  
  // Spring for smooth transitions
  const springScale = useSpring(scale, SPRING_GENTLE);
  
  // Speaking animation
  const speakingScale = state === "speaking" ? 1.05 : 1;
  
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Ambient glow layers */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [1, 1.2, 1] : 1,
          opacity: state === "idle" ? 0.2 : 0.4,
        }}
        transition={{ duration: 2, repeat: state === "speaking" ? Infinity : 0 }}
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${auraColors.glow} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      
      {/* Secondary glow */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: "110%",
          height: "110%",
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${auraColors.primary}20, transparent, ${auraColors.secondary}20, transparent, ${auraColors.primary}20)`,
          filter: "blur(40px)",
        }}
      />
      
      {/* Main avatar container */}
      <motion.div
        style={{
          scale: springScale,
          width: "min(80vw, 80vh, 400px)",
          height: "min(80vw, 80vh, 400px)",
          position: "relative",
        }}
        animate={{
          scale: speakingScale,
        }}
        transition={SPRING_GENTLE}
      >
        {/* Avatar ring */}
        <motion.div
          animate={{
            boxShadow: state === "speaking"
              ? `0 0 60px ${auraColors.primary}60, 0 0 120px ${auraColors.primary}30`
              : `0 0 40px ${auraColors.primary}30, 0 0 80px ${auraColors.primary}15`,
          }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `2px solid ${auraColors.primary}40`,
          }}
        />
        
        {/* Avatar image or placeholder */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${COLORS.elevated} 0%, ${COLORS.surface} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {persona.imageUrl ? (
            <motion.img
              src={persona.imageUrl}
              alt={persona.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              animate={{
                filter: isBlinking ? "brightness(0.95)" : "brightness(1)",
              }}
              transition={{ duration: 0.1 }}
            />
          ) : (
            <motion.span
              style={{
                fontSize: "min(30vw, 30vh, 150px)",
                fontWeight: 200,
                color: COLORS.text.primary,
                opacity: 0.9,
              }}
            >
              {persona.name[0]}
            </motion.span>
          )}
          
          {/* Thinking overlay */}
          <AnimatePresence>
            {state === "thinking" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle, ${auraColors.primary}20 0%, transparent 70%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ThinkingIndicator color={auraColors.primary} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* State indicator ring */}
        <motion.div
          animate={{
            opacity: state !== "idle" ? 1 : 0,
            scale: state !== "idle" ? 1 : 0.9,
          }}
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `2px solid ${COLORS.state[state]}`,
            opacity: 0,
          }}
        />
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THINKING INDICATOR — Elegant loading state
// ═══════════════════════════════════════════════════════════════════════════════

function ThinkingIndicator({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE INPUT BUTTON — The primary interaction
// ═══════════════════════════════════════════════════════════════════════════════

function VoiceButton({
  isListening,
  onPress,
  onRelease,
  levels,
  color,
}: {
  isListening: boolean;
  onPress: () => void;
  onRelease: () => void;
  levels: number[];
  color: string;
}) {
  return (
    <motion.button
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: isListening
          ? `0 0 40px ${color}60, 0 0 80px ${color}30`
          : "0 0 0 rgba(0,0,0,0)",
      }}
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: isListening ? color : COLORS.elevated,
        border: `2px solid ${isListening ? color : COLORS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Audio visualizer rings */}
      {isListening && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {levels.slice(0, 3).map((level, i) => (
            <motion.div
              key={i}
              animate={{ scale: 1 + level * 0.5, opacity: 0.3 - i * 0.1 }}
              transition={{ duration: 0.1 }}
              style={{
                position: "absolute",
                width: 72 + i * 20,
                height: 72 + i * 20,
                borderRadius: "50%",
                border: `1px solid ${COLORS.text.primary}`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Mic icon */}
      <svg
        width={28}
        height={28}
        viewBox="0 0 24 24"
        fill="none"
        stroke={isListening ? COLORS.void : COLORS.text.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10v1a7 7 0 0014 0v-1" />
        <path d="M12 18v4M8 22h8" />
      </svg>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT INPUT — Secondary interaction mode
// ═══════════════════════════════════════════════════════════════════════════════

function TextInput({
  value,
  onChange,
  onSend,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 8px 8px 20px",
        background: COLORS.elevated,
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        width: "100%",
        maxWidth: 400,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && value.trim() && onSend()}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: COLORS.text.primary,
          fontSize: 15,
          fontFamily: "inherit",
        }}
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSend}
        disabled={!value.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: value.trim() ? COLORS.text.primary : COLORS.surface,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: value.trim() ? "pointer" : "default",
          opacity: value.trim() ? 1 : 0.5,
        }}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill={value.trim() ? COLORS.void : COLORS.text.muted}
        >
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE CAPTION — What the persona is saying
// ═══════════════════════════════════════════════════════════════════════════════

function ResponseCaption({ text, isVisible }: { text: string; isVisible: boolean }) {
  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={EASE_OUT}
          style={{
            position: "absolute",
            bottom: 180,
            left: 24,
            right: 24,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: COLORS.text.primary,
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            "{text}"
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE TOGGLE — Switch between voice and text
// ═══════════════════════════════════════════════════════════════════════════════

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: InputMode;
  onModeChange: (m: InputMode) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: COLORS.elevated,
        borderRadius: 999,
        padding: 4,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {(["voice", "text"] as InputMode[]).map(m => (
        <motion.button
          key={m}
          onClick={() => onModeChange(m)}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            background: mode === m ? COLORS.text.primary : "transparent",
            color: mode === m ? COLORS.void : COLORS.text.secondary,
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {m === "voice" ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10v1a7 7 0 0014 0v-1" />
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          )}
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER — Minimal, elegant
// ═══════════════════════════════════════════════════════════════════════════════

function Header({
  persona,
  onClose,
  onSettings,
}: {
  persona: Persona;
  onClose: () => void;
  onSettings?: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={EASE_OUT}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        zIndex: 100,
      }}
    >
      {/* Back button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: COLORS.elevated,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLORS.text.primary} strokeWidth={2.5}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </motion.button>
      
      {/* Name */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: COLORS.text.primary, margin: 0 }}>
          {persona.name}
        </h1>
        <p style={{ fontSize: 12, color: COLORS.text.muted, margin: 0 }}>
          {persona.archetype?.charAt(0).toUpperCase() + persona.archetype?.slice(1) || "Persona"}
        </p>
      </div>
      
      {/* Settings */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSettings}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: COLORS.elevated,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLORS.text.primary} strokeWidth={2}>
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
        </svg>
      </motion.button>
    </motion.header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGAGE VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EngageView({ persona, onClose }: EngageViewProps) {
  const [state, setState] = useState<PersonaState>("idle");
  const [mode, setMode] = useState<InputMode>("voice");
  const [textInput, setTextInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  const audioLevels = useAudioVisualizer(isListening);
  
  // Get aura colors for this persona
  const auraColors = AURA_COLORS[persona.archetype] || AURA_COLORS.default;
  
  // Handle voice input
  const handleVoiceStart = useCallback(() => {
    setIsListening(true);
    setState("listening");
    setCurrentResponse("");
  }, []);
  
  const handleVoiceEnd = useCallback(async () => {
    setIsListening(false);
    setState("thinking");
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    setState("speaking");
    setCurrentResponse("I understand what you're seeking. Let me share my thoughts with you...");
    
    // Simulate speaking duration
    await new Promise(r => setTimeout(r, 3000));
    
    setState("idle");
  }, []);
  
  // Handle text input
  const handleTextSend = useCallback(async () => {
    if (!textInput.trim()) return;
    
    const message = textInput;
    setTextInput("");
    setState("thinking");
    setCurrentResponse("");
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    setState("speaking");
    setCurrentResponse(`You asked about "${message}". Here is my response to that...`);
    
    // Simulate speaking duration
    await new Promise(r => setTimeout(r, 3000));
    
    setState("idle");
  }, [textInput]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.void,
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
        overflow: "hidden",
      }}
    >
      {/* Particle background */}
      <ParticleField color={auraColors.primary} count={25} />
      
      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 100% 100% at 50% 100%, ${auraColors.glow} 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 50% 0%, ${COLORS.surface} 0%, transparent 50%)
          `,
          pointerEvents: "none",
        }}
      />
      
      {/* Header */}
      <Header persona={persona} onClose={onClose} />
      
      {/* Main content - Avatar */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 80,
          paddingBottom: 200,
        }}
      >
        <PersonaAvatar
          persona={persona}
          state={state}
          auraColors={auraColors}
        />
      </div>
      
      {/* Response caption */}
      <ResponseCaption
        text={currentResponse}
        isVisible={state === "speaking"}
      />
      
      {/* Bottom controls */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...EASE_OUT, delay: 0.2 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Mode toggle */}
        <ModeToggle mode={mode} onModeChange={setMode} />
        
        {/* Input area */}
        <AnimatePresence mode="wait">
          {mode === "voice" ? (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
            >
              <VoiceButton
                isListening={isListening}
                onPress={handleVoiceStart}
                onRelease={handleVoiceEnd}
                levels={audioLevels}
                color={auraColors.primary}
              />
              <p style={{ fontSize: 13, color: COLORS.text.muted }}>
                {isListening ? "Listening..." : "Hold to speak"}
              </p>
            </motion.div>
          ) : (
            <TextInput
              key="text"
              value={textInput}
              onChange={setTextInput}
              onSend={handleTextSend}
              placeholder={`Ask ${persona.name} anything...`}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT COMPONENT FOR USE IN PERSONA PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export { EngageView };