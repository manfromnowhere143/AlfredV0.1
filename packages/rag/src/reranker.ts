/**
 * Reranker
 *
 * Re-ranks retrieval results for improved precision.
 * Implements cross-encoder simulation and multi-signal scoring.
 */

import type { RetrievalResult, ScoreBreakdown } from './types';
import { tokenize } from './retriever';

// ============================================================================
// RERANKER
// ============================================================================

/**
 * Re-ranks results using multiple signals.
 * Simulates cross-encoder behavior without external model.
 */
export function rerank(
  query: string,
  results: RetrievalResult[],
  options: RerankOptions = DEFAULT_RERANK_OPTIONS
): RetrievalResult[] {
  if (results.length === 0) {
    return results;
  }

  const queryTerms = tokenize(query);
  const queryNgrams = generateNgrams(query, 2);

  const reranked = results.map(result => {
    const signals = calculateRerankSignals(
      query,
      queryTerms,
      queryNgrams,
      result.chunk.content
    );

    const rerankScore = combineRerankSignals(signals, options.weights);

    // Blend original score with rerank score
    const blendedScore =
      result.score * (1 - options.rerankWeight) +
      rerankScore * options.rerankWeight;

    return {
      ...result,
      score: blendedScore,
      scoreBreakdown: {
        ...result.scoreBreakdown,
        combined: blendedScore,
      },
    };
  });

  reranked.sort((a, b) => b.score - a.score);

  return reranked;
}

// ============================================================================
// RERANK SIGNALS
// ============================================================================

interface RerankSignals {
  exactMatch: number;
  phraseMatch: number;
  termCoverage: number;
  termProximity: number;
  positionBias: number;
  lengthPenalty: number;
}

interface RerankWeights {
  exactMatch: number;
  phraseMatch: number;
  termCoverage: number;
  termProximity: number;
  positionBias: number;
  lengthPenalty: number;
}

interface RerankOptions {
  weights: RerankWeights;
  rerankWeight: number;
}

const DEFAULT_RERANK_OPTIONS: RerankOptions = {
  weights: {
    exactMatch: 0.25,
    phraseMatch: 0.2,
    termCoverage: 0.2,
    termProximity: 0.15,
    positionBias: 0.1,
    lengthPenalty: 0.1,
  },
  rerankWeight: 0.4,
};

/**
 * Calculates multiple re-ranking signals.
 */
function calculateRerankSignals(
  query: string,
  queryTerms: string[],
  queryNgrams: string[],
  content: string
): RerankSignals {
  const contentLower = content.toLowerCase();
  const contentTerms = tokenize(content);

  return {
    exactMatch: calculateExactMatch(query, contentLower),
    phraseMatch: calculatePhraseMatch(queryNgrams, contentLower),
    termCoverage: calculateTermCoverage(queryTerms, contentTerms),
    termProximity: calculateTermProximity(queryTerms, contentTerms),
    positionBias: calculatePositionBias(queryTerms, contentLower),
    lengthPenalty: calculateLengthPenalty(content),
  };
}

/**
 * Combines signals into final rerank score.
 */
function combineRerankSignals(
  signals: RerankSignals,
  weights: RerankWeights
): number {
  return (
    signals.exactMatch * weights.exactMatch +
    signals.phraseMatch * weights.phraseMatch +
    signals.termCoverage * weights.termCoverage +
    signals.termProximity * weights.termProximity +
    signals.positionBias * weights.positionBias +
    signals.lengthPenalty * weights.lengthPenalty
  );
}

// ============================================================================
// SIGNAL CALCULATIONS
// ============================================================================

/**
 * Checks for exact query match in content.
 */
function calculateExactMatch(query: string, content: string): number {
  const queryLower = query.toLowerCase().trim();
  return content.includes(queryLower) ? 1 : 0;
}

/**
 * Calculates phrase (n-gram) match score.
 */
function calculatePhraseMatch(queryNgrams: string[], content: string): number {
  if (queryNgrams.length === 0) {
    return 0;
  }

  let matches = 0;
  for (const ngram of queryNgrams) {
    if (content.includes(ngram)) {
      matches++;
    }
  }

  return matches / queryNgrams.length;
}

