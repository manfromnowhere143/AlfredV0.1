/**
 * RAG Types
 *
 * Type definitions for the retrieval system.
 */

// ============================================================================
// DOCUMENTS
// ============================================================================

export interface Document {
  id: string;
  source: DocumentSource;
  content: string;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSource {
  type: 'code' | 'markdown' | 'architecture' | 'decision' | 'pattern';
  repository?: string;
  filePath?: string;
  url?: string;
}

export interface DocumentMetadata {
  title?: string;
  language?: string;
  framework?: string[];
  tags?: string[];
  quality: QualityTier;
}

export type QualityTier = 'gold' | 'silver' | 'bronze';

// ============================================================================
// CHUNKS
// ============================================================================

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  startOffset: number;
  endOffset: number;
  type: ChunkType;
  metadata: ChunkMetadata;
}

export type ChunkType =
  | 'function'
  | 'class'
  | 'component'
  | 'interface'
  | 'import_block'
  | 'comment_block'
  | 'paragraph'
  | 'code_block'
  | 'section'
  | 'generic';

export interface ChunkMetadata {
  name?: string;
  signature?: string;
  dependencies?: string[];
  exports?: string[];
  lineStart: number;
  lineEnd: number;
  tokenEstimate: number;
}

// ============================================================================
// EMBEDDINGS
// ============================================================================

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
  embeddingModel: string;
  embeddedAt: Date;
}

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  maxTokens: number;
}

// ============================================================================
// RETRIEVAL
// ============================================================================

export interface RetrievalQuery {
  text: string;
  filters?: RetrievalFilters;
  options?: RetrievalOptions;
}

export interface RetrievalFilters {
  sourceTypes?: DocumentSource['type'][];
  languages?: string[];
  frameworks?: string[];
  qualityTiers?: QualityTier[];
  repositories?: string[];
  tags?: string[];
}

export interface RetrievalOptions {
  limit: number;
  minScore: number;
  includeMetadata: boolean;
  diversityWeight: number;
  rerank: boolean;
}

export const DEFAULT_RETRIEVAL_OPTIONS: RetrievalOptions = {
  limit: 10,
  minScore: 0.5,
  includeMetadata: true,
  diversityWeight: 0.3,
  rerank: true,
};

// ============================================================================
// RESULTS
// ============================================================================

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  semantic: number;
  keyword: number;
  quality: number;
  recency: number;
  diversity: number;
  combined: number;
}

export interface RetrievalResponse {
  query: string;
  results: RetrievalResult[];
  totalCandidates: number;
  processingTimeMs: number;
}

// ============================================================================
// INDEX
// ============================================================================

export interface IndexStats {
  totalDocuments: number;
  totalChunks: number;
  embeddedChunks: number;
  bySourceType: Record<string, number>;
  byQualityTier: Record<QualityTier, number>;
  lastUpdated: Date;
}

// ============================================================================
// CHUNKING CONFIG
// ============================================================================

export interface ChunkingConfig {
  maxTokens: number;
  minTokens: number;
  overlap: number;
  respectBoundaries: boolean;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxTokens: 512,
  minTokens: 50,
  overlap: 50,
  respectBoundaries: true,
};
