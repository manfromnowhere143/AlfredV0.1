"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   C R E A T I O N   J O U R N E Y
 *
 *   "Forging a Soul" — A Cinematic Persona Creation Experience
 *
 *   5 Acts of Pure Magic:
 *   1. THE SPARK — Personality crystallizes from the void
 *   2. THE VISION — Portrait emerges from digital canvas
 *   3. THE EXPRESSIONS — Emotions breathe life into the image
 *   4. THE VOICE — Sound waves give power to speak
 *   5. THE AWAKENING — The persona opens its eyes
 *
 *   "Design is not just what it looks like. Design is how it works." — Steve Jobs
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Act = 1 | 2 | 3 | 4 | 5;

export interface CreationState {
  act: Act;
  phase: string;
  progress: number;
  // Act 1 data
  traits?: string[];
  personality?: string;
  // Act 2 data
  images?: string[];
  selectedImage?: number;
  // Act 3 data
  expressions?: Record<string, string>;
  // Act 4 data
  voiceId?: string;
  voiceSample?: string;
  // Act 5 data
  personaName?: string;
  greeting?: string;
}

interface CreationJourneyProps {
  personaId: string;
  personaName: string;
  archetype?: string;
  onComplete: (persona: any) => void;
  onCancel?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  void: "#000000",
  voidDeep: "#030304",
  voidSoft: "#0a0a0c",

  gold: "#FFD700",
  goldChampagne: "#C9B99A",
  goldWarm: "#D4AF37",
  goldGlow: "rgba(201, 185, 154, 0.4)",
  goldSubtle: "rgba(201, 185, 154, 0.15)",

  purple: "#8B5CF6",
  purpleGlow: "rgba(139, 92, 246, 0.4)",

  white: "#ffffff",
  silver: "#a1a1aa",
  mist: "rgba(255, 255, 255, 0.6)",
};

