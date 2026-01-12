'use client';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                     ALFRED PRO BUILDER - STATE OF THE ART                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Premium IDE experience with:                                                 ║
 * ║  • Glass morphism & depth effects                                             ║
 * ║  • Micro-interactions on every element                                        ║
 * ║  • AI-native streaming indicators                                             ║
 * ║  • Apple-grade polish & animations                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import type { VirtualFile, VirtualDirectory, ConsoleEntry, PreviewResult } from '@alfred/core';
import { FileExplorer } from './FileExplorer';
import { BuilderPreview } from './BuilderPreview';

// Dynamic import for Monaco
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => <EditorLoadingState />,
});

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderLayoutProps {
  fileTree: VirtualDirectory | null;
  selectedFile: VirtualFile | null;
  previewResult: PreviewResult | null;
  isBuilding?: boolean;
  isStreaming?: boolean;
  projectName?: string;
  onFileSelect?: (file: VirtualFile) => void;
  onFileChange?: (path: string, content: string) => void;
  onConsole?: (entry: ConsoleEntry) => void;
  onDeploy?: () => void;
  className?: string;
}

// ============================================================================
// LOADING STATES
// ============================================================================

function EditorLoadingState() {
  return (
    <div className="editor-loading">
      <div className="loading-orb">
        <div className="orb-ring" />
        <div className="orb-core" />
      </div>
      <span className="loading-text">Initializing Editor</span>

      <style jsx>{`
        .editor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
          background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
        }

        .loading-orb {
          position: relative;
          width: 48px;
          height: 48px;
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
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
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
// HEADER BAR - Premium Project Header
// ============================================================================

interface HeaderBarProps {
  projectName: string;
  isBuilding: boolean;
  isStreaming: boolean;
  onDeploy?: () => void;
}

const HeaderBar = memo(function HeaderBar({
  projectName,
  isBuilding,
  isStreaming,
  onDeploy,
}: HeaderBarProps) {
  return (
    <header className="header-bar">
      {/* Left Section - Project Info */}
      <div className="header-left">
        <div className="project-badge">
          <div className="badge-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="project-name">{projectName}</span>
        </div>

        {/* Status Indicator */}
        <div className={`status-pill ${isStreaming ? 'streaming' : isBuilding ? 'building' : 'ready'}`}>
          <div className="status-dot" />
          <span className="status-text">
            {isStreaming ? 'AI Generating' : isBuilding ? 'Building' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Center Section - Tabs placeholder */}
      <div className="header-center">
        <div className="alfred-branding">
          <span className="alfred-text">ALFRED</span>
          <span className="pro-badge">PRO</span>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="header-right">
        <button className="header-btn secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span>New File</span>
        </button>

        <button className="header-btn primary" onClick={onDeploy}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 14l8-8 8 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 6v15" strokeLinecap="round" />
          </svg>
          <span>Deploy</span>
        </button>
      </div>

      <style jsx>{`
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 20px;
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 14, 0.95) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          z-index: 50;
        }

        .header-bar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
          opacity: 0.5;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .project-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .project-badge:hover {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .badge-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b5cf6;
        }

        .project-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: -0.01em;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-pill.ready .status-dot {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .status-pill.building .status-dot {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
          animation: pulse 1s ease-in-out infinite;
        }

        .status-pill.streaming .status-dot {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
          animation: pulse 0.8s ease-in-out infinite;
        }

        .status-text {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .alfred-branding {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alfred-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 4px;
          color: rgba(255, 255, 255, 0.25);
        }

        .pro-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 3px 6px;
          background: linear-gradient(135deg, rgba(201, 185, 154, 0.2), rgba(201, 185, 154, 0.1));
          color: #c9b99a;
          border-radius: 4px;
          border: 1px solid rgba(201, 185, 154, 0.2);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .header-btn.secondary {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }

        .header-btn.primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .header-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .header-btn:active {
          transform: scale(0.97);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </header>
  );
});

// ============================================================================
// ACTIVITY BAR - Left Side Icons
// ============================================================================

interface ActivityBarProps {
  activePanel: 'files' | 'search' | 'ai' | 'settings';
  onPanelChange: (panel: 'files' | 'search' | 'ai' | 'settings') => void;
}

const ActivityBar = memo(function ActivityBar({ activePanel, onPanelChange }: ActivityBarProps) {
  const items = [
    { id: 'files' as const, icon: 'files', label: 'Explorer' },
    { id: 'search' as const, icon: 'search', label: 'Search' },
    { id: 'ai' as const, icon: 'ai', label: 'AI Assistant' },
    { id: 'settings' as const, icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`activity-btn ${activePanel === item.id ? 'active' : ''}`}
          onClick={() => onPanelChange(item.id)}
          title={item.label}
        >
          <ActivityIcon type={item.icon} />
          {activePanel === item.id && <div className="active-indicator" />}
        </button>
      ))}

      <style jsx>{`
        .activity-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 52px;
          padding: 12px 0;
          gap: 4px;
          background: linear-gradient(180deg, #0c0c10 0%, #08080a 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .activity-btn {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .activity-btn:hover {
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.04);
        }

        .activity-btn.active {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 0 2px 2px 0;
        }
      `}</style>
    </div>
  );
});

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    files: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    search: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
    ai: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  };
  return icons[type] || null;
}

