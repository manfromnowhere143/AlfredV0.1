'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOBILE BUILDER LAYOUT — Steve Jobs Level Mobile Experience
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * One thing at a time. Swipe between views. Bottom navigation always accessible.
 * Every pixel considered. Every interaction delightful.
 *
 * "Design is not just what it looks like. Design is how it works." - Steve Jobs
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { VirtualFile, VirtualDirectory, PreviewResult, StreamingEvent } from '@alfred/core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MobileTab = 'files' | 'code' | 'preview' | 'chat';

interface MobileBuilderLayoutProps {
  // File State
  fileTree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedFile: VirtualFile | null;
  projectName: string;

  // Preview State
  previewResult: PreviewResult | null;
  isBuilding: boolean;
  isStreaming: boolean;

  // Actions
  onFileSelect: (file: VirtualFile) => void;
  onFileChange: (content: string) => void;
  onSendMessage: (message: string) => void;
  onRebuild: () => void;

  // Streaming
  streamingFile: string | null;
  streamingCode: string;
  streamingSteps: Array<{
    id: string;
    type: string;
    name: string;
    status: 'active' | 'done';
  }>;

  // Messages
  messages: Array<{
    id: string;
    role: 'user' | 'alfred';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS — Elegant SVG iconography
// ═══════════════════════════════════════════════════════════════════════════════

const TabIcons = {
  files: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  code: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  preview: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE HEADER
// ═══════════════════════════════════════════════════════════════════════════════

function MobileHeader({
  title,
  subtitle,
  isStreaming,
  isBuilding,
  onBack,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  isStreaming?: boolean;
  isBuilding?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <header className="mobile-header">
      <div className="header-left">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="header-right">
        {(isStreaming || isBuilding) && (
          <div className="status-indicator">
            <div className="status-dot" />
            <span>{isStreaming ? 'Generating' : 'Building'}</span>
          </div>
        )}
        {rightAction}
      </div>

      <style jsx>{`
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          border-radius: 10px;
          margin-left: -8px;
          transition: all 0.2s;
        }

        .back-btn:active {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(0.95);
        }

        .header-title-group {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .header-title {
          font-size: 17px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 0;
          line-height: 1.2;
        }

        .header-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 20px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: pulse 1s infinite;
        }

        .status-indicator span {
          font-size: 11px;
          font-weight: 500;
          color: #a78bfa;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

function BottomNavigation({
  activeTab,
  onTabChange,
  hasUnreadChat,
  fileCount,
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasUnreadChat?: boolean;
  fileCount: number;
}) {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'files', label: 'Files', icon: TabIcons.files },
    { id: 'code', label: 'Code', icon: TabIcons.code },
    { id: 'preview', label: 'Preview', icon: TabIcons.preview },
    { id: 'chat', label: 'AI', icon: TabIcons.chat },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <div className="nav-icon">
            {tab.icon}
            {tab.id === 'files' && fileCount > 0 && (
              <span className="badge">{fileCount > 99 ? '99+' : fileCount}</span>
            )}
            {tab.id === 'chat' && hasUnreadChat && <span className="dot" />}
          </div>
          <span className="nav-label">{tab.label}</span>
          {activeTab === tab.id && <div className="active-indicator" />}
        </button>
      ))}

      <style jsx>{`
        .bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 64px;
          background: rgba(10, 10, 12, 0.98);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: env(safe-area-inset-bottom, 0);
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .nav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100%;
          padding: 8px 0;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-item:active {
          transform: scale(0.92);
        }

        .nav-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.2s;
        }

        .nav-item.active .nav-icon {
          color: #f59e0b;
        }

        .badge {
          position: absolute;
          top: -6px;
          right: -10px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          background: #8b5cf6;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 600;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #0a0a0c;
        }

        .nav-label {
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
          transition: color 0.2s;
        }

        .nav-item.active .nav-label {
          color: #f59e0b;
        }

        .active-indicator {
          position: absolute;
          bottom: 8px;
          width: 4px;
          height: 4px;
          background: #f59e0b;
          border-radius: 50%;
        }
      `}</style>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE FILE EXPLORER
// ═══════════════════════════════════════════════════════════════════════════════

function MobileFileExplorer({
  tree,
  files,
  selectedPath,
  projectName,
  onFileSelect,
  onNavigateToCode,
}: {
  tree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedPath: string | null;
  projectName: string;
  onFileSelect: (file: VirtualFile) => void;
  onNavigateToCode: () => void;
}) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['/src', '/components', '/lib', '/app'])
  );

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback((file: VirtualFile) => {
    onFileSelect(file);
    onNavigateToCode();
  }, [onFileSelect, onNavigateToCode]);

  const getFileIcon = (file: VirtualFile) => {
    const ext = file.path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3178c6">
            <path d="M3 3h18v18H3V3zm10.5 10.5v-1.8H9v1.2h1.8v4.8h1.5v-4.8h1.2v-.6h-1.2zm2.4-1.2v6h1.5v-2.4h.9c1.2 0 2.1-.6 2.1-1.8s-.9-1.8-2.1-1.8h-2.4zm1.5 1.2h.9c.5 0 .75.3.75.6s-.25.6-.75.6h-.9v-1.2z" />
          </svg>
        );
      case 'jsx':
      case 'js':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#f7df1e">
            <path d="M3 3h18v18H3V3zm4.5 14.7c.6.75 1.35 1.05 2.25 1.05 1.35 0 2.1-.75 2.1-2.1v-4.8h-1.5v4.8c0 .45-.15.75-.6.75-.45 0-.75-.3-1.05-.75l-1.2.75z" />
          </svg>
        );
      case 'css':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#264de4">
            <path d="M5 3l1.5 17L12 21l5.5-1L19 3H5zm11.25 5.25H8.25l.15 1.5h7.65l-.45 5.25L12 16.05l-3.6-1.05-.15-2.25h1.5l.15.9 2.1.6 2.1-.6.15-2.1H8.1l-.45-4.8h8.85l-.15 1.5z" />
          </svg>
        );
      case 'json':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
            <path d="M8 3H6a2 2 0 00-2 2v14c0 1.1.9 2 2 2h2M16 3h2a2 2 0 012 2v14a2 2 0 01-2 2h-2" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
    }
  };

  const renderFile = (file: VirtualFile, depth: number = 0) => (
    <button
      key={file.path}
      className={`file-item ${selectedPath === file.path ? 'selected' : ''}`}
      onClick={() => handleFileClick(file)}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      <span className="file-icon">{getFileIcon(file)}</span>
      <span className="file-name">{file.name}</span>
      {file.isEntryPoint && <span className="entry-badge">ENTRY</span>}
      <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );

  const renderDirectory = (dir: VirtualDirectory, depth: number = 0) => {
    const isExpanded = expandedPaths.has(dir.path);

    return (
      <div key={dir.path} className="directory-item">
        <button
          className="directory-header"
          onClick={() => toggleExpand(dir.path)}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <svg
            className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className="directory-name">{dir.name}</span>
        </button>

        {isExpanded && (
          <div className="directory-children">
            {dir.children
              .filter((child): child is VirtualDirectory => 'children' in child)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subdir) => renderDirectory(subdir, depth + 1))}
            {dir.children
              .filter((child): child is VirtualFile => !('children' in child))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file) => renderFile(file, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-file-explorer">
      <MobileHeader title={projectName} subtitle={`${files.length} files`} />

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </div>
            <h3>No files yet</h3>
            <p>Start a conversation to generate code</p>
          </div>
        ) : tree ? (
          <>
            {tree.children
              .filter((child): child is VirtualFile => !('children' in child))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file) => renderFile(file, 0))}
            {tree.children
              .filter((child): child is VirtualDirectory => 'children' in child)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((dir) => renderDirectory(dir, 0))}
          </>
        ) : (
          files.map((file) => renderFile(file, 0))
        )}
      </div>

      <style jsx>{`
        .mobile-file-explorer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #09090b;
        }

        .file-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 80px;
        }

        .file-item,
        .directory-header {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 52px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .file-item:active,
        .directory-header:active {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-item.selected {
          background: rgba(139, 92, 246, 0.15);
        }

        .file-icon,
        .expand-icon {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.5);
        }

        .expand-icon {
          margin-right: 6px;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(90deg);
        }

        .directory-header svg:not(.expand-icon) {
          margin-right: 10px;
        }

        .file-icon {
          margin-right: 12px;
        }

        .file-name,
        .directory-name {
          flex: 1;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .directory-name {
          font-weight: 500;
        }

        .entry-badge {
          padding: 3px 8px;
          background: rgba(245, 158, 11, 0.2);
          border-radius: 6px;
          font-size: 9px;
          font-weight: 600;
          color: #f59e0b;
          margin-right: 8px;
        }

        .chevron {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.2);
        }

        .directory-children {
          /* Children have their own padding */
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 24px;
          color: rgba(255, 255, 255, 0.2);
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CODE EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function MobileCodeEditor({
  file,
  onChange,
  isStreaming,
  streamingCode,
  streamingFile,
}: {
  file: VirtualFile | null;
  onChange: (content: string) => void;
  isStreaming: boolean;
  streamingCode: string;
  streamingFile: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show streaming content or file content
  const displayPath = streamingFile || file?.path || '';
  const displayContent = streamingFile && isStreaming ? streamingCode : file?.content || '';
  const displayName = displayPath.split('/').pop() || 'Select a file';

  const codeKeys = ['Tab', '{', '}', '(', ')', '[', ']', ';', ':', '"', "'", '/', '<', '>'];

  const insertKey = useCallback((key: string) => {
    if (!textareaRef.current || !file) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let insertText = key;
    if (key === 'Tab') insertText = '  ';

    const newText = text.substring(0, start) + insertText + text.substring(end);
    onChange(newText);

    // Move cursor
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      textarea.focus();
    }, 0);
  }, [file, onChange]);

  if (!file && !streamingFile) {
    return (
      <div className="mobile-code-empty">
        <div className="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <h3>No file selected</h3>
        <p>Select a file from the Files tab</p>

        <style jsx>{`
          .mobile-code-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 40px;
            text-align: center;
            background: #09090b;
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 24px;
            color: rgba(255, 255, 255, 0.2);
            margin-bottom: 20px;
          }

          h3 {
            font-size: 18px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 8px;
          }

          p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.4);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mobile-code-editor">
      <MobileHeader
        title={displayName}
        subtitle={isStreaming ? 'Generating...' : undefined}
        rightAction={
          !isStreaming && file && (
            <button
              className={`edit-toggle ${isEditing ? 'active' : ''}`}
              onClick={() => setIsEditing(!isEditing)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )
        }
      />

      <div className="code-container">
        {isStreaming ? (
          <pre className="code-display streaming">
            <code>{displayContent}</code>
            <span className="cursor" />
          </pre>
        ) : isEditing ? (
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={displayContent}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        ) : (
          <pre className="code-display">
            <code>{displayContent}</code>
          </pre>
        )}
      </div>

      {isEditing && !isStreaming && (
        <div className="code-toolbar">
          {codeKeys.map((key) => (
            <button key={key} className="code-key" onClick={() => insertKey(key)}>
              {key}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .mobile-code-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0d0d10;
        }

        .edit-toggle {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-toggle.active {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .code-container {
          flex: 1;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 80px;
        }

        .code-display,
        .code-textarea {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 16px;
          background: transparent;
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Monaco, monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #e5e7eb;
          white-space: pre;
          overflow-x: auto;
        }

        .code-textarea {
          border: none;
          outline: none;
          resize: none;
        }

        .code-display code {
          font-family: inherit;
        }

        .code-display.streaming {
          position: relative;
        }

        .cursor {
          display: inline-block;
          width: 2px;
          height: 16px;
          background: #8b5cf6;
          animation: blink 1s infinite;
          vertical-align: text-bottom;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .code-toolbar {
          display: flex;
          gap: 6px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.5);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          position: sticky;
          bottom: 64px;
        }

        .code-key {
          flex-shrink: 0;
          min-width: 40px;
          height: 36px;
          padding: 0 12px;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .code-key:active {
          background: rgba(255, 255, 255, 0.15);
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function MobilePreview({
  preview,
  isBuilding,
  onRefresh,
}: {
  preview: PreviewResult | null;
  isBuilding: boolean;
  onRefresh: () => void;
}) {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (preview?.html && iframeRef.current) {
      iframeRef.current.srcdoc = preview.html;
    }
  }, [preview?.html]);

  const viewportSizes = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: '100%', height: '100%' },
  };

  return (
    <div className="mobile-preview">
      <MobileHeader
        title="Preview"
        isBuilding={isBuilding}
        rightAction={
          <div className="preview-actions">
            <div className="viewport-toggle">
              {(['mobile', 'tablet', 'desktop'] as const).map((vp) => (
                <button
                  key={vp}
                  className={viewport === vp ? 'active' : ''}
                  onClick={() => setViewport(vp)}
                >
                  {vp === 'mobile' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  )}
                  {vp === 'tablet' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  )}
                  {vp === 'desktop' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <button className="refresh-btn" onClick={onRefresh}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        }
      />

      <div className="preview-container">
        {isBuilding ? (
          <div className="building-state">
            <div className="building-orb">
              <div className="orb-core" />
              <div className="orb-ring r1" />
              <div className="orb-ring r2" />
            </div>
            <h3>Building preview...</h3>
            <p>Alfred is crafting your app</p>
          </div>
        ) : preview?.html ? (
          <div className={`iframe-wrapper ${viewport}`}>
            <iframe
              ref={iframeRef}
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              style={
                viewport === 'desktop'
                  ? { width: '100%', height: '100%' }
                  : {
                      width: viewportSizes[viewport].width,
                      height: viewportSizes[viewport].height,
                    }
              }
            />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3>No preview available</h3>
            <p>Build something to see it here</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .mobile-preview {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #09090b;
        }

        .preview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .viewport-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2px;
        }

        .viewport-toggle button {
          width: 32px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s;
        }

        .viewport-toggle button.active {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .refresh-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .refresh-btn:active {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(180deg);
        }

        .preview-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          padding-bottom: 80px;
          overflow: hidden;
        }

        .iframe-wrapper {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .iframe-wrapper.mobile {
          border-radius: 24px;
          padding: 8px;
          background: #1a1a1a;
        }

        .iframe-wrapper.mobile::before {
          content: '';
          display: block;
          width: 60px;
          height: 4px;
          background: #333;
          border-radius: 2px;
          margin: 0 auto 8px;
        }

        .iframe-wrapper.tablet {
          border-radius: 16px;
          max-height: 80vh;
        }

        .iframe-wrapper.desktop {
          width: 100%;
          height: 100%;
          border-radius: 8px;
        }

        .iframe-wrapper iframe {
          display: block;
          border: none;
          background: white;
          border-radius: 8px;
        }

        .iframe-wrapper.mobile iframe {
          border-radius: 16px;
        }

        .building-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
        }

        .building-orb {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
        }

        .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%;
        }

        .orb-ring {
          position: absolute;
          inset: 0;
          border: 2px solid #8b5cf6;
          border-radius: 50%;
          animation: orbit 3s linear infinite;
        }

        .orb-ring.r1 {
          animation-delay: -1s;
          opacity: 0.6;
        }

        .orb-ring.r2 {
          animation-delay: -2s;
          opacity: 0.3;
        }

        @keyframes orbit {
          0% { transform: rotate(0deg) scale(1); opacity: 0.8; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 0.3; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.8; }
        }

        .building-state h3,
        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 8px;
        }

        .building-state p,
        .empty-state p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 24px;
          color: rgba(255, 255, 255, 0.2);
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CHAT
// ═══════════════════════════════════════════════════════════════════════════════

function MobileChat({
  messages,
  streamingSteps,
  isStreaming,
  onSendMessage,
}: {
  messages: MobileBuilderLayoutProps['messages'];
  streamingSteps: MobileBuilderLayoutProps['streamingSteps'];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingSteps]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSendMessage(text);
  }, [input, isStreaming, onSendMessage]);

  const quickActions = [
    { icon: '📄', label: 'Add file', prompt: 'Create a new file for ' },
    { icon: '🔧', label: 'Refactor', prompt: 'Refactor the ' },
    { icon: '🐛', label: 'Debug', prompt: 'Help me debug ' },
    { icon: '🎨', label: 'Style', prompt: 'Improve the styling of ' },
  ];

  return (
    <div className="mobile-chat">
      <MobileHeader
        title="Alfred AI"
        subtitle={isStreaming ? 'Generating...' : 'Online'}
        isStreaming={isStreaming}
      />

      <div className="messages-container" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="welcome-state">
            <div className="welcome-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>What would you like to build?</h3>
            <p>Describe your idea and I'll generate the code.</p>

            <div className="suggestion-grid">
              <button onClick={() => { setInput('Create a modern todo app with React'); }}>
                <span className="icon">✓</span>
                <span>Todo App</span>
              </button>
              <button onClick={() => { setInput('Build a calculator with clean design'); }}>
                <span className="icon">🧮</span>
                <span>Calculator</span>
              </button>
              <button onClick={() => { setInput('Create a beautiful landing page'); }}>
                <span className="icon">🚀</span>
                <span>Landing Page</span>
              </button>
              <button onClick={() => { setInput('Build a weather dashboard'); }}>
                <span className="icon">☁️</span>
                <span>Weather App</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  'Y'
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                )}
              </div>
              <div className="message-body">
                <div className="message-header">
                  <span className="message-sender">{msg.role === 'user' ? 'You' : 'Alfred'}</span>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.isStreaming ? (
                  <div className="streaming-indicator">
                    {streamingSteps.map((step) => (
                      <div key={step.id} className={`step ${step.status}`}>
                        <span className="step-icon">
                          {step.status === 'active' ? (
                            <div className="spinner" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="step-name">{step.name}</span>
                      </div>
                    ))}
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                ) : (
                  <div className="message-content">{msg.content}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="input-area">
        <div className="quick-actions">
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="quick-action"
              onClick={() => setInput(action.prompt)}
            >
              <span className="action-icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <div className="input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what you want to build..."
            disabled={isStreaming}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .mobile-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #09090b;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px;
          padding-bottom: 180px;
        }

        .welcome-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 20px;
        }

        .welcome-icon {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          color: #8b5cf6;
          margin-bottom: 20px;
        }

        .welcome-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 8px;
        }

        .welcome-state p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 24px;
        }

        .suggestion-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
          max-width: 320px;
        }

        .suggestion-grid button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        .suggestion-grid button:active {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          transform: scale(0.97);
        }

        .suggestion-grid .icon {
          font-size: 24px;
        }

        .message {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }

        .message.user .message-avatar {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }

        .message.alfred .message-avatar {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
        }

        .message-body {
          flex: 1;
          min-width: 0;
        }

        .message-header {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }

        .message-sender {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .message-time {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
        }

        .message-content {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
        }

        .streaming-indicator {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 8px;
        }

        .step.done {
          opacity: 0.6;
        }

        .step-icon {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b5cf6;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .step-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }

        .typing-dots span {
          width: 6px;
          height: 6px;
          background: #8b5cf6;
          border-radius: 50%;
          animation: bounce 1.4s infinite;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.32s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .input-area {
          position: fixed;
          bottom: 64px;
          left: 0;
          right: 0;
          padding: 12px 16px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
          background: rgba(10, 10, 12, 0.98);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .quick-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }

        .quick-action {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        .quick-action:active {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(0.95);
        }

        .action-icon {
          font-size: 14px;
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 10px 14px;
        }

        .input-row textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255, 255, 255, 0.95);
          font-size: 15px;
          font-family: inherit;
          line-height: 1.4;
          resize: none;
          min-height: 24px;
          max-height: 120px;
        }

        .input-row textarea::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .send-btn {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }

        .send-btn:active:not(:disabled) {
          transform: scale(0.92);
        }

        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MOBILE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MobileBuilderLayout({
  fileTree,
  files,
  selectedFile,
  projectName,
  previewResult,
  isBuilding,
  isStreaming,
  onFileSelect,
  onFileChange,
  onSendMessage,
  onRebuild,
  streamingFile,
  streamingCode,
  streamingSteps,
  messages,
}: MobileBuilderLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('chat');

  // Auto-switch to preview when build completes
  useEffect(() => {
    if (!isBuilding && !isStreaming && previewResult?.html && activeTab === 'chat') {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setActiveTab('preview');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isBuilding, isStreaming, previewResult?.html, activeTab]);

  const navigateToCode = useCallback(() => {
    setActiveTab('code');
  }, []);

  return (
    <div className="mobile-builder">
      <div className="tab-content">
        {activeTab === 'files' && (
          <MobileFileExplorer
            tree={fileTree}
            files={files}
            selectedPath={selectedFile?.path || null}
            projectName={projectName}
            onFileSelect={onFileSelect}
            onNavigateToCode={navigateToCode}
          />
        )}

        {activeTab === 'code' && (
          <MobileCodeEditor
            file={selectedFile}
            onChange={onFileChange}
            isStreaming={isStreaming}
            streamingCode={streamingCode}
            streamingFile={streamingFile}
          />
        )}

        {activeTab === 'preview' && (
          <MobilePreview
            preview={previewResult}
            isBuilding={isBuilding || isStreaming}
            onRefresh={onRebuild}
          />
        )}

        {activeTab === 'chat' && (
          <MobileChat
            messages={messages}
            streamingSteps={streamingSteps}
            isStreaming={isStreaming}
            onSendMessage={onSendMessage}
          />
        )}
      </div>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fileCount={files.length}
        hasUnreadChat={false}
      />

      <style jsx>{`
        .mobile-builder {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          background: #09090b;
          overflow: hidden;
        }

        .tab-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
