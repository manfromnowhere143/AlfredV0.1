'use client';

/**
 * File Explorer Component
 *
 * Apple-grade file tree navigation for the Alfred Builder.
 * Connected to VirtualFileSystem.getTree() for real-time updates.
 *
 * Design principles:
 * - Clean, minimal interface
 * - Smooth micro-animations
 * - Clear visual hierarchy
 * - Keyboard navigation support
 * - File type iconography
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import type { VirtualDirectory, VirtualFile, FileStatus } from '@alfred/core';

// ============================================================================
// TYPES
// ============================================================================

export interface FileExplorerProps {
  /** File tree from VirtualFileSystem.getTree() */
  tree: VirtualDirectory | null;

  /** Currently selected file path */
  selectedPath?: string | null;

  /** Callback when file is selected */
  onFileSelect?: (file: VirtualFile) => void;

  /** Callback when file is double-clicked (open in editor) */
  onFileOpen?: (file: VirtualFile) => void;

  /** Callback for context menu actions */
  onContextMenu?: (file: VirtualFile | VirtualDirectory, action: ContextAction) => void;

  /** Project name for header */
  projectName?: string;

  /** Whether the project is loading */
  isLoading?: boolean;

  /** Custom class name */
  className?: string;
}

export type ContextAction = 'rename' | 'delete' | 'duplicate' | 'newFile' | 'newFolder';

// ============================================================================
// FILE ICONS - SVG Components for crisp rendering
// ============================================================================