// ============================================================================
// STATUS BAR - Bottom Info Bar
// ============================================================================

interface StatusBarProps {
  file: VirtualFile | null;
  isBuilding: boolean;
}

const StatusBar = memo(function StatusBar({ file, isBuilding }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-left">
        {isBuilding && (
          <div className="build-indicator">
            <div className="build-spinner" />
            <span>Building...</span>
          </div>
        )}
        {!isBuilding && (
          <div className="ready-indicator">
            <div className="ready-dot" />
            <span>Ready</span>
          </div>
        )}
      </div>

      <div className="status-center">
        {file && (
          <>
            <span className="file-info">{file.path}</span>
            <span className="separator">•</span>
            <span className="lang-badge">{file.language.toUpperCase()}</span>
          </>
        )}
      </div>

      <div className="status-right">
        <span className="version">Alfred Pro v2.0</span>
      </div>

      <style jsx>{`
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 28px;
          padding: 0 16px;
          background: linear-gradient(180deg, rgba(12, 12, 16, 0.98) 0%, rgba(8, 8, 10, 0.98) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 11px;
        }

        .status-left, .status-center, .status-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .build-indicator, .ready-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.5);
        }

        .build-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid transparent;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ready-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        .file-info {
          color: rgba(255, 255, 255, 0.4);
        }

        .separator {
          color: rgba(255, 255, 255, 0.2);
        }

        .lang-badge {
          padding: 2px 6px;
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-radius: 4px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .version {
          color: rgba(255, 255, 255, 0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  );
});

// ============================================================================
// RESIZABLE PANEL
// ============================================================================

interface ResizablePanelProps {
  children: React.ReactNode;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  side: 'left' | 'right';
}

function ResizablePanel({ children, minWidth, maxWidth, defaultWidth, side }: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      let newWidth = side === 'left' ? e.clientX - rect.left : rect.right - e.clientX;
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, side]);

  return (
    <div ref={panelRef} className={`resizable-panel ${side}`} style={{ width }}>
      {children}
      <div
        className={`resize-handle ${side} ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
      />

      <style jsx>{`
        .resizable-panel {
          position: relative;
          flex-shrink: 0;
          height: 100%;
        }

        .resize-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          transition: background 0.15s ease;
          z-index: 10;
        }

        .resize-handle.left { right: 0; }
        .resize-handle.right { left: 0; }

        .resize-handle:hover,
        .resize-handle.active {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.6) 100%);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EDITOR PANEL
// ============================================================================

interface EditorPanelProps {
  file: VirtualFile | null;
  onChange: (content: string) => void;
}

function EditorPanel({ file, onChange }: EditorPanelProps) {
  if (!file) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <div className="empty-glow" />
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <span className="empty-title">No file selected</span>
          <span className="empty-subtitle">Select a file from the explorer or create a new one</span>
        </div>

        <style jsx>{`
          .editor-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
            position: relative;
          }

          .empty-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            position: relative;
          }

          .empty-glow {
            position: absolute;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
            filter: blur(40px);
            pointer-events: none;
          }

          .empty-icon {
            color: rgba(255, 255, 255, 0.15);
            position: relative;
          }

          .empty-title {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.5);
          }

          .empty-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.25);
          }
        `}</style>
      </div>
    );
  }

  return <MonacoEditor value={file.content} language={file.language} path={file.path} onChange={onChange} theme="dark" />;
}

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

export function BuilderLayout({
  fileTree,
  selectedFile,
  previewResult,
  isBuilding = false,
  isStreaming = false,
  projectName = 'Untitled Project',
  onFileSelect = () => {},
  onFileChange = () => {},
  onConsole = () => {},
  onDeploy = () => {},
  className = '',
}: BuilderLayoutProps) {
  const [activePanel, setActivePanel] = useState<'files' | 'search' | 'ai' | 'settings'>('files');

  const handleFileSelect = useCallback((file: VirtualFile) => onFileSelect(file), [onFileSelect]);
  const handleEditorChange = useCallback(
    (content: string) => {
      if (selectedFile) onFileChange(selectedFile.path, content);
    },
    [selectedFile, onFileChange]
  );

  return (
    <div className={`builder-container ${className}`}>
      {/* Header */}
      <HeaderBar
        projectName={projectName}
        isBuilding={isBuilding}
        isStreaming={isStreaming}
        onDeploy={onDeploy}
      />

      {/* Main Content */}
      <div className="builder-main">
        {/* Activity Bar */}
        <ActivityBar activePanel={activePanel} onPanelChange={setActivePanel} />

        {/* Sidebar Panel */}
        <ResizablePanel minWidth={200} maxWidth={400} defaultWidth={260} side="left">
          <div className="sidebar-panel">
            {activePanel === 'files' && (
              <FileExplorer
                tree={fileTree}
                selectedPath={selectedFile?.path}
                onFileSelect={handleFileSelect}
                onFileOpen={handleFileSelect}
                projectName={projectName}
              />
            )}
            {activePanel === 'ai' && (
              <div className="ai-panel">
                <div className="ai-header">
                  <span className="ai-title">AI Assistant</span>
                  <div className="ai-status online" />
                </div>
                <div className="ai-content">
                  <p>Ask Alfred to generate code, fix bugs, or explain concepts.</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Editor Panel */}
        <div className="editor-container">
          <EditorPanel file={selectedFile} onChange={handleEditorChange} />
        </div>

        {/* Preview Panel */}
        <ResizablePanel minWidth={320} maxWidth={800} defaultWidth={480} side="right">
          <BuilderPreview preview={previewResult} isBuilding={isBuilding} onConsole={onConsole} />
        </ResizablePanel>
      </div>

      {/* Status Bar */}
      <StatusBar file={selectedFile} isBuilding={isBuilding} />

      <style jsx>{`
        .builder-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100vh;
          background: #0a0a0c;
          overflow: hidden;
        }

        .builder-main {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .sidebar-panel {
          height: 100%;
          background: linear-gradient(180deg, #0c0c10 0%, #0a0a0e 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .editor-container {
          flex: 1;
          min-width: 0;
          height: 100%;
          border-left: 1px solid rgba(255, 255, 255, 0.04);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .ai-panel {
          padding: 16px;
          height: 100%;
        }

        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .ai-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: -0.01em;
        }

        .ai-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .ai-status.online {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .ai-content {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

export default BuilderLayout;
