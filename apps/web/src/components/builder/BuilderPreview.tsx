'use client';

/**
 * Builder Preview Component
 *
 * The live preview iframe that shows running React apps.
 * Receives HTML from PreviewManager, displays it, captures console output.
 *
 * State-of-the-art preview with:
 * - Smooth loading transitions
 * - Console capture
 * - Error overlay
 * - Responsive sizing
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PreviewResult, ConsoleEntry } from '@alfred/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderPreviewProps {
  /** Preview result from ESBuild */
  preview: PreviewResult | null;

  /** Whether currently building */
  isBuilding?: boolean;

  /** Callback for console entries from iframe */
  onConsole?: (entry: ConsoleEntry) => void;

  /** Custom class name */
  className?: string;

  /** Show loading overlay */
  showLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BuilderPreview({
  preview,
  isBuilding = false,
  onConsole,
  className = '',
  showLoading = true,
}: BuilderPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle messages from iframe (console capture)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console' && onConsole) {
        const { type, args } = event.data.payload;
        onConsole({
          type: type as 'log' | 'warn' | 'error' | 'info',
          args,
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsole]);

  // Update iframe when preview changes
  useEffect(() => {
    if (!preview?.html || !iframeRef.current) return;

    setIsLoaded(false);
    setError(null);

    // Use srcdoc for the preview HTML
    iframeRef.current.srcdoc = preview.html;
  }, [preview?.html]);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    setError('Failed to load preview');
    setIsLoaded(true);
  }, []);

  // Check for build errors
  const hasErrors = preview?.errors && preview.errors.length > 0;
  const firstError = hasErrors && preview.errors ? preview.errors[0] : null;

  return (
    <div className={`builder-preview ${className}`}>
      {/* Loading Overlay */}
      {showLoading && (isBuilding || !isLoaded) && !hasErrors && (
        <div className="preview-loading">
          <div className="loading-spinner" />
          <span>{isBuilding ? 'Building...' : 'Loading...'}</span>
        </div>
      )}

      {/* Error Overlay */}
      {hasErrors && (
        <div className="preview-error">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Build Error</div>
          <div className="error-message">{firstError?.message}</div>
          {firstError?.line ? (
            <div className="error-location">
              Line {firstError.line}, Column {firstError.column}
            </div>
          ) : null}
        </div>
      )}

      {/* Runtime Error Display */}
      {error && (
        <div className="preview-error">
          <div className="error-icon">❌</div>
          <div className="error-title">Preview Error</div>
          <div className="error-message">{error}</div>
        </div>
      )}

      {/* Preview Iframe */}
      <iframe
        ref={iframeRef}
        className={`preview-iframe ${isLoaded && !hasErrors ? 'loaded' : ''}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        onLoad={handleLoad}
        onError={handleError}
        title="Alfred Preview"
      />

      {/* Build Info */}
      {preview?.buildTime && (
        <div className="preview-info">
          <span className="build-time">
            {preview.buildTime.toFixed(0)}ms
          </span>
          {typeof preview.metadata?.bundleSize === 'number' && (
            <span className="bundle-size">
              {formatBytes(preview.metadata.bundleSize)}
            </span>
          )}
        </div>
      )}

      <style jsx>{`
        .builder-preview {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 300px;
          background: #0a0a0a;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .preview-iframe.loaded {
          opacity: 1;
        }

        .preview-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          z-index: 10;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .preview-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #1a1a2e 0%, #2d1f3d 100%);
          color: #ff6b6b;
          padding: 24px;
          text-align: center;
          z-index: 20;
        }

        .error-icon {
          font-size: 32px;
        }

        .error-title {
          font-size: 16px;
          font-weight: 600;
          color: #ff6b6b;
        }

        .error-message {
          font-family: 'Fira Code', monospace;
          font-size: 13px;
          color: rgba(255, 107, 107, 0.8);
          max-width: 80%;
          word-break: break-word;
        }

        .error-location {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-family: 'Fira Code', monospace;
        }

        .preview-info {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: flex;
          gap: 8px;
          font-size: 11px;
          font-family: 'Fira Code', monospace;
          color: rgba(255, 255, 255, 0.4);
          background: rgba(0, 0, 0, 0.6);
          padding: 4px 8px;
          border-radius: 4px;
          z-index: 5;
        }

        .build-time::before {
          content: '⚡ ';
        }

        .bundle-size::before {
          content: '📦 ';
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BuilderPreview;
