/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive type definitions for the PersonaForge system.
 * All types are designed for:
 * - Full TypeScript strict mode compatibility
 * - JSON serialization (no Date objects, use ISO strings)
 * - API request/response compatibility
 * - Database schema alignment
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Persona lifecycle states */
export type PersonaStatus = 'creating' | 'active' | 'paused' | 'archived';

/** Visual style presets */
export type PersonaVisualStyle =
  | 'pixar_3d'
  | 'arcane_stylized'
  | 'anime_premium'
  | 'hyper_realistic'
  | 'fantasy_epic'
  | 'corporate_professional'
  | 'custom';

/** Voice synthesis providers */
export type PersonaVoiceProvider = 'elevenlabs' | 'coqui' | 'custom';

/** Interaction modes */
export type PersonaInteractionMode = 'chat' | 'voice' | 'video';

/** Asset types */
export type PersonaAssetType = 'image' | 'video' | 'audio' | 'lora' | 'embedding';

/** Memory types */
export type PersonaMemoryType = 'fact' | 'preference' | 'event' | 'relationship' | 'skill';

/** Emotion states */
export type EmotionState =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thoughtful'
  | 'excited'
  | 'calm'
  | 'confident'
  | 'curious'
  | 'concerned';

/** Expression types for visual assets */
export type ExpressionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thoughtful'
  | 'wink'
  | 'smile'
  | 'serious';

/** Communication styles */
export type CommunicationStyle =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'nurturing'
  | 'playful';

/** Knowledge proficiency levels */
export type KnowledgeLevel = 'basic' | 'intermediate' | 'expert';

/** Voice gender */
export type VoiceGender = 'male' | 'female' | 'neutral';

/** Voice age category */
export type VoiceAge = 'young' | 'adult' | 'mature' | 'elderly';

/** Head movement intensity */
export type HeadMovement = 'minimal' | 'subtle' | 'natural' | 'dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE PERSONA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Knowledge domain configuration
 */
export interface KnowledgeDomain {
  /** Domain name (e.g., "technology", "medicine", "history") */
  domain: string;
  /** Proficiency level */
  level: KnowledgeLevel;
  /** Optional specific topics within the domain */
  topics?: string[];
}

/**
 * Emotional range configuration
 */
export interface EmotionalRange {
  /** Default emotional state */
  baseline: EmotionState;
  /** Emotional responses to triggers */
  triggers: Record<string, EmotionState>;
  /** Emotional intensity multiplier (0-2) */
  intensity?: number;
}

/**
 * Speaking style configuration
 */
export interface SpeakingStyle {
  /** Rules for speech patterns */
  rules: string[];
  /** Example phrases */
  examples: string[];
  /** Unique speech quirks */
  quirks: string[];
  /** Vocabulary level */
  vocabulary: 'simple' | 'moderate' | 'sophisticated' | 'formal';
}

/**
 * Visual generation configuration
 */
export interface VisualConfig {
  /** Style preset name */
  stylePreset: PersonaVisualStyle;
  /** Custom positive prompt addition */
  customPrompt?: string;
  /** Custom negative prompt */
  negativePrompt?: string;
  /** Classifier-free guidance scale */
  cfgScale?: number;
  /** Generation seed for reproducibility */
  seed?: number;
  /** Number of inference steps */
  steps?: number;
  /** Sampler algorithm */
  sampler?: string;
}

/**
 * Identity embedding for visual consistency
 */
export interface IdentityEmbedding {
  /** Face embedding from InstantID (512-dim) */
  face: number[];
  /** Style embedding from IP-Adapter (768-dim) */
  style: number[];
  /** Embedding version for compatibility */
  version: string;
  /** Reference image used for extraction */
  referenceImageUrl?: string;
}

/**
 * Voice characteristics
 */
export interface VoiceCharacteristics {
  /** Voice gender */
  gender: VoiceGender;
  /** Voice age category */
  age: VoiceAge;
  /** Pitch adjustment (-1 to 1, 0 = neutral) */
  pitch: number;
  /** Speech speed (0.5 to 2.0, 1 = normal) */
  speed: number;
  /** Voice stability (0 to 1, higher = more consistent) */
  stability: number;
  /** Voice clarity (0 to 1, higher = clearer) */
  clarity: number;
}

/**
 * Emotion-specific voice parameters
 */
