/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE ERROR CLASSES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Custom error classes for PersonaForge operations.
 * All errors extend the base PersonaError class for consistent handling.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PersonaErrorCode } from './types';

/**
 * Base error class for all PersonaForge errors
 */
export class PersonaError extends Error {
  public readonly code: PersonaErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(
    code: PersonaErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      statusCode?: number;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'PersonaError';
    this.code = code;
    this.details = options?.details;
    this.statusCode = options?.statusCode ?? 500;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PersonaError);
    }
  }

  /**
   * Serialize error for API response
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
      timestamp: this.timestamp,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when a persona is not found
 */
export class PersonaNotFoundError extends PersonaError {
  constructor(personaId: string) {
    super('PERSONA_NOT_FOUND', `Persona not found: ${personaId}`, {
      statusCode: 404,
      details: { personaId },
    });
    this.name = 'PersonaNotFoundError';
  }
}

/**
 * Thrown when attempting to create a persona with an existing name
 */
export class PersonaNameExistsError extends PersonaError {
  constructor(name: string, userId: string) {
    super('PERSONA_NAME_EXISTS', `A persona named "${name}" already exists`, {
      statusCode: 409,
      details: { name, userId },
    });
    this.name = 'PersonaNameExistsError';
  }
}

/**
 * Thrown when user has reached their persona limit
 */
export class PersonaLimitReachedError extends PersonaError {
  constructor(currentCount: number, limit: number, tier: string) {
    super('PERSONA_LIMIT_REACHED', `Persona limit reached (${currentCount}/${limit})`, {
      statusCode: 403,
      details: { currentCount, limit, tier },
    });
    this.name = 'PersonaLimitReachedError';
  }
}

/**
 * Thrown when a session is not found
 */
export class SessionNotFoundError extends PersonaError {
  constructor(sessionId: string) {
    super('SESSION_NOT_FOUND', `Session not found: ${sessionId}`, {
      statusCode: 404,
      details: { sessionId },
    });
    this.name = 'SessionNotFoundError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when persona configuration is invalid
 */
export class PersonaValidationError extends PersonaError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(
    validationErrors: Array<{ field: string; message: string; value?: unknown }>,
  ) {
    const fields = validationErrors.map((e) => e.field).join(', ');
    super('WIZARD_INVALID_STEP', `Validation failed for: ${fields}`, {
      statusCode: 400,
      details: { validationErrors },
    });
    this.name = 'PersonaValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Thrown when an invalid style preset is specified
 */
export class InvalidStylePresetError extends PersonaError {
  constructor(preset: string, validPresets: string[]) {
    super('INVALID_STYLE_PRESET', `Invalid style preset: ${preset}`, {
      statusCode: 400,
      details: { preset, validPresets },
    });
    this.name = 'InvalidStylePresetError';
  }
}

/**
 * Thrown when voice configuration is invalid
 */
export class InvalidVoiceConfigError extends PersonaError {
  constructor(message: string, config?: Record<string, unknown>) {
    super('INVALID_VOICE_CONFIG', message, {
      statusCode: 400,
      details: { config },
    });
    this.name = 'InvalidVoiceConfigError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when wizard session has expired
 */
export class WizardSessionExpiredError extends PersonaError {
  constructor(sessionId: string) {
    super('WIZARD_SESSION_EXPIRED', 'Wizard session has expired', {
      statusCode: 410,
      details: { sessionId },
    });
    this.name = 'WizardSessionExpiredError';
  }
}

/**
 * Thrown when wizard step is invalid or out of order
 */
export class WizardInvalidStepError extends PersonaError {
  constructor(currentStep: string, expectedSteps: string[]) {
    super('WIZARD_INVALID_STEP', `Invalid wizard step: ${currentStep}`, {
      statusCode: 400,
      details: { currentStep, expectedSteps },
    });
    this.name = 'WizardInvalidStepError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when visual generation fails
 */
export class VisualGenerationError extends PersonaError {
  constructor(message: string, cause?: Error) {
    super('VISUAL_GENERATION_FAILED', message, {
      statusCode: 500,
      cause,
    });
    this.name = 'VisualGenerationError';
  }
}

/**
 * Thrown when identity locking fails
 */
export class IdentityLockError extends PersonaError {
  constructor(message: string, cause?: Error) {
    super('IDENTITY_LOCK_FAILED', message, {
      statusCode: 500,
      cause,
    });
    this.name = 'IdentityLockError';
  }
}

/**
 * Thrown when voice generation fails
 */
export class VoiceGenerationError extends PersonaError {
  constructor(message: string, provider: string, cause?: Error) {
    super('VOICE_GENERATION_FAILED', message, {
      statusCode: 500,
      details: { provider },
      cause,
    });
    this.name = 'VoiceGenerationError';
  }
}

/**
 * Thrown when voice provider returns an error
 */
export class VoiceProviderError extends PersonaError {
  constructor(provider: string, providerError: string) {
    super('VOICE_PROVIDER_ERROR', `${provider} error: ${providerError}`, {
      statusCode: 502,
      details: { provider, providerError },
    });
    this.name = 'VoiceProviderError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTA & RATE LIMIT ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when interaction rate limit is exceeded
 */
export class InteractionRateLimitError extends PersonaError {
  public readonly retryAfter: number;

  constructor(retryAfterSeconds: number) {
    super('INTERACTION_RATE_LIMITED', 'Rate limit exceeded', {
      statusCode: 429,
      details: { retryAfterSeconds },
    });
    this.name = 'InteractionRateLimitError';
    this.retryAfter = retryAfterSeconds;
  }
}

/**
 * Thrown when interaction quota is exceeded
 */
export class PersonaQuotaExceededError extends PersonaError {
  constructor(
    quotaType: 'chat' | 'voice' | 'video',
    used: number,
    limit: number,
    resetAt: string,
  ) {
    super(
      'INTERACTION_QUOTA_EXCEEDED',
      `${quotaType} quota exceeded (${used}/${limit})`,
      {
        statusCode: 429,
        details: { quotaType, used, limit, resetAt },
      },
    );
    this.name = 'PersonaQuotaExceededError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPU ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when a GPU job fails
 */
export class GPUJobError extends PersonaError {
  constructor(jobId: string, provider: string, message: string) {
    super('GPU_JOB_FAILED', message, {
      statusCode: 500,
      details: { jobId, provider },
    });
    this.name = 'GPUJobError';
  }
}

/**
 * Thrown when a GPU job times out
 */
export class GPUTimeoutError extends PersonaError {
  constructor(jobId: string, timeoutMs: number) {
    super('GPU_TIMEOUT', `GPU job timed out after ${timeoutMs}ms`, {
      statusCode: 504,
      details: { jobId, timeoutMs },
    });
    this.name = 'GPUTimeoutError';
  }
}

/**
 * Thrown when no GPU provider is available
 */
export class GPUProviderUnavailableError extends PersonaError {
  constructor(providers: string[]) {
    super('GPU_PROVIDER_UNAVAILABLE', 'No GPU provider available', {
      statusCode: 503,
      details: { checkedProviders: providers },
    });
    this.name = 'GPUProviderUnavailableError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if an error is a PersonaError
 */
export function isPersonaError(error: unknown): error is PersonaError {
  return error instanceof PersonaError;
}

/**
 * Wrap unknown errors in a PersonaError
 */
export function wrapError(error: unknown, defaultCode: PersonaErrorCode): PersonaError {
  if (isPersonaError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  const cause = error instanceof Error ? error : undefined;

  return new PersonaError(defaultCode, message, { cause });
}

/**
 * Create a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isPersonaError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}