const FileIcons = {
  // Folders
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  folderOpen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  ),

  // Languages
  typescript: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v18H3V3zm10.5 10.5v-1.8H9v1.2h1.8v4.8h1.5v-4.8h1.2v-.6h-1.2zm2.4-1.2v6h1.5v-2.4h.9c1.2 0 2.1-.6 2.1-1.8s-.9-1.8-2.1-1.8h-2.4zm1.5 1.2h.9c.5 0 .75.3.75.6s-.25.6-.75.6h-.9v-1.2z" />
    </svg>
  ),
  javascript: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v18H3V3zm4.5 14.7c.6.75 1.35 1.05 2.25 1.05 1.35 0 2.1-.75 2.1-2.1v-4.8h-1.5v4.8c0 .45-.15.75-.6.75-.45 0-.75-.3-1.05-.75l-1.2.75zm6-.45c.75.9 1.65 1.5 2.85 1.5 1.5 0 2.4-.75 2.4-1.95 0-1.05-.6-1.5-1.8-2.1l-.45-.15c-.6-.3-.9-.45-.9-.9 0-.3.3-.6.75-.6.45 0 .75.3 1.05.6l.9-.9c-.6-.6-1.2-1.05-2.1-1.05-1.35 0-2.25.9-2.25 2.1 0 1.05.6 1.5 1.65 2.1l.45.15c.6.3 1.05.45 1.05.9 0 .45-.45.6-.9.6-.6 0-1.05-.3-1.5-.9l-1.2.6z" />
    </svg>
  ),
  react: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.5c-.825 0-1.5.675-1.5 1.5s.675 1.5 1.5 1.5 1.5-.675 1.5-1.5-.675-1.5-1.5-1.5zm-7.5 1.5c0-1.1.525-2.175 1.5-3.15-.525-1.65-.45-3 .3-3.525.675-.45 1.65-.225 2.775.525C10.125 5.325 11.025 5.1 12 5.1s1.875.225 2.925.75c1.125-.75 2.1-.975 2.775-.525.75.525.825 1.875.3 3.525.975.975 1.5 2.05 1.5 3.15s-.525 2.175-1.5 3.15c.525 1.65.45 3-.3 3.525-.675.45-1.65.225-2.775-.525-1.05.525-1.95.75-2.925.75s-1.875-.225-2.925-.75c-1.125.75-2.1.975-2.775.525-.75-.525-.825-1.875-.3-3.525-.975-.975-1.5-2.05-1.5-3.15zm1.05 0c0 .75.375 1.5 1.05 2.25.15-.45.375-.9.675-1.35.3-.45.6-.825.975-1.2-.375-.375-.675-.75-.975-1.2-.3-.45-.525-.9-.675-1.35-.675.75-1.05 1.5-1.05 2.85zm3.225-4.425c.525.225 1.05.525 1.575.9.525-.375 1.05-.675 1.575-.9-.525-.15-1.05-.225-1.575-.225s-1.05.075-1.575.225zm-1.2.6c-.525.525-.975 1.125-1.35 1.8.6.075 1.275.075 1.95.075.225-.6.525-1.2.9-1.725-.525-.075-1.05-.15-1.5-.15zm6.9 0c-.45 0-.975.075-1.5.15.375.525.675 1.125.9 1.725.675 0 1.35 0 1.95-.075-.375-.675-.825-1.275-1.35-1.8zm1.95 3.825c-.675-.75-1.05-1.5-1.05-2.25 0-.75.375-1.5 1.05-2.25-.15.45-.375.9-.675 1.35-.3.45-.6.825-.975 1.2.375.375.675.75.975 1.2.3.45.525.9.675 1.35-.675-.75-1.05-1.5-1.05-2.85zm-3.225 4.425c-.525-.225-1.05-.525-1.575-.9-.525.375-1.05.675-1.575.9.525.15 1.05.225 1.575.225s1.05-.075 1.575-.225zm1.2-.6c.525-.525.975-1.125 1.35-1.8-.6-.075-1.275-.075-1.95-.075-.225.6-.525 1.2-.9 1.725.525.075 1.05.15 1.5.15zm-6.9 0c.45 0 .975-.075 1.5-.15-.375-.525-.675-1.125-.9-1.725-.675 0-1.35 0-1.95.075.375.675.825 1.275 1.35 1.8z" />
    </svg>
  ),
  css: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l1.5 17L12 21l5.5-1L19 3H5zm11.25 5.25H8.25l.15 1.5h7.65l-.45 5.25L12 16.05l-3.6-1.05-.15-2.25h1.5l.15.9 2.1.6 2.1-.6.15-2.1H8.1l-.45-4.8h8.85l-.15 1.5z" />
    </svg>
  ),
  html: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l1.5 17L12 21l5.5-1L19 3H5zm3.75 5.25h6.5l-.1 1.5H9.25L9.1 12h6.4l-.3 4.5-3.2 1-3.2-1-.15-2.25h1.5l.1.9 1.75.5 1.75-.5.15-1.65H9l-.25-5.25z" />
    </svg>
  ),
  json: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.5 8.5c.275 0 .5-.225.5-.5V5c0-.825.675-1.5 1.5-1.5h1c.275 0 .5-.225.5-.5s-.225-.5-.5-.5h-1A2.5 2.5 0 005 5v3c0 .275-.225.5-.5.5h-.5v1h.5c.275 0 .5.225.5.5v3a2.5 2.5 0 002.5 2.5h1c.275 0 .5-.225.5-.5s-.225-.5-.5-.5h-1c-.825 0-1.5-.675-1.5-1.5v-3c0-.275.225-.5.5-.5zM19 5a2.5 2.5 0 00-2.5-2.5h-1c-.275 0-.5.225-.5.5s.225.5.5.5h1c.825 0 1.5.675 1.5 1.5v3c0 .275.225.5.5.5h.5v1h-.5c-.275 0-.5.225-.5.5v3c0 .825-.675 1.5-1.5 1.5h-1c-.275 0-.5.225-.5.5s.225.5.5.5h1a2.5 2.5 0 002.5-2.5v-3c0-.275.225-.5.5-.5h.5v-1h-.5c-.275 0-.5-.225-.5-.5V5z" />
    </svg>
  ),
  markdown: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5v14h18V5H3zm4.5 10.5v-4.875L9.375 13.5 11.25 10.5v4.875h1.5v-6.75h-1.5L9.375 11.625 7.5 8.625H6v6.75h1.5zm9.75 0l-3-3.375h1.5V8.625h1.5v3.375h1.5l-3 3.375h1.5z" />
    </svg>
  ),
  python: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.925 2.25c-4.35 0-4.075 1.875-4.075 1.875l.005 1.95h4.15v.6H6.25S3 6.325 3 10.8s2.85 4.325 2.85 4.325h1.7v-2.075s-.1-2.85 2.8-2.85h4.825s2.7.05 2.7-2.625V4.95s.4-2.7-4.95-2.7zM8.4 4.2c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zm3.675 17.55c4.35 0 4.075-1.875 4.075-1.875l-.005-1.95h-4.15v-.6h5.755s3.25.35 3.25-4.125-2.85-4.325-2.85-4.325h-1.7v2.075s.1 2.85-2.8 2.85H8.825s-2.7-.05-2.7 2.625v2.625s-.4 2.7 4.95 2.7zm3.525-2.55c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  config: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getFileIcon(file: VirtualFile): React.ReactNode {
  const ext = file.path.split('.').pop()?.toLowerCase() || '';
  const name = file.name.toLowerCase();

  // Special files
  if (name === 'package.json' || name === 'tsconfig.json') {
    return FileIcons.config;
  }

  // By extension
  switch (ext) {
    case 'tsx':
    case 'ts':
      return FileIcons.typescript;
    case 'jsx':
    case 'js':
      return FileIcons.javascript;
    case 'css':
    case 'scss':
    case 'sass':
      return FileIcons.css;
    case 'html':
      return FileIcons.html;
    case 'json':
      return FileIcons.json;
    case 'md':
    case 'mdx':
      return FileIcons.markdown;
    case 'py':
      return FileIcons.python;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileIcons.image;
    default:
      return FileIcons.default;
  }
}

