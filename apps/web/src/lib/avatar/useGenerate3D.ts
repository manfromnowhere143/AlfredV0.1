"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE GENERATE 3D - Hook for generating 3D avatars from persona images
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides a simple interface to trigger and monitor 3D avatar generation
 * using state-of-the-art image-to-3D models (TripoSR, InstantMesh).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Model3DType = "triposr" | "instantmesh" | "default";

export interface Generate3DStatus {
  personaId: string;
  name: string;
  hasImage: boolean;
  has3DModel: boolean;
  modelUrl: string | null;
  canGenerate: boolean;
}

export interface Generate3DResult {
  success: boolean;
  modelUrl?: string;
  cached?: boolean;
  model?: string;
  message?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useGenerate3D() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check the 3D model status for a persona
   */
  const checkStatus = useCallback(async (personaId: string): Promise<Generate3DStatus | null> => {
    try {
      const response = await fetch(`/api/personas/${personaId}/generate-3d`);
      if (!response.ok) {
        console.error("[useGenerate3D] Status check failed:", response.statusText);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error("[useGenerate3D] Status check error:", err);
      return null;
    }
  }, []);

  /**
   * Generate a 3D model for a persona
   */
  const generate = useCallback(async (
    personaId: string,
    options: {
      model?: Model3DType;
      forceRegenerate?: boolean;
    } = {}
  ): Promise<Generate3DResult> => {
    const { model = "triposr", forceRegenerate = false } = options;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Start generation
      setProgress(10);

      const response = await fetch(`/api/personas/${personaId}/generate-3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, forceRegenerate }),
      });

      setProgress(50);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Generation failed");
      }

      const result = await response.json();
      setProgress(100);

      if (!result.success) {
        throw new Error(result.error || result.message || "Generation failed");
      }

      return result;
    } catch (err: any) {
      const message = err.message || "Failed to generate 3D model";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Generate 3D model with polling for status updates
   * (For models that return async job IDs)
   */
  const generateWithPolling = useCallback(async (
    personaId: string,
    options: {
      model?: Model3DType;
      forceRegenerate?: boolean;
      pollInterval?: number;
      maxPollTime?: number;
    } = {}
  ): Promise<Generate3DResult> => {
    const {
      model = "triposr",
      forceRegenerate = false,
      pollInterval = 2000,
      maxPollTime = 120000,
    } = options;

    setIsGenerating(true);
    setProgress(5);
    setError(null);

    try {
      // Start generation
      const response = await fetch(`/api/personas/${personaId}/generate-3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, forceRegenerate }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Generation failed");
      }

      const result = await response.json();

      // If we got an immediate result (cached or fast model)
      if (result.success && result.modelUrl) {
        setProgress(100);
        return result;
      }

      // If we got a job ID, poll for completion
      if (result.jobId) {
        const startTime = Date.now();
        let lastProgress = 10;

        while (Date.now() - startTime < maxPollTime) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          const statusResponse = await fetch(
            `/api/personas/${personaId}/generate-3d?jobId=${result.jobId}`
          );

          if (!statusResponse.ok) continue;

          const status = await statusResponse.json();

          // Update progress
          if (status.progress) {
            lastProgress = Math.max(lastProgress, status.progress);
            setProgress(lastProgress);
          } else {
            lastProgress = Math.min(95, lastProgress + 5);
            setProgress(lastProgress);
          }

          // Check if complete
          if (status.completed && status.modelUrl) {
            setProgress(100);
            return { success: true, modelUrl: status.modelUrl, model };
          }

          // Check for errors
          if (status.error) {
            throw new Error(status.error);
          }
        }

        throw new Error("Generation timed out");
      }

      // Unknown response
      setProgress(100);
      return result;
    } catch (err: any) {
      const message = err.message || "Failed to generate 3D model";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    isGenerating,
    progress,
    error,
    checkStatus,
    generate,
    generateWithPolling,
    reset,
  };
}

export default useGenerate3D;
