"use client";

import { useEffect, useState } from "react";
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

  if (loading || !mounted) {
    return (
      <div className="loading-container">
        <div className="loader">
          <div className="loader-dot" />
          <div className="loader-dot" />
          <div className="loader-dot" />
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            background: var(--bg-void, #000);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loader {
            display: flex;
            gap: 6px;
          }
          .loader-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            animation: pulse 1.4s ease-in-out infinite;
          }
          .loader-dot:nth-child(2) { animation-delay: 0.2s; }
          .loader-dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h2>Project not found</h2>
          <p>The project you're looking for doesn't exist or has been deleted.</p>
          <button onClick={() => router.push("/")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            background: var(--bg-void, #000);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .error-content {
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: rgba(255, 255, 255, 0.4);
          }
          h2 {
            font-size: 18px;
            font-weight: 500;
            color: #fff;
            margin: 0 0 8px;
          }
          p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
            margin: 0 0 24px;
            line-height: 1.5;
          }
          button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }
          button:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.15);
          }
        `}</style>
      </div>
    );
  }

  const isReady = project.lastDeploymentStatus === "ready";
  const previewUrl = project.metadata?.previewImage?.url;
  const videoUrl = project.metadata?.heroVideo?.url;

  return (
    <div className="page">
      {/* Minimal Header */}
      <header className="header">
        <button className="back-btn" onClick={() => router.push("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="header-title">
          <span className="breadcrumb">Projects</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="current">{project.name}</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>{project.name}</h1>
          <div className="hero-meta">
            <span className={`status ${isReady ? 'ready' : 'pending'}`}>
              <span className="status-dot" />
              {project.lastDeploymentStatus || "Unknown"}
            </span>
            <span className="separator">•</span>
            <span className="time">{formatTimeAgo(project.lastDeployedAt)}</span>
          </div>
        </div>
        <div className="hero-actions">
          {project.primaryDomain && (
            <a
              href={`https://${project.primaryDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Visit
            </a>
          )}
          <button
            className="btn btn-primary"
            onClick={() => artifact && router.push(`/?preview=${artifact.id}`)}
            disabled={!artifact}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit & Redeploy
          </button>
        </div>
      </section>

      {/* Main Content */}
      <main className="main">
        {/* Preview Card */}
        <div className="preview-card">
          <div className="preview-header">
            <span>Production Deployment</span>
            <div className="preview-actions">
              {project.primaryDomain && (
                <button className="icon-btn" onClick={copyUrl} title="Copy URL">
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  )}
                </button>
              )}
              {project.primaryDomain && (
                <a
                  href={`https://${project.primaryDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn"
                  title="Open in new tab"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
          <div className="preview-frame">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={previewUrl}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : previewUrl ? (
              <img src={previewUrl} alt={project.name} />
            ) : project.primaryDomain ? (
              <iframe
                src={`https://${project.primaryDomain}`}
                title="Project Preview"
              />
            ) : (
              <div className="no-preview">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <span>No preview available</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          {/* Deployment Info */}
          <div className="info-section">
            <div className="section-header">
              <span className="section-title">Deployment</span>
            </div>
            <div className="info-row">
              <span className="info-label">URL</span>
              {project.primaryDomain ? (
                <a
                  href={`https://${project.primaryDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="info-link"
                >
                  {project.primaryDomain}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </a>
              ) : (
                <span className="info-empty">Not deployed</span>
              )}
            </div>
          </div>

          {/* Domains */}
          <div className="info-section">
            <div className="section-header">
              <span className="section-title">Domains</span>
              <button className="add-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
              </button>
            </div>
            {project.primaryDomain && (
              <a
                href={`https://${project.primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="domain-item"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                {project.primaryDomain}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="external">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            )}
          </div>

          {/* Status */}
          <div className="info-section">
            <div className="section-header">
              <span className="section-title">Status</span>
            </div>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">State</span>
                <span className={`status-value ${isReady ? 'success' : 'pending'}`}>
                  <span className="status-indicator" />
                  {project.lastDeploymentStatus || "Unknown"}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Created</span>
                <span className="status-value">{formatTimeAgo(project.lastDeployedAt)}</span>
              </div>
            </div>
          </div>

          {/* Source */}
          {artifact && (
            <div className="info-section">
              <div className="section-header">
                <span className="section-title">Source</span>
              </div>
              <div className="source-info">
                <div className="source-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="6" y1="3" x2="6" y2="15"/>
                    <circle cx="18" cy="6" r="3"/>
                    <circle cx="6" cy="18" r="3"/>
                    <path d="M18 9a9 9 0 01-9 9"/>
                  </svg>
                  <span>main</span>
                </div>
                <div className="source-row commit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="1.05" y1="12" x2="7" y2="12"/>
                    <line x1="17.01" y1="12" x2="22.96" y2="12"/>
                  </svg>
                  <span className="commit-hash">{artifact.id.slice(0, 7)}</span>
                  <span className="commit-msg">{artifact.title}</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings Accordion */}
          <div className="info-section accordion">
            <button 
              className="accordion-trigger"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <div className="accordion-left">
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  className={`chevron ${settingsOpen ? 'open' : ''}`}
                >
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Deployment Settings</span>
              </div>
            </button>
            {settingsOpen && (
              <div className="accordion-content">
                <div className="settings-item">
                  <span className="settings-label">Framework</span>
                  <span className="settings-value">React / Next.js</span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">Language</span>
                  <span className="settings-value">{artifact?.language?.toUpperCase() || 'TSX'}</span>
                </div>
                <div className="settings-item">
                  <span className="settings-label">Version</span>
                  <span className="settings-value">v{artifact?.version || 1}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: var(--bg-void, #000);
          color: #fff;
        }

        /* Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .back-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.12);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .breadcrumb {
          color: rgba(255, 255, 255, 0.4);
        }
        .header-title svg {
          color: rgba(255, 255, 255, 0.2);
        }
        .current {
          color: #fff;
          font-weight: 500;
        }

        /* Hero */
        .hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 32px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
        }

        .hero-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: capitalize;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
        }
        .status.ready .status-dot {
          background: #10b981;
        }

        .separator {
          color: rgba(255, 255, 255, 0.2);
        }

        .hero-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          text-decoration: none;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .btn-primary {
          background: #fff;
          color: #000;
        }
        .btn-primary:hover {
          background: rgba(255, 255, 255, 0.9);
        }
        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Main */
        .main {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px 48px;
        }

        /* Preview Card */
        .preview-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .preview-actions {
          display: flex;
          gap: 4px;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .preview-frame {
          aspect-ratio: 16/9;
          background: #000;
          position: relative;
        }
        .preview-frame iframe,
        .preview-frame video,
        .preview-frame img {
          width: 100%;
          height: 100%;
          border: none;
          object-fit: cover;
        }

        .no-preview {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: rgba(255, 255, 255, 0.2);
        }
        .no-preview span {
          font-size: 14px;
        }

        /* Info Panel */
        .info-panel {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
          height: fit-content;
        }

        .info-section {
          background: var(--bg-void, #000);
          padding: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .add-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .add-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .info-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .info-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #fff;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .info-link:hover {
          color: #a78bfa;
        }

        .info-empty {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.3);
        }

        /* Domains */
        .domain-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #fff;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .domain-item:hover {
          color: #a78bfa;
        }
        .domain-item .external {
          margin-left: auto;
          color: rgba(255, 255, 255, 0.3);
        }

        /* Status */
        .status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .status-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #fff;
          text-transform: capitalize;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
        }
        .status-value.success .status-indicator {
          background: #10b981;
        }

        /* Source */
        .source-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .source-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #fff;
        }
        .source-row svg {
          color: rgba(255, 255, 255, 0.4);
        }

        .source-row.commit {
          color: rgba(255, 255, 255, 0.6);
        }
        .commit-hash {
          font-family: monospace;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }
        .commit-msg {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Accordion */
        .accordion {
          padding: 0;
        }

        .accordion-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .accordion-trigger:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .accordion-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chevron {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s ease;
        }
        .chevron.open {
          transform: rotate(90deg);
        }

        .accordion-content {
          padding: 0 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .settings-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .settings-label {
          color: rgba(255, 255, 255, 0.5);
        }
        .settings-value {
          color: #fff;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .main {
            grid-template-columns: 1fr;
          }
          .hero {
            flex-direction: column;
          }
          .hero-actions {
            width: 100%;
          }
          .btn {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .header { padding: 12px 16px; }
          .hero { padding: 24px 16px; }
          .hero h1 { font-size: 22px; }
          .main { padding: 0 16px 32px; }
        }
      `}</style>
    </div>
  );
}