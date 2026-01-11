/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Business logic layer for PersonaForge operations.
 * Orchestrates repository calls, validation, and external service integration.
 *
 * Features:
 * - Persona CRUD with validation
 * - Quota enforcement
 * - Cost tracking
 * - Event emission for analytics
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    Persona,
    PersonaAsset,
    PersonaMemory,
    PersonaInteraction,
    PersonaEmbed,
    PersonaSession,
    PersonaStatus,
    PersonaInteractionMode,
    CreatePersonaRequest,
    CreatePersonaResponse,
    UpdatePersonaRequest,
    PaginationParams,
    PaginatedResponse,
    ChatStreamEvent,
  } from './types';
  
  import {
    PersonaRepository,
    type CreatePersonaInput,
    type UpdatePersonaInput,
    type CreateAssetInput,
    type CreateMemoryInput,
    type CreateInteractionInput,
    type CreateEmbedInput,
    type CreateSessionInput,
    type PersonaListFilters,
  } from './repository';
  
  import {
    PersonaError,
    PersonaNotFoundError,
    PersonaLimitReachedError,
    PersonaQuotaExceededError,
    PersonaValidationError,
  } from './errors';
  
  import {
    PERSONA_LIMITS,
    DEFAULT_CONFIG,
    type PricingTier,
  } from './constants';
  
  import {
    validateCreateRequest,
    validateUpdateRequest,
    validatePersonaConfig,
    calculateInteractionCost,
    generateSlug,
  } from './utils';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /** User context for authorization */
  export interface UserContext {
    userId: string;
    tier: PricingTier;
    email?: string;
  }
  
  /** Service configuration */
  export interface PersonaServiceConfig {
    /** Enable quota enforcement */
    enforceQuotas?: boolean;
    /** Enable cost tracking */
    trackCosts?: boolean;
    /** Event emitter for analytics */
    onEvent?: (event: PersonaEvent) => void;
  }
  
  /** Persona events for analytics */
  export type PersonaEventType =
    | 'persona.created'
    | 'persona.updated'
    | 'persona.deleted'
    | 'persona.activated'
    | 'interaction.started'
    | 'interaction.completed'
    | 'asset.generated'
    | 'memory.created'
    | 'quota.warning'
    | 'quota.exceeded';
  
  export interface PersonaEvent {
    type: PersonaEventType;
    userId: string;
    personaId?: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }
  
  /** Daily usage stats */
  export interface DailyUsage {
    chatMessages: number;
    voiceMinutes: number;
    videoMinutes: number;
    date: string;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA SERVICE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class PersonaService {
    private readonly config: Required<PersonaServiceConfig>;
  
    constructor(
      private readonly repository: PersonaRepository,
      config: PersonaServiceConfig = {},
    ) {
      this.config = {
        enforceQuotas: config.enforceQuotas ?? true,
        trackCosts: config.trackCosts ?? true,
        onEvent: config.onEvent ?? (() => {}),
      };
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // PERSONA CRUD
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Create a new persona
     */
    async create(
      ctx: UserContext,
      request: CreatePersonaRequest,
    ): Promise<CreatePersonaResponse> {
      // Validate request
      validateCreateRequest(request);
  
      // Check persona limit
      if (this.config.enforceQuotas) {
        const count = await this.repository.countByUser(ctx.userId);
        const limit = PERSONA_LIMITS[ctx.tier].maxPersonas;
  
        if (count >= limit) {
          throw new PersonaLimitReachedError(count, limit, ctx.tier);
        }
      }
  
      // Create persona
      const persona = await this.repository.create({
        userId: ctx.userId,
        name: request.name,
        archetype: request.archetype,
        // Initial status is 'creating' - will change to 'active' after wizard completion
      });
  
      // Generate wizard session ID
      const wizardSessionId = `wizard_${persona.id}_${Date.now()}`;
  
      // Emit event
      this.emitEvent({
        type: 'persona.created',
        userId: ctx.userId,
        personaId: persona.id,
        data: { name: request.name },
      });
  
      return {
        persona,
        wizardSessionId,
      };
    }
  
    /**
     * Get persona by ID
     */
    async getById(ctx: UserContext, personaId: string): Promise<Persona> {
      const persona = await this.repository.findByIdOrThrow(personaId);
  
      // Verify ownership or public access
      if (persona.userId !== ctx.userId && !persona.isPublic) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return persona;
    }
  
    /**
     * Get public persona by slug
     */
    async getPublicBySlug(slug: string): Promise<Persona> {
      const persona = await this.repository.findPublicBySlug(slug);
  
      if (!persona) {
        throw new PersonaNotFoundError(slug);
      }
  
      return persona;
    }
  
    /**
     * List personas for user
     */
    async list(
      ctx: UserContext,
      options: {
        pagination?: PaginationParams;
        filters?: PersonaListFilters;
      } = {},
    ): Promise<PaginatedResponse<Persona>> {
      return this.repository.listByUser(ctx.userId, options);
    }
  
    /**
     * Update persona
     */
    async update(
      ctx: UserContext,
      personaId: string,
      request: UpdatePersonaRequest,
    ): Promise<Persona> {
      // Verify ownership
      const existing = await this.repository.findByIdOrThrow(personaId);
      if (existing.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      // Validate request
      validateUpdateRequest(request);
  
      // Update persona
      const persona = await this.repository.update(personaId, request as any);
  
      // Emit event
      this.emitEvent({
        type: 'persona.updated',
        userId: ctx.userId,
        personaId,
        data: { fields: Object.keys(request) },
      });
  
      return persona;
    }
  
    /**
     * Activate persona (transition from 'creating' to 'active')
     */
    async activate(ctx: UserContext, personaId: string): Promise<Persona> {
      const existing = await this.repository.findByIdOrThrow(personaId);
  
      if (existing.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      if (existing.status !== 'creating') {
        throw new PersonaValidationError([
          {
            field: 'status',
            message: `Cannot activate persona with status '${existing.status}'`,
          },
        ]);
      }
  
      // Validate minimum required configuration
      this.validateActivationRequirements(existing);
  
      const persona = await this.repository.update(personaId, { status: 'active' });
  
      this.emitEvent({
        type: 'persona.activated',
        userId: ctx.userId,
        personaId,
      });
  
      return persona;
    }
  
    /**
     * Pause persona
     */
    async pause(ctx: UserContext, personaId: string): Promise<Persona> {
      const existing = await this.repository.findByIdOrThrow(personaId);
  
      if (existing.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return this.repository.update(personaId, { status: 'paused' });
    }
  
    /**
     * Resume paused persona
     */
    async resume(ctx: UserContext, personaId: string): Promise<Persona> {
      const existing = await this.repository.findByIdOrThrow(personaId);
  
      if (existing.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      if (existing.status !== 'paused') {
        throw new PersonaValidationError([
          {
            field: 'status',
            message: 'Can only resume paused personas',
          },
        ]);
      }
  
      return this.repository.update(personaId, { status: 'active' });
    }
  
    /**
     * Delete persona (soft delete)
     */
    async delete(ctx: UserContext, personaId: string): Promise<void> {
      const existing = await this.repository.findByIdOrThrow(personaId);
  
      if (existing.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      await this.repository.delete(personaId);
  
      this.emitEvent({
        type: 'persona.deleted',
        userId: ctx.userId,
        personaId,
      });
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // ASSETS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Add asset to persona
     */
    async addAsset(
      ctx: UserContext,
      personaId: string,
      input: Omit<CreateAssetInput, 'personaId'>,
    ): Promise<PersonaAsset> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      const asset = await this.repository.createAsset({
        ...input,
        personaId,
      });
  
      this.emitEvent({
        type: 'asset.generated',
        userId: ctx.userId,
        personaId,
        data: { type: input.type, purpose: input.purpose },
      });
  
      return asset;
    }
  
    /**
     * List persona assets
     */
    async listAssets(
      ctx: UserContext,
      personaId: string,
      options: { type?: string } = {},
    ): Promise<PersonaAsset[]> {
      // Verify access
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId && !persona.isPublic) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return this.repository.listAssets(personaId, options as any);
    }
  
    /**
     * Delete asset
     */
    async deleteAsset(ctx: UserContext, assetId: string): Promise<void> {
      // TODO: Verify ownership through persona
      await this.repository.deleteAsset(assetId);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // MEMORIES
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Add memory to persona
     */
    async addMemory(
      ctx: UserContext,
      personaId: string,
      input: Omit<CreateMemoryInput, 'personaId'>,
    ): Promise<PersonaMemory> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      const memory = await this.repository.createMemory({
        ...input,
        personaId,
      });
  
      this.emitEvent({
        type: 'memory.created',
        userId: ctx.userId,
        personaId,
        data: { type: input.type },
      });
  
      return memory;
    }
  
    /**
     * List persona memories
     */
    async listMemories(
      ctx: UserContext,
      personaId: string,
      options: { type?: string; limit?: number } = {},
    ): Promise<PersonaMemory[]> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return this.repository.listMemories(personaId, options as any);
    }
  
    /**
     * Delete memory
     */
    async deleteMemory(ctx: UserContext, memoryId: string): Promise<void> {
      // TODO: Verify ownership through persona
      await this.repository.deleteMemory(memoryId);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERACTIONS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Record an interaction
     */
    async recordInteraction(
      ctx: UserContext,
      input: CreateInteractionInput,
    ): Promise<PersonaInteraction> {
      // Calculate costs if tracking enabled
      let costs = {
        llmCost: input.llmCost,
        ttsCost: input.ttsCost,
        videoCost: input.videoCost,
        totalCost: input.totalCost,
      };
  
      if (this.config.trackCosts && input.inputTokens && input.outputTokens) {
        const calculated = calculateInteractionCost({
          mode: input.mode,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          durationSeconds: input.durationSeconds,
        });
  
        costs = {
          llmCost: costs.llmCost ?? calculated.llmCost,
          ttsCost: costs.ttsCost ?? calculated.ttsCost,
          videoCost: costs.videoCost ?? calculated.videoCost,
          totalCost: costs.totalCost ?? calculated.totalCost,
        };
      }
  
      const interaction = await this.repository.createInteraction({
        ...input,
        userId: ctx.userId,
        ...costs,
      });
  
      this.emitEvent({
        type: 'interaction.completed',
        userId: ctx.userId,
        personaId: input.personaId,
        data: {
          mode: input.mode,
          tokens: (input.inputTokens || 0) + (input.outputTokens || 0),
          cost: costs.totalCost,
        },
      });
  
      return interaction;
    }
  
    /**
     * Check if user can interact with persona (quota check)
     */
    async checkInteractionQuota(
      ctx: UserContext,
      personaId: string,
      mode: PersonaInteractionMode,
    ): Promise<{ allowed: boolean; reason?: string }> {
      if (!this.config.enforceQuotas) {
        return { allowed: true };
      }
  
      const limits = PERSONA_LIMITS[ctx.tier];
  
      // Check if mode is allowed for tier
      if (!(limits.allowedModes as readonly string[]).includes(mode)) {
        return {
          allowed: false,
          reason: `${mode} mode not available on ${ctx.tier} plan`,
        };
      }
  
      // Get today's usage
      const usage = await this.getDailyUsage(ctx.userId);
  
      // Check daily chat limit
      if (mode === 'chat' && usage.chatMessages >= limits.maxChatMessagesPerDay) {
        this.emitEvent({
          type: 'quota.exceeded',
          userId: ctx.userId,
          personaId,
          data: { quotaType: 'chat', used: usage.chatMessages, limit: limits.maxChatMessagesPerDay },
        });
  
        return {
          allowed: false,
          reason: `Daily chat limit reached (${usage.chatMessages}/${limits.maxChatMessagesPerDay})`,
        };
      }
  
      // Check monthly voice limit
      if (mode === 'voice') {
        const monthlyVoice = await this.getMonthlyVoiceMinutes(ctx.userId);
        if (monthlyVoice >= limits.maxVoiceMinutesPerMonth) {
          return {
            allowed: false,
            reason: `Monthly voice limit reached (${monthlyVoice}/${limits.maxVoiceMinutesPerMonth} minutes)`,
          };
        }
      }
  
      // Check monthly video limit
      if (mode === 'video') {
        const monthlyVideo = await this.getMonthlyVideoMinutes(ctx.userId);
        if (monthlyVideo >= limits.maxVideoMinutesPerMonth) {
          return {
            allowed: false,
            reason: `Monthly video limit reached (${monthlyVideo}/${limits.maxVideoMinutesPerMonth} minutes)`,
          };
        }
      }
  
      return { allowed: true };
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // SESSIONS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Get or create session
     */
    async getOrCreateSession(
      ctx: UserContext,
      personaId: string,
      visitorId?: string,
    ): Promise<PersonaSession> {
      // Try to find existing active session
      const existing = await this.repository.findActiveSession(personaId, {
        userId: ctx.userId,
        visitorId,
      });
  
      if (existing) {
        return existing;
      }
  
      // Create new session
      return this.repository.createSession({
        personaId,
        userId: ctx.userId,
        visitorId,
      });
    }
  
    /**
     * Update session
     */
    async updateSession(
      sessionId: string,
      updates: {
        currentMood?: string;
        contextSummary?: string;
        sessionFacts?: string[];
        messageCount?: number;
        tokenCount?: number;
      },
    ): Promise<PersonaSession> {
      return this.repository.updateSession(sessionId, updates);
    }
  
    /**
     * End session
     */
    async endSession(sessionId: string): Promise<void> {
      await this.repository.endSession(sessionId);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // EMBEDS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Create embed configuration
     */
    async createEmbed(
      ctx: UserContext,
      personaId: string,
      input: Omit<CreateEmbedInput, 'personaId'>,
    ): Promise<PersonaEmbed> {
      // Check if embedding is allowed for tier
      if (!PERSONA_LIMITS[ctx.tier].allowEmbed) {
        throw new PersonaValidationError([
          {
            field: 'embed',
            message: `Embedding not available on ${ctx.tier} plan`,
          },
        ]);
      }
  
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      if (!persona.allowEmbed) {
        throw new PersonaValidationError([
          {
            field: 'allowEmbed',
            message: 'Embedding is disabled for this persona',
          },
        ]);
      }
  
      return this.repository.createEmbed({
        ...input,
        personaId,
      });
    }
  
    /**
     * List embeds for persona
     */
    async listEmbeds(ctx: UserContext, personaId: string): Promise<PersonaEmbed[]> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return this.repository.listEmbeds(personaId);
    }
  
    /**
     * Get embed code
     */
    async getEmbedCode(
      ctx: UserContext,
      personaId: string,
      domain: string,
    ): Promise<{ scriptTag: string; iframeCode: string }> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      const embed = await this.repository.findEmbed(personaId, domain);
  
      const embedId = embed?.id || personaId;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alfred.app';
  
      const scriptTag = `<script src="${baseUrl}/embed/persona.js" data-persona-id="${embedId}"></script>`;
  
      const iframeCode = `<iframe src="${baseUrl}/embed/${embedId}" width="400" height="600" frameborder="0"></iframe>`;
  
      return { scriptTag, iframeCode };
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Get persona stats
     */
    async getStats(
      ctx: UserContext,
      personaId: string,
    ): Promise<{
      totalInteractions: number;
      totalChatMessages: number;
      totalVoiceMinutes: number;
      totalVideoMinutes: number;
      avgRating: number | null;
    }> {
      // Verify ownership
      const persona = await this.repository.findByIdOrThrow(personaId);
      if (persona.userId !== ctx.userId) {
        throw new PersonaNotFoundError(personaId);
      }
  
      return this.repository.getInteractionStats(personaId);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Validate minimum requirements for activation
     */
    private validateActivationRequirements(persona: Persona): void {
      const errors: Array<{ field: string; message: string }> = [];
  
      // Must have at least one visual asset
      // TODO: Check for primary image
  
      // Must have voice configuration if voice is enabled
      if (persona.allowVoice && !persona.voiceId) {
        errors.push({
          field: 'voiceId',
          message: 'Voice configuration required when voice is enabled',
        });
      }
  
      if (errors.length > 0) {
        throw new PersonaValidationError(errors);
      }
    }
  
    /**
     * Get daily usage for user
     */
    private async getDailyUsage(userId: string): Promise<DailyUsage> {
      // TODO: Query from database or cache
      // For now, return mock data
      return {
        chatMessages: 0,
        voiceMinutes: 0,
        videoMinutes: 0,
        date: new Date().toISOString().split('T')[0] ?? '',
      };
    }
  
    /**
     * Get monthly voice minutes
     */
    private async getMonthlyVoiceMinutes(userId: string): Promise<number> {
      // TODO: Query from database
      return 0;
    }
  
    /**
     * Get monthly video minutes
     */
    private async getMonthlyVideoMinutes(userId: string): Promise<number> {
      // TODO: Query from database
      return 0;
    }
  
    /**
     * Emit analytics event
     */
    private emitEvent(event: Omit<PersonaEvent, 'timestamp'>): void {
      this.config.onEvent({
        ...event,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FACTORY FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Create a PersonaService instance
   */
  export function createPersonaService(
    repository: PersonaRepository,
    config?: PersonaServiceConfig,
  ): PersonaService {
    return new PersonaService(repository, config);
  }