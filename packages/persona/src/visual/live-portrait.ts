/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAL ENGINE: LIVEPORTRAIT & SADTALKER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Real-time face animation and audio-driven lip sync.
 * Powers live video interactions with personas.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LivePortraitConfig {
  endpoint: string;
  apiKey: string;
  timeout?: number;
}

export interface SadTalkerConfig {
  endpoint: string;
  apiKey: string;
  timeout?: number;
}

export interface FaceRig {
  /** Eye blink (0-1) */
  eyeBlink: number;
  /** Eye look horizontal (-1 to 1) */
  eyeLookX: number;
  /** Eye look vertical (-1 to 1) */
  eyeLookY: number;
  /** Eyebrow raise (-1 to 1) */
  eyebrowRaise: number;
  /** Mouth open (0-1) */
  mouthOpen: number;
  /** Mouth shape (phoneme-based) */
  mouthShape: MouthShape;
  /** Head pitch (-1 to 1) */
  headPitch: number;
  /** Head yaw (-1 to 1) */
  headYaw: number;
  /** Head roll (-1 to 1) */
  headRoll: number;
}

export type MouthShape = 
  | 'neutral' 
  | 'A' | 'E' | 'I' | 'O' | 'U'
  | 'M' | 'B' | 'P'
  | 'F' | 'V'
  | 'TH'
  | 'L'
  | 'smile'
  | 'frown';

export interface DrivingParams {
  /** Lip openness (0-1) */
  lipOpen: number;
  /** Lip shape based on phoneme */
  lipShape: MouthShape;
  /** Eye blink state (0-1) */
  eyeBlink: number;
  /** Head pitch angle */
  headPitch: number;
  /** Head yaw angle */
  headYaw: number;
  /** Head roll angle */
  headRoll: number;
  /** Expression preset */
  expression: EmotionState;
}

export interface LipSyncRequest {
  /** Source persona image */
  sourceImageUrl: string;
  /** Audio file URL or base64 */
  audioSource: string;
  /** Is audio base64 encoded? */
  audioIsBase64?: boolean;
  /** Expression during speech */
  expression?: EmotionState;
  /** Head movement intensity (0-1) */
  headMovement?: number;
  /** Eye blink rate */
  blinkRate?: number;
  /** Output quality */
  quality?: 'fast' | 'balanced' | 'high';
}

export interface LipSyncResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  generationTimeMs: number;
  cost: number;
}

export interface RealTimeFrameResult {
  /** Generated frame as base64 */
  frameBase64: string;
  /** Frame width */
  width: number;
  /** Frame height */
  height: number;
  /** Generation latency in ms */
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVEPORTRAIT CLIENT - Real-time Face Animation
// ═══════════════════════════════════════════════════════════════════════════════

export class LivePortraitClient {
  private config: LivePortraitConfig;
  private sourceImage?: string;
  private initialized: boolean = false;

  constructor(config: LivePortraitConfig) {
    this.config = {
      timeout: 5000, // 5s for real-time
      ...config,
    };
  }

  /**
   * Initialize with source persona image
   */
  async initialize(sourceImageUrl: string): Promise<void> {
    const response = await fetch(`${this.config.endpoint}/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image: sourceImageUrl,
        retarget_eye: true,
        retarget_lip: true,
        stitching: true,
        relative: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LivePortrait init failed: ${response.statusText}`);
    }

    this.sourceImage = sourceImageUrl;
    this.initialized = true;
  }

