/**
 * SENTRY EDGE CONFIGURATION
 * Runs in edge runtime (middleware, edge API routes)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate for edge (high volume)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.SENTRY_RELEASE || 'alfred@0.1.0',

  // Before sending
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null;
    }
    return event;
  },
});
