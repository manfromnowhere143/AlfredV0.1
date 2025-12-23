/**
 * @alfred/rag
 *
 * Knowledge retrieval system.
 * Semantic chunking. Hybrid search. Re-ranking.
 *
 * Architecture:
 * - Chunker: Splits documents respecting code boundaries
 * - Embedder: Converts text to vectors (provider-agnostic)
 * - Index: Stores and searches vectors
 * - Retriever: Hybrid search + re-ranking
 */

export const VERSION = '0.1.0';

export * from './types';
export * from './chunker';
export * from './similarity';
export * from './retriever';
export * from './reranker';
