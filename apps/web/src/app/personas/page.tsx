"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 *   P E R S O N A F O R G E   —   I M M E R S I V E
 * 
 *   A Steve Jobs level creation experience.
 *   Full-screen. Flowing. Breathtaking.
 *   
 *   Design Philosophy:
 *   • The screen IS the canvas
 *   • Typography as the hero
 *   • Negative space speaks
 *   • Every pixel intentional
 *   • Black. White. Nothing else.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import dynamic from "next/dynamic";

const AwakeningScene = dynamic(() => import("./AwakeningScene"), { ssr: false });
const EngageView = dynamic(() => import("./EngageView"), { ssr: false });
const PersonaChat = dynamic(() => import("@/components/PersonaChat"), { ssr: false });
const PersonaViewer = dynamic(() => import("@/components/PersonaViewer"), { ssr: false });
const CreationJourney = dynamic(() => import("@/components/CreationJourney").then(m => m.default), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Obsidian & Gold
// "Design is not just what it looks like. Design is how it works." — Steve Jobs
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  // Void - The Canvas (Grok-inspired deep blacks)
  void: "#000000",
  voidDeep: "#030304",
  voidSoft: "#0a0a0c",
  ink: "#0d0d0f",
  coal: "#121214",
  graphite: "#18181b",

  // Grays - Refined spectrum
  steel: "#27272a",
  zinc: "#3f3f46",
  silver: "#71717a",
  mist: "#a1a1aa",

  // Whites - Premium hierarchy
  pearl: "#d4d4d8",
  snow: "#f4f4f5",
  white: "#fafafa",
  pureWhite: "#ffffff",

  // Gold - Signature champagne (OpenAI-inspired warmth)
  gold: "#FFD700",
  goldChampagne: "#C9B99A",
  goldWarm: "#D4AF37",
  goldSoft: "#E8D5B7",
  goldGlow: "rgba(201, 185, 154, 0.35)",
  goldSubtle: "rgba(201, 185, 154, 0.12)",
  goldMicro: "rgba(201, 185, 154, 0.06)",

  // Premium surfaces (Grok-inspired glass)
  glass: "rgba(255,255,255,0.02)",
  glassLight: "rgba(255,255,255,0.04)",
  glassHover: "rgba(255,255,255,0.07)",
  glassFocus: "rgba(255,255,255,0.10)",

  // Borders - Subtle hierarchy
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.12)",
  borderActive: "rgba(255,255,255,0.18)",
  borderGold: "rgba(201, 185, 154, 0.25)",
  borderGoldActive: "rgba(201, 185, 154, 0.5)",

  // State colors - Refined
  success: "#22c55e",
  successGlow: "rgba(34, 197, 94, 0.2)",
  error: "#ef4444",
  errorGlow: "rgba(239, 68, 68, 0.2)",
};

// Premium easing - Apple/Grok-inspired fluidity
const ALFRED_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const ease = {
  // Core easings
  smooth: [0.4, 0, 0.2, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  alfred: [0.16, 1, 0.3, 1] as const,
  expo: [0.19, 1, 0.22, 1] as const,

  // Spring physics (Grok-style precision)
  spring: { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.8 },
  gentle: { type: "spring" as const, stiffness: 180, damping: 25, mass: 1 },
  bouncy: { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.5 },

  // Transition presets
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  medium: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

// Step names for the 5 Acts
const STEP_NAMES = ["Soul", "Essence", "Form", "Voice", "Mind"] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Archetype = 
  | "sage" | "hero" | "creator" | "caregiver" | "ruler" | "jester" 
  | "rebel" | "lover" | "explorer" | "innocent" | "magician" | "outlaw";

type View = "home" | "create" | "processing" | "awakening" | "persona" | "video";

interface Persona {
  id: string;
  name: string;
  description?: string;
  archetype: Archetype;
  traits: string[];
  imageUrl?: string;
  modelUrl?: string; // 3D GLB model URL for LIVING avatar
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPES: Record<Archetype, { name: string; essence: string }> = {
  sage: { name: "Sage", essence: "Wisdom" },
  hero: { name: "Hero", essence: "Courage" },
  creator: { name: "Creator", essence: "Vision" },
  caregiver: { name: "Caregiver", essence: "Compassion" },
  ruler: { name: "Ruler", essence: "Power" },
  jester: { name: "Jester", essence: "Joy" },
  rebel: { name: "Rebel", essence: "Freedom" },
  lover: { name: "Lover", essence: "Passion" },
  explorer: { name: "Explorer", essence: "Discovery" },
  innocent: { name: "Innocent", essence: "Hope" },
  magician: { name: "Magician", essence: "Transformation" },
  outlaw: { name: "Outlaw", essence: "Liberation" },
};

const STYLES = [
  { id: "hyper_realistic", name: "Photorealistic" },
  { id: "pixar_3d", name: "Pixar 3D" },
  { id: "anime_premium", name: "Anime" },
  { id: "fantasy_epic", name: "Fantasy" },
  { id: "arcane_stylized", name: "Arcane" },
  { id: "corporate_professional", name: "Professional" },
];

const TRAITS = [
  "Commanding", "Wise", "Elegant", "Mysterious", 
  "Playful", "Calm", "Fierce", "Nurturing",
  "Creative", "Analytical", "Empathetic", "Bold",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Step name with subtle animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: ease.expo }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: c.silver,
          }}>
            Act {current + 1}
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: c.goldChampagne,
            textShadow: `0 0 20px ${c.goldGlow}`,
          }}>
            {STEP_NAMES[current] || `Step ${current + 1}`}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Premium step indicator with connecting lines */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {Array.from({ length: total }).map((_, i) => {
          const isCompleted = i < current;
          const isCurrent = i === current;
          const isPending = i > current;

          return (
            <React.Fragment key={i}>
              {/* Dot */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1 : 0.85,
                  opacity: isPending ? 0.4 : 1,
                }}
                transition={ease.spring}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Outer ring */}
                <motion.div
                  animate={{
                    background: isCompleted
                      ? `linear-gradient(135deg, ${c.goldChampagne}, ${c.goldWarm})`
                      : isCurrent
                        ? "transparent"
                        : c.steel,
                    borderColor: isCurrent ? c.goldChampagne : "transparent",
                    boxShadow: isCurrent
                      ? `0 0 0 3px ${c.goldSubtle}, 0 0 20px ${c.goldGlow}`
                      : isCompleted
                        ? `0 0 12px ${c.goldGlow}`
                        : "none",
                  }}
                  transition={{ duration: 0.4, ease: ease.alfred }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    border: "2px solid transparent",
                  }}
                />

                {/* Inner pulse for current step */}
                {isCurrent && (
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{
                      position: "absolute",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: c.goldChampagne,
                    }}
                  />
                )}

                {/* Checkmark for completed */}
                {isCompleted && (
                  <motion.svg
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={ease.bouncy}
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={c.void}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: "absolute" }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                )}
              </motion.div>

              {/* Connecting line */}
              {i < total - 1 && (
                <div style={{
                  width: 32,
                  height: 2,
                  background: c.steel,
                  borderRadius: 1,
                  overflow: "hidden",
                  position: "relative",
                }}>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i < current ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: ease.alfred, delay: 0.1 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(90deg, ${c.goldChampagne}, ${c.goldWarm})`,
                      transformOrigin: "left",
                      boxShadow: `0 0 8px ${c.goldGlow}`,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FloatingLabel({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            fontSize: 11,
            fontWeight: 500,
            color: c.goldChampagne,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Premium ambient background with subtle gradients */
function PremiumBackground({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      overflow: "hidden",
    }}>
      {/* Ambient gradient orb - top right */}
      <div style={{
        position: "absolute",
        top: "-20%",
        right: "-10%",
        width: "60vw",
        height: "60vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c.goldSubtle} 0%, transparent 70%)`,
        filter: "blur(100px)",
        opacity: 0.3,
        pointerEvents: "none",
      }} />

      {/* Ambient gradient orb - bottom left */}
      <div style={{
        position: "absolute",
        bottom: "-30%",
        left: "-20%",
        width: "70vw",
        height: "70vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c.goldSubtle} 0%, transparent 60%)`,
        filter: "blur(120px)",
        opacity: 0.2,
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

/** OpenAI-style thinking dots animation */
function ThinkingDots({ text = "Processing" }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: c.goldChampagne,
            }}
          />
        ))}
      </div>
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: c.pearl,
        letterSpacing: 0.5,
      }}>
        {text}
      </span>
    </motion.div>
  );
}

