/**
 * SENTRY CLIENT CONFIGURATION
 * Runs in the browser - captures frontend errors and performance
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay - capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release tracking (set via CI/CD)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'alfred@0.1.0',

  // Filtering
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors that are expected
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // User-initiated navigation
    'AbortError',
    'The operation was aborted',
  ],

  // Breadcrumbs configuration
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },

  // Before sending - add context and filter
  beforeSend(event, hint) {
    // Don't send in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      console.log('[Sentry] Event captured (dev mode, not sent):', event.message);
      return null;
    }

    // Add user context if available
    const userId = typeof window !== 'undefined'
      ? (window as any).__ALFRED_USER_ID__
      : undefined;

    if (userId) {
      event.user = { ...event.user, id: userId };
    }

    return event;
  },

  // Integration configuration
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
