'use client';

/**
 * GLOBAL ERROR BOUNDARY
 * Catches unhandled errors in the app and reports to Sentry
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'global',
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 500,
                marginBottom: '1rem',
                color: '#ef4444',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                marginBottom: '1.5rem',
                maxWidth: '400px',
              }}
            >
              An unexpected error occurred. Our team has been notified and is working on a fix.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                backgroundColor: '#1f2937',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1f2937')}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
