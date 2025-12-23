/**
 * Retry Logic
 *
 * Exponential backoff with jitter for LLM API calls.
 * Handles rate limits, timeouts, and transient errors.
 */

import type { LLMError, LLMErrorType } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor?: number;
  retryableErrors?: LLMErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.2,
  retryableErrors: [
    'rate_limit_error',
    'overloaded_error',
    'timeout_error',
    'network_error',
  ],
};

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Executes a function with retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const llmError = parseLLMError(error);

      // Check if error is retryable
      if (!isRetryable(llmError, mergedConfig)) {
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt >= mergedConfig.maxRetries) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, llmError, mergedConfig);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Calculates delay with exponential backoff and jitter.
 */
export function calculateDelay(
  attempt: number,
  error: LLMError | null,
  config: RetryConfig
): number {
  // If rate limited, use the server's retry-after if available
  if (error?.retryAfter) {
    return error.retryAfter * 1000;
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = config.jitterFactor || 0;
  const jitterAmount = cappedDelay * jitter * (Math.random() * 2 - 1);

  return Math.max(0, cappedDelay + jitterAmount);
}

/**
 * Checks if an error is retryable.
 */
export function isRetryable(
  error: LLMError | null,
  config: RetryConfig
): boolean {
  if (!error) return false;

  // Check explicit retryable flag
  if (error.retryable === false) return false;

  // Check if error type is in retryable list
  if (config.retryableErrors?.includes(error.type)) {
    return true;
  }

  // Check status codes
  if (error.statusCode) {
    // 429 = rate limit, 503 = service unavailable, 529 = overloaded
    if ([429, 503, 529].includes(error.statusCode)) {
      return true;
    }

    // 5xx errors are generally retryable
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parses an error into LLMError format.
 */
export function parseLLMError(error: unknown): LLMError | null {
  if (!error) return null;

  // Already an LLMError
  if (isLLMError(error)) {
    return error;
  }

  // Anthropic SDK error
  if (isAnthropicError(error)) {
    return parseAnthropicError(error);
  }

  // Generic Error
  if (error instanceof Error) {
    return {
      type: inferErrorType(error),
      message: error.message,
      retryable: isTransientError(error),
    };
  }

  // Unknown error
  return {
    type: 'api_error',
    message: String(error),
    retryable: false,
  };
}

function isLLMError(error: unknown): error is LLMError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'retryable' in error
  );
}

interface AnthropicErrorLike {
  status?: number;
  error?: {
    type?: string;
    message?: string;
  };
  message?: string;
  headers?: Record<string, string>;
}

function isAnthropicError(error: unknown): error is AnthropicErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'error' in error)
  );
}

function parseAnthropicError(error: AnthropicErrorLike): LLMError {
  const statusCode = error.status;
  const errorType = error.error?.type || 'api_error';
  const message = error.error?.message || error.message || 'Unknown API error';

  // Parse retry-after header
  let retryAfter: number | undefined;
  if (error.headers?.['retry-after']) {
    retryAfter = parseInt(error.headers['retry-after'], 10);
  }

  // Map Anthropic error types to our types
  const typeMap: Record<string, LLMErrorType> = {
    authentication_error: 'authentication_error',
    rate_limit_error: 'rate_limit_error',
    invalid_request_error: 'invalid_request_error',
    overloaded_error: 'overloaded_error',
    api_error: 'api_error',
  };

  const type = typeMap[errorType] || 'api_error';

  return {
    type,
    message,
    statusCode,
    retryable: isRetryableStatusCode(statusCode),
    retryAfter,
  };
}

function inferErrorType(error: Error): LLMErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) return 'timeout_error';
  if (message.includes('network') || message.includes('econnrefused')) return 'network_error';
  if (message.includes('rate limit')) return 'rate_limit_error';
  if (message.includes('unauthorized') || message.includes('api key')) return 'authentication_error';

  return 'api_error';
}

function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();

  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('socket')
  );
}

function isRetryableStatusCode(statusCode: number | undefined): boolean {
  if (!statusCode) return false;
  return statusCode === 429 || statusCode >= 500;
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CIRCUIT BREAKER (Optional)
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

export interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number | null;
  execute<T>(fn: () => Promise<T>): Promise<T>;
  reset(): void;
}

/**
 * Creates a circuit breaker for LLM calls.
 */
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  let state: CircuitBreaker['state'] = 'closed';
  let failures = 0;
  let lastFailure: number | null = null;

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (state === 'open' && lastFailure) {
      const timeSinceFailure = Date.now() - lastFailure;
      if (timeSinceFailure >= config.resetTimeout) {
        state = 'half-open';
      }
    }

    // If open, fail fast
    if (state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();

      // Success — reset if half-open
      if (state === 'half-open') {
        state = 'closed';
        failures = 0;
        lastFailure = null;
      }

      return result;
    } catch (error) {
      failures++;
      lastFailure = Date.now();

      // Open circuit if threshold exceeded
      if (failures >= config.failureThreshold) {
        state = 'open';
      }

      throw error;
    }
  }

  function reset(): void {
    state = 'closed';
    failures = 0;
    lastFailure = null;
  }

  return {
    get state() { return state; },
    get failures() { return failures; },
    get lastFailure() { return lastFailure; },
    execute,
    reset,
  };
}
