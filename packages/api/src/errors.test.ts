/**
 * Error Tests
 *
 * Verifies error taxonomy and factories.
 */

import { describe, it, expect } from 'vitest';
import {
  AlfredError,
  ErrorCodes,
  validationError,
  missingFieldError,
  invalidTypeError,
  notFoundError,
  unauthorizedError,
  rateLimitError,
  processingError,
  timeoutError,
  internalError,
  isAlfredError,
  toAlfredError,
  getHttpStatus,
} from './errors';

// ============================================================================
// ALFRED ERROR CLASS
// ============================================================================

describe('AlfredError', () => {
  it('creates error with all properties', () => {
    const error = new AlfredError({
      code: ErrorCodes.VALIDATION_FAILED,
      message: 'Test error',
      details: { field: 'name' },
      recoverable: true,
    });

    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(error.message).toBe('Test error');
    expect(error.details).toEqual({ field: 'name' });
    expect(error.recoverable).toBe(true);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('defaults recoverable to false', () => {
    const error = new AlfredError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Test',
    });

    expect(error.recoverable).toBe(false);
  });

  it('serializes to JSON', () => {
    const error = new AlfredError({
      code: ErrorCodes.NOT_FOUND,
      message: 'Not found',
      recoverable: false,
    });

    const json = error.toJSON();

    expect(json.code).toBe(ErrorCodes.NOT_FOUND);
    expect(json.message).toBe('Not found');
    expect(typeof json.timestamp).toBe('string');
  });

  it('captures cause', () => {
    const cause = new Error('Original error');
    const error = new AlfredError({
      code: ErrorCodes.PROCESSING_FAILED,
      message: 'Wrapped',
      cause,
    });

    expect(error.cause).toBe(cause);
  });
});

// ============================================================================
// ERROR FACTORIES
// ============================================================================

describe('error factories', () => {
  it('validationError creates correct error', () => {
    const error = validationError('Invalid input', { field: 'email' });

    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.details).toEqual({ field: 'email' });
  });

  it('missingFieldError includes field name', () => {
    const error = missingFieldError('username');

    expect(error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD);
    expect(error.message).toContain('username');
    expect(error.details?.field).toBe('username');
  });

  it('invalidTypeError includes type info', () => {
    const error = invalidTypeError('age', 'number', 'string');

    expect(error.code).toBe(ErrorCodes.INVALID_FIELD_TYPE);
    expect(error.message).toContain('age');
    expect(error.message).toContain('number');
    expect(error.message).toContain('string');
  });

  it('notFoundError maps to correct code', () => {
    const conversationError = notFoundError('conversation', 'conv_123');
    const userError = notFoundError('user', 'user_456');
    const genericError = notFoundError('widget', 'w_789');

    expect(conversationError.code).toBe(ErrorCodes.CONVERSATION_NOT_FOUND);
    expect(userError.code).toBe(ErrorCodes.USER_NOT_FOUND);
    expect(genericError.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it('rateLimitError includes retryAfter', () => {
    const error = rateLimitError(30);

    expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
    expect(error.retryAfter).toBe(30);
    expect(error.recoverable).toBe(true);
  });

  it('timeoutError includes operation info', () => {
    const error = timeoutError('database_query', 5000);

    expect(error.code).toBe(ErrorCodes.TIMEOUT);
    expect(error.message).toContain('database_query');
    expect(error.message).toContain('5000');
  });
});

// ============================================================================
// ERROR UTILITIES
// ============================================================================

describe('isAlfredError', () => {
  it('returns true for AlfredError', () => {
    const error = new AlfredError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Test',
    });

    expect(isAlfredError(error)).toBe(true);
  });

  it('returns false for regular Error', () => {
    const error = new Error('Test');

    expect(isAlfredError(error)).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isAlfredError(null)).toBe(false);
    expect(isAlfredError('error')).toBe(false);
    expect(isAlfredError({})).toBe(false);
  });
});

describe('toAlfredError', () => {
  it('returns same error if already AlfredError', () => {
    const error = internalError('Test');
    const converted = toAlfredError(error);

    expect(converted).toBe(error);
  });

  it('wraps regular Error', () => {
    const error = new Error('Original');
    const converted = toAlfredError(error);

    expect(converted.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(converted.message).toBe('Original');
  });

  it('handles non-error values', () => {
    const converted = toAlfredError('something went wrong');

    expect(converted.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(converted.message).toBe('something went wrong');
  });
});

describe('getHttpStatus', () => {
  it('maps validation errors to 400', () => {
    expect(getHttpStatus(ErrorCodes.VALIDATION_FAILED)).toBe(400);
    expect(getHttpStatus(ErrorCodes.MISSING_REQUIRED_FIELD)).toBe(400);
  });

  it('maps auth errors to 401/403', () => {
    expect(getHttpStatus(ErrorCodes.UNAUTHORIZED)).toBe(401);
    expect(getHttpStatus(ErrorCodes.INSUFFICIENT_PERMISSIONS)).toBe(403);
  });

  it('maps not found to 404', () => {
    expect(getHttpStatus(ErrorCodes.NOT_FOUND)).toBe(404);
    expect(getHttpStatus(ErrorCodes.CONVERSATION_NOT_FOUND)).toBe(404);
  });

  it('maps rate limit to 429', () => {
    expect(getHttpStatus(ErrorCodes.RATE_LIMITED)).toBe(429);
  });

  it('maps internal errors to 500', () => {
    expect(getHttpStatus(ErrorCodes.INTERNAL_ERROR)).toBe(500);
  });
});
