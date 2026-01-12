/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA REPOSITORY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Data access layer for PersonaForge entities.
 * Implements the Repository pattern for clean separation of concerns.
 *
 * Features:
 * - Type-safe database operations with Drizzle ORM
 * - Optimized queries with proper indexing
 * - Soft delete support
 * - Pagination and filtering
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { eq, and, or, desc, asc, sql, isNull, ilike, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type {
  Persona,
  PersonaAsset,
  PersonaMemory,
  PersonaInteraction,
  PersonaEmbed,
  PersonaSession,
  PersonaStatus,
  PersonaAssetType,
  PersonaMemoryType,
  PersonaInteractionMode,
  PaginationParams,
  PaginatedResponse,
  SortParams,
} from './types';

import {
  PersonaNotFoundError,
  PersonaNameExistsError,
  SessionNotFoundError,
} from './errors';

import { generateSlug, generateUniqueSlug } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Database schema type - will be imported from @alfred/database */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = {
  personas: any;
  personaAssets: any;
  personaMemories: any;
  personaInteractions: any;
  personaEmbeds: any;
  personaSessions: any;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PostgresJsDatabase<any>;

/** Database row types for mappers */
interface PersonaRow {
  id: string;
  userId: string;
  name: string;
  slug: string;
  archetype: string | null;
  tagline: string | null;
  backstory: string | null;
  traits: string[] | null;
  temperament: string | null;
  communicationStyle: string | null;
  emotionalRange: Record<string, unknown> | null;
  speakingStyle: Record<string, unknown> | null;
  knowledgeDomains: Array<{ domain: string; level: string }> | null;
  primaryImageUrl: string | null;
  thumbnailUrl: string | null;
  expressionGrid: Record<string, { imageUrl: string; thumbnailUrl?: string; seed?: number }> | null;
  visualStylePreset: string | null;
  visualConfig: Record<string, unknown> | null;
  identityEmbedding: Record<string, unknown> | null;
  voiceProvider: string | null;
  voiceId: string | null;
  voiceProfile: Record<string, unknown> | null;
  motionStylePreset: string | null;
  motionConfig: Record<string, unknown> | null;
  cameraAngle: string | null;
  status: string;
  isPublic: boolean;
  allowEmbed: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  customGreeting: string | null;
  currentMood: string | null;
  energyLevel: number | null;
  relationshipLevel: number | null;
  totalInteractions: number | null;
  totalChatMessages: number | null;
  totalVoiceMinutes: number | null;
  totalVideoMinutes: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastInteractionAt: Date | null;
  deletedAt: Date | null;
}

interface AssetRow {
  id: string;
  personaId: string;
  type: string;
  subtype: string | null;
  name: string | null;
  url: string;
  thumbnailUrl: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  generationConfig: Record<string, unknown> | null;
  generationCostUsd: number | null;
  generationTimeMs: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface MemoryRow {
  id: string;
  personaId: string;
  content: string;
  type: string;
  category: string | null;
  summary: string | null;
  embedding: number[] | null;
  embeddingModel: string | null;
  importance: number | null;
  confidence: number | null;
  accessCount: number | null;
  decayRate: number | null;
  sourceInteractionId: string | null;
  sourceUserId: string | null;
  lastAccessedAt: Date | null;
  createdAt: Date | null;
  expiresAt: Date | null;
}

interface InteractionRow {
  id: string;
  personaId: string;
  userId: string | null;
  sessionId: string | null;
  mode: string;
  userMessage: string | null;
  personaResponse: string | null;
  userEmotionDetected: string | null;
  personaEmotionExpressed: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationSeconds: number | null;
  latencyMs: number | null;
  wasHelpful: boolean | null;
  rating: number | null;
  feedback: string | null;
  llmCostUsd: number | null;
  ttsCostUsd: number | null;
  videoCostUsd: number | null;
  totalCostUsd: number | null;
  source: string | null;
  referrer: string | null;
  conversationContext: Record<string, unknown> | null;
  createdAt: Date | null;
}

interface EmbedRow {
  id: string;
  personaId: string;
  embedKey: string;
  allowedDomains: string[] | null;
  config: {
    theme?: string;
    position?: string;
    size?: string;
    customCss?: string;
    greeting?: string;
    requireAuth?: boolean;
    allowedModes?: string[];
  } | null;
  isActive: boolean;
  dailyLimitPerVisitor: number | null;
  dailyLimitTotal: number | null;
  totalLoads: number | null;
  totalInteractions: number | null;
  uniqueUsers: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface SessionRow {
  id: string;
  personaId: string;
  userId: string | null;
  visitorId: string | null;
  currentEmotion: string | null;
  contextSummary: string | null;
  sessionFacts: string[] | null;
  messageCount: number | null;
  tokenCount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  endedAt: Date | null;
}

/** Create persona input */
export interface CreatePersonaInput {
  userId: string;
  name: string;
  slug?: string;
  archetype?: string;
  tagline?: string;
  backstory?: string;
  traits?: string[];
}

/** Update persona input */
export interface UpdatePersonaInput {
  name?: string;
  slug?: string;
  archetype?: string;
  tagline?: string;
  backstory?: string;
  traits?: string[];
  temperament?: string;
  communicationStyle?: string;
  emotionalRange?: Record<string, unknown>;
  speakingStyle?: Record<string, unknown>;
  knowledgeDomains?: Array<{ domain: string; level: string }>;
  visualStyle?: string;
  visualConfig?: Record<string, unknown>;
  identityEmbedding?: Record<string, unknown>;
  voiceProvider?: string;
  voiceId?: string;
  voiceConfig?: Record<string, unknown>;
  motionStyle?: string;
  motionConfig?: Record<string, unknown>;
  cameraAngle?: string;
  status?: PersonaStatus;
  isPublic?: boolean;
  allowEmbed?: boolean;
  allowVoice?: boolean;
  allowVideo?: boolean;
  customGreeting?: string;
  currentMood?: string;
  energyLevel?: number;
  relationshipLevel?: number;
}

/** Persona list filters */
export interface PersonaListFilters {
  status?: PersonaStatus | PersonaStatus[];
  isPublic?: boolean;
  search?: string;
}

/** Create asset input */
export interface CreateAssetInput {
  personaId: string;
  type: PersonaAssetType;
  purpose: string;
  name?: string;
  url: string;
  thumbnailUrl?: string;
  storageProvider?: string;
  storageKey?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  generationConfig?: Record<string, unknown>;
  generationCost?: number;
  generationTimeMs?: number;
}

/** Create memory input */
export interface CreateMemoryInput {
  personaId: string;
  content: string;
  type: PersonaMemoryType;
  category?: string;
  summary?: string;
  embedding?: number[];
  embeddingModel?: string;
  importance?: number;
  confidence?: number;
  sourceInteractionId?: string;
  sourceUserId?: string;
}

/** Create interaction input */
export interface CreateInteractionInput {
  personaId: string;
  userId?: string;
  sessionId?: string;
  mode: PersonaInteractionMode;
  userMessage?: string;
  personaResponse?: string;
  userEmotionDetected?: string;
  personaEmotionExpressed?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationSeconds?: number;
  latencyMs?: number;
  llmCost?: number;
  ttsCost?: number;
  videoCost?: number;
  totalCost?: number;
  source?: string;
  referrer?: string;
  clientMetadata?: Record<string, unknown>;
}

/** Create embed input */
export interface CreateEmbedInput {
  personaId: string;
  domain: string;
  allowedOrigins?: string[];
  theme?: 'dark' | 'light';
  position?: string;
  size?: string;
  customCss?: string;
  branding?: Record<string, unknown>;
  requireAuth?: boolean;
  customGreeting?: string;
  allowedModes?: PersonaInteractionMode[];
  dailyLimitPerVisitor?: number;
  dailyLimitTotal?: number;
}

/** Create session input */
export interface CreateSessionInput {
  personaId: string;
  userId?: string;
  visitorId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

export class PersonaRepository {
  constructor(
    private readonly db: DB,
    private readonly schema: Schema,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new persona
   */
  async create(input: CreatePersonaInput): Promise<Persona> {
    const { userId, name, archetype, tagline, backstory, traits } = input;

    // Generate unique slug
    const existingSlugs = await this.getUserSlugs(userId);
    const slug = input.slug || generateUniqueSlug(name, existingSlugs);

    // Check for duplicate name
    const existing = await this.findByUserAndSlug(userId, slug);
    if (existing) {
      throw new PersonaNameExistsError(name, userId);
    }

    const [persona] = await this.db
      .insert(this.schema.personas)
      .values({
        userId,
        name,
        slug,
        archetype,
        tagline,
        backstory,
        traits: traits || [],
        status: 'creating',
      })
      .returning();

    return this.mapToPersona(persona);
  }

  /**
   * Find persona by ID
   */
  async findById(id: string): Promise<Persona | null> {
    const [persona] = await this.db
      .select()
      .from(this.schema.personas)
      .where(
        and(
          eq(this.schema.personas.id, id),
          isNull(this.schema.personas.deletedAt),
        ),
      )
      .limit(1);

    return persona ? this.mapToPersona(persona) : null;
  }

  /**
   * Find persona by ID or throw
   */
  async findByIdOrThrow(id: string): Promise<Persona> {
    const persona = await this.findById(id);
    if (!persona) {
      throw new PersonaNotFoundError(id);
    }
    return persona;
  }

  /**
   * Find persona by user ID and slug
   */
  async findByUserAndSlug(userId: string, slug: string): Promise<Persona | null> {
    const [persona] = await this.db
      .select()
      .from(this.schema.personas)
      .where(
        and(
          eq(this.schema.personas.userId, userId),
          eq(this.schema.personas.slug, slug),
          isNull(this.schema.personas.deletedAt),
        ),
      )
      .limit(1);

    return persona ? this.mapToPersona(persona) : null;
  }

  /**
   * Find public persona by slug
   */
  async findPublicBySlug(slug: string): Promise<Persona | null> {
    const [persona] = await this.db
      .select()
      .from(this.schema.personas)
      .where(
        and(
          eq(this.schema.personas.slug, slug),
          eq(this.schema.personas.isPublic, true),
          eq(this.schema.personas.status, 'active'),
          isNull(this.schema.personas.deletedAt),
        ),
      )
      .limit(1);

    return persona ? this.mapToPersona(persona) : null;
  }

  /**
   * List personas for a user with pagination and filters
   */
  async listByUser(
    userId: string,
    options: {
      pagination?: PaginationParams;
      sort?: SortParams;
      filters?: PersonaListFilters;
    } = {},
  ): Promise<PaginatedResponse<Persona>> {
    const { pagination = { page: 1, limit: 20 }, sort, filters } = options;
    const offset = (pagination.page - 1) * pagination.limit;

    // Build conditions
    const conditions = [
      eq(this.schema.personas.userId, userId),
      isNull(this.schema.personas.deletedAt),
    ];

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(this.schema.personas.status, filters.status));
      } else {
        conditions.push(eq(this.schema.personas.status, filters.status));
      }
    }

    if (filters?.isPublic !== undefined) {
      conditions.push(eq(this.schema.personas.isPublic, filters.isPublic));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(this.schema.personas.name, `%${filters.search}%`),
          ilike(this.schema.personas.tagline, `%${filters.search}%`),
        )!,
      );
    }

    // Count total
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.schema.personas)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count ?? 0);

    // Determine sort order
    let orderBy;
    if (sort) {
      const column = this.schema.personas[(sort.field as any)];
      orderBy = sort.order === 'asc' ? asc(column) : desc(column);
    } else {
      orderBy = desc(this.schema.personas.createdAt);
    }

    // Fetch personas
    const personas = await this.db
      .select()
      .from(this.schema.personas)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(offset);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: personas.map((p) => this.mapToPersona(p)),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  }

  /**
   * Update a persona
   */
  async update(id: string, input: UpdatePersonaInput): Promise<Persona> {
    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        // Convert camelCase to snake_case for DB
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates[dbKey] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return this.findByIdOrThrow(id);
    }

    const [persona] = await this.db
      .update(this.schema.personas)
      .set(updates)
      .where(eq(this.schema.personas.id, id))
      .returning();

    if (!persona) {
      throw new PersonaNotFoundError(id);
    }

    return this.mapToPersona(persona);
  }

  /**
   * Soft delete a persona
   */
  async delete(id: string): Promise<void> {
    const result = await this.db
      .update(this.schema.personas)
      .set({
        deletedAt: new Date(),
        status: 'archived',
      })
      .where(eq(this.schema.personas.id, id));

    // Check if any rows were affected
    // Note: Drizzle doesn't return affected rows count directly
  }

  /**
   * Count personas for a user
   */
  async countByUser(userId: string): Promise<number> {
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(this.schema.personas)
      .where(
        and(
          eq(this.schema.personas.userId, userId),
          isNull(this.schema.personas.deletedAt),
        ),
      );

    return Number(countResult[0]?.count ?? 0);
  }

  /**
   * Get all slugs for a user (for unique slug generation)
   */
  private async getUserSlugs(userId: string): Promise<Set<string>> {
    const results = await this.db
      .select({ slug: this.schema.personas.slug })
      .from(this.schema.personas)
      .where(eq(this.schema.personas.userId, userId));

    return new Set(results.map((r) => r.slug));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA ASSETS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a persona asset
   */
  async createAsset(input: CreateAssetInput): Promise<PersonaAsset> {
    const [asset] = await this.db
      .insert(this.schema.personaAssets)
      .values({
        personaId: input.personaId,
        type: input.type,
        subtype: input.purpose,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl,
        mimeType: input.mimeType,
        sizeBytes: input.size,
        width: input.width,
        height: input.height,
        durationSeconds: input.duration,
        generationConfig: input.generationConfig,
        generationCostUsd: input.generationCost,
        seed: input.generationConfig?.seed as number | undefined,
        prompt: input.generationConfig?.prompt as string | undefined,
      })
      .returning();

    return this.mapToAsset(asset);
  }

  /**
   * List assets for a persona
   */
  async listAssets(
    personaId: string,
    options: { type?: PersonaAssetType; purpose?: string } = {},
  ): Promise<PersonaAsset[]> {
    const conditions = [eq(this.schema.personaAssets.personaId, personaId)];

    if (options.type) {
      conditions.push(eq(this.schema.personaAssets.type, options.type));
    }

    if (options.purpose) {
      conditions.push(eq(this.schema.personaAssets.subtype, options.purpose));
    }

    const assets = await this.db
      .select()
      .from(this.schema.personaAssets)
      .where(and(...conditions))
      .orderBy(desc(this.schema.personaAssets.createdAt));

    return assets.map((a) => this.mapToAsset(a));
  }

  /**
   * Get primary image for a persona
   */
  async getPrimaryImage(personaId: string): Promise<PersonaAsset | null> {
    const [asset] = await this.db
      .select()
      .from(this.schema.personaAssets)
      .where(
        and(
          eq(this.schema.personaAssets.personaId, personaId),
          eq(this.schema.personaAssets.type, 'image'),
          eq(this.schema.personaAssets.isPrimary, true),
        ),
      )
      .limit(1);

    return asset ? this.mapToAsset(asset) : null;
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.db
      .delete(this.schema.personaAssets)
      .where(eq(this.schema.personaAssets.id, id));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA MEMORIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a persona memory
   */
  async createMemory(input: CreateMemoryInput): Promise<PersonaMemory> {
    const [memory] = await this.db
      .insert(this.schema.personaMemories)
      .values({
        personaId: input.personaId,
        content: input.content,
        type: input.type,
        category: input.category,
        summary: input.summary,
        embedding: input.embedding,
        embeddingModel: input.embeddingModel,
        importance: input.importance ?? 0.5,
        confidence: input.confidence ?? 0.8,
        sourceInteractionId: input.sourceInteractionId,
        sourceUserId: input.sourceUserId,
      })
      .returning();

    return this.mapToMemory(memory);
  }

  /**
   * List memories for a persona (sorted by importance)
   */
  async listMemories(
    personaId: string,
    options: {
      type?: PersonaMemoryType;
      limit?: number;
      minImportance?: number;
    } = {},
  ): Promise<PersonaMemory[]> {
    const { type, limit = 50, minImportance = 0 } = options;

    const conditions = [
      eq(this.schema.personaMemories.personaId, personaId),
      sql`${this.schema.personaMemories.importance} >= ${minImportance}`,
    ];

    if (type) {
      conditions.push(eq(this.schema.personaMemories.type, type));
    }

    const memories = await this.db
      .select()
      .from(this.schema.personaMemories)
      .where(and(...conditions))
      .orderBy(desc(this.schema.personaMemories.importance))
      .limit(limit);

    return memories.map((m) => this.mapToMemory(m));
  }

  /**
   * Update memory access (for recall tracking)
   */
  async touchMemory(id: string): Promise<void> {
    await this.db
      .update(this.schema.personaMemories)
      .set({
        accessCount: sql`${this.schema.personaMemories.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(this.schema.personaMemories.id, id));
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<void> {
    await this.db
      .delete(this.schema.personaMemories)
      .where(eq(this.schema.personaMemories.id, id));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA INTERACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a persona interaction
   */
  async createInteraction(input: CreateInteractionInput): Promise<PersonaInteraction> {
    const [interaction] = await this.db
      .insert(this.schema.personaInteractions)
      .values({
        personaId: input.personaId,
        userId: input.userId,
        sessionId: input.sessionId,
        mode: input.mode,
        userMessage: input.userMessage,
        personaResponse: input.personaResponse,
        userEmotionDetected: input.userEmotionDetected,
        personaEmotionExpressed: input.personaEmotionExpressed,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        durationSeconds: input.durationSeconds,
        latencyMs: input.latencyMs,
        llmCostUsd: input.llmCost,
        ttsCostUsd: input.ttsCost,
        videoCostUsd: input.videoCost,
        totalCostUsd: input.totalCost,
        conversationContext: input.clientMetadata,
      })
      .returning();

    return this.mapToInteraction(interaction);
  }

  /**
   * List interactions for a persona
   */
  async listInteractions(
    personaId: string,
    options: {
      sessionId?: string;
      mode?: PersonaInteractionMode;
      limit?: number;
    } = {},
  ): Promise<PersonaInteraction[]> {
    const { sessionId, mode, limit = 100 } = options;

    const conditions = [eq(this.schema.personaInteractions.personaId, personaId)];

    if (sessionId) {
      conditions.push(eq(this.schema.personaInteractions.sessionId, sessionId));
    }

    if (mode) {
      conditions.push(eq(this.schema.personaInteractions.mode, mode));
    }

    const interactions = await this.db
      .select()
      .from(this.schema.personaInteractions)
      .where(and(...conditions))
      .orderBy(desc(this.schema.personaInteractions.createdAt))
      .limit(limit);

    return interactions.map((i) => this.mapToInteraction(i));
  }

  /**
   * Get interaction stats for a persona
   */
  async getInteractionStats(personaId: string): Promise<{
    totalInteractions: number;
    totalChatMessages: number;
    totalVoiceMinutes: number;
    totalVideoMinutes: number;
    avgRating: number | null;
  }> {
    const [stats] = await this.db
      .select({
        totalInteractions: sql<number>`count(*)`,
        totalChatMessages: sql<number>`count(*) filter (where mode = 'chat')`,
        totalVoiceMinutes: sql<number>`coalesce(sum(duration_seconds) filter (where mode = 'voice') / 60, 0)`,
        totalVideoMinutes: sql<number>`coalesce(sum(duration_seconds) filter (where mode = 'video') / 60, 0)`,
        avgRating: sql<number>`avg(user_rating)`,
      })
      .from(this.schema.personaInteractions)
      .where(eq(this.schema.personaInteractions.personaId, personaId));

    return {
      totalInteractions: Number(stats?.totalInteractions ?? 0),
      totalChatMessages: Number(stats?.totalChatMessages ?? 0),
      totalVoiceMinutes: Number(stats?.totalVoiceMinutes ?? 0),
      totalVideoMinutes: Number(stats?.totalVideoMinutes ?? 0),
      avgRating: stats?.avgRating ? Number(stats.avgRating) : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA EMBEDS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a persona embed configuration
   */
  async createEmbed(input: CreateEmbedInput): Promise<PersonaEmbed> {
    const [embed] = await this.db
      .insert(this.schema.personaEmbeds)
      .values({
        personaId: input.personaId,
        embedKey: input.domain,
        allowedDomains: input.allowedOrigins || [],
        config: {
          theme: input.theme || 'dark',
          position: input.position || 'bottom-right',
          size: input.size || 'medium',
          customCss: input.customCss,
          greeting: input.customGreeting,
          allowedDomains: input.allowedOrigins,
        },
      })
      .returning();

    return this.mapToEmbed(embed);
  }

  /**
   * Find embed by persona and domain
   */
  async findEmbed(personaId: string, domain: string): Promise<PersonaEmbed | null> {
    const [embed] = await this.db
      .select()
      .from(this.schema.personaEmbeds)
      .where(
        and(
          eq(this.schema.personaEmbeds.personaId, personaId),
          eq(this.schema.personaEmbeds.embedKey, domain),
        ),
      )
      .limit(1);

    return embed ? this.mapToEmbed(embed) : null;
  }

  /**
   * List embeds for a persona
   */
  async listEmbeds(personaId: string): Promise<PersonaEmbed[]> {
    const embeds = await this.db
      .select()
      .from(this.schema.personaEmbeds)
      .where(eq(this.schema.personaEmbeds.personaId, personaId))
      .orderBy(desc(this.schema.personaEmbeds.createdAt));

    return embeds.map((e) => this.mapToEmbed(e));
  }

  /**
   * Increment embed analytics
   */
  async incrementEmbedStats(
    id: string,
    stats: { impressions?: number; interactions?: number; visitors?: number },
  ): Promise<void> {
    const updates: Record<string, unknown> = {};

    if (stats.impressions) {
      updates.totalLoads = sql`${this.schema.personaEmbeds.totalLoads} + ${stats.impressions}`;
    }
    if (stats.interactions) {
      updates.totalInteractions = sql`${this.schema.personaEmbeds.totalInteractions} + ${stats.interactions}`;
    }
    if (stats.visitors) {
      updates.uniqueUsers = sql`${this.schema.personaEmbeds.uniqueUsers} + ${stats.visitors}`;
    }

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(this.schema.personaEmbeds)
        .set(updates)
        .where(eq(this.schema.personaEmbeds.id, id));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERSONA SESSIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput): Promise<PersonaSession> {
    const [session] = await this.db
      .insert(this.schema.personaSessions)
      .values({
        personaId: input.personaId,
        userId: input.userId,
        visitorId: input.visitorId,
      })
      .returning();

    return this.mapToSession(session);
  }

  /**
   * Find session by ID
   */
  async findSession(id: string): Promise<PersonaSession | null> {
    const [session] = await this.db
      .select()
      .from(this.schema.personaSessions)
      .where(eq(this.schema.personaSessions.id, id))
      .limit(1);

    return session ? this.mapToSession(session) : null;
  }

  /**
   * Find session by ID or throw
   */
  async findSessionOrThrow(id: string): Promise<PersonaSession> {
    const session = await this.findSession(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }
    return session;
  }

  /**
   * Find active session for user/persona
   */
  async findActiveSession(
    personaId: string,
    options: { userId?: string; visitorId?: string },
  ): Promise<PersonaSession | null> {
    const conditions = [
      eq(this.schema.personaSessions.personaId, personaId),
      isNull(this.schema.personaSessions.endedAt),
    ];

    if (options.userId) {
      conditions.push(eq(this.schema.personaSessions.userId, options.userId));
    } else if (options.visitorId) {
      conditions.push(eq(this.schema.personaSessions.visitorId, options.visitorId));
    }

    const [session] = await this.db
      .select()
      .from(this.schema.personaSessions)
      .where(and(...conditions))
      .orderBy(desc(this.schema.personaSessions.lastActivityAt))
      .limit(1);

    return session ? this.mapToSession(session) : null;
  }

  /**
   * Update session
   */
  async updateSession(
    id: string,
    updates: {
      currentMood?: string;
      contextSummary?: string;
      sessionFacts?: string[];
      messageCount?: number;
      tokenCount?: number;
    },
  ): Promise<PersonaSession> {
    const dbUpdates: Record<string, unknown> = {
      lastActivityAt: new Date(),
    };

    if (updates.currentMood !== undefined) {
      dbUpdates.currentMood = updates.currentMood;
    }
    if (updates.contextSummary !== undefined) {
      dbUpdates.contextSummary = updates.contextSummary;
    }
    if (updates.sessionFacts !== undefined) {
      dbUpdates.sessionFacts = updates.sessionFacts;
    }
    if (updates.messageCount !== undefined) {
      dbUpdates.messageCount = updates.messageCount;
    }
    if (updates.tokenCount !== undefined) {
      dbUpdates.tokenCount = updates.tokenCount;
    }

    const [session] = await this.db
      .update(this.schema.personaSessions)
      .set(dbUpdates)
      .where(eq(this.schema.personaSessions.id, id))
      .returning();

    return this.mapToSession(session);
  }

  /**
   * End a session
   */
  async endSession(id: string): Promise<void> {
    await this.db
      .update(this.schema.personaSessions)
      .set({ endedAt: new Date() })
      .where(eq(this.schema.personaSessions.id, id));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAPPERS (DB row to domain entity)
  // ─────────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToPersona(row: any): Persona {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      slug: row.slug,
      archetype: row.archetype,
      tagline: row.tagline,
      backstory: row.backstory,
      traits: row.traits || [],
      temperament: row.temperament,
      communicationStyle: row.communicationStyle,
      emotionalRange: row.emotionalRange,
      speakingStyle: row.speakingStyle,
      knowledgeDomains: row.knowledgeDomains,
      // Image URLs - the beautiful state-of-the-art images!
      imageUrl: row.primaryImageUrl,
      primaryImageUrl: row.primaryImageUrl,
      thumbnailUrl: row.thumbnailUrl,
      expressionGrid: row.expressionGrid,
      visualStyle: row.visualStylePreset,
      visualConfig: row.visualConfig,
      identityEmbedding: row.identityEmbedding,
      voiceProvider: row.voiceProvider,
      voiceId: row.voiceId,
      voiceConfig: row.voiceProfile,
      motionStyle: row.motionStylePreset,
      motionConfig: row.motionConfig,
      cameraAngle: row.cameraAngle,
      status: row.status,
      isPublic: row.isPublic,
      allowEmbed: row.allowEmbed,
      allowVoice: row.allowVoice,
      allowVideo: row.allowVideo,
      customGreeting: row.customGreeting,
      currentMood: row.currentMood,
      energyLevel: row.energyLevel,
      relationshipLevel: row.relationshipLevel,
      totalInteractions: row.totalInteractions,
      totalChatMessages: row.totalChatMessages,
      totalVoiceMinutes: row.totalVoiceMinutes,
      totalVideoMinutes: row.totalVideoMinutes,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
      lastInteractionAt: row.lastInteractionAt?.toISOString(),
      deletedAt: row.deletedAt?.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToAsset(row: any): PersonaAsset {
    return {
      id: row.id,
      personaId: row.personaId,
      type: row.type,
      purpose: row.subtype,
      name: row.name,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      storageProvider: row.storageProvider,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      size: row.sizeBytes,
      width: row.width,
      height: row.height,
      duration: row.durationSeconds,
      generationConfig: row.generationConfig,
      generationCost: row.generationCostUsd,
      generationTimeMs: row.generationTimeMs,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToMemory(row: any): PersonaMemory {
    return {
      id: row.id,
      personaId: row.personaId,
      content: row.content,
      type: row.type,
      category: row.category,
      summary: row.summary,
      embedding: row.embedding,
      embeddingModel: row.embeddingModel,
      importance: row.importance,
      confidence: row.confidence,
      accessCount: row.accessCount,
      decayRate: row.decayRate,
      sourceInteractionId: row.sourceInteractionId,
      sourceUserId: row.sourceUserId,
      lastAccessedAt: row.lastAccessedAt?.toISOString(),
      createdAt: row.createdAt?.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToInteraction(row: any): PersonaInteraction {
    return {
      id: row.id,
      personaId: row.personaId,
      userId: row.userId,
      sessionId: row.sessionId,
      mode: row.mode,
      userMessage: row.userMessage,
      personaResponse: row.personaResponse,
      userEmotionDetected: row.userEmotionDetected,
      personaEmotionExpressed: row.personaEmotionExpressed,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      durationSeconds: row.durationSeconds,
      latencyMs: row.latencyMs,
      wasHelpful: row.wasHelpful,
      userRating: row.rating,
      userFeedback: row.feedback,
      llmCost: row.llmCostUsd,
      ttsCost: row.ttsCostUsd,
      videoCost: row.videoCostUsd,
      totalCost: row.totalCostUsd,
      source: row.source,
      referrer: row.referrer,
      clientMetadata: row.conversationContext,
      createdAt: row.createdAt?.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToEmbed(row: any): PersonaEmbed {
    return {
      id: row.id,
      personaId: row.personaId,
      domain: row.embedKey,
      allowedOrigins: row.allowedDomains || [],
      theme: row.config?.theme,
      position: row.config?.position,
      size: row.config?.size,
      customCss: row.config?.customCss,
      branding: row.config,
      isActive: row.isActive,
      requireAuth: row.config?.requireAuth,
      customGreeting: row.config?.greeting,
      allowedModes: row.config?.allowedModes || ['chat'],
      dailyLimitPerVisitor: row.dailyLimitPerVisitor,
      dailyLimitTotal: row.dailyLimitTotal,
      totalImpressions: row.totalLoads,
      totalInteractions: row.totalInteractions,
      uniqueVisitors: row.uniqueUsers,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToSession(row: any): PersonaSession {
    return {
      id: row.id,
      personaId: row.personaId,
      userId: row.userId,
      visitorId: row.visitorId,
      currentMood: row.currentEmotion,
      contextSummary: row.contextSummary,
      sessionFacts: row.sessionFacts || [],
      messageCount: row.messageCount,
      tokenCount: row.tokenCount,
      startedAt: row.createdAt?.toISOString(),
      lastActivityAt: row.updatedAt?.toISOString(),
      endedAt: row.endedAt?.toISOString(),
    };
  }
}