/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA GENOME - Complete DNA Type System
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art type definitions for the PersonaForge character system.
 * This is the complete genetic blueprint that defines every aspect of an AI persona.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           PERSONA GENOME                                    │
 * │                                                                             │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
 * │  │ VISUAL DNA  │  │  VOICE DNA  │  │ MOTION DNA  │  │  MIND DNA   │       │
 * │  │             │  │             │  │             │  │             │       │
 * │  │ • Face      │  │ • Voice ID  │  │ • Movement  │  │ • Personality│      │
 * │  │ • Style     │  │ • Emotion   │  │ • Camera    │  │ • Memory    │       │
 * │  │ • Express   │  │ • Speaking  │  │ • Transition│  │ • Behavior  │       │
 * │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
 * │                              │                                             │
 * │                              ▼                                             │
 * │                    ┌─────────────────┐                                     │
 * │                    │  UNIFIED GENOME │                                     │
 * │                    │   Immutable ID  │                                     │
 * │                    └─────────────────┘                                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

/** ISO 8601 timestamp string */
export type ISOTimestamp = string;

/** UUID v4 string */
export type UUID = string;

/** URL string for assets */
export type AssetURL = string;

/** Normalized float [0, 1] */
export type NormalizedFloat = number;

/** Embedding vector (typically 512 or 768 dimensions) */
export type EmbeddingVector = number[];

/** Semantic version string */
export type SemanticVersion = `${number}.${number}.${number}`;

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL DNA - Face & Style Identity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Face embedding extracted via InsightFace
 * This is the CORE identity lock - ensures consistent face across all generations
 */
export interface FaceEmbedding {
  /** 512-dimensional face embedding vector */
  vector: EmbeddingVector;
  /** Model used for extraction */
  model: 'insightface_antelopev2' | 'insightface_buffalo_l' | 'arcface';
  /** Source image URL used for extraction */
  sourceImageUrl: AssetURL;
  /** Detection confidence score [0, 1] */
  confidence: NormalizedFloat;
  /** Extraction timestamp */
  createdAt: ISOTimestamp;
  /** Optional facial landmarks (68 points) */
  landmarks?: number[][];
  /** Estimated age from face analysis */
  estimatedAge?: number;
  /** Detected gender */
  detectedGender?: 'male' | 'female' | 'non_binary';
  /** Face bounding box [x, y, width, height] */
  boundingBox?: [number, number, number, number];
}

/**
 * Style embedding for consistent aesthetic via IP-Adapter
 */
export interface StyleEmbedding {
  /** Style embedding vector (CLIP space) */
  vector: EmbeddingVector;
  /** Positive style prompt */
  stylePrompt?: string;
  /** Negative style prompt (what to avoid) */
  negativePrompt?: string;
  /** Reference images used for style extraction */
  referenceImages?: AssetURL[];
  /** IP-Adapter model version */
  model?: 'ip_adapter_plus' | 'ip_adapter_face' | 'ip_adapter_full';
}

/**
 * Single expression asset
 */
export interface ExpressionAsset {
  /** Full resolution image URL */
  imageUrl: AssetURL;
  /** Thumbnail URL for quick loading */
  thumbnailUrl?: AssetURL;
  /** Seed used for generation (for reproducibility) */
  seed: number;
  /** Generation timestamp */
  generatedAt: ISOTimestamp;
  /** Optional emotion intensity [0, 1] */
  intensity?: NormalizedFloat;
  /** Stability change for emotion */
  stabilityChange?: number;
  /** Style intensity */
  styleIntensity?: number;
  /** Optional blend weights for morphing */
  blendWeights?: Record<string, NormalizedFloat>;
}

/**
 * Complete expression grid - pre-rendered emotions for instant switching
 */
export interface ExpressionGrid {
  // Core emotions (Ekman's 6 + extensions)
  neutral?: ExpressionAsset;
  happy?: ExpressionAsset;
  sad?: ExpressionAsset;
  angry?: ExpressionAsset;
  surprised?: ExpressionAsset;
  fearful?: ExpressionAsset;
  disgusted?: ExpressionAsset;
  
