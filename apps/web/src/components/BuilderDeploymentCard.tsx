'use client';

/**
 * Builder Deployment Card
 *
 * Direct deployment for Alfred Pro Builder - preserves exact file structure.
 * Does NOT use project-generator transformation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DomainSearch } from './DomainSearch';

interface BuilderFile {
  path: string;
  content: string;
}

interface BuilderDeploymentCardProps {
  files: BuilderFile[];
  projectName: string;
  artifactId?: string;
  artifactTitle?: string;
  onClose: () => void;
  onDeployed?: (url: string) => void;
}

type DeploymentPhase = 'idle' | 'deploying' | 'success' | 'error';

interface SEOAnalysisResult {
  score: number;
  grade: string;
  passedChecks: number;
  totalChecks: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  autoFixableCount: number;
  categoryScores: Record<string, number>;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return '#00ff00';
    case 'A': return '#22c55e';
    case 'B': return '#84cc16';
    case 'C': return '#eab308';
    case 'D': return '#f97316';
    case 'F': return '#ef4444';
    default: return '#888888';
  }
}

function getCategoryName(key: string): string {
  const names: Record<string, string> = {
    technical: 'Technical',
    content: 'Content',
    on_page: 'On-Page',
    ux: 'UX',
    schema: 'Schema',
  };
  return names[key] || key;
}

export function BuilderDeploymentCard({
  files,
  projectName: initialProjectName,
  artifactId,
  artifactTitle,
  onClose,
  onDeployed,
}: BuilderDeploymentCardProps) {
  const [projectName, setProjectName] = useState(() =>
    initialProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'alfred-project'
  );
  const [phase, setPhase] = useState<DeploymentPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [seoResult, setSeoResult] = useState<SEOAnalysisResult | null>(null);
  const [seoFixesApplied, setSeoFixesApplied] = useState(0);
  const [previousDeployment, setPreviousDeployment] = useState<{
    projectName: string;
    deployedUrl: string;
    lastDeployedAt: string;
  } | null>(null);
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check for previous deployment when artifactId is provided
  useEffect(() => {
    if (!artifactId) return;

    const checkProject = async () => {
      setIsCheckingProject(true);
      try {
        const response = await fetch(`/api/deploy/check-project?artifactId=${encodeURIComponent(artifactId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.found && data.projectName) {
            setPreviousDeployment({
              projectName: data.projectName,
              deployedUrl: data.deployedUrl,
              lastDeployedAt: data.lastDeployedAt,
            });
            // Pre-fill with the previously used project name
            setProjectName(data.projectName);
          }
        }
      } catch (err) {
        console.error('[BuilderDeploymentCard] Error checking project:', err);
      } finally {
        setIsCheckingProject(false);
      }
    };

    checkProject();
  }, [artifactId]);

  const handleDeploy = useCallback(async () => {
    setPhase('deploying');
    setProgress(0);
    setError('');
    setStatusMessage('Initializing deployment...');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/deploy/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          projectName: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          artifactId,
          artifactTitle: artifactTitle || projectName,
          customDomain: useCustomDomain && customDomain ? customDomain.toLowerCase().trim() : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Deployment failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const event = JSON.parse(data);
            if (event.type === 'progress') {
              setProgress(event.progress || 0);
              setStatusMessage(event.message || '');
              // Track SEO fixes applied
              if (event.message?.includes('SEO fixes')) {
                const match = event.message.match(/(\d+)\s+SEO\s+fix/i);
                if (match) setSeoFixesApplied(parseInt(match[1], 10));
              }
            } else if (event.type === 'seo_analysis') {
              // Capture SEO analysis results
              setSeoResult({
                score: event.score,
                grade: event.grade,
                passedChecks: event.passedChecks,
                totalChecks: event.totalChecks,
                criticalCount: event.criticalCount,
                warningCount: event.warningCount,
                infoCount: event.infoCount,
                autoFixableCount: event.autoFixableCount,
                categoryScores: event.categoryScores,
              });
            } else if (event.type === 'complete' && event.result?.url) {
              setDeployedUrl(event.result.url);
              // Capture final SEO score if provided
              if (event.result.seo) {
                setSeoResult(prev => prev ? { ...prev, ...event.result.seo } : {
                  score: event.result.seo.score,
                  grade: event.result.seo.grade,
                  passedChecks: event.result.seo.passedChecks,
                  totalChecks: event.result.seo.totalChecks,
                  criticalCount: 0,
                  warningCount: 0,
                  infoCount: 0,
                  autoFixableCount: 0,
                  categoryScores: {},
                });
              }
              setPhase('success');
              setProgress(100);
              onDeployed?.(event.result.url);
            } else if (event.type === 'error') {
              throw new Error(event.error?.message || 'Deployment failed');
            }
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      setPhase('error');
    }
  }, [files, projectName, artifactId, artifactTitle, onDeployed]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'deploying') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, phase]);

  if (!mounted) return null;

  // Detect project characteristics
  const hasTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const hasTailwind = files.some(f => f.content.includes('@tailwind') || f.content.includes('tailwindcss'));
  const fileCount = files.length;

  const content = (
    <div className={`overlay ${isClosing ? 'closing' : ''}`} onClick={(e) => e.target === e.currentTarget && phase !== 'deploying' && handleClose()}>
      <div className="card">
        <div className="header">
          <div className="header-left">
            <div className="icon-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="header-text">
              <h2>Deploy Project</h2>
              <p>{artifactTitle || projectName}</p>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose} disabled={phase === 'deploying'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="content">
          {phase === 'success' ? (
            <div className="success-container">
              <div className="success-header">
                <div className="success-animation">
                  <div className="success-ring" />
                  <div className="success-check">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="success-text">
                  <h3>Deployed Successfully!</h3>
                  <p>Your project is now live on the web</p>
                </div>
              </div>

              {/* SEO Score Card */}
              {seoResult && (
                <div className="seo-card">
                  <div className="seo-header">
                    <div className="seo-score-circle" style={{ '--grade-color': getGradeColor(seoResult.grade) } as React.CSSProperties}>
                      <svg className="seo-score-ring" viewBox="0 0 100 100">
                        <circle className="seo-ring-bg" cx="50" cy="50" r="42" />
                        <circle
                          className="seo-ring-fill"
                          cx="50"
                          cy="50"
                          r="42"
                          style={{
                            strokeDasharray: `${(seoResult.score / 100) * 264} 264`,
                            stroke: getGradeColor(seoResult.grade)
                          }}
                        />
                      </svg>
                      <div className="seo-score-content">
                        <span className="seo-score-number" style={{ color: getGradeColor(seoResult.grade) }}>{seoResult.score}</span>
                        <span className="seo-score-label">SEO</span>
                      </div>
                    </div>
                    <div className="seo-info">
                      <div className="seo-grade-row">
                        <span className="seo-grade-badge" style={{ background: getGradeColor(seoResult.grade) }}>{seoResult.grade}</span>
                        <span className="seo-grade-text">
                          {seoResult.score >= 90 ? 'Excellent' : seoResult.score >= 75 ? 'Good' : seoResult.score >= 60 ? 'Fair' : 'Needs Work'}
                        </span>
                      </div>
                      <div className="seo-stats">
                        <span className="seo-stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          {seoResult.passedChecks}/{seoResult.totalChecks} passed
                        </span>
                        {seoFixesApplied > 0 && (
                          <span className="seo-stat fixed">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            {seoFixesApplied} auto-fixed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Scores */}
                  {seoResult.categoryScores && Object.keys(seoResult.categoryScores).length > 0 && (
                    <div className="seo-categories">
                      {Object.entries(seoResult.categoryScores).map(([key, score]) => (
                        <div key={key} className="seo-category">
                          <div className="seo-category-bar">
                            <div
                              className="seo-category-fill"
                              style={{
                                width: `${score}%`,
                                background: score >= 90 ? '#22c55e' : score >= 75 ? '#84cc16' : score >= 60 ? '#eab308' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className="seo-category-name">{getCategoryName(key)}</span>
                          <span className="seo-category-score">{score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="url-display">
                <span className="url-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                </span>
                <span className="url-text">{deployedUrl.replace('https://', '')}</span>
                <span className="url-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </span>
              </a>
              <div className="success-actions">
                <button className="btn secondary" onClick={handleClose}>Done</button>
                <button className="btn primary" onClick={() => window.open(deployedUrl, '_blank')}>Open Site</button>
              </div>
            </div>
          ) : phase === 'deploying' ? (
            <div className="deploying-container">
              <div className="deploy-animation">
                <div className="orbit orbit-1"><div className="orbit-dot" /></div>
                <div className="orbit orbit-2"><div className="orbit-dot" /></div>
                <div className="orbit orbit-3"><div className="orbit-dot" /></div>
                <div className="deploy-cube">
                  <div className="cube-face front" />
                  <div className="cube-face back" />
                  <div className="cube-face left" />
                  <div className="cube-face right" />
                  <div className="cube-face top" />
                  <div className="cube-face bottom" />
                </div>
                <div className="pulse-ring r1" />
                <div className="pulse-ring r2" />
                <div className="pulse-ring r3" />
              </div>

              {/* SEO Analysis Mini Card - appears when analysis completes */}
              {seoResult && (
                <div className="seo-mini-card">
                  <div className="seo-mini-score" style={{ color: getGradeColor(seoResult.grade) }}>
                    {seoResult.score}
                  </div>
                  <div className="seo-mini-info">
                    <span className="seo-mini-grade" style={{ background: getGradeColor(seoResult.grade) }}>{seoResult.grade}</span>
                    <span className="seo-mini-label">SEO Score</span>
                  </div>
                  {seoResult.autoFixableCount > 0 && (
                    <div className="seo-mini-fixes">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      {seoFixesApplied > 0 ? `${seoFixesApplied} fixed` : `${seoResult.autoFixableCount} fixing...`}
                    </div>
                  )}
                </div>
              )}

              <div className="progress-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="progress-info">
                  <span className="progress-text">{statusMessage || 'Preparing...'}</span>
                  <span className="progress-percent">{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          ) : phase === 'error' ? (
            <div className="error-container">
              <div className="error-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <h3>Deployment Failed</h3>
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button className="btn secondary" onClick={handleClose}>Cancel</button>
                <button className="btn primary" onClick={handleDeploy}>Try Again</button>
              </div>
            </div>
          ) : (
            <>
              <div className="analysis-section">
                <div className="analysis-badges">
                  <span className="badge">{fileCount} FILES</span>
                  {hasTypeScript && <span className="badge">TypeScript</span>}
                  {hasTailwind && <span className="badge">Tailwind</span>}
                  <span className="badge pro">DIRECT DEPLOY</span>
                </div>
                <div className="file-list">
                  {files.slice(0, 5).map(f => (
                    <div key={f.path} className="file-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{f.path}</span>
                    </div>
                  ))}
                  {files.length > 5 && (
                    <div className="file-item more">+{files.length - 5} more files</div>
                  )}
                </div>
              </div>
              <div className="input-section">
                <label htmlFor="projectName">Project Name</label>
                {previousDeployment ? (
                  <div className="existing-project">
                    <div className="existing-project-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <div className="existing-project-text">
                        <span className="existing-url">{previousDeployment.deployedUrl?.replace('https://', '') || `${previousDeployment.projectName}.vercel.app`}</span>
                        <span className="existing-label">Redeploy to same URL</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="new-project-btn"
                      onClick={() => {
                        setPreviousDeployment(null);
                        setProjectName(initialProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'alfred-project');
                      }}
                    >
                      New URL
                    </button>
                  </div>
                ) : (
                  <div className="input-wrapper">
                    <input id="projectName" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-project" maxLength={50} disabled={isCheckingProject} />
                    <span className="input-suffix">.vercel.app</span>
                  </div>
                )}
              </div>

              {/* Custom Domain Section */}
              <div className="domain-section">
                <button
                  className={`domain-toggle ${useCustomDomain ? 'active' : ''}`}
                  onClick={() => setUseCustomDomain(!useCustomDomain)}
                  type="button"
                >
                  <div className="toggle-indicator" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                  <span>Custom Domain</span>
                  <span className="coming-soon">PRO</span>
                </button>

                {useCustomDomain && (
                  <div className="custom-domain-input">
                    {customDomain ? (
                      /* Show selected domain */
                      <div className="selected-domain">
                        <div className="selected-domain-info">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                          </svg>
                          <span className="domain-text">{customDomain}</span>
                          <span className="domain-badge">Ready</span>
                        </div>
                        <button
                          className="change-domain-btn"
                          onClick={() => setCustomDomain('')}
                          type="button"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <DomainSearch
                        onDomainSelect={(domain, isPurchased) => {
                          setCustomDomain(domain);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="seo-feature-badge">
                <div className="seo-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <div className="seo-feature-content">
                  <span className="seo-feature-title">SEO Optimized</span>
                  <span className="seo-feature-desc">Meta tags, Open Graph, Schema.org & sitemap included</span>
                </div>
                <span className="seo-feature-new">PRO</span>
              </div>
              <div className="info-section">
                <div className="info-item highlight">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span>Exact file structure preserved</span>
                </div>
                <div className="info-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  <span>Instant deployment with Vercel</span>
                </div>
                <div className="info-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span>SSL certificate included</span>
                </div>
              </div>
              <div className="actions">
                <button className="btn secondary" onClick={handleClose}>Cancel</button>
                <button className="btn primary" onClick={handleDeploy} disabled={!projectName.trim() || projectName.length < 3}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Deploy Now
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .overlay {
          --bg: rgba(0,0,0,0.85);
          --card-bg: #0f0f10;
          --card-border: rgba(255,255,255,0.1);
          --text: rgba(255,255,255,0.95);
          --text-secondary: rgba(255,255,255,0.6);
          --text-muted: rgba(255,255,255,0.3);
          --border: rgba(255,255,255,0.1);
          --input-bg: rgba(255,255,255,0.06);
          --input-border: rgba(255,255,255,0.12);
          --badge-bg: rgba(255,255,255,0.08);
          --btn-secondary-bg: rgba(255,255,255,0.1);
          --btn-secondary-hover: rgba(255,255,255,0.15);
          --btn-primary-bg: #fff;
          --btn-primary-text: #000;
          --success-color: #10b981;
          --error-color: #ef4444;
          --glow-color: rgba(255,255,255,0.1);
          --pro-color: #8b5cf6;
        }
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: overlayIn 0.25s ease-out;
          padding: 20px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .overlay.closing { animation: overlayOut 0.2s ease-in forwards; }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }

        .card {
          width: 100%;
          max-width: 460px;
          max-height: 90vh;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
          animation: cardIn 0.3s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          margin: auto;
        }
        .closing .card { animation: cardOut 0.2s ease-in forwards; }
        @keyframes cardIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }

        /* ═══════════════════════════════════════════════════════════════════════════════
           MOBILE LAYOUT — Full Screen Scrollable Card
           ═══════════════════════════════════════════════════════════════════════════════ */
        @media (max-width: 640px) {
          .overlay {
            padding: 0;
            align-items: flex-start;
            justify-content: flex-start;
          }
          .card {
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            max-height: none;
            border-radius: 0;
            margin: 0;
            animation: mobileCardIn 0.3s ease-out;
          }
          .closing .card { animation: mobileCardOut 0.25s ease-in forwards; }
          @keyframes mobileCardIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes mobileCardOut { from { opacity: 1; } to { opacity: 0; } }
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--card-bg);
        }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .icon-container { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--pro-color), #6366f1); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .header-text h2 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
        .header-text p { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .close-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: var(--btn-secondary-bg); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
        .close-btn:hover { background: var(--btn-secondary-hover); color: var(--text); }
        .close-btn:active { transform: scale(0.95); }
        .close-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .content::-webkit-scrollbar { width: 6px; }
        .content::-webkit-scrollbar-track { background: transparent; }
        .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        /* Mobile Specific Styles */
        @media (max-width: 640px) {
          .header {
            padding: 16px 20px;
            padding-top: calc(16px + env(safe-area-inset-top));
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .content {
            padding: 20px;
            padding-bottom: calc(40px + env(safe-area-inset-bottom));
            min-height: 0;
          }
          .header-text p { max-width: 160px; }
        }
        .analysis-section { padding: 16px; background: var(--badge-bg); border-radius: 12px; margin-bottom: 20px; }
        .analysis-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .badge { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; background: var(--card-bg); color: var(--text-secondary); border: 1px solid var(--border); }
        .badge.pro { background: linear-gradient(135deg, var(--pro-color), #6366f1); color: white; border: none; }
        .file-list { display: flex; flex-direction: column; gap: 6px; }
        .file-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); font-family: 'SF Mono', Monaco, monospace; }
        .file-item.more { color: var(--text-muted); font-style: italic; }
        .input-section { margin-bottom: 20px; }
        .input-section label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 8px; }
        .input-wrapper { display: flex; align-items: center; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 12px; overflow: hidden; transition: border-color 0.15s; }
        .input-wrapper:focus-within { border-color: var(--text-secondary); }
        .input-wrapper input { flex: 1; padding: 12px 14px; background: transparent; border: none; outline: none; font-size: 15px; color: var(--text); font-family: 'SF Mono', Monaco, monospace; }
        .input-wrapper input::placeholder { color: var(--text-muted); }
        .input-wrapper input:disabled { opacity: 0.5; }
        .input-suffix { padding: 12px 14px; font-size: 14px; color: var(--text-muted); background: var(--badge-bg); border-left: 1px solid var(--border); font-family: 'SF Mono', Monaco, monospace; }
        .existing-project { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; gap: 12px; }
        .existing-project-info { display: flex; align-items: center; gap: 12px; color: var(--success-color); flex: 1; min-width: 0; }
        .existing-project-info svg { flex-shrink: 0; }
        .existing-project-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .existing-url { font-size: 14px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .existing-label { font-size: 11px; color: var(--success-color); }
        .new-project-btn { padding: 8px 14px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .new-project-btn:hover { border-color: var(--text-secondary); color: var(--text); }
        /* Custom Domain Section */
        .domain-section { margin-bottom: 20px; }
        .domain-toggle { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s ease; color: var(--text-secondary); font-size: 13px; font-weight: 500; position: relative; }
        .domain-toggle:hover { border-color: var(--pro-color); background: rgba(139,92,246,0.05); }
        .domain-toggle.active { border-color: var(--pro-color); background: rgba(139,92,246,0.1); color: var(--text); }
        .toggle-indicator { width: 36px; height: 20px; background: var(--border); border-radius: 10px; position: relative; transition: all 0.2s ease; flex-shrink: 0; }
        .toggle-indicator::after { content: ''; position: absolute; width: 16px; height: 16px; background: var(--text-muted); border-radius: 50%; top: 2px; left: 2px; transition: all 0.2s ease; }
        .domain-toggle.active .toggle-indicator { background: var(--pro-color); }
        .domain-toggle.active .toggle-indicator::after { left: 18px; background: white; }
        .coming-soon { margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; padding: 3px 8px; background: linear-gradient(135deg, var(--pro-color), #6366f1); color: white; border-radius: 4px; }
        .custom-domain-input { margin-top: 12px; animation: slideDown 0.2s ease; max-height: 400px; overflow-y: auto; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .custom-domain-input { max-height: 300px; }
          .analysis-section { padding: 14px; margin-bottom: 16px; }
          .input-section { margin-bottom: 16px; }
          .domain-section { margin-bottom: 16px; }
          .info-section { margin-bottom: 20px; gap: 8px; }
          .selected-domain { flex-direction: column; align-items: flex-start; gap: 12px; }
          .change-domain-btn { width: 100%; }
        }
        .input-wrapper.domain { margin-bottom: 10px; }
        .dns-info { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; font-size: 11px; color: rgba(245,158,11,0.9); }
        .dns-info svg { flex-shrink: 0; margin-top: 1px; }
        .dns-info code { background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; }
        .dns-steps { display: flex; flex-direction: column; gap: 6px; }
        .dns-steps span { line-height: 1.4; }
        .dns-steps code { display: block; margin-top: 4px; font-size: 12px; }
        .selected-domain { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; }
        .selected-domain-info { display: flex; align-items: center; gap: 10px; color: var(--success-color); }
        .selected-domain-info svg { opacity: 0.8; }
        .domain-text { font-size: 14px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace; color: var(--text); }
        .domain-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; padding: 3px 8px; background: var(--success-color); color: white; border-radius: 4px; }
        .change-domain-btn { padding: 8px 14px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .change-domain-btn:hover { border-color: var(--text-secondary); color: var(--text); }
        .info-section { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .info-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
        .info-item svg { opacity: 0.5; }
        .info-item.highlight { color: var(--pro-color); }
        .info-item.highlight svg { opacity: 1; color: var(--pro-color); }
        .actions { display: flex; gap: 12px; }
        .btn { flex: 1; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn.secondary { background: var(--btn-secondary-bg); color: var(--text); }
        .btn.secondary:hover:not(:disabled) { background: var(--btn-secondary-hover); }
        .btn.primary { background: linear-gradient(135deg, var(--pro-color), #6366f1); color: white; }
        .btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.4); }
        .btn.primary:active:not(:disabled) { transform: scale(0.98); }

        @media (max-width: 640px) {
          .actions { padding-top: 8px; }
          .btn { padding: 16px 20px; border-radius: 14px; font-size: 15px; }
        }
        .deploying-container { display: flex; flex-direction: column; align-items: center; padding: 20px 0; min-height: 280px; justify-content: center; }
        .deploy-animation { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; }
        .orbit { position: absolute; border: 1px solid var(--border); border-radius: 50%; animation: orbitSpin 6s linear infinite; }
        .orbit-1 { width: 80px; height: 80px; animation-duration: 4s; }
        .orbit-2 { width: 110px; height: 110px; animation-duration: 6s; animation-direction: reverse; }
        .orbit-3 { width: 135px; height: 135px; animation-duration: 8s; opacity: 0.5; }
        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .orbit-dot { position: absolute; width: 6px; height: 6px; background: var(--pro-color); border-radius: 50%; top: -3px; left: calc(50% - 3px); box-shadow: 0 0 8px var(--pro-color); }
        .deploy-cube { position: relative; width: 30px; height: 30px; transform-style: preserve-3d; animation: cubeRotate 4s ease-in-out infinite; }
        @keyframes cubeRotate { 0%, 100% { transform: rotateX(-20deg) rotateY(0deg); } 50% { transform: rotateX(-20deg) rotateY(180deg); } }
        .cube-face { position: absolute; width: 30px; height: 30px; border: 1px solid var(--pro-color); background: rgba(139,92,246,0.1); }
        .front { transform: translateZ(15px); }
        .back { transform: translateZ(-15px) rotateY(180deg); }
        .left { transform: translateX(-15px) rotateY(-90deg); }
        .right { transform: translateX(15px) rotateY(90deg); }
        .top { transform: translateY(-15px) rotateX(90deg); }
        .bottom { transform: translateY(15px) rotateX(-90deg); }
        .pulse-ring { position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--pro-color); animation: pulseExpand 2.5s ease-out infinite; }
        .r2 { animation-delay: 0.8s; }
        .r3 { animation-delay: 1.6s; }
        @keyframes pulseExpand { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(3.5); opacity: 0; } }
        .progress-section { width: 100%; margin-bottom: 16px; }
        .progress-bar { position: relative; height: 4px; background: var(--badge-bg); border-radius: 2px; overflow: hidden; margin-bottom: 12px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--pro-color), #6366f1); border-radius: 2px; transition: width 0.3s ease; }
        .progress-info { display: flex; justify-content: space-between; align-items: center; }
        .progress-text { font-size: 13px; color: var(--text-secondary); }
        .progress-percent { font-size: 13px; font-weight: 600; color: var(--text); font-family: 'SF Mono', Monaco, monospace; }
        .success-container { display: flex; flex-direction: column; align-items: stretch; min-height: 280px; }
        .success-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .success-animation { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
        .success-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--success-color); animation: successRing 0.6s ease-out forwards; }
        @keyframes successRing { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        .success-check { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--success-color); border-radius: 50%; color: white; animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        .success-text h3 { font-size: 17px; font-weight: 600; color: var(--text); margin: 0 0 4px; }
        .success-text p { font-size: 13px; color: var(--text-secondary); margin: 0; }

        /* SEO Card Styles */
        .seo-card { background: var(--badge-bg); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; animation: fadeSlideIn 0.4s ease-out; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .seo-header { display: flex; align-items: center; gap: 16px; }
        .seo-score-circle { position: relative; width: 72px; height: 72px; flex-shrink: 0; }
        .seo-score-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
        .seo-ring-bg { fill: none; stroke: var(--border); stroke-width: 6; }
        .seo-ring-fill { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray 0.8s ease-out; }
        .seo-score-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .seo-score-number { font-size: 22px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace; line-height: 1; }
        .seo-score-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }
        .seo-info { flex: 1; min-width: 0; }
        .seo-grade-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .seo-grade-badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; color: #000; letter-spacing: 0.02em; }
        .seo-grade-text { font-size: 14px; font-weight: 500; color: var(--text); }
        .seo-stats { display: flex; flex-wrap: wrap; gap: 12px; }
        .seo-stat { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); }
        .seo-stat svg { opacity: 0.6; }
        .seo-stat.fixed { color: var(--pro-color); }
        .seo-stat.fixed svg { opacity: 1; }
        .seo-categories { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
        .seo-category { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; }
        .seo-category-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .seo-category-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease-out; }
        .seo-category-name { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
        .seo-category-score { font-size: 12px; font-weight: 600; color: var(--text); font-family: 'SF Mono', Monaco, monospace; min-width: 24px; text-align: right; }

        /* SEO Mini Card (During Deployment) */
        .seo-mini-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 24px; animation: seoMiniIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes seoMiniIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .seo-mini-score { font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace; }
        .seo-mini-info { display: flex; flex-direction: column; gap: 2px; }
        .seo-mini-grade { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; color: #000; display: inline-block; width: fit-content; }
        .seo-mini-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .seo-mini-fixes { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pro-color); margin-left: auto; padding-left: 12px; border-left: 1px solid var(--border); }
        .seo-mini-fixes svg { animation: starPulse 1.5s ease-in-out infinite; }
        @keyframes starPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } }
        .url-display { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: var(--text); width: 100%; margin-bottom: 24px; transition: all 0.15s; }
        .url-display:hover { border-color: var(--pro-color); transform: translateY(-1px); }
        .url-icon { color: var(--text-secondary); }
        .url-text { flex: 1; font-size: 14px; font-family: 'SF Mono', Monaco, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .url-arrow { color: var(--text-muted); transition: transform 0.15s; }
        .url-display:hover .url-arrow { transform: translate(2px, -2px); }
        .success-actions { display: flex; gap: 12px; width: 100%; }
        .error-container { display: flex; flex-direction: column; align-items: center; text-align: center; min-height: 280px; justify-content: center; }
        .error-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,0.1); display: flex; align-items: center; justify-content: center; color: var(--error-color); margin-bottom: 20px; }
        .error-container h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
        .error-message { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; max-width: 320px; line-height: 1.5; }
        .error-actions { display: flex; gap: 12px; width: 100%; }

        /* SEO Feature Badge (idle state) */
        .seo-feature-badge { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(34, 197, 94, 0.08) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 12px; margin-bottom: 16px; position: relative; overflow: hidden; }
        .seo-feature-badge::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.08), transparent); animation: seoShimmer 3s infinite; }
        @keyframes seoShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .seo-feature-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--pro-color) 0%, #22c55e 100%); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .seo-feature-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .seo-feature-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .seo-feature-desc { font-size: 11px; color: var(--text-secondary); }
        .seo-feature-new { position: absolute; top: 8px; right: 8px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 3px 6px; background: linear-gradient(135deg, var(--pro-color) 0%, #22c55e 100%); color: white; border-radius: 4px; }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

export default BuilderDeploymentCard;
