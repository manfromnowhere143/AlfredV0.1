/**
 * SENTRY SERVER CONFIGURATION
 * Runs on the server - captures API errors and server-side issues
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.SENTRY_RELEASE || 'alfred@0.1.0',

  // Server-specific filtering
  ignoreErrors: [
    // Expected operational errors
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    // Auth errors (not bugs)
    'Unauthorized',
    'Invalid session',
  ],

  // Before sending
  beforeSend(event, hint) {
    // Don't send in development
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }

    // Add request context
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'statusCode' in error) {
      event.tags = {
        ...event.tags,
        statusCode: String((error as any).statusCode),
      };
    }

    return event;
  },

  // Integrations
  integrations: [
    // Note: nodeProfilingIntegration requires @sentry/profiling-node package
    // Add profiling later if needed for production performance monitoring
  ],
});
