'use client';

/**
 * Mermaid Diagram Renderer — State of the Art
 *
 * Renders Mermaid diagrams with beautiful dark theme styling.
 * Supports: flowcharts, sequence diagrams, class diagrams,
 * state diagrams, ER diagrams, gantt charts, and more.
 */

import React, { useEffect, useRef, useState, memo } from 'react';

export interface MermaidRendererProps {
  /** Mermaid diagram code */
  chart: string;
  /** Optional className */
  className?: string;
  /** Callback when diagram renders */
  onRender?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// Mermaid loading state
let mermaidInstance: any = null;
let mermaidLoadPromise: Promise<any> | null = null;

// Load Mermaid via script tag (browser-only)
function loadMermaid(): Promise<any> {
  if (mermaidInstance) return Promise.resolve(mermaidInstance);
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded globally
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      mermaidInstance = (window as any).mermaid;
      initializeMermaid(mermaidInstance);
      resolve(mermaidInstance);
      return;
    }

    // Load script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.7.0/dist/mermaid.min.js';
    script.async = true;

    script.onload = () => {
      if ((window as any).mermaid) {
        mermaidInstance = (window as any).mermaid;
        initializeMermaid(mermaidInstance);
        resolve(mermaidInstance);
      } else {
        reject(new Error('Mermaid failed to load'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Mermaid script'));
    };

    document.head.appendChild(script);
  });

  return mermaidLoadPromise;
}

function initializeMermaid(mermaid: any) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#8b5cf6',
      primaryTextColor: '#fff',
      primaryBorderColor: '#6366f1',
      lineColor: '#6366f1',
      secondaryColor: '#1e1e2e',
      tertiaryColor: '#0d0d10',
      background: '#0d0d10',
      mainBkg: '#1e1e2e',
      textColor: '#e5e7eb',
      nodeBorder: '#6366f1',
      clusterBkg: '#1e1e2e',
      titleColor: '#fff',
      edgeLabelBackground: '#1e1e2e',
      fontFamily: '"SF Mono", "Fira Code", Monaco, monospace',
      fontSize: '14px',
    },
    flowchart: {
      curve: 'basis',
      padding: 20,
      useMaxWidth: true,
      htmlLabels: true,
    },
    sequence: {
      actorMargin: 50,
      mirrorActors: false,
      useMaxWidth: true,
    },
    class: {
      useMaxWidth: true,
    },
    er: {
      useMaxWidth: true,
    },
    gantt: {
      useMaxWidth: true,
    },
  });
}

export const MermaidRenderer = memo(function MermaidRenderer({
  chart,
  className = '',
  onRender,
  onError,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (!chart.trim()) {
      setSvg('');
      setError(null);
      setIsLoading(false);
      return;
    }

    const renderId = ++renderIdRef.current;

    async function renderDiagram() {
      try {
        setIsLoading(true);
        setError(null);

        const mermaid = await loadMermaid();

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());

        // Only update if this is still the current render
        if (renderId === renderIdRef.current) {
          setSvg(renderedSvg);
          setIsLoading(false);
          onRender?.();
        }
      } catch (err) {
        if (renderId === renderIdRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
          setError(errorMessage);
          setSvg('');
          setIsLoading(false);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    }

    renderDiagram();
  }, [chart, onRender, onError]);

  return (
    <div className={`mermaid-renderer ${className}`}>
      {isLoading && (
        <div className="mermaid-loading">
          <div className="loading-spinner" />
          <span>Rendering diagram...</span>
        </div>
      )}

      {error && (
        <div className="mermaid-error">
          <div className="error-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="error-content">
            <span className="error-title">Diagram Error</span>
            <span className="error-message">{error}</span>
          </div>
        </div>
      )}

      {svg && !error && (
        <div
          ref={containerRef}
          className="mermaid-content"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <style jsx>{`
        .mermaid-renderer {
          background: #0d0d10;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          overflow: auto;
        }

        .mermaid-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .mermaid-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
        }

        .error-icon {
          flex-shrink: 0;
          color: #ef4444;
        }

        .error-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .error-title {
          font-size: 13px;
          font-weight: 600;
          color: #ef4444;
        }

        .error-message {
          font-size: 12px;
          color: rgba(239, 68, 68, 0.8);
          font-family: 'Fira Code', monospace;
        }

        .mermaid-content {
          display: flex;
          justify-content: center;
          overflow: auto;
        }

        .mermaid-content :global(svg) {
          max-width: 100%;
          height: auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default MermaidRenderer;
