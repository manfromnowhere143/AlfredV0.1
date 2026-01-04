/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IDENTITY LOCK PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art identity locking system using InstantID + IP-Adapter.
 * This is the core technology that ensures every generated image of a persona
 * has the EXACT SAME FACE while allowing style/expression variation.
 *
 * PIPELINE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                        IDENTITY LOCK PIPELINE                               │
 * │                                                                             │
 * │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
 * │  │  1. INPUT   │───▶│ 2. EXTRACT  │───▶│  3. EMBED   │───▶│  4. LOCK    │ │
 * │  │   Image     │    │   Face      │    │   Identity  │    │   Forever   │ │
 * │  │             │    │ InsightFace │    │  InstantID  │    │   Store     │ │
 * │  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
 * │                                                                             │
 * │  POST-LOCK: Any generation uses locked embedding → SAME FACE GUARANTEED    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * TECHNOLOGIES:
 * - InsightFace (antelopev2): Face detection & embedding extraction
 * - InstantID: Zero-shot identity-preserving generation
 * - IP-Adapter: Style embedding for consistent aesthetics
 * - ControlNet: Pose/expression control
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    FaceEmbedding,
    StyleEmbedding,
    ExpressionGrid,
    ExpressionAsset,
    NormalizedFloat,
    VisualDNA,
    PersonaGenome,
  } from './types';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * GPU Provider configuration
   */
  export interface GPUProviderConfig {
    provider: 'runpod' | 'modal' | 'replicate' | 'fal' | 'together';
    apiKey: string;
    baseUrl?: string;
    /** Timeout in ms */
    timeout?: number;
    /** Max retries on failure */
    maxRetries?: number;
  }
  
  /**
   * Face detection result from InsightFace
   */
  export interface FaceDetectionResult {
    /** Bounding box [x, y, width, height] */
    bbox: [number, number, number, number];
    /** Facial landmarks (5 points) */
    landmarks: number[][];
    /** Detection confidence */
    confidence: number;
    /** 512-dim face embedding */
    embedding: number[];
    /** Face age estimation */
    age?: number;
    /** Face gender estimation */
    gender?: 'male' | 'female';
  }
  
  /**
   * Image generation request
   */
  export interface GenerationRequest {
    /** Text prompt */
    prompt: string;
    /** Negative prompt */
    negativePrompt?: string;
    /** Face embedding for identity */
    faceEmbedding?: number[];
    /** Style embedding */
    styleEmbedding?: number[];
    /** Reference image URL (for IP-Adapter) */
    referenceImageUrl?: string;
    /** Generation parameters */
    params?: {
      width?: number;
      height?: number;
      steps?: number;
      cfgScale?: number;
      sampler?: string;
      seed?: number;
      /** InstantID strength (0-1) */
      identityStrength?: number;
      /** IP-Adapter strength (0-1) */
      styleStrength?: number;
    };
  }
  
  /**
   * Generation result
   */
  export interface GenerationResult {
    /** Generated image URL */
    imageUrl: string;
    /** Seed used */
    seed: number;
    /** Generation time in ms */
    generationTimeMs: number;
    /** Cost in USD */
    cost: number;
    /** NSFW score if checked */
    nsfwScore?: number;
  }
  
  /**
   * Expression generation request
   */
  export interface ExpressionRequest {
    /** Base identity embedding */
    faceEmbedding: number[];
    /** Style embedding */
    styleEmbedding?: number[];
    /** Emotion to generate */
    emotion: string;
    /** Base prompt additions */
    basePrompt: string;
    /** Locked negative prompt */
    negativePrompt: string;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // GPU PROVIDER ABSTRACTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Abstract GPU provider interface
   * Allows switching between RunPod, Modal, Replicate, etc.
   */
  export abstract class GPUProvider {
    protected config: GPUProviderConfig;
  
    constructor(config: GPUProviderConfig) {
      this.config = config;
    }
  
    /** Extract face embedding from image */
    abstract extractFaceEmbedding(imageUrl: string): Promise<FaceDetectionResult>;
  
    /** Generate image with InstantID */
    abstract generateWithIdentity(request: GenerationRequest): Promise<GenerationResult>;
  
    /** Generate batch of images */
    abstract generateBatch(requests: GenerationRequest[]): Promise<GenerationResult[]>;
  
    /** Check provider health/availability */
    abstract healthCheck(): Promise<boolean>;
  
    /** Get current queue depth */
    abstract getQueueDepth(): Promise<number>;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RUNPOD PROVIDER (Primary)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class RunPodProvider extends GPUProvider {
    private readonly baseUrl: string;
  
    constructor(config: GPUProviderConfig) {
      super(config);
      this.baseUrl = config.baseUrl || 'https://api.runpod.ai/v2';
    }
  
    async extractFaceEmbedding(imageUrl: string): Promise<FaceDetectionResult> {
      const response = await fetch(`${this.baseUrl}/insightface/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            image_url: imageUrl,
            det_model: 'antelopev2',
            return_embedding: true,
          },
        }),
      });
  
      if (!response.ok) {
        throw new Error(`RunPod face extraction failed: ${response.status}`);
      }
  
      const result = await response.json();
      
      // Poll for completion
      const jobResult = await this.pollForCompletion(result.id);
      
      if (!jobResult.output?.faces?.length) {
        throw new Error('No face detected in image');
      }
  
      const face = jobResult.output.faces[0];
      return {
        bbox: face.bbox,
        landmarks: face.landmarks,
        confidence: face.det_score,
        embedding: face.embedding,
        age: face.age,
        gender: face.gender === 1 ? 'female' : 'male',
      };
    }
  
    async generateWithIdentity(request: GenerationRequest): Promise<GenerationResult> {
      const startTime = Date.now();
  
      const payload = {
        input: {
          prompt: request.prompt,
          negative_prompt: request.negativePrompt || '',
          width: request.params?.width || 1024,
          height: request.params?.height || 1024,
          num_inference_steps: request.params?.steps || 30,
          guidance_scale: request.params?.cfgScale || 7.5,
          seed: request.params?.seed || Math.floor(Math.random() * 2147483647),
          // InstantID specific
          face_embedding: request.faceEmbedding,
          identity_strength: request.params?.identityStrength || 0.8,
          // IP-Adapter for style
          style_embedding: request.styleEmbedding,
          style_strength: request.params?.styleStrength || 0.3,
          // Reference image
          reference_image: request.referenceImageUrl,
        },
      };
  
      const response = await fetch(`${this.baseUrl}/instantid-sdxl/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`RunPod generation failed: ${response.status}`);
      }
  
      const result = await response.json();
      const jobResult = await this.pollForCompletion(result.id);
  
      return {
        imageUrl: jobResult.output.image_url,
        seed: payload.input.seed,
        generationTimeMs: Date.now() - startTime,
        cost: this.calculateCost(jobResult.executionTime),
      };
    }
  
    async generateBatch(requests: GenerationRequest[]): Promise<GenerationResult[]> {
      // Run in parallel with concurrency limit
      const CONCURRENCY = 4;
      const results: GenerationResult[] = [];
  
      for (let i = 0; i < requests.length; i += CONCURRENCY) {
        const batch = requests.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map((req) => this.generateWithIdentity(req))
        );
        results.push(...batchResults);
      }
  
      return results;
    }
  
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  
    async getQueueDepth(): Promise<number> {
      // RunPod doesn't expose queue depth directly
      return 0;
    }
  
    private async pollForCompletion(jobId: string, maxAttempts = 60): Promise<any> {
      for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        });
  
        const status = await response.json();
  
        if (status.status === 'COMPLETED') {
          return status;
        }
  
        if (status.status === 'FAILED') {
          throw new Error(`Job failed: ${status.error}`);
        }
  
        // Wait before polling again
        await new Promise((r) => setTimeout(r, 1000));
      }
  
      throw new Error('Job timed out');
    }
  
    private calculateCost(executionTimeMs: number): number {
      // RunPod pricing: ~$0.00025 per second for A100
      return (executionTimeMs / 1000) * 0.00025;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // REPLICATE PROVIDER (Backup)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class ReplicateProvider extends GPUProvider {
    private readonly baseUrl = 'https://api.replicate.com/v1';
  
    async extractFaceEmbedding(imageUrl: string): Promise<FaceDetectionResult> {
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'insightface/buffalo_l', // InsightFace model
          input: { image: imageUrl },
        }),
      });
  
      const prediction = await response.json();
      const result = await this.waitForPrediction(prediction.id);
  
      return {
        bbox: result.output.bbox,
        landmarks: result.output.landmarks,
        confidence: result.output.confidence,
        embedding: result.output.embedding,
      };
    }
  
    async generateWithIdentity(request: GenerationRequest): Promise<GenerationResult> {
      const startTime = Date.now();
      const seed = request.params?.seed || Math.floor(Math.random() * 2147483647);
  
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // InstantID model on Replicate
          version: 'zsxkib/instant-id:latest',
          input: {
            prompt: request.prompt,
            negative_prompt: request.negativePrompt,
            face_embedding: request.faceEmbedding,
            ip_adapter_scale: request.params?.styleStrength || 0.3,
            identitynet_strength_ratio: request.params?.identityStrength || 0.8,
            num_inference_steps: request.params?.steps || 30,
            guidance_scale: request.params?.cfgScale || 7.5,
            seed,
            width: request.params?.width || 1024,
            height: request.params?.height || 1024,
          },
        }),
      });
  
      const prediction = await response.json();
      const result = await this.waitForPrediction(prediction.id);
  
      return {
        imageUrl: result.output[0],
        seed,
        generationTimeMs: Date.now() - startTime,
        cost: this.calculateCost(result.metrics?.predict_time || 0),
      };
    }
  
    async generateBatch(requests: GenerationRequest[]): Promise<GenerationResult[]> {
      return Promise.all(requests.map((req) => this.generateWithIdentity(req)));
    }
  
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/collections/text-to-image`, {
          headers: { 'Authorization': `Token ${this.config.apiKey}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  
    async getQueueDepth(): Promise<number> {
      return 0;
    }
  
    private async waitForPrediction(id: string, maxAttempts = 60): Promise<any> {
      for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`${this.baseUrl}/predictions/${id}`, {
          headers: { 'Authorization': `Token ${this.config.apiKey}` },
        });
  
        const prediction = await response.json();
  
        if (prediction.status === 'succeeded') {
          return prediction;
        }
  
        if (prediction.status === 'failed') {
          throw new Error(`Prediction failed: ${prediction.error}`);
        }
  
        await new Promise((r) => setTimeout(r, 1000));
      }
  
      throw new Error('Prediction timed out');
    }
  
    private calculateCost(predictTimeSeconds: number): number {
      // Replicate A100 pricing
      return predictTimeSeconds * 0.0023;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // IDENTITY LOCK PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Configuration for the Identity Lock Pipeline
   */
  export interface IdentityLockConfig {
    /** Primary GPU provider */
    primaryProvider: GPUProvider;
    /** Fallback GPU provider (optional) */
    fallbackProvider?: GPUProvider;
    /** Storage for generated assets */
    storage: {
      upload: (buffer: Buffer, filename: string) => Promise<string>;
      getPublicUrl: (key: string) => string;
    };
    /** Generation settings */
    settings?: {
      /** Number of initial variations to generate */
      initialVariations?: number;
      /** Number of expression variations per emotion */
      expressionVariations?: number;
      /** Default image dimensions */
      defaultWidth?: number;
      defaultHeight?: number;
    };
  }
  
  /**
   * The main Identity Lock Pipeline
   *
   * This is the core system that:
   * 1. Extracts facial identity from a source image
   * 2. Creates a locked identity embedding
   * 3. Generates consistent images using that identity
   * 4. Creates a full expression grid for the persona
   */
  export class IdentityLockPipeline {
    private readonly config: IdentityLockConfig;
    private readonly settings: Required<NonNullable<IdentityLockConfig['settings']>>;
  
    constructor(config: IdentityLockConfig) {
      this.config = config;
      this.settings = {
        initialVariations: config.settings?.initialVariations ?? 4,
        expressionVariations: config.settings?.expressionVariations ?? 1,
        defaultWidth: config.settings?.defaultWidth ?? 1024,
        defaultHeight: config.settings?.defaultHeight ?? 1024,
      };
    }
  
    /**
     * STEP 1: Generate initial character variations
     *
     * Creates multiple variations for the user to choose from.
     * No identity lock yet - these are fresh generations.
     */
    async generateInitialVariations(
      description: string,
      stylePreset: string,
      options?: {
        count?: number;
        customPrompt?: string;
        negativePrompt?: string;
      }
    ): Promise<GenerationResult[]> {
      const count = options?.count || this.settings.initialVariations;
  
      const prompt = this.buildCharacterPrompt(description, stylePreset, options?.customPrompt);
      const negativePrompt = options?.negativePrompt || this.getDefaultNegativePrompt(stylePreset);
  
      const requests: GenerationRequest[] = Array.from({ length: count }, () => ({
        prompt,
        negativePrompt,
        params: {
          width: this.settings.defaultWidth,
          height: this.settings.defaultHeight,
          steps: 30,
          cfgScale: 7.5,
          // Different seeds for variation
          seed: Math.floor(Math.random() * 2147483647),
        },
      }));
  
      return this.config.primaryProvider.generateBatch(requests);
    }
  
    /**
     * STEP 2: Lock Identity
     *
     * This is the KEY STEP. Extracts the face embedding from the chosen image
     * and creates the locked identity that will be used for all future generations.
     */
    async lockIdentity(
      chosenImageUrl: string,
      stylePrompt?: string
    ): Promise<{
      faceEmbedding: FaceEmbedding;
      styleEmbedding: StyleEmbedding;
    }> {
      console.log('🔐 Locking identity from chosen image...');
  
      // Extract face embedding
      const faceResult = await this.config.primaryProvider.extractFaceEmbedding(chosenImageUrl);
  
      if (faceResult.confidence < 0.8) {
        throw new Error(`Face detection confidence too low: ${faceResult.confidence}. Please choose a clearer image.`);
      }
  
      const faceEmbedding: FaceEmbedding = {
        vector: faceResult.embedding,
        model: 'insightface_antelopev2',
        sourceImageUrl: chosenImageUrl,
        confidence: faceResult.confidence,
        createdAt: new Date().toISOString(),
      };
  
      // Create style embedding (can be enhanced with IP-Adapter extraction)
      const styleEmbedding: StyleEmbedding = {
        vector: [], // Will be populated by IP-Adapter if used
        stylePrompt: stylePrompt,
        negativePrompt: this.getDefaultNegativePrompt('custom'),
      };
  
      console.log('✅ Identity locked successfully!');
      console.log(`   Face confidence: ${faceResult.confidence}`);
      console.log(`   Embedding dimensions: ${faceResult.embedding.length}`);
  
      return { faceEmbedding, styleEmbedding };
    }
  
    /**
     * STEP 3: Generate Expression Grid
     *
     * Creates a full set of emotion expressions using the locked identity.
     * This pre-generates all expressions for instant switching during interactions.
     */
    async generateExpressionGrid(
      faceEmbedding: FaceEmbedding,
      styleEmbedding: StyleEmbedding,
      basePrompt: string,
      options?: {
        emotions?: string[];
        variations?: number;
      }
    ): Promise<ExpressionGrid> {
      const emotions = options?.emotions || [
        'neutral',
        'happy',
        'sad',
        'angry',
        'surprised',
        'thoughtful',
      ];
  
      console.log(`🎭 Generating expression grid for ${emotions.length} emotions...`);
  
      const expressionPrompts: Record<string, string> = {
        neutral: 'neutral expression, calm, composed, direct gaze',
        happy: 'happy expression, warm genuine smile, joyful eyes, friendly',
        sad: 'sad expression, downcast eyes, slight frown, melancholic',
        angry: 'angry expression, furrowed brow, intense eyes, stern',
        surprised: 'surprised expression, wide eyes, raised eyebrows, amazed',
        thoughtful: 'thoughtful expression, contemplative, slight head tilt, pondering',
        excited: 'excited expression, bright eyes, big smile, enthusiastic',
        concerned: 'concerned expression, worried eyes, empathetic, caring',
        confident: 'confident expression, assured smile, strong gaze, self-assured',
        curious: 'curious expression, inquisitive look, slightly raised eyebrow',
        loving: 'loving expression, soft warm eyes, gentle smile, affectionate',
        disappointed: 'disappointed expression, slight frown, resigned look',
      };
  
      const grid: Partial<ExpressionGrid> = {};
  
      for (const emotion of emotions) {
        const emotionPrompt = expressionPrompts[emotion] || `${emotion} expression`;
        const fullPrompt = `${basePrompt}, ${emotionPrompt}`;
  
        console.log(`   Generating: ${emotion}...`);
  
        const result = await this.config.primaryProvider.generateWithIdentity({
          prompt: fullPrompt,
          negativePrompt: styleEmbedding.negativePrompt,
          faceEmbedding: faceEmbedding.vector,
          styleEmbedding: styleEmbedding.vector.length > 0 ? styleEmbedding.vector : undefined,
          params: {
            width: this.settings.defaultWidth,
            height: this.settings.defaultHeight,
            steps: 30,
            cfgScale: 7.5,
            identityStrength: 0.85,
            styleStrength: 0.3,
          },
        });
  
        // Upload and get thumbnail
        const thumbnailUrl = result.imageUrl; // In production, generate actual thumbnail
  
        (grid as any)[emotion] = ({
          intensity: 1.0 as NormalizedFloat,
          imageUrl: result.imageUrl,
          thumbnailUrl,
          seed: result.seed,
          generatedAt: new Date().toISOString(),
        }) as ExpressionAsset;
  
        console.log(`   ✅ ${emotion} complete (${result.generationTimeMs}ms)`);
      }
  
      return grid as ExpressionGrid;
    }
  
    /**
     * STEP 4: Generate with locked identity
     *
     * Generate any new image using the locked identity.
     * This ensures the face is ALWAYS consistent.
     */
    async generateWithLockedIdentity(
      faceEmbedding: FaceEmbedding,
      prompt: string,
      options?: {
        styleEmbedding?: StyleEmbedding;
        negativePrompt?: string;
        params?: GenerationRequest['params'];
      }
    ): Promise<GenerationResult> {
      return this.config.primaryProvider.generateWithIdentity({
        prompt,
        negativePrompt: options?.negativePrompt || this.getDefaultNegativePrompt('custom'),
        faceEmbedding: faceEmbedding.vector,
        styleEmbedding: options?.styleEmbedding?.vector,
        params: {
          ...options?.params,
          identityStrength: options?.params?.identityStrength ?? 0.85,
        },
      });
    }
  
    /**
     * Build complete Visual DNA from locked identity
     */
    async buildVisualDNA(
      faceEmbedding: FaceEmbedding,
      styleEmbedding: StyleEmbedding,
      expressions: ExpressionGrid,
      stylePreset: string
    ): Promise<VisualDNA> {
      return {
        faceEmbedding,
        styleEmbedding,
        expressions,
        generationConfig: {
          checkpoint: 'sd_xl_base_1.0',
          cfgScale: 7.5,
          sampler: 'DPM++ 2M Karras',
          steps: 30,
          identityStrength: 0.85,
          styleStrength: 0.3,
        },
        lockedPrompt: {
          positive: styleEmbedding.stylePrompt || '',
          negative: styleEmbedding.negativePrompt || this.getDefaultNegativePrompt(stylePreset),
        },
      };
    }
  
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────
  
    private buildCharacterPrompt(
      description: string,
      stylePreset: string,
      customAddition?: string
    ): string {
      const stylePrompts: Record<string, string> = {
        pixar_3d: 'pixar style, 3d render, high quality character portrait, soft lighting, smooth skin, expressive eyes',
        arcane_stylized: 'arcane style, stylized portrait, painterly, dramatic lighting, detailed face, expressive',
        anime_premium: 'masterpiece, best quality, anime style, detailed face, beautiful eyes, sharp features',
        hyper_realistic: 'hyperrealistic portrait, professional photography, studio lighting, sharp focus, high detail, 8k',
        fantasy_epic: 'epic fantasy portrait, dramatic lighting, detailed face, magical aura, cinematic',
        corporate_professional: 'professional business portrait, clean background, studio lighting, corporate headshot',
      };
  
      const stylePrefix = stylePrompts[stylePreset] || stylePrompts.hyper_realistic;
      const parts = [stylePrefix, description];
      
      if (customAddition) {
        parts.push(customAddition);
      }
  
      return parts.join(', ');
    }
  
    private getDefaultNegativePrompt(stylePreset: string): string {
      const baseNegative = 'ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, poorly drawn face, poorly drawn hands, missing fingers';
  
      const styleNegatives: Record<string, string> = {
        pixar_3d: `${baseNegative}, photo, realistic, anime, cartoon 2d, sketch, painting`,
        arcane_stylized: `${baseNegative}, photo, realistic, anime, 3d render, cgi`,
        anime_premium: `${baseNegative}, 3d, realistic, photo, lowres, worst quality, low quality`,
        hyper_realistic: `${baseNegative}, cartoon, anime, illustration, painting, drawing, cgi, 3d render`,
        fantasy_epic: `${baseNegative}, anime, cartoon, photo, modern`,
        corporate_professional: `${baseNegative}, casual, artistic, stylized, fantasy, dramatic`,
      };
  
      return styleNegatives[stylePreset] || baseNegative;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Create an Identity Lock Pipeline with default configuration
   */
  export function createIdentityLockPipeline(options: {
    runpodApiKey?: string;
    replicateApiKey?: string;
    storage: IdentityLockConfig['storage'];
  }): IdentityLockPipeline {
    let primaryProvider: GPUProvider;
    let fallbackProvider: GPUProvider | undefined;
  
    if (options.runpodApiKey) {
      primaryProvider = new RunPodProvider({
        provider: 'runpod',
        apiKey: options.runpodApiKey,
      });
    } else if (options.replicateApiKey) {
      primaryProvider = new ReplicateProvider({
        provider: 'replicate',
        apiKey: options.replicateApiKey,
      });
    } else {
      throw new Error('At least one GPU provider API key is required');
    }
  
    if (options.runpodApiKey && options.replicateApiKey) {
      fallbackProvider = new ReplicateProvider({
        provider: 'replicate',
        apiKey: options.replicateApiKey,
      });
    }
  
    return new IdentityLockPipeline({
      primaryProvider,
      fallbackProvider,
      storage: options.storage,
    });
  }