const ACT_TITLES = {
  1: { title: "The Spark", subtitle: "Personality Crystallizing" },
  2: { title: "The Vision", subtitle: "Portrait Emerging" },
  3: { title: "The Expressions", subtitle: "Emotions Awakening" },
  4: { title: "The Voice", subtitle: "Finding Their Sound" },
  5: { title: "The Awakening", subtitle: "Opening Their Eyes" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 1: THE SPARK — Personality Generation
// ═══════════════════════════════════════════════════════════════════════════════

function ActOneSpark({
  traits = [],
  progress = 0,
  phase
}: {
  traits?: string[];
  progress: number;
  phase: string;
}) {
  const [visibleTraits, setVisibleTraits] = useState<string[]>([]);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Reveal traits progressively
  useEffect(() => {
    if (traits.length > 0) {
      const interval = setInterval(() => {
        setVisibleTraits(prev => {
          if (prev.length < traits.length) {
            return [...prev, traits[prev.length]];
          }
          clearInterval(interval);
          return prev;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [traits]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Floating particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: colors.goldChampagne,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Central spark */}
      <motion.div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Core glow */}
        <motion.div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.goldGlow} 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner spark */}
        <motion.div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: colors.gold,
            boxShadow: `0 0 30px ${colors.gold}, 0 0 60px ${colors.goldChampagne}`,
          }}
          animate={{
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Orbiting traits */}
        <div style={{
          position: "absolute",
          width: 400,
          height: 400,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}>
          <AnimatePresence>
            {visibleTraits.map((trait, i) => {
              const angle = (i / Math.max(visibleTraits.length, 1)) * Math.PI * 2;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={trait}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: x + 200,
                    y: y + 200,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    padding: "8px 16px",
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: 20,
                    border: `1px solid ${colors.goldSubtle}`,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <span style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: colors.goldChampagne,
                  }}>
                    {trait}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Progress text */}
      <motion.p
        style={{
          position: "absolute",
          bottom: 60,
          fontSize: 14,
          color: colors.silver,
          letterSpacing: 2,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {phase === 'generating' ? 'CRYSTALLIZING PERSONALITY...' : 'SPARK IGNITED'}
      </motion.p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 2: THE VISION — Image Generation
// ═══════════════════════════════════════════════════════════════════════════════

function ActTwoVision({
  images = [],
  selectedImage,
  onSelect,
  phase,
  progress,
}: {
  images?: string[];
  selectedImage?: number;
  onSelect?: (index: number) => void;
  phase: string;
  progress: number;
}) {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);

  // Progressive card reveal
  useEffect(() => {
    if (images.length > 0) {
      images.forEach((_, i) => {
        setTimeout(() => {
          setRevealedCards(prev => [...prev, i]);
        }, i * 800);
      });
    }
  }, [images]);

  const cardPositions = [
    { x: -180, y: -120, rotate: -8 },
    { x: 180, y: -120, rotate: 8 },
    { x: -180, y: 120, rotate: -4 },
    { x: 180, y: 120, rotate: 4 },
  ];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Cards container */}
      <div style={{ position: "relative", width: 500, height: 400 }}>
        {[0, 1, 2, 3].map((i) => {
          const pos = cardPositions[i];
          const isRevealed = revealedCards.includes(i);
          const hasImage = images[i];
          const isSelected = selectedImage === i;

          return (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 160,
                height: 200,
                marginLeft: -80,
                marginTop: -100,
                borderRadius: 12,
                overflow: "hidden",
                cursor: phase === 'selecting' ? "pointer" : "default",
                border: isSelected ? `3px solid ${colors.gold}` : `1px solid ${colors.goldSubtle}`,
                boxShadow: isSelected
                  ? `0 0 40px ${colors.goldGlow}`
                  : "0 10px 40px rgba(0,0,0,0.5)",
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{
                x: pos.x,
                y: pos.y,
                opacity: 1,
                scale: isSelected ? 1.1 : 1,
                rotate: pos.rotate,
              }}
              whileHover={phase === 'selecting' ? { scale: 1.15, zIndex: 10 } : {}}
              transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
              onClick={() => phase === 'selecting' && onSelect?.(i)}
            >
              {/* Card background */}
              <div style={{
                width: "100%",
                height: "100%",
                background: `linear-gradient(135deg, ${colors.voidSoft}, ${colors.void})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {hasImage && isRevealed ? (
                  <motion.img
                    src={hasImage}
                    alt={`Variation ${i + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    initial={{ opacity: 0, filter: "blur(20px) saturate(0)" }}
                    animate={{ opacity: 1, filter: "blur(0px) saturate(1)" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                ) : (
                  <motion.div
                    style={{
                      width: "80%",
                      height: "80%",
                      background: `linear-gradient(45deg, ${colors.goldSubtle}, transparent)`,
                      borderRadius: 8,
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: colors.gold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.void} strokeWidth={3}>
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Status text */}
      <motion.p
        style={{
          position: "absolute",
          bottom: 60,
          fontSize: 14,
          color: colors.silver,
          letterSpacing: 2,
          textAlign: "center",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {phase === 'generating'
          ? `PAINTING PORTRAIT... ${Math.round(progress)}%`
          : phase === 'selecting'
          ? 'CHOOSE YOUR VISION'
          : 'VISION CAPTURED'}
      </motion.p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 3: THE EXPRESSIONS — Emotion Grid
// ═══════════════════════════════════════════════════════════════════════════════

function ActThreeExpressions({
  mainImage,
  expressions = {},
  phase,
  progress,
}: {
  mainImage?: string;
  expressions?: Record<string, string>;
  phase: string;
  progress: number;
}) {
  const emotionList = ['happy', 'sad', 'angry', 'surprised', 'thoughtful', 'calm'];
  const [currentEmotion, setCurrentEmotion] = useState(0);
  const [capturedEmotions, setCapturedEmotions] = useState<string[]>([]);

  // Cycle through emotions
  useEffect(() => {
    if (phase === 'generating') {
      const interval = setInterval(() => {
        setCurrentEmotion(prev => (prev + 1) % emotionList.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Capture emotions as they're generated
  useEffect(() => {
    const generated = Object.keys(expressions);
    setCapturedEmotions(generated);
  }, [expressions]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Central portrait */}
      <motion.div
        style={{
          position: "relative",
          width: 280,
          height: 280,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: `0 0 60px ${colors.purpleGlow}`,
        }}
        animate={{
          filter: phase === 'generating'
            ? [`hue-rotate(0deg)`, `hue-rotate(30deg)`, `hue-rotate(-30deg)`, `hue-rotate(0deg)`]
            : 'hue-rotate(0deg)',
        }}
        transition={{ duration: 3, repeat: phase === 'generating' ? Infinity : 0 }}
      >
        {mainImage ? (
          <img
            src={mainImage}
            alt="Portrait"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(135deg, ${colors.purple}, ${colors.voidSoft})`,
          }} />
        )}

        {/* Emotion overlay effect */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle, ${colors.purpleGlow}, transparent)`,
          }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Emotion indicators orbiting */}
      <div style={{
        position: "absolute",
        width: 500,
        height: 500,
      }}>
        {emotionList.map((emotion, i) => {
          const angle = (i / emotionList.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 220;
          const x = Math.cos(angle) * radius + 250;
          const y = Math.sin(angle) * radius + 250;
          const isCaptured = capturedEmotions.includes(emotion);
          const isCurrent = i === currentEmotion && phase === 'generating';

          return (
            <motion.div
              key={emotion}
              style={{
                position: "absolute",
                left: x - 50,
                top: y - 50,
                width: 100,
                height: 100,
                borderRadius: 12,
                overflow: "hidden",
                border: isCurrent
                  ? `2px solid ${colors.purple}`
                  : isCaptured
                  ? `2px solid ${colors.goldChampagne}`
                  : `1px solid ${colors.goldSubtle}`,
                boxShadow: isCurrent ? `0 0 30px ${colors.purpleGlow}` : "none",
              }}
              animate={{
                scale: isCurrent ? 1.1 : 1,
                opacity: isCaptured || isCurrent ? 1 : 0.4,
              }}
              transition={{ duration: 0.3 }}
            >
              {expressions[emotion] ? (
                <motion.img
                  src={expressions[emotion]}
                  alt={emotion}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : (
                <div style={{
                  width: "100%",
                  height: "100%",
                  background: colors.voidSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{
                    fontSize: 10,
                    color: colors.silver,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                    {emotion}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current emotion label */}
      <motion.div
        style={{
          position: "absolute",
          bottom: 80,
          padding: "12px 24px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 30,
          backdropFilter: "blur(10px)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentEmotion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: colors.white,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            {phase === 'generating' ? emotionList[currentEmotion] : 'EXPRESSIONS CAPTURED'}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 4: THE VOICE — Voice Configuration
// ═══════════════════════════════════════════════════════════════════════════════

function ActFourVoice({
  mainImage,
  voiceSample,
  phase,
  progress,
}: {
  mainImage?: string;
  voiceSample?: string;
  phase: string;
  progress: number;
}) {
  const [waveformBars] = useState(() =>
    Array.from({ length: 40 }, () => Math.random())
  );
  const [isPlaying, setIsPlaying] = useState(false);

  // Simulate voice sample playing
  useEffect(() => {
    if (voiceSample && phase === 'sampling') {
      setIsPlaying(true);
      const timer = setTimeout(() => setIsPlaying(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [voiceSample, phase]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
    }}>
      {/* Portrait with sound waves */}
      <div style={{ position: "relative" }}>
        {/* Sound wave rings */}
        <AnimatePresence>
          {(phase === 'sampling' || isPlaying) && [0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                border: `2px solid ${colors.goldChampagne}`,
              }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8 + i * 0.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </AnimatePresence>

        {/* Portrait */}
        <motion.div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: `0 0 40px ${colors.goldGlow}`,
          }}
          animate={{
            scale: isPlaying ? [1, 1.03, 1] : 1,
          }}
          transition={{ duration: 0.5, repeat: isPlaying ? Infinity : 0 }}
        >
          {mainImage ? (
            <img src={mainImage} alt="Portrait" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${colors.goldSubtle}, ${colors.voidSoft})`,
            }} />
          )}
        </motion.div>
      </div>

      {/* Waveform visualization */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        height: 60,
        padding: "0 40px",
      }}>
        {waveformBars.map((height, i) => (
          <motion.div
            key={i}
            style={{
              width: 4,
              background: `linear-gradient(to top, ${colors.goldChampagne}, ${colors.gold})`,
              borderRadius: 2,
            }}
            animate={{
              height: isPlaying
                ? [10, 20 + height * 40, 10]
                : phase === 'configuring'
                ? [5, 10 + height * 15, 5]
                : 10,
            }}
            transition={{
              duration: 0.3 + Math.random() * 0.2,
              delay: i * 0.02,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Status */}
      <motion.p
        style={{
          fontSize: 14,
          color: colors.silver,
          letterSpacing: 2,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {phase === 'configuring'
          ? 'TUNING VOICE...'
          : phase === 'sampling'
          ? 'FIRST WORDS...'
          : 'VOICE AWAKENED'}
      </motion.p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 5: THE AWAKENING — Grand Finale
// ═══════════════════════════════════════════════════════════════════════════════

function ActFiveAwakening({
  mainImage,
  personaName,
  greeting,
  phase,
  onComplete,
}: {
  mainImage?: string;
  personaName?: string;
  greeting?: string;
  phase: string;
  onComplete?: () => void;
}) {
  const [showName, setShowName] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [eyesOpen, setEyesOpen] = useState(false);

  useEffect(() => {
    if (phase === 'awakening') {
      // Sequence of reveals
      setTimeout(() => setEyesOpen(true), 1000);
      setTimeout(() => setShowName(true), 2000);
      setTimeout(() => setShowGreeting(true), 3500);
      setTimeout(() => onComplete?.(), 6000);
    }
  }, [phase, onComplete]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Particle burst effect */}
      {phase === 'awakening' && (
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 50 }).map((_, i) => {
            const angle = (i / 50) * Math.PI * 2;
            const distance = 300 + Math.random() * 200;
            return (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: colors.gold,
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </motion.div>
      )}

      {/* Main portal/portrait */}
      <motion.div
        style={{
          position: "relative",
          width: 320,
          height: 320,
          borderRadius: "50%",
          overflow: "hidden",
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: eyesOpen ? 1 : 0.9,
          opacity: 1,
        }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Glowing ring */}
        <motion.div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `4px solid ${colors.gold}`,
            boxShadow: `0 0 60px ${colors.goldGlow}, inset 0 0 60px ${colors.goldGlow}`,
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Portrait */}
        {mainImage && (
          <motion.img
            src={mainImage}
            alt={personaName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            animate={{
              filter: eyesOpen ? "brightness(1.1)" : "brightness(0.9)",
            }}
            transition={{ duration: 1 }}
          />
        )}

        {/* Eye opening effect */}
        {!eyesOpen && (
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
            }}
            animate={{ opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Name reveal */}
      <AnimatePresence>
        {showName && (
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            style={{
              marginTop: 40,
              fontSize: 48,
              fontWeight: 300,
              color: colors.white,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {personaName}
          </motion.h1>
        )}
      </AnimatePresence>

      {/* Greeting */}
      <AnimatePresence>
        {showGreeting && greeting && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 20,
              fontSize: 18,
              color: colors.mist,
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: 400,
            }}
          >
            "{greeting}"
          </motion.p>
        )}
      </AnimatePresence>

      {/* Awakened indicator */}
      <AnimatePresence>
        {eyesOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: "absolute",
              bottom: 60,
              padding: "12px 32px",
              background: colors.gold,
              borderRadius: 30,
            }}
          >
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.void,
              letterSpacing: 3,
            }}>
              AWAKENED
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT TITLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ActTitle({ act }: { act: Act }) {
  const { title, subtitle } = ACT_TITLES[act];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 100,
      }}
    >
      <motion.p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: colors.goldChampagne,
          letterSpacing: 4,
          marginBottom: 8,
        }}
      >
        ACT {act}
      </motion.p>
      <motion.h2
        style={{
          fontSize: 32,
          fontWeight: 200,
          color: colors.white,
          letterSpacing: 6,
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {title}
      </motion.h2>
      <motion.p
        style={{
          fontSize: 14,
          color: colors.silver,
          letterSpacing: 2,
          marginTop: 8,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {subtitle}
      </motion.p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CREATION JOURNEY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CreationJourney({
  personaId,
  personaName,
  archetype,
  onComplete,
  onCancel,
}: CreationJourneyProps) {
  const [state, setState] = useState<CreationState>({
    act: 1,
    phase: 'generating',
    progress: 0,
  });

  // Poll wizard API for progress
  useEffect(() => {
    let cancelled = false;
    let pollInterval: NodeJS.Timeout;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/personas/${personaId}/wizard?action=status`);
        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        // Map wizard step to act
        const stepToAct: Record<string, Act> = {
          'spark': 1,
          'visual': 2,
          'expressions': 3,
          'voice': 4,
          'mind': 5,
          'review': 5,
          'finalize': 5,
        };

        const act = stepToAct[data.step] || state.act;

        setState(prev => ({
          ...prev,
          act,
          phase: data.phase || 'generating',
          progress: data.progress || 0,
          traits: data.traits || prev.traits,
          images: data.images || prev.images,
          selectedImage: data.selectedImage ?? prev.selectedImage,
          expressions: data.expressions || prev.expressions,
          voiceId: data.voiceId || prev.voiceId,
          personaName: data.personaName || personaName,
          greeting: data.greeting || prev.greeting,
        }));

        // Check if complete
        if (data.status === 'complete') {
          clearInterval(pollInterval);
          onComplete(data.persona);
        }
      } catch (error) {
        console.error('[CreationJourney] Poll error:', error);
      }
    };

    pollInterval = setInterval(pollProgress, 2000);
    pollProgress(); // Initial poll

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [personaId, personaName, onComplete]);

  // Handle image selection
  const handleImageSelect = async (index: number) => {
    setState(prev => ({ ...prev, selectedImage: index, phase: 'complete' }));

    try {
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visual', selectedIndex: index }),
      });
    } catch (error) {
      console.error('[CreationJourney] Selection error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: colors.void,
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* Ambient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at center, ${colors.voidSoft} 0%, ${colors.void} 70%)`,
      }} />

      {/* Act title */}
      <AnimatePresence mode="wait">
        <ActTitle key={state.act} act={state.act} />
      </AnimatePresence>

      {/* Act content */}
      <AnimatePresence mode="wait">
        {state.act === 1 && (
          <motion.div
            key="act1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ActOneSpark
              traits={state.traits}
              progress={state.progress}
              phase={state.phase}
            />
          </motion.div>
        )}

        {state.act === 2 && (
          <motion.div
            key="act2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ActTwoVision
              images={state.images}
              selectedImage={state.selectedImage}
              onSelect={handleImageSelect}
              phase={state.phase}
              progress={state.progress}
            />
          </motion.div>
        )}

        {state.act === 3 && (
          <motion.div
            key="act3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ActThreeExpressions
              mainImage={state.images?.[state.selectedImage || 0]}
              expressions={state.expressions}
              phase={state.phase}
              progress={state.progress}
            />
          </motion.div>
        )}

        {state.act === 4 && (
          <motion.div
            key="act4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ActFourVoice
              mainImage={state.images?.[state.selectedImage || 0]}
              voiceSample={state.voiceId}
              phase={state.phase}
              progress={state.progress}
            />
          </motion.div>
        )}

        {state.act === 5 && (
          <motion.div
            key="act5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ActFiveAwakening
              mainImage={state.images?.[state.selectedImage || 0]}
              personaName={state.personaName}
              greeting={state.greeting}
              phase={state.phase}
              onComplete={() => onComplete(state)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div style={{
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 12,
      }}>
        {[1, 2, 3, 4, 5].map(act => (
          <motion.div
            key={act}
            style={{
              width: act === state.act ? 32 : 8,
              height: 8,
              borderRadius: 4,
              background: act <= state.act ? colors.goldChampagne : colors.goldSubtle,
            }}
            animate={{
              opacity: act === state.act ? [0.6, 1, 0.6] : 1,
            }}
            transition={{
              duration: 1.5,
              repeat: act === state.act ? Infinity : 0,
            }}
          />
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <motion.button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 8,
            color: colors.silver,
            fontSize: 14,
            cursor: "pointer",
          }}
          whileHover={{ background: "rgba(255,255,255,0.2)" }}
        >
          Cancel
        </motion.button>
      )}
    </motion.div>
  );
}

export default CreationJourney;