export interface EmotionVoiceProfile {
  /** Pitch adjustment for this emotion */
  pitch: number;
  /** Speed adjustment for this emotion */
  speed: number;
  /** Emphasis description */
  emphasis: string;
  /** Style intensity (0 to 1) */
  styleIntensity?: number;
}

/**
 * Voice style configuration
 */
export interface VoiceStyle {
  /** Regional accent */
  accent?: string;
  /** Speaking style description */
  speakingStyle: string;
  /** Speech quirks */
  quirks: string[];
}

/**
 * Complete voice configuration
 */
export interface VoiceConfig {
  /** Base voice characteristics */
  characteristics: VoiceCharacteristics;
  /** Emotion-specific profiles */
  emotionProfiles: Record<EmotionState, EmotionVoiceProfile>;
  /** Style settings */
  style: VoiceStyle;
}

/**
 * Motion transition configuration
 */
export interface MotionTransition {
  /** Entry animation type */
  in: string;
  /** Exit animation type */
  out: string;
  /** Transition duration in seconds */
  duration: number;
}

/**
 * Motion/animation configuration
 */
export interface MotionConfig {
  /** Target frames per second */
  fps: number;
  /** Motion intensity scale (0-2) */
  motionScale: number;
  /** Head movement style */
  headMovement: HeadMovement;
  /** Blink rate (blinks per second) */
  blinkRate: number;
  /** Enable subtle breathing animation */
  breathing: boolean;
  /** Camera motion preset */
  cameraMotion: string;
  /** Transition settings */
  transitions: MotionTransition;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA ENTITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Core Persona entity
 */
export interface Persona {
  id: string;
  userId: string;

  // Identity
  name: string;
  slug: string;
  archetype?: string;
  tagline?: string;
  backstory?: string;

  // Personality
  traits: string[];
  temperament?: string;
  communicationStyle?: CommunicationStyle;
  emotionalRange?: EmotionalRange;
  speakingStyle?: SpeakingStyle;
  knowledgeDomains?: KnowledgeDomain[];

  // Visual
  visualStyle: PersonaVisualStyle;
  visualConfig?: VisualConfig;
  identityEmbedding?: IdentityEmbedding;

  // Voice
  voiceProvider: PersonaVoiceProvider;
  voiceId?: string;
  voiceConfig?: VoiceConfig;

  // Motion
  motionStyle?: string;
  motionConfig?: MotionConfig;
  cameraAngle?: string;

  // Settings
  status: PersonaStatus;
  isPublic: boolean;
  allowEmbed: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  customGreeting?: string;

  // Current State
  currentMood: EmotionState;
  energyLevel: number;
  relationshipLevel: number;

  // Analytics
  totalInteractions: number;
  totalChatMessages: number;
  totalVoiceMinutes: number;
  totalVideoMinutes: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastInteractionAt?: string;
  deletedAt?: string;
}

/**
 * Persona asset entity
 */
export interface PersonaAsset {
  id: string;
  personaId: string;

  // Asset identification
  type: PersonaAssetType;
  purpose: string;
  name?: string;

  // Storage
  url: string;
  thumbnailUrl?: string;
  storageProvider: string;
  storageKey?: string;

  // Metadata
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;

  // Generation info
  generationConfig?: {
    model: string;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    steps?: number;
    cfgScale?: number;
    sampler?: string;
    [key: string]: unknown;
  };
  generationCost?: number;
  generationTimeMs?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Persona memory entity
 */
export interface PersonaMemory {
  id: string;
  personaId: string;

  // Content
  content: string;
  type: PersonaMemoryType;
  category?: string;
  summary?: string;

  // Vector
  embedding?: number[];
  embeddingModel?: string;

  // Decay model
  importance: number;
  confidence: number;
  accessCount: number;
  decayRate: number;

  // Source
  sourceInteractionId?: string;
  sourceUserId?: string;

  // Timestamps
  lastAccessedAt: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Persona interaction entity
 */
export interface PersonaInteraction {
  id: string;
  personaId: string;
  userId?: string;
  sessionId?: string;

  // Content
  mode: PersonaInteractionMode;
  userMessage?: string;
  personaResponse?: string;

  // Emotion
  userEmotionDetected?: EmotionState;
  personaEmotionExpressed?: EmotionState;

  // Metrics
  inputTokens?: number;
  outputTokens?: number;
  durationSeconds?: number;
  latencyMs?: number;

