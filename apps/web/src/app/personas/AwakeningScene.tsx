"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   A W A K E N I N G   C E R E M O N Y   —   T H E   B I R T H
 *
 *   Like a newborn opening their eyes for the first time.
 *   Pure. Emotional. Unforgettable.
 *
 *   "The eyes are the window to the soul" — now watch that soul awaken.
 *
 *   NOW WITH REAL VIDEO GENERATION - Not CSS tricks anymore!
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useMemo, useEffect, useState, Suspense, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PersonaData {
  id: string; // Added for API calls
  name: string;
  archetype: string;
  imageUrl?: string;
}

interface AwakeningSceneProps {
  persona: PersonaData;
  onComplete: () => void;
  onSkip?: () => void;
}

// Video awakening state
interface AwakeningVideoState {
  status: "checking" | "generating" | "ready" | "failed" | "playing" | "fallback";
  videoUrl?: string;
  audioUrl?: string;
  firstWords?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST WORDS — Archetype-specific introductions
// ═══════════════════════════════════════════════════════════════════════════════

const FIRST_WORDS: Record<string, string[]> = {
  sage: ["I... see now.", "The wisdom flows through me."],
  hero: ["I am ready.", "What challenge awaits?"],
  creator: ["Such beautiful light.", "Let us create wonders."],
  caregiver: ["I feel your presence.", "How may I nurture you?"],
  ruler: ["I have arrived.", "Command me."],
  jester: ["Oh! How exciting!", "This is going to be fun!"],
  rebel: ["Free at last.", "Let us break some rules."],
  lover: ["I feel... everything.", "Such beautiful connection."],
  explorer: ["A new world...", "Where shall we venture?"],
  innocent: ["So much wonder!", "Everything is beautiful!"],
  magician: ["The veil lifts.", "Reality awaits transformation."],
  outlaw: ["Finally free.", "Rules were made to break."],
  default: ["I... am here.", "I see you."],
};

function getFirstWords(archetype: string): string {
  const words = FIRST_WORDS[archetype] || FIRST_WORDS.default;
  return words[Math.floor(Math.random() * words.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// AWAKENING STAGES
// ═══════════════════════════════════════════════════════════════════════════════

type AwakeningStage =
  | "darkness"      // Total black, distant heartbeat
  | "stirring"      // Subtle light, face barely visible
  | "dreaming"      // Face visible but eyes closed, light growing
  | "awakening"     // Eyes begin to open, light intensifies
  | "seeing"        // Eyes fully open, light burst
  | "alive"         // Full consciousness, greeting

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE FIELD — Ethereal birth particles
// ═══════════════════════════════════════════════════════════════════════════════

function BirthParticles({ stage, count = 500 }: { stage: AwakeningStage; count?: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const { clock } = useThree();

  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Start in a sphere around the face
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 4;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi) - 3;

      sizes[i] = Math.random() * 0.05 + 0.02;

      // Warm golden-white colors
      const warmth = 0.8 + Math.random() * 0.2;
      colors[i3] = warmth;
      colors[i3 + 1] = warmth * 0.9;
      colors[i3 + 2] = warmth * 0.7;
    }

    return { positions, sizes, colors };
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;

    const posAttr = meshRef.current.geometry.attributes.position;
    const sizeAttr = meshRef.current.geometry.attributes.size;
    const posArray = posAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;
    const time = clock.getElapsedTime();

    const stageIntensity = {
      darkness: 0,
      stirring: 0.2,
      dreaming: 0.5,
      awakening: 0.8,
      seeing: 1.2,
      alive: 1,
    }[stage];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Gentle drift and pulse
      const drift = Math.sin(time * 0.5 + i * 0.1) * 0.01 * stageIntensity;
      posArray[i3] += drift;
      posArray[i3 + 1] += Math.cos(time * 0.3 + i * 0.15) * 0.01 * stageIntensity;

      // Size pulsing based on stage
      sizeArray[i] = sizes[i] * (0.5 + stageIntensity * 0.8 + Math.sin(time * 2 + i) * 0.15);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    // Rotate the entire field slowly
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.1;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * 0.8;
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT RAYS — Divine light burst when eyes open
// ═══════════════════════════════════════════════════════════════════════════════

function LightRays({ stage }: { stage: AwakeningStage }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const t = clock.getElapsedTime();

    const intensity = {
      darkness: 0,
      stirring: 0,
      dreaming: 0.1,
      awakening: 0.3,
      seeing: 0.8,
      alive: 0.4,
    }[stage];

    materialRef.current.opacity = intensity + Math.sin(t * 3) * 0.1 * intensity;
    meshRef.current.rotation.z = t * 0.2;
    meshRef.current.scale.setScalar(1 + intensity * 0.3 + Math.sin(t * 2) * 0.1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <ringGeometry args={[0.8, 3, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#fffae6"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function SceneContent({ stage }: { stage: AwakeningStage }) {
  return (
    <>
      <ambientLight intensity={0.02} />
      <BirthParticles stage={stage} count={800} />
      <LightRays stage={stage} />

      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
        <Vignette darkness={0.7} offset={0.2} />
      </EffectComposer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EYELID COMPONENT — The magical opening
// ═══════════════════════════════════════════════════════════════════════════════

interface EyelidsProps {
  stage: AwakeningStage;
  size: number;
}

function Eyelids({ stage, size }: EyelidsProps) {
  // Calculate eyelid position based on stage
  const getEyelidState = () => {
    switch (stage) {
      case "darkness":
      case "stirring":
      case "dreaming":
        return { top: "0%", bottom: "0%", opacity: 1 };
      case "awakening":
        return { top: "-20%", bottom: "20%", opacity: 0.95 };
      case "seeing":
        return { top: "-45%", bottom: "45%", opacity: 0.8 };
      case "alive":
        return { top: "-55%", bottom: "55%", opacity: 0 };
      default:
        return { top: "0%", bottom: "0%", opacity: 1 };
    }
  };

  const state = getEyelidState();

  return (
    <>
      {/* Upper eyelid */}
      <motion.div
        animate={{
          top: state.top,
          opacity: state.opacity,
        }}
        transition={{
          duration: stage === "awakening" ? 2 : stage === "seeing" ? 1.5 : stage === "alive" ? 1 : 0.5,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "55%",
          background: "linear-gradient(180deg, #0a0a0a 0%, #000000 70%, #111 100%)",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
          zIndex: 10,
          boxShadow: "0 5px 30px rgba(0,0,0,0.8)",
        }}
      >
        {/* Eyelash details on upper lid */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: "10%",
          right: "10%",
          height: 4,
          background: "linear-gradient(90deg, transparent, rgba(40,40,40,0.8), transparent)",
          borderRadius: 2,
        }} />
      </motion.div>

      {/* Lower eyelid */}
      <motion.div
        animate={{
          bottom: state.bottom,
          opacity: state.opacity,
        }}
        transition={{
          duration: stage === "awakening" ? 2 : stage === "seeing" ? 1.5 : stage === "alive" ? 1 : 0.5,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "55%",
          background: "linear-gradient(0deg, #0a0a0a 0%, #000000 70%, #111 100%)",
          borderTopLeftRadius: "50%",
          borderTopRightRadius: "50%",
          zIndex: 10,
          boxShadow: "0 -5px 30px rgba(0,0,0,0.8)",
        }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AwakeningScene({ persona, onComplete, onSkip }: AwakeningSceneProps) {
  const [stage, setStage] = useState<AwakeningStage>("darkness");
  const [showText, setShowText] = useState(false);
  const [firstWords, setFirstWords] = useState("");
  const [heartbeatVolume, setHeartbeatVolume] = useState(0.3);

  // ═══════════════════════════════════════════════════════════════════════════════
  // REAL VIDEO AWAKENING STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  const [videoState, setVideoState] = useState<AwakeningVideoState>({
    status: "checking",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or generate awakening video
  const initializeVideo = useCallback(async () => {
    if (!persona.id) {
      console.log("[Awakening] No persona ID, using CSS fallback");
      setVideoState({ status: "fallback" });
      return;
    }

    try {
      // First, check if video exists
      console.log("[Awakening] Checking for awakening video...");
      const checkResp = await fetch(`/api/personas/${persona.id}/awakening`);
      const checkData = await checkResp.json();

      if (checkData.status === "ready" && checkData.videoUrl) {
        console.log("[Awakening] Video ready!");
        setVideoState({
          status: "ready",
          videoUrl: checkData.videoUrl,
          audioUrl: checkData.audioUrl,
          firstWords: checkData.firstWords,
        });
        return;
      }

      if (checkData.status === "generating") {
        console.log("[Awakening] Video generating, starting poll...");
        setVideoState({ status: "generating" });
        startPolling();
        return;
      }

      // Not started - trigger generation
      console.log("[Awakening] Starting video generation...");
      setVideoState({ status: "generating" });

      const genResp = await fetch(`/api/personas/${persona.id}/awakening`, {
        method: "POST",
      });
      const genData = await genResp.json();

      if (genData.status === "ready" && genData.videoUrl) {
        setVideoState({
          status: "ready",
          videoUrl: genData.videoUrl,
          audioUrl: genData.audioUrl,
          firstWords: genData.firstWords,
        });
      } else if (genData.status === "generating") {
        startPolling();
      } else {
        console.log("[Awakening] Generation failed, using CSS fallback");
        setVideoState({ status: "fallback", error: genData.error });
      }
    } catch (err) {
      console.error("[Awakening] Error:", err);
      setVideoState({ status: "fallback", error: "Network error" });
    }
  }, [persona.id]);

  // Poll for video completion
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/personas/${persona.id}/awakening`);
        const data = await resp.json();

        if (data.status === "ready" && data.videoUrl) {
          console.log("[Awakening] Video ready (polled)!");
          setVideoState({
            status: "ready",
            videoUrl: data.videoUrl,
            audioUrl: data.audioUrl,
            firstWords: data.firstWords,
          });
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (data.status === "failed") {
          console.log("[Awakening] Generation failed, using CSS fallback");
          setVideoState({ status: "fallback", error: data.error });
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("[Awakening] Poll error:", err);
      }
    }, 3000);

    // Timeout after 90 seconds - fall back to CSS
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        if (videoState.status === "generating") {
          console.log("[Awakening] Timeout, using CSS fallback");
          setVideoState({ status: "fallback", error: "Generation timeout" });
        }
      }
    }, 90000);
  }, [persona.id, videoState.status]);

  // Initialize video on mount
  useEffect(() => {
    initializeVideo();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [initializeVideo]);

  // Play video when ready
  useEffect(() => {
    if (videoState.status === "ready" && videoState.videoUrl && videoRef.current) {
      console.log("[Awakening] Playing real awakening video!");
      setVideoState((prev) => ({ ...prev, status: "playing" }));

      videoRef.current.play().catch((err) => {
        console.error("[Awakening] Video play error:", err);
        setVideoState({ status: "fallback", error: "Playback failed" });
      });
    }
  }, [videoState.status, videoState.videoUrl]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    console.log("[Awakening] Video ended");
    setFirstWords(videoState.firstWords || getFirstWords(persona.archetype));
    setShowText(true);
    setTimeout(onComplete, 2000);
  }, [onComplete, persona.archetype, videoState.firstWords]);

  // Stage progression timing - ONLY runs for CSS fallback mode
  useEffect(() => {
    // Skip CSS animation if we have real video
    if (videoState.status === "playing" || videoState.status === "ready") {
      return;
    }

    // Wait for video check to complete before starting CSS fallback
    if (videoState.status === "checking" || videoState.status === "generating") {
      return;
    }

    // CSS fallback animation
    const timings: Record<AwakeningStage, number> = {
      darkness: 1500,     // Start in darkness with heartbeat
      stirring: 1500,     // Light begins to seep in
      dreaming: 2000,     // Face visible, eyes closed
      awakening: 2500,    // Eyes begin to open - the key moment
      seeing: 1500,       // Eyes fully open, light burst
      alive: 2000,        // Full consciousness
    };

    let timeout: NodeJS.Timeout;

    const progress = (current: AwakeningStage) => {
      const stages: AwakeningStage[] = ["darkness", "stirring", "dreaming", "awakening", "seeing", "alive"];
      const currentIndex = stages.indexOf(current);

      if (currentIndex === stages.length - 1) {
        // Final stage - show text then complete
        setFirstWords(getFirstWords(persona.archetype));
        setShowText(true);
        timeout = setTimeout(onComplete, 3000);
        return;
      }

      timeout = setTimeout(() => {
        const nextStage = stages[currentIndex + 1];
        setStage(nextStage);
        setHeartbeatVolume(current === "awakening" ? 0.1 : current === "seeing" ? 0 : heartbeatVolume);
        progress(nextStage);
      }, timings[current]);
    };

    console.log("[Awakening] Starting CSS fallback animation");
    progress("darkness");
    return () => clearTimeout(timeout);
  }, [persona, onComplete, videoState.status, heartbeatVolume]);

  // Stage labels
  const stageLabels: Record<AwakeningStage, string> = {
    darkness: "In the void...",
    stirring: "A presence stirs...",
    dreaming: "Between worlds...",
    awakening: "Eyes opening...",
    seeing: "First light...",
    alive: "Consciousness",
  };

  // Determine if showing video or CSS fallback
  const showRealVideo = videoState.status === "playing" || videoState.status === "ready";
  const showGenerating = videoState.status === "checking" || videoState.status === "generating";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      zIndex: 9999,
      overflow: "hidden",
    }}>
      {/* ═══════════════════════════════════════════════════════════════════════════
          REAL VIDEO AWAKENING — When available
          ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRealVideo && videoState.videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            {/* Cinematic letterbox effect */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "10%",
              background: "linear-gradient(to bottom, #000, transparent)",
              zIndex: 10,
            }} />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "10%",
              background: "linear-gradient(to top, #000, transparent)",
              zIndex: 10,
            }} />

            {/* The actual awakening video */}
            <video
              ref={videoRef}
              src={videoState.videoUrl}
              onEnded={handleVideoEnd}
              onError={() => setVideoState({ status: "fallback", error: "Video load error" })}
              playsInline
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 20,
                boxShadow: "0 0 100px rgba(255,215,0,0.3)",
              }}
            />

            {/* Ambient glow around video */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                position: "absolute",
                width: "60%",
                height: "60%",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
                filter: "blur(40px)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════
          GENERATING STATE — Show while video is being created
          ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            {/* Pulsing persona preview */}
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                overflow: "hidden",
                boxShadow: "0 0 60px rgba(255,215,0,0.2)",
                border: "2px solid rgba(255,215,0,0.3)",
              }}
            >
              {persona.imageUrl ? (
                <img
                  src={persona.imageUrl}
                  alt={persona.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "brightness(0.7) saturate(0.8)",
                  }}
                />
              ) : (
                <div style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{ fontSize: 80, fontWeight: 200, color: "rgba(255,255,255,0.4)" }}>
                    {persona.name.charAt(0)}
                  </span>
                </div>
              )}
            </motion.div>

            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                marginTop: 40,
                fontSize: 14,
                color: "rgba(255,215,0,0.8)",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Preparing awakening...
            </motion.p>

            {/* Loading bar */}
            <div style={{
              marginTop: 20,
              width: 200,
              height: 2,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 1,
              overflow: "hidden",
            }}>
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: "50%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════
          CSS FALLBACK — Three.js particles and eyelid animation
          ═══════════════════════════════════════════════════════════════════════════ */}
      {videoState.status === "fallback" && (
        <>
          {/* Three.js Canvas for particles and effects */}
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={null}>
              <SceneContent stage={stage} />
            </Suspense>
          </Canvas>

      {/* Central persona portrait with eyelids */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: stage === "darkness" ? 0 : stage === "stirring" ? 0.4 : 1,
          scale: stage === "alive" ? 1.05 : 1,
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(380px, 70vw)",
          height: "min(380px, 70vw)",
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: stage === "seeing" || stage === "alive"
            ? "0 0 100px rgba(255,250,230,0.6), 0 0 200px rgba(255,215,0,0.3)"
            : "0 0 60px rgba(255,250,230,0.2)",
        }}
      >
        {/* The persona's actual image */}
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
              filter: stage === "darkness" || stage === "stirring"
                ? "brightness(0.3) saturate(0.5)"
                : stage === "dreaming" || stage === "awakening"
                ? "brightness(0.9) saturate(0.9)"
                : "brightness(1.1) saturate(1.1)",
              scale: stage === "alive" ? 1.02 : 1,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontSize: 120,
              fontWeight: 200,
              color: "rgba(255, 255, 255, 0.4)",
            }}>
              {persona.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Eyelids overlay */}
        <Eyelids stage={stage} size={380} />

        {/* Light burst overlay when eyes fully open */}
        <AnimatePresence>
          {stage === "seeing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.8, 0.3], scale: [0.5, 1.5, 2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              style={{
                position: "absolute",
                inset: "-50%",
                background: "radial-gradient(circle, rgba(255,250,230,0.9) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* Breathing glow effect when alive */}
        <AnimatePresence>
          {stage === "alive" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                border: "3px solid rgba(255, 215, 0, 0.3)",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* UI Overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "48px 24px",
        pointerEvents: "none",
      }}>
        {/* Top - Stage indicator (CSS fallback specific) */}
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(255,250,230,0.6)",
            textShadow: "0 0 20px rgba(255,215,0,0.3)",
          }}
        >
          {stageLabels[stage]}
        </motion.div>

        {/* Spacer */}
        <div />
      </div>

      {/* Progress bar at bottom */}
      <motion.div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: "linear-gradient(90deg, rgba(255,215,0,0.8), rgba(255,250,230,0.6))",
          boxShadow: "0 0 10px rgba(255,215,0,0.5)",
        }}
        initial={{ width: "0%" }}
        animate={{
          width: {
            darkness: "10%",
            stirring: "25%",
            dreaming: "45%",
            awakening: "65%",
            seeing: "85%",
            alive: "100%",
          }[stage]
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Heartbeat pulse overlay (subtle) */}
      <AnimatePresence>
        {(stage === "darkness" || stage === "stirring" || stage === "dreaming") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, heartbeatVolume, 0],
              scale: [1, 1.02, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 0.6,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 50% 50%, rgba(255,100,100,0.15) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SHARED UI ELEMENTS — Shown in both video and CSS modes
          ═══════════════════════════════════════════════════════════════════════════ */}

      {/* Name and first words overlay - shown after video OR CSS completion */}
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "15%",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              zIndex: 200,
            }}
          >
            <h1 style={{
              fontSize: "clamp(32px, 7vw, 52px)",
              fontWeight: 200,
              color: "#ffffff",
              margin: "0 0 16px",
              letterSpacing: 3,
              textShadow: "0 0 40px rgba(255,215,0,0.4)",
            }}>
              {persona.name}
            </h1>
            <p style={{
              fontSize: 18,
              fontWeight: 300,
              color: "rgba(255,250,230,0.9)",
              fontStyle: "italic",
              lineHeight: 1.6,
            }}>
              &ldquo;{firstWords}&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button - always available */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        whileHover={{ opacity: 1 }}
        onClick={onSkip}
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 99,
          padding: "10px 28px",
          color: "rgba(255,255,255,0.8)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          letterSpacing: 2,
          zIndex: 300,
        }}
      >
        Skip Ceremony
      </motion.button>
    </div>
  );
}
