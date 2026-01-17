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

// Persona enums
export const personaStatusEnum = pgEnum('persona_status', [
  'creating',
  'active',
  'paused',
  'archived',
  'deleted',
]);

export const personaVisualStyleEnum = pgEnum('persona_visual_style', [
  'pixar_3d',
  'arcane_stylized',
  'anime_premium',
  'hyper_realistic',
  'fantasy_epic',
  'corporate_professional',
  'custom',
]);

export const personaArchetypeEnum = pgEnum('persona_archetype', [
  'sage',
  'hero',
  'creator',
  'caregiver',
  'ruler',
  'jester',
  'rebel',
  'lover',
  'explorer',
  'innocent',
  'magician',
  'outlaw',
]);

export const personaInteractionModeEnum = pgEnum('persona_interaction_mode', [
  'chat',
  'voice',
  'video',
]);

export const personaMemoryTypeEnum = pgEnum('persona_memory_type', [
  'fact',
  'preference',
  'event',
  'belief',
  'opinion',
]);

export const personaAssetTypeEnum = pgEnum('persona_asset_type', [
  'image',
  'video',
  'audio',
  'thumbnail',
  'expression',
]);

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

// Domain purchase status enum
export const domainPurchaseStatusEnum = pgEnum('domain_purchase_status', [
  'pending_payment',    // Stripe checkout created, waiting for payment
  'payment_completed',  // Stripe payment received, purchasing from Vercel
  'purchasing',         // Actively calling Vercel API
  'completed',          // Domain purchased and linked
  'failed',             // Purchase failed
  'refunded',           // User refunded
]);

// ============================================================================
// ALFRED BUILDER - Multi-File Project Enums
// ============================================================================

export const projectFrameworkEnum = pgEnum('project_framework', [
  'react',
  'vue',
  'svelte',
  'nextjs',
  'python',
  'node',
  'agent',
  'workflow',
  'static',
  'custom',
]);

export const projectFileTypeEnum = pgEnum('project_file_type', [
  'component',      // React/Vue/Svelte components
  'page',           // Page/Route components
  'style',          // CSS/SCSS/Tailwind
  'config',         // Config files (tsconfig, vite, etc.)
  'script',         // JS/TS utility scripts
  'python',         // Python files
  'data',           // JSON/YAML/CSV data files
  'asset',          // Images, fonts, etc.
  'test',           // Test files
  'agent',          // AI agent definitions
  'workflow',       // Workflow/pipeline definitions
  'documentation',  // Markdown, README
  'other',
]);

export const previewEngineEnum = pgEnum('preview_engine', [
  'esbuild',        // ESBuild-WASM for React/JS
  'sandpack',       // CodeSandbox Sandpack
  'webcontainer',   // StackBlitz WebContainer
  'pyodide',        // Python in browser
  'reactflow',      // Agent/workflow visualization
  'mermaid',        // Diagram visualization
  'markdown',       // Markdown preview
  'json',           // JSON tree viewer
  'iframe',         // Simple HTML iframe
  'terminal',       // Terminal output
  'none',           // No preview available
]);

export const fileStatusBuildEnum = pgEnum('file_status_build', [
  'pristine',       // No changes since last snapshot
  'modified',       // Has unsaved changes
  'error',          // Has syntax/type errors
  'building',       // Currently being bundled
  'ready',          // Built and ready for preview
]);

// Video Studio enums
export const videoJobStatusEnum = pgEnum('video_job_status', [
  'pending',
  'script_polish',
  'voice_generation',
  'video_generation',
  'sound_design',
  'caption_generation',
  'final_render',
  'completed',
  'failed',
]);

export const videoFormatEnum = pgEnum('video_format', [
  'tiktok_vertical',   // 9:16, 1080x1920
  'instagram_reel',    // 9:16, 1080x1920
  'instagram_square',  // 1:1, 1080x1080
  'youtube_short',     // 9:16, 1080x1920
  'youtube_standard',  // 16:9, 1920x1080
  'twitter_video',     // 16:9, 1920x1080
  'custom',
]);

