"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIVE AVATAR 3D - Pixar-Quality Living Digital Being
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art avatar system with:
 * - Persona archetypes (sage, ruler, jester, etc.) for unique idle behaviors
 * - Smooth emotion blending with curves
 * - Camera-aware eye contact
 * - Micro-expressions for subtle life
 * - Breathing variation based on emotional state
 * - 60fps animation driven by centralized state machine
 *
 * "This is what makes Medusa Queen feel ALIVE"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  useAvatarStore,
  type AvatarState,
  type Emotion,
  type PersonaArchetype,
  VISEME_TO_BLENDSHAPES
} from "@/lib/avatar/store";
import { useLipSync } from "@/lib/avatar/useLipSync";

// ═══════════════════════════════════════════════════════════════════════════════
// CSS-ONLY FALLBACK - Pixar-Quality Even Without WebGL!
// ═══════════════════════════════════════════════════════════════════════════════

function CSSAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  // Get all state from the centralized store
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const emotionIntensity = useAvatarStore((s) => s.emotionIntensity);
  const energy = useAvatarStore((s) => s.energy);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const tick = useAvatarStore((s) => s.tick);

  // New soulful properties
  const headPitch = useAvatarStore((s) => s.headPitch);
  const headYaw = useAvatarStore((s) => s.headYaw);
  const headRoll = useAvatarStore((s) => s.headRoll);
  const gazeX = useAvatarStore((s) => s.gazeX);
  const gazeY = useAvatarStore((s) => s.gazeY);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);
  const breathingDepth = useAvatarStore((s) => s.breathingDepth);
  const isLookingAtCamera = useAvatarStore((s) => s.isLookingAtCamera);
  const archetype = useAvatarStore((s) => s.archetype);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;
      tick(delta);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [tick]);

  // Calculate animation values from state - DRIVEN BY SOUL ENGINE
  const breathScale = 1 + Math.sin(breathingPhase * Math.PI * 2) * 0.015 * breathingDepth;
  const breathY = Math.sin(breathingPhase * Math.PI * 2) * 2 * breathingDepth;

  // Speech-reactive animation
  const speakScale = state === 'speaking' ? 1 + audioAmplitude * 0.12 : 1;
  const speakBob = state === 'speaking' ? audioAmplitude * 8 : 0;

  // Convert radians to degrees for CSS transforms
  const rotateX = headPitch * (180 / Math.PI) * 60; // Scale for visibility
  const rotateY = headYaw * (180 / Math.PI) * 60;
  const rotateZ = headRoll * (180 / Math.PI) * 60;

  // Eye position offset for gaze simulation
  const eyeOffsetX = gazeX * 5;
  const eyeOffsetY = gazeY * 3;

  // Glow color based on state and emotion
  const glowColor = state === 'listening' ? '#3b82f6'
    : state === 'thinking' ? '#8b5cf6'
    : state === 'speaking' ? '#22c55e'
    : emotion === 'happy' ? '#fbbf24'
    : emotion === 'curious' ? '#06b6d4'
    : '#71717a';

  const glowOpacity = state === 'idle' ? 0.25 : 0.5 + audioAmplitude * 0.4;
  const glowScale = 1 + (state === 'speaking' ? audioAmplitude * 0.15 : 0);

  // Emotion-based subtle effects
  const emotionTint = emotion === 'happy' ? 'rgba(255, 200, 0, 0.05)'
    : emotion === 'sad' ? 'rgba(100, 149, 237, 0.05)'
    : emotion === 'angry' ? 'rgba(255, 0, 0, 0.05)'
    : 'transparent';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: 400,
      background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Emotion tint overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: emotionTint,
        pointerEvents: 'none',
        transition: 'background 0.5s ease',
      }} />

      {/* Glow ring - pulses with audio */}
      <div style={{
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: '50%',
        border: `3px solid ${glowColor}`,
        boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`,
        opacity: glowOpacity,
        transform: `scale(${glowScale})`,
        transition: 'opacity 0.1s, box-shadow 0.2s',
      }} />

      {/* Eye contact indicator - shows where avatar is looking */}
      {!isLookingAtCamera && (
        <div style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          transform: `translate(${gazeX * 100}px, ${gazeY * 70}px)`,
          transition: 'transform 0.3s ease-out',
        }} />
      )}

      {/* Avatar container - driven by soul engine */}
      <div style={{
        transform: `
          translateY(${breathY + speakBob}px)
          translateX(${eyeOffsetX}px)
          scale(${breathScale * speakScale})
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          rotateZ(${rotateZ}deg)
        `,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.03s ease-out',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: 250,
              height: 250,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: isLookingAtCamera
                ? '0 0 30px rgba(255,255,255,0.1)'
                : '0 0 10px rgba(0,0,0,0.3)',
            }}
          />
        ) : (
          <div style={{
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 80,
            fontWeight: 200,
            color: 'white',
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* State indicator with archetype badge */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '4px 12px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: glowColor,
          boxShadow: `0 0 6px ${glowColor}`,
          animation: state !== 'idle' ? 'pulse 1s infinite' : 'none',
        }} />
        <span style={{ color: '#fff', fontSize: 12, textTransform: 'capitalize' }}>
          {state === 'idle' ? emotion : state}
        </span>
      </div>

      {/* Name */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
          {name}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveAvatar3DProps {
  modelUrl?: string;            // URL to GLB/GLTF model
  imageUrl?: string;            // Fallback 2D image if no 3D model
  name: string;
  audioData?: string;           // Base64 audio for lip-sync
  archetype?: PersonaArchetype; // Persona archetype for idle behavior
  onReady?: () => void;
  onAudioEnd?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED 3D AVATAR MESH - Uses centralized state machine
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedAvatar({ modelUrl }: { modelUrl: string }) {
  const { scene, nodes } = useGLTF(modelUrl);
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasBlendshapes = useRef(false);

  // Get ALL state from centralized store
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const emotionIntensity = useAvatarStore((s) => s.emotionIntensity);
  const energy = useAvatarStore((s) => s.energy);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const currentViseme = useAvatarStore((s) => s.currentViseme);
  const visemeWeight = useAvatarStore((s) => s.visemeWeight);
  const blendShapes = useAvatarStore((s) => s.blendShapes);

  // Soul engine properties
  const gazeX = useAvatarStore((s) => s.gazeX);
  const gazeY = useAvatarStore((s) => s.gazeY);
  const headPitch = useAvatarStore((s) => s.headPitch);
  const headYaw = useAvatarStore((s) => s.headYaw);
  const headRoll = useAvatarStore((s) => s.headRoll);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);
  const breathingDepth = useAvatarStore((s) => s.breathingDepth);
  const tick = useAvatarStore((s) => s.tick);

  // Find the skinned mesh with morph targets
  useEffect(() => {
    hasBlendshapes.current = false;
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        meshRef.current = child;
        hasBlendshapes.current = true;
        console.log("[LiveAvatar3D] Found mesh with morph targets:", Object.keys(child.morphTargetDictionary));
      }
    });
    if (!hasBlendshapes.current) {
      console.log("[LiveAvatar3D] No morph targets - using transform animations");
    }
  }, [scene]);

  // Animation loop - DRIVEN BY SOUL ENGINE
  useFrame((_, delta) => {
    // Update the soul engine
    tick(delta);

    const group = groupRef.current;

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSFORM-BASED ANIMATION - Driven by centralized state
    // ═══════════════════════════════════════════════════════════════════════════
    if (group) {
      // Breathing from soul engine
      const breathScale = 1 + Math.sin(breathingPhase * Math.PI * 2) * 0.02 * breathingDepth;
      const breathY = Math.sin(breathingPhase * Math.PI * 2) * 0.04 * breathingDepth;

      // Audio-reactive animation
      const speakScale = 1 + audioAmplitude * 0.15;
      const speakBob = audioAmplitude * 0.2;

      // Apply transforms from soul engine state
      group.scale.setScalar(2 * breathScale * speakScale);
      group.position.y = -2 + breathY + speakBob;
      group.rotation.x = headPitch;
      group.rotation.y = headYaw + gazeX * 0.2;
      group.rotation.z = headRoll;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BLENDSHAPE ANIMATION - From centralized store
    // ═══════════════════════════════════════════════════════════════════════════
    const mesh = meshRef.current;
    if (mesh && mesh.morphTargetInfluences && mesh.morphTargetDictionary && hasBlendshapes.current) {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;

      // Apply ALL blend shapes from the store
      for (const [shapeName, value] of Object.entries(blendShapes)) {
        if (dict[shapeName] !== undefined && value !== undefined) {
          // Smooth transition
          const currentValue = influences[dict[shapeName]] || 0;
          influences[dict[shapeName]] = currentValue + (value - currentValue) * 0.3;
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={2} position={[0, -2, 0]} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK 2D AVATAR - Full soul engine integration
// ═══════════════════════════════════════════════════════════════════════════════

function Avatar2D({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const planeRef = useRef<THREE.Mesh>(null);

  // All state from soul engine
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const energy = useAvatarStore((s) => s.energy);
  const headPitch = useAvatarStore((s) => s.headPitch);
  const headYaw = useAvatarStore((s) => s.headYaw);
  const headRoll = useAvatarStore((s) => s.headRoll);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);
  const breathingDepth = useAvatarStore((s) => s.breathingDepth);
  const gazeX = useAvatarStore((s) => s.gazeX);
  const tick = useAvatarStore((s) => s.tick);

  // Create texture from image
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    return loader.load(imageUrl);
  }, [imageUrl]);

  // Animation driven by soul engine
  useFrame((_, delta) => {
    tick(delta);

    if (!planeRef.current) return;

    // Breathing from soul engine
    const breathScale = 1 + Math.sin(breathingPhase * Math.PI * 2) * 0.025 * breathingDepth;
    const breathY = Math.sin(breathingPhase * Math.PI * 2) * 0.03 * breathingDepth;

    // Audio-reactive
    const speakScale = state === 'speaking' ? 1 + audioAmplitude * 0.2 : 1;
    const speakY = state === 'speaking' ? audioAmplitude * 0.12 : 0;

    // Apply transforms from soul engine
    const finalScale = 2 * breathScale * speakScale;
    planeRef.current.scale.setScalar(finalScale);
    planeRef.current.position.y = breathY + speakY;
    planeRef.current.rotation.x = headPitch;
    planeRef.current.rotation.y = headYaw + gazeX * 0.15;
    planeRef.current.rotation.z = headRoll;
  });

  if (!texture) {
    return (
      <mesh ref={planeRef}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
    );
  }

  return (
    <mesh ref={planeRef}>
      <circleGeometry args={[1, 64]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO-REACTIVE GLOW RING
// ═══════════════════════════════════════════════════════════════════════════════

function GlowRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const emotionIntensity = useAvatarStore((s) => s.emotionIntensity);
  const breathingPhase = useAvatarStore((s) => s.breathingPhase);

  // Dynamic color based on state and emotion
  const getColor = () => {
    switch (state) {
      case 'listening': return new THREE.Color('#3b82f6');
      case 'thinking': return new THREE.Color('#8b5cf6');
      case 'speaking': return new THREE.Color('#22c55e');
      default:
        switch (emotion) {
          case 'happy': return new THREE.Color('#fbbf24');
          case 'sad': return new THREE.Color('#6b7280');
          case 'curious': return new THREE.Color('#06b6d4');
          case 'confident': return new THREE.Color('#f97316');
          case 'playful': return new THREE.Color('#ec4899');
          default: return new THREE.Color('#71717a');
        }
    }
  };

  useFrame(() => {
    if (!ringRef.current) return;

    const material = ringRef.current.material as THREE.MeshBasicMaterial;

    // Breathing-synced pulsing
    const breathPulse = Math.sin(breathingPhase * Math.PI * 2) * 0.05;

    // State-based opacity
    const baseOpacity = state === 'idle' ? 0.1 + emotionIntensity * 0.1 : 0.25;
    const audioOpacity = state === 'speaking' ? audioAmplitude * 0.4 : 0;
    material.opacity = baseOpacity + audioOpacity + breathPulse;

    // Scale with audio
    const baseScale = 2.2;
    const audioScale = state === 'speaking' ? audioAmplitude * 0.25 : 0;
    ringRef.current.scale.setScalar(baseScale + audioScale + breathPulse * 0.5);

    // Color
    material.color = getColor();
  });

  return (
    <mesh ref={ringRef} position={[0, 0, -0.5]}>
      <ringGeometry args={[1.8, 2.0, 64]} />
      <meshBasicMaterial transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE INDICATOR OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

function StateIndicator() {
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const isLookingAtCamera = useAvatarStore((s) => s.isLookingAtCamera);

  const color = useMemo(() => {
    switch (state) {
      case 'listening': return '#3b82f6';
      case 'thinking': return '#8b5cf6';
      case 'speaking': return '#22c55e';
      default: return '#71717a';
    }
  }, [state]);

  const label = useMemo(() => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return emotion !== 'neutral' ? emotion : '';
    }
  }, [state, emotion]);

  if (state === 'idle' && emotion === 'neutral') return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          animation: state !== 'idle' ? 'pulse 1s infinite' : 'none',
        }}
      />
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
        {label}
      </span>
      {isLookingAtCamera && state !== 'idle' && (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>

        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LiveAvatar3D({
  modelUrl,
  imageUrl,
  name,
  audioData,
  archetype = 'default',
  onReady,
  onAudioEnd,
  className,
}: LiveAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { connectToAudioData, stop } = useLipSync();
  const setState = useAvatarStore((s) => s.setState);
  const setArchetype = useAvatarStore((s) => s.setArchetype);
  const [webglFailed, setWebglFailed] = useState(false);
  const [useSimpleMode, setUseSimpleMode] = useState(true); // CSS mode for stability

  // Set archetype on mount
  useEffect(() => {
    setArchetype(archetype);
  }, [archetype, setArchetype]);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.log('[LiveAvatar3D] WebGL not available, using CSS mode');
        setWebglFailed(true);
      }
    } catch (e) {
      console.log('[LiveAvatar3D] WebGL check failed, using CSS mode');
      setWebglFailed(true);
    }
  }, []);

  // Connect audio data for lip-sync
  useEffect(() => {
    if (audioData) {
      setState('speaking');
      connectToAudioData(audioData).then((audio) => {
        audio.onended = () => {
          stop();
          setState('idle');
          onAudioEnd?.();
        };
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

  // Use CSS-only mode for stability
  if (useSimpleMode || webglFailed) {
    return <CSSAvatar imageUrl={imageUrl} name={name} />;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        background: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.log('[LiveAvatar3D] WebGL context lost, switching to CSS mode');
            setWebglFailed(true);
          });
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={35} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, 5, 5]} intensity={0.5} />

        <Suspense fallback={null}>
          <GlowRing />

          {modelUrl && typeof modelUrl === 'string' && modelUrl.length > 0 ? (
            <AnimatedAvatar modelUrl={modelUrl} />
          ) : (
            <Avatar2D imageUrl={imageUrl} name={name} />
          )}
          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <StateIndicator />

      {/* Name */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 20,
          backdropFilter: 'blur(10px)',
        }}
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
          {name}
        </span>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default LiveAvatar3D;
