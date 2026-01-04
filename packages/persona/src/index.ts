/**
 * @alfred/persona - PersonaForge AI Character Engine
 *
 * PersonaForge enables creation of intelligent, visually consistent AI characters
 * with voice synthesis and video generation capabilities.
 *
 * Features:
 * - Visual generation with SDXL + InstantID for identity consistency
 * - Voice synthesis with ElevenLabs or self-hosted Coqui
 * - Brain engine with persistent memory and emotion detection
 * - Real-time voice and video interaction
 * - Embeddable widget for external sites
 */

// TYPE EXPORTS
export * from './types';

// CORE EXPORTS
export {
  PersonaService,
  createPersonaService,
  type UserContext,
  type PersonaServiceConfig,
  type PersonaEvent,
  type PersonaEventType,
} from './service';

export {
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

// CREATION MODULE EXPORTS
export {
  VISUAL_STYLE_PRESETS,
  VOICE_PRESETS,
  MOTION_PRESETS,
  CAMERA_ANGLE_PRESETS,
  EXPRESSION_PRESETS,
  getVisualStylePreset,
  getVoicePreset,
  getMotionPreset,
  listVisualStyles,
  listVoicePresets,
  listMotionPresets,
} from './creation';

// CREATION WIZARD EXPORTS
export {
  CreationWizard,
  createCreationWizard,
  ARCHETYPES,
  type WizardSession,
  type WizardStep,
  type SparkInput,
  type SparkData,
  type VisualOptions,
  type VisualData,
  type VoiceOptions,
  type VoiceData,
  type MindOptions,
  type MindData,
  type WizardEngineConfig,
} from './creation/wizard';

// IDENTITY LOCK PIPELINE EXPORTS
export {
  IdentityLockPipeline,
  createIdentityLockPipeline,
  ReplicateProvider,
  RunPodProvider,
  type GPUProviderConfig,
  type IdentityLockConfig,
  type GenerationRequest,
  type GenerationResult,
} from './genome/identity-lock';

// VISUAL MODULE EXPORTS
export {
  PersonaVisualEngine as VisualEngine,
  buildVisualPrompt as buildPrompt,
  type GenerationRequest as VisualGenerationOptions,
} from './visual';

// VOICE MODULE EXPORTS
export {
  VoiceEngine,
  ElevenLabsClient,
  type ElevenLabsConfig,
} from './voice';

// BRAIN MODULE EXPORTS
export {
  BrainEngine,
  MemoryManager,
  EmotionDetector,
  buildPersonaSystemPrompt,
  type BrainProcessingOptions,
  type SystemPromptContext,
  type MemoryQuery,
  type EmotionDetectionResult,
} from './brain';

// REALTIME MODULE EXPORTS
export {
  VoicePipeline,
  RealtimeManager,
  type VoicePipelineConfig,
  type RealtimeConfig,
} from './realtime';

// UTILITY EXPORTS
export {
  generateSlug,
  generateUniqueSlug,
  validateCreateRequest,
  validateUpdateRequest,
  validatePersonaConfig,
  calculateInteractionCost,
  calculateCreationCost,
  truncate,
  estimateTokens,
  formatDuration,
  generateId,
  generateShortId,
  sleep,
  retry,
  deepClone,
  pick,
  omit,
  removeUndefined,
} from './utils';

export {
  PersonaError,
  PersonaValidationError,
  PersonaNotFoundError,
  PersonaNameExistsError,
  PersonaLimitReachedError,
  PersonaQuotaExceededError,
  SessionNotFoundError,
  WizardSessionExpiredError,
  WizardInvalidStepError,
  VisualGenerationError,
  IdentityLockError,
  VoiceGenerationError,
  VoiceProviderError,
  InteractionRateLimitError,
  GPUJobError,
  GPUTimeoutError,
  GPUProviderUnavailableError,
  InvalidStylePresetError,
  InvalidVoiceConfigError,
  isPersonaError,
  wrapError,
  getErrorMessage,
} from './errors';

// CONSTANTS
export {
  PERSONA_LIMITS,
  COST_RATES,
  DEFAULT_CONFIG,
  SENTIMENT_TO_EMOTION,
  EMOTION_VOICE_MODIFIERS,
  GENERATION_TIMEOUTS,
  RATE_LIMITS,
  GPU_PROVIDERS,
  VALIDATION,
  FEATURE_FLAGS,
  type PricingTier,
} from './constants';