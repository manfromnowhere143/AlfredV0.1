/**
 * Retriever
 *
 * Hybrid retrieval combining semantic and keyword search.
 * Implements BM25 for keyword matching + vector similarity.
 */

import {
  Chunk,
  EmbeddedChunk,
  RetrievalQuery,
  RetrievalResult,
  RetrievalOptions,
  RetrievalResponse,
  DEFAULT_RETRIEVAL_OPTIONS,
  ScoreBreakdown,
} from './types';
import { cosineSimilarity } from './similarity';

// ============================================================================
// HYBRID RETRIEVER
// ============================================================================

/**
 * Performs hybrid retrieval combining semantic and keyword search.
 */
export function hybridRetrieve(
  query: RetrievalQuery,
  chunks: EmbeddedChunk[],
  queryEmbedding: number[],
  options: RetrievalOptions = DEFAULT_RETRIEVAL_OPTIONS
): RetrievalResponse {
  const startTime = Date.now();

  // Apply filters
  const candidates = applyFilters(chunks, query.filters);

  // Calculate semantic scores
  const semanticScores = calculateSemanticScores(candidates, queryEmbedding);

  // Calculate keyword scores (BM25)
  const keywordScores = calculateBM25Scores(candidates, query.text);

  // Combine scores
  const results = combineScores(
    candidates,
    semanticScores,
    keywordScores
  );

  // Filter by minimum score
  const filtered = results.filter(r => r.score >= options.minScore);

  // Apply diversity sampling if enabled
  const diverse = options.diversityWeight > 0
    ? applyDiversitySampling(filtered, options.diversityWeight, options.limit)
    : filtered.slice(0, options.limit);

  return {
    query: query.text,
    results: diverse,
    totalCandidates: candidates.length,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

/**
 * Calculates semantic similarity scores for all chunks.
 */
export function calculateSemanticScores(
  chunks: EmbeddedChunk[],
  queryEmbedding: number[]
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const chunk of chunks) {
    if (chunk.embedding && chunk.embedding.length > 0) {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      // Normalize to 0-1 range (cosine can be -1 to 1)
      scores.set(chunk.id, (score + 1) / 2);
    } else {
      scores.set(chunk.id, 0);
    }
  }

  return scores;
}

// ============================================================================
// BM25 KEYWORD SEARCH
// ============================================================================

/**
 * BM25 parameters.
 */
const BM25_K1 = 1.2; // Term frequency saturation
const BM25_B = 0.75; // Length normalization

/**
 * Calculates BM25 scores for keyword matching.
 */
export function calculateBM25Scores(
  chunks: Chunk[],
  query: string
): Map<string, number> {
  const scores = new Map<string, number>();
  const queryTerms = tokenize(query);

  if (queryTerms.length === 0) {
    chunks.forEach(chunk => scores.set(chunk.id, 0));
    return scores;
  }

  // Calculate corpus statistics
  const avgDocLength = chunks.reduce(
    (sum, c) => sum + tokenize(c.content).length,
    0
  ) / chunks.length;

  // Calculate IDF for each query term
  const idfScores = calculateIDF(chunks, queryTerms);

  // Calculate BM25 for each chunk
  for (const chunk of chunks) {
    const docTerms = tokenize(chunk.content);
    const docLength = docTerms.length;
    const termFrequencies = calculateTermFrequencies(docTerms);

    let score = 0;

    for (const term of queryTerms) {
      const tf = termFrequencies.get(term) || 0;
      const idf = idfScores.get(term) || 0;

      // BM25 formula
      const numerator = tf * (BM25_K1 + 1);
      const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    }

    // Normalize score to 0-1 range
    const maxPossibleScore = queryTerms.length * Math.max(...Array.from(idfScores.values())) * (BM25_K1 + 1);
    const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0;

    scores.set(chunk.id, Math.min(1, normalizedScore));
  }

  return scores;
}

/**
 * Calculates Inverse Document Frequency for terms.
 */
function calculateIDF(chunks: Chunk[], terms: string[]): Map<string, number> {
  const idfScores = new Map<string, number>();
  const N = chunks.length;

  for (const term of terms) {
    // Count documents containing this term
    const docsWithTerm = chunks.filter(c =>
      tokenize(c.content).includes(term)
    ).length;

    // IDF formula: log((N - n + 0.5) / (n + 0.5))
    const idf = Math.log((N - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
    idfScores.set(term, Math.max(0, idf));
  }

  return idfScores;
}

/**
 * Calculates term frequencies in a document.
 */
function calculateTermFrequencies(terms: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const term of terms) {
    frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }

  return frequencies;
}

/**
 * Tokenizes text into lowercase terms.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2);
}

// ============================================================================
// SCORE COMBINATION
// ============================================================================

/**
 * Combines semantic and keyword scores with quality weighting.
 */
function combineScores(
  chunks: EmbeddedChunk[],
  semanticScores: Map<string, number>,
  keywordScores: Map<string, number>
): RetrievalResult[] {
  const results: RetrievalResult[] = [];

  // Weight distribution: 60% semantic, 30% keyword, 10% quality
  const SEMANTIC_WEIGHT = 0.6;
  const KEYWORD_WEIGHT = 0.3;
  const QUALITY_WEIGHT = 0.1;

  for (const chunk of chunks) {
    const semantic = semanticScores.get(chunk.id) || 0;
    const keyword = keywordScores.get(chunk.id) || 0;
    const quality = getQualityScore(chunk);

    const combined =
      semantic * SEMANTIC_WEIGHT +
      keyword * KEYWORD_WEIGHT +
      quality * QUALITY_WEIGHT;

    const breakdown: ScoreBreakdown = {
      semantic,
      keyword,
      quality,
      recency: 1, // Not implemented yet
      diversity: 1, // Applied later
      combined,
    };

    results.push({
      chunk,
      score: combined,
      scoreBreakdown: breakdown,
    });
  }

  // Sort by combined score
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Gets quality score based on chunk metadata.
 */
function getQualityScore(chunk: Chunk): number {
  // This would be enhanced with actual quality metadata
  // For now, use token estimate as proxy (well-documented = more tokens)
  const tokenScore = Math.min(chunk.metadata.tokenEstimate / 500, 1);
  return tokenScore;
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Applies filters to candidate chunks.
 */
function applyFilters(
  chunks: EmbeddedChunk[],
  filters?: RetrievalQuery['filters']
): EmbeddedChunk[] {
  if (!filters) {
    return chunks;
  }

  return chunks.filter(() => {
    // Source type filter
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      // Would need document reference to filter by source type
      // Skip for now
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      // Would need metadata to filter
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      // Would need metadata to filter
    }

    return true;
  });
}

// ============================================================================
// DIVERSITY SAMPLING
// ============================================================================

/**
 * Applies Maximal Marginal Relevance (MMR) for diversity.
 * Balances relevance with diversity to avoid redundant results.
 */
export function applyDiversitySampling(
  results: RetrievalResult[],
  diversityWeight: number,
  limit: number
): RetrievalResult[] {
  if (results.length <= limit) {
    return results;
  }

  const selected: RetrievalResult[] = [];
  const remaining = [...results];

  // Always include the top result
  const first = remaining.shift();
  if (first) selected.push(first);

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (!candidate) continue;

      // Calculate maximum similarity to already selected results
      const maxSimilarity = Math.max(
        ...selected.map(s => contentSimilarity(candidate.chunk.content, s.chunk.content))
      );

      // MMR score: relevance - diversity_weight * max_similarity
      const mmrScore = candidate.score - diversityWeight * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }

    // Update diversity score in breakdown
    const selectedResult = remaining[bestIndex];
    if (!selectedResult) break;
    
    selectedResult.scoreBreakdown.diversity = 1 - (
      Math.max(...selected.map(s =>
        contentSimilarity(selectedResult.chunk.content, s.chunk.content)
      ))
    );

    const spliced = remaining.splice(bestIndex, 1)[0];
    if (spliced) selected.push(spliced);
  }

  return selected;
}

/**
 * Simple content similarity using Jaccard index.
 */
function contentSimilarity(a: string, b: string): number {
  const termsA = new Set(tokenize(a));
  const termsB = new Set(tokenize(b));

  const intersection = new Set([...termsA].filter(t => termsB.has(t)));
  const union = new Set([...termsA, ...termsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}