  // Extended emotional range
  thoughtful?: ExpressionAsset;
  excited?: ExpressionAsset;
  concerned?: ExpressionAsset;
  confident?: ExpressionAsset;
  curious?: ExpressionAsset;
  loving?: ExpressionAsset;
  disappointed?: ExpressionAsset;
  amused?: ExpressionAsset;
  skeptical?: ExpressionAsset;
  embarrassed?: ExpressionAsset;
  proud?: ExpressionAsset;
  relieved?: ExpressionAsset;
  anxious?: ExpressionAsset;
  
  // Custom expressions (user-defined)
  custom?: Record<string, ExpressionAsset>;
}

/**
 * Generation configuration for consistent outputs
 */
export interface GenerationConfig {
  /** Base model checkpoint */
  checkpoint: string;
  /** CFG scale for prompt adherence */
  cfgScale: number;
  /** Sampler algorithm */
  sampler: string;
  /** Inference steps */
  steps: number;
  /** InstantID identity strength [0, 1] */
  identityStrength: NormalizedFloat;
  /** IP-Adapter style strength [0, 1] */
  styleStrength: NormalizedFloat;
  /** ControlNet settings (optional) */
  controlNet?: {
    model: string;
    strength: NormalizedFloat;
    guidanceStart: NormalizedFloat;
    guidanceEnd: NormalizedFloat;
  };
  /** LoRA configurations */
  loras?: Array<{
    name: string;
    weight: NormalizedFloat;
  }>;
}

/**
 * Complete Visual DNA - everything needed for consistent visual generation
 */
export interface VisualDNA {
  /** Locked face identity embedding */
  faceEmbedding: FaceEmbedding;
  /** Style embedding for aesthetic consistency */
  styleEmbedding: StyleEmbedding;
  /** Pre-rendered expression grid */
  expressions: ExpressionGrid;
  /** Locked generation configuration */
  generationConfig: GenerationConfig;
  /** Locked prompts for consistency */
  lockedPrompt: {
    positive: string;
    negative: string;
  };
  /** Visual style preset identifier */
  stylePreset?: StylePreset;
  /** Color palette extracted from character */
  colorPalette?: ColorPalette;
  /** Outfit/clothing variants */
  outfitVariants?: OutfitVariant[];
}

/**
 * Style preset options
 */
export type StylePreset =
  | 'pixar_3d'
  | 'arcane_stylized'
  | 'anime_premium'
  | 'hyper_realistic'
  | 'fantasy_epic'
  | 'corporate_professional'
  | 'comic_book'
  | 'watercolor'
  | 'oil_painting'
  | 'cyberpunk'
  | 'steampunk'
  | 'custom';

/**
 * Character color palette
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  skin?: string;
  hair?: string;
  eyes?: string;
}

/**
 * Outfit/clothing variant
 */
