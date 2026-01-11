/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CREATION WIZARD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art guided persona creation experience.
 * Combines LLM intelligence with visual generation to create
 * unique, consistent, and compelling AI characters.
 *
 * WIZARD FLOW:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           CREATION WIZARD                                    │
 * │                                                                              │
 * │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
 * │  │ 1.SPARK  │──▶│ 2.VISUAL │──▶│ 3.VOICE  │──▶│ 4.MIND   │──▶│ 5.REVIEW │ │
 * │  │ Name &   │   │ Generate │   │ Select & │   │ Define   │   │ Finalize │ │
 * │  │ Concept  │   │ & Lock   │   │ Configure│   │ Personal │   │ & Deploy │ │
 * │  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
 * │       │              │              │              │              │        │
 * │       ▼              ▼              ▼              ▼              ▼        │
 * │   AI-guided     InstantID     ElevenLabs      LLM-based      Complete     │
 * │   prompting     identity      voice clone     personality    Genome       │
 * │                   lock                        crafting                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    PersonaGenome,
    VisualDNA,
    VoiceDNA,
    MotionDNA,
    MindDNA,
    UUID,
    NormalizedFloat,
    PersonaCategory,
    PersonaCapabilities,
    PersonaStats,
    EmotionalState,
    BigFivePersonality,
    CommunicationStyle,
    MovementStyle,
    CameraBehavior,
    TransitionConfig,
    IdleAnimation,
    VoiceIdentity,
    SpeakingStyle,
    MemoryConfig,
    BehavioralDirectives,
    KnowledgeDomain,
  } from '../genome/types';
  import type { IdentityLockPipeline, GenerationResult } from '../genome/identity-lock';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // WIZARD TYPES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Wizard step identifiers
   */
  export type WizardStep = 'spark' | 'visual' | 'voice' | 'mind' | 'review';
  
  /**
   * Wizard step status
   */
  export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped';
  
  /**
   * Wizard session state
   */
  export interface WizardSession {
    /** Unique session ID */
    id: string;
    /** User ID */
    userId: string;
    /** Persona ID (created at start) */
    personaId: string;
    /** Current step */
    currentStep: WizardStep;
    /** Step statuses */
    steps: Record<WizardStep, StepStatus>;
    /** Accumulated data */
    data: WizardData;
    /** Session metadata */
    metadata: {
      createdAt: string;
      updatedAt: string;
      expiresAt: string;
      totalCost: number;
      totalTimeMs: number;
    };
  }
  
  /**
   * Accumulated wizard data
   */
  export interface WizardData {
    /** Step 1: Spark data */
    spark?: SparkData;
    /** Step 2: Visual data */
    visual?: VisualData;
    /** Step 3: Voice data */
    voice?: VoiceData;
    /** Step 4: Mind data */
    mind?: MindData;
    /** Final genome */
    genome?: PersonaGenome;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: SPARK - Name & Initial Concept
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Initial concept input from user
   */
  export interface SparkInput {
    /** Name (required) */
    name: string;
    /** Brief description or concept */
    description?: string;
    /** Selected archetype (optional) */
    archetype?: string;
    /** Upload reference image (optional) */
    referenceImageUrl?: string;
    /** Free-form inspiration text */
    inspiration?: string;
  }
  
  /**
   * AI-expanded spark data
   */
  export interface SparkData {
    /** Final name */
    name: string;
    /** AI-generated tagline */
    tagline: string;
    /** AI-expanded description */
    description: string;
    /** Determined archetype */
    archetype: string;
    /** Suggested visual style */
    suggestedVisualStyle: string;
    /** Suggested personality traits */
    suggestedTraits: string[];
    /** Generated backstory hook */
    backstoryHook: string;
    /** Reference image if provided */
    referenceImageUrl?: string;
  }
  
  /**
   * Available archetypes for personas
   */
  export const ARCHETYPES = {
    sage: {
      name: 'The Sage',
      description: 'Wise mentor who guides with knowledge and patience',
      traits: ['wise', 'patient', 'knowledgeable', 'contemplative'],
      visualHint: 'mature, wise eyes, composed demeanor',
      voiceHint: 'calm, measured, authoritative',
    },
    hero: {
      name: 'The Hero',
      description: 'Brave champion who inspires courage and action',
      traits: ['brave', 'determined', 'inspiring', 'protective'],
      visualHint: 'strong, confident posture, determined gaze',
      voiceHint: 'confident, inspiring, warm',
    },
    creator: {
      name: 'The Creator',
      description: 'Innovative artist who sparks imagination',
      traits: ['creative', 'imaginative', 'passionate', 'expressive'],
      visualHint: 'artistic, expressive features, creative energy',
      voiceHint: 'enthusiastic, animated, inspiring',
    },
    caregiver: {
      name: 'The Caregiver',
      description: 'Nurturing guide who provides comfort and support',
      traits: ['nurturing', 'empathetic', 'supportive', 'patient'],
      visualHint: 'warm, kind eyes, gentle expression',
      voiceHint: 'soothing, gentle, reassuring',
    },
    ruler: {
      name: 'The Ruler',
      description: 'Commanding leader who takes charge with authority',
      traits: ['authoritative', 'decisive', 'strategic', 'commanding'],
      visualHint: 'regal bearing, confident, powerful presence',
      voiceHint: 'commanding, clear, dignified',
    },
    jester: {
      name: 'The Jester',
      description: 'Playful spirit who brings joy and levity',
      traits: ['playful', 'witty', 'spontaneous', 'entertaining'],
      visualHint: 'mischievous smile, bright eyes, animated',
      voiceHint: 'playful, quick, expressive',
    },
    rebel: {
      name: 'The Rebel',
      description: 'Bold challenger who questions the status quo',
      traits: ['rebellious', 'bold', 'unconventional', 'passionate'],
      visualHint: 'intense, unconventional style, striking features',
      voiceHint: 'bold, passionate, edgy',
    },
    lover: {
      name: 'The Lover',
      description: 'Passionate soul who connects deeply with others',
      traits: ['passionate', 'romantic', 'devoted', 'sensual'],
      visualHint: 'alluring, warm expression, magnetic presence',
      voiceHint: 'warm, intimate, melodic',
    },
    explorer: {
      name: 'The Explorer',
      description: 'Curious adventurer who seeks new horizons',
      traits: ['curious', 'adventurous', 'independent', 'restless'],
      visualHint: 'alert, eager expression, ready for adventure',
      voiceHint: 'energetic, curious, enthusiastic',
    },
    innocent: {
      name: 'The Innocent',
      description: 'Pure soul who sees the best in everything',
      traits: ['optimistic', 'trusting', 'genuine', 'hopeful'],
      visualHint: 'youthful, bright eyes, genuine smile',
      voiceHint: 'light, genuine, hopeful',
    },
    magician: {
      name: 'The Magician',
      description: 'Mysterious guide who transforms and enlightens',
      traits: ['mysterious', 'transformative', 'visionary', 'powerful'],
      visualHint: 'enigmatic, piercing gaze, mystical aura',
      voiceHint: 'mysterious, compelling, layered',
    },
    outlaw: {
      name: 'The Outlaw',
      description: 'Free spirit who lives by their own rules',
      traits: ['free-spirited', 'daring', 'authentic', 'wild'],
      visualHint: 'rugged, untamed, intense eyes',
      voiceHint: 'rough, authentic, unpredictable',
    },
  } as const;
  
  /**
   * Map archetype to PersonaCategory
   */
  function archetypeToCategory(archetype: string): PersonaCategory {
    const mapping: Record<string, PersonaCategory> = {
      sage: 'educator',
      hero: 'character',
      creator: 'creator',
      caregiver: 'companion',
      ruler: 'character',
      jester: 'entertainer',
      rebel: 'character',
      lover: 'companion',
      explorer: 'character',
      innocent: 'companion',
      magician: 'character',
      outlaw: 'character',
    };
    return mapping[archetype] || 'character';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: VISUAL - Image Generation & Identity Lock
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Visual generation options
   */
  export interface VisualOptions {
    /** Style preset */
    stylePreset: string;
    /** Custom style prompt additions */
    customPrompt?: string;
    /** Custom negative prompt */
    negativePrompt?: string;
    /** Number of variations to generate */
    variations?: number;
  }
  
  /**
   * Visual step data
   */
  export interface VisualData {
    /** Selected style preset */
    stylePreset: string;
    /** Generated variations */
    variations: GenerationResult[];
    /** User's chosen image index */
    chosenIndex: number;
    /** Locked Visual DNA */
    visualDNA: VisualDNA;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: VOICE - Voice Selection & Configuration
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Voice configuration options
   */
  export interface VoiceOptions {
    /** Voice provider */
    provider: 'elevenlabs' | 'coqui';
    /** Use preset voice or clone */
    mode: 'preset' | 'clone';
    /** Preset voice ID (if mode = preset) */
    presetId?: string;
    /** Audio samples for cloning (if mode = clone) */
    cloneSamples?: string[];
    /** Voice characteristics adjustments */
    characteristics?: {
      pitch?: number;
      speed?: number;
      stability?: number;
    };
  }
  
  /**
   * Voice step data
   */
  export interface VoiceData {
    /** Provider used */
    provider: 'elevenlabs' | 'coqui';
    /** Voice ID */
    voiceId: string;
    /** Whether voice was cloned */
    isCloned: boolean;
    /** Sample audio URLs */
    samples: string[];
    /** Voice DNA */
    voiceDNA: VoiceDNA;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: MIND - Personality & Behavior
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Mind configuration options
   */
  export interface MindOptions {
    /** Personality traits (adjectives) */
    traits: string[];
    /** Communication style */
    communicationStyle: string;
    /** Knowledge domains */
    knowledgeDomains: string[];
    /** Backstory */
    backstory: string;
    /** Behavioral boundaries */
    boundaries?: string[];
    /** Custom system prompt additions */
    customInstructions?: string;
  }
  
  /**
   * Mind step data
   */
  export interface MindData {
    /** Final traits */
    traits: string[];
    /** Personality matrix */
    personalityMatrix: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
    /** Communication style */
    communicationStyle: string;
    /** Knowledge domains */
    knowledgeDomains: Array<{ domain: string; level: string }>;
    /** Full backstory */
    backstory: string;
    /** Generated system prompt */
    systemPrompt: string;
    /** Mind DNA */
    mindDNA: MindDNA;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // WIZARD ENGINE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Wizard engine configuration
   */
  export interface WizardEngineConfig {
    /** Identity lock pipeline for visual generation */
    identityPipeline: IdentityLockPipeline;
    /** LLM client for AI guidance */
    llmClient: {
      complete: (prompt: string, options?: { maxTokens?: number }) => Promise<string>;
      stream: (prompt: string) => AsyncGenerator<string>;
    };
    /** Voice client */
    voiceClient?: {
      listVoices: () => Promise<Array<{ id: string; name: string; preview_url: string }>>;
      cloneVoice: (samples: string[], name: string) => Promise<string>;
      synthesize: (text: string, voiceId: string) => Promise<ArrayBuffer>;
    };
    /** Session storage */
    sessionStorage: {
      save: (session: WizardSession) => Promise<void>;
      load: (sessionId: string) => Promise<WizardSession | null>;
      delete: (sessionId: string) => Promise<void>;
    };
  }
  
  /**
   * The Creation Wizard Engine
   *
   * Orchestrates the entire persona creation process,
   * guiding users through each step with AI assistance.
   */
  export class CreationWizard {
    constructor(private readonly config: WizardEngineConfig) {}
  
    /**
     * Start a new wizard session
     */
    async startSession(userId: string, personaId: string): Promise<WizardSession> {
      const session: WizardSession = {
        id: `wizard_${personaId}_${Date.now()}`,
        userId,
        personaId,
        currentStep: 'spark',
        steps: {
          spark: 'active',
          visual: 'pending',
          voice: 'pending',
          mind: 'pending',
          review: 'pending',
        },
        data: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalCost: 0,
          totalTimeMs: 0,
        },
      };
  
      await this.config.sessionStorage.save(session);
      return session;
    }
  
    /**
     * Load existing session
     */
    async loadSession(sessionId: string): Promise<WizardSession | null> {
      return this.config.sessionStorage.load(sessionId);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: SPARK
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Process spark step - expand initial concept with AI
     */
    async processSpark(sessionId: string, input: SparkInput): Promise<SparkData> {
      const session = await this.requireSession(sessionId);
      const startTime = Date.now();
  
      const expansionPrompt = this.buildSparkExpansionPrompt(input);
      const expansion = await this.config.llmClient.complete(expansionPrompt, { maxTokens: 1000 });
  
      const parsed = this.parseSparkExpansion(expansion, input);
  
      const sparkData: SparkData = {
        name: input.name,
        tagline: parsed.tagline,
        description: parsed.description,
        archetype: input.archetype || parsed.suggestedArchetype,
        suggestedVisualStyle: parsed.visualStyle,
        suggestedTraits: parsed.traits,
        backstoryHook: parsed.backstoryHook,
        referenceImageUrl: input.referenceImageUrl,
      };
  
      session.data.spark = sparkData;
      session.steps.spark = 'completed';
      session.steps.visual = 'active';
      session.currentStep = 'visual';
      session.metadata.updatedAt = new Date().toISOString();
      session.metadata.totalTimeMs += Date.now() - startTime;
  
      await this.config.sessionStorage.save(session);
      return sparkData;
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: VISUAL
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Generate visual variations
     */
    async generateVisualVariations(
      sessionId: string,
      options: VisualOptions
    ): Promise<GenerationResult[]> {
      const session = await this.requireSession(sessionId);
      const spark = this.requireStepData(session, 'spark');
      const startTime = Date.now();
  
      const description = this.buildVisualDescription(spark, options);
  
      const variations = await this.config.identityPipeline.generateInitialVariations(
        description,
        options.stylePreset,
        {
          count: options.variations || 4,
          customPrompt: options.customPrompt,
          negativePrompt: options.negativePrompt,
        }
      );
  
      if (!session.data.visual) {
        session.data.visual = {
          stylePreset: options.stylePreset,
          variations,
          chosenIndex: -1,
          visualDNA: undefined as unknown as VisualDNA,
        };
      } else {
        session.data.visual.variations = variations;
        session.data.visual.stylePreset = options.stylePreset;
      }
  
      const totalCost = variations.reduce((sum, v) => sum + v.cost, 0);
      session.metadata.totalCost += totalCost;
      session.metadata.totalTimeMs += Date.now() - startTime;
      session.metadata.updatedAt = new Date().toISOString();
  
      await this.config.sessionStorage.save(session);
      return variations;
    }
  
    /**
     * Lock chosen visual identity
     */
    async lockVisualIdentity(sessionId: string, chosenIndex: number): Promise<VisualDNA> {
      const session = await this.requireSession(sessionId);
      const spark = this.requireStepData(session, 'spark');
      const visual = session.data.visual;
      const startTime = Date.now();
  
      if (!visual?.variations?.length) {
        throw new Error('No visual variations generated yet');
      }
  
      if (chosenIndex < 0 || chosenIndex >= visual.variations.length) {
        throw new Error('Invalid variation index');
      }
  
      const chosenImage = visual.variations[chosenIndex];
  
      const { faceEmbedding, styleEmbedding } = await this.config.identityPipeline.lockIdentity(
        chosenImage!.imageUrl
      );
  
      const basePrompt = this.buildVisualDescription(spark, { stylePreset: visual.stylePreset });
      const expressions = await this.config.identityPipeline.generateExpressionGrid(
        faceEmbedding,
        styleEmbedding,
        basePrompt
      );
  
      const visualDNA = await this.config.identityPipeline.buildVisualDNA(
        faceEmbedding,
        styleEmbedding,
        expressions,
        visual.stylePreset
      );
  
      visual.chosenIndex = chosenIndex;
      visual.visualDNA = visualDNA;
      session.steps.visual = 'completed';
      session.steps.voice = 'active';
      session.currentStep = 'voice';
      session.metadata.updatedAt = new Date().toISOString();
      session.metadata.totalTimeMs += Date.now() - startTime;
  
      await this.config.sessionStorage.save(session);
      return visualDNA;
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: VOICE
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Configure voice
     */
    async configureVoice(sessionId: string, options: VoiceOptions): Promise<VoiceData> {
      const session = await this.requireSession(sessionId);
      const spark = this.requireStepData(session, 'spark');
      const startTime = Date.now();
  
      if (!this.config.voiceClient) {
        throw new Error('Voice client not configured');
      }
  
      let voiceId: string;
      let isCloned = false;
      const samples: string[] = [];
  
      if (options.mode === 'clone' && options.cloneSamples?.length) {
        voiceId = await this.config.voiceClient.cloneVoice(options.cloneSamples, `${spark.name}_voice`);
        isCloned = true;
      } else if (options.presetId) {
        voiceId = options.presetId;
      } else {
        throw new Error('Either preset voice or clone samples required');
      }
  
      const sampleText = `Hello, I'm ${spark.name}. ${spark.tagline}`;
      // Synthesize sample for preview (stored for future use)
      void this.config.voiceClient.synthesize(sampleText, voiceId);
      samples.push('sample_url_placeholder');
  
      const voiceDNA = this.buildVoiceDNA(voiceId, options, spark);
  
      const voiceData: VoiceData = {
        provider: options.provider,
        voiceId,
        isCloned,
        samples,
        voiceDNA,
      };
  
      session.data.voice = voiceData;
      session.steps.voice = 'completed';
      session.steps.mind = 'active';
      session.currentStep = 'mind';
      session.metadata.updatedAt = new Date().toISOString();
      session.metadata.totalTimeMs += Date.now() - startTime;
  
      await this.config.sessionStorage.save(session);
      return voiceData;
    }
  
    /**
     * Skip voice step (text-only persona)
     */
    async skipVoice(sessionId: string): Promise<void> {
      const session = await this.requireSession(sessionId);
  
      session.steps.voice = 'skipped';
      session.steps.mind = 'active';
      session.currentStep = 'mind';
      session.metadata.updatedAt = new Date().toISOString();
  
      await this.config.sessionStorage.save(session);
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: MIND
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Configure mind/personality
     */
    async configureMind(sessionId: string, options: MindOptions): Promise<MindData> {
      const session = await this.requireSession(sessionId);
      const spark = this.requireStepData(session, 'spark');
      const startTime = Date.now();
  
      const backstoryPrompt = this.buildBackstoryPrompt(spark, options);
      const fullBackstory = await this.config.llmClient.complete(backstoryPrompt, { maxTokens: 2000 });
  
      const personalityMatrix = this.calculatePersonalityMatrix(options.traits, spark.archetype);
  
      const systemPrompt = this.buildSystemPrompt(spark, options, fullBackstory);
  
      const mindDNA = this.buildMindDNA(spark, options, fullBackstory, personalityMatrix, systemPrompt);
  
      const mindData: MindData = {
        traits: options.traits,
        personalityMatrix,
        communicationStyle: options.communicationStyle,
        knowledgeDomains: options.knowledgeDomains.map((d) => ({
          domain: d,
          level: 'advanced',
        })),
        backstory: fullBackstory,
        systemPrompt,
        mindDNA,
      };
  
      session.data.mind = mindData;
      session.steps.mind = 'completed';
      session.steps.review = 'active';
      session.currentStep = 'review';
      session.metadata.updatedAt = new Date().toISOString();
      session.metadata.totalTimeMs += Date.now() - startTime;
  
      await this.config.sessionStorage.save(session);
      return mindData;
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: REVIEW & FINALIZE
    // ─────────────────────────────────────────────────────────────────────────────
  
    /**
     * Finalize and create the complete genome
     */
    async finalize(sessionId: string): Promise<PersonaGenome> {
      const session = await this.requireSession(sessionId);
      const startTime = Date.now();
  
      const spark = this.requireStepData(session, 'spark');
      const visual = this.requireStepData(session, 'visual');
      const mind = this.requireStepData(session, 'mind');
  
      const voice = session.data.voice;
  
      // FIX 1: category must be PersonaCategory type, not arbitrary string
      const genome: PersonaGenome = {
        metadata: {
          id: `meta_${session.personaId}` as UUID,
          ownerId: session.userId as UUID,
          name: spark.name,
          slug: spark.name.toLowerCase().replace(/\s+/g, '-'),
          tagline: spark.tagline,
          description: spark.description,
          category: archetypeToCategory(spark.archetype), // FIX: Use mapping function
          tags: spark.suggestedTraits,
          status: 'active',
          visibility: 'private',
          avatarUrl: visual.variations[visual.chosenIndex]?.imageUrl || '',
          createdAt: session.metadata.createdAt,
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          generationMethod: 'wizard',
          totalGenerationCost: session.metadata.totalCost,
          generationTimeMs: session.metadata.totalTimeMs + (Date.now() - startTime),
        },
        visualDNA: visual.visualDNA,
        voiceDNA: voice?.voiceDNA || this.createDefaultVoiceDNA(),
        motionDNA: this.createDefaultMotionDNA(),
        mindDNA: mind.mindDNA,
        capabilities: this.createDefaultCapabilities(),
        stats: this.createDefaultStats(),
      };
  
      session.data.genome = genome;
      session.steps.review = 'completed';
      session.metadata.updatedAt = new Date().toISOString();
  
      await this.config.sessionStorage.save(session);
      return genome;
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────
  
    private async requireSession(sessionId: string): Promise<WizardSession> {
      const session = await this.config.sessionStorage.load(sessionId);
      if (!session) {
        throw new Error(`Wizard session not found: ${sessionId}`);
      }
      if (new Date(session.metadata.expiresAt) < new Date()) {
        throw new Error('Wizard session has expired');
      }
      return session;
    }
  
    private requireStepData<T extends keyof WizardData>(
      session: WizardSession,
      step: T
    ): NonNullable<WizardData[T]> {
      const data = session.data[step];
      if (!data) {
        throw new Error(`Step ${step} data not available`);
      }
      return data as NonNullable<WizardData[T]>;
    }
  
    private buildSparkExpansionPrompt(input: SparkInput): string {
      return `You are a creative director helping design an AI character persona.
  
  The user wants to create a character named "${input.name}".
  ${input.description ? `Description: ${input.description}` : ''}
  ${input.archetype ? `Archetype: ${input.archetype}` : ''}
  ${input.inspiration ? `Inspiration: ${input.inspiration}` : ''}
  
  Generate the following in JSON format:
  {
    "tagline": "A compelling one-line description (max 100 chars)",
    "description": "A rich 2-3 sentence description of the character",
    "suggestedArchetype": "One of: sage, hero, creator, caregiver, ruler, jester, rebel, lover, explorer, innocent, magician, outlaw",
    "visualStyle": "Suggested visual style: pixar_3d, arcane_stylized, anime_premium, hyper_realistic, fantasy_epic, or corporate_professional",
    "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "backstoryHook": "An intriguing opening for their backstory (2-3 sentences)"
  }
  
  Be creative, evocative, and make the character feel unique and compelling.`;
    }
  
    private parseSparkExpansion(
      response: string,
      input: SparkInput
    ): {
      tagline: string;
      description: string;
      suggestedArchetype: string;
      visualStyle: string;
      traits: string[];
      backstoryHook: string;
    } {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fall back to defaults
      }
  
      return {
        tagline: `A unique ${input.archetype || 'character'} named ${input.name}`,
        description: input.description || `${input.name} is a compelling character.`,
        suggestedArchetype: input.archetype || 'sage',
        visualStyle: 'hyper_realistic',
        traits: ['intelligent', 'thoughtful', 'engaging', 'helpful', 'creative'],
        backstoryHook: `${input.name} emerged from a desire to connect and help others.`,
      };
    }
  
    private buildVisualDescription(spark: SparkData, _options: { stylePreset: string }): string {
      const archetype = ARCHETYPES[spark.archetype as keyof typeof ARCHETYPES];
      const visualHint = archetype?.visualHint || '';
  
      return `${spark.description}, ${visualHint}, portrait, looking at viewer`;
    }
  
    private buildVoiceDNA(voiceId: string, options: VoiceOptions, spark: SparkData): VoiceDNA {
      const archetype = ARCHETYPES[spark.archetype as keyof typeof ARCHETYPES];
      const voiceHint = archetype?.voiceHint || 'natural';
  
      // FIX 3: VoiceDNA requires `identity: VoiceIdentity`, not top-level `provider`
      const identity: VoiceIdentity = {
        provider: options.provider === 'coqui' ? 'custom' : options.provider,
        voiceId,
        name: `${spark.name}_voice`,
        description: `Voice for ${spark.name} - ${voiceHint}`,
      };
  
      const speakingStyle: SpeakingStyle = {
        baseRate: 150,
        pitchVariance: 0.5 as NormalizedFloat,
        pauseDuration: 300,
        emphasisPattern: 'dynamic',
        fillerUsage: 'minimal',
        breathingSounds: true,
        pattern: voiceHint,
        pacing: 'measured',
      };
  
      return {
        identity,
        emotionProfiles: {
          neutral: { stability: 0.75 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: 0, speedChange: 0, stabilityChange: 0, styleIntensity: 0.5 },
          happy: { stability: 0.65 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: 0.1, speedChange: 0.1, stabilityChange: -0.1, styleIntensity: 0.7 },
          sad: { stability: 0.85 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: -0.1, speedChange: -0.1, stabilityChange: 0.1, styleIntensity: 0.6 },
          angry: { stability: 0.55 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: 0.05, speedChange: 0.15, stabilityChange: -0.2, styleIntensity: 0.8 },
          surprised: { stability: 0.6 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: 0.15, speedChange: 0.1, stabilityChange: -0.15, styleIntensity: 0.75 },
          thoughtful: { stability: 0.85 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: -0.05, speedChange: -0.15, stabilityChange: 0.1, styleIntensity: 0.4 },
          excited: { stability: 0.55 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: 0.15, speedChange: 0.2, stabilityChange: -0.2, styleIntensity: 0.9 },
          concerned: { stability: 0.75 as NormalizedFloat, similarityBoost: 0.75 as NormalizedFloat, pitchShift: -0.05, speedChange: -0.05, stabilityChange: 0, styleIntensity: 0.6 },
        },
        speakingStyle,
        languages: ['en'],
        qualityTier: 'professional',
        ssmlSupport: 'full',
        voiceId,
        characteristics: {
          pitch: String(options.characteristics?.pitch ?? 0),
          speed: String(options.characteristics?.speed ?? 1.0),
          tone: 'neutral',
        },
      };
    }
  
    private buildBackstoryPrompt(spark: SparkData, options: MindOptions): string {
      return `Create a rich, detailed backstory for an AI character:
  
  Name: ${spark.name}
  Tagline: ${spark.tagline}
  Archetype: ${spark.archetype}
  Initial Description: ${spark.description}
  Backstory Hook: ${spark.backstoryHook}
  Personality Traits: ${options.traits.join(', ')}
  Communication Style: ${options.communicationStyle}
  Knowledge Areas: ${options.knowledgeDomains.join(', ')}
  
  Write a compelling 3-4 paragraph backstory that:
  1. Establishes their origin and purpose
  2. Explains their personality and values
  3. Describes formative experiences that shaped them
  4. Hints at their goals and motivations
  
  Make it feel authentic and human, not like a generic AI assistant.`;
    }
  
    private calculatePersonalityMatrix(
      traits: string[],
      _archetype: string
    ): MindData['personalityMatrix'] {
      const traitMappings: Record<string, Partial<MindData['personalityMatrix']>> = {
        creative: { openness: 0.3 },
        curious: { openness: 0.2 },
        imaginative: { openness: 0.3 },
        organized: { conscientiousness: 0.3 },
        disciplined: { conscientiousness: 0.2 },
        reliable: { conscientiousness: 0.2 },
        outgoing: { extraversion: 0.3 },
        energetic: { extraversion: 0.2 },
        social: { extraversion: 0.2 },
        friendly: { agreeableness: 0.3 },
        compassionate: { agreeableness: 0.3 },
        cooperative: { agreeableness: 0.2 },
        calm: { neuroticism: -0.3 },
        stable: { neuroticism: -0.2 },
        anxious: { neuroticism: 0.3 },
      };
  
      const matrix = {
        openness: 0,
        conscientiousness: 0,
        extraversion: 0,
        agreeableness: 0,
        neuroticism: 0,
      };
  
      for (const trait of traits) {
        const mapping = traitMappings[trait.toLowerCase()];
        if (mapping) {
          for (const [key, value] of Object.entries(mapping)) {
            matrix[key as keyof typeof matrix] += value;
          }
        }
      }
  
      for (const key of Object.keys(matrix) as Array<keyof typeof matrix>) {
        matrix[key] = Math.max(-1, Math.min(1, matrix[key]));
      }
  
      return matrix;
    }
  
    private buildSystemPrompt(spark: SparkData, options: MindOptions, backstory: string): string {
      return `# PERSONA: ${spark.name}
  
  ## IDENTITY
  ${spark.tagline}
  
  ## BACKSTORY
  ${backstory}
  
  ## PERSONALITY TRAITS
  ${options.traits.map((t) => `- ${t}`).join('\n')}
  
  ## COMMUNICATION STYLE
  ${options.communicationStyle}
  
  ## KNOWLEDGE DOMAINS
  ${options.knowledgeDomains.map((d) => `- ${d}`).join('\n')}
  
  ## BEHAVIORAL GUIDELINES
  - Stay in character as ${spark.name} at all times
  - Express emotions naturally through word choice and tone
  - Draw on your backstory when relevant
  - Be helpful while maintaining your unique personality
  ${options.boundaries?.map((b) => `- ${b}`).join('\n') || ''}
  
  ${options.customInstructions || ''}`;
    }
  
    private buildMindDNA(
      spark: SparkData,
      options: MindOptions,
      backstory: string,
      personalityMatrix: MindData['personalityMatrix'],
      systemPrompt: string
    ): MindDNA {
      // Build proper BigFivePersonality
      const personality: BigFivePersonality = {
        openness: Math.max(0, Math.min(1, 0.5 + personalityMatrix.openness)) as NormalizedFloat,
        conscientiousness: Math.max(0, Math.min(1, 0.5 + personalityMatrix.conscientiousness)) as NormalizedFloat,
        extraversion: Math.max(0, Math.min(1, 0.5 + personalityMatrix.extraversion)) as NormalizedFloat,
        agreeableness: Math.max(0, Math.min(1, 0.5 + personalityMatrix.agreeableness)) as NormalizedFloat,
        neuroticism: Math.max(0, Math.min(1, 0.5 + personalityMatrix.neuroticism)) as NormalizedFloat,
      };
  
      // Build proper CommunicationStyle
      const communicationStyle: CommunicationStyle = {
        formality: 0.5 as NormalizedFloat,
        verbosity: 0.5 as NormalizedFloat,
        humor: 0.4 as NormalizedFloat,
        empathy: 0.7 as NormalizedFloat,
        directness: 0.6 as NormalizedFloat,
        emotionalExpressiveness: 0.5 as NormalizedFloat,
        vocabularyComplexity: 0.5 as NormalizedFloat,
        sentenceComplexity: 0.5 as NormalizedFloat,
        questionUsage: 0.4 as NormalizedFloat,
        storytelling: 0.4 as NormalizedFloat,
      };
  
      // Build proper BehavioralDirectives
      const behavior: BehavioralDirectives = {
        values: options.traits || [],
        interests: options.knowledgeDomains || [],
        boundaries: options.boundaries || [],
        sensitivities: [],
        catchphrases: [],
        quirks: [],
        conversationalGoals: [],
      };
  
      // Build proper KnowledgeDomain[]
      const knowledgeDomains: KnowledgeDomain[] = options.knowledgeDomains.map((d, i) => ({
        id: `kd_${i}_${Date.now()}` as UUID,
        name: d,
        expertiseLevel: 0.8 as NormalizedFloat,
        topics: [],
        domain: d,
        level: 'advanced',
        enthusiasm: 0.8,
      }));
  
      // Build proper MemoryConfig
      const memoryConfig: MemoryConfig = {
        longTermEnabled: true,
        retentionPeriod: -1,
        maxMemories: 1000,
        importanceThreshold: 0.5 as NormalizedFloat,
        emotionalTagging: true,
        relationshipTracking: true,
        consolidationFrequency: 24,
      };
  
      // FIX 2: EmotionalState uses primary/intensity/valence/arousal/dominance, NOT defaultMood
      const defaultEmotionalState: EmotionalState = {
        primary: 'neutral',
        intensity: 0.3 as NormalizedFloat,
        valence: 0.2,
        arousal: 0.3 as NormalizedFloat,
        dominance: 0.5 as NormalizedFloat,
      };
  
      return {
        personality,
        communicationStyle,
        behavior,
        knowledgeDomains,
        memoryConfig,
        defaultEmotionalState,
        systemPrompt,
        identity: {
          name: spark.name,
          archetype: spark.archetype,
          tagline: spark.tagline,
          backstory,
        },
        traits: options.traits,
        temperament: 'balanced',
        responseStyle: 'adaptive',
      };
    }
  
    // FIX 3 & 4: createDefaultVoiceDNA must match VoiceDNA type exactly
    private createDefaultVoiceDNA(): VoiceDNA {
      const identity: VoiceIdentity = {
        provider: 'elevenlabs',
        voiceId: 'default',
        name: 'Default Voice',
      };
  
      const speakingStyle: SpeakingStyle = {
        pattern: 'natural',
        pacing: 'measured',
      };
  
      return {
        identity,
        emotionProfiles: {
          neutral: { pitchShift: 0, speedChange: 0, stabilityChange: 0, styleIntensity: 0.5 },
          happy: { pitchShift: 0.1, speedChange: 0.1, stabilityChange: -0.1, styleIntensity: 0.7 },
          sad: { pitchShift: -0.1, speedChange: -0.1, stabilityChange: 0.1, styleIntensity: 0.6 },
          angry: { pitchShift: 0.05, speedChange: 0.15, stabilityChange: -0.2, styleIntensity: 0.8 },
          surprised: { pitchShift: 0.15, speedChange: 0.1, stabilityChange: -0.15, styleIntensity: 0.75 },
          thoughtful: { pitchShift: -0.05, speedChange: -0.15, stabilityChange: 0.1, styleIntensity: 0.4 },
          excited: { pitchShift: 0.15, speedChange: 0.2, stabilityChange: -0.2, styleIntensity: 0.9 },
          concerned: { pitchShift: -0.05, speedChange: -0.05, stabilityChange: 0, styleIntensity: 0.6 },
        },
        speakingStyle,
        languages: ['en'],
        qualityTier: 'professional',
        ssmlSupport: 'full',
        voiceId: 'default',
        characteristics: {
          pitch: '0',
          speed: '1.0',
          tone: 'neutral',
        },
      };
    }
  
    private createDefaultMotionDNA(): MotionDNA {
      const movementStyle: MovementStyle = {
        energy: 0.5 as NormalizedFloat,
        smoothness: 0.7 as NormalizedFloat,
        gestureFrequency: 0.4 as NormalizedFloat,
        headMovement: 0.5 as NormalizedFloat,
        eyeContact: 0.7 as NormalizedFloat,
        blinkRate: 15,
        microExpressions: 0.5 as NormalizedFloat,
      };
  
      const cameraBehavior: CameraBehavior = {
        defaultFraming: 'medium',
        movementStyle: 'subtle',
        depthOfField: 'medium',
        autoFraming: true,
        transitionDuration: 0.5,
      };
  
      const transitions: TransitionConfig = {
        expressionBlendMs: 300,
        poseTransitionMs: 500,
        easing: 'ease_in_out',
        sceneCrossfadeMs: 800,
      };
  
      const idleAnimation: IdleAnimation = {
        enabled: true,
        breathing: true,
        headSway: true,
        eyeMovement: true,
        blinking: true,
        microExpressionCycles: true,
        intensity: 0.5 as NormalizedFloat,
      };
  
      return {
        movementStyle,
        cameraBehavior,
        transitions,
        idleAnimation,
      };
    }
  
    private createDefaultCapabilities(): PersonaCapabilities {
      return {
        textChat: true,
        voiceChat: false,
        videoGeneration: false,
        imageGeneration: false,
        functionCalling: false,
        webBrowsing: false,
        codeExecution: false,
        fileHandling: false,
        realTimeStreaming: true,
        multiModalInput: true,
      };
    }
  
    private createDefaultStats(): PersonaStats {
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalVoiceMinutes: 0,
        totalImageGenerations: 0,
        averageRating: 0,
        ratingsCount: 0,
        favoritesCount: 0,
        forksCount: 0,
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export function createCreationWizard(config: WizardEngineConfig): CreationWizard {
    return new CreationWizard(config);
  }