export const videoQualityEnum = pgEnum('video_quality', [
  'draft',      // Fast preview
  'standard',   // Good quality
  'premium',    // High quality
  'cinematic',  // Maximum quality
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
// ALFRED BUILDER - Multi-File Projects (State-of-the-Art Preview System)
// ============================================================================

/**
 * alfredProjects - Multi-file project container
 *
 * This is the foundation of Alfred's next-gen builder system:
 * - Stores complete multi-file project structures
 * - Supports multiple frameworks (React, Python, Agents, etc.)
 * - Tracks preview engine and build state
 * - Links to conversation for context
 */
export const alfredProjects = pgTable(
  'alfred_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership & Context
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Framework & Configuration
    framework: projectFrameworkEnum('framework').notNull().default('react'),
    entryPoint: varchar('entry_point', { length: 255 }).notNull().default('/src/App.tsx'),
    previewEngine: previewEngineEnum('preview_engine').notNull().default('esbuild'),

    // Dependencies (npm/pip/etc.)
    dependencies: jsonb('dependencies').$type<Record<string, string>>().default({}),
    devDependencies: jsonb('dev_dependencies').$type<Record<string, string>>().default({}),

    // Build Configuration
    buildConfig: jsonb('build_config').$type<{
      target?: string;          // 'es2020', 'esnext', etc.
      jsx?: string;             // 'react-jsx', 'preserve', etc.
      minify?: boolean;
      sourcemap?: boolean;
      externals?: string[];     // Packages to load from CDN
      importMap?: Record<string, string>;  // Import map overrides
    }>(),

    // Preview Configuration
    previewConfig: jsonb('preview_config').$type<{
      autoRefresh?: boolean;    // HMR-like behavior
      consoleEnabled?: boolean;
      networkEnabled?: boolean;
      customHead?: string;      // Custom <head> content
      sandbox?: string[];       // iframe sandbox permissions
    }>(),

    // Template used to generate this project
    templateId: varchar('template_id', { length: 100 }),
    templateVersion: varchar('template_version', { length: 50 }),

    // State
    fileCount: integer('file_count').notNull().default(0),
    totalSize: integer('total_size').notNull().default(0), // bytes
    lastBuildAt: timestamp('last_build_at', { withTimezone: true }),
    lastBuildStatus: varchar('last_build_status', { length: 20 }), // 'success' | 'error'
    lastBuildError: text('last_build_error'),

    // Versioning
    version: integer('version').notNull().default(1),
    snapshotCount: integer('snapshot_count').notNull().default(0),

    // Deployment (links to existing Vercel integration)
    deployedUrl: varchar('deployed_url', { length: 500 }),
    lastDeployedAt: timestamp('last_deployed_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').$type<{
      llmModel?: string;
      generationPrompt?: string;
      tags?: string[];
      isPublic?: boolean;
      forkCount?: number;
      starCount?: number;
    }>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('alfred_projects_user_id_idx').on(table.userId),
    conversationIdIdx: index('alfred_projects_conversation_id_idx').on(table.conversationId),
    frameworkIdx: index('alfred_projects_framework_idx').on(table.framework),
    createdAtIdx: index('alfred_projects_created_at_idx').on(table.createdAt),
    nameSearchIdx: index('alfred_projects_name_idx').on(table.name),
  })
);

/**
 * alfredProjectFiles - Individual files within a project
 *
 * Stores each file with:
 * - Full path (e.g., '/src/components/Header.tsx')
 * - Content with version tracking
 * - File type for smart preview routing
 * - Build status for error highlighting
 */
export const alfredProjectFiles = pgTable(
  'alfred_project_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    alfredProjectId: uuid('alfred_project_id').notNull().references(() => alfredProjects.id, { onDelete: 'cascade' }),

    // File Identity
    path: varchar('path', { length: 500 }).notNull(), // e.g., '/src/components/Header.tsx'
    name: varchar('name', { length: 255 }).notNull(), // e.g., 'Header.tsx'

    // Content
    content: text('content').notNull(),
    language: varchar('language', { length: 50 }).notNull(), // tsx, ts, py, json, md, etc.
    fileType: projectFileTypeEnum('file_type').notNull().default('component'),

    // Size & Metrics
    size: integer('size').notNull().default(0), // bytes
    lineCount: integer('line_count').notNull().default(0),

    // Build Status
    status: fileStatusBuildEnum('status').notNull().default('pristine'),
    errors: jsonb('errors').$type<Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning' | 'info';
    }>>(),

    // Entry Point Flag
    isEntryPoint: boolean('is_entry_point').notNull().default(false),

    // Preview Configuration (per-file overrides)
    previewEngine: previewEngineEnum('preview_engine'), // Override project default
    previewConfig: jsonb('preview_config').$type<{
      showLineNumbers?: boolean;
      highlightLines?: number[];
      theme?: string;
    }>(),

    // Exports/Imports Analysis (for dependency graph)
    exports: jsonb('exports').$type<string[]>(), // ['Header', 'HeaderProps']
    imports: jsonb('imports').$type<Array<{
      source: string;         // './Button' or 'react'
      specifiers: string[];   // ['useState', 'useEffect']
      isRelative: boolean;
    }>>(),

    // Versioning (per-file)
    version: integer('version').notNull().default(1),

    // Generation Metadata
    generatedBy: varchar('generated_by', { length: 50 }), // 'llm' | 'user' | 'template'
    generationPrompt: text('generation_prompt'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    projectIdIdx: index('alfred_project_files_project_id_idx').on(table.alfredProjectId),
    pathIdx: index('alfred_project_files_path_idx').on(table.path),
    fileTypeIdx: index('alfred_project_files_file_type_idx').on(table.fileType),
    statusIdx: index('alfred_project_files_status_idx').on(table.status),
    // Unique constraint: one path per project
    uniquePathIdx: uniqueIndex('alfred_project_files_unique_path').on(table.alfredProjectId, table.path),
  })
);

