/**
 * Memory Decay
 *
 * Implements memory decay and reinforcement algorithms.
 * Based on Ebbinghaus forgetting curve and spaced repetition research.
 *
 * Core formula: R = e^(-t/S)
 * Where:
 *   R = retention (0 to 1)
 *   t = time since last access
 *   S = stability (increases with repetition)
 */

import type { MemoryEntry } from '@alfred/core';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Base half-life in milliseconds (7 days).
 * Memory drops to 50% strength after this time without access.
 */
const BASE_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Minimum retention threshold.
 * Below this, memory is considered forgotten.
 */
const RETENTION_THRESHOLD = 0.1;

/**
 * Maximum stability multiplier.
 * Prevents memories from becoming permanent.
 */
const MAX_STABILITY_MULTIPLIER = 10;

/**
 * Access bonus - how much each access strengthens memory.
 */
const ACCESS_STRENGTH_BONUS = 0.15;

// ============================================================================
// RETENTION CALCULATION
// ============================================================================

/**
 * Calculates current retention of a memory entry.
 * Uses exponential decay: R = e^(-t/S)
 */
export function calculateRetention(entry: MemoryEntry, now: Date = new Date()): number {
  const timeSinceAccess = now.getTime() - entry.lastAccessedAt.getTime();
  const stability = calculateStability(entry);
  
  // Exponential decay formula
  const retention = Math.exp(-timeSinceAccess / stability);
  
  return Math.max(0, Math.min(1, retention));
}

/**
 * Calculates memory stability based on access patterns.
 * More accesses = slower decay.
 */
export function calculateStability(entry: MemoryEntry): number {
  // Stability increases logarithmically with access count
  // This models spaced repetition effect
  const accessFactor = 1 + Math.log2(1 + entry.accessCount);
  
  // Confidence also affects stability
  const confidenceFactor = 0.5 + (entry.confidence * 0.5);
  
  // Combined stability, capped at maximum
  const stabilityMultiplier = Math.min(
    accessFactor * confidenceFactor,
    MAX_STABILITY_MULTIPLIER
  );
  
  return BASE_HALF_LIFE_MS * stabilityMultiplier;
}

/**
 * Calculates effective strength of a memory (retention * confidence).
 */
export function calculateStrength(entry: MemoryEntry, now: Date = new Date()): number {
  const retention = calculateRetention(entry, now);
  return retention * entry.confidence;
}

// ============================================================================
// MEMORY REINFORCEMENT
// ============================================================================

/**
 * Reinforces a memory when accessed.
 * Updates access time, count, and confidence.
 */
export function reinforceMemory(entry: MemoryEntry): MemoryEntry {
  const now = new Date();
  
  // Confidence increases with access, but diminishing returns
  const confidenceBoost = ACCESS_STRENGTH_BONUS * (1 - entry.confidence);
  const newConfidence = Math.min(1, entry.confidence + confidenceBoost);
  
  return {
    ...entry,
    lastAccessedAt: now,
    accessCount: entry.accessCount + 1,
    confidence: newConfidence,
  };
}

/**
 * Applies decay to a memory without accessing it.
 * Use for batch processing of old memories.
 */
export function applyDecay(entry: MemoryEntry, now: Date = new Date()): MemoryEntry {
  const retention = calculateRetention(entry, now);
  
  // Reduce confidence based on decay
  const decayedConfidence = entry.confidence * retention;
  
  return {
    ...entry,
    confidence: Math.max(0, decayedConfidence),
  };
}

// ============================================================================
// MEMORY FILTERING
// ============================================================================

/**
 * Checks if a memory should be considered forgotten.
 */
export function isForgotten(entry: MemoryEntry, now: Date = new Date()): boolean {
  return calculateRetention(entry, now) < RETENTION_THRESHOLD;
}

/**
 * Filters out forgotten memories from a list.
 */
export function filterForgotten(
  entries: MemoryEntry[],
  now: Date = new Date()
): MemoryEntry[] {
  return entries.filter(entry => !isForgotten(entry, now));
}

