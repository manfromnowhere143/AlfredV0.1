/**
 * RAG Service
 * 
 * Document ingestion, chunking, and retrieval.
 * Uses Voyage AI embeddings + pgvector for similarity search.
 */

import type { DatabaseClient } from '@alfred/database';
import { sql } from '@alfred/database';
import type { Document } from '@alfred/rag';
import { chunkDocument, estimateTokens } from '@alfred/rag';
import { getQueryEmbedding, getBatchEmbeddings } from './embedding-service';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  documentId: string;
  chunkType: string;
}

// ============================================================================
// DOCUMENT INGESTION
// ============================================================================

export async function ingestDocument(
  db: DatabaseClient,
  content: string,
  options: {
    type: 'code' | 'markdown' | 'architecture' | 'decision' | 'pattern';
    source?: string;
    filePath?: string;
    title?: string;
    language?: string;
    tags?: string[];
  }
): Promise<{ documentId: string; chunkCount: number }> {
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  // Check if document already exists
  const existingResult = await db.db.execute(sql`
    SELECT id FROM documents WHERE content_hash = ${contentHash} LIMIT 1
  `) as unknown as Array<{ id: string }>;

  if (existingResult.length > 0 && existingResult[0]) {
    const existingId = existingResult[0].id;
    console.log(`[RAG] Document already exists: ${existingId}`);
    return { documentId: existingId, chunkCount: 0 };
  }

  // Create document
  const docResult = await db.db.execute(sql`
    INSERT INTO documents (type, source, file_path, title, content, content_hash, language, tags, quality_tier)
    VALUES (${options.type}, ${options.source || null}, ${options.filePath || null}, ${options.title || null}, ${content}, ${contentHash}, ${options.language || null}, ${JSON.stringify(options.tags || [])}, 'bronze')
    RETURNING id
  `) as unknown as Array<{ id: string }>;

  const docId = docResult[0]?.id;
  if (!docId) throw new Error('Failed to create document');

  // Create Document object for chunking
  const now = new Date();
  const docForChunking: Document = {
    id: docId,
    content,
    source: { 
      type: options.type,
      filePath: options.filePath,
    },
    metadata: { 
      language: options.language,
      title: options.title,
      tags: options.tags,
      quality: 'bronze',
    },
    createdAt: now,
    updatedAt: now,
  };

  const chunks = chunkDocument(docForChunking);
  console.log(`[RAG] Created ${chunks.length} chunks for document ${docId}`);

  if (chunks.length === 0) {
    return { documentId: docId, chunkCount: 0 };
  }

  // Get embeddings for all chunks
  const chunkContents = chunks.map(c => c.content);
  const embeddings = await getBatchEmbeddings(chunkContents);

  // Store chunks with embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    
    if (!chunk || !embedding) continue;

    const embeddingJson = JSON.stringify(embedding.embedding);

    await db.db.execute(sql`
      INSERT INTO chunks (document_id, content, chunk_index, start_offset, end_offset, line_start, line_end, chunk_type, name, embedding, embedding_model, embedded_at, token_count)
      VALUES (${docId}, ${chunk.content}, ${i}, ${chunk.startOffset}, ${chunk.endOffset}, ${chunk.metadata.lineStart}, ${chunk.metadata.lineEnd}, ${chunk.type}, ${chunk.metadata.name || null}, ${embeddingJson}::jsonb, 'voyage-code-2', NOW(), ${estimateTokens(chunk.content)})
    `);
  }

  console.log(`[RAG] Ingested document ${docId} with ${chunks.length} chunks`);
  return { documentId: docId, chunkCount: chunks.length };
}

// ============================================================================
// RETRIEVAL
// ============================================================================

export async function retrieveRelevantChunks(
  db: DatabaseClient,
  query: string,
  options: {
    limit?: number;
    minScore?: number;
  } = {}
): Promise<RetrievedChunk[]> {
  const limit = options.limit || 5;
  const minScore = options.minScore || 0.3;

  // Get query embedding
  const { embedding: queryEmbedding } = await getQueryEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Vector similarity search using pgvector
  const result = await db.db.execute(sql`
    SELECT 
      c.id,
      c.content,
      c.document_id as "documentId",
      c.chunk_type as "chunkType",
      1 - (c.embedding::vector <=> ${embeddingStr}::vector) as similarity
    FROM chunks c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding::vector <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `) as unknown as Array<{ id: string; content: string; documentId: string; chunkType: string; similarity: number }>;

  const chunks: RetrievedChunk[] = [];
  
  for (const row of result) {
    if (row.similarity >= minScore) {
      chunks.push({
        id: row.id,
        content: row.content,
        score: row.similarity,
        documentId: row.documentId,
        chunkType: row.chunkType,
      });
    }
  }

  console.log(`[RAG] Retrieved ${chunks.length} chunks for query`);
  return chunks;
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

export async function buildRAGContext(
  db: DatabaseClient,
  query: string,
  maxTokens: number = 4000
): Promise<string> {
  try {
    const chunks = await retrieveRelevantChunks(db, query, { limit: 10 });
    
    if (chunks.length === 0) {
      return '';
    }

    let context = '\n\n<relevant_context>\n';
    let currentTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = estimateTokens(chunk.content);
      
      if (currentTokens + chunkTokens > maxTokens) {
        break;
      }

      context += `\n--- ${chunk.chunkType} (relevance: ${(chunk.score * 100).toFixed(0)}%) ---\n`;
      context += chunk.content;
      context += '\n';
      
      currentTokens += chunkTokens;
    }

    context += '\n</relevant_context>';
    
    return context;
  } catch (error) {
    console.warn('[RAG] Context retrieval failed:', error);
    return '';
  }
}

// ============================================================================
// SEED DATA
// ============================================================================

export async function seedRAGWithAlfred(db: DatabaseClient): Promise<void> {
  const alfredKnowledge = `
# Alfred Architecture

Alfred is a multi-modal AI assistant with three modes:
- **Builder**: Direct code generation, minimal explanation
- **Mentor**: Teaching with explanations and alternatives  
- **Reviewer**: Code review with best practices

## Stack
- Next.js 14 (App Router)
- TypeScript (strict mode)
- PostgreSQL with pgvector
- Drizzle ORM
- Tailwind CSS

## Key Principles
- Minimal, clean UI
- Fast responses
- Context-aware (remembers user skill level)
- Professional tone (no emoji, no excessive praise)
`;

  await ingestDocument(db, alfredKnowledge, {
    type: 'architecture',
    title: 'Alfred Architecture',
    tags: ['alfred', 'architecture', 'overview'],
  });

  console.log('[RAG] Seeded with Alfred knowledge');
}
