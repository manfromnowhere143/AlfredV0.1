/**
 * Memory Decay Tests
 *
 * Verifies decay mathematics and memory lifecycle.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRetention,
  calculateStability,
  calculateStrength,
  reinforceMemory,
  isForgotten,
  filterForgotten,
  sortByStrength,
  predictForgottenTime,
  processMemoryDecay,
  analyzeMemoryHealth,
} from './decay';
import type { MemoryEntry } from '@alfred/core';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMemoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  const now = new Date();
  return {
    id: 'test-memory-1',
    userId: 'user-1',
    type: 'preference',
    content: 'Test memory content',
    confidence: 0.8,
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 1,
    ...overrides,
  };
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================================================
// RETENTION CALCULATION
// ============================================================================

describe('calculateRetention', () => {
  it('returns 1.0 for just-accessed memory', () => {
    const entry = createMemoryEntry({ lastAccessedAt: new Date() });
    const retention = calculateRetention(entry);
    expect(retention).toBeCloseTo(1.0, 1);
  });

  it('decays over time', () => {
    const entry = createMemoryEntry({ lastAccessedAt: daysAgo(7) });
    const retention = calculateRetention(entry);
    expect(retention).toBeLessThan(1.0);
    expect(retention).toBeGreaterThan(0);
  });

  it('decays more with more time', () => {
    const recent = createMemoryEntry({ lastAccessedAt: daysAgo(1) });
    const old = createMemoryEntry({ lastAccessedAt: daysAgo(14) });

    const recentRetention = calculateRetention(recent);
    const oldRetention = calculateRetention(old);

    expect(recentRetention).toBeGreaterThan(oldRetention);
  });

  it('is bounded between 0 and 1', () => {
    const veryOld = createMemoryEntry({ lastAccessedAt: daysAgo(365) });
    const retention = calculateRetention(veryOld);

    expect(retention).toBeGreaterThanOrEqual(0);
    expect(retention).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// STABILITY CALCULATION
// ============================================================================

describe('calculateStability', () => {
  it('increases with access count', () => {
    const lowAccess = createMemoryEntry({ accessCount: 1 });
    const highAccess = createMemoryEntry({ accessCount: 10 });

    const lowStability = calculateStability(lowAccess);
    const highStability = calculateStability(highAccess);

    expect(highStability).toBeGreaterThan(lowStability);
  });

  it('increases with confidence', () => {
    const lowConfidence = createMemoryEntry({ confidence: 0.3 });
    const highConfidence = createMemoryEntry({ confidence: 0.9 });

    const lowStability = calculateStability(lowConfidence);
    const highStability = calculateStability(highConfidence);

    expect(highStability).toBeGreaterThan(lowStability);
  });
});

// ============================================================================
// STRENGTH CALCULATION
// ============================================================================

describe('calculateStrength', () => {
  it('combines retention and confidence', () => {
    const entry = createMemoryEntry({
      confidence: 0.8,
      lastAccessedAt: new Date(),
    });

    const strength = calculateStrength(entry);
    expect(strength).toBeCloseTo(0.8, 1);
  });

  it('is lower for old memories', () => {
    const recent = createMemoryEntry({ lastAccessedAt: new Date() });
    const old = createMemoryEntry({ lastAccessedAt: daysAgo(14) });

    expect(calculateStrength(recent)).toBeGreaterThan(calculateStrength(old));
  });
});

// ============================================================================
// REINFORCEMENT
// ============================================================================

describe('reinforceMemory', () => {
  it('updates lastAccessedAt', () => {
    const entry = createMemoryEntry({ lastAccessedAt: daysAgo(1) });
    const reinforced = reinforceMemory(entry);

    expect(reinforced.lastAccessedAt.getTime()).toBeGreaterThan(
      entry.lastAccessedAt.getTime()
    );
  });

  it('increments access count', () => {
    const entry = createMemoryEntry({ accessCount: 5 });
    const reinforced = reinforceMemory(entry);

    expect(reinforced.accessCount).toBe(6);
  });

  it('increases confidence', () => {
    const entry = createMemoryEntry({ confidence: 0.5 });
    const reinforced = reinforceMemory(entry);

    expect(reinforced.confidence).toBeGreaterThan(0.5);
  });

  it('caps confidence at 1.0', () => {
    const entry = createMemoryEntry({ confidence: 0.99 });
    const reinforced = reinforceMemory(entry);

    expect(reinforced.confidence).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// FORGOTTEN CHECK
// ============================================================================

describe('isForgotten', () => {
  it('returns false for recent memory', () => {
    const entry = createMemoryEntry({ lastAccessedAt: new Date() });
    expect(isForgotten(entry)).toBe(false);
  });

  it('returns true for very old memory', () => {
    const entry = createMemoryEntry({
      lastAccessedAt: daysAgo(180),
      accessCount: 1,
      confidence: 0.5,
    });
    expect(isForgotten(entry)).toBe(true);
  });
});

// ============================================================================
// FILTERING
// ============================================================================

describe('filterForgotten', () => {
  it('removes forgotten memories', () => {
    const entries = [
      createMemoryEntry({ id: 'recent', lastAccessedAt: new Date() }),
      createMemoryEntry({ id: 'old', lastAccessedAt: daysAgo(180), accessCount: 1, confidence: 0.5 }),
    ];

    const filtered = filterForgotten(entries);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('recent');
  });
});

describe('sortByStrength', () => {
  it('sorts strongest first', () => {
    const entries = [
      createMemoryEntry({ id: 'weak', lastAccessedAt: daysAgo(30), confidence: 0.3 }),
      createMemoryEntry({ id: 'strong', lastAccessedAt: new Date(), confidence: 0.9 }),
    ];

    const sorted = sortByStrength(entries);
    expect(sorted[0].id).toBe('strong');
  });
});

// ============================================================================
// PREDICTION
// ============================================================================

describe('predictForgottenTime', () => {
  it('returns future timestamp', () => {
    const entry = createMemoryEntry({ lastAccessedAt: new Date() });
    const forgottenTime = predictForgottenTime(entry);

    expect(forgottenTime).toBeGreaterThan(Date.now());
  });

  it('is later for high-access memories', () => {
    const lowAccess = createMemoryEntry({ accessCount: 1 });
    const highAccess = createMemoryEntry({ accessCount: 20 });

    expect(predictForgottenTime(highAccess)).toBeGreaterThan(
      predictForgottenTime(lowAccess)
    );
  });
});

// ============================================================================
// BATCH PROCESSING
// ============================================================================

describe('processMemoryDecay', () => {
  it('separates active and forgotten memories', () => {
    const entries = [
      createMemoryEntry({ id: 'active', lastAccessedAt: new Date() }),
      createMemoryEntry({ id: 'forgotten', lastAccessedAt: daysAgo(180), accessCount: 1, confidence: 0.5 }),
    ];

    const { active, forgotten } = processMemoryDecay(entries);

    expect(active).toHaveLength(1);
    expect(forgotten).toHaveLength(1);
    expect(active[0].id).toBe('active');
    expect(forgotten[0].id).toBe('forgotten');
  });
});

// ============================================================================
// ANALYTICS
// ============================================================================

describe('analyzeMemoryHealth', () => {
  it('returns zeros for empty array', () => {
    const analytics = analyzeMemoryHealth([]);

    expect(analytics.totalMemories).toBe(0);
    expect(analytics.averageRetention).toBe(0);
  });

  it('calculates correct totals', () => {
    const entries = [
      createMemoryEntry({ id: '1' }),
      createMemoryEntry({ id: '2' }),
      createMemoryEntry({ id: '3' }),
    ];

    const analytics = analyzeMemoryHealth(entries);

    expect(analytics.totalMemories).toBe(3);
    expect(analytics.activeMemories).toBe(3);
    expect(analytics.forgottenMemories).toBe(0);
  });
});