/**
 * Sorts memories by current strength (strongest first).
 */
export function sortByStrength(
  entries: MemoryEntry[],
  now: Date = new Date()
): MemoryEntry[] {
  return [...entries].sort((a, b) => {
    const strengthA = calculateStrength(a, now);
    const strengthB = calculateStrength(b, now);
    return strengthB - strengthA;
  });
}

/**
 * Gets top N strongest memories.
 */
export function getStrongestMemories(
  entries: MemoryEntry[],
  limit: number,
  now: Date = new Date()
): MemoryEntry[] {
  return sortByStrength(entries, now).slice(0, limit);
}

// ============================================================================
// DECAY SCHEDULING
// ============================================================================

/**
 * Calculates when a memory will drop below retention threshold.
 * Returns timestamp in milliseconds.
 */
export function predictForgottenTime(entry: MemoryEntry): number {
  const stability = calculateStability(entry);
  
  // Solve for t: RETENTION_THRESHOLD = e^(-t/S)
  // t = -S * ln(RETENTION_THRESHOLD)
  const timeUntilForgotten = -stability * Math.log(RETENTION_THRESHOLD);
  
  return entry.lastAccessedAt.getTime() + timeUntilForgotten;
}

/**
 * Calculates optimal review time for a memory.
 * Returns timestamp when retention drops to ~70% (optimal for reinforcement).
 */
export function calculateOptimalReviewTime(entry: MemoryEntry): number {
  const stability = calculateStability(entry);
  const optimalRetention = 0.7;
  
  // Solve for t: 0.7 = e^(-t/S)
  const timeUntilOptimal = -stability * Math.log(optimalRetention);
  
  return entry.lastAccessedAt.getTime() + timeUntilOptimal;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Processes all memories: applies decay, removes forgotten.
 * Returns cleaned list with updated confidence values.
 */
export function processMemoryDecay(
  entries: MemoryEntry[],
  now: Date = new Date()
): { active: MemoryEntry[]; forgotten: MemoryEntry[] } {
  const active: MemoryEntry[] = [];
  const forgotten: MemoryEntry[] = [];
  
  for (const entry of entries) {
    if (isForgotten(entry, now)) {
      forgotten.push(entry);
    } else {
      active.push(applyDecay(entry, now));
    }
  }
  
  return { active, forgotten };
}

/**
 * Gets memories that need review soon (within given timeframe).
 */
export function getMemoriesNeedingReview(
  entries: MemoryEntry[],
  withinMs: number,
  now: Date = new Date()
): MemoryEntry[] {
  const deadline = now.getTime() + withinMs;
  
  return entries.filter(entry => {
    const optimalReviewTime = calculateOptimalReviewTime(entry);
    return optimalReviewTime <= deadline;
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface DecayAnalytics {
  totalMemories: number;
  activeMemories: number;
  forgottenMemories: number;
  averageRetention: number;
  averageStrength: number;
  needsReviewSoon: number;
}

/**
 * Generates analytics for a set of memories.
 */
export function analyzeMemoryHealth(
  entries: MemoryEntry[],
  now: Date = new Date()
): DecayAnalytics {
  if (entries.length === 0) {
    return {
      totalMemories: 0,
      activeMemories: 0,
      forgottenMemories: 0,
      averageRetention: 0,
      averageStrength: 0,
      needsReviewSoon: 0,
    };
  }
  
  const retentions = entries.map(e => calculateRetention(e, now));
  const strengths = entries.map(e => calculateStrength(e, now));
  const forgotten = entries.filter(e => isForgotten(e, now));
  const oneDay = 24 * 60 * 60 * 1000;
  const needsReview = getMemoriesNeedingReview(entries, oneDay, now);
  
  return {
    totalMemories: entries.length,
    activeMemories: entries.length - forgotten.length,
    forgottenMemories: forgotten.length,
    averageRetention: retentions.reduce((a, b) => a + b, 0) / retentions.length,
    averageStrength: strengths.reduce((a, b) => a + b, 0) / strengths.length,
    needsReviewSoon: needsReview.length,
  };
}
