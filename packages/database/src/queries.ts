/**
 * Database Queries
 *
 * Type-safe query functions for all database operations.
 * Organized by domain: users, conversations, memory, rag.
 */

import { eq, and, desc, asc, gte, lte, isNull, sql } from 'drizzle-orm';
import type { DatabaseClient, Transaction } from './client';
import * as schema from './schema';

// ============================================================================
// USER QUERIES
// ============================================================================

export interface CreateUserInput {
  email?: string;
  externalId?: string;
  tier?: 'free' | 'pro' | 'enterprise';
  metadata?: Record<string, unknown>;
}

export async function createUser(
  client: DatabaseClient,
  input: CreateUserInput
) {
  const [user] = await client.db
    .insert(schema.users)
    .values({
      email: input.email,
      externalId: input.externalId,
      tier: input.tier || 'free',
      metadata: input.metadata,
    })
    .returning();
  
  return user;
}

export async function getUserById(client: DatabaseClient, id: string) {
  const [user] = await client.db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)));
  
  return user || null;
}

export async function getUserByEmail(client: DatabaseClient, email: string) {
  const [user] = await client.db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)));
  
  return user || null;
}

export async function getUserByExternalId(client: DatabaseClient, externalId: string) {
  const [user] = await client.db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.externalId, externalId), isNull(schema.users.deletedAt)));
  
  return user || null;
}

export async function updateUser(
  client: DatabaseClient,
  id: string,
  updates: Partial<{
    tier: 'free' | 'pro' | 'enterprise';
    defaultMode: 'builder' | 'mentor' | 'reviewer';
    optimizeFor: string;
    verbosity: string;
    skillLevel: 'beginner' | 'intermediate' | 'experienced' | 'inferred';
    skillConfidence: number;
    metadata: Record<string, unknown>;
  }>
) {
  const [user] = await client.db
    .update(schema.users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  
  return user;
}

export async function softDeleteUser(client: DatabaseClient, id: string) {
  await client.db
    .update(schema.users)
    .set({ deletedAt: new Date() })
    .where(eq(schema.users.id, id));
}

// ============================================================================
// CONVERSATION QUERIES
// ============================================================================

export interface CreateConversationInput {
  userId?: string;
  mode?: 'builder' | 'mentor' | 'reviewer';
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export async function createConversation(
  client: DatabaseClient,
  input: CreateConversationInput
) {
  const [conversation] = await client.db
    .insert(schema.conversations)
    .values({
      userId: input.userId,
      mode: input.mode || 'builder',
      projectId: input.projectId,
      metadata: input.metadata,
    })
    .returning();
  
  return conversation;
}

export async function getConversationById(client: DatabaseClient, id: string) {
  const [conversation] = await client.db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.id, id), isNull(schema.conversations.deletedAt)));
  
  return conversation || null;
}

export async function getConversationsByUserId(
  client: DatabaseClient,
  userId: string,
  limit = 50
) {
  return client.db
    .select()
    .from(schema.conversations)
    .where(and(
      eq(schema.conversations.userId, userId),
      isNull(schema.conversations.deletedAt)
    ))
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(limit);
}

export async function updateConversation(
  client: DatabaseClient,
  id: string,
  updates: Partial<{
    mode: 'builder' | 'mentor' | 'reviewer';
    title: string;
    summary: string;
    projectId: string;
    messageCount: number;
    tokenCount: number;
    lastMessageAt: Date;
    endedAt: Date;
    metadata: Record<string, unknown>;
  }>
) {
  const [conversation] = await client.db
    .update(schema.conversations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.conversations.id, id))
    .returning();
  
  return conversation;
}

export async function incrementConversationCounts(
  client: DatabaseClient,
  id: string,
  messageIncrement: number,
  tokenIncrement: number
) {
  const [conversation] = await client.db
    .update(schema.conversations)
    .set({
      messageCount: sql`${schema.conversations.messageCount} + ${messageIncrement}`,
      tokenCount: sql`${schema.conversations.tokenCount} + ${tokenIncrement}`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.conversations.id, id))
    .returning();
  
  return conversation;
}

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

