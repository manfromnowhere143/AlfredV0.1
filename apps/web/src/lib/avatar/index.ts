/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVATAR SYSTEM - State-of-the-art real-time animated avatars
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete avatar system with:
 * - Real-time 3D rendering (Three.js / React Three Fiber)
 * - Audio-driven lip-sync
 * - Emotion-based expressions
 * - State machine (idle/listening/thinking/speaking)
 * - LLM control directives
 * - Streaming TTS integration
 *
 * Target experience:
 * - 0ms idle/presence (always running)
 * - <50ms state transitions
 * - 400-1200ms to first audio
 * - Real-time lip-sync (20-40ms frames)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// State management - The Soul of the Avatar
export {
  useAvatarStore,
  VISEME_TO_BLENDSHAPES,
  type AvatarState,
  type Emotion,
  type Gesture,
  type Viseme,
  type BlendShapes,
  type AvatarPerformance,
  type PersonaArchetype,
  type EmotionCurvePoint,
  type MicroExpression,
} from './store';

// Lip-sync
export { useLipSync } from './useLipSync';

// Streaming TTS
export { useStreamingTTS } from './useStreamingTTS';

// LLM directives
export {
  parseLLMDirective,
  directiveToPerformance,
  cleanSpeechForTTS,
  AVATAR_CONTROL_SYSTEM_PROMPT,
  type LLMDirective,
} from './llmDirectives';

// 3D Generation
export { useGenerate3D, type Model3DType, type Generate3DStatus, type Generate3DResult } from './useGenerate3D';

// Voice Director (emotion-aware TTS orchestration)
export {
  VoiceDirector,
  createVoiceDirector,
  type PersonaVoiceConfig,
  type TTSRequest,
  type VoiceDirectorOutput,
} from './VoiceDirector';