/**
 * alfredProjectSnapshots - Project version snapshots
 *
 * Full point-in-time snapshots for:
 * - Version history
 * - Undo/redo support
 * - Deployment rollback
 * - Collaboration branching
 */
export const alfredProjectSnapshots = pgTable(
  'alfred_project_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    alfredProjectId: uuid('alfred_project_id').notNull().references(() => alfredProjects.id, { onDelete: 'cascade' }),

    // Snapshot Identity
    version: integer('version').notNull(),
    name: varchar('name', { length: 255 }), // Optional human-readable name
    description: text('description'),

    // Complete File State (denormalized for fast restore)
    files: jsonb('files').$type<Array<{
      path: string;
      content: string;
      language: string;
      fileType: string;
    }>>().notNull(),

    // Dependencies at snapshot time
    dependencies: jsonb('dependencies').$type<Record<string, string>>(),
    devDependencies: jsonb('dev_dependencies').$type<Record<string, string>>(),

    // Build Configuration at snapshot time
    buildConfig: jsonb('build_config').$type<Record<string, unknown>>(),

    // Metrics
    fileCount: integer('file_count').notNull(),
    totalSize: integer('total_size').notNull(),

    // Source
    triggeredBy: varchar('triggered_by', { length: 50 }).notNull(), // 'user' | 'auto' | 'deploy' | 'llm'
    messageId: uuid('message_id'), // LLM message that created this snapshot

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('alfred_project_snapshots_project_id_idx').on(table.alfredProjectId),
    versionIdx: index('alfred_project_snapshots_version_idx').on(table.version),
    createdAtIdx: index('alfred_project_snapshots_created_at_idx').on(table.createdAt),
    // Unique version per project
    uniqueVersionIdx: uniqueIndex('alfred_project_snapshots_unique_version').on(table.alfredProjectId, table.version),
  })
);

/**
 * alfredProjectTemplates - Reusable project templates
 *
 * State-of-the-art templates for quick project scaffolding:
 * - Pre-configured frameworks
 * - Best-practice file structures
 * - Curated dependencies
 */
export const alfredProjectTemplates = pgTable(
  'alfred_project_templates',
  {
    id: varchar('id', { length: 100 }).primaryKey(), // e.g., 'react-tailwind-starter'

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(), // 'web', 'python', 'agent', etc.

    // Framework & Configuration
    framework: projectFrameworkEnum('framework').notNull(),
    previewEngine: previewEngineEnum('preview_engine').notNull(),

    // Template Files
    files: jsonb('files').$type<Array<{
      path: string;
      content: string;
      language: string;
      fileType: string;
    }>>().notNull(),

    // Dependencies
    dependencies: jsonb('dependencies').$type<Record<string, string>>().notNull(),
    devDependencies: jsonb('dev_dependencies').$type<Record<string, string>>().notNull(),

    // Build Configuration
    buildConfig: jsonb('build_config').$type<Record<string, unknown>>(),

    // Display
    thumbnailUrl: text('thumbnail_url'),
    showcaseUrl: text('showcase_url'),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Metrics
    usageCount: integer('usage_count').notNull().default(0),
    starCount: integer('star_count').notNull().default(0),

    // Status
    isPublic: boolean('is_public').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),

    // Versioning
    version: varchar('version', { length: 50 }).notNull().default('1.0.0'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    frameworkIdx: index('alfred_project_templates_framework_idx').on(table.framework),
    categoryIdx: index('alfred_project_templates_category_idx').on(table.category),
    isPublicIdx: index('alfred_project_templates_is_public_idx').on(table.isPublic),
    isFeaturedIdx: index('alfred_project_templates_is_featured_idx').on(table.isFeatured),
  })
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
// DOMAIN PURCHASES - State-of-the-Art Domain Purchase Flow
// ============================================================================

/**
 * domainPurchases - Tracks domain purchases through Alfred
 *
 * Flow:
 * 1. User searches domain → Check Vercel API for availability/price
 * 2. User clicks Buy → Create Stripe Checkout session
 * 3. User pays → Webhook triggers Vercel purchase
 * 4. Domain purchased → Auto-link to project, DNS auto-configured
 */