export interface CreateMessageInput {
  conversationId: string;
  role: 'user' | 'alfred';
  content: string;
  mode?: 'builder' | 'mentor' | 'reviewer';
  modeChanged?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  attachments?: Array<{ type: string; content: string; metadata?: Record<string, string> }>;
  artifacts?: Array<{ id: string; type: string; title: string; content: string; language?: string }>;
  metadata?: Record<string, unknown>;
}

export async function createMessage(
  client: DatabaseClient,
  input: CreateMessageInput
) {
  const [message] = await client.db
    .insert(schema.messages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      mode: input.mode,
      modeChanged: input.modeChanged || false,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      attachments: input.attachments,
      artifacts: input.artifacts,
      metadata: input.metadata,
    })
    .returning();
  
  return message;
}

export async function getMessagesByConversationId(
  client: DatabaseClient,
  conversationId: string,
  limit = 100
) {
  return client.db
    .select()
    .from(schema.messages)
    .where(and(
      eq(schema.messages.conversationId, conversationId),
      isNull(schema.messages.deletedAt)
    ))
    .orderBy(asc(schema.messages.createdAt))
    .limit(limit);
}

export async function getRecentMessages(
  client: DatabaseClient,
  conversationId: string,
  limit = 10
) {
  return client.db
    .select()
    .from(schema.messages)
    .where(and(
      eq(schema.messages.conversationId, conversationId),
      isNull(schema.messages.deletedAt)
    ))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit);
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string;
  type?: 'web_app' | 'dashboard' | 'api' | 'library' | 'other';
  stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
  };
  metadata?: Record<string, unknown>;
}

export async function createProject(
  client: DatabaseClient,
  input: CreateProjectInput
) {
  const [project] = await client.db
    .insert(schema.projects)
    .values({
      userId: input.userId,
      name: input.name,
      description: input.description,
      type: input.type || 'web_app',
      stack: input.stack,
      metadata: input.metadata,
    })
    .returning();
  
  return project;
}

export async function getProjectById(client: DatabaseClient, id: string) {
  const [project] = await client.db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), isNull(schema.projects.deletedAt)));
  
  return project || null;
}

export async function getProjectsByUserId(
  client: DatabaseClient,
  userId: string,
  limit = 50
) {
  return client.db
    .select()
    .from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      isNull(schema.projects.deletedAt)
    ))
    .orderBy(desc(schema.projects.updatedAt))
    .limit(limit);
}

export async function updateProject(
  client: DatabaseClient,
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    type: 'web_app' | 'dashboard' | 'api' | 'library' | 'other';
    stack: {
      frontend?: string[];
      backend?: string[];
      database?: string[];
      infrastructure?: string[];
    };
    architecture: {
      components?: string[];
      dataFlow?: string;
      stateManagement?: string;
      capturedAt?: string;
    };
    repositoryUrl: string;
    repositoryBranch: string;
    lastSyncedAt: Date;
    metadata: Record<string, unknown>;
  }>
) {
  const [project] = await client.db
    .update(schema.projects)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning();
  
  return project;
}

// ============================================================================
// MEMORY QUERIES
// ============================================================================

export interface CreateMemoryEntryInput {
  userId: string;
  projectId?: string;
  type: 'preference' | 'project' | 'decision' | 'skill_signal' | 'stack_preference';
  content: string;
  confidence?: number;
  sourceConversationId?: string;
  sourceMessageId?: string;
  metadata?: Record<string, unknown>;
}

export async function createMemoryEntry(
  client: DatabaseClient,
  input: CreateMemoryEntryInput
) {
  const [entry] = await client.db
    .insert(schema.memoryEntries)
    .values({
      userId: input.userId,
      projectId: input.projectId,
      type: input.type,
      content: input.content,
      confidence: input.confidence || 0.8,
      sourceConversationId: input.sourceConversationId,
      sourceMessageId: input.sourceMessageId,
      metadata: input.metadata,
    })
    .returning();
  
  return entry;
}

export async function getMemoryEntriesByUserId(
  client: DatabaseClient,
  userId: string,
  options: {
    type?: 'preference' | 'project' | 'decision' | 'skill_signal' | 'stack_preference';
    projectId?: string;
    minConfidence?: number;
    limit?: number;
  } = {}
) {
  const conditions = [
    eq(schema.memoryEntries.userId, userId),
    isNull(schema.memoryEntries.deletedAt),
  ];

  if (options.type) {
    conditions.push(eq(schema.memoryEntries.type, options.type));
  }

  if (options.projectId) {
    conditions.push(eq(schema.memoryEntries.projectId, options.projectId));
  }

  if (options.minConfidence !== undefined) {
    conditions.push(gte(schema.memoryEntries.confidence, options.minConfidence));
  }

  return client.db
    .select()
    .from(schema.memoryEntries)
    .where(and(...conditions))
    .orderBy(desc(schema.memoryEntries.confidence))
    .limit(options.limit || 100);
}

