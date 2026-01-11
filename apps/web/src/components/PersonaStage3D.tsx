"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA STAGE 3D - Unified WebGL Canvas for All Persona 3D Rendering
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE ETERNAL AVATAR STUDIO
 *
 * One Canvas. One Camera. One GPU. Multiple Scenes.
 *
 * This is the architectural foundation for all Persona 3D rendering:
 * - LiveAvatar3D (real-time lip-sync)
 * - AwakeningScene (birth animation)
 * - Future environments, effects, and interactions
 *
 * Design principles:
 * - Single WebGL context (no duplication)
 * - Shared camera and lighting (consistent look)
 * - Composable scenes (add/remove dynamically)
 * - Performance first (60fps target)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, Environment, OrbitControls } from "@react-three/drei";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaStage3DProps {
  children: ReactNode;
  /** Enable camera controls for debugging */
  enableControls?: boolean;
  /** Camera position */
  cameraPosition?: [number, number, number];
  /** Camera field of view */
  cameraFov?: number;
  /** Lighting preset */
  lightingPreset?: "studio" | "sunset" | "dawn" | "night" | "warehouse";
  /** Custom ambient light intensity */
  ambientIntensity?: number;
  /** Background color */
  backgroundColor?: string;
  /** Performance mode - reduces quality for lower-end devices */
  performanceMode?: "low" | "medium" | "high";
  /** Enable post-processing effects */
  enablePostProcessing?: boolean;
  /** CSS class name */
  className?: string;
  /** Called when WebGL context is lost */
  onContextLoss?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTING RIG - Professional studio lighting setup
// ═══════════════════════════════════════════════════════════════════════════════

function LightingRig({
  ambientIntensity = 0.5,
  preset = "studio"
}: {
  ambientIntensity?: number;
  preset?: string;
}) {
  return (
    <>
      {/* Ambient light - base illumination */}
      <ambientLight intensity={ambientIntensity} />

      {/* Key light - main illumination */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Fill light - softens shadows */}
      <directionalLight
        position={[-5, 3, 5]}
        intensity={0.5}
      />

      {/* Back light - edge definition */}
      <directionalLight
        position={[0, 5, -5]}
        intensity={0.3}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#8b5cf6" opacity={0.5} transparent />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN STAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PersonaStage3D({
  children,
  enableControls = false,
  cameraPosition = [0, 0, 5],
  cameraFov = 35,
  lightingPreset = "studio",
  ambientIntensity = 0.5,
  backgroundColor = "#0a0a0f",
  performanceMode = "high",
  enablePostProcessing = false,
  className,
  onContextLoss,
}: PersonaStage3DProps) {
  // DPR based on performance mode
  const dpr = performanceMode === "low" ? [1, 1] : performanceMode === "medium" ? [1, 1.5] : [1, 2];

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        background: backgroundColor,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Canvas
        gl={{
          antialias: performanceMode !== "low",
          alpha: true,
          powerPreference: performanceMode === "high" ? "high-performance" : "default",
        }}
        dpr={dpr as [number, number]}
        shadows={performanceMode === "high"}
        onCreated={({ gl }) => {
          // Handle WebGL context loss gracefully
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.error("[PersonaStage3D] WebGL context lost");
            onContextLoss?.();
          });

          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.log("[PersonaStage3D] WebGL context restored");
          });
        }}
      >
        {/* Camera - shared by all scenes */}
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={cameraFov}
        />

        {/* Lighting - shared by all scenes */}
        <LightingRig
          ambientIntensity={ambientIntensity}
          preset={lightingPreset}
        />

        {/* Environment - provides realistic reflections */}
        <Suspense fallback={null}>
          <Environment preset={lightingPreset as any} />
        </Suspense>

        {/* Scene content - all 3D components render here */}
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>

        {/* Debug controls (disabled in production) */}
        {enableControls && (
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        )}
      </Canvas>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPER - For simple avatar display
// ═══════════════════════════════════════════════════════════════════════════════

export interface SimpleAvatarStageProps {
  children: ReactNode;
  className?: string;
}

/**
 * Simple avatar stage with sensible defaults for most use cases
 */
export function SimpleAvatarStage({ children, className }: SimpleAvatarStageProps) {
  return (
    <PersonaStage3D
      cameraPosition={[0, 0, 5]}
      cameraFov={35}
      lightingPreset="studio"
      ambientIntensity={0.5}
      performanceMode="high"
      className={className}
    >
      {children}
    </PersonaStage3D>
  );
}

export default PersonaStage3D;
