/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE DATABASE SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete Drizzle ORM schema for PersonaForge.
 * Add this to ~/AlfredV0.1/packages/database/src/schema.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    real,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    pgEnum,
  } from 'drizzle-orm/pg-core';
  import { relations } from 'drizzle-orm';
  // Import your existing users table
  // import { users } from './schema';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ENUMS
  // ═══════════════════════════════════════════════════════════════════════════════
  
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
  
  export const interactionModeEnum = pgEnum('interaction_mode', [
    'chat',
    'voice',
    'video',
  ]);
  
  export const memoryTypeEnum = pgEnum('memory_type', [
    'fact',
    'preference',
    'event',
    'belief',
    'opinion',
  ]);
  
  export const assetTypeEnum = pgEnum('asset_type', [
    'image',
    'video',
    'audio',
    'thumbnail',
    'expression',
  ]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // JSONB TYPE INTERFACES (for reference)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Define these interfaces in your types file
  /*
  interface SpeakingStyle {
    rules: string[];
    examples: string[];
    vocabularyLevel: string;
    quirks: string[];
  }
  
  interface KnowledgeDomain {
    domain: string;
    level: 'basic' | 'intermediate' | 'advanced' | 'expert';
    topics?: string[];
    enthusiasm?: number;
  }
  
  interface ReferenceImages {
    primary: string;
    expressions?: Record<string, string>;
    angles?: Record<string, string>;
  }
  
  interface VoiceProfile {
    provider: 'elevenlabs' | 'coqui' | 'custom';
    voiceId?: string;
    isCloned: boolean;
    characteristics: {
      gender: string;
      age: string;
      pitch: number;
      speed: number;
      stability: number;
      clarity: number;
    };
    emotionProfiles?: Record<string, any>;
  }
  
  interface MemoryConfig {
    enabled: boolean;
    maxMemories: number;
    decayEnabled: boolean;
    consolidationEnabled: boolean;
  }
  
  interface PersonaGenome {
    version: string;
    visual?: any;
    voice?: any;
    motion?: any;
    mind?: any;
  }
  */
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONAS TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personas = pgTable(
    'personas',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id').notNull(), // .references(() => users.id, { onDelete: 'cascade' }),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Identity
      // ─────────────────────────────────────────────────────────────────────────
      name: varchar('name', { length: 255 }).notNull(),
      slug: varchar('slug', { length: 255 }).notNull(),
      tagline: varchar('tagline', { length: 500 }),
      description: text('description'),
      archetype: varchar('archetype', { length: 50 }),
      backstory: text('backstory'),
      
      // Status
      status: varchar('status', { length: 20 }).default('creating').notNull(),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Personality (JSONB for flexibility)
      // ─────────────────────────────────────────────────────────────────────────
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
      
      // ─────────────────────────────────────────────────────────────────────────
      // Visual
      // ─────────────────────────────────────────────────────────────────────────
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
      
      // ─────────────────────────────────────────────────────────────────────────
      // Voice
      // ─────────────────────────────────────────────────────────────────────────
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
        emotionProfiles?: Record<string, any>;
        presetName?: string;
      }>(),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Motion
      // ─────────────────────────────────────────────────────────────────────────
      motionStylePreset: varchar('motion_style_preset', { length: 50 }),
      cameraAngle: varchar('camera_angle', { length: 50 }),
      idleAnimationUrl: text('idle_animation_url'),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Mind / Brain
      // ─────────────────────────────────────────────────────────────────────────
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
      
      // ─────────────────────────────────────────────────────────────────────────
      // Full Genome (complete blueprint)
      // ─────────────────────────────────────────────────────────────────────────
      genome: jsonb('genome').$type<{
        version: string;
        visual?: any;
        voice?: any;
        motion?: any;
        mind?: any;
        metadata?: any;
      }>(),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Memory Config
      // ─────────────────────────────────────────────────────────────────────────
      memoryEnabled: boolean('memory_enabled').default(true),
      memoryConfig: jsonb('memory_config').$type<{
        maxMemories?: number;
        decayEnabled?: boolean;
        consolidationEnabled?: boolean;
      }>(),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Current State (mutable)
      // ─────────────────────────────────────────────────────────────────────────
      currentMood: varchar('current_mood', { length: 50 }).default('neutral'),
      energyLevel: real('energy_level').default(0.5),
      relationshipLevel: real('relationship_level').default(0),
      lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Settings
      // ─────────────────────────────────────────────────────────────────────────
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
      
      // ─────────────────────────────────────────────────────────────────────────
      // Analytics
      // ─────────────────────────────────────────────────────────────────────────
      totalInteractions: integer('total_interactions').default(0),
      totalChatMessages: integer('total_chat_messages').default(0),
      totalVoiceMinutes: real('total_voice_minutes').default(0),
      totalVideoMinutes: real('total_video_minutes').default(0),
      totalCostUsd: real('total_cost_usd').default(0),
      
      // ─────────────────────────────────────────────────────────────────────────
      // Timestamps
      // ─────────────────────────────────────────────────────────────────────────
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
      activatedAt: timestamp('activated_at', { withTimezone: true }),
      deletedAt: timestamp('deleted_at', { withTimezone: true }),
    },
    (table) => ({
      personas_user_id_idx: index('personas_user_id_idx').on(table.userId),
      personas_slug_idx: index('personas_slug_idx').on(table.slug),
      personas_status_idx: index('personas_status_idx').on(table.status),
      personas_is_public_idx: index('personas_is_public_idx').on(table.isPublic),
      personas_archetype_idx: index('personas_archetype_idx').on(table.archetype),
      personas_user_slug_unique: uniqueIndex('personas_user_slug_unique').on(table.userId, table.slug),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA ASSETS TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personaAssets = pgTable(
    'persona_assets',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
      
      // Asset info
      type: varchar('type', { length: 20 }).notNull(), // 'image', 'video', 'audio', 'thumbnail', 'expression'
      subtype: varchar('subtype', { length: 50 }), // 'primary', 'expression_happy', 'angle_profile', etc.
      
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
      generationConfig: jsonb('generation_config').$type<Record<string, any>>(),
      generationCostUsd: real('generation_cost_usd'),
      
      // Flags
      isPrimary: boolean('is_primary').default(false),
      isGenerated: boolean('is_generated').default(true),
      
      // Timestamps
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      deletedAt: timestamp('deleted_at', { withTimezone: true }),
    },
    (table) => ({
      persona_assets_persona_id_idx: index('persona_assets_persona_id_idx').on(table.personaId),
      persona_assets_type_idx: index('persona_assets_type_idx').on(table.type),
      persona_assets_subtype_idx: index('persona_assets_subtype_idx').on(table.subtype),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA MEMORIES TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personaMemories = pgTable(
    'persona_memories',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
      
      // Memory content
      content: text('content').notNull(),
      summary: text('summary'),
      type: varchar('type', { length: 50 }).notNull(), // 'fact', 'preference', 'event', 'belief', 'opinion'
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
    (table) => ({
      persona_memories_persona_id_idx: index('persona_memories_persona_id_idx').on(table.personaId),
      persona_memories_type_idx: index('persona_memories_type_idx').on(table.type),
      persona_memories_category_idx: index('persona_memories_category_idx').on(table.category),
      persona_memories_importance_idx: index('persona_memories_importance_idx').on(table.importance),
      persona_memories_source_user_idx: index('persona_memories_source_user_idx').on(table.sourceUserId),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA INTERACTIONS TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personaInteractions = pgTable(
    'persona_interactions',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
      userId: uuid('user_id'),
      sessionId: uuid('session_id'),
      
      // Interaction details
      mode: varchar('mode', { length: 20 }).notNull(), // 'chat', 'voice', 'video'
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
      rating: integer('rating'), // 1-5 user rating
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
    (table) => ({
      persona_interactions_persona_id_idx: index('persona_interactions_persona_id_idx').on(table.personaId),
      persona_interactions_user_id_idx: index('persona_interactions_user_id_idx').on(table.userId),
      persona_interactions_session_id_idx: index('persona_interactions_session_id_idx').on(table.sessionId),
      persona_interactions_mode_idx: index('persona_interactions_mode_idx').on(table.mode),
      persona_interactions_created_at_idx: index('persona_interactions_created_at_idx').on(table.createdAt),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA EMBEDS TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
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
    (table) => ({
      persona_embeds_persona_id_idx: index('persona_embeds_persona_id_idx').on(table.personaId),
      persona_embeds_embed_key_idx: index('persona_embeds_embed_key_idx').on(table.embedKey),
      persona_embeds_is_active_idx: index('persona_embeds_is_active_idx').on(table.isActive),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA SESSIONS TABLE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personaSessions = pgTable(
    'persona_sessions',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      personaId: uuid('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
      userId: uuid('user_id'),
      embedId: uuid('embed_id').references(() => personaEmbeds.id),
      
      // Session state
      isActive: boolean('is_active').default(true),
      mode: varchar('mode', { length: 20 }), // 'chat', 'voice', 'video'
      
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
    (table) => ({
      persona_sessions_persona_id_idx: index('persona_sessions_persona_id_idx').on(table.personaId),
      persona_sessions_user_id_idx: index('persona_sessions_user_id_idx').on(table.userId),
      persona_sessions_embed_id_idx: index('persona_sessions_embed_id_idx').on(table.embedId),
      persona_sessions_is_active_idx: index('persona_sessions_is_active_idx').on(table.isActive),
      persona_sessions_created_at_idx: index('persona_sessions_created_at_idx').on(table.createdAt),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // WIZARD SESSIONS TABLE (for creation wizard state)
  // ═══════════════════════════════════════════════════════════════════════════════
  
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
        visualDNA?: any;
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
    (table) => ({
      persona_wizard_sessions_user_id_idx: index('persona_wizard_sessions_user_id_idx').on(table.userId),
      persona_wizard_sessions_persona_id_idx: index('persona_wizard_sessions_persona_id_idx').on(table.personaId),
      persona_wizard_sessions_current_step_idx: index('persona_wizard_sessions_current_step_idx').on(table.currentStep),
    })
  );
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personasRelations = relations(personas, ({ many }) => ({
    assets: many(personaAssets),
    memories: many(personaMemories),
    interactions: many(personaInteractions),
    embeds: many(personaEmbeds),
    sessions: many(personaSessions),
    wizardSessions: many(personaWizardSessions),
  }));
  
  export const personaAssetsRelations = relations(personaAssets, ({ one }) => ({
    persona: one(personas, {
      fields: [personaAssets.personaId],
      references: [personas.id],
    }),
  }));
  
  export const personaMemoriesRelations = relations(personaMemories, ({ one }) => ({
    persona: one(personas, {
      fields: [personaMemories.personaId],
      references: [personas.id],
    }),
  }));
  
  export const personaInteractionsRelations = relations(personaInteractions, ({ one }) => ({
    persona: one(personas, {
      fields: [personaInteractions.personaId],
      references: [personas.id],
    }),
  }));
  
  export const personaEmbedsRelations = relations(personaEmbeds, ({ one, many }) => ({
    persona: one(personas, {
      fields: [personaEmbeds.personaId],
      references: [personas.id],
    }),
    sessions: many(personaSessions),
  }));
  
  export const personaSessionsRelations = relations(personaSessions, ({ one }) => ({
    persona: one(personas, {
      fields: [personaSessions.personaId],
      references: [personas.id],
    }),
    embed: one(personaEmbeds, {
      fields: [personaSessions.embedId],
      references: [personaEmbeds.id],
    }),
  }));
  
  export const personaWizardSessionsRelations = relations(personaWizardSessions, ({ one }) => ({
    persona: one(personas, {
      fields: [personaWizardSessions.personaId],
      references: [personas.id],
    }),
  }));
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPORT ALL
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const personaForgeSchema = {
    // Enums
    personaStatusEnum,
    personaVisualStyleEnum,
    personaArchetypeEnum,
    interactionModeEnum,
    memoryTypeEnum,
    assetTypeEnum,
    // Tables
    personas,
    personaAssets,
    personaMemories,
    personaInteractions,
    personaEmbeds,
    personaSessions,
    personaWizardSessions,
    // Relations
    personasRelations,
    personaAssetsRelations,
    personaMemoriesRelations,
    personaInteractionsRelations,
    personaEmbedsRelations,
    personaSessionsRelations,
    personaWizardSessionsRelations,
  };
  