export async function reinforceMemoryEntry(
  client: DatabaseClient,
  id: string,
  confidenceBoost: number
) {
  const [entry] = await client.db
    .update(schema.memoryEntries)
    .set({
      accessCount: sql`${schema.memoryEntries.accessCount} + 1`,
      lastAccessedAt: new Date(),
      confidence: sql`LEAST(1.0, ${schema.memoryEntries.confidence} + ${confidenceBoost})`,
      updatedAt: new Date(),
    })
    .where(eq(schema.memoryEntries.id, id))
    .returning();
  
  return entry;
}

export async function decayMemoryEntries(
  client: DatabaseClient,
  userId: string,
  decayFactor: number
) {
  return client.db
    .update(schema.memoryEntries)
    .set({
      confidence: sql`${schema.memoryEntries.confidence} * ${decayFactor}`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(schema.memoryEntries.userId, userId),
      isNull(schema.memoryEntries.deletedAt)
    ));
}

export async function deleteExpiredMemories(client: DatabaseClient) {
  return client.db
    .update(schema.memoryEntries)
    .set({ deletedAt: new Date() })
    .where(and(
      lte(schema.memoryEntries.confidence, 0.1),
      isNull(schema.memoryEntries.deletedAt)
    ));
}

// ============================================================================
// DOCUMENT QUERIES (RAG)
// ============================================================================

