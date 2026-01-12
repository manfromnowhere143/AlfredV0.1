/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVATAR STATE STORE - Pixar-Quality Real-Time Avatar State Machine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The "soul" of the avatar - what makes it feel ALIVE.
 *
 * Features:
 * - State machine: idle → listening → thinking → speaking → idle
 * - Smooth emotion blending with curves (not hard switches)
 * - Camera-aware eye contact (not random gaze)
 * - Micro-expressions for subtle life
 * - Breathing variation based on emotional state
 * - Persona-specific idle behaviors
 *
 * Target: 60fps, <16ms per tick, feels like a living being
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'curious'
  | 'focused'
  | 'playful'
  | 'concerned'
  | 'confident';

export type Gesture =
  | 'none'
  | 'nod'
  | 'shake'
  | 'tilt_left'
  | 'tilt_right'
  | 'look_up'
  | 'look_down'
  | 'shrug'
  | 'lean_in'
  | 'lean_back';

// Persona archetypes for idle behavior customization
export type PersonaArchetype =
  | 'sage'      // Calm, deliberate, wise
  | 'hero'      // Confident, alert, ready
  | 'creator'   // Curious, animated, expressive
  | 'caregiver' // Warm, attentive, nurturing
  | 'ruler'     // Regal, commanding, still
  | 'jester'    // Playful, bouncy, quick
  | 'rebel'     // Intense, sharp, edgy
  | 'lover'     // Sensual, soft, flowing
  | 'explorer'  // Alert, scanning, engaged
  | 'innocent'  // Wide-eyed, gentle, open
  | 'magician'  // Mysterious, slow, dramatic
  | 'outlaw'    // Restless, intense, unpredictable
  | 'default';  // Generic balanced

// ARKit 52 Blend Shapes (standard for facial animation)
export interface BlendShapes {
  // Eyes
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;

  // Jaw
  jawForward: number;
  jawLeft: number;
  jawRight: number;
  jawOpen: number;

  // Mouth
  mouthClose: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthLeft: number;
  mouthRight: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  mouthDimpleLeft: number;
  mouthDimpleRight: number;
  mouthStretchLeft: number;
  mouthStretchRight: number;
  mouthRollLower: number;
  mouthRollUpper: number;
  mouthShrugLower: number;
  mouthShrugUpper: number;
  mouthPressLeft: number;
  mouthPressRight: number;
  mouthLowerDownLeft: number;
  mouthLowerDownRight: number;
  mouthUpperUpLeft: number;
  mouthUpperUpRight: number;

  // Brow
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;

  // Cheek
  cheekPuff: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;

  // Nose
  noseSneerLeft: number;
  noseSneerRight: number;

  // Tongue
  tongueOut: number;
}

// Viseme mapping (phoneme to mouth shape)
export type Viseme =
  | 'sil'    // Silence
  | 'PP'     // p, b, m
  | 'FF'     // f, v
  | 'TH'     // th
  | 'DD'     // t, d
  | 'kk'     // k, g
  | 'CH'     // ch, j, sh
  | 'SS'     // s, z
  | 'nn'     // n, l
  | 'RR'     // r
  | 'aa'     // a
  | 'E'      // e
  | 'I'      // i
  | 'O'      // o
  | 'U';     // u

export interface AvatarPerformance {
  emotion: Emotion;
  energy: number;      // 0-1, affects animation intensity
  gesture: Gesture;
  beats: Array<{ t: number; action: string }>;
}

// Emotion curve point for smooth blending
export interface EmotionCurvePoint {
  time: number;        // 0-1 normalized time
  emotion: Emotion;
  intensity: number;   // 0-1
}

// Micro-expression definition
export interface MicroExpression {
  type: 'nostril_flare' | 'lip_corner' | 'brow_flash' | 'eye_squint' | 'cheek_raise';
  intensity: number;
  duration: number;
  startTime: number;
}

export interface AvatarStoreState {
  // Core state
  state: AvatarState;
  emotion: Emotion;
  energy: number;
  gesture: Gesture;

  // === NEW: Smooth emotion blending ===
  targetEmotion: Emotion;
  emotionIntensity: number;
  targetEmotionIntensity: number;
  emotionTransitionSpeed: number;  // How fast to blend (0.05 = smooth, 0.2 = quick)
  emotionCurve: EmotionCurvePoint[];
  emotionCurveStartTime: number;

