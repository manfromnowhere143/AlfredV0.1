/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDEO STUDIO - Pixar-Grade Video Generation Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Two modes:
 * 1. Live Chat (Rudy-feel): Real-time 3D avatar + streaming TTS
 * 2. Video Studio (TikTok/IG): Premium async video generation
 *
 * The Pipeline (what makes it "Pixar would be proud"):
 *
 * 1. DIRECTOR PHASE
 *    - LLM generates DirectorJSON from raw script
 *    - Defines emotion curve, SFX events, music plan, camera moves, caption plan
 *
 * 2. VOICE PHASE
 *    - ElevenLabs TTS with word-level timestamps
 *    - This timing data drives EVERYTHING else
 *
 * 3. LIP-SYNC PHASE
 *    - RunPod MuseTalk H100 for identity-consistent talking portraits
 *    - No identity drift across videos
 *    - GPU PROVIDER: RunPod ONLY - No fallbacks
 *
 * 4. AUDIO POST PHASE
 *    - Music bed with intelligent ducking
 *    - SFX hits at timestamp events
 *    - Ambience layering
 *
 * 5. CAPTION PHASE
 *    - Word-level highlighting using voice timestamps
 *    - TikTok-style emphasis animations
 *
 * 6. RENDER PHASE
 *    - ffmpeg composition of all layers
 *    - Camera moves, color grading
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Main service (V1 - Linear pipeline)
export {
  VideoStudioService,
  videoStudioService,
  type VideoFormat,
  type VideoQuality,
  type VideoJobStatus,
  type VideoJobConfig,
  type WordTiming,
  type Caption,
} from "./VideoStudioService";

// Main service (V2 - State-of-the-Art DAG pipeline)
export {
  VideoStudioServiceV2,
  videoStudioServiceV2,
  type VideoJobV2Config,
  type VideoJobV2Result,
} from "./VideoStudioServiceV2";

// Director types and helpers
export {
  type DirectorJSON,
  type EmotionCurve,
  type EmotionKeyframe,
  type SFXEvent,
  type SFXType,
  type MusicPlan,
  type MusicMood,
  type MusicGenre,
  type CameraPlan,
  type CameraMove,
  type CameraKeyframe,
  type CaptionPlan,
  type CaptionStyle,
  type CaptionAnimation,
  type CaptionEmphasis,
  type WordTiming as DirectorWordTiming,
  type CharacterTiming,
  DIRECTOR_SYSTEM_PROMPT,
  getEmotionAtTime,
  getSFXEventsInRange,
  getMusicVolumeAtTime,
  generateCaptionGroups,
} from "./DirectorTypes";

// Director service
export {
  DirectorService,
  directorService,
  type PersonaContext,
  type DirectorRequest,
} from "./DirectorService";

// ElevenLabs service
export {
  ElevenLabsService,
  elevenLabsService,
  ELEVEN_LABS_VOICES,
  EMOTION_VOICE_SETTINGS,
  type ElevenLabsVoiceSettings,
  type TTSWithTimestampsResult,
} from "./ElevenLabsService";

// Audio post service
export {
  AudioPostService,
  audioPostService,
  MUSIC_LIBRARY,
  SFX_LIBRARY,
  AMBIENCE_LIBRARY,
  type AudioTrack,
  type AudioMixConfig,
  type AudioMixResult,
} from "./AudioPostService";

// Render service (ffmpeg composition)
export {
  RenderService,
  renderService,
  type RenderConfig,
  type RenderResult,
} from "./RenderService";

// DAG-based Pipeline Orchestrator
export {
  PipelineOrchestrator,
  createVideoPipeline,
  type TaskId,
  type TaskStatus,
  type TaskNode,
  type PipelineState,
  type PipelineConfig,
} from "./PipelineOrchestrator";

// AI Music Director with Layered Scoring
export {
  MusicDirector,
  musicDirector,
  PERSONA_SOUND_PALETTES,
  DEFAULT_SOUND_PALETTE,
  type PersonaSoundPalette,
  type MusicScale,
  type MusicMood,
  type ScoreBlueprint,
  type ScoreLayer,
  type HitPoint,
  type DynamicEvent,
} from "./MusicDirector";

// Persona Studio Assets (Base Takes, Look Presets)
export {
  BaseTakeSelector,
  baseTakeSelector,
  StudioPackGenerator,
  studioPackGenerator,
  ARCHETYPE_LOOK_PRESETS,
  DEFAULT_LOOK_PRESET,
  CAPTION_PRESETS,
  type PersonaStudioPack,
  type BaseTake,
  type CameraAngle,
  type TakeEmotion,
  type LookPreset,
  type CaptionStylePreset,
  type VisualIdentity,
} from "./PersonaStudioAssets";

// Progressive Preview System
export {
  ProgressivePreviewService,
  createPreviewService,
  buildPreviewTimeline,
  type PreviewStage,
  type PreviewStageId,
  type PreviewStatus,
  type PreviewConfig,
  type PreviewState,
  type PreviewTimelineItem,
} from "./ProgressivePreview";

// RunPod Client (for serverless GPU)
export {
  RunPodClient,
  createRunPodClient,
  getRunPodClient,
  type RunPodConfig,
  type LipSyncInput,
  type VideoRenderInput,
  type PersonaBuildInput,
  type RunPodJobResult,
} from "./RunPodClient";
