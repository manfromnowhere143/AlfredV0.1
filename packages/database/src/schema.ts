/**
 * Database Schema
 *
 * PostgreSQL schema using Drizzle ORM.
 * Designed for Alfred's memory, conversations, RAG, and file uploads.
 *
 * Principles:
 * - UUIDs for all primary keys
 * - Soft deletes for audit trail
 * - JSONB for flexible metadata
 * - Proper indexes for every query pattern
 * - pgvector for embedding similarity search (via JSONB here)
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
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userTierEnum = pgEnum('user_tier', ['free', 'pro', 'enterprise']);
export const alfredFacetEnum = pgEnum('alfred_facet', ['build', 'teach', 'review']);
export const skillLevelEnum = pgEnum('skill_level', ['beginner', 'intermediate', 'experienced', 'expert']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'alfred']);
export const memoryTypeEnum = pgEnum('memory_type', [
  'preference',
  'project',
  'decision',
  'skill_signal',
  'stack_preference',
]);
export const projectTypeEnum = pgEnum('project_type', ['web_app', 'dashboard', 'api', 'library', 'other']);
export const documentTypeEnum = pgEnum('document_type', ['code', 'markdown', 'architecture', 'decision', 'pattern']);
export const qualityTierEnum = pgEnum('quality_tier', ['gold', 'silver', 'bronze']);

// File system enums
export const fileCategoryEnum = pgEnum('file_category', ['image', 'video', 'document', 'code', 'audio']);
export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'ready', 'error']);

// Subscription status enum
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),
    externalId: varchar('external_id', { length: 255 }).unique(),
    tier: userTierEnum('tier').notNull().default('free'),

    // Preferences
    defaultMode: alfredFacetEnum('default_mode').notNull().default('build'),
    optimizeFor: varchar('optimize_for', { length: 50 }).notNull().default('clarity'),
    verbosity: varchar('verbosity', { length: 50 }).notNull().default('minimal'),

    // Skill profile
    skillLevel: skillLevelEnum('skill_level').notNull().default('intermediate'),
    skillConfidence: real('skill_confidence').notNull().default(0),

    // STRIPE BILLING — Subscription & Payment Management
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripeSubscriptionStatus: varchar('stripe_subscription_status', { length: 50 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    stripeCurrentPeriodEnd: timestamp('stripe_current_period_end', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_external_id_idx').on(table.externalId),
    index('users_tier_idx').on(table.tier),
    index('users_created_at_idx').on(table.createdAt),
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
  ],
);

// ============================================================================
// AUTH.JS TABLES — For OAuth & Magic Links
// ============================================================================

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index('accounts_user_id_idx').on(table.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const conversations = pgTable(
  'conversations',
  {
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
  },
  (table) => [
    index('conversations_user_id_idx').on(table.userId),
    index('conversations_project_id_idx').on(table.projectId),
    index('conversations_started_at_idx').on(table.startedAt),
    index('conversations_last_message_at_idx').on(table.lastMessageAt),
  ],
);

// ============================================================================
// MESSAGES
// ============================================================================

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id'),

    // Content
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),

    // Context
    mode: alfredFacetEnum('mode'),
    modeChanged: boolean('mode_changed').notNull().default(false),

    // Tokens
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),

    // File references - array of file UUIDs attached to this message
    fileIds: jsonb('file_ids').$type<string[]>().default([]),

    // Attachments and artifacts stored as JSONB
    attachments: jsonb('attachments').$type<
      Array<{
        type: string;
        content: string;
        metadata?: Record<string, string>;
      }>
    >(),
    artifactsJson: jsonb('artifacts').$type<
      Array<{
        id: string;
        type: string;
        title: string;
        content: string;
        language?: string;
      }>
    >(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversationId),
    index('messages_role_idx').on(table.role),
    index('messages_created_at_idx').on(table.createdAt),
  ],
);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  'projects',
  {
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

    // Vercel integration — one Alfred project ↔ one Vercel project ↔ one primary domain
    vercelProjectId: varchar('vercel_project_id', { length: 255 }),
    vercelProjectName: varchar('vercel_project_name', { length: 255 }),
    primaryDomain: varchar('primary_domain', { length: 255 }),
    lastDeploymentId: varchar('last_deployment_id', { length: 255 }),
    lastDeploymentStatus: varchar('last_deployment_status', { length: 50 }),
    lastDeployedAt: timestamp('last_deployed_at', { withTimezone: true }),
    screenshotUrl: varchar('screenshot_url', { length: 500 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('projects_user_id_idx').on(table.userId),
    index('projects_type_idx').on(table.type),
    index('projects_created_at_idx').on(table.createdAt),
    uniqueIndex('projects_user_name_idx').on(table.userId, table.name),
  ],
);

// ============================================================================
// ARTIFACTS (for saving generated code/components)
// ============================================================================

export const artifacts = pgTable(
  'artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id'),

    // Content
    title: varchar('title', { length: 255 }).notNull(),
    code: text('code').notNull(),
    language: varchar('language', { length: 50 }).notNull().default('jsx'),

    // Versioning
    version: integer('version').notNull().default(1),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('artifacts_project_id_idx').on(table.projectId),
    index('artifacts_conversation_id_idx').on(table.conversationId),
    index('artifacts_created_at_idx').on(table.createdAt),
  ],
);

// ============================================================================
// FILES (for user uploads - images, videos, documents, code)
// ============================================================================

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Basic info
    name: varchar('name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    url: text('url').notNull(),

    // Type info
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    category: fileCategoryEnum('category').notNull(),
    extension: varchar('extension', { length: 20 }),

    // Size info
    size: integer('size').notNull(),

    // Media dimensions (for images/videos)
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'), // seconds for video/audio

    // Generated previews
    thumbnailUrl: text('thumbnail_url'),
    previewUrl: text('preview_url'),
    optimizedUrl: text('optimized_url'),

    // Processing status
    status: fileStatusEnum('status').notNull().default('ready'),
    error: text('error'),

    // Ownership & Relations
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id'),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('files_user_id_idx').on(table.userId),
    index('files_conversation_id_idx').on(table.conversationId),
    index('files_message_id_idx').on(table.messageId),
    index('files_status_idx').on(table.status),
    index('files_category_idx').on(table.category),
    index('files_created_at_idx').on(table.createdAt),
  ],
);

// ============================================================================
// PROJECT DECISIONS
// ============================================================================

export const projectDecisions = pgTable(
  'project_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
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
  },
  (table) => [
    index('project_decisions_project_id_idx').on(table.projectId),
    index('project_decisions_conversation_id_idx').on(table.conversationId),
    index('project_decisions_made_at_idx').on(table.madeAt),
  ],
);

// ============================================================================
// MEMORY ENTRIES
// ============================================================================

export const memoryEntries = pgTable(
  'memory_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),

    // Memory content
    type: memoryTypeEnum('type').notNull(),
    content: text('content').notNull(),

    // Decay tracking (Ebbinghaus model)
    confidence: real('confidence').notNull().default(0.8),
    accessCount: integer('access_count').notNull().default(1),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow(),

    // Source tracking
    sourceConversationId: uuid('source_conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    sourceMessageId: uuid('source_message_id').references(() => messages.id, { onDelete: 'set null' }),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('memory_entries_user_id_idx').on(table.userId),
    index('memory_entries_project_id_idx').on(table.projectId),
    index('memory_entries_type_idx').on(table.type),
    index('memory_entries_confidence_idx').on(table.confidence),
    index('memory_entries_last_accessed_at_idx').on(table.lastAccessedAt),
  ],
);

// ============================================================================
// DOCUMENTS (RAG Knowledge Base)
// ============================================================================

export const documents = pgTable(
  'documents',
  {
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
  },
  (table) => [
    index('documents_type_idx').on(table.type),
    index('documents_quality_tier_idx').on(table.qualityTier),
    uniqueIndex('documents_content_hash_idx').on(table.contentHash),
  ],
);

// ============================================================================
// CHUNKS (RAG Embeddings)
// ============================================================================

export const chunks = pgTable(
  'chunks',
  {
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

    // Embedding (stored as array, will use pgvector extension in prod)
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
  },
  (table) => [
    index('chunks_document_id_idx').on(table.documentId),
    index('chunks_chunk_type_idx').on(table.chunkType),
    index('chunks_chunk_index_idx').on(table.chunkIndex),
  ],
);

// ============================================================================
// API KEYS
// ============================================================================

export const apiKeys = pgTable(
  'api_keys',
  {
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
  },
  (table) => [
    index('api_keys_user_id_idx').on(table.userId),
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
  ],
);

// ============================================================================
// USAGE TRACKING
// ============================================================================

export const usageRecords = pgTable(
  'usage_records',
  {
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
  },
  (table) => [
    index('usage_records_user_id_idx').on(table.userId),
    index('usage_records_period_start_idx').on(table.periodStart),
    uniqueIndex('usage_records_user_period_idx').on(table.userId, table.periodStart, table.periodType),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  conversations: many(conversations),
  projects: many(projects),
  memoryEntries: many(memoryEntries),
  apiKeys: many(apiKeys),
  usageRecords: many(usageRecords),
  files: many(files),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  project: one(projects, { fields: [conversations.projectId], references: [projects.id] }),
  messages: many(messages),
  decisions: many(projectDecisions),
  artifacts: many(artifacts),
  files: many(files),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  files: many(files),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  conversations: many(conversations),
  decisions: many(projectDecisions),
  memoryEntries: many(memoryEntries),
  artifacts: many(artifacts),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  project: one(projects, { fields: [artifacts.projectId], references: [projects.id] }),
  conversation: one(conversations, { fields: [artifacts.conversationId], references: [conversations.id] }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, { fields: [files.userId], references: [users.id] }),
  conversation: one(conversations, { fields: [files.conversationId], references: [conversations.id] }),
  message: one(messages, { fields: [files.messageId], references: [messages.id] }),
}));

export const projectDecisionsRelations = relations(projectDecisions, ({ one }) => ({
  project: one(projects, { fields: [projectDecisions.projectId], references: [projects.id] }),
  conversation: one(conversations, { fields: [projectDecisions.conversationId], references: [conversations.id] }),
}));

export const memoryEntriesRelations = relations(memoryEntries, ({ one }) => ({
  user: one(users, { fields: [memoryEntries.userId], references: [users.id] }),
  project: one(projects, { fields: [memoryEntries.projectId], references: [projects.id] }),
  sourceConversation: one(conversations, {
    fields: [memoryEntries.sourceConversationId],
    references: [conversations.id],
  }),
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

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

export type FileRecord = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type ProjectDecision = typeof projectDecisions.$inferSelect;
export type NewProjectDecision = typeof projectDecisions.$inferInsert;

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type NewMemoryEntry = typeof memoryEntries.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type UsageRecord = typeof usageRecords.$inferSelect;
export type NewUsageRecord = typeof usageRecords.$inferInsert;