/** Premium glass card component */
function GlassCard({
  children,
  selected = false,
  onClick,
  padding = "24px",
  style = {},
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  padding?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      whileHover={{
        scale: 1.02,
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      transition={ease.spring}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${c.goldSubtle}, ${c.goldMicro})`
          : c.glassLight,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${selected ? c.borderGoldActive : c.border}`,
        borderRadius: 16,
        padding,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: `border-color 0.3s ${ALFRED_EASE}, background 0.3s ${ALFRED_EASE}`,
        textAlign: "left",
        width: "100%",
        ...style,
      }}
    >
      {/* Inner highlight */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: selected
          ? `linear-gradient(180deg, ${c.goldMicro} 0%, transparent 50%)`
          : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%)",
        pointerEvents: "none",
        borderRadius: 15,
      }} />

      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute",
            inset: -1,
            background: `linear-gradient(135deg, ${c.goldGlow}, transparent 60%)`,
            borderRadius: 17,
            filter: "blur(8px)",
            zIndex: -1,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME VIEW — Minimal, impactful
// ═══════════════════════════════════════════════════════════════════════════════

function HomeView({ 
  personas, 
  loading,
  onNew, 
  onSelect,
  onVideo,
  onChat,
}: { 
  personas: Persona[];
  loading: boolean;
  onNew: () => void;
  onSelect: (p: Persona) => void;
  onVideo: (p: Persona) => void;
  onChat: (p: Persona) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: c.void,
      }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ color: c.white, fontSize: 14, letterSpacing: 4 }}
        >
          LOADING
        </motion.div>
      </div>
    );
  }

  // Empty state - dramatic full screen
  if (personas.length === 0) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: c.void,
        padding: 40,
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: ease.out }}
          style={{
            fontSize: "clamp(48px, 12vw, 120px)",
            fontWeight: 200,
            color: c.white,
            letterSpacing: -2,
            textAlign: "center",
            margin: 0,
          }}
        >
          PersonaForge
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            fontSize: 16,
            color: c.silver,
            marginTop: 24,
            marginBottom: 60,
            letterSpacing: 1,
          }}
        >
          Create AI characters that feel alive
        </motion.p>
        
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          style={{
            background: c.white,
            color: c.void,
            border: "none",
            padding: "18px 48px",
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 99,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Begin
        </motion.button>
      </div>
    );
  }

  // Gallery - clean grid
  return (
    <div style={{ minHeight: "100vh", background: c.void }}>
      {/* Header */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 40px",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(20px)",
        zIndex: 100,
      }}>
        <h1 style={{
          fontSize: 18,
          fontWeight: 500,
          color: c.white,
          margin: 0,
          letterSpacing: 1,
        }}>
          PersonaForge
        </h1>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          style={{
            background: c.white,
            color: c.void,
            border: "none",
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 99,
            cursor: "pointer",
          }}
        >
          New Persona
        </motion.button>
      </header>

      {/* Grid */}
      <div style={{
        padding: "120px 40px 60px",
        maxWidth: 1400,
        margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 24,
        }}>
          {personas.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(p)}
              style={{
                background: c.ink,
                borderRadius: 20,
                overflow: "hidden",
                cursor: "pointer",
                border: `1px solid ${hoveredId === p.id ? c.borderLight : c.border}`,
                transition: "border-color 0.3s ease",
              }}
            >
              {/* Avatar */}
              <div style={{
                aspectRatio: "1",
                background: c.graphite,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}>
                {p.imageUrl ? (
                  <img 
                    src={p.imageUrl} 
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: 72,
                    fontWeight: 200,
                    color: c.steel,
                  }}>
                    {p.name[0]}
                  </span>
                )}
                
                {/* Hover overlay */}
                <motion.div
                  initial={false}
                  animate={{ opacity: hoveredId === p.id ? 1 : 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{
                    color: c.white,
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}>
                    Engage
                  </span>
                </motion.div>
              </div>
              
              {/* Info */}
              <div style={{ padding: 24 }}>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: c.white,
                  margin: 0,
                }}>
                  {p.name}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: c.silver,
                  margin: "8px 0 0",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}>
                  {ARCHETYPES[p.archetype]?.name || p.archetype}
                </p>
                
                {/* Action buttons */}
                <div style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: `1px solid ${c.border}`,
                }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); onVideo(p); }}
                    style={{
                      flex: 1,
                      background: c.white,
                      color: c.void,
                      border: "none",
                      borderRadius: 99,
                      padding: "12px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="14" height="14" rx="2" />
                      <path d="M16 9l6-3v12l-6-3" />
                    </svg>
                    Video
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); onChat(p); }}
                    style={{
                      width: 44,
                      height: 44,
                      background: c.graphite,
                      color: c.white,
                      border: `1px solid ${c.border}`,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE FLOW — Full-screen immersive experience
// ═══════════════════════════════════════════════════════════════════════════════

function CreateFlow({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (p: Persona) => void; 
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [style, setStyle] = useState("hyper_realistic");
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [skipVoice, setSkipVoice] = useState(false);
  const [traits, setTraits] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API state
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Cinematic processing state
  const [showProcessing, setShowProcessing] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<
    'spark' | 'vision' | 'expressions' | 'voice' | 'mind' | 'awakening' | 'complete'
  >('spark');

  // Phase config for cinematic display
  const PHASE_CONFIG = {
    spark: { act: 'I', title: 'The Spark', subtitle: 'Crystallizing personality...' },
    vision: { act: 'II', title: 'The Vision', subtitle: 'Generating state-of-the-art imagery...' },
    expressions: { act: 'III', title: 'The Expressions', subtitle: 'Capturing emotional range...' },
    voice: { act: 'IV', title: 'The Voice', subtitle: 'Tuning vocal resonance...' },
    mind: { act: 'V', title: 'The Mind', subtitle: 'Weaving consciousness...' },
    awakening: { act: 'VI', title: 'The Awakening', subtitle: 'Opening their eyes...' },
    complete: { act: '✓', title: 'Manifesting', subtitle: 'Your persona awaits' },
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice presets from ElevenLabs
  const VOICE_PRESETS = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm & professional" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Bold & confident" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft & gentle" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Deep & thoughtful" },
    { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Bright & energetic" },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Calm & articulate" },
  ];

  // Focus input on step change
  useEffect(() => {
    if (step === 0) inputRef.current?.focus();
    if (step === 1) textareaRef.current?.focus();
  }, [step]);

  // 5 Acts: Soul → Essence → Form → Voice → Mind
  const canProceed = [
    name.length >= 2 && archetype !== null,  // Act 1: Soul (Name + Archetype)
    true,                                      // Act 2: Essence (Style - always has default)
    selectedImage !== null,                    // Act 3: Form (Image selection)
    selectedVoice !== null || skipVoice,       // Act 4: Voice (Voice selection or skip)
    traits.length >= 2,                        // Act 5: Mind (Traits)
  ][step];

  // Step handlers
  const handleStep0Complete = async () => {
    if (!name || !archetype) return;
    setLoading(true);
    setError(null);
    
    // Ensure description is not empty (backend requires it)
    const finalDescription = description.trim() || `A ${ARCHETYPES[archetype].name.toLowerCase()} persona named ${name}`;
    
    try {
      // Create persona
      const createRes = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, archetype, description: finalDescription }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);
      
      setPersonaId(createData.persona.id);
      
      // Start wizard
      const startRes = await fetch(`/api/personas/${createData.persona.id}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error);
      
      setSessionId(startData.data.id);
      
      // Spark
      await fetch(`/api/personas/${createData.persona.id}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "spark", 
          sessionId: startData.data.id, 
          data: { name, description: finalDescription, archetype } 
        }),
      });
      
      setStep(1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true);
    setError(null);

    // Show cinematic processing overlay - start immediately with vision phase
    setShowProcessing(true);
    setProcessingPhase('vision');

    try {
      // Start image generation
      const res = await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-variations",
          sessionId,
          data: { stylePreset: style, count: 4 }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Show completion briefly
      setProcessingPhase('complete');
      await new Promise(r => setTimeout(r, 1500));

      setImages(data.data.variations.map((v: { imageUrl: string }) => v.imageUrl));
      setShowProcessing(false);
      setStep(2);
    } catch (err: unknown) {
      setShowProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLockImage = async () => {
    if (!personaId || !sessionId || selectedImage === null) return;
    setLoading(true);

    // Show expressions processing
    setShowProcessing(true);
    setProcessingPhase('expressions');

    try {
      const response = await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock-identity",
          sessionId,
          data: { chosenIndex: selectedImage }
        }),
      });

      const result = await response.json();

      // CRITICAL: Check for success
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Lock identity failed: ${response.status}`);
      }

      console.log('[Wizard] Identity locked successfully:', result.data?.visualDNA?.primaryImageUrl?.substring(0, 50));

      // Brief complete animation
      setProcessingPhase('complete');
      await new Promise(r => setTimeout(r, 1000));

      setShowProcessing(false);
      setStep(3); // Move to Voice step
    } catch (err: unknown) {
      setShowProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to lock identity";
      console.error('[Wizard] Lock identity error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceConfig = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true);

    // Show voice processing
    setShowProcessing(true);
    setProcessingPhase('voice');

    try {
      if (skipVoice) {
        await new Promise(r => setTimeout(r, 800)); // Brief animation
        await fetch(`/api/personas/${personaId}/wizard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "skip-voice", sessionId }),
        });
      } else if (selectedVoice) {
        await fetch(`/api/personas/${personaId}/wizard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "configure-voice",
            sessionId,
            data: {
              provider: "elevenlabs",
              mode: "preset",
              presetId: selectedVoice,
            },
          }),
        });
      }

      // Brief complete animation
      setProcessingPhase('complete');
      await new Promise(r => setTimeout(r, 800));

      setShowProcessing(false);
      setStep(4); // Move to Mind step
    } catch (err: unknown) {
      setShowProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to configure voice";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true);

    const finalDescription = description.trim() || `A ${ARCHETYPES[archetype!].name.toLowerCase()} persona named ${name}`;

    // Show mind processing
    setShowProcessing(true);
    setProcessingPhase('mind');

    try {
      // Configure mind
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure-mind",
          sessionId,
          data: { traits, communicationStyle: "friendly" }
        }),
      });

      // Transition to awakening phase
      setProcessingPhase('awakening');
      await new Promise(r => setTimeout(r, 1500));

      // Finalize
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", sessionId }),
      });

      // Final complete animation
      setProcessingPhase('complete');
      await new Promise(r => setTimeout(r, 1200));

      setShowProcessing(false);
      onComplete({
        id: personaId,
        name,
        description: finalDescription,
        archetype: archetype!,
        traits,
        imageUrl: images[selectedImage!],
      });
    } catch (err: unknown) {
      setShowProcessing(false);
      const errorMessage = err instanceof Error ? err.message : "Failed to finalize";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const proceed = () => {
    if (step === 0) handleStep0Complete();       // Soul → Essence
    else if (step === 1) handleGenerateImages(); // Essence → Form
    else if (step === 2) handleLockImage();      // Form → Voice
    else if (step === 3) handleVoiceConfig();    // Voice → Mind
    else if (step === 4) handleFinalize();       // Mind → Awaken
  };

  const goBack = () => {
    if (step === 0) onCancel();
    else setStep(step - 1);
  };

  return (
    <PremiumBackground>
      {/* ═══════════════════════════════════════════════════════════════════════
          CINEMATIC PROCESSING OVERLAY — The Magic Happens Here
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: "fixed",
              inset: 0,
              background: c.void,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Ambient orbs */}
            <div style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}>
              <motion.div
                animate={{
                  x: [0, 100, 0],
                  y: [0, -50, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "30%",
                  width: "40vw",
                  height: "40vw",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${c.goldGlow} 0%, transparent 70%)`,
                  filter: "blur(60px)",
                }}
              />
              <motion.div
                animate={{
                  x: [0, -80, 0],
                  y: [0, 80, 0],
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  bottom: "10%",
                  right: "20%",
                  width: "50vw",
                  height: "50vw",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)`,
                  filter: "blur(80px)",
                }}
              />
            </div>

            {/* Phase indicator */}
            <AnimatePresence mode="wait">
              <motion.div
                key={processingPhase}
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
                transition={{ duration: 0.6, ease: ease.expo }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                {/* Act number */}
                <motion.span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: c.goldChampagne,
                  }}
                >
                  Act {PHASE_CONFIG[processingPhase].act}
                </motion.span>

                {/* Phase title */}
                <motion.h1
                  style={{
                    fontSize: 56,
                    fontWeight: 200,
                    letterSpacing: -1,
                    color: c.white,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {PHASE_CONFIG[processingPhase].title}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  style={{
                    fontSize: 16,
                    fontWeight: 400,
                    color: c.silver,
                    margin: 0,
                    letterSpacing: 1,
                  }}
                >
                  {PHASE_CONFIG[processingPhase].subtitle}
                </motion.p>

                {/* Animated element based on phase */}
                <div style={{ marginTop: 48, position: "relative" }}>
                  {processingPhase === 'spark' && (
                    <>
                      {/* Central spark core */}
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          background: `radial-gradient(circle, ${c.goldChampagne} 0%, ${c.goldWarm} 40%, transparent 70%)`,
                          boxShadow: `0 0 60px ${c.goldGlow}, 0 0 120px ${c.goldGlow}`,
                        }}
                      />
                      {/* Orbiting traits */}
                      {(traits.length > 0 ? traits : ['Wisdom', 'Grace', 'Power']).slice(0, 5).map((trait, i) => (
                        <motion.div
                          key={trait}
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 8 + i * 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: 200 + i * 40,
                            height: 200 + i * 40,
                            marginTop: -(100 + i * 20),
                            marginLeft: -(100 + i * 20),
                          }}
                        >
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontSize: 12,
                              fontWeight: 500,
                              letterSpacing: 2,
                              textTransform: "uppercase",
                              color: c.goldChampagne,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {trait}
                          </motion.span>
                        </motion.div>
                      ))}
                    </>
                  )}

                  {processingPhase === 'vision' && (
                    <>
                      {/* Canvas frame */}
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                          width: 280,
                          height: 280,
                          borderRadius: 24,
                          border: `1px solid ${c.borderGold}`,
                          background: c.coal,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Scanning lines */}
                        <motion.div
                          animate={{ y: ["-100%", "200%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: `linear-gradient(180deg, transparent 0%, ${c.goldGlow} 50%, transparent 100%)`,
                            opacity: 0.5,
                          }}
                        />
                        {/* Grid pattern */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          backgroundImage: `linear-gradient(${c.border} 1px, transparent 1px), linear-gradient(90deg, ${c.border} 1px, transparent 1px)`,
                          backgroundSize: "20px 20px",
                          opacity: 0.3,
                        }} />
                        {/* Corner markers */}
                        {[
                          { top: 16, left: 16 },
                          { top: 16, right: 16 },
                          { bottom: 16, left: 16 },
                          { bottom: 16, right: 16 },
                        ].map((pos, i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            style={{
                              position: "absolute",
                              ...pos,
                              width: 12,
                              height: 12,
                              borderColor: c.goldChampagne,
                              borderWidth: 2,
                              borderStyle: "solid",
                              borderRadius: 2,
                              borderTop: i < 2 ? undefined : "none",
                              borderBottom: i >= 2 ? undefined : "none",
                              borderLeft: i % 2 === 0 ? undefined : "none",
                              borderRight: i % 2 !== 0 ? undefined : "none",
                            }}
                          />
                        ))}
                        {/* Center text */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              letterSpacing: 3,
                              textTransform: "uppercase",
                              color: c.goldChampagne,
                            }}
                          >
                            Rendering...
                          </motion.span>
                        </div>
                      </motion.div>
                      {/* Progress indicator */}
                      <motion.div
                        style={{
                          marginTop: 24,
                          width: 280,
                          height: 2,
                          background: c.steel,
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          style={{
                            width: "50%",
                            height: "100%",
                            background: `linear-gradient(90deg, transparent, ${c.goldChampagne}, transparent)`,
                          }}
                        />
                      </motion.div>
                    </>
                  )}

                  {/* EXPRESSIONS - Live persona image with emotional overlays */}
                  {processingPhase === 'expressions' && (
                    <div style={{ position: "relative", width: 320, height: 320 }}>
                      {/* Actual persona image */}
                      <motion.div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 220,
                          height: 220,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: `0 0 80px ${c.goldGlow}, 0 0 120px ${c.goldSubtle}`,
                        }}
                      >
                        {/* The actual generated persona image */}
                        {images[selectedImage!] && (
                          <motion.img
                            src={images[selectedImage!]}
                            alt="Your persona"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            animate={{
                              filter: [
                                "brightness(1) saturate(1)",
                                "brightness(1.2) saturate(1.3)",
                                "brightness(0.9) saturate(0.8)",
                                "brightness(1.1) saturate(1.1)",
                                "brightness(1) saturate(1)",
                              ],
                              scale: [1, 1.02, 0.98, 1.01, 1],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}

                        {/* Emotional color overlays cycling through */}
                        <motion.div
                          animate={{
                            background: [
                              "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
                              "radial-gradient(circle, rgba(100,149,237,0.3) 0%, transparent 70%)",
                              "radial-gradient(circle, rgba(255,105,180,0.3) 0%, transparent 70%)",
                              "radial-gradient(circle, rgba(144,238,144,0.3) 0%, transparent 70%)",
                              "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
                            ],
                            opacity: [0.5, 0.7, 0.5, 0.7, 0.5],
                          }}
                          transition={{ duration: 5, repeat: Infinity }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                          }}
                        />

                        {/* Scanning light effect */}
                        <motion.div
                          animate={{ y: ["-100%", "200%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            height: "30%",
                            background: `linear-gradient(180deg, transparent, ${c.goldChampagne}44, transparent)`,
                            pointerEvents: "none",
                          }}
                        />
                      </motion.div>

                      {/* Golden ring border */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 230,
                          height: 230,
                          borderRadius: "50%",
                          border: `3px solid ${c.goldChampagne}`,
                          borderTopColor: c.goldWarm,
                          borderRightColor: "transparent",
                        }}
                      />

                      {/* Emotion labels appearing around the face */}
                      {["Joy", "Calm", "Curious", "Confident", "Thoughtful"].map((emotion, i) => (
                        <motion.div
                          key={emotion}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1, 1, 0.5],
                            x: 160 + Math.cos((i / 5) * Math.PI * 2 - Math.PI / 2) * 130,
                            y: 160 + Math.sin((i / 5) * Math.PI * 2 - Math.PI / 2) * 130,
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            delay: i * 0.8,
                            ease: "easeInOut",
                          }}
                          style={{
                            position: "absolute",
                            padding: "6px 14px",
                            background: "rgba(0,0,0,0.7)",
                            border: `1px solid ${c.goldChampagne}`,
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            color: c.goldChampagne,
                            backdropFilter: "blur(8px)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {emotion}
                        </motion.div>
                      ))}

                      {/* Floating sparkle particles */}
                      {Array.from({ length: 15 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            x: [160, 160 + (Math.random() - 0.5) * 200],
                            y: [160, 160 + (Math.random() - 0.5) * 200],
                            scale: [0, 1.5, 0],
                            opacity: [0, 0.8, 0],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: i * 0.25,
                          }}
                          style={{
                            position: "absolute",
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: c.goldChampagne,
                            boxShadow: `0 0 8px ${c.goldChampagne}`,
                          }}
                        />
                      ))}

                      {/* Pulsing aura rings */}
                      {[0, 1, 2].map((ring) => (
                        <motion.div
                          key={ring}
                          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: ring * 0.7 }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 220,
                            height: 220,
                            borderRadius: "50%",
                            border: `2px solid ${c.goldChampagne}`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* VOICE - Cinematic sound waves from silhouette */}
                  {processingPhase === 'voice' && (
                    <div style={{ position: "relative", width: 350, height: 200 }}>
                      {/* Central silhouette */}
                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 80,
                          height: 100,
                          borderRadius: "50% 50% 45% 45%",
                          background: `linear-gradient(180deg, ${c.goldChampagne} 0%, ${c.goldWarm} 100%)`,
                          boxShadow: `0 0 40px ${c.goldGlow}`,
                        }}
                      />
                      {/* Sound waves emanating outward */}
                      {Array.from({ length: 8 }).map((_, wave) => (
                        <React.Fragment key={wave}>
                          {/* Left waves */}
                          <motion.div
                            initial={{ x: 175, scaleX: 0, opacity: 0 }}
                            animate={{
                              x: [175, 20],
                              scaleX: [0, 1],
                              opacity: [0, 0.8, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: wave * 0.15,
                              ease: "easeOut",
                            }}
                            style={{
                              position: "absolute",
                              top: 80 + (wave - 4) * 8,
                              width: 60,
                              height: 3,
                              background: `linear-gradient(90deg, transparent, ${c.goldChampagne})`,
                              borderRadius: 2,
                            }}
                          />
                          {/* Right waves */}
                          <motion.div
                            initial={{ x: 175, scaleX: 0, opacity: 0 }}
                            animate={{
                              x: [175, 270],
                              scaleX: [0, 1],
                              opacity: [0, 0.8, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: wave * 0.15,
                              ease: "easeOut",
                            }}
                            style={{
                              position: "absolute",
                              top: 80 + (wave - 4) * 8,
                              width: 60,
                              height: 3,
                              background: `linear-gradient(270deg, transparent, ${c.goldChampagne})`,
                              borderRadius: 2,
                            }}
                          />
                        </React.Fragment>
                      ))}
                      {/* Floating musical notes as particles */}
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={`note-${i}`}
                          initial={{ y: 150, opacity: 0 }}
                          animate={{
                            y: [150, -50],
                            x: [175 + (i - 6) * 25, 175 + (i - 6) * 35 + Math.sin(i) * 20],
                            opacity: [0, 1, 0],
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.25,
                          }}
                          style={{
                            position: "absolute",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: c.goldChampagne,
                            boxShadow: `0 0 10px ${c.goldGlow}`,
                          }}
                        />
                      ))}
                      {/* Waveform at bottom */}
                      <div style={{
                        position: "absolute",
                        bottom: 10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}>
                        {Array.from({ length: 30 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: [4, 20 + Math.sin(i * 0.5) * 15, 4],
                            }}
                            transition={{
                              duration: 0.4,
                              repeat: Infinity,
                              delay: i * 0.03,
                            }}
                            style={{
                              width: 3,
                              background: c.goldChampagne,
                              borderRadius: 2,
                              opacity: 0.6,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MIND - Epic neural network with synapses firing */}
                  {processingPhase === 'mind' && (
                    <div style={{ position: "relative", width: 320, height: 320 }}>
                      {/* Central consciousness orb */}
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 1],
                          boxShadow: [
                            `0 0 40px ${c.goldGlow}`,
                            `0 0 80px ${c.goldGlow}, 0 0 120px ${c.goldSubtle}`,
                            `0 0 40px ${c.goldGlow}`,
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 80,
                          height: 80,
                          borderRadius: "50%",
                          background: `radial-gradient(circle, ${c.white} 0%, ${c.goldChampagne} 30%, ${c.goldWarm} 100%)`,
                        }}
                      />
                      {/* Neural pathway connections - firing synapses */}
                      {Array.from({ length: 16 }).map((_, i) => {
                        const angle = (i / 16) * Math.PI * 2;
                        const startX = 160;
                        const startY = 160;
                        const endX = startX + Math.cos(angle) * 130;
                        const endY = startY + Math.sin(angle) * 130;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                              opacity: [0, 1, 0],
                              scale: [0, 1, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                            style={{
                              position: "absolute",
                              left: startX,
                              top: startY,
                              width: 2,
                              height: 90,
                              background: `linear-gradient(to bottom, ${c.goldChampagne}, transparent)`,
                              transformOrigin: "top",
                              transform: `rotate(${angle + Math.PI / 2}rad)`,
                            }}
                          />
                        );
                      })}
                      {/* Outer neuron nodes */}
                      {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (i / 8) * Math.PI * 2;
                        return (
                          <motion.div
                            key={`node-${i}`}
                            animate={{
                              scale: [0.8, 1.2, 0.8],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                            style={{
                              position: "absolute",
                              left: 160 + Math.cos(angle) * 120 - 12,
                              top: 160 + Math.sin(angle) * 120 - 12,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: c.goldChampagne,
                              boxShadow: `0 0 20px ${c.goldGlow}`,
                            }}
                          />
                        );
                      })}
                      {/* Thought particles flowing inward */}
                      {Array.from({ length: 24 }).map((_, i) => {
                        const angle = (i / 24) * Math.PI * 2;
                        return (
                          <motion.div
                            key={`particle-${i}`}
                            initial={{
                              x: 160 + Math.cos(angle) * 150,
                              y: 160 + Math.sin(angle) * 150,
                              opacity: 0,
                              scale: 0,
                            }}
                            animate={{
                              x: [160 + Math.cos(angle) * 150, 160],
                              y: [160 + Math.sin(angle) * 150, 160],
                              opacity: [0, 1, 0],
                              scale: [0, 1, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                            style={{
                              position: "absolute",
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: c.goldChampagne,
                            }}
                          />
                        );
                      })}
                      {/* Inner rotating ring */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 180,
                          height: 180,
                          borderRadius: "50%",
                          border: `1px dashed ${c.goldChampagne}44`,
                        }}
                      />
                    </div>
                  )}

                  {/* AWAKENING - Epic eye opening with light burst */}
                  {processingPhase === 'awakening' && (
                    <div style={{ position: "relative", width: 350, height: 250 }}>
                      {/* Light rays bursting outward */}
                      {Array.from({ length: 24 }).map((_, i) => {
                        const angle = (i / 24) * Math.PI * 2;
                        return (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: [0, 1.5],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              duration: 2,
                              delay: 1.5 + i * 0.05,
                              repeat: Infinity,
                              repeatDelay: 3,
                            }}
                            style={{
                              position: "absolute",
                              left: 175,
                              top: 125,
                              width: 3,
                              height: 120,
                              background: `linear-gradient(to bottom, ${c.goldChampagne}, transparent)`,
                              transformOrigin: "top",
                              transform: `rotate(${angle}rad)`,
                            }}
                          />
                        );
                      })}
                      {/* Particle explosion */}
                      {Array.from({ length: 40 }).map((_, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 50 + Math.random() * 100;
                        return (
                          <motion.div
                            key={`p-${i}`}
                            initial={{
                              x: 175,
                              y: 125,
                              scale: 0,
                              opacity: 0,
                            }}
                            animate={{
                              x: 175 + Math.cos(angle) * distance,
                              y: 125 + Math.sin(angle) * distance,
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              delay: 1.8 + Math.random() * 0.5,
                              repeat: Infinity,
                              repeatDelay: 3.5,
                            }}
                            style={{
                              position: "absolute",
                              width: 4 + Math.random() * 6,
                              height: 4 + Math.random() * 6,
                              borderRadius: "50%",
                              background: i % 2 === 0 ? c.goldChampagne : c.white,
                            }}
                          />
                        );
                      })}
                      {/* The Eye - dramatic reveal */}
                      <motion.div
                        initial={{ scaleY: 0.05 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 220,
                          height: 110,
                          borderRadius: "50%",
                          background: c.white,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          boxShadow: `0 0 80px ${c.goldGlow}, 0 0 120px ${c.goldSubtle}`,
                        }}
                      >
                        {/* Iris with detailed pattern */}
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.8, duration: 1, type: "spring", stiffness: 200 }}
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: `radial-gradient(circle, ${c.goldChampagne} 0%, ${c.goldWarm} 50%, #8B4513 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: `inset 0 0 20px rgba(0,0,0,0.3)`,
                          }}
                        >
                          {/* Iris pattern lines */}
                          {Array.from({ length: 12 }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.3 }}
                              transition={{ delay: 1 + i * 0.05 }}
                              style={{
                                position: "absolute",
                                width: 1,
                                height: 35,
                                background: c.void,
                                transform: `rotate(${i * 30}deg)`,
                                transformOrigin: "center",
                              }}
                            />
                          ))}
                          {/* Pupil */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [1, 0.7, 1] }}
                            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
                            style={{
                              width: 35,
                              height: 35,
                              borderRadius: "50%",
                              background: c.void,
                              boxShadow: `0 0 10px ${c.void}`,
                            }}
                          >
                            {/* Light reflection */}
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.5 }}
                              style={{
                                position: "absolute",
                                top: 5,
                                left: 8,
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: c.white,
                                opacity: 0.8,
                              }}
                            />
                          </motion.div>
                        </motion.div>
                      </motion.div>
                      {/* Eyelid shadows */}
                      <motion.div
                        initial={{ scaleY: 1 }}
                        animate={{ scaleY: 0 }}
                        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "25%",
                          transform: "translate(-50%, 0)",
                          width: 240,
                          height: 60,
                          background: c.void,
                          borderRadius: "0 0 50% 50%",
                          transformOrigin: "top",
                        }}
                      />
                      <motion.div
                        initial={{ scaleY: 1 }}
                        animate={{ scaleY: 0 }}
                        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: "25%",
                          transform: "translate(-50%, 0)",
                          width: 240,
                          height: 60,
                          background: c.void,
                          borderRadius: "50% 50% 0 0",
                          transformOrigin: "bottom",
                        }}
                      />
                    </div>
                  )}

                  {/* COMPLETE - Checkmark */}
                  {processingPhase === 'complete' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${c.goldChampagne}, ${c.goldWarm})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 0 60px ${c.goldGlow}`,
                      }}
                    >
                      <motion.svg
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={c.void}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <motion.polyline
                          points="20 6 9 17 4 12"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                        />
                      </motion.svg>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Persona name at bottom */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                position: "absolute",
                bottom: 60,
                left: 0,
                right: 0,
                textAlign: "center",
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: c.silver,
              }}>
                Forging
              </span>
              <motion.h2
                style={{
                  fontSize: 28,
                  fontWeight: 300,
                  color: c.white,
                  margin: "8px 0 0",
                  letterSpacing: 2,
                }}
              >
                {name}
              </motion.h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Top bar - premium minimal */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 48px",
          flexShrink: 0,
        }}>
          <motion.button
            whileHover={{ opacity: 0.7, x: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={goBack}
            transition={ease.fast}
            style={{
              background: "none",
              border: "none",
              color: c.mist,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: 0.5,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {step === 0 ? "Cancel" : "Back"}
          </motion.button>

          <ProgressDots current={step} total={5} />

          <div style={{ width: 80 }} />
        </div>

        {/* Error display - premium style */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={ease.medium}
              style={{
                position: "absolute",
                top: 100,
                left: "50%",
                transform: "translateX(-50%)",
                background: c.errorGlow,
                backdropFilter: "blur(20px)",
                border: `1px solid ${c.error}33`,
                borderRadius: 16,
                padding: "14px 28px",
                color: c.error,
                fontSize: 14,
                fontWeight: 500,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 48px 140px",
          overflow: "auto",
        }}>
        <AnimatePresence mode="wait">
          {/* STEP 0: Soul - Identity & Archetype */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: ease.expo }}
              style={{
                width: "100%",
                maxWidth: 640,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Premium headline */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.1 }}
                style={{
                  fontSize: "clamp(36px, 7vw, 56px)",
                  fontWeight: 200,
                  color: c.pureWhite,
                  margin: "0 0 16px",
                  textAlign: "center",
                  letterSpacing: -1,
                  lineHeight: 1.1,
                }}
              >
                Who are you creating?
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.2 }}
                style={{
                  fontSize: 16,
                  color: c.silver,
                  margin: "0 0 56px",
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
              >
                Give your persona a name and choose their archetype
              </motion.p>
              
              {/* Name input */}
              <div style={{ width: "100%", marginBottom: 40, position: "relative" }}>
                <FloatingLabel visible={name.length > 0}>Name</FloatingLabel>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${name.length > 0 ? c.goldChampagne : c.steel}`,
                    padding: "16px 0",
                    fontSize: 24,
                    fontWeight: 300,
                    color: c.white,
                    outline: "none",
                    transition: "border-color 0.3s ease",
                    caretColor: c.goldChampagne,
                  }}
                  onFocus={(e) => e.target.style.borderColor = c.goldChampagne}
                  onBlur={(e) => e.target.style.borderColor = name.length > 0 ? c.goldChampagne : c.steel}
                />
              </div>
              
              {/* Description (optional) */}
              <div style={{ width: "100%", marginBottom: 48, position: "relative" }}>
                <FloatingLabel visible={description.length > 0}>Description</FloatingLabel>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe their personality (optional)"
                  rows={2}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${c.steel}`,
                    padding: "16px 0",
                    fontSize: 18,
                    fontWeight: 300,
                    color: c.white,
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
              </div>
              
              {/* Archetype selection - Premium grid */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.3 }}
                style={{
                  fontSize: 11,
                  color: c.mist,
                  marginBottom: 20,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Choose an archetype
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.35 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                  width: "100%",
                }}
              >
                {(Object.keys(ARCHETYPES) as Archetype[]).map((key, idx) => {
                  const selected = archetype === key;
                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: ease.expo, delay: 0.4 + idx * 0.03 }}
                      whileHover={{
                        scale: 1.04,
                        y: -3,
                      }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setArchetype(key)}
                      style={{
                        background: selected
                          ? `linear-gradient(145deg, ${c.goldSubtle}, ${c.goldMicro})`
                          : c.glassLight,
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        color: selected ? c.goldSoft : c.pearl,
                        border: `1px solid ${selected ? c.borderGoldActive : c.border}`,
                        borderRadius: 14,
                        padding: "18px 10px",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: `all 0.35s ${ALFRED_EASE}`,
                        boxShadow: selected
                          ? `0 8px 24px ${c.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`
                          : "inset 0 1px 0 rgba(255,255,255,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Inner highlight */}
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: selected
                          ? `linear-gradient(180deg, ${c.goldMicro} 0%, transparent 40%)`
                          : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)",
                        borderRadius: 13,
                        pointerEvents: "none",
                      }} />

                      <span style={{
                        fontWeight: 600,
                        fontSize: 13,
                        position: "relative",
                        zIndex: 1,
                      }}>
                        {ARCHETYPES[key].name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: selected ? c.goldChampagne : c.silver,
                        opacity: selected ? 1 : 0.6,
                        position: "relative",
                        zIndex: 1,
                        letterSpacing: 0.5,
                      }}>
                        {ARCHETYPES[key].essence}
                      </span>

                      {/* Selection indicator */}
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={ease.bouncy}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: c.goldChampagne,
                            boxShadow: `0 0 8px ${c.goldGlow}`,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 1: Essence - Visual Style */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: ease.expo }}
              style={{
                width: "100%",
                maxWidth: 720,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Premium headline */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.1 }}
                style={{
                  fontSize: "clamp(36px, 7vw, 56px)",
                  fontWeight: 200,
                  color: c.pureWhite,
                  margin: "0 0 16px",
                  textAlign: "center",
                  letterSpacing: -1,
                  lineHeight: 1.1,
                }}
              >
                Choose their essence
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.2 }}
                style={{
                  fontSize: 16,
                  color: c.silver,
                  margin: "0 0 56px",
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
              >
                Select a visual style for {name || "your persona"}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.3 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 14,
                  width: "100%",
                }}
              >
                {STYLES.map((s, idx) => {
                  const selected = style === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: ease.expo, delay: 0.35 + idx * 0.05 }}
                      whileHover={{ scale: 1.04, y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setStyle(s.id)}
                      style={{
                        background: selected
                          ? `linear-gradient(145deg, ${c.goldSubtle}, ${c.goldMicro})`
                          : c.glassLight,
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        color: selected ? c.goldSoft : c.white,
                        border: `1px solid ${selected ? c.borderGoldActive : c.border}`,
                        borderRadius: 18,
                        padding: "40px 24px",
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: `all 0.35s ${ALFRED_EASE}`,
                        boxShadow: selected
                          ? `0 12px 32px ${c.goldGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`
                          : "inset 0 1px 0 rgba(255,255,255,0.04)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Inner gradient */}
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: selected
                          ? `linear-gradient(180deg, ${c.goldMicro} 0%, transparent 50%)`
                          : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%)",
                        borderRadius: 17,
                        pointerEvents: "none",
                      }} />

                      <span style={{ position: "relative", zIndex: 1, letterSpacing: 0.3 }}>
                        {s.name}
                      </span>

                      {/* Selection indicator */}
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={ease.bouncy}
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: c.goldChampagne,
                            boxShadow: `0 0 12px ${c.goldGlow}`,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: Form - Image Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: ease.expo }}
              style={{
                width: "100%",
                maxWidth: 520,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Premium headline with name */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.1 }}
                style={{
                  fontSize: "clamp(36px, 7vw, 56px)",
                  fontWeight: 200,
                  color: c.pureWhite,
                  margin: "0 0 12px",
                  textAlign: "center",
                  letterSpacing: -1,
                  lineHeight: 1.1,
                }}
              >
                {name}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.2 }}
                style={{
                  fontSize: 16,
                  color: c.silver,
                  margin: "0 0 48px",
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
              >
                Choose their physical form
              </motion.p>

              {/* Image grid with premium selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.3 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                  width: "100%",
                  maxWidth: 420,
                }}
              >
                {images.map((url, i) => {
                  const selected = selectedImage === i;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: ease.expo, delay: 0.35 + i * 0.08 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedImage(i)}
                      style={{
                        aspectRatio: "1",
                        background: c.coal,
                        border: `2px solid ${selected ? c.goldChampagne : c.border}`,
                        borderRadius: 20,
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        position: "relative",
                        boxShadow: selected
                          ? `0 12px 40px ${c.goldGlow}, 0 0 0 1px ${c.goldChampagne}`
                          : "0 4px 20px rgba(0,0,0,0.3)",
                        transition: `all 0.35s ${ALFRED_EASE}`,
                      }}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={`Option ${i + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `linear-gradient(145deg, ${c.coal}, ${c.graphite})`,
                          color: c.zinc,
                          fontSize: 56,
                          fontWeight: 200,
                        }}>
                          {name[0]}
                        </div>
                      )}

                      {/* Selection overlay & checkmark */}
                      {selected && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)",
                              pointerEvents: "none",
                            }}
                          />
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={ease.bouncy}
                            style={{
                              position: "absolute",
                              top: 14,
                              right: 14,
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${c.goldChampagne}, ${c.goldWarm})`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 6px 20px ${c.goldGlow}`,
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.void} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Regenerate button - premium style */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: ease.expo, delay: 0.6 }}
                whileHover={{ scale: 1.02, opacity: 0.9 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateImages}
                disabled={loading}
                style={{
                  background: c.glassLight,
                  border: `1px solid ${c.border}`,
                  borderRadius: 99,
                  padding: "12px 24px",
                  color: c.pearl,
                  fontSize: 13,
                  fontWeight: 500,
                  marginTop: 36,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: loading ? 0.5 : 1,
                  letterSpacing: 0.3,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Regenerate
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: Voice */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 16px",
                textAlign: "center",
              }}>
                Give {name} a voice
              </h2>

              <p style={{
                fontSize: 16,
                color: c.silver,
                marginBottom: 48,
              }}>
                Select a voice or skip for text-only
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                width: "100%",
                marginBottom: 32,
              }}>
                {VOICE_PRESETS.map((voice) => {
                  const isSelected = selectedVoice === voice.id && !skipVoice;
                  return (
                    <motion.button
                      key={voice.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedVoice(voice.id);
                        setSkipVoice(false);
                      }}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${c.goldChampagne}22, ${c.goldChampagne}11)`
                          : c.graphite,
                        color: isSelected ? c.goldChampagne : c.white,
                        border: `1px solid ${isSelected ? c.goldChampagne : c.border}`,
                        borderRadius: 16,
                        padding: "24px 20px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🎤</div>
                      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                        {voice.name}
                      </div>
                      <div style={{ fontSize: 12, color: c.silver }}>
                        {voice.description}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Skip voice option */}
              <motion.button
                whileHover={{ opacity: 0.8 }}
                onClick={() => {
                  setSkipVoice(true);
                  setSelectedVoice(null);
                }}
                style={{
                  background: skipVoice ? c.graphite : "transparent",
                  border: `1px solid ${skipVoice ? c.borderLight : c.border}`,
                  borderRadius: 99,
                  padding: "12px 24px",
                  color: skipVoice ? c.white : c.silver,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  <path d="M12 6c1.657 0 3 1.343 3 3v2c0 1.657-1.343 3-3 3s-3-1.343-3-3V9c0-1.657 1.343-3 3-3z" />
                </svg>
                Skip voice (text-only)
              </motion.button>
            </motion.div>
          )}

          {/* STEP 4: Mind (Personality) */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 16px",
                textAlign: "center",
              }}>
                Define {name}&apos;s mind
              </h2>

              <p style={{
                fontSize: 16,
                color: c.silver,
                marginBottom: 48,
              }}>
                Select 2-4 personality traits
              </p>
              
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
              }}>
                {TRAITS.map((trait) => {
                  const selected = traits.includes(trait);
                  return (
                    <motion.button
                      key={trait}
                      whileHover={{
                        scale: 1.05,
                        boxShadow: selected ? `0 0 20px ${c.goldGlow}` : `0 4px 15px rgba(0,0,0,0.3)`,
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (selected) {
                          setTraits(traits.filter(t => t !== trait));
                        } else if (traits.length < 4) {
                          setTraits([...traits, trait]);
                        }
                      }}
                      style={{
                        background: selected
                          ? `linear-gradient(135deg, ${c.goldChampagne}, ${c.goldWarm})`
                          : "rgba(10, 10, 11, 0.6)",
                        backdropFilter: "blur(10px)",
                        color: selected ? c.void : c.pearl,
                        border: `1px solid ${selected ? c.goldChampagne : c.border}`,
                        borderRadius: 99,
                        padding: "14px 28px",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
                        boxShadow: selected ? `0 4px 15px ${c.goldGlow}` : "none",
                      }}
                    >
                      {trait}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        {/* Bottom action - Premium floating bar */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "32px 48px 48px",
          display: "flex",
          justifyContent: "center",
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <motion.button
            whileHover={{
              scale: canProceed && !loading ? 1.03 : 1,
              y: canProceed && !loading ? -2 : 0,
            }}
            whileTap={{ scale: canProceed && !loading ? 0.97 : 1 }}
            onClick={proceed}
            disabled={!canProceed || loading}
            transition={ease.spring}
            style={{
              pointerEvents: "auto",
              background: canProceed
                ? `linear-gradient(135deg, ${c.goldChampagne} 0%, ${c.goldWarm} 100%)`
                : c.steel,
              color: canProceed ? c.void : c.silver,
              border: "none",
              padding: "20px 72px",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 0.5,
              borderRadius: 99,
              cursor: canProceed && !loading ? "pointer" : "not-allowed",
              transition: `background 0.4s ${ALFRED_EASE}, opacity 0.3s ease`,
              boxShadow: canProceed
                ? `0 8px 32px ${c.goldGlow}, 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
                : "0 4px 12px rgba(0,0,0,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Shimmer effect on hover */}
            {canProceed && !loading && (
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                whileHover={{ x: "200%", opacity: 0.3 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  pointerEvents: "none",
                }}
              />
            )}

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div style={{ display: "flex", gap: 3 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -4, 0],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut",
                        }}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: c.void,
                        }}
                      />
                    ))}
                  </div>
                  <span>
                    {step === 0 ? "Creating soul..." : step === 1 ? "Generating visuals..." : "Processing..."}
                  </span>
                </motion.div>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {step === 4 ? "Awaken ✨" : "Continue"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </PremiumBackground>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA VIEW — Engage with your creation
// ═══════════════════════════════════════════════════════════════════════════════

function PersonaView({ 
  persona, 
  onBack 
}: { 
  persona: Persona; 
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Hello. I am ${persona.name}. How may I assist you?`
    }]);
  }, [persona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMessage }]);
    setTyping(true);
    
    try {
      const res = await fetch(`/api/personas/${persona.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages(m => [...m, { 
        role: "assistant", 
        content: data.response || "I understand. Let me think about that." 
      }]);
    } catch {
      setMessages(m => [...m, { 
        role: "assistant", 
        content: "I apologize, I'm having trouble responding." 
      }]);
    }
    
    setTyping(false);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 24px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <motion.button
          whileHover={{ opacity: 0.7 }}
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: c.silver,
            padding: 8,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>
        
        {/* Avatar */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: c.graphite,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {persona.imageUrl ? (
            <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, color: c.steel }}>{persona.name[0]}</span>
          )}
        </div>
        
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: c.white }}>
            {persona.name}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: c.silver }}>
            {ARCHETYPES[persona.archetype]?.name}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: 24,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 16,
              }}
            >
              <div style={{
                maxWidth: "75%",
                padding: "14px 20px",
                borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                background: m.role === "user" ? c.white : c.graphite,
                color: m.role === "user" ? c.void : c.white,
              }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{m.content}</p>
              </div>
            </motion.div>
          ))}
          
          {typing && (
            <div style={{ display: "flex", marginBottom: 16 }}>
              <div style={{
                padding: "14px 20px",
                borderRadius: "20px 20px 20px 4px",
                background: c.graphite,
                display: "flex",
                gap: 6,
              }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.silver,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 24px 32px",
        borderTop: `1px solid ${c.border}`,
      }}>
        <div style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          gap: 12,
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${persona.name}...`}
            style={{
              flex: 1,
              background: c.graphite,
              border: `1px solid ${c.border}`,
              borderRadius: 99,
              padding: "14px 24px",
              fontSize: 15,
              color: c.white,
              outline: "none",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={send}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? c.white : c.graphite,
              border: "none",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() ? "pointer" : "default",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={input.trim() ? c.void : c.steel}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STUDIO — Create videos with your persona
// ═══════════════════════════════════════════════════════════════════════════════

function VideoStudio({ 
  persona, 
  onBack 
}: { 
  persona: Persona; 
  onBack: () => void;
}) {
  const [script, setScript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  const generate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    
    // Simulate video generation
    await new Promise(r => setTimeout(r, 3000));
    
    setVideoReady(true);
    setGenerating(false);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 24px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <motion.button
          whileHover={{ opacity: 0.7 }}
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: c.silver,
            padding: 8,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>
        
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: c.graphite,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {persona.imageUrl ? (
            <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, color: c.steel }}>{persona.name[0]}</span>
          )}
        </div>
        
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: c.white }}>
            Video Studio
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: c.silver }}>
            {persona.name}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        background: c.border,
      }}>
        {/* Script panel */}
        <div style={{
          background: c.void,
          padding: 32,
          display: "flex",
          flexDirection: "column",
        }}>
          <label style={{
            fontSize: 12,
            fontWeight: 500,
            color: c.silver,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Script
          </label>
          
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write what you want your persona to say..."
            style={{
              flex: 1,
              background: c.graphite,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              padding: 24,
              fontSize: 16,
              lineHeight: 1.7,
              color: c.white,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generate}
              disabled={!script.trim() || generating}
              style={{
                flex: 1,
                background: script.trim() && !generating ? c.white : c.steel,
                color: script.trim() && !generating ? c.void : c.silver,
                border: "none",
                borderRadius: 99,
                padding: "16px 32px",
                fontSize: 15,
                fontWeight: 600,
                cursor: script.trim() && !generating ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ◐
                  </motion.span>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                  </svg>
                  Generate Video
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Preview panel */}
        <div style={{
          background: c.ink,
          padding: 32,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: c.silver,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              Preview
            </label>
            {videoReady && (
              <span style={{ fontSize: 12, color: c.silver }}>
                0:15 • 1080p
              </span>
            )}
          </div>
          
          {/* Video preview area */}
          <div style={{
            flex: 1,
            background: c.graphite,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {generating ? (
              <div style={{ textAlign: "center" }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ fontSize: 32, marginBottom: 16 }}
                >
                  ◐
                </motion.div>
                <p style={{ color: c.silver, fontSize: 14 }}>Creating your video...</p>
              </div>
            ) : videoReady ? (
              <>
                {/* Video preview with persona */}
                <div style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: c.steel,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {persona.imageUrl ? (
                    <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 72, fontWeight: 200, color: c.mist }}>
                      {persona.name[0]}
                    </span>
                  )}
                </div>
                
                {/* Play button overlay */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlaying(!playing)}
                  style={{
                    position: "absolute",
                    bottom: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: c.white,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {playing ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={c.void}>
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={c.void}>
                      <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                    </svg>
                  )}
                </motion.button>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c.steel} strokeWidth="1.5">
                  <rect x="2" y="5" width="14" height="14" rx="2" />
                  <path d="M16 9l6-3v12l-6-3" />
                </svg>
                <p style={{ color: c.silver, fontSize: 14, marginTop: 16 }}>
                  Write a script to generate a video
                </p>
              </div>
            )}
          </div>
          
          {/* Download button */}
          {videoReady && (
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  background: c.white,
                  color: c.void,
                  border: "none",
                  borderRadius: 99,
                  padding: "16px 32px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setVideoReady(false); setScript(""); }}
                style={{
                  background: c.graphite,
                  color: c.white,
                  border: `1px solid ${c.border}`,
                  borderRadius: 99,
                  padding: "16px 24px",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                New
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function PersonaForgePage() {
  const [view, setView] = useState<View>("home");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [newPersona, setNewPersona] = useState<Persona | null>(null);
  const [processingData, setProcessingData] = useState<{ id: string; name: string; archetype: string } | null>(null);

  useEffect(() => {
    fetch("/api/personas")
      .then(res => {
        if (!res.ok) {
          console.error('[PersonaForge] API error:', res.status, res.statusText);
        }
        return res.json();
      })
      .then(data => {
        console.log('[PersonaForge] Loaded personas:', data.personas?.length || 0);
        if (data.personas) setPersonas(data.personas);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PersonaForge] Fetch error:', err);
        setLoading(false);
      });
  }, []);

  const handleCreate = (p: Persona) => {
    // Skip CreationJourney (it polls for status which doesn't work)
    // The epic animations are already shown inline in CreateFlow
    setNewPersona(p);
    setView("awakening"); // Go directly to awakening
  };

  const handleProcessingComplete = (persona: any) => {
    // Update newPersona with any data from processing (like new images)
    if (persona.imageUrl) {
      setNewPersona(prev => prev ? { ...prev, imageUrl: persona.imageUrl } : null);
    }
    setView("awakening");
  };

  const handleAwakeningComplete = () => {
    if (newPersona) {
      setPersonas([newPersona, ...personas]);
      setSelected(newPersona);
      setNewPersona(null);
    }
    setProcessingData(null);
    setView("home");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: c.void,
      color: c.white,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <AnimatePresence mode="wait">
        {view === "processing" && processingData && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
          >
            <CreationJourney
              personaId={processingData.id}
              personaName={processingData.name}
              archetype={processingData.archetype}
              onComplete={handleProcessingComplete}
              onCancel={() => {
                setProcessingData(null);
                setNewPersona(null);
                setView("home");
              }}
            />
          </motion.div>
        )}

        {view === "awakening" && newPersona && (
          <AwakeningScene
            key="awakening"
            persona={newPersona}
            onComplete={handleAwakeningComplete}
            onSkip={handleAwakeningComplete}
          />
        )}

        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomeView
              personas={personas}
              loading={loading}
              onNew={() => setView("create")}
              onSelect={(p) => { setSelected(p); setView("persona"); }}
              onVideo={(p) => { setSelected(p); setView("video"); }}
              onChat={(p) => { setSelected(p); setView("persona"); }}
            />
          </motion.div>
        )}
        
        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CreateFlow
              onComplete={handleCreate}
              onCancel={() => setView("home")}
            />
          </motion.div>
        )}
        
        {view === "video" && selected && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VideoStudio
              persona={selected}
              onBack={() => setView("home")}
            />
          </motion.div>
        )}
        
        {view === "persona" && selected && (
          <motion.div
            key="persona"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EngageView
              persona={selected}
              onClose={() => setView("home")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}