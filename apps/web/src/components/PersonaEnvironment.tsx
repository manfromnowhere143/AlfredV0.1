"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   P E R S O N A   E N V I R O N M E N T
 *
 *   Dynamic, archetype-themed backgrounds that bring personas to life.
 *   Each archetype has a signature environment with parallax depth layers.
 *
 *   "The background should feel like the persona's natural habitat."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { EmotionState } from "./LivePersona";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PersonaArchetype =
  | "sage"
  | "hero"
  | "creator"
  | "caregiver"
  | "ruler"
  | "jester"
  | "rebel"
  | "lover"
  | "explorer"
  | "innocent"
  | "magician"
  | "outlaw";

interface EnvironmentTheme {
  name: string;
  gradients: string[];
  particles: ParticleConfig;
  ambientColor: string;
  glowColor: string;
  layers: LayerConfig[];
}

interface ParticleConfig {
  count: number;
  color: string;
  speed: number;
  size: [number, number];
  opacity: [number, number];
}

interface LayerConfig {
  type: "gradient" | "pattern" | "glow";
  parallaxFactor: number;
  opacity: number;
  content?: string;
}

interface PersonaEnvironmentProps {
  archetype?: PersonaArchetype;
  emotion?: EmotionState;
  isActive?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHETYPE THEMES
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPE_THEMES: Record<PersonaArchetype, EnvironmentTheme> = {
  sage: {
    name: "Ancient Library",
    gradients: [
      "radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
      "radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(15, 10, 30, 0.95) 0%, rgba(5, 5, 15, 1) 100%)",
    ],
    particles: {
      count: 30,
      color: "rgba(139, 92, 246, 0.6)",
      speed: 0.3,
      size: [2, 4],
      opacity: [0.2, 0.6],
    },
    ambientColor: "#1a0a2e",
    glowColor: "rgba(139, 92, 246, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.02, opacity: 1 },
      { type: "glow", parallaxFactor: 0.05, opacity: 0.5 },
    ],
  },
  hero: {
    name: "Mountain Summit",
    gradients: [
      "radial-gradient(ellipse at 50% 0%, rgba(251, 146, 60, 0.2) 0%, transparent 60%)",
      "radial-gradient(ellipse at 20% 100%, rgba(220, 38, 38, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(30, 20, 15, 0.9) 0%, rgba(10, 5, 5, 1) 100%)",
    ],
    particles: {
      count: 20,
      color: "rgba(251, 191, 36, 0.5)",
      speed: 0.8,
      size: [1, 3],
      opacity: [0.3, 0.7],
    },
    ambientColor: "#1a0f0a",
    glowColor: "rgba(251, 146, 60, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.03, opacity: 1 },
      { type: "glow", parallaxFactor: 0.06, opacity: 0.6 },
    ],
  },
  creator: {
    name: "Artist Studio",
    gradients: [
      "radial-gradient(ellipse at 60% 30%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
      "radial-gradient(ellipse at 30% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)",
      "radial-gradient(ellipse at 80% 60%, rgba(59, 130, 246, 0.1) 0%, transparent 40%)",
      "linear-gradient(180deg, rgba(25, 15, 25, 0.95) 0%, rgba(10, 5, 15, 1) 100%)",
    ],
    particles: {
      count: 40,
      color: "rgba(236, 72, 153, 0.5)",
      speed: 0.5,
      size: [2, 6],
      opacity: [0.2, 0.5],
    },
    ambientColor: "#1a0a1a",
    glowColor: "rgba(236, 72, 153, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.04, opacity: 1 },
      { type: "glow", parallaxFactor: 0.08, opacity: 0.4 },
    ],
  },
  caregiver: {
    name: "Warm Hearth",
    gradients: [
      "radial-gradient(ellipse at 50% 80%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)",
      "radial-gradient(ellipse at 50% 50%, rgba(234, 179, 8, 0.08) 0%, transparent 60%)",
      "linear-gradient(180deg, rgba(25, 20, 15, 0.9) 0%, rgba(15, 10, 5, 1) 100%)",
    ],
    particles: {
      count: 15,
      color: "rgba(251, 191, 36, 0.4)",
      speed: 0.2,
      size: [2, 5],
      opacity: [0.2, 0.4],
    },
    ambientColor: "#1a150a",
    glowColor: "rgba(251, 191, 36, 0.25)",
    layers: [
      { type: "gradient", parallaxFactor: 0.02, opacity: 1 },
      { type: "glow", parallaxFactor: 0.04, opacity: 0.5 },
    ],
  },
  ruler: {
    name: "Throne Room",
    gradients: [
      "radial-gradient(ellipse at 50% 20%, rgba(234, 179, 8, 0.2) 0%, transparent 50%)",
      "radial-gradient(ellipse at 50% 100%, rgba(120, 53, 15, 0.15) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(20, 15, 10, 0.95) 0%, rgba(5, 3, 2, 1) 100%)",
    ],
    particles: {
      count: 25,
      color: "rgba(234, 179, 8, 0.6)",
      speed: 0.15,
      size: [1, 3],
      opacity: [0.3, 0.6],
    },
    ambientColor: "#140f0a",
    glowColor: "rgba(234, 179, 8, 0.35)",
    layers: [
      { type: "gradient", parallaxFactor: 0.02, opacity: 1 },
      { type: "glow", parallaxFactor: 0.03, opacity: 0.6 },
    ],
  },
  jester: {
    name: "Carnival Night",
    gradients: [
      "radial-gradient(ellipse at 30% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 40%)",
      "radial-gradient(ellipse at 70% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 40%)",
      "radial-gradient(ellipse at 50% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 40%)",
      "linear-gradient(180deg, rgba(20, 10, 25, 0.95) 0%, rgba(5, 2, 10, 1) 100%)",
    ],
    particles: {
      count: 50,
      color: "rgba(255, 255, 255, 0.5)",
      speed: 1.2,
      size: [2, 5],
      opacity: [0.2, 0.6],
    },
    ambientColor: "#140a1a",
    glowColor: "rgba(236, 72, 153, 0.25)",
    layers: [
      { type: "gradient", parallaxFactor: 0.05, opacity: 1 },
      { type: "glow", parallaxFactor: 0.1, opacity: 0.4 },
    ],
  },
  rebel: {
    name: "Urban Night",
    gradients: [
      "radial-gradient(ellipse at 20% 80%, rgba(239, 68, 68, 0.12) 0%, transparent 50%)",
      "radial-gradient(ellipse at 80% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(15, 10, 15, 0.95) 0%, rgba(5, 2, 5, 1) 100%)",
    ],
    particles: {
      count: 35,
      color: "rgba(239, 68, 68, 0.5)",
      speed: 0.7,
      size: [1, 3],
      opacity: [0.2, 0.5],
    },
    ambientColor: "#0f0a0f",
    glowColor: "rgba(239, 68, 68, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.04, opacity: 1 },
      { type: "glow", parallaxFactor: 0.08, opacity: 0.5 },
    ],
  },
  lover: {
    name: "Twilight Garden",
    gradients: [
      "radial-gradient(ellipse at 40% 30%, rgba(244, 114, 182, 0.15) 0%, transparent 50%)",
      "radial-gradient(ellipse at 60% 70%, rgba(192, 132, 252, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(25, 15, 25, 0.9) 0%, rgba(10, 5, 15, 1) 100%)",
    ],
    particles: {
      count: 40,
      color: "rgba(244, 114, 182, 0.5)",
      speed: 0.25,
      size: [2, 4],
      opacity: [0.3, 0.6],
    },
    ambientColor: "#190f19",
    glowColor: "rgba(244, 114, 182, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.03, opacity: 1 },
      { type: "glow", parallaxFactor: 0.06, opacity: 0.5 },
    ],
  },
  explorer: {
    name: "Starlit Path",
    gradients: [
      "radial-gradient(ellipse at 70% 20%, rgba(34, 211, 238, 0.12) 0%, transparent 50%)",
      "radial-gradient(ellipse at 30% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(5, 15, 25, 0.95) 0%, rgba(2, 5, 10, 1) 100%)",
    ],
    particles: {
      count: 60,
      color: "rgba(255, 255, 255, 0.7)",
      speed: 0.1,
      size: [1, 2],
      opacity: [0.3, 0.8],
    },
    ambientColor: "#050f19",
    glowColor: "rgba(34, 211, 238, 0.25)",
    layers: [
      { type: "gradient", parallaxFactor: 0.02, opacity: 1 },
      { type: "glow", parallaxFactor: 0.04, opacity: 0.4 },
    ],
  },
  innocent: {
    name: "Sunny Meadow",
    gradients: [
      "radial-gradient(ellipse at 50% 10%, rgba(250, 204, 21, 0.15) 0%, transparent 50%)",
      "radial-gradient(ellipse at 50% 100%, rgba(74, 222, 128, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(25, 25, 20, 0.9) 0%, rgba(10, 10, 5, 1) 100%)",
    ],
    particles: {
      count: 25,
      color: "rgba(250, 204, 21, 0.5)",
      speed: 0.3,
      size: [2, 4],
      opacity: [0.3, 0.6],
    },
    ambientColor: "#191914",
    glowColor: "rgba(250, 204, 21, 0.3)",
    layers: [
      { type: "gradient", parallaxFactor: 0.02, opacity: 1 },
      { type: "glow", parallaxFactor: 0.04, opacity: 0.5 },
    ],
  },
  magician: {
    name: "Mystic Observatory",
    gradients: [
      "radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
      "radial-gradient(ellipse at 30% 70%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)",
      "radial-gradient(ellipse at 70% 60%, rgba(236, 72, 153, 0.08) 0%, transparent 40%)",
      "linear-gradient(180deg, rgba(10, 5, 20, 0.95) 0%, rgba(2, 1, 5, 1) 100%)",
    ],
    particles: {
      count: 45,
      color: "rgba(139, 92, 246, 0.6)",
      speed: 0.4,
      size: [1, 4],
      opacity: [0.2, 0.7],
    },
    ambientColor: "#0a0514",
    glowColor: "rgba(139, 92, 246, 0.35)",
    layers: [
      { type: "gradient", parallaxFactor: 0.03, opacity: 1 },
      { type: "glow", parallaxFactor: 0.07, opacity: 0.6 },
    ],
  },
  outlaw: {
    name: "Desert Canyon",
    gradients: [
      "radial-gradient(ellipse at 50% 30%, rgba(251, 146, 60, 0.12) 0%, transparent 50%)",
      "radial-gradient(ellipse at 50% 100%, rgba(120, 53, 15, 0.1) 0%, transparent 50%)",
      "linear-gradient(180deg, rgba(25, 15, 10, 0.95) 0%, rgba(10, 5, 2, 1) 100%)",
    ],
    particles: {
      count: 20,
      color: "rgba(251, 146, 60, 0.4)",
      speed: 0.6,
      size: [1, 3],
      opacity: [0.2, 0.4],
    },
    ambientColor: "#190f0a",
    glowColor: "rgba(251, 146, 60, 0.25)",
    layers: [
      { type: "gradient", parallaxFactor: 0.03, opacity: 1 },
      { type: "glow", parallaxFactor: 0.05, opacity: 0.4 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION COLOR MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_MODIFIERS: Record<EmotionState, { hueShift: number; saturation: number; brightness: number }> = {
  neutral: { hueShift: 0, saturation: 1, brightness: 1 },
  happy: { hueShift: 10, saturation: 1.2, brightness: 1.15 },
  sad: { hueShift: -20, saturation: 0.7, brightness: 0.85 },
  angry: { hueShift: -30, saturation: 1.3, brightness: 0.9 },
  surprised: { hueShift: 20, saturation: 1.1, brightness: 1.2 },
  thoughtful: { hueShift: 30, saturation: 0.9, brightness: 0.95 },
  excited: { hueShift: 15, saturation: 1.4, brightness: 1.25 },
  calm: { hueShift: 40, saturation: 0.8, brightness: 1.05 },
  confident: { hueShift: 5, saturation: 1.1, brightness: 1.1 },
  curious: { hueShift: 25, saturation: 1.05, brightness: 1.1 },
  concerned: { hueShift: -10, saturation: 0.85, brightness: 0.9 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ParticleProps {
  config: ParticleConfig;
  index: number;
}

function Particle({ config, index }: ParticleProps) {
  const size = useMemo(
    () => config.size[0] + Math.random() * (config.size[1] - config.size[0]),
    [config.size]
  );
  const opacity = useMemo(
    () => config.opacity[0] + Math.random() * (config.opacity[1] - config.opacity[0]),
    [config.opacity]
  );
  const initialX = useMemo(() => Math.random() * 100, []);
  const initialY = useMemo(() => Math.random() * 100, []);
  const duration = useMemo(() => 20 + Math.random() * 40, []);
  const delay = useMemo(() => Math.random() * 10, []);

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${initialX}%`,
        top: `${initialY}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: config.color,
        opacity,
        pointerEvents: "none",
      }}
      animate={{
        y: [0, -50 * config.speed, 0],
        x: [0, (Math.random() - 0.5) * 30, 0],
        opacity: [opacity, opacity * 1.5, opacity],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PersonaEnvironment({
  archetype = "sage",
  emotion = "neutral",
  isActive = true,
  className,
}: PersonaEnvironmentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Smooth mouse tracking
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Get theme with fallback
  const theme = ARCHETYPE_THEMES[archetype] || ARCHETYPE_THEMES.sage;
  const emotionMod = EMOTION_MODIFIERS[emotion] || EMOTION_MODIFIERS.neutral;

  // Handle mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Transform parallax values
  const layer1X = useTransform(smoothX, [0, 1], [-10, 10]);
  const layer1Y = useTransform(smoothY, [0, 1], [-10, 10]);
  const layer2X = useTransform(smoothX, [0, 1], [-20, 20]);
  const layer2Y = useTransform(smoothY, [0, 1], [-20, 20]);

  // Generate particles
  const particles = useMemo(() => {
    return Array.from({ length: theme.particles.count }, (_, i) => i);
  }, [theme.particles.count]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: theme.ambientColor,
        filter: `saturate(${emotionMod.saturation}) brightness(${emotionMod.brightness})`,
        transition: "filter 0.5s ease",
      }}
    >
      {/* Base gradient layers */}
      <motion.div
        style={{
          position: "absolute",
          inset: -20,
          x: layer1X,
          y: layer1Y,
        }}
      >
        {theme.gradients.map((gradient, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              background: gradient,
            }}
          />
        ))}
      </motion.div>

      {/* Ambient glow layer */}
      <motion.div
        style={{
          position: "absolute",
          inset: -40,
          x: layer2X,
          y: layer2Y,
          background: `radial-gradient(ellipse at 50% 50%, ${theme.glowColor} 0%, transparent 70%)`,
          opacity: 0.5,
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Particles */}
      {isActive && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {particles.map((i) => (
            <Particle key={i} config={theme.particles} index={i} />
          ))}
        </div>
      )}

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Noise texture overlay for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default PersonaEnvironment;