export const domainPurchases = pgTable(
  'domain_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Domain info
    domain: varchar('domain', { length: 255 }).notNull(),
    tld: varchar('tld', { length: 50 }).notNull(), // .com, .io, .dev, etc.

    // Pricing (in cents to avoid floating point issues)
    vercelPriceCents: integer('vercel_price_cents').notNull(), // What Vercel charges
    alfredFeeCents: integer('alfred_fee_cents').notNull().default(0), // Our markup (if any)
    totalPriceCents: integer('total_price_cents').notNull(), // What user pays
    years: integer('years').notNull().default(1), // Purchase duration

    // Status tracking
    status: domainPurchaseStatusEnum('status').notNull().default('pending_payment'),
    statusMessage: text('status_message'),

    // Stripe integration
    stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripePaidAt: timestamp('stripe_paid_at', { withTimezone: true }),

    // Vercel integration
    vercelOrderId: varchar('vercel_order_id', { length: 255 }),
    vercelPurchasedAt: timestamp('vercel_purchased_at', { withTimezone: true }),

    // Link to project (for auto DNS config)
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    vercelProjectId: varchar('vercel_project_id', { length: 255 }),

    // Auto-renewal settings
    autoRenew: boolean('auto_renew').notNull().default(true),

    // Error handling
    lastError: text('last_error'),
    retryCount: integer('retry_count').notNull().default(0),

    // Metadata
    metadata: jsonb('metadata').$type<{
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      source?: string; // 'builder' | 'dashboard'
    }>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // Domain expiration
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('domain_purchases_user_id_idx').on(table.userId),
    index('domain_purchases_domain_idx').on(table.domain),
    index('domain_purchases_status_idx').on(table.status),
    index('domain_purchases_stripe_session_idx').on(table.stripeCheckoutSessionId),
    index('domain_purchases_project_id_idx').on(table.projectId),
    index('domain_purchases_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// PERSONAS
// ============================================================================

export const personas = pgTable(
  'personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Identity
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    tagline: varchar('tagline', { length: 500 }),
    description: text('description'),
    archetype: varchar('archetype', { length: 50 }),
    backstory: text('backstory'),

    // Status
    status: varchar('status', { length: 20 }).default('creating').notNull(),

    // Personality (JSONB for flexibility)
    traits: jsonb('traits').$type<string[]>().default([]),
    temperament: varchar('temperament', { length: 50 }),
    communicationStyle: varchar('communication_style', { length: 50 }),
    speakingStyle: jsonb('speaking_style').$type<{
      rules: string[];
      examples: string[];
      vocabularyLevel: string;
      quirks: string[];
    }>(),
    knowledgeDomains: jsonb('knowledge_domains').$type<Array<{
      domain: string;
      level: string;
      topics?: string[];
      enthusiasm?: number;
    }>>(),

    // Visual
    visualStylePreset: varchar('visual_style_preset', { length: 50 }),
    primaryImageUrl: text('primary_image_url'),
    thumbnailUrl: text('thumbnail_url'),
    identityEmbedding: jsonb('identity_embedding').$type<number[]>(),
    styleEmbedding: jsonb('style_embedding').$type<number[]>(),
    referenceImages: jsonb('reference_images').$type<{
      primary?: string;
      expressions?: Record<string, string>;
      angles?: Record<string, string>;
    }>(),
    expressionGrid: jsonb('expression_grid').$type<Record<string, {
      imageUrl: string;
      thumbnailUrl?: string;
      seed?: number;
    }>>(),
    customLoraUrl: text('custom_lora_url'),
    visualSeed: integer('visual_seed'),

    // 3D Avatar
    modelUrl: text('model_url'), // GLB/GLTF 3D model URL for real-time avatar

    // Living Persona Video
    idleVideoUrl: text('idle_video_url'), // Looping idle video for REAL living persona (not CSS tricks)

    // Voice
    voiceProvider: varchar('voice_provider', { length: 50 }),
    voiceId: varchar('voice_id', { length: 100 }),
    voiceIsCloned: boolean('voice_is_cloned').default(false),
    voiceProfile: jsonb('voice_profile').$type<{
      characteristics?: {
        gender?: string;
        age?: string;
        pitch?: number;
        speed?: number;
        stability?: number;
        clarity?: number;
      };
      emotionProfiles?: Record<string, unknown>;
      presetName?: string;
    }>(),

    // Motion
    motionStylePreset: varchar('motion_style_preset', { length: 50 }),
    cameraAngle: varchar('camera_angle', { length: 50 }),
    idleAnimationUrl: text('idle_animation_url'),

    // Mind / Brain
    systemPromptTemplate: text('system_prompt_template'),
    personalityMatrix: jsonb('personality_matrix').$type<{
      openness?: number;
      conscientiousness?: number;
      extraversion?: number;
      agreeableness?: number;
      neuroticism?: number;
    }>(),
    behaviorRules: jsonb('behavior_rules').$type<{
      engagementTopics?: string[];
      avoidanceTopics?: string[];
      boundaries?: string[];
    }>(),

    // Full Genome (complete blueprint)
    genome: jsonb('genome').$type<{
      version: string;
      visual?: unknown;
      voice?: unknown;
      motion?: unknown;
      mind?: unknown;
      metadata?: unknown;
    }>(),

    // Memory Config
    memoryEnabled: boolean('memory_enabled').default(true),
    memoryConfig: jsonb('memory_config').$type<{
      maxMemories?: number;
      decayEnabled?: boolean;
      consolidationEnabled?: boolean;
    }>(),

    // Current State (mutable)
    currentMood: varchar('current_mood', { length: 50 }).default('neutral'),
    energyLevel: real('energy_level').default(0.5),
    relationshipLevel: real('relationship_level').default(0),
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),

    // Settings
    isPublic: boolean('is_public').default(false),
    allowEmbed: boolean('allow_embed').default(true),
    allowVoice: boolean('allow_voice').default(true),
    allowVideo: boolean('allow_video').default(true),
    customGreeting: text('custom_greeting'),
    embedConfig: jsonb('embed_config').$type<{
      theme?: string;
      position?: string;
      customCss?: string;
    }>(),

    // Analytics
    totalInteractions: integer('total_interactions').default(0),
    totalChatMessages: integer('total_chat_messages').default(0),
    totalVoiceMinutes: real('total_voice_minutes').default(0),
    totalVideoMinutes: real('total_video_minutes').default(0),
    totalCostUsd: real('total_cost_usd').default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('personas_user_id_idx').on(table.userId),
    index('personas_slug_idx').on(table.slug),
    index('personas_status_idx').on(table.status),
    index('personas_is_public_idx').on(table.isPublic),
    index('personas_archetype_idx').on(table.archetype),
    uniqueIndex('personas_user_slug_unique').on(table.userId, table.slug),
  ]
);