/**
 * Calculates what percentage of query terms appear in content.
 */
function calculateTermCoverage(
  queryTerms: string[],
  contentTerms: string[]
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentSet = new Set(contentTerms);
  let covered = 0;

  for (const term of queryTerms) {
    if (contentSet.has(term)) {
      covered++;
    }
  }

  return covered / queryTerms.length;
}

/**
 * Calculates how close query terms appear to each other in content.
 * Closer terms = higher score.
 */
function calculateTermProximity(
  queryTerms: string[],
  contentTerms: string[]
): number {
  if (queryTerms.length < 2) {
    return 1;
  }

  const positions: Map<string, number[]> = new Map();

  // Find all positions of each query term
  for (let i = 0; i < contentTerms.length; i++) {
    const term = contentTerms[i];
    if (queryTerms.includes(term)) {
      if (!positions.has(term)) {
        positions.set(term, []);
      }
      positions.get(term)!.push(i);
    }
  }

  // If not all terms present, low score
  if (positions.size < 2) {
    return 0;
  }

  // Calculate minimum window containing at least one of each term
  let minWindow = contentTerms.length;

  const positionArrays = Array.from(positions.values());
  const indices = positionArrays.map(() => 0);

  while (true) {
    // Get current positions
    const currentPositions = positionArrays.map((arr, i) => arr[indices[i]]);
    const validPositions = currentPositions.filter(p => p !== undefined);

    if (validPositions.length < positions.size) {
      break;
    }

    const min = Math.min(...validPositions);
    const max = Math.max(...validPositions);
    minWindow = Math.min(minWindow, max - min);

    // Advance the minimum position
    const minIndex = currentPositions.indexOf(min);
    indices[minIndex]++;

    if (indices[minIndex] >= positionArrays[minIndex].length) {
      break;
    }
  }

  // Normalize: smaller window = higher score
  const maxReasonableWindow = 50;
  return Math.max(0, 1 - minWindow / maxReasonableWindow);
}

/**
 * Gives bonus to matches appearing early in content.
 */
function calculatePositionBias(
  queryTerms: string[],
  content: string
): number {
  if (queryTerms.length === 0) {
    return 0;
  }

  let totalBias = 0;

  for (const term of queryTerms) {
    const position = content.indexOf(term);
    if (position >= 0) {
      // Exponential decay: earlier = higher score
      const normalizedPosition = position / content.length;
      totalBias += Math.exp(-3 * normalizedPosition);
    }
  }

  return totalBias / queryTerms.length;
}

/**
 * Penalizes very short or very long content.
 * Optimal range: 100-1000 characters.
 */
function calculateLengthPenalty(content: string): number {
  const length = content.length;
  const optimalMin = 100;
  const optimalMax = 1000;

  if (length < optimalMin) {
    return length / optimalMin;
  }

  if (length > optimalMax) {
    return Math.max(0.5, optimalMax / length);
  }

  return 1;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generates n-grams from text.
 */
export function generateNgrams(text: string, n: number): string[] {
  const words = text.toLowerCase().split(/\s+/);

  if (words.length < n) {
    return [words.join(' ')];
  }

  const ngrams: string[] = [];

  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }

  return ngrams;
}

/**
 * Reciprocal Rank Fusion for combining multiple rankings.
 * Useful when combining results from multiple retrievers.
 */
export function reciprocalRankFusion(
  rankings: RetrievalResult[][],
  k: number = 60
): RetrievalResult[] {
  const scores = new Map<string, { result: RetrievalResult; score: number }>();

  for (const ranking of rankings) {
    for (let rank = 0; rank < ranking.length; rank++) {
      const result = ranking[rank];
      const rrfScore = 1 / (k + rank + 1);

      if (scores.has(result.chunk.id)) {
        scores.get(result.chunk.id)!.score += rrfScore;
      } else {
        scores.set(result.chunk.id, { result, score: rrfScore });
      }
    }
  }

  const fused = Array.from(scores.values());
  fused.sort((a, b) => b.score - a.score);

  return fused.map(({ result, score }) => ({
    ...result,
    score,
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_RERANK_OPTIONS };
export type { RerankOptions, RerankWeights, RerankSignals };