export interface CreateDocumentInput {
  type: 'code' | 'markdown' | 'architecture' | 'decision' | 'pattern';
  content: string;
  contentHash: string;
  source?: string;
  filePath?: string;
  url?: string;
  title?: string;
  qualityTier?: 'gold' | 'silver' | 'bronze';
  language?: string;
  framework?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export async function createDocument(
  client: DatabaseClient,
  input: CreateDocumentInput
) {
  const [document] = await client.db
    .insert(schema.documents)
    .values({
      type: input.type,
      content: input.content,
      contentHash: input.contentHash,
      source: input.source,
      filePath: input.filePath,
      url: input.url,
      title: input.title,
      qualityTier: input.qualityTier || 'bronze',
      language: input.language,
      framework: input.framework,
      tags: input.tags,
      metadata: input.metadata,
    })
    .returning();
  
  return document;
}

export async function getDocumentByHash(client: DatabaseClient, contentHash: string) {
  const [document] = await client.db
    .select()
    .from(schema.documents)
    .where(and(
      eq(schema.documents.contentHash, contentHash),
      isNull(schema.documents.deletedAt)
    ));
  
  return document || null;
}

export async function getDocumentsByType(
  client: DatabaseClient,
  type: 'code' | 'markdown' | 'architecture' | 'decision' | 'pattern',
  limit = 100
) {
  return client.db
    .select()
    .from(schema.documents)
    .where(and(
      eq(schema.documents.type, type),
      isNull(schema.documents.deletedAt)
    ))
    .orderBy(desc(schema.documents.createdAt))
    .limit(limit);
}

// ============================================================================
// CHUNK QUERIES (RAG)
// ============================================================================

export interface CreateChunkInput {
  documentId: string;
  content: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  lineStart: number;
  lineEnd: number;
  chunkType: string;
  name?: string;
  embedding?: number[];
  embeddingModel?: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export async function createChunk(
  client: DatabaseClient,
  input: CreateChunkInput
) {
  const [chunk] = await client.db
    .insert(schema.chunks)
    .values({
      documentId: input.documentId,
      content: input.content,
      chunkIndex: input.chunkIndex,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      lineStart: input.lineStart,
      lineEnd: input.lineEnd,
      chunkType: input.chunkType,
      name: input.name,
      embedding: input.embedding,
      embeddingModel: input.embeddingModel,
      embeddedAt: input.embedding ? new Date() : undefined,
      tokenCount: input.tokenCount,
      metadata: input.metadata,
    })
    .returning();
  
  return chunk;
}

export async function createChunks(
  client: DatabaseClient,
  inputs: CreateChunkInput[]
) {
  if (inputs.length === 0) return [];
  
  return client.db
    .insert(schema.chunks)
    .values(inputs.map(input => ({
      documentId: input.documentId,
      content: input.content,
      chunkIndex: input.chunkIndex,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      lineStart: input.lineStart,
      lineEnd: input.lineEnd,
      chunkType: input.chunkType,
      name: input.name,
      embedding: input.embedding,
      embeddingModel: input.embeddingModel,
      embeddedAt: input.embedding ? new Date() : undefined,
      tokenCount: input.tokenCount,
      metadata: input.metadata,
    })))
    .returning();
}

export async function getChunksByDocumentId(
  client: DatabaseClient,
  documentId: string
) {
  return client.db
    .select()
    .from(schema.chunks)
    .where(eq(schema.chunks.documentId, documentId))
    .orderBy(asc(schema.chunks.chunkIndex));
}

export async function updateChunkEmbedding(
  client: DatabaseClient,
  id: string,
  embedding: number[],
  model: string
) {
  const [chunk] = await client.db
    .update(schema.chunks)
    .set({
      embedding,
      embeddingModel: model,
      embeddedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.chunks.id, id))
    .returning();
  
  return chunk;
}

export async function getChunksWithoutEmbeddings(
  client: DatabaseClient,
  limit = 100
) {
  return client.db
    .select()
    .from(schema.chunks)
    .where(isNull(schema.chunks.embedding))
    .limit(limit);
}

// ============================================================================
// API KEY QUERIES
// ============================================================================

export async function createApiKey(
  client: DatabaseClient,
  input: {
    userId: string;
    keyHash: string;
    keyPrefix: string;
    name: string;
    scopes?: string[];
    expiresAt?: Date;
  }
) {
  const [key] = await client.db
    .insert(schema.apiKeys)
    .values({
      userId: input.userId,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      name: input.name,
      scopes: input.scopes || [],
      expiresAt: input.expiresAt,
    })
    .returning();
  
  return key;
}

export async function getApiKeyByHash(client: DatabaseClient, keyHash: string) {
  const [key] = await client.db
    .select()
    .from(schema.apiKeys)
    .where(and(
      eq(schema.apiKeys.keyHash, keyHash),
      isNull(schema.apiKeys.revokedAt)
    ));
  
  return key || null;
}

export async function recordApiKeyUsage(client: DatabaseClient, id: string) {
  await client.db
    .update(schema.apiKeys)
    .set({
      lastUsedAt: new Date(),
      usageCount: sql`${schema.apiKeys.usageCount} + 1`,
    })
    .where(eq(schema.apiKeys.id, id));
}

// ============================================================================
// USAGE QUERIES
// ============================================================================

export async function getOrCreateUsageRecord(
  client: DatabaseClient,
  userId: string,
  periodType: 'daily' | 'monthly'
) {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (periodType === 'daily') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Try to find existing
  const [existing] = await client.db
    .select()
    .from(schema.usageRecords)
    .where(and(
      eq(schema.usageRecords.userId, userId),
      eq(schema.usageRecords.periodType, periodType),
      eq(schema.usageRecords.periodStart, periodStart)
    ));

  if (existing) return existing;

  // Create new
  const [record] = await client.db
    .insert(schema.usageRecords)
    .values({
      userId,
      periodType,
      periodStart,
      periodEnd,
    })
    .returning();

  return record;
}

export async function incrementUsage(
  client: DatabaseClient,
  userId: string,
  periodType: 'daily' | 'monthly',
  increments: {
    requests?: number;
    tokens?: number;
    conversations?: number;
  }
) {
  const record = await getOrCreateUsageRecord(client, userId, periodType);

  const [updated] = await client.db
    .update(schema.usageRecords)
    .set({
      requestCount: sql`${schema.usageRecords.requestCount} + ${increments.requests || 0}`,
      tokenCount: sql`${schema.usageRecords.tokenCount} + ${increments.tokens || 0}`,
      conversationCount: sql`${schema.usageRecords.conversationCount} + ${increments.conversations || 0}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.usageRecords.id, record.id))
    .returning();

  return updated;
}