// ============================================================================
// PERSONA ASSETS
// ============================================================================

export const personaAssets = pgTable(
  'persona_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),

    // Asset info
    type: varchar('type', { length: 20 }).notNull(),
    subtype: varchar('subtype', { length: 50 }),

    // URLs
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),

    // Metadata
    mimeType: varchar('mime_type', { length: 100 }),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: real('duration_seconds'),

    // Generation info
    seed: integer('seed'),
    prompt: text('prompt'),
    generationConfig: jsonb('generation_config').$type<Record<string, unknown>>(),
    generationCostUsd: real('generation_cost_usd'),

    // Flags
    isPrimary: boolean('is_primary').default(false),
    isGenerated: boolean('is_generated').default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('persona_assets_persona_id_idx').on(table.personaId),
    index('persona_assets_type_idx').on(table.type),
    index('persona_assets_subtype_idx').on(table.subtype),
  ]
);

// ============================================================================
// PERSONA MEMORIES
// ============================================================================

export const personaMemories = pgTable(
  'persona_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),

    // Memory content
    content: text('content').notNull(),
    summary: text('summary'),
    type: varchar('type', { length: 50 }).notNull(),
    category: varchar('category', { length: 100 }),

    // Vector embedding for semantic search
    embedding: jsonb('embedding').$type<number[]>(),
    embeddingModel: varchar('embedding_model', { length: 100 }),

    // Scoring
    importance: real('importance').default(0.5),
    confidence: real('confidence').default(0.8),

    // Access tracking (for memory decay)
    accessCount: integer('access_count').default(1),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow(),

    // Source tracking
    sourceInteractionId: uuid('source_interaction_id'),
    sourceUserId: uuid('source_user_id'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('persona_memories_persona_id_idx').on(table.personaId),
    index('persona_memories_type_idx').on(table.type),
    index('persona_memories_category_idx').on(table.category),
    index('persona_memories_importance_idx').on(table.importance),
    index('persona_memories_source_user_idx').on(table.sourceUserId),
  ]
);

// ============================================================================
// PERSONA INTERACTIONS
// ============================================================================

