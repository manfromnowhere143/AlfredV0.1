"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

interface Project {
  id: string;
  name: string;
  primaryDomain?: string;
  vercelProjectName?: string;
  lastDeploymentId?: string;
  lastDeploymentStatus?: string;
  lastDeployedAt?: string;
  createdAt: string;
  metadata?: {
    heroVideo?: { url: string; thumbnailUrl?: string };
    previewImage?: { url: string };
  };
}

interface Artifact {
  id: string;
  title: string;
  language: string;
  version: number;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/projects/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProject(data.project);
        setArtifact(data.latestArtifact);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (videoRef.current && isHoveringPreview) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [isHoveringPreview]);

  function copyUrl() {
    if (project?.primaryDomain) {
      navigator.clipboard.writeText(`https://${project.primaryDomain}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function formatTimeAgo(dateString?: string) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (loading || !mounted) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-orb">
            <div className="orb-ring" />
            <div className="orb-core" />
          </div>
          <div className="loading-text">Loading project...</div>
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            min-height: 100dvh;
            background: var(--bg-void, #000);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          :global([data-theme="light"]) .loading-container {
            background: #fafafa;
          }
          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .loading-orb {
            position: relative;
            width: 48px;
            height: 48px;
          }
          .orb-ring {
            position: absolute;
            inset: 0;
            border: 2px solid transparent;
            border-top-color: rgba(139, 92, 246, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .orb-core {
            position: absolute;
            inset: 8px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2));
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1); }
          }
          .loading-text {
            font-size: 13px;
            color: var(--text-muted, rgba(255,255,255,0.4));
            letter-spacing: 0.02em;
          }
          :global([data-theme="light"]) .loading-text {
            color: rgba(0,0,0,0.4);
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!project) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h2>Project not found</h2>
          <p>This project doesn't exist or you don't have permission to view it.</p>
          <button onClick={() => router.push("/")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Return Home
          </button>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            min-height: 100dvh;
            background: var(--bg-void, #000);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          :global([data-theme="light"]) .error-container {
            background: #fafafa;
          }
          .error-content {
            text-align: center;
            max-width: 380px;
            animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .error-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
            border: 1px solid rgba(239, 68, 68, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            color: #ef4444;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary, #fff);
            margin: 0 0 8px;
            letter-spacing: -0.02em;
          }
          :global([data-theme="light"]) h2 {
            color: #0a0a0a;
          }
          p {
            font-size: 14px;
            color: var(--text-muted, rgba(255,255,255,0.5));
            margin: 0 0 28px;
            line-height: 1.6;
          }
          :global([data-theme="light"]) p {
            color: rgba(0,0,0,0.5);
          }
          button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          button:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
          }
          :global([data-theme="light"]) button {
            background: rgba(0,0,0,0.03);
            border-color: rgba(0,0,0,0.1);
            color: #0a0a0a;
          }
        `}</style>
      </div>
    );
  }

  const isReady = project.lastDeploymentStatus === "ready";
  const previewUrl = project.metadata?.previewImage?.url;
  const videoUrl = project.metadata?.heroVideo?.url;

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page">
      {/* Ambient Background */}
      <div className="ambient" aria-hidden="true">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* Header */}
      <header className={`header ${mounted ? 'visible' : ''}`}>
        <div className="header-inner">
          <button className="back-btn" onClick={() => router.push("/")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <nav className="breadcrumb">
            <button className="breadcrumb-link" onClick={() => router.push("/")}>Projects</button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="breadcrumb-current">{project.name}</span>
          </nav>

          <div className="header-actions">
            <div className={`status-pill ${isReady ? 'ready' : 'pending'}`}>
              <span className="status-dot" />
              <span className="status-text">{isReady ? 'Live' : 'Building'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`hero ${mounted ? 'visible' : ''}`}>
        <div className="hero-inner">
          <div className="hero-content">
            <div className="project-type">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Production Deployment
            </div>
            <h1>{project.name}</h1>
            <div className="hero-meta">
              <span className="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Deployed {formatTimeAgo(project.lastDeployedAt)}
              </span>
              {project.primaryDomain && (
                <>
                  <span className="meta-sep">•</span>
                  <a 
                    href={`https://${project.primaryDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta-item link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                    </svg>
                    {project.primaryDomain}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="hero-actions">
            {project.primaryDomain && (
              <a
                href={`https://${project.primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-glass"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
                Visit Site
              </a>
            )}
            <button
              className="btn btn-seo"
              onClick={() => router.push(`/projects/${params.id}/seo`)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              SEO Dashboard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => artifact && router.push(`/edit/${artifact.id}`)}
              disabled={!artifact}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit & Redeploy
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={`main ${mounted ? 'visible' : ''}`}>
        {/* Preview Card */}
        <div 
          className="preview-card"
          onMouseEnter={() => setIsHoveringPreview(true)}
          onMouseLeave={() => setIsHoveringPreview(false)}
        >
          <div className="preview-chrome">
            <div className="chrome-dots">
              <span /><span /><span />
            </div>
            <div className="chrome-url">
              {project.primaryDomain ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  {project.primaryDomain}
                </>
              ) : (
                'No domain'
              )}
            </div>
            <div className="chrome-actions">
              <button 
                className={`chrome-btn ${copied ? 'copied' : ''}`}
                onClick={copyUrl}
                title="Copy URL"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                )}
              </button>
              {project.primaryDomain && (
                <a
                  href={`https://${project.primaryDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chrome-btn"
                  title="Open in new tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
          
          <div className="preview-frame">
            {!previewLoaded && (
              <div className="preview-skeleton">
                <div className="skeleton-shimmer" />
              </div>
            )}
            
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                poster={previewUrl}
                muted
                loop
                playsInline
                onLoadedData={() => setPreviewLoaded(true)}
                className={previewLoaded ? 'loaded' : ''}
              />
            ) : previewUrl ? (
              <img 
                src={previewUrl} 
                alt={project.name}
                onLoad={() => setPreviewLoaded(true)}
                className={previewLoaded ? 'loaded' : ''}
              />
            ) : project.primaryDomain ? (
              <iframe
                src={`https://${project.primaryDomain}`}
                title="Preview"
                onLoad={() => setPreviewLoaded(true)}
                className={previewLoaded ? 'loaded' : ''}
              />
            ) : (
              <div className="no-preview">
                <div className="no-preview-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <span>No preview available</span>
                <p>Deploy your project to generate a preview</p>
              </div>
            )}

            {videoUrl && (
              <div className={`play-badge ${isHoveringPreview ? 'playing' : ''}`}>
                {isHoveringPreview ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          {/* Quick Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">v{artifact?.version || 1}</span>
              <span className="stat-label">Version</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatTimeAgo(project.lastDeployedAt).replace(' ago', '')}</span>
              <span className="stat-label">Deployed</span>
            </div>
            <div className="stat-card">
              <span className={`stat-value ${isReady ? 'success' : ''}`}>
                {isReady ? '100%' : '—'}
              </span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>

          {/* Domain Card */}
          <div className="info-card">
            <div className="card-header">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                Domains
              </h3>
              <button className="card-action">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>
            {project.primaryDomain ? (
              <a
                href={`https://${project.primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="domain-row"
              >
                <div className="domain-info">
                  <span className="domain-url">{project.primaryDomain}</span>
                  <span className="domain-badge">
                    <span className="badge-dot" />
                    Production
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            ) : (
              <div className="empty-state">No domains configured</div>
            )}
          </div>

          {/* Source Card */}
          {artifact && (
            <div className="info-card">
              <div className="card-header">
                <h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="6" y1="3" x2="6" y2="15"/>
                    <circle cx="18" cy="6" r="3"/>
                    <circle cx="6" cy="18" r="3"/>
                    <path d="M18 9a9 9 0 01-9 9"/>
                  </svg>
                  Source
                </h3>
              </div>
              <div className="source-content">
                <div className="source-branch">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="6" y1="3" x2="6" y2="15"/>
                    <circle cx="18" cy="6" r="3"/>
                    <circle cx="6" cy="18" r="3"/>
                    <path d="M18 9a9 9 0 01-9 9"/>
                  </svg>
                  main
                </div>
                <div className="source-commit">
                  <code className="commit-hash">{artifact.id.slice(0, 7)}</code>
                  <span className="commit-msg">{artifact.title}</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings Accordion */}
          <div className="info-card accordion">
            <button 
              className="accordion-header"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <div className="accordion-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                Build Settings
              </div>
              <svg 
                width="16" height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`chevron ${settingsOpen ? 'open' : ''}`}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div className={`accordion-body ${settingsOpen ? 'open' : ''}`}>
              <div className="settings-grid">
                <div className="setting">
                  <span className="setting-label">Framework</span>
                  <span className="setting-value">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 19.5h20L12 2z"/>
                    </svg>
                    Next.js
                  </span>
                </div>
                <div className="setting">
                  <span className="setting-label">Language</span>
                  <span className="setting-value">{artifact?.language?.toUpperCase() || 'TSX'}</span>
                </div>
                <div className="setting">
                  <span className="setting-label">Node.js</span>
                  <span className="setting-value">20.x</span>
                </div>
                <div className="setting">
                  <span className="setting-label">Region</span>
                  <span className="setting-value">Edge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════
           FOUNDATION
           ═══════════════════════════════════════════════════════════════════════════ */
        
        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-void, #000);
          color: var(--text-primary, #fff);
          position: relative;
          overflow-x: hidden;
        }

        :global([data-theme="light"]) .page {
          background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
          color: #0a0a0a;
        }

        .ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
        }
        .orb-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
        }
        .orb-2 {
          width: 400px;
          height: 400px;
          bottom: 10%;
          right: -100px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
        }
        .orb-3 {
          width: 300px;
          height: 300px;
          bottom: 20%;
          left: -100px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
        }
        :global([data-theme="light"]) .ambient-orb { opacity: 0.3; }

        /* ═══════════════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════════════ */

        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          opacity: 0;
          transform: translateY(-8px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .header.visible { opacity: 1; transform: translateY(0); }
        :global([data-theme="light"]) .header {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(0, 0, 0, 0.06);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted, rgba(255,255,255,0.5));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          transform: translateX(-2px);
        }
        :global([data-theme="light"]) .back-btn {
          border-color: rgba(0, 0, 0, 0.08);
          background: rgba(0, 0, 0, 0.02);
          color: rgba(0, 0, 0, 0.5);
        }
        :global([data-theme="light"]) .back-btn:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #000;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          flex: 1;
          min-width: 0;
        }
        .breadcrumb svg { color: var(--text-muted, rgba(255,255,255,0.2)); flex-shrink: 0; }
        .breadcrumb-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--text-muted, rgba(255,255,255,0.4));
          font-size: inherit;
          cursor: pointer;
          transition: color 0.15s ease;
          flex-shrink: 0;
        }
        .breadcrumb-link:hover { color: var(--text-secondary, rgba(255,255,255,0.7)); }
        .breadcrumb-current {
          color: var(--text-primary, #fff);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global([data-theme="light"]) .breadcrumb-link { color: rgba(0, 0, 0, 0.4); }
        :global([data-theme="light"]) .breadcrumb-current { color: #0a0a0a; }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 16px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          font-size: 11px;
          font-weight: 500;
          color: #f59e0b;
          flex-shrink: 0;
        }
        .status-pill.ready {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
          50% { opacity: 0.7; box-shadow: 0 0 8px 2px currentColor; }
        }

        /* ═══════════════════════════════════════════════════════════════════════════
           HERO
           ═══════════════════════════════════════════════════════════════════════════ */

        .hero {
          position: relative;
          z-index: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          opacity: 0;
          transform: translateY(16px);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
        }
        .hero.visible { opacity: 1; transform: translateY(0); }
        :global([data-theme="light"]) .hero { border-color: rgba(0, 0, 0, 0.06); }

        .hero-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
        }

        .project-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05));
          border: 1px solid rgba(139, 92, 246, 0.2);
          font-size: 11px;
          font-weight: 500;
          color: #a78bfa;
          margin-bottom: 10px;
        }

        .hero h1 {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 600;
          letter-spacing: -0.03em;
          margin: 0 0 10px;
          line-height: 1.1;
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        .meta-item.link {
          color: var(--text-secondary, rgba(255,255,255,0.7));
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .meta-item.link:hover { color: #a78bfa; }
        .meta-sep { color: var(--text-muted, rgba(255,255,255,0.2)); }
        :global([data-theme="light"]) .meta-item { color: rgba(0, 0, 0, 0.5); }
        :global([data-theme="light"]) .meta-item.link { color: rgba(0, 0, 0, 0.7); }

        .hero-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          text-decoration: none;
          white-space: nowrap;
        }

        .btn-glass {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .btn-glass:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        :global([data-theme="light"]) .btn-glass {
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.1);
          color: #0a0a0a;
        }

        .btn-seo {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }
        .btn-seo:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.1));
          border-color: rgba(34, 197, 94, 0.5);
          transform: translateY(-2px);
        }
        :global([data-theme="light"]) .btn-seo {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.03));
          border-color: rgba(34, 197, 94, 0.3);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* ═══════════════════════════════════════════════════════════════════════════
           MAIN
           ═══════════════════════════════════════════════════════════════════════════ */

        .main {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 24px 48px;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          opacity: 0;
          transform: translateY(16px);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
        }
        .main.visible { opacity: 1; transform: translateY(0); }

        /* ═══════════════════════════════════════════════════════════════════════════
           PREVIEW CARD
           ═══════════════════════════════════════════════════════════════════════════ */

        .preview-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .preview-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
        }
        :global([data-theme="light"]) .preview-card {
          background: #fff;
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .preview-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        :global([data-theme="light"]) .preview-chrome {
          background: #f8f8f8;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .chrome-dots {
          display: flex;
          gap: 6px;
        }
        .chrome-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .chrome-dots span:nth-child(1) { background: rgba(255, 95, 86, 0.8); }
        .chrome-dots span:nth-child(2) { background: rgba(255, 189, 46, 0.8); }
        .chrome-dots span:nth-child(3) { background: rgba(39, 201, 63, 0.8); }

        .chrome-url {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.5));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global([data-theme="light"]) .chrome-url {
          background: #fff;
          border-color: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.5);
        }

        .chrome-actions { display: flex; gap: 4px; }

        .chrome-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted, rgba(255,255,255,0.4));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .chrome-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .chrome-btn.copied {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        :global([data-theme="light"]) .chrome-btn {
          background: rgba(0, 0, 0, 0.03);
          color: rgba(0, 0, 0, 0.4);
        }

        .preview-frame {
          aspect-ratio: 16/10;
          background: #0a0a0a;
          position: relative;
          overflow: hidden;
        }
        :global([data-theme="light"]) .preview-frame { background: #f0f0f0; }

        .preview-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%);
        }
        .skeleton-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .preview-frame iframe,
        .preview-frame video,
        .preview-frame img {
          width: 100%;
          height: 100%;
          border: none;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .preview-frame iframe.loaded,
        .preview-frame video.loaded,
        .preview-frame img.loaded { opacity: 1; }

        .no-preview {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(99, 102, 241, 0.01) 100%);
        }
        .no-preview-icon {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.2));
        }
        .no-preview span {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-secondary, rgba(255,255,255,0.6));
        }
        .no-preview p {
          font-size: 13px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          margin: 0;
        }

        .play-badge {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.2s ease;
        }
        .play-badge.playing { background: rgba(139, 92, 246, 0.8); }

        /* ═══════════════════════════════════════════════════════════════════════════
           INFO PANEL
           ═══════════════════════════════════════════════════════════════════════════ */

        .info-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .stat-card {
          padding: 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        :global([data-theme="light"]) .stat-card {
          background: #fff;
          border-color: rgba(0, 0, 0, 0.08);
        }

        .stat-value {
          display: block;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          letter-spacing: -0.02em;
        }
        .stat-value.success { color: #10b981; }
        :global([data-theme="light"]) .stat-value { color: #0a0a0a; }
        .stat-label {
          display: block;
          font-size: 11px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
        }
        :global([data-theme="light"]) .info-card {
          background: #fff;
          border-color: rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        :global([data-theme="light"]) .card-header { border-color: rgba(0, 0, 0, 0.06); }

        .card-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted, rgba(255,255,255,0.5));
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-action {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.15);
          background: transparent;
          color: var(--text-muted, rgba(255,255,255,0.4));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .card-action:hover {
          border-color: rgba(139, 92, 246, 0.5);
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.1);
        }

        .domain-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .domain-row:hover { background: rgba(255, 255, 255, 0.02); }
        .domain-row svg { color: var(--text-muted, rgba(255,255,255,0.3)); }
        :global([data-theme="light"]) .domain-row:hover { background: rgba(0, 0, 0, 0.02); }

        .domain-info { display: flex; flex-direction: column; gap: 4px; }
        .domain-url {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }
        :global([data-theme="light"]) .domain-url { color: #0a0a0a; }
        .domain-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .empty-state {
          padding: 24px 20px;
          text-align: center;
          color: var(--text-muted, rgba(255,255,255,0.4));
          font-size: 13px;
        }

        .source-content {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .source-branch {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }
        .source-branch svg { color: var(--text-muted, rgba(255,255,255,0.4)); }
        :global([data-theme="light"]) .source-branch { color: #0a0a0a; }

        .source-commit {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
        }
        :global([data-theme="light"]) .source-commit {
          background: #f8f8f8;
          border-color: rgba(0, 0, 0, 0.06);
        }

        .commit-hash {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 6px;
          color: #a78bfa;
        }
        .commit-msg {
          font-size: 13px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        /* Accordion */
        .accordion .card-header { display: none; }

        .accordion-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: transparent;
          border: none;
          color: var(--text-primary, #fff);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .accordion-header:hover { background: rgba(255, 255, 255, 0.02); }
        :global([data-theme="light"]) .accordion-header { color: #0a0a0a; }

        .accordion-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .accordion-title svg { color: var(--text-muted, rgba(255,255,255,0.4)); }

        .chevron {
          color: var(--text-muted, rgba(255,255,255,0.3));
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chevron.open { transform: rotate(180deg); }

        .accordion-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .accordion-body.open { max-height: 200px; }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 16px 16px;
        }

        .setting { display: flex; flex-direction: column; gap: 6px; }
        .setting-label {
          font-size: 11px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .setting-value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }
        :global([data-theme="light"]) .setting-value { color: #0a0a0a; }

        /* ═══════════════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════════════ */

        @media (max-width: 1024px) {
          .main { grid-template-columns: 1fr; }
          .preview-card { order: -1; }
        }

        @media (max-width: 768px) {
          .header-inner { padding: 8px 16px; }
          .hero-inner {
            padding: 20px 16px;
            flex-direction: column;
          }
          .hero h1 { font-size: 22px; }
          .hero-actions {
            width: 100%;
            flex-direction: column;
          }
          .btn { width: 100%; justify-content: center; }
          .main { padding: 20px 16px 40px; }
          .breadcrumb-link { display: none; }
          .breadcrumb svg:first-of-type { display: none; }
          .status-text { display: none; }
          .status-pill { padding: 6px; border-radius: 50%; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr; }
          .settings-grid { grid-template-columns: 1fr; }
          .chrome-dots { display: none; }
        }
      `}</style>
    </div>
  );
}