  // === NEW: Persona archetype for idle behavior ===
  archetype: PersonaArchetype;

  // === NEW: Micro-expressions ===
  activeMicroExpressions: MicroExpression[];
  nextMicroExpressionTime: number;

  // === NEW: Breathing system ===
  breathingRate: number;        // Hz (0.2 = calm, 0.5 = excited)
  breathingDepth: number;       // 0-1 intensity
  breathingPhase: number;       // Current phase in cycle

  // === NEW: Eye contact system ===
  eyeContactEnabled: boolean;
  eyeContactStrength: number;   // 0-1, how strongly to look at camera
  lookAwayTimer: number;        // When to briefly look away (natural)
  isLookingAtCamera: boolean;

  // Lip sync
  currentViseme: Viseme;
  visemeWeight: number;
  targetViseme: Viseme;
  targetVisemeWeight: number;
  visemeBlendSpeed: number;
  audioAmplitude: number;
  audioContextState: 'running' | 'suspended' | 'closed' | null;
  analyserConnected: boolean;

  // Blink state
  isBlinking: boolean;

  // Blend shapes (computed)
  blendShapes: Partial<BlendShapes>;

  // Timing
  stateStartTime: number;
  lastBlinkTime: number;
  lastGazeShiftTime: number;
  nextBlinkTime: number;
  nextGazeShiftTime: number;

  // Gaze
  gazeX: number;
  gazeY: number;
  targetGazeX: number;
  targetGazeY: number;

  // Head
  headPitch: number;
  headYaw: number;
  headRoll: number;
  targetHeadPitch: number;
  targetHeadYaw: number;
  targetHeadRoll: number;

  // Actions
  setState: (state: AvatarState) => void;
  setEmotion: (emotion: Emotion, intensity?: number, transitionSpeed?: number) => void;
  setEnergy: (energy: number) => void;
  setGesture: (gesture: Gesture) => void;
  setViseme: (viseme: Viseme, weight: number) => void;
  setAudioAmplitude: (amplitude: number) => void;
  setAudioContextState: (state: 'running' | 'suspended' | 'closed' | null) => void;
  setAnalyserConnected: (connected: boolean) => void;
  setPerformance: (performance: AvatarPerformance) => void;
  updateBlendShapes: (shapes: Partial<BlendShapes>) => void;
  blink: () => void;
  shiftGaze: (x: number, y: number) => void;

  // === NEW: Enhanced actions ===
  setArchetype: (archetype: PersonaArchetype) => void;
  setEmotionCurve: (curve: EmotionCurvePoint[]) => void;
  setEyeContact: (enabled: boolean, strength?: number) => void;
  triggerMicroExpression: (type: MicroExpression['type']) => void;
  lookAtCamera: () => void;
  lookAway: () => void;