export const personaInteractions = pgTable(
  'persona_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    sessionId: uuid('session_id'),

    // Interaction details
    mode: varchar('mode', { length: 20 }).notNull(),
    userMessage: text('user_message'),
    personaResponse: text('persona_response'),

    // Emotion tracking
    userEmotionDetected: varchar('user_emotion_detected', { length: 50 }),
    personaEmotionExpressed: varchar('persona_emotion_expressed', { length: 50 }),

    // Usage metrics
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    durationSeconds: real('duration_seconds'),

    // Cost tracking
    llmCostUsd: real('llm_cost_usd'),
    ttsCostUsd: real('tts_cost_usd'),
    sttCostUsd: real('stt_cost_usd'),
    videoCostUsd: real('video_cost_usd'),
    totalCostUsd: real('total_cost_usd'),

    // Quality metrics
    latencyMs: integer('latency_ms'),
    rating: integer('rating'),
    feedback: text('feedback'),

    // Context
    conversationContext: jsonb('conversation_context').$type<{
      messageCount?: number;
      topic?: string;
      sentiment?: string;
    }>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('persona_interactions_persona_id_idx').on(table.personaId),
    index('persona_interactions_user_id_idx').on(table.userId),
    index('persona_interactions_session_id_idx').on(table.sessionId),
    index('persona_interactions_mode_idx').on(table.mode),
    index('persona_interactions_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// PERSONA EMBEDS
// ============================================================================

export const personaEmbeds = pgTable(
  'persona_embeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),

    // Embed identification
    embedKey: varchar('embed_key', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }),

    // Configuration
    config: jsonb('config').$type<{
      theme?: 'light' | 'dark' | 'auto';
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
      size?: 'small' | 'medium' | 'large';
      showAvatar?: boolean;
      showName?: boolean;
      customCss?: string;
      allowedDomains?: string[];
      greeting?: string;
    }>(),

    // Access control
    allowedDomains: jsonb('allowed_domains').$type<string[]>(),
    isActive: boolean('is_active').default(true),

    // Analytics
    totalLoads: integer('total_loads').default(0),
    totalInteractions: integer('total_interactions').default(0),
    uniqueUsers: integer('unique_users').default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    index('persona_embeds_persona_id_idx').on(table.personaId),
    index('persona_embeds_embed_key_idx').on(table.embedKey),
    index('persona_embeds_is_active_idx').on(table.isActive),
  ]
);

// ============================================================================
// PERSONA SESSIONS
// ============================================================================

export const personaSessions = pgTable(
  'persona_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    embedId: uuid('embed_id').references(() => personaEmbeds.id),

    // Session state
    isActive: boolean('is_active').default(true),
    mode: varchar('mode', { length: 20 }),

    // Context
    conversationHistory: jsonb('conversation_history').$type<Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      emotion?: string;
    }>>(),

    // State tracking
    messageCount: integer('message_count').default(0),
    currentEmotion: varchar('current_emotion', { length: 50 }),

    // Usage
    totalDurationSeconds: real('total_duration_seconds').default(0),
    totalCostUsd: real('total_cost_usd').default(0),

    // Client info
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    referrer: text('referrer'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('persona_sessions_persona_id_idx').on(table.personaId),
    index('persona_sessions_user_id_idx').on(table.userId),
    index('persona_sessions_embed_id_idx').on(table.embedId),
    index('persona_sessions_is_active_idx').on(table.isActive),
    index('persona_sessions_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// PERSONA WIZARD SESSIONS
// ============================================================================

export const personaWizardSessions = pgTable(
  'persona_wizard_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').references(() => personas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),

    // Wizard state
    currentStep: varchar('current_step', { length: 50 }).notNull().default('spark'),
    stepsStatus: jsonb('steps_status').$type<Record<string, 'pending' | 'active' | 'completed' | 'skipped'>>(),

    // Collected data
    sparkData: jsonb('spark_data').$type<{
      name?: string;
      tagline?: string;
      description?: string;
      archetype?: string;
      suggestedTraits?: string[];
      backstoryHook?: string;
    }>(),
    visualData: jsonb('visual_data').$type<{
      stylePreset?: string;
      variations?: Array<{ imageUrl: string; seed: number; cost: number }>;
      chosenIndex?: number;
      visualDNA?: unknown;
    }>(),
    voiceData: jsonb('voice_data').$type<{
      provider?: string;
      presetName?: string;
      voiceId?: string;
      isCloned?: boolean;
      samples?: string[];
    }>(),
    mindData: jsonb('mind_data').$type<{
      traits?: string[];
      communicationStyle?: string;
      knowledgeDomains?: string[];
      backstory?: string;
      systemPrompt?: string;
    }>(),
    motionData: jsonb('motion_data').$type<{
      motionPreset?: string;
      cameraAngle?: string;
    }>(),

    // Cost tracking
    totalCostUsd: real('total_cost_usd').default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('persona_wizard_sessions_user_id_idx').on(table.userId),
    index('persona_wizard_sessions_persona_id_idx').on(table.personaId),
    index('persona_wizard_sessions_current_step_idx').on(table.currentStep),
  ]
);

