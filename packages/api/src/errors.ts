/**
 * Error Taxonomy
 *
 * Structured errors with codes, categories, and recovery hints.
 * Every error is explicit. No generic "something went wrong".
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export const ErrorCodes = {
  // Validation errors (1xxx)
  VALIDATION_FAILED: 'E1000',
  INVALID_REQUEST_FORMAT: 'E1001',
  MISSING_REQUIRED_FIELD: 'E1002',
  INVALID_FIELD_TYPE: 'E1003',
  FIELD_OUT_OF_RANGE: 'E1004',
  INVALID_ENUM_VALUE: 'E1005',

  // Authentication errors (2xxx)
  UNAUTHORIZED: 'E2000',
  INVALID_TOKEN: 'E2001',
  TOKEN_EXPIRED: 'E2002',
  INSUFFICIENT_PERMISSIONS: 'E2003',

  // Rate limiting errors (3xxx)
  RATE_LIMITED: 'E3000',
  QUOTA_EXCEEDED: 'E3001',
  CONCURRENT_LIMIT: 'E3002',

  // Resource errors (4xxx)
  NOT_FOUND: 'E4000',
  CONVERSATION_NOT_FOUND: 'E4001',
  USER_NOT_FOUND: 'E4002',
  PROJECT_NOT_FOUND: 'E4003',
  SESSION_NOT_FOUND: 'E4004',

  // Conflict errors (5xxx)
  CONFLICT: 'E5000',
  CONVERSATION_ENDED: 'E5001',
  MODE_SWITCH_REJECTED: 'E5002',
  DUPLICATE_REQUEST: 'E5003',

  // Processing errors (6xxx)
  PROCESSING_FAILED: 'E6000',
  LLM_ERROR: 'E6001',
  RAG_ERROR: 'E6002',
  MEMORY_ERROR: 'E6003',
  TIMEOUT: 'E6004',

  // System errors (9xxx)
  INTERNAL_ERROR: 'E9000',
  SERVICE_UNAVAILABLE: 'E9001',
  DEPENDENCY_FAILED: 'E9002',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// ERROR CLASS
// ============================================================================

export interface AlfredErrorOptions {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
  retryAfter?: number;
  cause?: Error;
}

export class AlfredError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly recoverable: boolean;
  public readonly retryAfter?: number;
  public readonly timestamp: Date;

  constructor(options: AlfredErrorOptions) {
    super(options.message);
    this.name = 'AlfredError';
    this.code = options.code;
    this.details = options.details;
    this.recoverable = options.recoverable ?? false;
    this.retryAfter = options.retryAfter;
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace
    Error.captureStackTrace?.(this, AlfredError);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      recoverable: this.recoverable,
      retryAfter: this.retryAfter,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// ============================================================================
// ERROR FACTORIES
// ============================================================================

export function validationError(
  message: string,
  details?: Record<string, unknown>
): AlfredError {
  return new AlfredError({
    code: ErrorCodes.VALIDATION_FAILED,
    message,
    details,
    recoverable: true,
  });
}

export function missingFieldError(field: string): AlfredError {
  return new AlfredError({
    code: ErrorCodes.MISSING_REQUIRED_FIELD,
    message: `Missing required field: ${field}`,
    details: { field },
    recoverable: true,
  });
}

export function invalidTypeError(
  field: string,
  expected: string,
  received: string
): AlfredError {
  return new AlfredError({
    code: ErrorCodes.INVALID_FIELD_TYPE,
    message: `Invalid type for field '${field}': expected ${expected}, got ${received}`,
    details: { field, expected, received },
    recoverable: true,
  });
}

export function notFoundError(
  resource: string,
  id: string
): AlfredError {
  const codeMap: Record<string, ErrorCode> = {
    conversation: ErrorCodes.CONVERSATION_NOT_FOUND,
    user: ErrorCodes.USER_NOT_FOUND,
    project: ErrorCodes.PROJECT_NOT_FOUND,
    session: ErrorCodes.SESSION_NOT_FOUND,
  };

  return new AlfredError({
    code: codeMap[resource] || ErrorCodes.NOT_FOUND,
    message: `${resource} not found: ${id}`,
    details: { resource, id },
    recoverable: false,
  });
}

export function unauthorizedError(reason?: string): AlfredError {
  return new AlfredError({
    code: ErrorCodes.UNAUTHORIZED,
    message: reason || 'Authentication required',
    recoverable: true,
  });
}

export function rateLimitError(retryAfter: number): AlfredError {
  return new AlfredError({
    code: ErrorCodes.RATE_LIMITED,
    message: 'Rate limit exceeded',
    retryAfter,
    recoverable: true,
  });
}

export function quotaExceededError(
  limit: number,
  period: string
): AlfredError {
  return new AlfredError({
    code: ErrorCodes.QUOTA_EXCEEDED,
    message: `Quota exceeded: ${limit} requests per ${period}`,
    details: { limit, period },
    recoverable: false,
  });
}

export function processingError(
  message: string,
  cause?: Error
): AlfredError {
  return new AlfredError({
    code: ErrorCodes.PROCESSING_FAILED,
    message,
    cause,
    recoverable: true,
  });
}

export function llmError(message: string, cause?: Error): AlfredError {
  return new AlfredError({
    code: ErrorCodes.LLM_ERROR,
    message: `LLM error: ${message}`,
    cause,
    recoverable: true,
  });
}

export function timeoutError(operation: string, timeoutMs: number): AlfredError {
  return new AlfredError({
    code: ErrorCodes.TIMEOUT,
    message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
    details: { operation, timeoutMs },
    recoverable: true,
  });
}

export function internalError(message: string, cause?: Error): AlfredError {
  return new AlfredError({
    code: ErrorCodes.INTERNAL_ERROR,
    message: message || 'An internal error occurred',
    cause,
    recoverable: false,
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export function isAlfredError(error: unknown): error is AlfredError {
  return error instanceof AlfredError;
}

export function toAlfredError(error: unknown): AlfredError {
  if (isAlfredError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return internalError(error.message, error);
  }

  return internalError(String(error));
}

export function getHttpStatus(code: ErrorCode): number {
  const statusMap: Record<string, number> = {
    // Validation: 400
    E1000: 400, E1001: 400, E1002: 400, E1003: 400, E1004: 400, E1005: 400,
    // Auth: 401/403
    E2000: 401, E2001: 401, E2002: 401, E2003: 403,
    // Rate limit: 429
    E3000: 429, E3001: 429, E3002: 429,
    // Not found: 404
    E4000: 404, E4001: 404, E4002: 404, E4003: 404, E4004: 404,
    // Conflict: 409
    E5000: 409, E5001: 409, E5002: 409, E5003: 409,
    // Processing: 500/502
    E6000: 500, E6001: 502, E6002: 500, E6003: 500, E6004: 504,
    // System: 500/503
    E9000: 500, E9001: 503, E9002: 502,
  };

  return statusMap[code] || 500;
}
