/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIRECTOR TYPES - The Timeline That Controls Everything
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Pixar would be proud" comes from a single timeline controlling:
 * - Script cadence
 * - Emotion curves
 * - SFX events
 * - Music ducking
 * - Camera moves
 * - Caption emphasis
 *
 * The LLM produces this Director JSON, then render follows the timeline.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// WORD TIMING (from ElevenLabs with timestamps)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WordTiming {
  word: string;
  start: number;        // seconds
  end: number;          // seconds
  confidence?: number;  // 0-1
}

export interface CharacterTiming {
  character: string;
  start: number;
  end: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CURVE - Intensity over time
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionKeyframe {
  time: number;         // seconds from start
  emotion: string;      // "neutral" | "happy" | "intense" | "sad" | etc.
  intensity: number;    // 0-1
}

export interface EmotionCurve {
  keyframes: EmotionKeyframe[];
  defaultEmotion: string;
  defaultIntensity: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SFX EVENTS - Sound effects at specific moments
// ═══════════════════════════════════════════════════════════════════════════════

export type SFXType =
  | "whoosh"
  | "impact"
  | "rise"
  | "drop"
  | "sparkle"
  | "thunder"
  | "heartbeat"
  | "breath"
  | "chime"
  | "swoosh"
  | "boom"
  | "ding"
  | "custom";

export interface SFXEvent {
  type: SFXType;
  time: number;           // seconds
  duration?: number;      // seconds (for sustained sounds)
  volume: number;         // 0-1
  customUrl?: string;     // for custom SFX
  trigger?: string;       // word/phrase that triggers this
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC PLAN - Background music with ducking
// ═══════════════════════════════════════════════════════════════════════════════

export type MusicMood =
  | "epic"
  | "dramatic"
  | "inspirational"
  | "mysterious"
  | "dark"
  | "happy"
  | "sad"
  | "tense"
  | "peaceful"
  | "energetic";

export type MusicGenre =
  | "orchestral"
  | "electronic"
  | "ambient"
  | "cinematic"
  | "lofi"
  | "trap"
  | "rock"
  | "piano";

export interface MusicPlan {
  mood: MusicMood;
  genre?: MusicGenre;
  tempo?: "slow" | "medium" | "fast";
  baseVolume: number;           // 0-1, default ~0.15
  duckToVolume: number;         // 0-1, volume during speech ~0.05
  duckAttackMs: number;         // how fast to duck (50-200ms)
  duckReleaseMs: number;        // how fast to restore (200-500ms)
  intensityCurve?: Array<{      // music intensity over time
    time: number;
    intensity: number;
  }>;
  customUrl?: string;           // specific track URL
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA PLAN - Virtual camera moves
// ═══════════════════════════════════════════════════════════════════════════════

export type CameraMove =
  | "static"
  | "push_in"         // slow zoom in
  | "pull_out"        // slow zoom out
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "tilt_down"
  | "shake"           // intensity moment
  | "drift";          // subtle float

export interface CameraKeyframe {
  time: number;
  move: CameraMove;
  duration: number;     // seconds for this move
  intensity?: number;   // 0-1 for shake/drift
  easing?: "linear" | "ease_in" | "ease_out" | "ease_in_out";
}

export interface CameraPlan {
  baseAngle: "front" | "three_quarter" | "profile" | "dramatic_low" | "high_angle";
  baseZoom: number;     // 1.0 = normal, 1.2 = slightly closer
  keyframes: CameraKeyframe[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPTION PLAN - Word-level emphasis
// ═══════════════════════════════════════════════════════════════════════════════

export type CaptionStyle =
  | "tiktok"          // bold, pop animation, center
  | "minimal"         // clean, fade in/out
  | "bold"            // large, impactful
  | "typewriter"      // character by character
  | "karaoke"         // highlight word by word
  | "subtitle";       // traditional bottom

export type CaptionAnimation =
  | "pop"             // scale bounce
  | "fade"            // opacity
  | "slide_up"
  | "slide_down"
  | "bounce"
  | "shake"
  | "glow"
  | "none";

export interface CaptionEmphasis {
  word: string;       // word to emphasize
  style: "bold" | "color" | "size" | "shake" | "glow";
  color?: string;     // hex color for "color" style
  scale?: number;     // 1.2 for "size" style
}

export interface CaptionPlan {
  style: CaptionStyle;
  animation: CaptionAnimation;
  position: { x: number; y: number };  // 0-1, 0-1 (center = 0.5, 0.5)
  fontSize: "small" | "medium" | "large" | "xlarge";
  fontFamily?: string;
  color: string;              // hex
  strokeColor?: string;       // outline color
  strokeWidth?: number;       // pixels
  backgroundColor?: string;   // hex with alpha
  wordsPerGroup: number;      // how many words per caption (3-5 for TikTok)
  emphasisWords: CaptionEmphasis[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTOR JSON - The Complete Timeline
// ═══════════════════════════════════════════════════════════════════════════════

export interface DirectorJSON {
  // Metadata
  version: "1.0";
  personaId: string;
  title?: string;

  // Script
  rawScript: string;          // original user input
  polishedScript: string;     // LLM-refined for cadence
  estimatedDuration: number;  // seconds

  // Performance
  emotionCurve: EmotionCurve;
  gestureHints?: Array<{      // optional gesture cues
    time: number;
    gesture: "nod" | "shake" | "tilt" | "raise_brow" | "smile" | "frown";
    intensity: number;
  }>;

  // Audio
  sfxEvents: SFXEvent[];
  musicPlan: MusicPlan;
  ambiencePlan?: {
    type: "room" | "outdoor" | "rain" | "wind" | "crowd" | "space";
    volume: number;
  };

  // Visual
  cameraPlan: CameraPlan;
  captionPlan: CaptionPlan;
  backgroundPlan?: {
    type: "blur_original" | "solid" | "gradient" | "video" | "particles";
    color?: string;
    gradientColors?: string[];
    videoUrl?: string;
  };

  // Render settings
  format: "tiktok_vertical" | "instagram_reel" | "youtube_short" | "youtube_standard";
  quality: "draft" | "standard" | "premium" | "cinematic";
  fps: 24 | 30 | 60;
  resolution: { width: number; height: number };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTOR PROMPT - System prompt for LLM to generate Director JSON
// ═══════════════════════════════════════════════════════════════════════════════

export const DIRECTOR_SYSTEM_PROMPT = `You are a cinematic director for AI persona videos. Your job is to take a raw script and transform it into a rich Director JSON that controls every aspect of the video production.

You must output valid JSON matching the DirectorJSON schema. Key responsibilities:

1. **Script Polish**: Rewrite the script for natural speech cadence. Add pauses with "..." for dramatic effect. Break long sentences.

2. **Emotion Curve**: Map the emotional journey. Start/end points, climax moments, transitions. Every video needs a rise and fall.

3. **SFX Events**: Add sound effects at impactful moments:
   - "whoosh" for transitions
   - "impact" on punch words
   - "rise" building to climax
   - "drop" after climax
   - Use sparingly (2-5 per 30s video)

4. **Music Plan**: Choose mood/genre that matches persona and script. Set ducking for speech clarity.

5. **Camera Plan**: Add subtle camera moves:
   - "push_in" toward climax/important words
   - "pull_out" for endings
   - "drift" for ambient sections
   - Never overdo it - subtle is premium

6. **Caption Plan**: Identify 3-5 key words to emphasize. These get special styling.

Output ONLY valid JSON. No markdown, no explanation.`;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get emotion at a specific time from the emotion curve
 */
export function getEmotionAtTime(curve: EmotionCurve, time: number): { emotion: string; intensity: number } {
  const keyframes = curve.keyframes.sort((a, b) => a.time - b.time);

  if (keyframes.length === 0) {
    return { emotion: curve.defaultEmotion, intensity: curve.defaultIntensity };
  }

  // Before first keyframe
  if (time <= keyframes[0].time) {
    return { emotion: keyframes[0].emotion, intensity: keyframes[0].intensity };
  }

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    const last = keyframes[keyframes.length - 1];
    return { emotion: last.emotion, intensity: last.intensity };
  }

  // Interpolate between keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const curr = keyframes[i];
    const next = keyframes[i + 1];

    if (time >= curr.time && time < next.time) {
      const t = (time - curr.time) / (next.time - curr.time);
      const intensity = curr.intensity + (next.intensity - curr.intensity) * t;
      // Use the emotion of the keyframe we're closer to
      const emotion = t < 0.5 ? curr.emotion : next.emotion;
      return { emotion, intensity };
    }
  }

  return { emotion: curve.defaultEmotion, intensity: curve.defaultIntensity };
}

/**
 * Get SFX events in a time range
 */
export function getSFXEventsInRange(events: SFXEvent[], start: number, end: number): SFXEvent[] {
  return events.filter(e => e.time >= start && e.time < end);
}

/**
 * Calculate music volume at a specific time (with ducking)
 */
export function getMusicVolumeAtTime(
  plan: MusicPlan,
  time: number,
  wordTimings: WordTiming[]
): number {
  // Check if we're during speech
  const isDuringSpeech = wordTimings.some(w => time >= w.start && time <= w.end);

  if (isDuringSpeech) {
    return plan.duckToVolume;
  }

  // Check if we're in attack/release phase
  for (const word of wordTimings) {
    const attackStart = word.start - plan.duckAttackMs / 1000;
    const releaseEnd = word.end + plan.duckReleaseMs / 1000;

    if (time >= attackStart && time < word.start) {
      // Attack phase - ramping down
      const t = (time - attackStart) / (plan.duckAttackMs / 1000);
      return plan.baseVolume - (plan.baseVolume - plan.duckToVolume) * t;
    }

    if (time > word.end && time <= releaseEnd) {
      // Release phase - ramping up
      const t = (time - word.end) / (plan.duckReleaseMs / 1000);
      return plan.duckToVolume + (plan.baseVolume - plan.duckToVolume) * t;
    }
  }

  return plan.baseVolume;
}

/**
 * Generate caption groups from word timings
 */
export function generateCaptionGroups(
  wordTimings: WordTiming[],
  wordsPerGroup: number
): Array<{ text: string; words: WordTiming[]; start: number; end: number }> {
  const groups: Array<{ text: string; words: WordTiming[]; start: number; end: number }> = [];

  for (let i = 0; i < wordTimings.length; i += wordsPerGroup) {
    const groupWords = wordTimings.slice(i, i + wordsPerGroup);
    if (groupWords.length > 0) {
      groups.push({
        text: groupWords.map(w => w.word).join(" "),
        words: groupWords,
        start: groupWords[0].start,
        end: groupWords[groupWords.length - 1].end,
      });
    }
  }

  return groups;
}
