'use client';

/**
 * Projects Sidebar
 *
 * Shows saved projects and allows loading/managing them.
 * Features:
 * - List saved projects
 * - Quick load
 * - Delete projects
 * - Project metadata display
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  framework: string;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsSidebarProps {
  onLoadProject?: (projectId: string) => Promise<void> | void;
  onClose?: () => void;
  currentProjectId?: string | null;
  loadingProjectId?: string | null;
}

export function ProjectsSidebar({
  onLoadProject,
  onClose,
  currentProjectId,
  loadingProjectId,
}: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Load projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/builder/projects?limit=50');
      if (!res.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('[ProjectsSidebar] Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Delete project
  const handleDelete = useCallback(async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this project? This cannot be undone.')) {
      return;
    }

    setDeletingId(projectId);

    try {
      const res = await fetch(`/api/builder/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete project');
      }

      // Remove from list
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('[ProjectsSidebar] Error deleting project:', err);
      alert('Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="projects-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h3>Your Projects</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading projects...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>{error}</span>
            <button onClick={loadProjects}>Retry</button>
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>No saved projects yet</span>
            <p>Create a project in the builder and save it to see it here.</p>
          </div>
        )}

        {!isLoading && !error && projects.length > 0 && (
          <div className="projects-list">
            {projects.map(project => {
              const isLoadingThis = loadingProjectId === project.id;
              const isPressed = pressedId === project.id;
              return (
                <div
                  key={project.id}
                  className={`project-card ${currentProjectId === project.id ? 'active' : ''} ${isLoadingThis ? 'loading' : ''} ${isPressed ? 'pressed' : ''}`}
                  onClick={() => !loadingProjectId && onLoadProject?.(project.id)}
                  onMouseDown={() => setPressedId(project.id)}
                  onMouseUp={() => setPressedId(null)}
                  onMouseLeave={() => setPressedId(null)}
                  style={{ pointerEvents: loadingProjectId ? 'none' : 'auto' }}
                >
                  <div className="project-icon">
                    {isLoadingThis ? (
                      <div className="icon-spinner" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    )}
                  </div>
                  <div className="project-info">
                    <div className="project-name">{project.name}</div>
                    <div className="project-meta">
                      {isLoadingThis ? (
                        <span className="loading-text">Loading project...</span>
                      ) : (
                        <>
                          <span>{project.fileCount} files</span>
                          <span>{formatSize(project.totalSize)}</span>
                          <span>{formatDate(project.updatedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {!isLoadingThis && (
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(project.id, e)}
                      disabled={deletingId === project.id}
                      aria-label="Delete project"
                    >
                      {deletingId === project.id ? (
                        <div className="mini-spinner" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .projects-sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg, #0f0f12);
          border-left: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        }

        .sidebar-header h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text, rgba(255, 255, 255, 0.9));
        }

        .close-btn {
          width: 24px;
          height: 24px;
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary, rgba(255, 255, 255, 0.5));
          transition: all 0.15s ease;
        }

        .close-btn:hover {
          background: var(--surface-hover, rgba(255, 255, 255, 0.1));
          color: var(--text, rgba(255, 255, 255, 0.9));
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
          font-size: 13px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border, rgba(255, 255, 255, 0.1));
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .empty-state svg {
          width: 48px;
          height: 48px;
          color: var(--text-muted, rgba(255, 255, 255, 0.2));
        }

        .empty-state p {
          font-size: 12px;
          color: var(--text-muted, rgba(255, 255, 255, 0.3));
          margin: 0;
        }

        .error-state button {
          padding: 6px 12px;
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 6px;
          color: #8b5cf6;
          font-size: 12px;
          cursor: pointer;
        }

        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .project-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--surface, rgba(255, 255, 255, 0.02));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.1s ease;
          transform: scale(1);
        }

        .project-card:hover {
          background: var(--surface-hover, rgba(255, 255, 255, 0.05));
          border-color: rgba(139, 92, 246, 0.3);
        }

        .project-card.pressed {
          transform: scale(0.97);
          opacity: 0.9;
        }

        .project-card.loading {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.5);
          cursor: wait;
        }

        .project-card.active {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.4);
        }

        .project-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 6px;
          color: #8b5cf6;
          flex-shrink: 0;
        }

        .project-icon svg {
          width: 18px;
          height: 18px;
        }

        .icon-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .project-info {
          flex: 1;
          min-width: 0;
        }

        .project-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text, rgba(255, 255, 255, 0.9));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .project-meta {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 11px;
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
        }

        .project-meta span {
          display: flex;
          align-items: center;
        }

        .loading-text {
          color: #a78bfa;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .delete-btn {
          width: 28px;
          height: 28px;
          padding: 6px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-muted, rgba(255, 255, 255, 0.3));
          opacity: 0;
          transition: all 0.15s ease;
        }

        .project-card:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .delete-btn:disabled {
          cursor: not-allowed;
        }

        .mini-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border, rgba(255, 255, 255, 0.1));
          border-top-color: var(--text-secondary, rgba(255, 255, 255, 0.5));
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

export default ProjectsSidebar;
