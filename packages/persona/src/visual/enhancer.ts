/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAL ENGINE: IMAGE ENHANCER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Post-processing pipeline for face restoration and upscaling.
 * Uses GFPGAN for faces and Real-ESRGAN for general upscaling.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnhancerConfig {
    endpoint: string;
    apiKey: string;
    timeout?: number;
  }
  
  export interface EnhancementOptions {
    /** Face restoration using GFPGAN */
    faceRestore?: boolean;
    /** Face restoration strength (0-1) */
    faceRestoreStrength?: number;
    /** Upscale factor (1, 2, 4) */
    upscaleFactor?: 1 | 2 | 4;
    /** Upscaler model */
    upscaler?: 'realesrgan' | 'realesrgan_anime' | 'none';
    /** Color correction */
    colorCorrect?: boolean;
    /** Sharpening intensity (0-1) */
    sharpening?: number;
    /** Denoise strength (0-1) */
    denoise?: number;
    /** Background enhancement */
    enhanceBackground?: boolean;
  }
  
  export interface EnhancementResult {
    /** Enhanced image URL */
    imageUrl: string;
    /** Original dimensions */
    originalSize: { width: number; height: number };
    /** Enhanced dimensions */
    enhancedSize: { width: number; height: number };
    /** Processing time in ms */
    processingTimeMs: number;
    /** Cost in USD */
    cost: number;
  }
  
  export interface ColorGradeOptions {
    /** Color temperature adjustment (-100 to 100) */
    temperature?: number;
    /** Tint adjustment (-100 to 100) */
    tint?: number;
    /** Exposure adjustment (-2 to 2) */
    exposure?: number;
    /** Contrast adjustment (0.5 to 2) */
    contrast?: number;
    /** Saturation adjustment (0 to 2) */
    saturation?: number;
    /** Vibrance adjustment (0 to 2) */
    vibrance?: number;
    /** Vignette intensity (0 to 1) */
    vignette?: number;
    /** LUT file to apply */
    lutFile?: string;
    /** Preset name */
    preset?: keyof typeof COLOR_PRESETS;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COLOR GRADING PRESETS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const COLOR_PRESETS = {
    cinematic: {
      name: 'Cinematic',
      temperature: -5,
      contrast: 1.15,
      saturation: 0.9,
      vignette: 0.2,
      lutFile: 'cinematic_teal_orange.cube',
    },
    warm_portrait: {
      name: 'Warm Portrait',
      temperature: 15,
      tint: 5,
      contrast: 1.05,
      saturation: 1.1,
      vignette: 0.1,
    },
    cool_professional: {
      name: 'Cool Professional',
      temperature: -10,
      contrast: 1.1,
      saturation: 0.85,
    },
    vibrant_pop: {
      name: 'Vibrant Pop',
      saturation: 1.3,
      vibrance: 1.2,
      contrast: 1.1,
    },
    moody_dark: {
      name: 'Moody Dark',
      exposure: -0.3,
      contrast: 1.2,
      saturation: 0.8,
      vignette: 0.3,
    },
    fantasy_golden: {
      name: 'Fantasy Golden',
      temperature: 20,
      saturation: 1.1,
      contrast: 1.15,
      vignette: 0.15,
      lutFile: 'golden_hour.cube',
    },
    anime_vibrant: {
      name: 'Anime Vibrant',
      saturation: 1.25,
      contrast: 1.1,
      vibrance: 1.15,
    },
    noir: {
      name: 'Film Noir',
      saturation: 0,
      contrast: 1.3,
      vignette: 0.25,
    },
  } as const;
  
  export type ColorPresetName = keyof typeof COLOR_PRESETS;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // IMAGE ENHANCER CLIENT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class ImageEnhancer {
    private config: EnhancerConfig;
  
    constructor(config: EnhancerConfig) {
      this.config = {
        timeout: 60000, // 1 minute
        ...config,
      };
    }
  
    /**
     * Enhance an image with face restoration and upscaling
     */
    async enhance(
      imageUrl: string,
      options: EnhancementOptions = {}
    ): Promise<EnhancementResult> {
      const startTime = Date.now();
  
      const {
        faceRestore = true,
        faceRestoreStrength = 0.7,
        upscaleFactor = 2,
        upscaler = 'realesrgan',
        colorCorrect = false,
        sharpening = 0.3,
        denoise = 0,
        enhanceBackground = true,
      } = options;
  
      const payload = {
        input: {
          image: imageUrl,
          
          // Face restoration
          face_enhance: faceRestore,
          fidelity_weight: 1 - faceRestoreStrength, // GFPGAN uses inverse
          
          // Upscaling
          upscale: upscaleFactor,
          model: upscaler === 'none' ? null : upscaler,
          
          // Post-processing
          sharpen: sharpening,
          denoise: denoise,
          
          // Background
          bg_upsampler: enhanceBackground ? 'realesrgan' : null,
          
          // Output
          output_format: 'png',
        },
      };
  
      const response = await fetch(`${this.config.endpoint}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`Enhancer API error: ${response.statusText}`);
      }
  
      const job = await response.json();
      const result = await this.pollForCompletion(job.id);
  
      const processingTimeMs = Date.now() - startTime;
  
      return {
        imageUrl: result.output.image_url,
        originalSize: {
          width: result.output.original_width || 512,
          height: result.output.original_height || 512,
        },
        enhancedSize: {
          width: (result.output.original_width || 512) * upscaleFactor,
          height: (result.output.original_height || 512) * upscaleFactor,
        },
        processingTimeMs,
        cost: this.calculateCost(upscaleFactor, faceRestore),
      };
    }
  
    /**
     * Apply face restoration only (no upscaling)
     */
    async restoreFace(
      imageUrl: string,
      strength: number = 0.7
    ): Promise<EnhancementResult> {
      return this.enhance(imageUrl, {
        faceRestore: true,
        faceRestoreStrength: strength,
        upscaleFactor: 1,
        upscaler: 'none',
      });
    }
  
    /**
     * Upscale only (no face restoration)
     */
    async upscale(
      imageUrl: string,
      factor: 1 | 2 | 4 = 2,
      model: 'realesrgan' | 'realesrgan_anime' = 'realesrgan'
    ): Promise<EnhancementResult> {
      return this.enhance(imageUrl, {
        faceRestore: false,
        upscaleFactor: factor,
        upscaler: model,
      });
    }
  
    /**
     * Apply color grading to an image
     */
    async colorGrade(
      imageUrl: string,
      options: ColorGradeOptions
    ): Promise<EnhancementResult> {
      const startTime = Date.now();
  
      // Apply preset if specified
      let gradeOptions = { ...options };
      if (options.preset && COLOR_PRESETS[options.preset]) {
        gradeOptions = { ...COLOR_PRESETS[options.preset], ...options };
      }
  
      const payload = {
        input: {
          image: imageUrl,
          temperature: gradeOptions.temperature || 0,
          tint: gradeOptions.tint || 0,
          exposure: gradeOptions.exposure || 0,
          contrast: gradeOptions.contrast || 1,
          saturation: gradeOptions.saturation || 1,
          vibrance: gradeOptions.vibrance || 1,
          vignette: gradeOptions.vignette || 0,
          lut: gradeOptions.lutFile,
        },
      };
  
      const response = await fetch(`${this.config.endpoint}/color-grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`Color grade API error: ${response.statusText}`);
      }
  
      const job = await response.json();
      const result = await this.pollForCompletion(job.id);
  
      return {
        imageUrl: result.output.image_url,
        originalSize: { width: result.output.width, height: result.output.height },
        enhancedSize: { width: result.output.width, height: result.output.height },
        processingTimeMs: Date.now() - startTime,
        cost: 0.01, // Color grading is cheap
      };
    }
  
    /**
     * Full enhancement pipeline: restore, upscale, color grade
     */
    async fullPipeline(
      imageUrl: string,
      options: {
        enhancement?: EnhancementOptions;
        colorGrade?: ColorGradeOptions;
      } = {}
    ): Promise<EnhancementResult> {
      // Step 1: Enhance (restore + upscale)
      const enhanced = await this.enhance(imageUrl, {
        faceRestore: true,
        faceRestoreStrength: 0.7,
        upscaleFactor: 2,
        ...options.enhancement,
      });
  
      // Step 2: Color grade
      if (options.colorGrade) {
        const graded = await this.colorGrade(enhanced.imageUrl, options.colorGrade);
        return {
          ...graded,
          originalSize: enhanced.originalSize,
          processingTimeMs: enhanced.processingTimeMs + graded.processingTimeMs,
          cost: enhanced.cost + graded.cost,
        };
      }
  
      return enhanced;
    }
  
    /**
     * Batch enhance multiple images
     */
    async enhanceBatch(
      imageUrls: string[],
      options: EnhancementOptions = {}
    ): Promise<EnhancementResult[]> {
      // Process in parallel with concurrency limit
      const concurrency = 3;
      const results: EnhancementResult[] = [];
  
      for (let i = 0; i < imageUrls.length; i += concurrency) {
        const batch = imageUrls.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(url => this.enhance(url, options))
        );
        results.push(...batchResults);
      }
  
      return results;
    }
  
    /**
     * Poll for job completion
     */
    private async pollForCompletion(jobId: string): Promise<any> {
      const maxAttempts = Math.ceil((this.config.timeout || 60000) / 2000);
      
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
          throw new Error(`Enhancement failed: ${status.error || 'Unknown error'}`);
        }
      }
  
      throw new Error('Enhancement timed out');
    }
  
    /**
     * Calculate cost
     */
    private calculateCost(upscaleFactor: number, faceRestore: boolean): number {
      let cost = 0.02; // Base cost
      
      if (faceRestore) cost += 0.02;
      if (upscaleFactor === 2) cost += 0.02;
      if (upscaleFactor === 4) cost += 0.05;
  
      return cost;
    }
  
    private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export function createImageEnhancer(config: EnhancerConfig): ImageEnhancer {
    return new ImageEnhancer(config);
  }
  