  /**
   * Generate a single frame based on driving parameters
   * Used for real-time video calls
   */
  async drive(params: DrivingParams): Promise<RealTimeFrameResult> {
    if (!this.initialized) {
      throw new Error('LivePortrait not initialized. Call initialize() first.');
    }

    const startTime = performance.now();

    // Convert emotion to expression coefficients
    const expressionCoeffs = this.emotionToCoefficients(params.expression);

    const response = await fetch(`${this.config.endpoint}/drive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lip_open: params.lipOpen,
        lip_shape: params.lipShape,
        eye_blink: params.eyeBlink,
        head_pitch: params.headPitch,
        head_yaw: params.headYaw,
        head_roll: params.headRoll,
        expression_coeffs: expressionCoeffs,
      }),
    });

    if (!response.ok) {
      throw new Error(`LivePortrait drive failed: ${response.statusText}`);
    }

    const result = await response.json();
    const latencyMs = performance.now() - startTime;

    return {
      frameBase64: result.frame,
      width: result.width || 512,
      height: result.height || 512,
      latencyMs,
    };
  }

  /**
   * Generate idle animation frame
   */
  async generateIdleFrame(
    timestamp: number,
    baseEmotion: EmotionState = 'neutral'
  ): Promise<RealTimeFrameResult> {
    // Natural idle behavior
    const blinkCycle = this.calculateBlink(timestamp);
    const breathCycle = this.calculateBreathing(timestamp);
    const microMovement = this.calculateMicroMovement(timestamp);

    return this.drive({
      lipOpen: 0,
      lipShape: 'neutral',
      eyeBlink: blinkCycle,
      headPitch: breathCycle * 0.02 + microMovement.pitch,
      headYaw: microMovement.yaw,
      headRoll: microMovement.roll,
      expression: baseEmotion,
    });
  }

  /**
   * Convert emotion to expression coefficients
   */
  private emotionToCoefficients(emotion: EmotionState): number[] {
    // 64-dim expression coefficient vector
    // This is a simplified mapping; real impl uses trained model
    const baseCoeffs = new Array(64).fill(0);

    const emotionMappings: Record<EmotionState, Partial<Record<number, number>>> = {
      neutral: {},
      happy: { 0: 0.5, 12: 0.3, 45: 0.4 },      // Smile muscles
      sad: { 0: -0.2, 15: 0.3, 20: 0.4 },       // Frown muscles  
      angry: { 4: 0.4, 9: 0.3, 15: 0.2 },       // Brow furrow
      surprised: { 1: 0.5, 2: 0.5, 25: 0.3 },   // Wide eyes, raised brows
      thoughtful: { 4: 0.2, 20: 0.1 },          // Slight furrow
      excited: { 0: 0.6, 1: 0.3, 12: 0.4 },     // Big smile, raised brows
      calm: { 20: -0.1 },                        // Relaxed
      confident: { 0: 0.2, 4: 0.1 },            // Slight smirk
      curious: { 1: 0.3, 4: 0.2 },              // Raised eyebrow
      concerned: { 1: 0.2, 15: 0.2, 20: 0.2 },  // Worried brow
    };

    const mapping = emotionMappings[emotion] || {};
    for (const [idx, value] of Object.entries(mapping)) {
      baseCoeffs[parseInt(idx)] = value as number;
    }

    return baseCoeffs;
  }

  /**
   * Calculate natural blink timing
   */
  private calculateBlink(timestamp: number): number {
    // Average blink every 4-6 seconds, lasting ~150ms
    const blinkInterval = 5000;
    const blinkDuration = 150;
    const phase = timestamp % blinkInterval;
    
    if (phase < blinkDuration / 2) {
      return phase / (blinkDuration / 2);
    } else if (phase < blinkDuration) {
      return 1 - (phase - blinkDuration / 2) / (blinkDuration / 2);
    }
    return 0;
  }

  /**
   * Calculate breathing motion
   */
  private calculateBreathing(timestamp: number): number {
    // Breath cycle ~4 seconds
    const breathPeriod = 4000;
    const phase = (timestamp % breathPeriod) / breathPeriod;
    return Math.sin(phase * Math.PI * 2);
  }

  /**
   * Calculate subtle micro-movements
   */
  private calculateMicroMovement(timestamp: number): {
    pitch: number;
    yaw: number;
    roll: number;
  } {
    const scale = 0.02;
    return {
      pitch: Math.sin(timestamp * 0.0003) * scale,
      yaw: Math.sin(timestamp * 0.0005 + 1) * scale,
      roll: Math.sin(timestamp * 0.0002 + 2) * scale * 0.5,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.initialized) {
      await fetch(`${this.config.endpoint}/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }).catch(() => {}); // Ignore cleanup errors
      
      this.initialized = false;
      this.sourceImage = undefined;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SADTALKER CLIENT - Audio-Driven Lip Sync
// ═══════════════════════════════════════════════════════════════════════════════

export class SadTalkerClient {
  private config: SadTalkerConfig;

  constructor(config: SadTalkerConfig) {
    this.config = {
      timeout: 120000, // 2 minutes
      ...config,
    };
  }