// ============================================================================
// VIDEO STUDIO - Video Generation Jobs
// ============================================================================

export const videoJobs = pgTable(
  'video_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Job identification
    title: varchar('title', { length: 255 }),
    description: text('description'),

    // Status tracking
    status: videoJobStatusEnum('status').notNull().default('pending'),
    currentStep: varchar('current_step', { length: 50 }),
    progress: real('progress').default(0), // 0-100
    error: text('error'),

    // Input configuration
    format: videoFormatEnum('format').notNull().default('tiktok_vertical'),
    quality: videoQualityEnum('quality').notNull().default('standard'),
    durationTarget: integer('duration_target'), // Target duration in seconds

    // Script stage
    rawScript: text('raw_script'),
    polishedScript: text('polished_script'),
    scriptEmotion: varchar('script_emotion', { length: 50 }),
    scriptMetadata: jsonb('script_metadata').$type<{
      wordCount?: number;
      estimatedDuration?: number;
      emotionTags?: string[];
      toneAnalysis?: Record<string, number>;
    }>(),

    // Voice stage
    voiceAudioUrl: text('voice_audio_url'),
    voiceAudioDuration: real('voice_audio_duration'),
    voiceMetadata: jsonb('voice_metadata').$type<{
      voiceId?: string;
      provider?: string;
      settings?: Record<string, unknown>;
      wordTimings?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>(),

    // Video stage (talking head)
    talkingVideoUrl: text('talking_video_url'),
    talkingVideoMetadata: jsonb('talking_video_metadata').$type<{
      model?: string;
      resolution?: string;
      fps?: number;
      processingTime?: number;
    }>(),

    // Sound design stage
    backgroundMusicUrl: text('background_music_url'),
    backgroundMusicVolume: real('background_music_volume').default(0.15),
    ambienceUrl: text('ambience_url'),
    ambienceVolume: real('ambience_volume').default(0.1),
    sfxTracks: jsonb('sfx_tracks').$type<Array<{
      url: string;
      startTime: number;
      volume: number;
      type: string;
    }>>(),
    soundDesignMetadata: jsonb('sound_design_metadata').$type<{
      musicGenre?: string;
      musicMood?: string;
      ambienceType?: string;
    }>(),

    // Caption stage
    captions: jsonb('captions').$type<Array<{
      text: string;
      start: number;
      end: number;
      style?: string;
      animation?: string;
      position?: { x: number; y: number };
    }>>(),
    captionStyle: varchar('caption_style', { length: 50 }).default('tiktok'),
    captionMetadata: jsonb('caption_metadata').$type<{
      font?: string;
      fontSize?: number;
      color?: string;
      strokeColor?: string;
      animation?: string;
    }>(),

    // Final render
    finalVideoUrl: text('final_video_url'),
    thumbnailUrl: text('thumbnail_url'),
    previewGifUrl: text('preview_gif_url'),
    finalMetadata: jsonb('final_metadata').$type<{
      resolution?: string;
      fps?: number;
      bitrate?: number;
      codec?: string;
      fileSize?: number;
      duration?: number;
    }>(),

    // Cost tracking
    scriptCostUsd: real('script_cost_usd').default(0),
    voiceCostUsd: real('voice_cost_usd').default(0),
    videoCostUsd: real('video_cost_usd').default(0),
    soundCostUsd: real('sound_cost_usd').default(0),
    renderCostUsd: real('render_cost_usd').default(0),
    totalCostUsd: real('total_cost_usd').default(0),

    // Timing
    estimatedDurationMs: integer('estimated_duration_ms'),
    actualDurationMs: integer('actual_duration_ms'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('video_jobs_persona_id_idx').on(table.personaId),
    index('video_jobs_user_id_idx').on(table.userId),
    index('video_jobs_status_idx').on(table.status),
    index('video_jobs_created_at_idx').on(table.createdAt),
  ]
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
  personas: many(personas),
  alfredProjects: many(alfredProjects),
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

export const domainPurchasesRelations = relations(domainPurchases, ({ one }) => ({
  user: one(users, { fields: [domainPurchases.userId], references: [users.id] }),
  project: one(projects, { fields: [domainPurchases.projectId], references: [projects.id] }),
}));

// Persona relations
export const personasRelations = relations(personas, ({ one, many }) => ({
  user: one(users, { fields: [personas.userId], references: [users.id] }),
  assets: many(personaAssets),
  memories: many(personaMemories),
  interactions: many(personaInteractions),
  embeds: many(personaEmbeds),
  sessions: many(personaSessions),
  wizardSessions: many(personaWizardSessions),
  videoJobs: many(videoJobs),
}));

export const personaAssetsRelations = relations(personaAssets, ({ one }) => ({
  persona: one(personas, { fields: [personaAssets.personaId], references: [personas.id] }),
}));

export const personaMemoriesRelations = relations(personaMemories, ({ one }) => ({
  persona: one(personas, { fields: [personaMemories.personaId], references: [personas.id] }),
}));

export const personaInteractionsRelations = relations(personaInteractions, ({ one }) => ({
  persona: one(personas, { fields: [personaInteractions.personaId], references: [personas.id] }),
}));

export const personaEmbedsRelations = relations(personaEmbeds, ({ one, many }) => ({
  persona: one(personas, { fields: [personaEmbeds.personaId], references: [personas.id] }),
  sessions: many(personaSessions),
}));

export const personaSessionsRelations = relations(personaSessions, ({ one }) => ({
  persona: one(personas, { fields: [personaSessions.personaId], references: [personas.id] }),
  embed: one(personaEmbeds, { fields: [personaSessions.embedId], references: [personaEmbeds.id] }),
}));

export const personaWizardSessionsRelations = relations(personaWizardSessions, ({ one }) => ({
  persona: one(personas, { fields: [personaWizardSessions.personaId], references: [personas.id] }),
}));

// Video Studio relations
export const videoJobsRelations = relations(videoJobs, ({ one }) => ({
  persona: one(personas, { fields: [videoJobs.personaId], references: [personas.id] }),
  user: one(users, { fields: [videoJobs.userId], references: [users.id] }),
}));

// Alfred Builder relations
export const alfredProjectsRelations = relations(alfredProjects, ({ one, many }) => ({
  user: one(users, { fields: [alfredProjects.userId], references: [users.id] }),
  conversation: one(conversations, { fields: [alfredProjects.conversationId], references: [conversations.id] }),
  project: one(projects, { fields: [alfredProjects.projectId], references: [projects.id] }),
  files: many(alfredProjectFiles),
  snapshots: many(alfredProjectSnapshots),
}));

export const alfredProjectFilesRelations = relations(alfredProjectFiles, ({ one }) => ({
  alfredProject: one(alfredProjects, { fields: [alfredProjectFiles.alfredProjectId], references: [alfredProjects.id] }),
}));

export const alfredProjectSnapshotsRelations = relations(alfredProjectSnapshots, ({ one }) => ({
  alfredProject: one(alfredProjects, { fields: [alfredProjectSnapshots.alfredProjectId], references: [alfredProjects.id] }),
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

export type DomainPurchase = typeof domainPurchases.$inferSelect;
export type NewDomainPurchase = typeof domainPurchases.$inferInsert;

// Persona types
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

export type PersonaAsset = typeof personaAssets.$inferSelect;
export type NewPersonaAsset = typeof personaAssets.$inferInsert;

export type PersonaMemory = typeof personaMemories.$inferSelect;
export type NewPersonaMemory = typeof personaMemories.$inferInsert;

export type PersonaInteraction = typeof personaInteractions.$inferSelect;
export type NewPersonaInteraction = typeof personaInteractions.$inferInsert;

export type PersonaEmbed = typeof personaEmbeds.$inferSelect;
export type NewPersonaEmbed = typeof personaEmbeds.$inferInsert;

export type PersonaSession = typeof personaSessions.$inferSelect;
export type NewPersonaSession = typeof personaSessions.$inferInsert;

export type PersonaWizardSession = typeof personaWizardSessions.$inferSelect;
export type NewPersonaWizardSession = typeof personaWizardSessions.$inferInsert;

// Video Studio types
export type VideoJob = typeof videoJobs.$inferSelect;
export type NewVideoJob = typeof videoJobs.$inferInsert;

// Alfred Builder types
export type AlfredProject = typeof alfredProjects.$inferSelect;
export type NewAlfredProject = typeof alfredProjects.$inferInsert;

export type AlfredProjectFile = typeof alfredProjectFiles.$inferSelect;
export type NewAlfredProjectFile = typeof alfredProjectFiles.$inferInsert;

export type AlfredProjectSnapshot = typeof alfredProjectSnapshots.$inferSelect;
export type NewAlfredProjectSnapshot = typeof alfredProjectSnapshots.$inferInsert;

export type AlfredProjectTemplate = typeof alfredProjectTemplates.$inferSelect;
export type NewAlfredProjectTemplate = typeof alfredProjectTemplates.$inferInsert;
