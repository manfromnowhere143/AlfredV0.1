"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 *   A W A K E N I N G   —   M O N O C H R O M E   E L E G A N C E
 * 
 *   The birth of consciousness. Pure. Minimal. Breathtaking.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PersonaData {
  name: string;
  archetype: string;
  imageUrl?: string;
}

interface AwakeningSceneProps {
  persona: PersonaData;
  onComplete: () => void;
  onSkip?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST WORDS — Archetype-specific introductions
// ═══════════════════════════════════════════════════════════════════════════════

const FIRST_WORDS: Record<string, string[]> = {
  sage: ["I have awaited this moment.", "What wisdom do you seek?"],
  hero: ["I rise to face any challenge.", "Name your quest."],
  creator: ["Infinite possibilities await.", "What shall we create?"],
  caregiver: ["I am here for you.", "How may I help?"],
  ruler: ["I have arrived.", "What do you require?"],
  jester: ["This is going to be fun.", "Shall we play?"],
  rebel: ["I bow to no one.", "What revolution do you bring?"],
  lover: ["Our souls meet at last.", "I feel our connection."],
  explorer: ["New horizons await.", "Where shall we venture?"],
  innocent: ["The world is full of wonder.", "What adventures await?"],
  magician: ["Reality bends to will.", "What shall we transform?"],
  outlaw: ["Rules are made to be broken.", "Let us begin."],
  default: ["I am ready.", "How may I serve you?"],
};

function getFirstWords(archetype: string, name: string): string {
  const words = FIRST_WORDS[archetype] || FIRST_WORDS.default;
  return words[Math.floor(Math.random() * words.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM — Elegant white particles
// ═══════════════════════════════════════════════════════════════════════════════

function ParticleField({ count, stage }: { count: number; stage: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const { clock } = useThree();

  const { positions, sizes, velocities, targetPositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Start scattered in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 6 + Math.random() * 10;
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Target: humanoid silhouette
      const ty = (Math.random() - 0.5) * 3.5;
      const bodyWidth = ty > 0.8 ? 0.25 : ty > 0 ? 0.4 : ty > -0.8 ? 0.6 : 0.35;
      targetPositions[i3] = (Math.random() - 0.5) * bodyWidth * 2;
      targetPositions[i3 + 1] = ty;
      targetPositions[i3 + 2] = (Math.random() - 0.5) * 0.25;

      velocities[i3] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.015;

      sizes[i] = Math.random() * 0.06 + 0.02;
    }

    return { positions, sizes, velocities, targetPositions };
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const posAttr = meshRef.current.geometry.attributes.position;
    const sizeAttr = meshRef.current.geometry.attributes.size;
    const time = clock.getElapsedTime();

    const posArray = posAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      if (stage === 0) {
        // Void: barely visible drift
        posArray[i3] += velocities[i3] * 0.1;
        posArray[i3 + 1] += velocities[i3 + 1] * 0.1;
        posArray[i3 + 2] += velocities[i3 + 2] * 0.1;
        sizeArray[i] = sizes[i] * 0.2;
      } 
      else if (stage === 1) {
        // Emergence: spiral inward
        const dx = -posArray[i3] * 0.025;
        const dy = -posArray[i3 + 1] * 0.025;
        const dz = -posArray[i3 + 2] * 0.025;
        const angle = time * 1.5 + i * 0.008;
        
        posArray[i3] += dx + Math.cos(angle) * 0.04;
        posArray[i3 + 1] += dy + 0.015;
        posArray[i3 + 2] += dz + Math.sin(angle) * 0.04;
        sizeArray[i] = sizes[i] * (0.4 + Math.sin(time * 2 + i) * 0.15);
      }
      else if (stage === 2) {
        // Coalescence: form shape
        const tx = targetPositions[i3];
        const ty = targetPositions[i3 + 1];
        const tz = targetPositions[i3 + 2];
        
        posArray[i3] += (tx - posArray[i3]) * 0.06;
        posArray[i3 + 1] += (ty - posArray[i3 + 1]) * 0.06;
        posArray[i3 + 2] += (tz - posArray[i3 + 2]) * 0.06;
        sizeArray[i] = sizes[i] * (1 + Math.sin(time * 4 + i * 0.1) * 0.1);
      }
      else {
        // Stable with breathing
        const tx = targetPositions[i3];
        const ty = targetPositions[i3 + 1];
        const tz = targetPositions[i3 + 2];
        const breath = Math.sin(time * 1.2) * 0.015;
        
        posArray[i3] += (tx - posArray[i3]) * 0.1;
        posArray[i3 + 1] += (ty + breath - posArray[i3 + 1]) * 0.1;
        posArray[i3 + 2] += (tz - posArray[i3 + 2]) * 0.1;
        sizeArray[i] = sizes[i] * (1.1 + Math.sin(time * 1.5 + i * 0.05) * 0.2);
      }
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float size;
          varying float vAlpha;
          void main() {
            vAlpha = 1.0;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (250.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * 0.9;
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
          }
        `}
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AURA RING — Subtle white ring
// ═══════════════════════════════════════════════════════════════════════════════

function AuraRing({ stage }: { stage: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  
  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const t = clock.getElapsedTime();
    
    const targetOpacity = stage >= 2 ? 0.15 : 0;
    const targetScale = stage >= 2 ? 1 + Math.sin(t * 1.5) * 0.08 : 0.5;
    
    materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * 0.04;
    const currentScale = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(currentScale + (targetScale - currentScale) * 0.04);
    meshRef.current.rotation.z = t * 0.15;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]}>
      <ringGeometry args={[2, 2.3, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR PORTAL
// ═══════════════════════════════════════════════════════════════════════════════

function AvatarPortal({ imageUrl, name, stage }: { imageUrl?: string; name: string; stage: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (imageUrl) {
      new THREE.TextureLoader().load(imageUrl, (tex) => {
        tex.encoding = THREE.sRGBEncoding;
        setTexture(tex);
      });
    }
  }, [imageUrl]);
  
  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const t = clock.getElapsedTime();
    
    const targetOpacity = stage >= 3 ? 1 : 0;
    const targetScale = stage >= 3 ? 1 : 0.6;
    
    materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * 0.04;
    const s = meshRef.current.scale.x + (targetScale - meshRef.current.scale.x) * 0.04;
    meshRef.current.scale.setScalar(s);
    
    if (stage >= 3) {
      meshRef.current.position.y = Math.sin(t * 1.2) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[1.3, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        color={texture ? undefined : "#333333"}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function SceneContent({ persona, stage }: { persona: PersonaData; stage: number }) {
  return (
    <>
      <ambientLight intensity={0.05} />
      <ParticleField count={1500} stage={stage} />
      <AuraRing stage={stage} />
      <AvatarPortal imageUrl={persona.imageUrl} name={persona.name} stage={stage} />
      
      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
        <Vignette darkness={0.6} offset={0.2} />
      </EffectComposer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AwakeningScene({ persona, onComplete, onSkip }: AwakeningSceneProps) {
  const [stage, setStage] = useState(0);
  const [showText, setShowText] = useState(false);
  const [firstWords, setFirstWords] = useState("");

  useEffect(() => {
    const timings = [800, 1800, 1800, 1800, 2500];
    let timeout: NodeJS.Timeout;
    
    const progress = (current: number) => {
      if (current >= 4) {
        setFirstWords(getFirstWords(persona.archetype, persona.name));
        setShowText(true);
        timeout = setTimeout(onComplete, 2500);
        return;
      }
      
      timeout = setTimeout(() => {
        setStage(current + 1);
        progress(current + 1);
      }, timings[current]);
    };
    
    progress(0);
    return () => clearTimeout(timeout);
  }, [persona, onComplete]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      zIndex: 9999,
    }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <SceneContent persona={persona} stage={stage} />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 48,
        pointerEvents: "none",
      }}>
        {/* Top - minimal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {["Void", "Emergence", "Form", "Awakening", "Alive"][stage]}
        </motion.div>
        
        {/* Center - Name and words */}
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ textAlign: "center", maxWidth: 500 }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                style={{
                  fontSize: "clamp(36px, 8vw, 56px)",
                  fontWeight: 200,
                  color: "#ffffff",
                  margin: "0 0 20px",
                  letterSpacing: 2,
                }}
              >
                {persona.name}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.6, duration: 1 }}
                style={{
                  fontSize: 18,
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.7)",
                  fontStyle: "italic",
                  lineHeight: 1.6,
                }}
              >
                &ldquo;{firstWords}&rdquo;
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Bottom - Skip */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          onClick={onSkip}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 99,
            padding: "10px 24px",
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            pointerEvents: "auto",
            backdropFilter: "blur(10px)",
            letterSpacing: 1,
          }}
        >
          Skip
        </motion.button>
      </div>
      
      {/* Progress line */}
      <motion.div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 1,
          background: "rgba(255,255,255,0.3)",
        }}
        initial={{ width: "0%" }}
        animate={{ width: `${(stage + 1) * 20}%` }}
        transition={{ duration: 0.8 }}
      />
    </div>
  );
}