  // Quality
  wasHelpful?: boolean;
  userRating?: number;
  userFeedback?: string;

  // Cost
  llmCost?: number;
  ttsCost?: number;
  videoCost?: number;
  totalCost?: number;

  // Context
  source: string;
  referrer?: string;
  clientMetadata?: {
    userAgent?: string;
    language?: string;
    timezone?: string;
    [key: string]: unknown;
  };

  // Timestamps
  createdAt: string;
}

/**
 * Persona embed configuration
 */
export interface PersonaEmbed {
  id: string;
  personaId: string;

  // Domain
  domain: string;
  allowedOrigins: string[];

  // Customization
  theme: 'dark' | 'light';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  size: 'small' | 'medium' | 'large';
  customCss?: string;
  branding?: {
    showPoweredBy: boolean;
    primaryColor?: string;
    fontFamily?: string;
  };

  // Behavior
  isActive: boolean;
  requireAuth: boolean;
  customGreeting?: string;
  allowedModes: PersonaInteractionMode[];

  // Rate limiting
  dailyLimitPerVisitor: number;
  dailyLimitTotal: number;

  // Analytics
  totalImpressions: number;
  totalInteractions: number;
  uniqueVisitors: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Persona session entity
 */
export interface PersonaSession {
  id: string;
  personaId: string;
  userId?: string;
  visitorId?: string;

  // State
  currentMood: EmotionState;
  contextSummary?: string;
  sessionFacts: string[];

  // Metrics
  messageCount: number;
  tokenCount: number;

