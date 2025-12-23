/**
 * Similarity Tests
 *
 * Verifies vector similarity calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  cosineDistance,
  euclideanDistance,
  euclideanSimilarity,
  dotProduct,
  manhattanDistance,
  normalize,
  magnitude,
  addVectors,
  subtractVectors,
  scaleVector,
  averageVectors,
  findTopK,
} from './similarity';

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('is magnitude-independent', () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('throws on dimension mismatch', () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(() => cosineSimilarity(a, b)).toThrow('dimension mismatch');
  });

  it('returns 0 for zero vectors', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe('cosineDistance', () => {
  it('returns 0 for identical vectors', () => {
    const a = [1, 2, 3];
    expect(cosineDistance(a, a)).toBeCloseTo(0, 5);
  });

  it('returns 2 for opposite vectors', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineDistance(a, b)).toBeCloseTo(2, 5);
  });
});

// ============================================================================
// EUCLIDEAN DISTANCE
// ============================================================================

describe('euclideanDistance', () => {
  it('returns 0 for identical vectors', () => {
    const a = [1, 2, 3];
    expect(euclideanDistance(a, a)).toBe(0);
  });

  it('calculates correct distance', () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it('throws on dimension mismatch', () => {
    const a = [1, 2];
    const b = [1, 2, 3];
    expect(() => euclideanDistance(a, b)).toThrow('dimension mismatch');
  });
});

describe('euclideanSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const a = [1, 2, 3];
    expect(euclideanSimilarity(a, a)).toBe(1);
  });

  it('returns value between 0 and 1', () => {
    const a = [0, 0];
    const b = [10, 10];
    const sim = euclideanSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});

// ============================================================================
// DOT PRODUCT
// ============================================================================

describe('dotProduct', () => {
  it('calculates correct dot product', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(dotProduct(a, b)).toBe(32); // 1*4 + 2*5 + 3*6
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(dotProduct(a, b)).toBe(0);
  });
});

// ============================================================================
// MANHATTAN DISTANCE
// ============================================================================

describe('manhattanDistance', () => {
  it('returns 0 for identical vectors', () => {
    const a = [1, 2, 3];
    expect(manhattanDistance(a, a)).toBe(0);
  });

  it('calculates correct distance', () => {
    const a = [0, 0];
    const b = [3, 4];
    expect(manhattanDistance(a, b)).toBe(7);
  });
});

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

describe('normalize', () => {
  it('creates unit vector', () => {
    const v = [3, 4];
    const normalized = normalize(v);
    expect(magnitude(normalized)).toBeCloseTo(1, 5);
  });

  it('preserves direction', () => {
    const v = [3, 4];
    const normalized = normalize(v);
    expect(normalized[0] / normalized[1]).toBeCloseTo(3 / 4, 5);
  });

  it('handles zero vector', () => {
    const v = [0, 0, 0];
    const normalized = normalize(v);
    expect(normalized).toEqual([0, 0, 0]);
  });
});

describe('magnitude', () => {
  it('calculates correct magnitude', () => {
    expect(magnitude([3, 4])).toBe(5);
  });

  it('returns 0 for zero vector', () => {
    expect(magnitude([0, 0, 0])).toBe(0);
  });
});

describe('addVectors', () => {
  it('adds vectors correctly', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(addVectors(a, b)).toEqual([5, 7, 9]);
  });
});

describe('subtractVectors', () => {
  it('subtracts vectors correctly', () => {
    const a = [4, 5, 6];
    const b = [1, 2, 3];
    expect(subtractVectors(a, b)).toEqual([3, 3, 3]);
  });
});

describe('scaleVector', () => {
  it('scales vector correctly', () => {
    const v = [1, 2, 3];
    expect(scaleVector(v, 2)).toEqual([2, 4, 6]);
  });
});

describe('averageVectors', () => {
  it('calculates average correctly', () => {
    const vectors = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    expect(averageVectors(vectors)).toEqual([3, 4]);
  });

  it('returns empty for empty input', () => {
    expect(averageVectors([])).toEqual([]);
  });
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

describe('findTopK', () => {
  it('finds most similar vectors', () => {
    const query = [1, 0, 0];
    const candidates = [
      [1, 0, 0],    // identical
      [0, 1, 0],    // orthogonal
      [0.9, 0.1, 0], // similar
    ];

    const topK = findTopK(query, candidates, 2);

    expect(topK).toHaveLength(2);
    expect(topK[0].index).toBe(0); // identical should be first
    expect(topK[0].score).toBeCloseTo(1, 2);
  });

  it('respects k limit', () => {
    const query = [1, 0];
    const candidates = [[1, 0], [0, 1], [0.5, 0.5]];

    const topK = findTopK(query, candidates, 2);
    expect(topK).toHaveLength(2);
  });
});
