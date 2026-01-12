'use client';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║               ALFRED PRO PREVIEW - STATE OF THE ART                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Premium live preview with:                                                   ║
 * ║  • Device frame simulation                                                    ║
 * ║  • Integrated console panel                                                   ║
 * ║  • Smooth loading transitions                                                 ║
 * ║  • Real-time build metrics                                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import type { PreviewResult, ConsoleEntry } from '@alfred/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderPreviewProps {
  preview: PreviewResult | null;
  isBuilding?: boolean;
  onConsole?: (entry: ConsoleEntry) => void;
  className?: string;
  showLoading?: boolean;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type PanelTab = 'preview' | 'console';

// ============================================================================
// PREVIEW HEADER - Device Controls
// ============================================================================

interface PreviewHeaderProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  consoleCount: number;
  url?: string;
  onRefresh: () => void;
}

const PreviewHeader = memo(function PreviewHeader({
  device,
  onDeviceChange,
  activeTab,
  onTabChange,
  consoleCount,
  onRefresh,
}: PreviewHeaderProps) {
  const devices: { id: DeviceType; icon: string; label: string }[] = [
    { id: 'desktop', icon: 'monitor', label: 'Desktop' },
    { id: 'tablet', icon: 'tablet', label: 'Tablet' },
    { id: 'mobile', icon: 'phone', label: 'Mobile' },
  ];

  return (
    <div className="preview-header">
      {/* Tabs */}
      <div className="header-tabs">
        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => onTabChange('preview')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span>Preview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
          onClick={() => onTabChange('console')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span>Console</span>
          {consoleCount > 0 && <span className="console-badge">{consoleCount}</span>}
        </button>
      </div>

      {/* Device Switcher */}
      {activeTab === 'preview' && (
        <div className="device-switcher">
          {devices.map((d) => (
            <button
              key={d.id}
              className={`device-btn ${device === d.id ? 'active' : ''}`}
              onClick={() => onDeviceChange(d.id)}
              title={d.label}
            >
              <DeviceIcon type={d.icon} />
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="header-actions">
        <button className="action-btn" onClick={onRefresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="action-btn" title="Open in New Tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 44px;
          padding: 0 12px;
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(12, 12, 16, 0.95) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-tabs {
          display: flex;
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tab-btn:hover {
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.04);
        }

        .tab-btn.active {
          color: rgba(255, 255, 255, 0.95);
          background: rgba(139, 92, 246, 0.15);
        }

        .tab-btn.active svg {
          color: #8b5cf6;
        }

        .console-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .device-switcher {
          display: flex;
          gap: 2px;
          padding: 3px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
        }

        .device-btn {
          width: 32px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .device-btn:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .device-btn.active {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .header-actions {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </div>
  );
});

function DeviceIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    monitor: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    tablet: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
      </svg>
    ),
    phone: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[type] || null;
}

// ============================================================================
// CONSOLE PANEL
// ============================================================================

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}

const ConsolePanel = memo(function ConsolePanel({ entries, onClear }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return '#ef4444';
      case 'warn': return '#eab308';
      case 'info': return '#3b82f6';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return '✕';
      case 'warn': return '⚠';
      case 'info': return 'ℹ';
      default: return '›';
    }
  };

  return (
    <div className="console-panel">
      <div className="console-toolbar">
        <span className="console-title">Console</span>
        <button className="clear-btn" onClick={onClear}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
            <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
          </svg>
          <span>Clear</span>
        </button>
      </div>

      <div className="console-entries" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="console-empty">
            <span>No console output</span>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`console-entry ${entry.type}`}>
              <span className="entry-icon" style={{ color: getTypeColor(entry.type) }}>
                {getTypeIcon(entry.type)}
              </span>
              <span className="entry-content" style={{ color: getTypeColor(entry.type) }}>
                {entry.args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')}
              </span>
              <span className="entry-time">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .console-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, #0a0a0c 0%, #0c0c10 100%);
        }

        .console-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .console-title {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .clear-btn:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.06);
        }

        .console-entries {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          font-size: 12px;
        }

        .console-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.25);
          font-size: 12px;
        }

        .console-entry {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          transition: background 0.1s ease;
        }

        .console-entry:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .console-entry.error {
          background: rgba(239, 68, 68, 0.08);
        }

        .console-entry.warn {
          background: rgba(234, 179, 8, 0.05);
        }

        .entry-icon {
          flex-shrink: 0;
          width: 16px;
          text-align: center;
          font-weight: 600;
        }

        .entry-content {
          flex: 1;
          word-break: break-word;
          line-height: 1.5;
        }

        .entry-time {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.25);
          font-size: 10px;
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
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
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [activeTab, setActiveTab] = useState<PanelTab>('preview');
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        const { type, args } = event.data.payload;
        const entry: ConsoleEntry = {
          type: type as 'log' | 'warn' | 'error' | 'info',
          args,
          timestamp: Date.now(),
        };
        setConsoleEntries((prev) => [...prev.slice(-99), entry]);
        onConsole?.(entry);
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
    iframeRef.current.srcdoc = preview.html;
  }, [preview?.html, refreshKey]);

  const handleLoad = useCallback(() => setIsLoaded(true), []);
  const handleError = useCallback(() => {
    setError('Failed to load preview');
    setIsLoaded(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setConsoleEntries([]);
  }, []);

  const handleClearConsole = useCallback(() => setConsoleEntries([]), []);

  const hasErrors = preview?.errors && preview.errors.length > 0;
  const firstError = hasErrors && preview.errors ? preview.errors[0] : null;

  const deviceWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  return (
    <div className={`builder-preview-container ${className}`}>
      <PreviewHeader
        device={device}
        onDeviceChange={setDevice}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        consoleCount={consoleEntries.filter((e) => e.type === 'error').length}
        onRefresh={handleRefresh}
      />

      <div className="preview-content">
        {activeTab === 'preview' ? (
          <div className="preview-viewport">
            {/* Device Frame */}
            <div
              className={`device-frame ${device}`}
              style={{ width: deviceWidths[device], maxWidth: '100%' }}
            >
              {/* Loading State */}
              {showLoading && (isBuilding || !isLoaded) && !hasErrors && (
                <div className="preview-loading">
                  <div className="loading-orb">
                    <div className="orb-ring" />
                    <div className="orb-core" />
                  </div>
                  <span className="loading-text">
                    {isBuilding ? 'Building Project' : 'Rendering'}
                  </span>
                </div>
              )}

              {/* Error State */}
              {hasErrors && (
                <div className="preview-error">
                  <div className="error-glow" />
                  <div className="error-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="error-title">Build Error</div>
                  <div className="error-message">{firstError?.message}</div>
                  {firstError?.line ? (
                    <div className="error-location">
                      Line {firstError.line}, Column {firstError.column}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Runtime Error */}
              {error && (
                <div className="preview-error">
                  <div className="error-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
                      <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="error-title">Preview Error</div>
                  <div className="error-message">{error}</div>
                </div>
              )}

              {/* Iframe */}
              <iframe
                ref={iframeRef}
                key={refreshKey}
                className={`preview-iframe ${isLoaded && !hasErrors ? 'loaded' : ''}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                onLoad={handleLoad}
                onError={handleError}
                title="Alfred Preview"
              />
            </div>

            {/* Build Metrics */}
            {preview?.buildTime && isLoaded && (
              <div className="build-metrics">
                <div className="metric">
                  <span className="metric-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                  <span className="metric-value">{preview.buildTime.toFixed(0)}ms</span>
                </div>
                {typeof preview.metadata?.bundleSize === 'number' && (
                  <div className="metric">
                    <span className="metric-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      </svg>
                    </span>
                    <span className="metric-value">{formatBytes(preview.metadata.bundleSize)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <ConsolePanel entries={consoleEntries} onClear={handleClearConsole} />
        )}
      </div>

      <style jsx>{`
        .builder-preview-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, #0c0c10 0%, #0a0a0e 100%);
          border-left: 1px solid rgba(255, 255, 255, 0.04);
        }

        .preview-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .preview-viewport {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: linear-gradient(180deg, #0a0a0c 0%, #08080a 100%);
          overflow: auto;
        }

        .device-frame {
          position: relative;
          height: 100%;
          min-height: 400px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.06),
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 8px 24px rgba(0, 0, 0, 0.3);
          transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .device-frame.mobile {
          border-radius: 24px;
          box-shadow:
            0 0 0 8px #1a1a1a,
            0 0 0 10px #333,
            0 20px 60px rgba(0, 0, 0, 0.4);
        }

        .device-frame.tablet {
          border-radius: 16px;
          box-shadow:
            0 0 0 6px #1a1a1a,
            0 0 0 8px #333,
            0 20px 60px rgba(0, 0, 0, 0.4);
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
          opacity: 0;
          transition: opacity 0.4s ease;
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
          gap: 20px;
          background: linear-gradient(180deg, #0f0f14 0%, #0a0a0e 100%);
          z-index: 10;
        }

        .loading-orb {
          position: relative;
          width: 56px;
          height: 56px;
        }

        .orb-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(139, 92, 246, 0.8);
          border-right-color: rgba(99, 102, 241, 0.4);
          animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          box-shadow: 0 0 24px rgba(139, 92, 246, 0.5);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          animation: fadeInOut 1.5s ease-in-out infinite;
        }

        .preview-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: linear-gradient(180deg, #0f0f14 0%, #150f1a 100%);
          padding: 32px;
          text-align: center;
          z-index: 20;
        }

        .error-glow {
          position: absolute;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
          filter: blur(40px);
        }

        .error-icon {
          color: #ef4444;
          position: relative;
        }

        .error-title {
          font-size: 18px;
          font-weight: 600;
          color: #ef4444;
        }

        .error-message {
          font-family: 'Fira Code', monospace;
          font-size: 13px;
          color: rgba(239, 68, 68, 0.7);
          max-width: 90%;
          line-height: 1.5;
        }

        .error-location {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Fira Code', monospace;
        }

        .build-metrics {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .metric-icon {
          color: #8b5cf6;
          display: flex;
        }

        .metric-value {
          font-size: 12px;
          font-family: 'Fira Code', monospace;
          color: rgba(255, 255, 255, 0.6);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.7; }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
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

export default BuilderPreview;
