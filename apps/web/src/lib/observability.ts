/**
 * OBSERVABILITY UTILITIES
 * Request tracing, error capture, and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';
import { headers } from 'next/headers';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST ID / TRACE ID
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a unique request ID for distributed tracing
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Gets the request ID from headers or generates a new one
 */
export function getRequestId(): string {
  try {
    const headersList = headers();
    return (
      headersList.get('x-request-id') ||
      headersList.get('x-vercel-id') ||
      generateRequestId()
    );
  } catch {
    // headers() throws outside of request context
    return generateRequestId();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CAPTURE
// ═══════════════════════════════════════════════════════════════════════════════

interface CaptureContext {
  userId?: string;
  requestId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

/**
 * Captures an error to Sentry with context
 */
export function captureError(error: Error, context?: CaptureContext): string {
  const eventId = Sentry.captureException(error, {
    user: context?.userId ? { id: context.userId } : undefined,
    tags: {
      requestId: context?.requestId,
      ...context?.tags,
    },
    extra: context?.extra,
    level: context?.level || 'error',
  });

  // Also log to console for local debugging
  console.error(`[Error ${eventId}]`, error.message, context);

  return eventId;
}

/**
 * Captures a message to Sentry
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Omit<CaptureContext, 'level'>
): string {
  const eventId = Sentry.captureMessage(message, {
    level,
    user: context?.userId ? { id: context.userId } : undefined,
    tags: {
      requestId: context?.requestId,
      ...context?.tags,
    },
    extra: context?.extra,
  });

  return eventId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════════════════════

interface SpanContext {
  name: string;
  op?: string;
  description?: string;
  data?: Record<string, unknown>;
}

/**
 * Creates a performance span for tracking operation duration
 */
export async function withSpan<T>(
  context: SpanContext,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: context.name,
      op: context.op || 'function',
      // Cast to any to avoid strict SpanAttributes type mismatch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributes: context.data as any,
    },
    async () => {
      return await fn();
    }
  );
}

/**
 * Measures and logs operation duration
 */
export function measureDuration(operationName: string): () => number {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    console.log(`[Perf] ${operationName}: ${duration.toFixed(2)}ms`);
    return duration;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface RouteHandlerContext {
  requestId: string;
  userId?: string;
  startTime: number;
}

/**
 * Wraps an API route handler with observability
 */
export function withObservability<T>(
  handler: (context: RouteHandlerContext) => Promise<T>
): () => Promise<T> {
  return async () => {
    const requestId = getRequestId();
    const startTime = performance.now();

    // Set Sentry context
    Sentry.setTag('requestId', requestId);

    try {
      const result = await handler({
        requestId,
        startTime,
      });

      // Log successful completion
      const duration = performance.now() - startTime;
      console.log(`[API] Request ${requestId} completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      // Capture and rethrow
      if (error instanceof Error) {
        captureError(error, { requestId });
      }
      throw error;
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BREADCRUMBS
// ═══════════════════════════════════════════════════════════════════════════════

type BreadcrumbCategory = 'navigation' | 'http' | 'user' | 'console' | 'ui' | 'query';

/**
 * Adds a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: BreadcrumbCategory,
  data?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sets the current user for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Sets a tag for all future events
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Sets extra context data
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}
