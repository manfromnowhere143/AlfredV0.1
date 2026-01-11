/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVATAR STATE STORE - Zustand-powered real-time avatar state machine
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State machine for avatar with sub-50ms state transitions.
 * Drives: idle, listening, thinking, speaking states
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

export interface AvatarStoreState {
  // Core state
  state: AvatarState;
  emotion: Emotion;
  energy: number;
  gesture: Gesture;

  // Lip sync
  currentViseme: Viseme;
  visemeWeight: number;
  audioAmplitude: number;
  audioContextState: 'running' | 'suspended' | 'closed' | null;
  analyserConnected: boolean;

  // Blink state (computed from blendShapes)
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

  // Actions
  setState: (state: AvatarState) => void;
  setEmotion: (emotion: Emotion) => void;
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
  tick: (deltaTime: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════════

const defaultBlendShapes: Partial<BlendShapes> = {
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  jawOpen: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  browInnerUp: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useAvatarStore = create<AvatarStoreState>((set, get) => ({
  // Core state
  state: 'idle',
  emotion: 'neutral',
  energy: 0.5,
  gesture: 'none',

  // Lip sync
  currentViseme: 'sil',
  visemeWeight: 0,
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
  nextBlinkTime: Date.now() + 2500 + Math.random() * 3000, // 2.5-5.5s from now
  nextGazeShiftTime: Date.now() + 1000 + Math.random() * 3000, // 1-4s from now

  // Gaze
  gazeX: 0,
  gazeY: 0,
  targetGazeX: 0,
  targetGazeY: 0,

  // Head
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,

  // Actions
  setState: (state) => set({
    state,
    stateStartTime: Date.now(),
  }),

  setEmotion: (emotion) => set({ emotion }),

  setEnergy: (energy) => set({ energy: Math.max(0, Math.min(1, energy)) }),

  setGesture: (gesture) => set({ gesture }),

  setViseme: (viseme, weight) => set({
    currentViseme: viseme,
    visemeWeight: weight,
  }),

  setAudioAmplitude: (amplitude) => set({
    audioAmplitude: Math.max(0, Math.min(1, amplitude)),
  }),

  setAudioContextState: (audioContextState) => set({ audioContextState }),

  setAnalyserConnected: (analyserConnected) => set({ analyserConnected }),

  setPerformance: (performance) => set({
    emotion: performance.emotion,
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

  // Main animation tick - called every frame
  tick: (deltaTime) => {
    const state = get();
    const now = Date.now();
    const timeSinceStateChange = now - state.stateStartTime;

    // Smooth gaze interpolation
    const gazeLerp = 0.1;
    const newGazeX = state.gazeX + (state.targetGazeX - state.gazeX) * gazeLerp;
    const newGazeY = state.gazeY + (state.targetGazeY - state.gazeY) * gazeLerp;

    // Auto-blink - check against stored next blink time
    const shouldBlink = now >= state.nextBlinkTime;

    // Auto gaze shift (only when idle) - check against stored next gaze time
    const shouldShiftGaze = state.state === 'idle' && now >= state.nextGazeShiftTime;

    // Compute blend shapes based on state
    const newBlendShapes: Partial<BlendShapes> = { ...state.blendShapes };

    // Blink animation - proper 0→1→0 curve
    const timeSinceBlink = now - state.lastBlinkTime;
    const BLINK_DURATION = 150; // Total blink duration in ms
    const BLINK_CLOSE_TIME = 75; // Time to close (first half)

    // Track if we're currently blinking
    const currentlyBlinking = timeSinceBlink < BLINK_DURATION;

    if (currentlyBlinking) {
      // Currently blinking
      if (timeSinceBlink < BLINK_CLOSE_TIME) {
        // Closing phase (0 → 1)
        const progress = timeSinceBlink / BLINK_CLOSE_TIME;
        // Use ease-in for closing
        const eased = progress * progress;
        newBlendShapes.eyeBlinkLeft = eased;
        newBlendShapes.eyeBlinkRight = eased;
      } else {
        // Opening phase (1 → 0)
        const progress = (timeSinceBlink - BLINK_CLOSE_TIME) / BLINK_CLOSE_TIME;
        // Use ease-out for opening
        const eased = 1 - progress * progress;
        newBlendShapes.eyeBlinkLeft = eased;
        newBlendShapes.eyeBlinkRight = eased;
      }
    } else {
      // Eyes fully open
      newBlendShapes.eyeBlinkLeft = 0;
      newBlendShapes.eyeBlinkRight = 0;
    }

    // Lip sync from audio amplitude (simple but effective)
    if (state.state === 'speaking') {
      newBlendShapes.jawOpen = state.audioAmplitude * 0.7;
      newBlendShapes.mouthFunnel = state.audioAmplitude * 0.3;
    } else {
      newBlendShapes.jawOpen = 0;
      newBlendShapes.mouthFunnel = 0;
    }

    // Emotion-based expressions
    switch (state.emotion) {
      case 'happy':
        newBlendShapes.mouthSmileLeft = 0.6 * state.energy;
        newBlendShapes.mouthSmileRight = 0.6 * state.energy;
        newBlendShapes.cheekSquintLeft = 0.3 * state.energy;
        newBlendShapes.cheekSquintRight = 0.3 * state.energy;
        break;
      case 'sad':
        newBlendShapes.mouthFrownLeft = 0.4 * state.energy;
        newBlendShapes.mouthFrownRight = 0.4 * state.energy;
        newBlendShapes.browInnerUp = 0.5 * state.energy;
        break;
      case 'surprised':
        newBlendShapes.eyeWideLeft = 0.7 * state.energy;
        newBlendShapes.eyeWideRight = 0.7 * state.energy;
        newBlendShapes.browInnerUp = 0.6 * state.energy;
        newBlendShapes.jawOpen = 0.3 * state.energy;
        break;
      case 'curious':
        newBlendShapes.browOuterUpLeft = 0.4 * state.energy;
        newBlendShapes.browInnerUp = 0.3 * state.energy;
        break;
      case 'focused':
        newBlendShapes.browDownLeft = 0.3 * state.energy;
        newBlendShapes.browDownRight = 0.3 * state.energy;
        newBlendShapes.eyeSquintLeft = 0.2 * state.energy;
        newBlendShapes.eyeSquintRight = 0.2 * state.energy;
        break;
      case 'angry':
        newBlendShapes.browDownLeft = 0.6 * state.energy;
        newBlendShapes.browDownRight = 0.6 * state.energy;
        newBlendShapes.noseSneerLeft = 0.3 * state.energy;
        newBlendShapes.noseSneerRight = 0.3 * state.energy;
        break;
    }

    set({
      gazeX: newGazeX,
      gazeY: newGazeY,
      blendShapes: newBlendShapes,
      isBlinking: currentlyBlinking,
      lastBlinkTime: shouldBlink ? now : state.lastBlinkTime,
      nextBlinkTime: shouldBlink
        ? now + 2500 + Math.random() * 3000 // Next blink in 2.5-5.5s
        : state.nextBlinkTime,
      targetGazeX: shouldShiftGaze ? (Math.random() - 0.5) * 0.3 : state.targetGazeX,
      targetGazeY: shouldShiftGaze ? (Math.random() - 0.5) * 0.2 : state.targetGazeY,
      lastGazeShiftTime: shouldShiftGaze ? now : state.lastGazeShiftTime,
      nextGazeShiftTime: shouldShiftGaze
        ? now + 1000 + Math.random() * 3000 // Next gaze shift in 1-4s
        : state.nextGazeShiftTime,
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