  // Timestamps
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create persona request
 */
export interface CreatePersonaRequest {
  name: string;
  description: string;
  archetype?: string;
}

/**
 * Create persona response
 */
export interface CreatePersonaResponse {
  persona: Persona;
  wizardSessionId: string;
}

/**
 * Update persona request
 */
export interface UpdatePersonaRequest {
  name?: string;
  tagline?: string;
  backstory?: string;
  traits?: string[];
  temperament?: string;
  communicationStyle?: CommunicationStyle;
  emotionalRange?: EmotionalRange;
  speakingStyle?: SpeakingStyle;
  knowledgeDomains?: KnowledgeDomain[];
  visualStyle?: PersonaVisualStyle;
  visualConfig?: VisualConfig;
  voiceProvider?: PersonaVoiceProvider;
  voiceId?: string;
  voiceConfig?: VoiceConfig;
  motionStyle?: string;
  motionConfig?: MotionConfig;
  cameraAngle?: string;
  status?: PersonaStatus;
  isPublic?: boolean;
  allowEmbed?: boolean;
  allowVoice?: boolean;
  allowVideo?: boolean;
  customGreeting?: string;
}

/**
 * Generate visual request
 */
export interface GenerateVisualRequest {
  stylePreset: PersonaVisualStyle;
  customPrompt?: string;
  variations?: number;
}

/**
 * Generated image response
 */
export interface GeneratedImage {
  url: string;
  seed: number;
  width: number;
  height: number;
}

/**
 * Generate visual response
 */
export interface GenerateVisualResponse {
  images: GeneratedImage[];
  estimatedCost: number;
}

/**
 * Lock identity request
 */
export interface LockIdentityRequest {
  selectedImageUrl: string;
  seed: number;
}

/**
 * Lock identity response
 */
export interface LockIdentityResponse {
  identityEmbedding: IdentityEmbedding;
  expressionSet: Record<ExpressionType, string>;
}

/**
 * Generate voice request
 */
export interface GenerateVoiceRequest {
  voicePreset?: string;
  customConfig?: Partial<VoiceConfig>;
  sampleText: string;
}

/**
 * Generate voice response
 */
export interface GenerateVoiceResponse {
  audioUrl: string;
  voiceId: string;
  duration: number;
}

/**
 * Chat request
 */
export interface PersonaChatRequest {
  message: string;
  sessionId?: string;
}

/**
 * Chat stream event types
 */
export type ChatStreamEventType = 'text' | 'emotion' | 'action' | 'done' | 'error';

/**
 * Chat stream event
 */
export interface ChatStreamEvent {
  type: ChatStreamEventType;
  content: string;
  emotion?: EmotionState;
  timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wizard steps
 */
export type WizardStep =
  | 'concept'
  | 'visual'
  | 'voice'
  | 'personality'
  | 'motion'
  | 'preview';

/**
 * Wizard state
 */
export interface WizardState {
  personaId: string;
  sessionId: string;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  concept?: {
    name: string;
    archetype: string;
    backstory: string;
    traits: string[];
  };
  visual?: {
    style: PersonaVisualStyle;
    selectedImageUrl?: string;
    seed?: number;
    identityLocked: boolean;
  };
  voice?: {
    provider: PersonaVoiceProvider;
    voiceId?: string;
    previewUrl?: string;
  };
  personality?: {
    temperament: string;
    communicationStyle: CommunicationStyle;
    speakingStyle: SpeakingStyle;
    knowledgeDomains: KnowledgeDomain[];
  };
  motion?: {
    style: string;
    cameraAngle: string;
    previewUrl?: string;
  };
}

/**
 * Wizard step request
 */
export interface WizardStepRequest {
  sessionId: string;
  userResponse: string;
  currentStep: WizardStep;
}

/**
 * Wizard step response
 */
export interface WizardStepResponse {
  question?: string;
  options?: string[];
  previewUrl?: string;
  nextStep?: WizardStep;
  isComplete?: boolean;
  updatedState?: Partial<WizardState>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Visual style preset configuration
 */
export interface VisualStylePreset {
  id: PersonaVisualStyle;
  name: string;
  description: string;
  promptPrefix: string;
  negativePrompt: string;
  cfgScale: number;
  sampler: string;
  checkpoint: string;
  loras: string[];
  previewImage: string;
}

/**
 * Voice preset configuration
 */
export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  characteristics: VoiceCharacteristics;
  style: VoiceStyle;
  promptHint: string;
  sampleUrl: string;
}

/**
 * Motion preset configuration
 */
export interface MotionPreset {
  id: string;
  name: string;
  description: string;
  fps: number;
  motionModule: string;
  motionLora: string;
  settings: Omit<MotionConfig, 'fps' | 'transitions'>;
  transitions: MotionTransition;
  previewUrl: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPU PIPELINE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GPU job status
 */
export type GPUJobStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'cancelled';

/**
 * GPU job priority
 */
export type GPUJobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * GPU job definition
 */
export interface GPUJob {
  id: string;
  type: 'image' | 'video' | 'audio';
  model: string;
  input: Record<string, unknown>;
  priority: GPUJobPriority;
  timeout: number;
  retries: number;
  status: GPUJobStatus;
  result?: {
    url: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Voice pipeline output types
 */
export type VoicePipelineOutputType =
  | 'transcript'
  | 'emotion'
  | 'audio'
  | 'complete'
  | 'error';

/**
 * Voice pipeline output
 */
export interface VoicePipelineOutput {
  type: VoicePipelineOutputType;
  text?: string;
  isFinal?: boolean;
  emotion?: EmotionState;
  data?: ArrayBuffer;
  error?: string;
}

/**
 * Real-time connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * WebRTC signaling message types
 */
export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'ready'
  | 'bye';

/**
 * WebRTC signaling message
 */
export interface SignalingMessage {
  type: SignalingMessageType;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PersonaForge error codes
 */
export type PersonaErrorCode =
  // Creation errors
  | 'PERSONA_NOT_FOUND'
  | 'PERSONA_NAME_EXISTS'
  | 'PERSONA_LIMIT_REACHED'
  | 'WIZARD_SESSION_EXPIRED'
  | 'WIZARD_INVALID_STEP'
  // Visual errors
  | 'VISUAL_GENERATION_FAILED'
  | 'IDENTITY_LOCK_FAILED'
  | 'INVALID_STYLE_PRESET'
  // Voice errors
  | 'VOICE_GENERATION_FAILED'
  | 'VOICE_PROVIDER_ERROR'
  | 'INVALID_VOICE_CONFIG'
  // Interaction errors
  | 'INTERACTION_RATE_LIMITED'
  | 'INTERACTION_QUOTA_EXCEEDED'
  | 'SESSION_NOT_FOUND'
  // GPU errors
  | 'GPU_JOB_FAILED'
  | 'GPU_TIMEOUT'
  | 'GPU_PROVIDER_UNAVAILABLE';

/**
 * PersonaForge error
 */
export interface PersonaError {
  code: PersonaErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort params
 */
export interface SortParams {
  field: string;
  order: SortOrder;
}

/**
 * Filter operators
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

/**
 * Filter param
 */
export interface FilterParam {
  field: string;
  operator: FilterOperator;
  value: unknown;
}