  /**
   * Generate lip-synced video from image and audio
   */
  async generateLipSync(request: LipSyncRequest): Promise<LipSyncResult> {
    const startTime = Date.now();

    // Get expression enhancer settings
    const expressionSettings = this.getExpressionSettings(request.expression);

    const payload = {
      source_image: request.sourceImageUrl,
      driven_audio: request.audioSource,
      audio_is_base64: request.audioIsBase64 || false,
      
      // Expression settings
      expression_scale: expressionSettings.scale,
      input_yaw: expressionSettings.yaw,
      input_pitch: expressionSettings.pitch,
      input_roll: expressionSettings.roll,
      
      // Animation settings
      enhancer: 'gfpgan', // Face restoration
      background_enhancer: 'realesrgan',
      
      // Motion settings
      still: false, // Allow natural motion
      preprocess: 'crop', // or 'full' for full frame
      
      // Head movement
      pose_style: request.headMovement ? Math.round(request.headMovement * 46) : 0,
      
      // Quality
      size: request.quality === 'high' ? 512 : request.quality === 'fast' ? 256 : 384,
      facerender: request.quality === 'high' ? 'pirender' : 'facevid2vid',
    };

    // Submit job
    const response = await fetch(`${this.config.endpoint}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: payload }),
    });

    if (!response.ok) {
      throw new Error(`SadTalker API error: ${response.statusText}`);
    }

    const job = await response.json();
    
    // Poll for completion
    const result = await this.pollForCompletion(job.id);

    const generationTimeMs = Date.now() - startTime;
    const duration = result.output.duration || 5;
    const cost = this.calculateCost(duration, request.quality || 'balanced');

    return {
      videoUrl: result.output.video_url,
      thumbnailUrl: result.output.thumbnail_url || result.output.video_url,
      duration,
      generationTimeMs,
      cost,
    };
  }

  /**
   * Generate lip sync with streaming audio input
   * Used for real-time voice interactions
   */
  async *streamLipSync(
    sourceImageUrl: string,
    audioChunks: AsyncIterable<ArrayBuffer>,
    options: {
      expression?: EmotionState;
      quality?: 'fast' | 'balanced';
    } = {}
  ): AsyncGenerator<{ frameBase64: string; timestamp: number }> {
    // This would require a WebSocket connection for true streaming
    // For now, we'll batch small chunks

    const chunkBuffer: ArrayBuffer[] = [];
    const chunkDuration = 500; // 500ms chunks
    let timestamp = 0;

    for await (const chunk of audioChunks) {
      chunkBuffer.push(chunk);
      
      // Process every ~500ms of audio
      const totalBytes = chunkBuffer.reduce((sum, c) => sum + c.byteLength, 0);
      if (totalBytes >= 16000 * 2 * (chunkDuration / 1000)) { // 16kHz, 16-bit
        // Merge chunks
        const mergedAudio = this.mergeArrayBuffers(chunkBuffer);
        const audioBase64 = this.arrayBufferToBase64(mergedAudio);

        // Generate frames for this chunk
        const result = await this.generateLipSync({
          sourceImageUrl,
          audioSource: audioBase64,
          audioIsBase64: true,
          expression: options.expression,
          quality: options.quality || 'fast',
        });

        // For simplicity, yield a single frame per chunk
        // Real impl would extract individual frames from video
        yield {
          frameBase64: result.thumbnailUrl, // Placeholder
          timestamp,
        };

        timestamp += chunkDuration;
        chunkBuffer.length = 0;
      }
    }
  }

  /**
   * Get expression settings for emotion
   */
  private getExpressionSettings(emotion?: EmotionState): {
    scale: number;
    yaw: number[];
    pitch: number[];
    roll: number[];
  } {
    const base = {
      scale: 1.0,
      yaw: [0, 0, 0],
      pitch: [0, 0, 0],
      roll: [0, 0, 0],
    };

    if (!emotion) return base;

    const emotionSettings: Partial<Record<EmotionState, typeof base>> = {
      happy: {
        scale: 1.2,
        yaw: [-5, 0, 5],
        pitch: [0, 5, 0],
        roll: [0, 0, 0],
      },
      sad: {
        scale: 0.8,
        yaw: [0, 0, 0],
        pitch: [5, 0, 5],
        roll: [0, 0, 0],
      },
      excited: {
        scale: 1.4,
        yaw: [-10, 0, 10],
        pitch: [-5, 0, -5],
        roll: [-3, 0, 3],
      },
      thoughtful: {
        scale: 0.9,
        yaw: [0, -5, 0],
        pitch: [0, 5, 0],
        roll: [0, 0, 0],
      },
    };

    return emotionSettings[emotion] || base;
  }

  /**
   * Poll for job completion
   */
  private async pollForCompletion(jobId: string): Promise<any> {
    const maxAttempts = Math.ceil((this.config.timeout || 120000) / 2000);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000);

      const response = await fetch(`${this.config.endpoint}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const status = await response.json();

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(`Lip sync failed: ${status.error || 'Unknown error'}`);
      }
    }

    throw new Error('Lip sync timed out');
  }

  /**
   * Calculate cost
   */
  private calculateCost(durationSeconds: number, quality: string): number {
    const baseCost = 0.08; // $0.08 per second
    const qualityMultiplier = quality === 'high' ? 1.5 : quality === 'fast' ? 0.7 : 1.0;
    return durationSeconds * baseCost * qualityMultiplier;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mergeArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    return result.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

export function createLivePortraitClient(config: LivePortraitConfig): LivePortraitClient {
  return new LivePortraitClient(config);
}

export function createSadTalkerClient(config: SadTalkerConfig): SadTalkerClient {
  return new SadTalkerClient(config);
}
