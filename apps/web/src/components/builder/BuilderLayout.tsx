'use client';

/**
 * Builder Layout Component
 *
 * The main IDE layout combining:
 * - Left: FileExplorer (file tree)
 * - Center: Monaco Editor
 * - Right: Live Preview
 *
 * Resizable panels with Apple-grade polish.
 */

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { VirtualFile, VirtualDirectory, ConsoleEntry, PreviewResult } from '@alfred/core';
import { FileExplorer } from './FileExplorer';
import { BuilderPreview } from './BuilderPreview';

// Dynamic import for Monaco to reduce initial bundle size
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: '#0f0f12',
      color: 'rgba(255, 255, 255, 0.5)',
    }}>
      Loading editor...
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderLayoutProps {
  /** File tree from VirtualFileSystem.getTree() */
  fileTree: VirtualDirectory | null;

  /** Currently selected file */
  selectedFile: VirtualFile | null;

  /** Preview result from ESBuild */
  previewResult: PreviewResult | null;

  /** Whether currently building */
  isBuilding?: boolean;

  /** Project name */
  projectName?: string;

  /** Callback when file is selected */
  onFileSelect?: (file: VirtualFile) => void;

  /** Callback when file content changes in editor */
  onFileChange?: (path: string, content: string) => void;

  /** Callback for console entries */
  onConsole?: (entry: ConsoleEntry) => void;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// RESIZABLE PANEL COMPONENT
// ============================================================================

interface ResizablePanelProps {
  children: React.ReactNode;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  side: 'left' | 'right';
}

function ResizablePanel({
  children,
  minWidth,
  maxWidth,
  defaultWidth,
  side,
}: ResizablePanelProps) {
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
      let newWidth: number;

      if (side === 'left') {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, side]);

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${side}`}
      style={{ width }}
    >
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

        .resize-handle.left {
          right: 0;
        }

        .resize-handle.right {
          left: 0;
        }

        .resize-handle:hover,
        .resize-handle.active {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EDITOR PANEL COMPONENT - Uses Monaco with fallback
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
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span>Select a file to edit</span>
        </div>

        <style jsx>{`
          .editor-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #0f0f12;
          }

          .empty-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            color: rgba(255, 255, 255, 0.3);
            font-size: 14px;
          }

          .empty-icon {
            width: 48px;
            height: 48px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <MonacoEditor
      value={file.content}
      language={file.language}
      path={file.path}
      onChange={onChange}
      theme="dark"
    />
  );
}

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

export function BuilderLayout({
  fileTree,
  selectedFile,
  previewResult,
  isBuilding = false,
  projectName = 'Project',
  onFileSelect = () => {},
  onFileChange = () => {},
  onConsole = () => {},
  className = '',
}: BuilderLayoutProps) {
  // Handle file selection
  const handleFileSelect = useCallback(
    (file: VirtualFile) => {
      onFileSelect(file);
    },
    [onFileSelect]
  );

  // Handle file open (same as select for now)
  const handleFileOpen = useCallback(
    (file: VirtualFile) => {
      onFileSelect(file);
    },
    [onFileSelect]
  );

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (content: string) => {
      if (selectedFile) {
        onFileChange(selectedFile.path, content);
      }
    },
    [selectedFile, onFileChange]
  );

  return (
    <div className={`builder-layout ${className}`}>
      {/* File Explorer Panel */}
      <ResizablePanel
        minWidth={180}
        maxWidth={400}
        defaultWidth={240}
        side="left"
      >
        <FileExplorer
          tree={fileTree}
          selectedPath={selectedFile?.path}
          onFileSelect={handleFileSelect}
          onFileOpen={handleFileOpen}
          projectName={projectName}
        />
      </ResizablePanel>

      {/* Editor Panel */}
      <div className="editor-panel">
        <EditorPanel file={selectedFile} onChange={handleEditorChange} />
      </div>

      {/* Preview Panel */}
      <ResizablePanel
        minWidth={300}
        maxWidth={800}
        defaultWidth={450}
        side="right"
      >
        <BuilderPreview
          preview={previewResult}
          isBuilding={isBuilding}
          onConsole={onConsole}
        />
      </ResizablePanel>

      <style jsx>{`
        .builder-layout {
          display: flex;
          width: 100%;
          height: 100%;
          background: #0a0a0c;
          overflow: hidden;
        }

        .editor-panel {
          flex: 1;
          min-width: 0;
          height: 100%;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BuilderLayout;
