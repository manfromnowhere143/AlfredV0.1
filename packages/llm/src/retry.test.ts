/**
 * Retry Logic Tests
 *
 * Verifies exponential backoff, error parsing, and circuit breaker.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  calculateDelay,
  isRetryable,
  parseLLMError,
  createCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
} from './retry';
import type { LLMError } from './types';

// ============================================================================
// WITH RETRY
// ============================================================================

describe('withRetry', () => {
  it('returns result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429, error: { type: 'rate_limit_error' } })
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue({ 
      status: 400, 
      error: { type: 'invalid_request_error', message: 'Bad request' } 
    });

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 10 }))
      .rejects.toBeDefined();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max retries', async () => {
    const fn = vi.fn().mockRejectedValue({ 
      status: 503, 
      error: { type: 'overloaded_error' } 
    });

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 20 }))
      .rejects.toBeDefined();

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});

// ============================================================================
// CALCULATE DELAY
// ============================================================================

describe('calculateDelay', () => {
  it('uses exponential backoff', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 };

    const delay0 = calculateDelay(0, null, config);
    const delay1 = calculateDelay(1, null, config);
    const delay2 = calculateDelay(2, null, config);

    expect(delay0).toBe(1000);
    expect(delay1).toBe(2000);
    expect(delay2).toBe(4000);
  });

  it('caps at maxDelay', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, maxDelay: 5000, jitterFactor: 0 };

    const delay = calculateDelay(10, null, config); // Would be 1024000 without cap

    expect(delay).toBe(5000);
  });

  it('uses retry-after from error', () => {
    const error: LLMError = {
      type: 'rate_limit_error',
      message: 'Rate limited',
      retryable: true,
      retryAfter: 60,
    };

    const delay = calculateDelay(0, error, DEFAULT_RETRY_CONFIG);

    expect(delay).toBe(60000); // 60 seconds in ms
  });

  it('adds jitter', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0.5 };
    const delays = new Set<number>();

    // Run multiple times to check for variation
    for (let i = 0; i < 10; i++) {
      delays.add(calculateDelay(0, null, config));
    }

    // With jitter, we should have some variation
    expect(delays.size).toBeGreaterThan(1);
  });
});

// ============================================================================
// IS RETRYABLE
// ============================================================================

describe('isRetryable', () => {
  it('returns true for rate limit errors', () => {
    const error: LLMError = {
      type: 'rate_limit_error',
      message: 'Rate limited',
      retryable: true,
      statusCode: 429,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(true);
  });

  it('returns true for overloaded errors', () => {
    const error: LLMError = {
      type: 'overloaded_error',
      message: 'Overloaded',
      retryable: true,
      statusCode: 529,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(true);
  });

  it('returns true for timeout errors', () => {
    const error: LLMError = {
      type: 'timeout_error',
      message: 'Timeout',
      retryable: true,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(true);
  });

  it('returns true for 5xx status codes', () => {
    const error: LLMError = {
      type: 'api_error',
      message: 'Server error',
      retryable: true,
      statusCode: 500,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(true);
  });

  it('returns false for authentication errors', () => {
    const error: LLMError = {
      type: 'authentication_error',
      message: 'Invalid API key',
      retryable: false,
      statusCode: 401,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(false);
  });

  it('returns false for invalid request errors', () => {
    const error: LLMError = {
      type: 'invalid_request_error',
      message: 'Bad request',
      retryable: false,
      statusCode: 400,
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(false);
  });

  it('returns false for null error', () => {
    expect(isRetryable(null, DEFAULT_RETRY_CONFIG)).toBe(false);
  });

  it('respects explicit retryable flag', () => {
    const error: LLMError = {
      type: 'rate_limit_error',
      message: 'Rate limited',
      retryable: false, // Explicitly not retryable
    };

    expect(isRetryable(error, DEFAULT_RETRY_CONFIG)).toBe(false);
  });
});

// ============================================================================
// PARSE LLM ERROR
// ============================================================================

describe('parseLLMError', () => {
  it('returns null for null input', () => {
    expect(parseLLMError(null)).toBeNull();
  });

  it('returns same error if already LLMError', () => {
    const error: LLMError = {
      type: 'api_error',
      message: 'Test',
      retryable: false,
    };

    expect(parseLLMError(error)).toBe(error);
  });

  it('parses Anthropic-style error', () => {
    const anthropicError = {
      status: 429,
      error: {
        type: 'rate_limit_error',
        message: 'Rate limit exceeded',
      },
    };

    const parsed = parseLLMError(anthropicError);

    expect(parsed?.type).toBe('rate_limit_error');
    expect(parsed?.message).toBe('Rate limit exceeded');
    expect(parsed?.statusCode).toBe(429);
    expect(parsed?.retryable).toBe(true);
  });

  it('parses generic Error', () => {
    const error = new Error('Network timeout');

    const parsed = parseLLMError(error);

    expect(parsed?.type).toBe('timeout_error');
    expect(parsed?.message).toBe('Network timeout');
  });

  it('infers network error from message', () => {
    const error = new Error('ECONNREFUSED');

    const parsed = parseLLMError(error);

    expect(parsed?.type).toBe('network_error');
    expect(parsed?.retryable).toBe(true);
  });

  it('handles string error', () => {
    const parsed = parseLLMError('Something went wrong');

    expect(parsed?.type).toBe('api_error');
    expect(parsed?.message).toBe('Something went wrong');
  });
});

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

describe('CircuitBreaker', () => {
  it('starts in closed state', () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    expect(breaker.state).toBe('closed');
    expect(breaker.failures).toBe(0);
  });

  it('allows requests when closed', async () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    const result = await breaker.execute(async () => 'success');

    expect(result).toBe('success');
  });

  it('counts failures', async () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    });

    try {
      await breaker.execute(async () => { throw new Error('fail'); });
    } catch {}

    expect(breaker.failures).toBe(1);
  });

  it('opens after threshold failures', async () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 1000,
    });

    // Fail twice
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(breaker.state).toBe('open');
  });

  it('rejects requests when open', async () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 10000,
    });

    // Trigger open state
    try {
      await breaker.execute(async () => { throw new Error('fail'); });
    } catch {}

    // Should reject immediately
    await expect(breaker.execute(async () => 'success'))
      .rejects.toThrow('Circuit breaker is open');
  });

  it('can be reset', async () => {
    const breaker = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
    });

    // Trigger open state
    try {
      await breaker.execute(async () => { throw new Error('fail'); });
    } catch {}

    expect(breaker.state).toBe('open');

    breaker.reset();

    expect(breaker.state).toBe('closed');
    expect(breaker.failures).toBe(0);
  });
});
