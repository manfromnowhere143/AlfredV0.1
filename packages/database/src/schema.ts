/**
 * Database Schema
 *
 * PostgreSQL schema using Drizzle ORM.
 * Designed for Alfred's memory, conversations, and RAG.
 *
 * Principles:
 * - UUIDs for all primary keys
 * - Soft deletes for audit trail
 * - JSONB for flexible metadata
 * - Proper indexes for every query pattern
 * - pgvector for embedding similarity search
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userTierEnum = pgEnum('user_tier', ['free', 'pro', 'enterprise']);
export const alfredFacetEnum = pgEnum('alfred_facet', ['build', 'teach', 'review']);
export const skillLevelEnum = pgEnum('skill_level', ['beginner', 'intermediate', 'experienced', 'expert']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'alfred']);
export const memoryTypeEnum = pgEnum('memory_type', ['preference', 'project', 'decision', 'skill_signal', 'stack_preference']);
export const projectTypeEnum = pgEnum('project_type', ['web_app', 'dashboard', 'api', 'library', 'other']);
export const documentTypeEnum = pgEnum('document_type', ['code', 'markdown', 'architecture', 'decision', 'pattern']);
export const qualityTierEnum = pgEnum('quality_tier', ['gold', 'silver', 'bronze']);

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  externalId: varchar('external_id', { length: 255 }).unique(),
  tier: userTierEnum('tier').notNull().default('free'),
  
  // Preferences
  defaultMode: alfredFacetEnum('default_mode').notNull().default('build'),
  optimizeFor: varchar('optimize_for', { length: 50 }).notNull().default('clarity'),
  verbosity: varchar('verbosity', { length: 50 }).notNull().default('minimal'),
  
  // Skill profile
  skillLevel: skillLevelEnum('skill_level').notNull().default('intermediate'),
  skillConfidence: real('skill_confidence').notNull().default(0),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('users_email_idx').on(table.email),
  index('users_external_id_idx').on(table.externalId),
  index('users_tier_idx').on(table.tier),
  index('users_created_at_idx').on(table.createdAt),
]);

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  
  // State
  mode: alfredFacetEnum('mode').notNull().default('build'),
  title: varchar('title', { length: 255 }),
  summary: text('summary'),
  
  // Context
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  
  // Metrics
  messageCount: integer('message_count').notNull().default(0),
  tokenCount: integer('token_count').notNull().default(0),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('conversations_user_id_idx').on(table.userId),
  index('conversations_project_id_idx').on(table.projectId),
  index('conversations_started_at_idx').on(table.startedAt),
  index('conversations_last_message_at_idx').on(table.lastMessageAt),
]);

// ============================================================================
// MESSAGES
// ============================================================================

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  // Content
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  
  // Context
  mode: alfredFacetEnum('mode'),
  modeChanged: boolean('mode_changed').notNull().default(false),
  
  // Tokens
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  
  // Attachments and artifacts stored as JSONB
  attachments: jsonb('attachments').$type<Array<{
    type: string;
    content: string;
    metadata?: Record<string, string>;
  }>>(),
  artifacts: jsonb('artifacts').$type<Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    language?: string;
  }>>(),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('messages_conversation_id_idx').on(table.conversationId),
  index('messages_role_idx').on(table.role),
  index('messages_created_at_idx').on(table.createdAt),
]);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Identity
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: projectTypeEnum('type').notNull().default('web_app'),
  
  // Stack (stored as JSONB for flexibility)
  stack: jsonb('stack').$type<{
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
  }>(),
  
  // Architecture snapshot
  architecture: jsonb('architecture').$type<{
    components?: string[];
    dataFlow?: string;
    stateManagement?: string;
    capturedAt?: string;
  }>(),
  
  // Repository
  repositoryUrl: varchar('repository_url', { length: 500 }),
  repositoryBranch: varchar('repository_branch', { length: 255 }),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('projects_user_id_idx').on(table.userId),
  index('projects_type_idx').on(table.type),
  index('projects_created_at_idx').on(table.createdAt),
  uniqueIndex('projects_user_name_idx').on(table.userId, table.name),
]);

// ============================================================================
// PROJECT DECISIONS
// ============================================================================

export const projectDecisions = pgTable('project_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  
  // Decision content
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  rationale: text('rationale').notNull(),
  alternatives: jsonb('alternatives').$type<string[]>().notNull().default([]),
  
  // Confidence
  confidence: real('confidence').notNull().default(0.8),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  madeAt: timestamp('made_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('project_decisions_project_id_idx').on(table.projectId),
  index('project_decisions_conversation_id_idx').on(table.conversationId),
  index('project_decisions_made_at_idx').on(table.madeAt),
]);

// ============================================================================
// MEMORY ENTRIES
// ============================================================================

export const memoryEntries = pgTable('memory_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  
  // Memory content
  type: memoryTypeEnum('type').notNull(),
  content: text('content').notNull(),
  
  // Decay tracking (Ebbinghaus model)
  confidence: real('confidence').notNull().default(0.8),
  accessCount: integer('access_count').notNull().default(1),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow(),
  
  // Source tracking
  sourceConversationId: uuid('source_conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  sourceMessageId: uuid('source_message_id').references(() => messages.id, { onDelete: 'set null' }),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('memory_entries_user_id_idx').on(table.userId),
  index('memory_entries_project_id_idx').on(table.projectId),
  index('memory_entries_type_idx').on(table.type),
  index('memory_entries_confidence_idx').on(table.confidence),
  index('memory_entries_last_accessed_at_idx').on(table.lastAccessedAt),
]);

// ============================================================================
// DOCUMENTS (RAG Knowledge Base)
// ============================================================================

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Source
  type: documentTypeEnum('type').notNull(),
  source: varchar('source', { length: 500 }),
  filePath: varchar('file_path', { length: 500 }),
  url: varchar('url', { length: 500 }),
  
  // Content
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  
  // Quality
  qualityTier: qualityTierEnum('quality_tier').notNull().default('bronze'),
  
  // Metadata
  language: varchar('language', { length: 50 }),
  framework: jsonb('framework').$type<string[]>(),
  tags: jsonb('tags').$type<string[]>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('documents_type_idx').on(table.type),
  index('documents_quality_tier_idx').on(table.qualityTier),
  uniqueIndex('documents_content_hash_idx').on(table.contentHash),
]);

// ============================================================================
// CHUNKS (RAG Embeddings)
// ============================================================================

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  
  // Content
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  
  // Position
  startOffset: integer('start_offset').notNull(),
  endOffset: integer('end_offset').notNull(),
  lineStart: integer('line_start').notNull(),
  lineEnd: integer('line_end').notNull(),
  
  // Type
  chunkType: varchar('chunk_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }),
  
  // Embedding (stored as array, will use pgvector extension)
  // Note: In production, use vector(1536) with pgvector extension
  embedding: jsonb('embedding').$type<number[]>(),
  embeddingModel: varchar('embedding_model', { length: 100 }),
  embeddedAt: timestamp('embedded_at', { withTimezone: true }),
  
  // Token estimate
  tokenCount: integer('token_count').notNull(),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('chunks_document_id_idx').on(table.documentId),
  index('chunks_chunk_type_idx').on(table.chunkType),
  index('chunks_chunk_index_idx').on(table.chunkIndex),
]);

// ============================================================================
// API KEYS
// ============================================================================

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Key
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  
  // Permissions
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  
  // Usage
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  usageCount: integer('usage_count').notNull().default(0),
  
  // Timestamps
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  index('api_keys_user_id_idx').on(table.userId),
  uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
]);

// ============================================================================
// USAGE TRACKING
// ============================================================================

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Period
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'daily' | 'monthly'
  
  // Metrics
  requestCount: integer('request_count').notNull().default(0),
  tokenCount: integer('token_count').notNull().default(0),
  conversationCount: integer('conversation_count').notNull().default(0),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('usage_records_user_id_idx').on(table.userId),
  index('usage_records_period_start_idx').on(table.periodStart),
  uniqueIndex('usage_records_user_period_idx').on(table.userId, table.periodStart, table.periodType),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  projects: many(projects),
  memoryEntries: many(memoryEntries),
  apiKeys: many(apiKeys),
  usageRecords: many(usageRecords),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  project: one(projects, { fields: [conversations.projectId], references: [projects.id] }),
  messages: many(messages),
  decisions: many(projectDecisions),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  conversations: many(conversations),
  decisions: many(projectDecisions),
  memoryEntries: many(memoryEntries),
}));

export const projectDecisionsRelations = relations(projectDecisions, ({ one }) => ({
  project: one(projects, { fields: [projectDecisions.projectId], references: [projects.id] }),
  conversation: one(conversations, { fields: [projectDecisions.conversationId], references: [conversations.id] }),
}));

export const memoryEntriesRelations = relations(memoryEntries, ({ one }) => ({
  user: one(users, { fields: [memoryEntries.userId], references: [users.id] }),
  project: one(projects, { fields: [memoryEntries.projectId], references: [projects.id] }),
  sourceConversation: one(conversations, { fields: [memoryEntries.sourceConversationId], references: [conversations.id] }),
  sourceMessage: one(messages, { fields: [memoryEntries.sourceMessageId], references: [messages.id] }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, { fields: [chunks.documentId], references: [documents.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, { fields: [usageRecords.userId], references: [users.id] }),
}));
