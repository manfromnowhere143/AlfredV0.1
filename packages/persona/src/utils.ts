/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { COST_RATES, VALIDATION } from './constants';
import type {
  Persona,
  PersonaInteractionMode,
  PersonaVisualStyle,
  PersonaVoiceProvider,
  CreatePersonaRequest,
  UpdatePersonaRequest,
} from './types';
import { PersonaValidationError } from './errors';

// ═══════════════════════════════════════════════════════════════════════════════
// SLUG GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-safe slug from a persona name
 *
 * @param name - The persona name
 * @param suffix - Optional suffix for uniqueness
 * @returns URL-safe slug
 *
 * @example
 * generateSlug('Queen Medusa') // 'queen-medusa'
 * generateSlug('Queen Medusa', '123') // 'queen-medusa-123'
 */
export function generateSlug(name: string, suffix?: string): string {
  const base = name
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove non-alphanumeric characters (except hyphens)
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (suffix) {
    return `${base}-${suffix}`;
  }

  return base || 'persona';
}

/**
 * Generate a unique slug by appending a short hash if needed
 */
export function generateUniqueSlug(name: string, existingSlugs: Set<string>): string {
  let slug = generateSlug(name);

  if (!existingSlugs.has(slug)) {
    return slug;
  }

  // Generate a unique suffix
  const suffix = Math.random().toString(36).substring(2, 8);
  slug = generateSlug(name, suffix);

  return slug;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validate persona creation request
 */
export function validateCreateRequest(request: CreatePersonaRequest): void {
  const errors: ValidationError[] = [];

  // Name validation
  if (!request.name || typeof request.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required' });
  } else {
    if (request.name.length < VALIDATION.persona.nameMinLength) {
      errors.push({
        field: 'name',
        message: `Name must be at least ${VALIDATION.persona.nameMinLength} characters`,
        value: request.name,
      });
    }
    if (request.name.length > VALIDATION.persona.nameMaxLength) {
      errors.push({
        field: 'name',
        message: `Name must be at most ${VALIDATION.persona.nameMaxLength} characters`,
        value: request.name,
      });
    }
  }

  // Description validation
  if (!request.description || typeof request.description !== 'string') {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (errors.length > 0) {
    throw new PersonaValidationError(errors);
  }
}

/**
 * Validate persona update request
 */
export function validateUpdateRequest(request: UpdatePersonaRequest): void {
  const errors: ValidationError[] = [];

  // Name validation (if provided)
  if (request.name !== undefined) {
    if (typeof request.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string' });
    } else {
      if (request.name.length < VALIDATION.persona.nameMinLength) {
        errors.push({
          field: 'name',
          message: `Name must be at least ${VALIDATION.persona.nameMinLength} characters`,
        });
      }
      if (request.name.length > VALIDATION.persona.nameMaxLength) {
        errors.push({
          field: 'name',
          message: `Name must be at most ${VALIDATION.persona.nameMaxLength} characters`,
        });
      }
    }
  }

  // Tagline validation (if provided)
  if (request.tagline !== undefined && request.tagline !== null) {
    if (request.tagline.length > VALIDATION.persona.taglineMaxLength) {
      errors.push({
        field: 'tagline',
        message: `Tagline must be at most ${VALIDATION.persona.taglineMaxLength} characters`,
      });
    }
  }

  // Backstory validation (if provided)
  if (request.backstory !== undefined && request.backstory !== null) {
    if (request.backstory.length > VALIDATION.persona.backstoryMaxLength) {
      errors.push({
        field: 'backstory',
        message: `Backstory must be at most ${VALIDATION.persona.backstoryMaxLength} characters`,
      });
    }
  }

  // Traits validation (if provided)
  if (request.traits !== undefined) {
    if (!Array.isArray(request.traits)) {
      errors.push({ field: 'traits', message: 'Traits must be an array' });
    } else if (request.traits.length > VALIDATION.persona.maxTraits) {
      errors.push({
        field: 'traits',
        message: `Maximum ${VALIDATION.persona.maxTraits} traits allowed`,
      });
    }
  }

  // Knowledge domains validation (if provided)
  if (request.knowledgeDomains !== undefined) {
    if (!Array.isArray(request.knowledgeDomains)) {
      errors.push({
        field: 'knowledgeDomains',
        message: 'Knowledge domains must be an array',
      });
    } else if (request.knowledgeDomains.length > VALIDATION.persona.maxKnowledgeDomains) {
      errors.push({
        field: 'knowledgeDomains',
        message: `Maximum ${VALIDATION.persona.maxKnowledgeDomains} knowledge domains allowed`,
      });
    }
  }

  if (errors.length > 0) {
    throw new PersonaValidationError(errors);
  }
}

/**
 * Validate persona configuration
 */
export function validatePersonaConfig(persona: Partial<Persona>): void {
  const errors: ValidationError[] = [];

  // Visual style validation
  if (persona.visualStyle !== undefined) {
    const validStyles: PersonaVisualStyle[] = [
      'pixar_3d',
      'arcane_stylized',
      'anime_premium',
      'hyper_realistic',
      'fantasy_epic',
      'corporate_professional',
      'custom',
    ];
    if (!validStyles.includes(persona.visualStyle)) {
      errors.push({
        field: 'visualStyle',
        message: `Invalid visual style: ${persona.visualStyle}`,
        value: persona.visualStyle,
      });
    }
  }

  // Voice provider validation
  if (persona.voiceProvider !== undefined) {
    const validProviders: PersonaVoiceProvider[] = ['elevenlabs', 'coqui', 'custom'];
    if (!validProviders.includes(persona.voiceProvider)) {
      errors.push({
        field: 'voiceProvider',
        message: `Invalid voice provider: ${persona.voiceProvider}`,
        value: persona.voiceProvider,
      });
    }
  }

  // Energy level validation
  if (persona.energyLevel !== undefined) {
    if (persona.energyLevel < 0 || persona.energyLevel > 1) {
      errors.push({
        field: 'energyLevel',
        message: 'Energy level must be between 0 and 1',
        value: persona.energyLevel,
      });
    }
  }

  // Relationship level validation
  if (persona.relationshipLevel !== undefined) {
    if (persona.relationshipLevel < 0 || persona.relationshipLevel > 1) {
      errors.push({
        field: 'relationshipLevel',
        message: 'Relationship level must be between 0 and 1',
        value: persona.relationshipLevel,
      });
    }
  }

  if (errors.length > 0) {
    throw new PersonaValidationError(errors);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

interface InteractionCostParams {
  mode: PersonaInteractionMode;
  inputTokens: number;
  outputTokens: number;
  durationSeconds?: number;
  model?: 'haiku' | 'sonnet' | 'opus';
  voiceProvider?: PersonaVoiceProvider;
}

interface InteractionCost {
  llmCost: number;
  ttsCost: number;
  videoCost: number;
  totalCost: number;
}

/**
 * Calculate the cost of an interaction
 *
 * @param params - Interaction parameters
 * @returns Breakdown of costs
 */
export function calculateInteractionCost(params: InteractionCostParams): InteractionCost {
  const { mode, inputTokens, outputTokens, durationSeconds = 0, model = 'sonnet' } = params;

  // LLM cost
  const llmRates = COST_RATES.llm[model];
  const llmCost =
    (inputTokens / 1000) * llmRates.input + (outputTokens / 1000) * llmRates.output;

  // TTS cost (for voice and video modes)
  let ttsCost = 0;
  if (mode === 'voice' || mode === 'video') {
    // Estimate characters from output tokens (roughly 4 chars per token)
    const estimatedChars = outputTokens * 4;
    ttsCost = estimatedChars * COST_RATES.tts.elevenlabs.turbo;
  }

  // Video cost
  let videoCost = 0;
  if (mode === 'video' && durationSeconds > 0) {
    videoCost = durationSeconds * COST_RATES.video.livePortrait;
  }

  const totalCost = llmCost + ttsCost + videoCost;

  return {
    llmCost: Math.round(llmCost * 1000000) / 1000000, // Round to 6 decimal places
    ttsCost: Math.round(ttsCost * 1000000) / 1000000,
    videoCost: Math.round(videoCost * 1000000) / 1000000,
    totalCost: Math.round(totalCost * 1000000) / 1000000,
  };
}

/**
 * Calculate the cost of persona creation
 */
export function calculateCreationCost(options: {
  stylePreset: PersonaVisualStyle;
  generateExpressionSet: boolean;
  generatePreviewVideo: boolean;
  previewVideoDuration?: number;
}): number {
  let cost = 0;

  // Base image generation
  cost += COST_RATES.image.sdxlWithInstantId;

  // Expression set (7 images)
  if (options.generateExpressionSet) {
    cost += COST_RATES.image.expressionSet;
  }

  // Preview video
  if (options.generatePreviewVideo) {
    const duration = options.previewVideoDuration ?? 5;
    cost += duration * COST_RATES.video.animateDiff;
  }

  return Math.round(cost * 100) / 100; // Round to 2 decimal places
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract the first sentence from text
 */
export function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : truncate(text, 100);
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate token count from text (rough approximation)
 * Uses the rule of thumb: ~4 characters per token for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check if a date is within a given time window
 */
export function isWithinTimeWindow(date: Date | string, windowMs: number): boolean {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const now = Date.now();
  return now - timestamp < windowMs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a random ID
 * Note: For production, use crypto.randomUUID() or a proper UUID library
 */
export function generateId(): string {
  // Use crypto.randomUUID if available (Node.js 19+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID for session identifiers
 */
export function generateShortId(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASYNC UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000, maxDelayMs = 30000, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || (shouldRetry && !shouldRetry(error))) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

      // Add some jitter (±10%)
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);

      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Remove undefined values from an object
 */
export function removeUndefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}