/**
 * Production-ready Logger
 *
 * Provides structured logging with environment-aware behavior:
 * - Development: All logs shown
 * - Production: Only warnings and errors shown (no debug noise)
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('[Chat]', 'Processing request', { userId });  // Hidden in prod
 *   logger.info('[Chat]', 'Request completed', { duration });  // Hidden in prod
 *   logger.warn('[Chat]', 'Rate limit approaching');           // Shown in prod
 *   logger.error('[Chat]', 'Request failed', error);           // Always shown
 */

const isProduction = process.env.NODE_ENV === 'production';
const DEBUG_ENABLED = process.env.DEBUG === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function formatMessage(prefix: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${prefix} ${message}${contextStr}`;
}

export const logger = {
  /**
   * Debug-level logging - hidden in production unless DEBUG=true
   */
  debug(prefix: string, message: string, context?: LogContext): void {
    if (!isProduction || DEBUG_ENABLED) {
      console.log(formatMessage(prefix, message, context));
    }
  },

  /**
   * Info-level logging - hidden in production unless DEBUG=true
   */
  info(prefix: string, message: string, context?: LogContext): void {
    if (!isProduction || DEBUG_ENABLED) {
      console.log(formatMessage(prefix, message, context));
    }
  },

  /**
   * Warning-level logging - always shown
   */
  warn(prefix: string, message: string, context?: LogContext): void {
    console.warn(formatMessage(prefix, message, context));
  },

  /**
   * Error-level logging - always shown
   */
  error(prefix: string, message: string, error?: unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };
    console.error(formatMessage(prefix, message, { ...context, ...errorInfo }));
  },

  /**
   * Performance timing - hidden in production unless DEBUG=true
   */
  time(label: string): void {
    if (!isProduction || DEBUG_ENABLED) {
      console.time(label);
    }
  },

  timeEnd(label: string): void {
    if (!isProduction || DEBUG_ENABLED) {
      console.timeEnd(label);
    }
  },
};

export default logger;