export interface OutfitVariant {
  id: UUID;
  name: string;
  description: string;
  imageUrl: AssetURL;
  thumbnailUrl?: AssetURL;
  tags: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE DNA - Audio Identity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Voice identity from ElevenLabs or similar
 */
export interface VoiceIdentity {
  /** Voice provider */
  provider: 'elevenlabs' | 'playht' | 'azure' | 'custom';
  /** Provider-specific voice ID */
  voiceId: string;
  /** Display name */
  name: string;
  /** Voice description */
  description?: string;
  /** Sample audio URL */
  sampleUrl?: AssetURL;
  /** Voice embedding (if available) */
  embedding?: EmbeddingVector;
  /** Clone source (if cloned voice) */
  cloneSource?: {
    type: 'upload' | 'recording' | 'preset';
    sourceUrl?: AssetURL;
    duration?: number;
  };
}

/**
 * Emotion-specific voice profile
 */
export interface EmotionVoiceProfile {
  /** Stability [0, 1] - lower = more expressive */
  stability?: NormalizedFloat;
  /** Similarity boost [0, 1] - higher = more like original */
  similarityBoost?: NormalizedFloat;
  /** Style exaggeration [0, 1] */
  style?: NormalizedFloat;
  /** Speaking rate multiplier */
  speakingRate?: number;
  /** Pitch shift in semitones */
  pitchShift?: number;
  /** Additional provider-specific params */
  /** Speed change multiplier */
  speedChange?: number;
  /** Emotion intensity [0, 1] */
  intensity?: NormalizedFloat;
  /** Stability change for emotion */
  stabilityChange?: number;
  /** Style intensity */
  styleIntensity?: number;
  providerParams?: Record<string, unknown>;
}

/**
 * Speaking style configuration
 */
export interface SpeakingStyle {
  /** Base speaking rate (words per minute) */
  baseRate?: number;
  /** Pitch variance */
  pitchVariance?: NormalizedFloat;
  /** Pause duration between sentences (ms) */
  pauseDuration?: number;
  /** Emphasis patterns */
  emphasisPattern?: 'neutral' | 'dynamic' | 'monotone' | 'expressive';
  /** Filler words usage */
  fillerUsage?: 'none' | 'minimal' | 'natural' | 'frequent';
  /** Breathing sounds */
  breathingSounds?: boolean;
  /** Speaking pattern style */
  pattern?: string;
  /** Pacing style */
  pacing?: string;
}

/**
 * Complete Voice DNA
 */
export interface VoiceDNA {
  /** Core voice identity */
  identity: VoiceIdentity;
  /** Emotion-specific profiles */
  emotionProfiles: Record<string, EmotionVoiceProfile>;
  /** Speaking style configuration */
  speakingStyle: SpeakingStyle;
  /** Supported languages */
  languages: string[];
  /** Voice cloning quality tier */
  qualityTier: 'instant' | 'professional' | 'premium';
  /** SSML support level */
  ssmlSupport: 'none' | 'basic' | 'full';
  /** Direct voice ID for provider */
  voiceId?: string;
  /** Voice characteristics */
  characteristics?: {
    pitch?: string;
    speed?: string;
    tone?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION DNA - Animation & Movement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Movement style configuration
 */
export interface MovementStyle {
  /** Overall energy level [0, 1] */
  energy: NormalizedFloat;
  /** Smoothness of movements [0, 1] */
  smoothness: NormalizedFloat;
  /** Gesture frequency [0, 1] */
  gestureFrequency: NormalizedFloat;
  /** Head movement amount [0, 1] */
  headMovement: NormalizedFloat;
  /** Eye contact tendency [0, 1] */
  eyeContact: NormalizedFloat;
  /** Blink rate (blinks per minute) */
  blinkRate: number;
  /** Micro-expression intensity [0, 1] */
  microExpressions: NormalizedFloat;
}

/**
 * Camera behavior for video generation
 */
export interface CameraBehavior {
  /** Default framing */
  defaultFraming: 'closeup' | 'medium' | 'wide' | 'full_body';
  /** Camera movement style */
  movementStyle: 'static' | 'subtle' | 'dynamic' | 'cinematic';
  /** Depth of field */
  depthOfField: 'shallow' | 'medium' | 'deep';
  /** Auto-framing on emotion changes */
  autoFraming: boolean;
  /** Smooth transitions */
  transitionDuration: number;
}

/**
 * Transition configuration
 */
export interface TransitionConfig {
  /** Expression blend duration (ms) */
  expressionBlendMs: number;
  /** Pose transition duration (ms) */
  poseTransitionMs: number;
  /** Easing function */
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'spring';
  /** Cross-fade for scene changes */
  sceneCrossfadeMs: number;
  /** Emotion transition duration (ms) */
  emotionTransition?: number;
}

/**
 * Idle animation configuration
 */
export interface IdleAnimation {
  /** Enable subtle idle movements */
  enabled: boolean;
  /** Breathing animation */
  breathing: boolean;
  /** Subtle head sway */
  headSway: boolean;
  /** Eye dart/look around */
  eyeMovement: boolean;
  /** Blink animation */
  blinking: boolean;
  /** Micro-expression cycles */
  microExpressionCycles: boolean;
  /** Idle animation intensity [0, 1] */
  intensity: NormalizedFloat;
}

/**
 * Complete Motion DNA
 */
export interface MotionDNA {
  /** Movement style configuration */
  movementStyle: MovementStyle;
  /** Camera behavior settings */
  cameraBehavior: CameraBehavior;
  /** Transition configurations */
  transitions: TransitionConfig;
  /** Idle animation settings */
  idleAnimation: IdleAnimation;
  /** Gesture library (references to animation clips) */
  gestureLibrary?: GestureClip[];
  /** Lipsync configuration */
  lipsyncConfig?: LipsyncConfig;
}

/**
 * Gesture animation clip reference
 */
export interface GestureClip {
  id: UUID;
  name: string;
  category: 'greeting' | 'emphasis' | 'thinking' | 'reaction' | 'custom';
  duration: number;
  thumbnailUrl?: AssetURL;
  clipUrl?: AssetURL;
}

/**
 * Lipsync configuration
 */
export interface LipsyncConfig {
  /** Lipsync provider */
  provider: 'wav2lip' | 'sadtalker' | 'geneface' | 'custom';
  /** Sync precision level */
  precision: 'low' | 'medium' | 'high';
  /** Smoothing factor */
  smoothing: NormalizedFloat;
  /** Exaggeration factor */
  exaggeration: NormalizedFloat;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIND DNA - Personality & Cognition
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Big Five personality traits (OCEAN model)
 * Each trait is normalized [0, 1]
 */
export interface BigFivePersonality {
  /** Openness to experience */
  openness: NormalizedFloat;
  /** Conscientiousness */
  conscientiousness: NormalizedFloat;
  /** Extraversion */
  extraversion: NormalizedFloat;
  /** Agreeableness */
  agreeableness: NormalizedFloat;
  /** Neuroticism (emotional stability inverse) */
  neuroticism: NormalizedFloat;
}

/**
 * Extended personality facets for deeper characterization
 */
export interface PersonalityFacets {
  // Openness facets
  imagination: NormalizedFloat;
  artisticInterest: NormalizedFloat;
  emotionality: NormalizedFloat;
  adventurousness: NormalizedFloat;
  intellect: NormalizedFloat;
  liberalism: NormalizedFloat;
  
  // Conscientiousness facets
  selfEfficacy: NormalizedFloat;
  orderliness: NormalizedFloat;
  dutifulness: NormalizedFloat;
  achievementStriving: NormalizedFloat;
  selfDiscipline: NormalizedFloat;
  cautiousness: NormalizedFloat;
  
  // Extraversion facets
  friendliness: NormalizedFloat;
  gregariousness: NormalizedFloat;
  assertiveness: NormalizedFloat;
  activityLevel: NormalizedFloat;
  excitementSeeking: NormalizedFloat;
  cheerfulness: NormalizedFloat;
  
  // Agreeableness facets
  trust: NormalizedFloat;
  morality: NormalizedFloat;
  altruism: NormalizedFloat;
  cooperation: NormalizedFloat;
  modesty: NormalizedFloat;
  sympathy: NormalizedFloat;
  
  // Neuroticism facets
  anxiety: NormalizedFloat;
  anger: NormalizedFloat;
  depression: NormalizedFloat;
  selfConsciousness: NormalizedFloat;
  immoderation: NormalizedFloat;
  vulnerability: NormalizedFloat;
}

/**
 * Communication style configuration
 */
export interface CommunicationStyle {
  /** Formality level [0, 1] (0 = casual, 1 = formal) */
  formality: NormalizedFloat;
  /** Verbosity [0, 1] (0 = terse, 1 = elaborate) */
  verbosity: NormalizedFloat;
  /** Humor usage [0, 1] */
  humor: NormalizedFloat;
  /** Empathy expression [0, 1] */
  empathy: NormalizedFloat;
  /** Directness [0, 1] (0 = indirect, 1 = blunt) */
  directness: NormalizedFloat;
  /** Emotional expressiveness [0, 1] */
  emotionalExpressiveness: NormalizedFloat;
  /** Vocabulary complexity [0, 1] */
  vocabularyComplexity: NormalizedFloat;
  /** Sentence structure complexity [0, 1] */
  sentenceComplexity: NormalizedFloat;
  /** Use of questions [0, 1] */
  questionUsage: NormalizedFloat;
  /** Storytelling tendency [0, 1] */
  storytelling: NormalizedFloat;
}

/**
 * Behavioral directives
 */
export interface BehavioralDirectives {
  /** Core values and beliefs */
  values: string[];
  /** Topics to be enthusiastic about */
  interests: string[];
  /** Topics to avoid or handle carefully */
  sensitivities: string[];
  /** Conversational boundaries */
  boundaries: string[];
  /** Catchphrases or signature expressions */
  catchphrases: string[];
  /** Behavioral quirks */
  quirks: string[];
  /** Goals in conversation */
  conversationalGoals: string[];
}

/**
 * Knowledge domain configuration
 */
export interface KnowledgeDomain {
  /** Domain identifier */
  id: UUID;
  /** Domain name */
  name: string;
  /** Expertise level [0, 1] */
  expertiseLevel: NormalizedFloat;
  /** Key topics within domain */
  topics: string[];
  /** Domain string alias */
  domain?: string;
  /** Enthusiasm level [0, 1] */
  enthusiasm?: NormalizedFloat;
  /** Expertise level string */
  level?: string;
  /** Custom knowledge base reference */
  knowledgeBaseId?: UUID;
  /** RAG configuration for this domain */
  ragConfig?: {
    vectorStoreId: string;
    retrievalTopK: number;
    similarityThreshold: NormalizedFloat;
  };
}

/**
 * Memory system configuration
 */
export interface MemoryConfig {
  /** Enable long-term memory */
  longTermEnabled: boolean;
  /** Memory retention period (days, -1 for infinite) */
  retentionPeriod: number;
  /** Maximum memories to retain */
  maxMemories: number;
  /** Memory importance threshold [0, 1] */
  importanceThreshold: NormalizedFloat;
  /** Enable emotional memory tagging */
  emotionalTagging: boolean;
  /** Enable relationship tracking */
  relationshipTracking: boolean;
  /** Memory consolidation frequency (hours) */
  consolidationFrequency: number;
}

/**
 * Emotional state model
 */
export interface EmotionalState {
  /** Current primary emotion */
  primary: string;
  /** Secondary emotion (if blended) */
  secondary?: string;
  /** Intensity [0, 1] */
  intensity: NormalizedFloat;
  /** Valence [-1, 1] (negative to positive) */
  valence: number;
  /** Arousal [0, 1] (calm to excited) */
  arousal: NormalizedFloat;
  /** Dominance [0, 1] (submissive to dominant) */
  dominance: NormalizedFloat;
}

/**
 * Complete Mind DNA
 */
export interface MindDNA {
  /** Base personality (Big Five) */
  personality: BigFivePersonality;
  /** Extended personality facets */
  facets?: PersonalityFacets;
  /** Communication style */
  communicationStyle: CommunicationStyle;
  /** Behavioral directives */
  behavior: BehavioralDirectives;
  /** Knowledge domains */
  knowledgeDomains: KnowledgeDomain[];
  /** Memory configuration */
  memoryConfig: MemoryConfig;
  /** Default emotional state */
  defaultEmotionalState: EmotionalState;
  /** System prompt template */
  systemPrompt: string;
  /** Response examples for few-shot learning */
  responseExamples?: ResponseExample[];
  /** Relationship dynamics configuration */
  /** Legacy: identity info including backstory */
  identity?: { backstory?: string; name?: string; description?: string; archetype?: string; tagline?: string };
  /** Legacy: personality traits list */
  traits?: string[];
  /** Legacy: temperament description */
  temperament?: string;
  /** Legacy: response style preferences */
  responseStyle?: string;
  relationshipDynamics?: RelationshipDynamics;
}

/**
 * Response example for few-shot learning
 */
export interface ResponseExample {
  /** User input */
  userMessage: string;
  /** Expected response */
  assistantResponse: string;
  /** Emotional context */
  emotionalContext?: string;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Relationship dynamics configuration
 */
export interface RelationshipDynamics {
  /** Initial relationship stance */
  initialStance: 'formal' | 'friendly' | 'professional' | 'intimate' | 'mentoring';
  /** Warmth progression rate [0, 1] */
  warmthProgression: NormalizedFloat;
  /** Trust building speed [0, 1] */
  trustBuildingSpeed: NormalizedFloat;
  /** Boundary firmness [0, 1] */
  boundaryFirmness: NormalizedFloat;
  /** Attachment style */
  attachmentStyle: 'secure' | 'anxious' | 'avoidant' | 'fearful';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA GENOME - Complete Definition
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Persona status
 */
export type PersonaStatus = 'draft' | 'active' | 'archived' | 'suspended';

/**
 * Persona visibility
 */
export type PersonaVisibility = 'private' | 'unlisted' | 'public' | 'marketplace';

/**
 * Persona metadata
 */
export interface PersonaMetadata {
  /** Unique identifier */
  id: UUID;
  /** Owner user ID */
  ownerId: UUID;
  /** Display name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Short tagline */
  tagline?: string;
  /** Full description */
  description: string;
  /** Category/type */
  category: PersonaCategory;
  /** Tags for discovery */
  tags: string[];
  /** Current status */
  status: PersonaStatus;
  /** Visibility setting */
  visibility: PersonaVisibility;
  /** Avatar URL */
  avatarUrl: AssetURL;
  /** Banner/cover URL */
  bannerUrl?: AssetURL;
  /** Creation timestamp */
  createdAt: ISOTimestamp;
  /** Last update timestamp */
  updatedAt: ISOTimestamp;
  /** Genome version */
  version: SemanticVersion;
  /** Parent persona (if forked) */
  parentId?: UUID;
  /** How the persona was generated */
  generationMethod?: string;
  /** Total cost to generate */
  totalGenerationCost?: number;
  /** Generation time in ms */
  generationTimeMs?: number;
}

/**
 * Persona category
 */
export type PersonaCategory =
  | 'assistant'
  | 'companion'
  | 'entertainer'
  | 'educator'
  | 'creator'
  | 'character'
  | 'brand'
  | 'custom';

/**
 * Usage statistics
 */
export interface PersonaStats {
  /** Total conversations */
  totalConversations: number;
  /** Total messages */
  totalMessages: number;
  /** Total voice minutes */
  totalVoiceMinutes: number;
  /** Total image generations */
  totalImageGenerations: number;
  /** Average rating [0, 5] */
  averageRating: number;
  /** Total ratings count */
  ratingsCount: number;
  /** Favorites count */
  favoritesCount: number;
  /** Fork count */
  forksCount: number;
}

/**
 * Interaction capabilities
 */
export interface PersonaCapabilities {
  /** Text chat enabled */
  textChat: boolean;
  /** Voice chat enabled */
  voiceChat: boolean;
  /** Video generation enabled */
  videoGeneration: boolean;
  /** Image generation enabled */
  imageGeneration: boolean;
  /** Function calling enabled */
  functionCalling: boolean;
  /** Web browsing enabled */
  webBrowsing: boolean;
  /** Code execution enabled */
  codeExecution: boolean;
  /** File handling enabled */
  fileHandling: boolean;
  /** Real-time streaming enabled */
  realTimeStreaming: boolean;
  /** Multi-modal input enabled */
  multiModalInput: boolean;
}

/**
 * Monetization configuration
 */
export interface MonetizationConfig {
  /** Enable monetization */
  enabled: boolean;
  /** Pricing model */
  pricingModel: 'free' | 'subscription' | 'per_message' | 'per_minute' | 'tip_jar';
  /** Price in cents (for paid models) */
  priceInCents?: number;
  /** Revenue share percentage */
  revenueSharePercent: number;
  /** Free tier limits */
  freeTierLimits?: {
    messagesPerDay: number;
    voiceMinutesPerDay: number;
  };
}

/**
 * THE COMPLETE PERSONA GENOME
 * 
 * This is the master type that combines all DNA strands into a
 * complete, deployable AI persona definition.
 */
export interface PersonaGenome {
  /** Metadata and identification */
  metadata: PersonaMetadata;
  
  /** Visual DNA - appearance and expressions */
  visualDNA: VisualDNA;
  
  /** Voice DNA - audio identity and speaking style */
  voiceDNA: VoiceDNA;
  
  /** Motion DNA - animation and movement */
  motionDNA: MotionDNA;
  
  /** Mind DNA - personality and cognition */
  mindDNA: MindDNA;
  
  /** Interaction capabilities */
  capabilities: PersonaCapabilities;
  
  /** Usage statistics */
  stats: PersonaStats;
  
  /** Monetization configuration */
  monetization?: MonetizationConfig;
  
  /** Custom extensions (for plugins) */
  extensions?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create default Big Five personality (balanced)
 */
export function createDefaultPersonality(): BigFivePersonality {
  return {
    openness: 0.6,
    conscientiousness: 0.7,
    extraversion: 0.5,
    agreeableness: 0.7,
    neuroticism: 0.3,
  };
}

/**
 * Create default communication style
 */
export function createDefaultCommunicationStyle(): CommunicationStyle {
  return {
    formality: 0.5,
    verbosity: 0.5,
    humor: 0.4,
    empathy: 0.7,
    directness: 0.6,
    emotionalExpressiveness: 0.5,
    vocabularyComplexity: 0.5,
    sentenceComplexity: 0.5,
    questionUsage: 0.4,
    storytelling: 0.4,
  };
}

/**
 * Create default memory configuration
 */
export function createDefaultMemoryConfig(): MemoryConfig {
  return {
    longTermEnabled: true,
    retentionPeriod: 90,
    maxMemories: 1000,
    importanceThreshold: 0.5,
    emotionalTagging: true,
    relationshipTracking: true,
    consolidationFrequency: 24,
  };
}

/**
 * Create default emotional state
 */
export function createDefaultEmotionalState(): EmotionalState {
  return {
    primary: 'neutral',
    intensity: 0.3,
    valence: 0.2,
    arousal: 0.3,
    dominance: 0.5,
  };
}

/**
 * Create default movement style
 */
export function createDefaultMovementStyle(): MovementStyle {
  return {
    energy: 0.5,
    smoothness: 0.7,
    gestureFrequency: 0.4,
    headMovement: 0.5,
    eyeContact: 0.7,
    blinkRate: 15,
    microExpressions: 0.5,
  };
}

/**
 * Create default persona capabilities
 */
export function createDefaultCapabilities(): PersonaCapabilities {
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

/**
 * Create default persona stats
 */
export function createDefaultStats(): PersonaStats {
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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard for PersonaGenome
 */
export function isPersonaGenome(obj: unknown): obj is PersonaGenome {
  if (typeof obj !== 'object' || obj === null) return false;
  const genome = obj as Record<string, unknown>;
  return (
    typeof genome.metadata === 'object' &&
    typeof genome.visualDNA === 'object' &&
    typeof genome.voiceDNA === 'object' &&
    typeof genome.motionDNA === 'object' &&
    typeof genome.mindDNA === 'object'
  );
}

/**
 * Type guard for FaceEmbedding
 */
export function isFaceEmbedding(obj: unknown): obj is FaceEmbedding {
  if (typeof obj !== 'object' || obj === null) return false;
  const embedding = obj as Record<string, unknown>;
  return (
    Array.isArray(embedding.vector) &&
    typeof embedding.model === 'string' &&
    typeof embedding.sourceImageUrl === 'string' &&
    typeof embedding.confidence === 'number'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize PersonaGenome for storage (excludes large vectors)
 */
export function serializeGenomeForStorage(genome: PersonaGenome): string {
  return JSON.stringify(genome, (key, value) => {
    // Optionally truncate large embedding vectors for logging
    if (key === 'vector' && Array.isArray(value) && value.length > 100) {
      return `[EmbeddingVector: ${value.length} dimensions]`;
    }
    return value;
  }, 2);
}

/**
 * Deep clone a PersonaGenome
 */
export function cloneGenome(genome: PersonaGenome): PersonaGenome {
  return JSON.parse(JSON.stringify(genome));
}