function getStatusColor(status: FileStatus): string {
  switch (status) {
    case 'modified':
      return '#f59e0b'; // Amber
    case 'error':
      return '#ef4444'; // Red
    case 'warning':
      return '#f97316'; // Orange
    case 'generating':
      return '#6366f1'; // Indigo (animated)
    case 'pristine':
    default:
      return 'transparent';
  }
}

// ============================================================================
// FILE ITEM COMPONENT
// ============================================================================

interface FileItemProps {
  file: VirtualFile;
  depth: number;
  isSelected: boolean;
  onSelect: (file: VirtualFile) => void;
  onOpen: (file: VirtualFile) => void;
}

const FileItem = memo(function FileItem({
  file,
  depth,
  isSelected,
  onSelect,
  onOpen,
}: FileItemProps) {
  const handleClick = useCallback(() => {
    onSelect(file);
  }, [file, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onOpen(file);
  }, [file, onOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onOpen(file);
      }
    },
    [file, onOpen]
  );

  const statusColor = getStatusColor(file.status);
  const isGenerating = file.status === 'generating';

  return (
    <div
      className={`file-item ${isSelected ? 'selected' : ''} ${isGenerating ? 'generating' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="treeitem"
      aria-selected={isSelected}
    >
      <div className="file-icon">{getFileIcon(file)}</div>
      <span className="file-name">{file.name}</span>
      {file.isEntryPoint && <span className="entry-badge">entry</span>}
      {statusColor !== 'transparent' && (
        <span className="status-dot" style={{ backgroundColor: statusColor }} />
      )}
      {file.errors && file.errors.length > 0 && (
        <span className="error-count">{file.errors.length}</span>
      )}

      <style jsx>{`
        .file-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px 6px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
          user-select: none;
          position: relative;
        }

        .file-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-item.selected {
          background: rgba(99, 102, 241, 0.2);
        }

        .file-item.selected:hover {
          background: rgba(99, 102, 241, 0.25);
        }

        .file-item:focus {
          outline: none;
          box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.5);
        }

        .file-item.generating::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(
            180deg,
            #6366f1 0%,
            #8b5cf6 50%,
            #6366f1 100%
          );
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        .file-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.6);
        }

        .file-item.selected .file-icon {
          color: rgba(255, 255, 255, 0.9);
        }

        .file-name {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .file-item.selected .file-name {
          color: #fff;
        }

        .entry-badge {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(99, 102, 241, 0.3);
          color: rgba(99, 102, 241, 1);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .error-count {
          font-size: 10px;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// DIRECTORY ITEM COMPONENT
// ============================================================================

interface DirectoryItemProps {
  directory: VirtualDirectory;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect: (file: VirtualFile) => void;
  onFileOpen: (file: VirtualFile) => void;
}

const DirectoryItem = memo(function DirectoryItem({
  directory,
  depth,
  selectedPath,
  expandedPaths,
  onToggle,
  onFileSelect,
  onFileOpen,
}: DirectoryItemProps) {
  const isExpanded = expandedPaths.has(directory.path);

  const handleClick = useCallback(() => {
    onToggle(directory.path);
  }, [directory.path, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(directory.path);
      }
    },
    [directory.path, onToggle]
  );

  return (
    <div className="directory-container">
      <div
        className={`directory-item ${isExpanded ? 'expanded' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={isExpanded}
      >
        <div className="chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
        <div className="folder-icon">
          {isExpanded ? FileIcons.folderOpen : FileIcons.folder}
        </div>
        <span className="directory-name">{directory.name}</span>
      </div>

      {isExpanded && (
        <div className="directory-children" role="group">
          {/* Subdirectories first */}
          {directory.children
            .filter((child): child is VirtualDirectory => 'children' in child)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((subdir) => (
              <DirectoryItem
                key={subdir.path}
                directory={subdir}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onFileSelect={onFileSelect}
                onFileOpen={onFileOpen}
              />
            ))}

          {/* Files second */}
          {directory.children
            .filter((child): child is VirtualFile => !('children' in child))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((file) => (
              <FileItem
                key={file.path}
                file={file}
                depth={depth + 1}
                isSelected={selectedPath === file.path}
                onSelect={onFileSelect}
                onOpen={onFileOpen}
              />
            ))}
        </div>
      )}

      <style jsx>{`
        .directory-container {
          width: 100%;
        }

        .directory-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px 6px 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
          user-select: none;
        }

        .directory-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .directory-item:focus {
          outline: none;
          box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.5);
        }

        .chevron {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s ease;
        }

        .directory-item.expanded .chevron {
          transform: rotate(90deg);
        }

        .folder-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: rgba(255, 200, 100, 0.8);
        }

        .directory-name {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }

        .directory-children {
          /* No additional styling needed - children handle their own padding */
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FileExplorer({
  tree,
  selectedPath = null,
  onFileSelect = () => {},
  onFileOpen = () => {},
  projectName = 'Project',
  isLoading = false,
  className = '',
}: FileExplorerProps) {
  // Debug: Log tree updates
  React.useEffect(() => {
    if (tree) {
      const countFiles = (dir: VirtualDirectory): number => {
        let count = 0;
        for (const child of dir.children) {
          if ('children' in child) {
            count += countFiles(child);
          } else {
            count++;
          }
        }
        return count;
      };
      console.log('[FileExplorer] 🌲 Tree received, total files:', countFiles(tree), ', root children:', tree.children.length);
    } else {
      console.log('[FileExplorer] 🌲 Tree is null');
    }
  }, [tree]);

  // Track expanded directories
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['/src', '/components', '/lib', '/app'])
  );

  // Toggle directory expansion
  const handleToggle = useCallback((path: string) => {
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

  // Count total files
  const fileCount = useMemo(() => {
    if (!tree) return 0;
    let count = 0;
    const countFiles = (dir: VirtualDirectory) => {
      for (const child of dir.children) {
        if ('children' in child) {
          countFiles(child);
        } else {
          count++;
        }
      }
    };
    countFiles(tree);
    return count;
  }, [tree]);

  return (
    <div className={`file-explorer ${className}`}>
      {/* Header */}
      <div className="explorer-header">
        <span className="project-name">{projectName}</span>
        <span className="file-count">{fileCount} files</span>
      </div>

      {/* File Tree */}
      <div className="explorer-tree" role="tree">
        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Loading files...</span>
          </div>
        )}

        {!isLoading && !tree && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span>No files yet</span>
            <span className="empty-hint">Start a conversation to generate code</span>
          </div>
        )}

        {!isLoading && tree && (
          <>
            {/* Root level files */}
            {tree.children
              .filter((child): child is VirtualFile => !('children' in child))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file) => (
                <FileItem
                  key={file.path}
                  file={file}
                  depth={0}
                  isSelected={selectedPath === file.path}
                  onSelect={onFileSelect}
                  onOpen={onFileOpen}
                />
              ))}

            {/* Root level directories */}
            {tree.children
              .filter((child): child is VirtualDirectory => 'children' in child)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((directory) => (
                <DirectoryItem
                  key={directory.path}
                  directory={directory}
                  depth={0}
                  selectedPath={selectedPath}
                  expandedPaths={expandedPaths}
                  onToggle={handleToggle}
                  onFileSelect={onFileSelect}
                  onFileOpen={onFileOpen}
                />
              ))}
          </>
        )}
      </div>

      <style jsx>{`
        .file-explorer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, #0f0f12 0%, #111115 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
        }

        .explorer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .project-name {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
        }

        .file-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
        }

        .explorer-tree {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 0;
        }

        .explorer-tree::-webkit-scrollbar {
          width: 6px;
        }

        .explorer-tree::-webkit-scrollbar-track {
          background: transparent;
        }

        .explorer-tree::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .explorer-tree::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          color: rgba(255, 255, 255, 0.2);
        }

        .empty-hint {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.25);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FileExplorer;
