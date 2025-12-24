/**
 * Similarity
 *
 * Vector similarity calculations for embeddings.
 * Implements multiple distance metrics.
 */

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Calculates cosine similarity between two vectors.
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }

  const mag = Math.sqrt(normA) * Math.sqrt(normB);

  if (mag === 0) {
    return 0;
  }

  return dotProduct / mag;
}

/**
 * Cosine distance (1 - similarity).
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

// ============================================================================
// EUCLIDEAN DISTANCE
// ============================================================================

/**
 * Calculates Euclidean (L2) distance between two vectors.
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Euclidean similarity (normalized to 0-1 range).
 */
export function euclideanSimilarity(a: number[], b: number[]): number {
  const distance = euclideanDistance(a, b);
  return 1 / (1 + distance);
}

// ============================================================================
// DOT PRODUCT
// ============================================================================

/**
 * Calculates dot product of two vectors.
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }

  return sum;
}

// ============================================================================
// MANHATTAN DISTANCE
// ============================================================================

/**
 * Calculates Manhattan (L1) distance between two vectors.
 */
export function manhattanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  }

  return sum;
}

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

/**
 * Normalizes a vector to unit length.
 */
export function normalize(vector: number[]): number[] {
  const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

  if (mag === 0) {
    return vector.map(() => 0);
  }

  return vector.map(v => v / mag);
}

/**
 * Calculates the magnitude (L2 norm) of a vector.
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Adds two vectors element-wise.
 */
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return a.map((v, i) => v + (b[i] ?? 0));
}

/**
 * Subtracts vector b from vector a.
 */
export function subtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  return a.map((v, i) => v - (b[i] ?? 0));
}

/**
 * Multiplies a vector by a scalar.
 */
export function scaleVector(vector: number[], scalar: number): number[] {
  return vector.map(v => v * scalar);
}

/**
 * Calculates the average of multiple vectors.
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimensions = vectors[0]!.length;
  const sum = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('All vectors must have the same dimensions');
    }

    for (let i = 0; i < dimensions; i++) {
      sum[i] += vector[i];
    }
  }

  return sum.map(v => v / vectors.length);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Finds the k most similar vectors to a query.
 */
export function findTopK(
  query: number[],
  candidates: number[][],
  k: number,
  metric: 'cosine' | 'euclidean' | 'dot' = 'cosine'
): { index: number; score: number }[] {
  const similarityFn = metric === 'cosine'
    ? cosineSimilarity
    : metric === 'dot'
      ? dotProduct
      : euclideanSimilarity;

  const scores = candidates.map((candidate, index) => ({
    index,
    score: similarityFn(query, candidate),
  }));

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, k);
}

/**
 * Calculates pairwise similarity matrix.
 */
export function pairwiseSimilarity(
  vectors: number[][],
  metric: 'cosine' | 'euclidean' | 'dot' = 'cosine'
): number[][] {
  const similarityFn = metric === 'cosine'
    ? cosineSimilarity
    : metric === 'dot'
      ? dotProduct
      : euclideanSimilarity;

  const n = vectors.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const score = similarityFn(vectors[i]!, vectors[j]!);
      matrix[i]![j] = score;
      matrix[j]![i] = score;
    }
  }

  return matrix;
}
