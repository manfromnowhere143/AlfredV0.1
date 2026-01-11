"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIVE AVATAR 3D - State-of-the-art real-time animated avatar
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Real-time 3D avatar with:
 * - Continuous idle animations (breathing, blinking, micro-movements)
 * - Audio-driven lip-sync
 * - Emotion-based expressions
 * - State machine (idle/listening/thinking/speaking)
 *
 * Target: 60fps, <50ms state transitions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect, useMemo, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useAvatarStore, AvatarState, Emotion, VISEME_TO_BLENDSHAPES } from "@/lib/avatar/store";
import { useLipSync } from "@/lib/avatar/useLipSync";

// ═══════════════════════════════════════════════════════════════════════════════
// CSS-ONLY FALLBACK - Works even when WebGL fails!
// ═══════════════════════════════════════════════════════════════════════════════

function CSSAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const tick = useAvatarStore((s) => s.tick);
  const [time, setTime] = useState(0);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      tick(delta);
      setTime(currentTime / 1000);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [tick]);

  // Calculate animation values
  const breathScale = 1 + Math.sin(time * 0.5) * 0.02;
  const breathY = Math.sin(time * 0.5) * 3;
  const speakScale = state === 'speaking' ? 1 + audioAmplitude * 0.15 : 1;
  const speakBob = state === 'speaking' ? audioAmplitude * 10 : 0;

  let rotateZ = 0;
  let rotateX = 0;

  switch (state) {
    case 'listening':
      rotateZ = Math.sin(time * 2) * 4;
      rotateX = 3;
      break;
    case 'thinking':
      rotateZ = 5;
      rotateX = -3 + Math.sin(time * 0.8) * 2;
      break;
    case 'speaking':
      rotateZ = Math.sin(time * 3) * 4 + audioAmplitude * 8;
      rotateX = Math.sin(time * 1.5) * 3 + audioAmplitude * 5;
      break;
    default:
      rotateZ = Math.sin(time * 0.3) * 2;
      rotateX = Math.sin(time * 0.2) * 1.5;
  }

  // Glow color based on state
  const glowColor = state === 'listening' ? '#3b82f6'
    : state === 'thinking' ? '#8b5cf6'
    : state === 'speaking' ? '#22c55e'
    : '#71717a';

  const glowOpacity = state === 'idle' ? 0.3 : 0.6 + audioAmplitude * 0.4;
  const glowScale = 1 + (state === 'speaking' ? audioAmplitude * 0.2 : 0);

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
      {/* Glow ring */}
      <div style={{
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: '50%',
        border: `3px solid ${glowColor}`,
        boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`,
        opacity: glowOpacity,
        transform: `scale(${glowScale})`,
        transition: 'opacity 0.1s, box-shadow 0.1s',
      }} />

      {/* Avatar container */}
      <div style={{
        transform: `
          translateY(${breathY + speakBob}px)
          scale(${breathScale * speakScale})
          rotateZ(${rotateZ}deg)
          rotateX(${rotateX}deg)
        `,
        transition: 'transform 0.05s ease-out',
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

      {/* State indicator */}
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
          {state}
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
  onReady?: () => void;
  onAudioEnd?: () => void;      // Called when audio playback ends
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED AVATAR MESH
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedAvatar({ modelUrl }: { modelUrl: string }) {
  const { scene, nodes } = useGLTF(modelUrl);
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasBlendshapes = useRef(false);

  // Get state from store
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const energy = useAvatarStore((s) => s.energy);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const currentViseme = useAvatarStore((s) => s.currentViseme);
  const visemeWeight = useAvatarStore((s) => s.visemeWeight);
  const gazeX = useAvatarStore((s) => s.gazeX);
  const gazeY = useAvatarStore((s) => s.gazeY);
  const tick = useAvatarStore((s) => s.tick);

  // Find the skinned mesh with morph targets (if any)
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
      console.log("[LiveAvatar3D] No morph targets found - using transform animations for LIVING avatar");
    }
  }, [scene]);

  // Animation loop - MAKES THE AVATAR ALIVE
  useFrame((_, delta) => {
    // Update avatar state machine
    tick(delta);

    const time = Date.now() / 1000;
    const group = groupRef.current;

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSFORM-BASED ANIMATION (Works for ALL 3D models - TRELLIS, etc.)
    // This is what makes static models feel ALIVE!
    // ═══════════════════════════════════════════════════════════════════════════
    if (group) {
      // Base breathing animation - MORE PRONOUNCED for visibility
      const breathScale = 1 + Math.sin(time * 0.5) * 0.025;
      const breathY = Math.sin(time * 0.5) * 0.05;

      // Audio-reactive animation - MUCH STRONGER for speaking
      const speakScale = 1 + audioAmplitude * 0.2;
      const speakBob = audioAmplitude * 0.3;

      // State-based head movement
      let headTiltX = 0;
      let headTiltY = 0;
      let headTiltZ = 0;

      switch (state) {
        case 'listening':
          // MORE VISIBLE tilt toward speaker
          headTiltX = 0.12;
          headTiltZ = Math.sin(time * 2) * 0.06;
          break;
        case 'thinking':
          // MORE VISIBLE look up and to the side
          headTiltX = -0.08;
          headTiltY = 0.15 + Math.sin(time * 0.8) * 0.05;
          break;
        case 'speaking':
          // VERY DYNAMIC movement while talking
          headTiltX = Math.sin(time * 1.5) * 0.08 * energy;
          headTiltY = Math.sin(time * 0.7) * 0.1 * energy;
          headTiltZ = audioAmplitude * 0.15;
          break;
        default:
          // Idle - subtle but VISIBLE micro-movements
          headTiltX = Math.sin(time * 0.3) * 0.03;
          headTiltY = Math.sin(time * 0.2) * 0.04;
      }

      // Emotion-based adjustments
      switch (emotion) {
        case 'happy':
          headTiltX -= 0.02; // Slight upward tilt
          break;
        case 'sad':
          headTiltX += 0.04; // Look down
          break;
        case 'curious':
          headTiltZ += 0.05; // Head tilt
          break;
        case 'surprised':
          headTiltX -= 0.03;
          break;
      }

      // Apply transforms - THIS IS WHAT MAKES IT ALIVE
      group.scale.setScalar(2 * breathScale * speakScale);
      group.position.y = -2 + breathY + speakBob;
      group.rotation.x = headTiltX;
      group.rotation.y = headTiltY + gazeX * 0.1;
      group.rotation.z = headTiltZ;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BLENDSHAPE ANIMATION (For rigged avatars with morph targets)
    // ═══════════════════════════════════════════════════════════════════════════
    const mesh = meshRef.current;
    if (mesh && mesh.morphTargetInfluences && mesh.morphTargetDictionary && hasBlendshapes.current) {
      const dict = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;

      // Apply viseme blend shapes
      const visemeShapes = VISEME_TO_BLENDSHAPES[currentViseme];
      for (const [shapeName, value] of Object.entries(visemeShapes)) {
        if (dict[shapeName] !== undefined) {
          influences[dict[shapeName]] = (value as number) * visemeWeight;
        }
      }

      // Apply audio amplitude to jaw
      if (dict.jawOpen !== undefined) {
        influences[dict.jawOpen] = Math.max(
          influences[dict.jawOpen] || 0,
          audioAmplitude * 0.8
        );
      }

      // Breathing animation
      const breath = Math.sin(time * 0.5) * 0.02 + 0.02;
      if (dict.mouthOpen !== undefined) {
        influences[dict.mouthOpen] = Math.max(influences[dict.mouthOpen] || 0, breath);
      }

      // Blinking animation
      const blinkCycle = Math.sin(time * 0.3) > 0.95 ? 1 : 0;
      if (dict.eyeBlinkLeft !== undefined) {
        influences[dict.eyeBlinkLeft] = blinkCycle;
      }
      if (dict.eyeBlinkRight !== undefined) {
        influences[dict.eyeBlinkRight] = blinkCycle;
      }

      // Emotion-based expressions
      applyEmotionToMesh(mesh, emotion, energy);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={2} position={[0, -2, 0]} />
    </group>
  );
}

// Apply emotion to mesh morph targets
function applyEmotionToMesh(
  mesh: THREE.SkinnedMesh,
  emotion: Emotion,
  energy: number
) {
  if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

  const dict = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;

  // Reset emotion-related shapes
  const emotionShapes = [
    'mouthSmileLeft', 'mouthSmileRight',
    'mouthFrownLeft', 'mouthFrownRight',
    'browInnerUp', 'browDownLeft', 'browDownRight',
    'eyeWideLeft', 'eyeWideRight',
    'cheekSquintLeft', 'cheekSquintRight',
  ];

  for (const shape of emotionShapes) {
    if (dict[shape] !== undefined) {
      influences[dict[shape]] = 0;
    }
  }

  // Apply emotion
  switch (emotion) {
    case 'happy':
      if (dict.mouthSmileLeft !== undefined) influences[dict.mouthSmileLeft] = 0.6 * energy;
      if (dict.mouthSmileRight !== undefined) influences[dict.mouthSmileRight] = 0.6 * energy;
      if (dict.cheekSquintLeft !== undefined) influences[dict.cheekSquintLeft] = 0.3 * energy;
      if (dict.cheekSquintRight !== undefined) influences[dict.cheekSquintRight] = 0.3 * energy;
      break;
    case 'sad':
      if (dict.mouthFrownLeft !== undefined) influences[dict.mouthFrownLeft] = 0.4 * energy;
      if (dict.mouthFrownRight !== undefined) influences[dict.mouthFrownRight] = 0.4 * energy;
      if (dict.browInnerUp !== undefined) influences[dict.browInnerUp] = 0.5 * energy;
      break;
    case 'surprised':
      if (dict.eyeWideLeft !== undefined) influences[dict.eyeWideLeft] = 0.7 * energy;
      if (dict.eyeWideRight !== undefined) influences[dict.eyeWideRight] = 0.7 * energy;
      if (dict.browInnerUp !== undefined) influences[dict.browInnerUp] = 0.6 * energy;
      break;
    case 'curious':
      if (dict.browInnerUp !== undefined) influences[dict.browInnerUp] = 0.3 * energy;
      if (dict.browOuterUpLeft !== undefined) influences[dict.browOuterUpLeft] = 0.4 * energy;
      break;
    case 'focused':
      if (dict.browDownLeft !== undefined) influences[dict.browDownLeft] = 0.3 * energy;
      if (dict.browDownRight !== undefined) influences[dict.browDownRight] = 0.3 * energy;
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK 2D AVATAR (when no 3D model)
// ═══════════════════════════════════════════════════════════════════════════════

function Avatar2D({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const planeRef = useRef<THREE.Mesh>(null);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);
  const energy = useAvatarStore((s) => s.energy);

  // Create texture from image
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    return loader.load(imageUrl);
  }, [imageUrl]);

  // LIVING 2D avatar animation
  useFrame((_, delta) => {
    if (!planeRef.current) return;

    const time = Date.now() / 1000;

    // Base breathing - MORE VISIBLE constant life
    const breathScale = 1 + Math.sin(time * 0.5) * 0.03;
    const breathY = Math.sin(time * 0.5) * 0.04;

    // Audio-reactive scaling and movement - MUCH STRONGER
    const speakScale = state === 'speaking' ? 1 + audioAmplitude * 0.25 : 1;
    const speakY = state === 'speaking' ? audioAmplitude * 0.15 : 0;

    // State-based rotation (head tilt simulation)
    let rotZ = 0;
    let rotX = 0;

    switch (state) {
      case 'listening':
        rotZ = Math.sin(time * 2) * 0.08;
        rotX = 0.06;
        break;
      case 'thinking':
        rotZ = 0.1;
        rotX = -0.05 + Math.sin(time * 0.8) * 0.03;
        break;
      case 'speaking':
        // VERY VISIBLE speaking animation
        rotZ = Math.sin(time * 3) * 0.08 * energy + audioAmplitude * 0.1;
        rotX = Math.sin(time * 1.5) * 0.05 + audioAmplitude * 0.08;
        break;
      default:
        // Idle - visible breathing micro-movements
        rotZ = Math.sin(time * 0.3) * 0.03;
        rotX = Math.sin(time * 0.2) * 0.025;
    }

    // Emotion adjustments
    switch (emotion) {
      case 'happy':
        rotX -= 0.02;
        break;
      case 'sad':
        rotX += 0.03;
        break;
      case 'curious':
        rotZ += 0.04;
        break;
    }

    // Apply transforms - MAKES 2D IMAGE FEEL ALIVE
    const finalScale = 2 * breathScale * speakScale;
    planeRef.current.scale.setScalar(finalScale);
    planeRef.current.position.y = breathY + speakY;
    planeRef.current.rotation.z = rotZ;
    planeRef.current.rotation.x = rotX;
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
// AUDIO-REACTIVE GLOW RING - Makes the avatar feel ALIVE
// ═══════════════════════════════════════════════════════════════════════════════

function GlowRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const audioAmplitude = useAvatarStore((s) => s.audioAmplitude);
  const state = useAvatarStore((s) => s.state);
  const emotion = useAvatarStore((s) => s.emotion);

  // Dynamic color based on state
  const getColor = () => {
    switch (state) {
      case 'listening': return new THREE.Color('#3b82f6'); // Blue
      case 'thinking': return new THREE.Color('#8b5cf6');  // Purple
      case 'speaking': return new THREE.Color('#22c55e');   // Green
      default:
        switch (emotion) {
          case 'happy': return new THREE.Color('#fbbf24');
          case 'sad': return new THREE.Color('#6b7280');
          case 'curious': return new THREE.Color('#06b6d4');
          default: return new THREE.Color('#71717a');
        }
    }
  };

  useFrame(() => {
    if (!ringRef.current) return;

    const time = Date.now() / 1000;
    const material = ringRef.current.material as THREE.MeshBasicMaterial;

    // Pulsing opacity based on audio
    const baseOpacity = state === 'idle' ? 0.1 : 0.3;
    const audioOpacity = state === 'speaking' ? audioAmplitude * 0.5 : 0;
    material.opacity = baseOpacity + audioOpacity + Math.sin(time * 2) * 0.1;

    // Scale pulse
    const baseScale = 2.2;
    const audioScale = state === 'speaking' ? audioAmplitude * 0.3 : 0;
    ringRef.current.scale.setScalar(baseScale + audioScale);

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
// STATE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

function StateIndicator() {
  const state = useAvatarStore((s) => s.state);

  const color = useMemo(() => {
    switch (state) {
      case 'listening': return '#3b82f6';  // Blue
      case 'thinking': return '#8b5cf6';   // Purple
      case 'speaking': return '#22c55e';   // Green
      default: return '#71717a';           // Gray
    }
  }, [state]);

  const label = useMemo(() => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return '';
    }
  }, [state]);

  if (state === 'idle') return null;

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
          animation: 'pulse 1s infinite',
        }}
      />
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
        {label}
      </span>
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
  onReady,
  onAudioEnd,
  className,
}: LiveAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { connectToAudioData, stop } = useLipSync();
  const setState = useAvatarStore((s) => s.setState);
  const [webglFailed, setWebglFailed] = useState(false);
  const [useSimpleMode, setUseSimpleMode] = useState(true); // Use CSS mode by default for stability

  // Check WebGL availability on mount
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

  // Use CSS-only mode for stability (prevents WebGL crashes)
  // This is the LIVING avatar that always works!
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
          // Handle WebGL context loss
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
          {/* Audio-reactive glow ring - MAKES IT ALIVE */}
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
