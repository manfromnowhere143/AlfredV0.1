/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    PersonaVisualStyle,
    EmotionState,
    VoiceCharacteristics,
    MotionConfig,
  } from './types';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PLAN LIMITS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Resource limits per pricing tier
   */
  export const PERSONA_LIMITS = {
    free: {
      maxPersonas: 1,
      maxChatMessagesPerDay: 20,
      maxVoiceMinutesPerMonth: 0,
      maxVideoMinutesPerMonth: 0,
      allowedModes: ['chat'] as const,
      allowEmbed: false,
      allowCustomVoice: false,
    },
    pro: {
      maxPersonas: 100,  // Increased for development
      maxChatMessagesPerDay: 200,
      maxVoiceMinutesPerMonth: 60,
      maxVideoMinutesPerMonth: 15,
      allowedModes: ['chat', 'voice'] as const,
      allowEmbed: true,
      allowCustomVoice: false,
    },
    business: {
      maxPersonas: 20,
      maxChatMessagesPerDay: 1000,
      maxVoiceMinutesPerMonth: 300,
      maxVideoMinutesPerMonth: 60,
      allowedModes: ['chat', 'voice', 'video'] as const,
      allowEmbed: true,
      allowCustomVoice: true,
    },
    enterprise: {
      maxPersonas: Infinity,
      maxChatMessagesPerDay: Infinity,
      maxVoiceMinutesPerMonth: Infinity,
      maxVideoMinutesPerMonth: Infinity,
      allowedModes: ['chat', 'voice', 'video'] as const,
      allowEmbed: true,
      allowCustomVoice: true,
    },
  } as const;
  
  export type PricingTier = keyof typeof PERSONA_LIMITS;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COST RATES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Cost rates for different operations (in USD)
   */
  export const COST_RATES = {
    // LLM costs (per 1K tokens)
    llm: {
      haiku: {
        input: 0.00025,
        output: 0.00125,
      },
      sonnet: {
        input: 0.003,
        output: 0.015,
      },
      opus: {
        input: 0.015,
        output: 0.075,
      },
    },
  
    // TTS costs (per character)
    tts: {
      elevenlabs: {
        standard: 0.00003, // $0.30 per 10K characters
        turbo: 0.000015, // $0.15 per 10K characters
      },
      coqui: {
        selfHosted: 0.000001, // Negligible, just compute
      },
    },
  
    // Image generation costs (per image)
    image: {
      sdxl: 0.05,
      sdxlWithInstantId: 0.08,
      expressionSet: 0.35, // 7 expressions
    },
  
    // Video generation costs (per second)
    video: {
      animateDiff: 0.10,
      livePortrait: 0.05, // Real-time, lower quality
      sadTalker: 0.08,
    },
  
    // STT costs (per minute)
    stt: {
      whisper: 0.006,
      deepgram: 0.0043,
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DEFAULT CONFIGURATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Default persona configuration values
   */
  export const DEFAULT_CONFIG = {
    visual: {
      style: 'pixar_3d' as PersonaVisualStyle,
      width: 1024,
      height: 1024,
      steps: 28, // FLUX quality
      cfgScale: 3.5, // FLUX optimal (NOT 7.5!)
    },
  
    voice: {
      characteristics: {
        gender: 'neutral',
        age: 'adult',
        pitch: 0,
        speed: 1.0,
        stability: 0.75,
        clarity: 0.85,
      } as VoiceCharacteristics,
      defaultEmotion: 'neutral' as EmotionState,
    },
  
    motion: {
      fps: 24,
      motionScale: 0.8,
      headMovement: 'natural',
      blinkRate: 0.2,
      breathing: true,
      cameraMotion: 'subtle',
      transitions: {
        in: 'fade',
        out: 'fade',
        duration: 0.5,
      },
    } as MotionConfig,
  
    brain: {
      maxContextTokens: 4000,
      maxMemoriesToRecall: 5,
      memoryImportanceThreshold: 0.3,
      emotionDetectionEnabled: true,
    },
  
    session: {
      maxIdleTimeMs: 30 * 60 * 1000, // 30 minutes
      maxMessagesBeforeSummary: 20,
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EMOTION MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Mapping from detected sentiment to emotion state
   */
  export const SENTIMENT_TO_EMOTION: Record<string, EmotionState> = {
    positive: 'happy',
    negative: 'sad',
    angry: 'angry',
    fearful: 'concerned',
    surprised: 'surprised',
    neutral: 'neutral',
    curious: 'curious',
    excited: 'excited',
    thoughtful: 'thoughtful',
    calm: 'calm',
  };
  
  /**
   * Emotion intensity modifiers for voice
   */
  export const EMOTION_VOICE_MODIFIERS: Record<EmotionState, { pitch: number; speed: number }> = {
    neutral: { pitch: 0, speed: 1.0 },
    happy: { pitch: 0.1, speed: 1.1 },
    sad: { pitch: -0.1, speed: 0.9 },
    angry: { pitch: 0.05, speed: 1.15 },
    surprised: { pitch: 0.15, speed: 1.2 },
    thoughtful: { pitch: -0.05, speed: 0.85 },
    excited: { pitch: 0.15, speed: 1.25 },
    calm: { pitch: -0.05, speed: 0.9 },
    confident: { pitch: 0, speed: 1.0 },
    curious: { pitch: 0.1, speed: 1.05 },
    concerned: { pitch: -0.05, speed: 0.95 },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATION TIMEOUTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Timeouts for various generation operations (in ms)
   */
  export const GENERATION_TIMEOUTS = {
    image: 60_000, // 1 minute
    expressionSet: 300_000, // 5 minutes
    video: 180_000, // 3 minutes
    voice: 30_000, // 30 seconds
    identityLock: 120_000, // 2 minutes
    loraTraining: 1_800_000, // 30 minutes
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE LIMITS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Rate limits for API endpoints
   */
  export const RATE_LIMITS = {
    chat: {
      windowMs: 60_000, // 1 minute
      maxRequests: 30,
    },
    voice: {
      windowMs: 60_000,
      maxRequests: 10,
    },
    generation: {
      windowMs: 3_600_000, // 1 hour
      maxRequests: 50,
    },
    embed: {
      windowMs: 60_000,
      maxRequestsPerVisitor: 10,
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // GPU PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * GPU provider configurations
   * RunPod is our ONLY GPU provider - no fallbacks.
   */
  export const GPU_PROVIDERS = {
    runpod: {
      name: 'RunPod',
      baseUrl: 'https://api.runpod.ai/v2',
      endpoints: {
        comfyui: 'RUNPOD_ENDPOINT_ID',      // ComfyUI FLUX (24GB) for images
        video: 'RUNPOD_VIDEO_ENDPOINT_ID',  // MuseTalk H100 (80GB) for video
      },
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Validation constraints
   */
  export const VALIDATION = {
    persona: {
      nameMinLength: 2,
      nameMaxLength: 100,
      taglineMaxLength: 500,
      backstoryMaxLength: 5000,
      maxTraits: 10,
      maxKnowledgeDomains: 10,
    },
    slug: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-z0-9-]+$/,
    },
    message: {
      maxLength: 10000,
    },
    greeting: {
      maxLength: 1000,
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Feature flags for gradual rollout
   */
  export const FEATURE_FLAGS = {
    enableVideoGeneration: true,
    enableVoiceCloning: false,
    enableLoraTraining: false,
    enablePublicPersonas: true,
    enableEmbedWidget: true,
    enableRealtimeVideo: false, // Coming in Phase 6
  } as const;