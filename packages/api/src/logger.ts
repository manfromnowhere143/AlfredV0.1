/**
 * Logger
 *
 * Structured logging with context, levels, and formatting.
 * No external dependencies. Production-ready.
 */

// ============================================================================
// LOG LEVELS
// ============================================================================

export const LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

export type LogLevel = keyof typeof LogLevels;

// ============================================================================
// LOG ENTRY
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: ErrorInfo;
  traceId?: string;
  spanId?: string;
  duration?: number;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

// ============================================================================
// LOGGER CONFIG
// ============================================================================

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  includeTimestamp: boolean;
  includeLevel: boolean;
  redactKeys: string[];
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'INFO',
  format: 'json',
  includeTimestamp: true,
  includeLevel: true,
  redactKeys: ['password', 'token', 'secret', 'apiKey', 'authorization'],
};

// ============================================================================
// LOGGER
// ============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
  setLevel(level: LogLevel): void;
}

/**
 * Creates a structured logger.
 */
export function createLogger(
  config: Partial<LoggerConfig> = {},
  baseContext: Record<string, unknown> = {}
): Logger {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  function shouldLog(level: LogLevel): boolean {
    return LogLevels[level] >= LogLevels[mergedConfig.level];
  }

  function redact(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (mergedConfig.redactKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  function formatError(error: Error): ErrorInfo {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
    };
  }

  function write(entry: LogEntry): void {
    const redactedEntry = {
      ...entry,
      context: entry.context ? redact(entry.context) : undefined,
    };

    if (mergedConfig.format === 'json') {
      console.log(JSON.stringify(redactedEntry));
    } else {
      const parts: string[] = [];

      if (mergedConfig.includeTimestamp) {
        parts.push(`[${entry.timestamp}]`);
      }

      if (mergedConfig.includeLevel) {
        parts.push(`[${entry.level}]`);
      }

      parts.push(entry.message);

      if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(JSON.stringify(redact(entry.context)));
      }

      if (entry.error) {
        parts.push(`\n  Error: ${entry.error.message}`);
        if (entry.error.stack) {
          parts.push(`\n  ${entry.error.stack}`);
        }
      }

      console.log(parts.join(' '));
    }
  }

  function log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...baseContext, ...context },
      error: error ? formatError(error) : undefined,
    };

    write(entry);
  }

  const logger: Logger = {
    debug: (message, context) => log('DEBUG', message, context),
    info: (message, context) => log('INFO', message, context),
    warn: (message, context) => log('WARN', message, context),
    error: (message, error, context) => log('ERROR', message, context, error),
    fatal: (message, error, context) => log('FATAL', message, context, error),

    child: (context) => createLogger(mergedConfig, { ...baseContext, ...context }),

    setLevel: (level) => {
      mergedConfig.level = level;
    },
  };

  return logger;
}

// ============================================================================
// REQUEST LOGGING
// ============================================================================

export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

export interface ResponseLogContext {
  statusCode: number;
  duration: number;
  contentLength?: number;
}

/**
 * Creates a request-scoped logger.
 */
export function createRequestLogger(
  logger: Logger,
  request: RequestLogContext
): Logger {
  return logger.child({
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    userId: request.userId,
  });
}

/**
 * Logs request start.
 */
export function logRequestStart(
  logger: Logger,
  request: RequestLogContext
): void {
  logger.info('Request started', {
    method: request.method,
    path: request.path,
    userAgent: request.userAgent,
    ip: request.ip,
  });
}

/**
 * Logs request completion.
 */
export function logRequestEnd(
  logger: Logger,
  request: RequestLogContext,
  response: ResponseLogContext
): void {
                response.statusCode >= 400 ? 'warn' : 'info';

  logger.info('Request completed', {
    method: request.method,
    path: request.path,
    statusCode: response.statusCode,
    duration: response.duration,
    contentLength: response.contentLength,
  });
}

// ============================================================================
// PERFORMANCE LOGGING
// ============================================================================

export interface PerformanceMarker {
  name: string;
  startTime: number;
  logger: Logger;
}

/**
 * Starts a performance measurement.
 */
export function startMeasure(logger: Logger, name: string): PerformanceMarker {
  return {
    name,
    startTime: Date.now(),
    logger,
  };
}

/**
 * Ends a performance measurement and logs it.
 */
export function endMeasure(marker: PerformanceMarker, context?: Record<string, unknown>): number {
  const duration = Date.now() - marker.startTime;

  marker.logger.debug(`${marker.name} completed`, {
    ...context,
    duration,
    operation: marker.name,
  });

  return duration;
}

// ============================================================================
// DEFAULT LOGGER
// ============================================================================

export const defaultLogger = createLogger({
  level: process.env.LOG_LEVEL as LogLevel || 'INFO',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
});