  tick: (deltaTime: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const defaultBlendShapes: Partial<BlendShapes> = {
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  jawOpen: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  browInnerUp: 0,
};

// Archetype-specific idle behavior settings
const ARCHETYPE_BEHAVIORS: Record<PersonaArchetype, {
  blinkInterval: [number, number];      // [min, max] ms
  gazeShiftInterval: [number, number];  // [min, max] ms
  microExpressionRate: number;          // per minute
  breathingRate: number;                // Hz
  movementScale: number;                // multiplier for head movement
  stillness: number;                    // 0 = fidgety, 1 = statuesque
}> = {
  sage: { blinkInterval: [4000, 7000], gazeShiftInterval: [3000, 6000], microExpressionRate: 2, breathingRate: 0.2, movementScale: 0.5, stillness: 0.8 },
  hero: { blinkInterval: [3000, 5000], gazeShiftInterval: [2000, 4000], microExpressionRate: 4, breathingRate: 0.3, movementScale: 0.8, stillness: 0.6 },
  creator: { blinkInterval: [2500, 4500], gazeShiftInterval: [1500, 3500], microExpressionRate: 8, breathingRate: 0.35, movementScale: 1.2, stillness: 0.3 },
  caregiver: { blinkInterval: [3000, 5500], gazeShiftInterval: [2500, 4500], microExpressionRate: 5, breathingRate: 0.25, movementScale: 0.7, stillness: 0.6 },
  ruler: { blinkInterval: [5000, 8000], gazeShiftInterval: [4000, 7000], microExpressionRate: 1, breathingRate: 0.18, movementScale: 0.3, stillness: 0.95 },
  jester: { blinkInterval: [2000, 3500], gazeShiftInterval: [1000, 2500], microExpressionRate: 12, breathingRate: 0.45, movementScale: 1.5, stillness: 0.1 },
  rebel: { blinkInterval: [2500, 4000], gazeShiftInterval: [1500, 3000], microExpressionRate: 6, breathingRate: 0.4, movementScale: 1.0, stillness: 0.4 },
  lover: { blinkInterval: [3500, 6000], gazeShiftInterval: [3000, 5000], microExpressionRate: 4, breathingRate: 0.22, movementScale: 0.6, stillness: 0.7 },
  explorer: { blinkInterval: [2500, 4500], gazeShiftInterval: [1500, 3000], microExpressionRate: 6, breathingRate: 0.35, movementScale: 1.1, stillness: 0.3 },
  innocent: { blinkInterval: [2500, 4000], gazeShiftInterval: [2000, 4000], microExpressionRate: 5, breathingRate: 0.3, movementScale: 0.8, stillness: 0.5 },
  magician: { blinkInterval: [4500, 7500], gazeShiftInterval: [3500, 6000], microExpressionRate: 2, breathingRate: 0.2, movementScale: 0.4, stillness: 0.85 },
  outlaw: { blinkInterval: [2000, 3500], gazeShiftInterval: [1000, 2500], microExpressionRate: 8, breathingRate: 0.42, movementScale: 1.3, stillness: 0.2 },
  default: { blinkInterval: [3000, 5500], gazeShiftInterval: [2000, 4000], microExpressionRate: 4, breathingRate: 0.25, movementScale: 1.0, stillness: 0.5 },
};

// Emotion blend shape targets (what each emotion looks like at full intensity)
const EMOTION_BLEND_TARGETS: Record<Emotion, Partial<BlendShapes>> = {
  neutral: {},
  happy: {
    mouthSmileLeft: 0.7,
    mouthSmileRight: 0.7,
    cheekSquintLeft: 0.4,
    cheekSquintRight: 0.4,
    eyeSquintLeft: 0.2,
    eyeSquintRight: 0.2,
  },
  sad: {
    mouthFrownLeft: 0.5,
    mouthFrownRight: 0.5,
    browInnerUp: 0.6,
    eyeLookDownLeft: 0.2,
    eyeLookDownRight: 0.2,
  },
  angry: {
    browDownLeft: 0.7,
    browDownRight: 0.7,
    noseSneerLeft: 0.4,
    noseSneerRight: 0.4,
    jawForward: 0.2,
    mouthPressLeft: 0.3,
    mouthPressRight: 0.3,
  },
  surprised: {
    eyeWideLeft: 0.8,
    eyeWideRight: 0.8,
    browInnerUp: 0.7,
    browOuterUpLeft: 0.6,
    browOuterUpRight: 0.6,
    jawOpen: 0.4,
  },
  curious: {
    browOuterUpLeft: 0.5,
    browInnerUp: 0.3,
    eyeWideLeft: 0.2,
    eyeWideRight: 0.2,
  },
  focused: {
    browDownLeft: 0.4,
    browDownRight: 0.4,
    eyeSquintLeft: 0.3,
    eyeSquintRight: 0.3,
  },
  playful: {
    mouthSmileLeft: 0.5,
    mouthSmileRight: 0.6,  // Asymmetric smirk
    browOuterUpLeft: 0.3,
    cheekSquintLeft: 0.2,
    cheekSquintRight: 0.3,
  },
  concerned: {
    browInnerUp: 0.5,
    browDownLeft: 0.2,
    browDownRight: 0.2,
    mouthFrownLeft: 0.2,
    mouthFrownRight: 0.2,
  },
  confident: {
    mouthSmileLeft: 0.3,
    mouthSmileRight: 0.3,
    browDownLeft: 0.1,
    browDownRight: 0.1,
    jawForward: 0.1,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lerp (linear interpolation) with easing
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth step easing
 */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Perlin-like noise for natural movement
 */
function noise(t: number, seed: number = 0): number {
  const x = Math.sin(t * 1.1 + seed) * 0.5 +
            Math.sin(t * 2.3 + seed * 2) * 0.25 +
            Math.sin(t * 4.7 + seed * 3) * 0.125;
  return x / 0.875; // Normalize to roughly -1 to 1
}

/**
 * Get random value in range
 */
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useAvatarStore = create<AvatarStoreState>((set, get) => ({
  // Core state
  state: 'idle',
  emotion: 'neutral',
  energy: 0.5,
  gesture: 'none',

  // Smooth emotion blending
  targetEmotion: 'neutral',
  emotionIntensity: 0,
  targetEmotionIntensity: 0,
  emotionTransitionSpeed: 0.08,  // Smooth by default
  emotionCurve: [],
  emotionCurveStartTime: 0,

  // Persona archetype
  archetype: 'default',

  // Micro-expressions
  activeMicroExpressions: [],
  nextMicroExpressionTime: Date.now() + 5000,

  // Breathing
  breathingRate: 0.25,
  breathingDepth: 0.5,
  breathingPhase: 0,

  // Eye contact
  eyeContactEnabled: true,
  eyeContactStrength: 0.7,
  lookAwayTimer: Date.now() + 8000,
  isLookingAtCamera: true,

  // Lip sync
  currentViseme: 'sil',
  visemeWeight: 0,
  targetViseme: 'sil',
  targetVisemeWeight: 0,
  visemeBlendSpeed: 0.3,
  audioAmplitude: 0,
  audioContextState: null,
  analyserConnected: false,

  // Blink state
  isBlinking: false,

  // Blend shapes
  blendShapes: defaultBlendShapes,

  // Timing
  stateStartTime: Date.now(),
  lastBlinkTime: Date.now(),
  lastGazeShiftTime: Date.now(),
  nextBlinkTime: Date.now() + 3000 + Math.random() * 2500,
  nextGazeShiftTime: Date.now() + 2000 + Math.random() * 2000,

  // Gaze
  gazeX: 0,
  gazeY: 0,
  targetGazeX: 0,
  targetGazeY: 0,

  // Head
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  targetHeadPitch: 0,
  targetHeadYaw: 0,
  targetHeadRoll: 0,

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  setState: (state) => {
    const prevState = get().state;
    const archetype = get().archetype;
    const behavior = ARCHETYPE_BEHAVIORS[archetype];

    // Adjust breathing based on state
    let breathingRate = behavior.breathingRate;
    if (state === 'speaking') breathingRate *= 1.3;
    if (state === 'thinking') breathingRate *= 0.8;
    if (state === 'listening') breathingRate *= 1.1;

    set({
      state,
      stateStartTime: Date.now(),
      breathingRate,
      // Look at camera when listening or speaking
      isLookingAtCamera: state === 'listening' || state === 'speaking',
    });
  },

  setEmotion: (emotion, intensity = 0.7, transitionSpeed = 0.08) => {
    set({
      targetEmotion: emotion,
      targetEmotionIntensity: Math.max(0, Math.min(1, intensity)),
      emotionTransitionSpeed: transitionSpeed,
    });
  },

  setEnergy: (energy) => set({ energy: Math.max(0, Math.min(1, energy)) }),

  setGesture: (gesture) => set({ gesture }),

  setViseme: (viseme, weight) => set({
    targetViseme: viseme,
    targetVisemeWeight: weight,
  }),

  setAudioAmplitude: (amplitude) => set({
    audioAmplitude: Math.max(0, Math.min(1, amplitude)),
  }),

  setAudioContextState: (audioContextState) => set({ audioContextState }),

  setAnalyserConnected: (analyserConnected) => set({ analyserConnected }),

  setPerformance: (performance) => set({
    targetEmotion: performance.emotion,
    targetEmotionIntensity: performance.energy,
    energy: performance.energy,
    gesture: performance.gesture,
  }),

  updateBlendShapes: (shapes) => set((state) => ({
    blendShapes: { ...state.blendShapes, ...shapes },
  })),

  blink: () => {
    set({ lastBlinkTime: Date.now() });
  },

  shiftGaze: (x, y) => set({
    targetGazeX: x,
    targetGazeY: y,
    lastGazeShiftTime: Date.now(),
  }),

  // === NEW ACTIONS ===

  setArchetype: (archetype) => {
    const behavior = ARCHETYPE_BEHAVIORS[archetype];
    set({
      archetype,
      breathingRate: behavior.breathingRate,
      breathingDepth: 1 - behavior.stillness * 0.5,
    });
  },

  setEmotionCurve: (curve) => set({
    emotionCurve: curve,
    emotionCurveStartTime: Date.now(),
  }),

  setEyeContact: (enabled, strength = 0.7) => set({
    eyeContactEnabled: enabled,
    eyeContactStrength: Math.max(0, Math.min(1, strength)),
  }),

  triggerMicroExpression: (type) => {
    const now = Date.now();
    const duration = type === 'brow_flash' ? 200 : type === 'eye_squint' ? 400 : 300;
    const intensity = 0.15 + Math.random() * 0.2;

    set((state) => ({
      activeMicroExpressions: [
        ...state.activeMicroExpressions.filter(m => now - m.startTime < m.duration),
        { type, intensity, duration, startTime: now }
      ],
    }));
  },

  lookAtCamera: () => set({
    isLookingAtCamera: true,
    targetGazeX: 0,
    targetGazeY: 0,
    lookAwayTimer: Date.now() + 6000 + Math.random() * 4000,
  }),

  lookAway: () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.2 + Math.random() * 0.2;
    set({
      isLookingAtCamera: false,
      targetGazeX: Math.cos(angle) * distance,
      targetGazeY: Math.sin(angle) * distance * 0.6,
      lookAwayTimer: Date.now() + 1500 + Math.random() * 2000,
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANIMATION TICK - THE SOUL OF THE AVATAR
  // ═══════════════════════════════════════════════════════════════════════════

  tick: (deltaTime) => {
    const state = get();
    const now = Date.now();
    const behavior = ARCHETYPE_BEHAVIORS[state.archetype];
    const timeSinceStateChange = now - state.stateStartTime;

    // ═════════════════════════════════════════════════════════════════════════
    // 1. EMOTION BLENDING - Smooth transitions between emotions
    // ═════════════════════════════════════════════════════════════════════════

    let currentEmotionIntensity = state.emotionIntensity;
    let currentEmotion = state.emotion;

    // Process emotion curve if active
    if (state.emotionCurve.length > 0 && state.emotionCurveStartTime > 0) {
      const curveTime = (now - state.emotionCurveStartTime) / 1000;
      const totalDuration = state.emotionCurve[state.emotionCurve.length - 1]?.time || 1;
      const normalizedTime = Math.min(1, curveTime / totalDuration);

      // Find current segment in curve
      for (let i = 0; i < state.emotionCurve.length - 1; i++) {
        const curr = state.emotionCurve[i];
        const next = state.emotionCurve[i + 1];
        if (normalizedTime >= curr.time && normalizedTime < next.time) {
          const segmentProgress = (normalizedTime - curr.time) / (next.time - curr.time);
          const easedProgress = smoothstep(segmentProgress);
          currentEmotionIntensity = lerp(curr.intensity, next.intensity, easedProgress);
          // Use the emotion from the current segment
          currentEmotion = curr.emotion;
          break;
        }
      }
    }

    // Smooth blend toward target emotion
    const emotionLerp = state.emotionTransitionSpeed;
    currentEmotionIntensity = lerp(state.emotionIntensity, state.targetEmotionIntensity, emotionLerp);

    // Blend emotion if different
    if (state.emotion !== state.targetEmotion && currentEmotionIntensity < 0.1) {
      currentEmotion = state.targetEmotion;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. BREATHING - Natural, state-aware breathing
    // ═════════════════════════════════════════════════════════════════════════

    const breathingPeriod = 1000 / state.breathingRate;
    const newBreathingPhase = (state.breathingPhase + deltaTime / breathingPeriod) % 1;

    // Breathing affects head and body
    const breathValue = Math.sin(newBreathingPhase * Math.PI * 2);
    const breathScale = state.breathingDepth * behavior.movementScale;

    // ═════════════════════════════════════════════════════════════════════════
    // 3. EYE CONTACT - Camera-aware natural gaze
    // ═════════════════════════════════════════════════════════════════════════

    let newTargetGazeX = state.targetGazeX;
    let newTargetGazeY = state.targetGazeY;
    let isLookingAtCamera = state.isLookingAtCamera;
    let lookAwayTimer = state.lookAwayTimer;

    if (state.eyeContactEnabled) {
      // Check if it's time to toggle look away/at camera
      if (now >= state.lookAwayTimer) {
        if (state.isLookingAtCamera) {
          // Look away briefly (natural behavior)
          const angle = Math.random() * Math.PI * 2;
          const distance = 0.15 + Math.random() * 0.15;
          newTargetGazeX = Math.cos(angle) * distance;
          newTargetGazeY = Math.sin(angle) * distance * 0.6;
          isLookingAtCamera = false;
          lookAwayTimer = now + 800 + Math.random() * 1200; // Look away for 0.8-2s
        } else {
          // Return to camera
          newTargetGazeX = 0;
          newTargetGazeY = 0;
          isLookingAtCamera = true;
          lookAwayTimer = now + 5000 + Math.random() * 5000; // Look at camera for 5-10s
        }
      }

      // In listening/speaking states, stronger eye contact
      if (state.state === 'listening' || state.state === 'speaking') {
        const contactBias = state.eyeContactStrength * 0.5;
        newTargetGazeX = lerp(newTargetGazeX, 0, contactBias);
        newTargetGazeY = lerp(newTargetGazeY, 0, contactBias);
      }
    }

    // Add micro-saccades (tiny eye movements that make eyes look alive)
    const saccadeX = noise(now * 0.003, 1) * 0.02;
    const saccadeY = noise(now * 0.003, 2) * 0.015;

    // Smooth gaze interpolation
    const gazeLerp = 0.08;
    const newGazeX = lerp(state.gazeX, newTargetGazeX + saccadeX, gazeLerp);
    const newGazeY = lerp(state.gazeY, newTargetGazeY + saccadeY, gazeLerp);

    // ═════════════════════════════════════════════════════════════════════════
    // 4. BLINKING - Natural, emotion-aware blinks
    // ═════════════════════════════════════════════════════════════════════════

    const shouldBlink = now >= state.nextBlinkTime;
    const [minBlink, maxBlink] = behavior.blinkInterval;

    // Blink more when surprised, less when focused
    let blinkModifier = 1;
    if (currentEmotion === 'surprised') blinkModifier = 0.5;
    if (currentEmotion === 'focused') blinkModifier = 1.5;

    // Blink animation - proper 0→1→0 curve
    const timeSinceBlink = now - state.lastBlinkTime;
    const BLINK_DURATION = 150;
    const BLINK_CLOSE_TIME = 75;
    const currentlyBlinking = timeSinceBlink < BLINK_DURATION;

    let blinkValue = 0;
    if (currentlyBlinking) {
      if (timeSinceBlink < BLINK_CLOSE_TIME) {
        const progress = timeSinceBlink / BLINK_CLOSE_TIME;
        blinkValue = progress * progress; // ease-in
      } else {
        const progress = (timeSinceBlink - BLINK_CLOSE_TIME) / BLINK_CLOSE_TIME;
        blinkValue = 1 - progress * progress; // ease-out
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. MICRO-EXPRESSIONS - Subtle life
    // ═════════════════════════════════════════════════════════════════════════

    let activeMicroExpressions = state.activeMicroExpressions.filter(
      m => now - m.startTime < m.duration
    );

    // Trigger random micro-expressions based on archetype rate
    const microExpressionInterval = 60000 / behavior.microExpressionRate;
    if (now >= state.nextMicroExpressionTime && state.state === 'idle') {
      const types: MicroExpression['type'][] = ['nostril_flare', 'lip_corner', 'brow_flash', 'eye_squint', 'cheek_raise'];
      const type = types[Math.floor(Math.random() * types.length)];
      const intensity = 0.1 + Math.random() * 0.15;
      const duration = 200 + Math.random() * 200;

      activeMicroExpressions.push({ type, intensity, duration, startTime: now });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6. HEAD MOVEMENT - State and breathing aware
    // ═════════════════════════════════════════════════════════════════════════

    let targetHeadPitch = breathValue * 0.01 * breathScale;
    let targetHeadYaw = 0;
    let targetHeadRoll = 0;

    // State-based head positioning
    switch (state.state) {
      case 'listening':
        targetHeadPitch = 0.05; // Slight forward lean
        targetHeadYaw = noise(now * 0.001, 3) * 0.03 * behavior.movementScale;
        targetHeadRoll = 0.02; // Slight tilt
        break;
      case 'thinking':
        targetHeadPitch = -0.03; // Look slightly up
        targetHeadYaw = 0.08; // Look to side
        targetHeadRoll = noise(now * 0.0005, 4) * 0.02;
        break;
      case 'speaking':
        targetHeadPitch = breathValue * 0.015 + state.audioAmplitude * 0.03;
        targetHeadYaw = noise(now * 0.002, 5) * 0.05 * state.energy;
        targetHeadRoll = noise(now * 0.0015, 6) * 0.03 * state.energy;
        break;
      default: // idle
        targetHeadPitch = breathValue * 0.01 + noise(now * 0.0003, 7) * 0.01 * behavior.movementScale;
        targetHeadYaw = noise(now * 0.0004, 8) * 0.02 * behavior.movementScale;
        targetHeadRoll = noise(now * 0.0002, 9) * 0.01 * behavior.movementScale;
    }

    // Smooth head movement
    const headLerp = 0.05;
    const newHeadPitch = lerp(state.headPitch, targetHeadPitch, headLerp);
    const newHeadYaw = lerp(state.headYaw, targetHeadYaw, headLerp);
    const newHeadRoll = lerp(state.headRoll, targetHeadRoll, headLerp);

    // ═════════════════════════════════════════════════════════════════════════
    // 7. VISEME BLENDING - Smooth mouth shape transitions
    // ═════════════════════════════════════════════════════════════════════════

    const visemeLerp = state.visemeBlendSpeed;
    const newVisemeWeight = lerp(state.visemeWeight, state.targetVisemeWeight, visemeLerp);
    const newViseme = newVisemeWeight < 0.1 ? state.targetViseme : state.currentViseme;

    // ═════════════════════════════════════════════════════════════════════════
    // 8. COMPUTE FINAL BLEND SHAPES
    // ═════════════════════════════════════════════════════════════════════════

    const newBlendShapes: Partial<BlendShapes> = { ...defaultBlendShapes };

    // Apply blink
    newBlendShapes.eyeBlinkLeft = blinkValue;
    newBlendShapes.eyeBlinkRight = blinkValue;

    // Apply gaze to eye look shapes
    if (!currentlyBlinking) {
      const gazeScale = 0.5;
      if (newGazeX > 0) {
        newBlendShapes.eyeLookOutLeft = newGazeX * gazeScale;
        newBlendShapes.eyeLookInRight = newGazeX * gazeScale;
      } else {
        newBlendShapes.eyeLookInLeft = -newGazeX * gazeScale;
        newBlendShapes.eyeLookOutRight = -newGazeX * gazeScale;
      }
      if (newGazeY > 0) {
        newBlendShapes.eyeLookUpLeft = newGazeY * gazeScale;
        newBlendShapes.eyeLookUpRight = newGazeY * gazeScale;
      } else {
        newBlendShapes.eyeLookDownLeft = -newGazeY * gazeScale;
        newBlendShapes.eyeLookDownRight = -newGazeY * gazeScale;
      }
    }

    // Apply emotion blend shapes
    const emotionShapes = EMOTION_BLEND_TARGETS[currentEmotion];
    for (const [key, value] of Object.entries(emotionShapes)) {
      const blendKey = key as keyof BlendShapes;
      newBlendShapes[blendKey] = (value as number) * currentEmotionIntensity * state.energy;
    }

    // Apply lip sync
    if (state.state === 'speaking') {
      // Base jaw movement from amplitude
      const jawBase = state.audioAmplitude * 0.7;
      newBlendShapes.jawOpen = Math.max(newBlendShapes.jawOpen || 0, jawBase);

      // Apply viseme shapes
      const visemeShapes = VISEME_TO_BLENDSHAPES[newViseme];
      for (const [key, value] of Object.entries(visemeShapes)) {
        const blendKey = key as keyof BlendShapes;
        const visemeValue = (value as number) * newVisemeWeight;
        newBlendShapes[blendKey] = Math.max(newBlendShapes[blendKey] || 0, visemeValue);
      }
    }

    // Apply micro-expressions
    for (const micro of activeMicroExpressions) {
      const elapsed = now - micro.startTime;
      const progress = elapsed / micro.duration;
      const intensity = micro.intensity * Math.sin(progress * Math.PI); // Smooth in-out

      switch (micro.type) {
        case 'nostril_flare':
          newBlendShapes.noseSneerLeft = (newBlendShapes.noseSneerLeft || 0) + intensity;
          newBlendShapes.noseSneerRight = (newBlendShapes.noseSneerRight || 0) + intensity;
          break;
        case 'lip_corner':
          newBlendShapes.mouthSmileLeft = (newBlendShapes.mouthSmileLeft || 0) + intensity * 0.5;
          break;
        case 'brow_flash':
          newBlendShapes.browInnerUp = (newBlendShapes.browInnerUp || 0) + intensity;
          break;
        case 'eye_squint':
          newBlendShapes.eyeSquintLeft = (newBlendShapes.eyeSquintLeft || 0) + intensity;
          newBlendShapes.eyeSquintRight = (newBlendShapes.eyeSquintRight || 0) + intensity;
          break;
        case 'cheek_raise':
          newBlendShapes.cheekSquintLeft = (newBlendShapes.cheekSquintLeft || 0) + intensity * 0.5;
          newBlendShapes.cheekSquintRight = (newBlendShapes.cheekSquintRight || 0) + intensity * 0.5;
          break;
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 9. UPDATE STATE
    // ═════════════════════════════════════════════════════════════════════════

    set({
      // Emotion
      emotion: currentEmotion,
      emotionIntensity: currentEmotionIntensity,

      // Breathing
      breathingPhase: newBreathingPhase,

      // Eye contact
      gazeX: newGazeX,
      gazeY: newGazeY,
      targetGazeX: newTargetGazeX,
      targetGazeY: newTargetGazeY,
      isLookingAtCamera,
      lookAwayTimer,

      // Blink
      isBlinking: currentlyBlinking,
      lastBlinkTime: shouldBlink ? now : state.lastBlinkTime,
      nextBlinkTime: shouldBlink
        ? now + randomRange(minBlink, maxBlink) * blinkModifier
        : state.nextBlinkTime,

      // Micro-expressions
      activeMicroExpressions,
      nextMicroExpressionTime: now >= state.nextMicroExpressionTime
        ? now + microExpressionInterval * (0.5 + Math.random())
        : state.nextMicroExpressionTime,

      // Head
      headPitch: newHeadPitch,
      headYaw: newHeadYaw,
      headRoll: newHeadRoll,

      // Viseme
      currentViseme: newViseme,
      visemeWeight: newVisemeWeight,

      // Blend shapes
      blendShapes: newBlendShapes,
    });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// VISEME MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const VISEME_TO_BLENDSHAPES: Record<Viseme, Partial<BlendShapes>> = {
  sil: { jawOpen: 0, mouthClose: 0.1 },
  PP: { jawOpen: 0, mouthPressLeft: 0.8, mouthPressRight: 0.8 },
  FF: { jawOpen: 0.1, mouthFunnel: 0.3, mouthLowerDownLeft: 0.3, mouthLowerDownRight: 0.3 },
  TH: { jawOpen: 0.15, tongueOut: 0.3 },
  DD: { jawOpen: 0.2, mouthUpperUpLeft: 0.2, mouthUpperUpRight: 0.2 },
  kk: { jawOpen: 0.25, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  CH: { jawOpen: 0.3, mouthFunnel: 0.4, mouthPucker: 0.3 },
  SS: { jawOpen: 0.15, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 },
  nn: { jawOpen: 0.2, mouthClose: 0.3 },
  RR: { jawOpen: 0.25, mouthFunnel: 0.3 },
  aa: { jawOpen: 0.6, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  E: { jawOpen: 0.4, mouthSmileLeft: 0.3, mouthSmileRight: 0.3 },
  I: { jawOpen: 0.25, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 },
  O: { jawOpen: 0.5, mouthFunnel: 0.6, mouthPucker: 0.4 },
  U: { jawOpen: 0.3, mouthFunnel: 0.7, mouthPucker: 0.6 },
};

export default useAvatarStore;
