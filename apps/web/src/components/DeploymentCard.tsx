'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DeploymentCardProps {
  artifactId: string;
  artifactTitle: string;
  artifactCode: string;
  onClose: () => void;
  onDeployed?: (url: string) => void;
}

interface ValidationAnalysis {
  type: string;
  componentName: string;
  dependencies: string[];
  usesTailwind: boolean;
  usesTypeScript: boolean;
  usesHooks: boolean;
}

interface SEOAnalysisResult {
  score: number;
  grade: string;
  passedChecks: number;
  totalChecks: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  autoFixableCount: number;
  categoryScores: {
    technical: number;
    content: number;
    onPage: number;
    ux: number;
    schema: number;
  };
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

type DeploymentPhase = 'idle' | 'validating' | 'deploying' | 'success' | 'error';

export function DeploymentCard({
  artifactId,
  artifactTitle,
  artifactCode,
  onClose,
  onDeployed,
}: DeploymentCardProps) {
  const [projectName, setProjectName] = useState(() =>
    artifactTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'alfred-project'
  );
  const [phase, setPhase] = useState<DeploymentPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<ValidationAnalysis | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [autoFixAttempt, setAutoFixAttempt] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [seoResult, setSeoResult] = useState<SEOAnalysisResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme !== 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    validateArtifact();
  }, []);

  const validateArtifact = async () => {
    setPhase('validating');
    try {
      const response = await fetch('/api/deploy/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId, artifactCode, artifactTitle, projectName }),
      });
      const data = await response.json();
      if (data.analysis) setAnalysis(data.analysis);
      if (!data.service?.configured) {
        setError('Deployment service not configured');
        setPhase('error');
        return;
      }
      setPhase('idle');
    } catch (err) {
      console.error('Validation error:', err);
      setPhase('idle');
    }
  };

  const handleDeploy = useCallback(async () => {
    setPhase('deploying');
    setProgress(0);
    setError('');
    setStatusMessage('Initializing deployment...');
    setAutoFixAttempt(0);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId,
          artifactCode,
          artifactTitle,
          projectName: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          domainType: 'vercel',
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
              if (event.message?.includes('Auto-fix attempt')) {
                const match = event.message.match(/attempt (\d+)/);
                if (match) setAutoFixAttempt(parseInt(match[1]));
              }
            } else if (event.type === 'seo_analysis') {
              setSeoResult(event.seoAnalysis);
            } else if (event.type === 'complete' && event.result?.url) {
              setDeployedUrl(event.result.url);
              // Capture SEO from final result if not already set
              if (event.result.seoAnalysis && !seoResult) {
                setSeoResult(event.result.seoAnalysis);
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
  }, [artifactId, artifactCode, artifactTitle, projectName, onDeployed]);

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

  const content = (
    <div className={`overlay ${isClosing ? 'closing' : ''} ${isDark ? 'dark' : 'light'}`} onClick={(e) => e.target === e.currentTarget && phase !== 'deploying' && handleClose()}>
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
              <h2>Deploy to Web</h2>
              <p>{artifactTitle}</p>
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
              <div className="success-animation">
                <div className="success-ring" />
                <div className="success-check">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3>Deployed Successfully!</h3>
              <p>Your project is now live on the web</p>
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

              {/* SEO Score Card */}
              {seoResult && (
                <div className="seo-card">
                  <div className="seo-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <span>SEO Score</span>
                  </div>
                  <div className="seo-content">
                    <div className="seo-score-circle">
                      <svg viewBox="0 0 36 36">
                        <path
                          className="seo-circle-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="seo-circle-progress"
                          strokeDasharray={`${seoResult.score}, 100`}
                          style={{ stroke: getGradeColor(seoResult.grade) }}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="seo-score-value">
                        <span className="seo-score-number">{seoResult.score}</span>
                        <span className="seo-grade" style={{ color: getGradeColor(seoResult.grade) }}>{seoResult.grade}</span>
                      </div>
                    </div>
                    <div className="seo-details">
                      <div className="seo-stat">
                        <span className="seo-stat-label">Checks Passed</span>
                        <span className="seo-stat-value">{seoResult.passedChecks}/{seoResult.totalChecks}</span>
                      </div>
                      <div className="seo-categories">
                        {Object.entries(seoResult.categoryScores).map(([key, value]) => (
                          <div key={key} className="seo-category">
                            <span className="seo-cat-name">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                            <div className="seo-cat-bar">
                              <div className="seo-cat-fill" style={{ width: `${value}%`, background: getGradeColor(value >= 90 ? 'A' : value >= 75 ? 'B' : value >= 60 ? 'C' : 'F') }} />
                            </div>
                            <span className="seo-cat-value">{value}</span>
                          </div>
                        ))}
                      </div>
                      {(seoResult.warningCount > 0 || seoResult.infoCount > 0) && (
                        <div className="seo-issues-summary">
                          {seoResult.warningCount > 0 && (
                            <span className="seo-issue-badge warning">{seoResult.warningCount} warnings</span>
                          )}
                          {seoResult.infoCount > 0 && (
                            <span className="seo-issue-badge info">{seoResult.infoCount} suggestions</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
              <div className="progress-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="progress-info">
                  <span className="progress-text">{statusMessage || 'Preparing...'}</span>
                  <span className="progress-percent">{Math.round(progress)}%</span>
                </div>
              </div>
              {autoFixAttempt > 0 && (
                <div className="autofix-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Alfred is auto-fixing (attempt {autoFixAttempt}/3)
                </div>
              )}
              {seoResult && (
                <div className="seo-mini-card">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span>SEO Score: </span>
                  <span className="seo-mini-score" style={{ color: getGradeColor(seoResult.grade) }}>
                    {seoResult.score}/100 ({seoResult.grade})
                  </span>
                </div>
              )}
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
              {analysis && (
                <div className="analysis-section">
                  <div className="analysis-badges">
                    <span className="badge">{analysis.type.toUpperCase()}</span>
                    {analysis.usesTypeScript && <span className="badge">TypeScript</span>}
                    {analysis.usesTailwind && <span className="badge">Tailwind</span>}
                    {analysis.usesHooks && <span className="badge">Hooks</span>}
                  </div>
                  {analysis.dependencies.length > 0 && (
                    <div className="deps">
                      <span className="deps-label">Dependencies:</span>
                      <span className="deps-list">{analysis.dependencies.slice(0, 5).join(', ')}{analysis.dependencies.length > 5 ? ` +${analysis.dependencies.length - 5}` : ''}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="input-section">
                <label htmlFor="projectName">Project Name</label>
                <div className="input-wrapper">
                  <input id="projectName" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-project" maxLength={50} />
                  <span className="input-suffix">.vercel.app</span>
                </div>
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
                <span className="seo-feature-new">NEW</span>
              </div>
              <div className="info-section">
                <div className="info-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  <span>Instant deployment with Vercel</span>
                </div>
                <div className="info-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span>SSL certificate included</span>
                </div>
                <div className="info-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  <span>Alfred auto-fixes build errors</span>
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
        .overlay.light { --bg: rgba(0,0,0,0.4); --card-bg: #fff; --card-border: rgba(0,0,0,0.08); --text: rgba(0,0,0,0.85); --text-secondary: rgba(0,0,0,0.5); --text-muted: rgba(0,0,0,0.25); --border: rgba(0,0,0,0.08); --input-bg: rgba(0,0,0,0.03); --input-border: rgba(0,0,0,0.1); --badge-bg: rgba(0,0,0,0.05); --btn-secondary-bg: rgba(0,0,0,0.05); --btn-secondary-hover: rgba(0,0,0,0.08); --btn-primary-bg: #000; --btn-primary-text: #fff; --success-color: #10b981; --error-color: #ef4444; --glow-color: rgba(0,0,0,0.1); }
        .overlay.dark { --bg: rgba(0,0,0,0.7); --card-bg: #0d0d0e; --card-border: rgba(255,255,255,0.08); --text: rgba(255,255,255,0.9); --text-secondary: rgba(255,255,255,0.5); --text-muted: rgba(255,255,255,0.25); --border: rgba(255,255,255,0.08); --input-bg: rgba(255,255,255,0.05); --input-border: rgba(255,255,255,0.1); --badge-bg: rgba(255,255,255,0.08); --btn-secondary-bg: rgba(255,255,255,0.08); --btn-secondary-hover: rgba(255,255,255,0.12); --btn-primary-bg: #fff; --btn-primary-text: #000; --success-color: #10b981; --error-color: #ef4444; --glow-color: rgba(255,255,255,0.1); }
        .overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: var(--bg); backdrop-filter: blur(8px); animation: overlayIn 0.25s ease-out; padding: 20px; }
        .overlay.closing { animation: overlayOut 0.2s ease-in forwards; }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }
        .card { width: 100%; max-width: 440px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: cardIn 0.3s cubic-bezier(0.16,1,0.3,1); overflow: hidden; }
        .closing .card { animation: cardOut 0.2s ease-in forwards; }
        @keyframes cardIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .icon-container { width: 44px; height: 44px; border-radius: 12px; background: var(--badge-bg); display: flex; align-items: center; justify-content: center; color: var(--text); }
        .header-text h2 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
        .header-text p { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .close-btn:hover { background: var(--btn-secondary-bg); color: var(--text); }
        .close-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .content { padding: 24px; }
        .analysis-section { padding: 16px; background: var(--badge-bg); border-radius: 12px; margin-bottom: 20px; }
        .analysis-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .badge { font-size: 10px; font-weight: 600; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 6px; background: var(--card-bg); color: var(--text-secondary); border: 1px solid var(--border); }
        .deps { font-size: 12px; color: var(--text-secondary); }
        .deps-label { font-weight: 500; margin-right: 6px; }
        .deps-list { opacity: 0.8; }
        .input-section { margin-bottom: 20px; }
        .input-section label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 8px; }
        .input-wrapper { display: flex; align-items: center; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 12px; overflow: hidden; transition: border-color 0.15s; }
        .input-wrapper:focus-within { border-color: var(--text-secondary); }
        .input-wrapper input { flex: 1; padding: 12px 14px; background: transparent; border: none; outline: none; font-size: 15px; color: var(--text); font-family: 'SF Mono', Monaco, monospace; }
        .input-wrapper input::placeholder { color: var(--text-muted); }
        .input-suffix { padding: 12px 14px; font-size: 14px; color: var(--text-muted); background: var(--badge-bg); border-left: 1px solid var(--border); font-family: 'SF Mono', Monaco, monospace; }
        .info-section { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
        .info-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); }
        .info-item svg { opacity: 0.5; }
        .actions { display: flex; gap: 12px; }
        .btn { flex: 1; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn.secondary { background: var(--btn-secondary-bg); color: var(--text); }
        .btn.secondary:hover:not(:disabled) { background: var(--btn-secondary-hover); }
        .btn.primary { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
        .btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .deploying-container { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
        .deploy-animation { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; }
        .orbit { position: absolute; border: 1px solid var(--border); border-radius: 50%; animation: orbitSpin 6s linear infinite; }
        .orbit-1 { width: 80px; height: 80px; animation-duration: 4s; }
        .orbit-2 { width: 110px; height: 110px; animation-duration: 6s; animation-direction: reverse; }
        .orbit-3 { width: 135px; height: 135px; animation-duration: 8s; opacity: 0.5; }
        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .orbit-dot { position: absolute; width: 6px; height: 6px; background: var(--text-secondary); border-radius: 50%; top: -3px; left: calc(50% - 3px); box-shadow: 0 0 8px var(--glow-color); }
        .deploy-cube { position: relative; width: 30px; height: 30px; transform-style: preserve-3d; animation: cubeRotate 4s ease-in-out infinite; }
        @keyframes cubeRotate { 0%, 100% { transform: rotateX(-20deg) rotateY(0deg); } 50% { transform: rotateX(-20deg) rotateY(180deg); } }
        .cube-face { position: absolute; width: 30px; height: 30px; border: 1px solid var(--border); background: var(--badge-bg); }
        .front { transform: translateZ(15px); }
        .back { transform: translateZ(-15px) rotateY(180deg); }
        .left { transform: translateX(-15px) rotateY(-90deg); }
        .right { transform: translateX(15px) rotateY(90deg); }
        .top { transform: translateY(-15px) rotateX(90deg); }
        .bottom { transform: translateY(15px) rotateX(-90deg); }
        .pulse-ring { position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--text-muted); animation: pulseExpand 2.5s ease-out infinite; }
        .r2 { animation-delay: 0.8s; }
        .r3 { animation-delay: 1.6s; }
        @keyframes pulseExpand { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(3.5); opacity: 0; } }
        .progress-section { width: 100%; margin-bottom: 16px; }
        .progress-bar { position: relative; height: 4px; background: var(--badge-bg); border-radius: 2px; overflow: hidden; margin-bottom: 12px; }
        .progress-fill { height: 100%; background: var(--text); border-radius: 2px; transition: width 0.3s ease; }
        .progress-info { display: flex; justify-content: space-between; align-items: center; }
        .progress-text { font-size: 13px; color: var(--text-secondary); }
        .progress-percent { font-size: 13px; font-weight: 600; color: var(--text); font-family: 'SF Mono', Monaco, monospace; }
        .autofix-badge { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--badge-bg); border-radius: 20px; font-size: 12px; color: var(--text-secondary); animation: autoFixPulse 2s ease-in-out infinite; }
        @keyframes autoFixPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .success-container { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .success-animation { position: relative; width: 80px; height: 80px; margin-bottom: 24px; }
        .success-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--success-color); animation: successRing 0.6s ease-out forwards; }
        @keyframes successRing { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        .success-check { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--success-color); border-radius: 50%; color: white; animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        .success-container h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
        .success-container > p { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; }
        .url-display { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: var(--text); width: 100%; margin-bottom: 24px; transition: all 0.15s; }
        .url-display:hover { border-color: var(--text-secondary); transform: translateY(-1px); }
        .url-icon { color: var(--text-secondary); }
        .url-text { flex: 1; font-size: 14px; font-family: 'SF Mono', Monaco, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .url-arrow { color: var(--text-muted); transition: transform 0.15s; }
        .url-display:hover .url-arrow { transform: translate(2px, -2px); }
        .success-actions { display: flex; gap: 12px; width: 100%; }
        .error-container { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .error-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,0.1); display: flex; align-items: center; justify-content: center; color: var(--error-color); margin-bottom: 20px; }
        .error-container h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
        .error-message { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; max-width: 320px; line-height: 1.5; }
        .error-actions { display: flex; gap: 12px; width: 100%; }

        /* SEO Card Styles */
        .seo-card { width: 100%; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .seo-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
        .seo-content { display: flex; gap: 20px; }
        .seo-score-circle { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
        .seo-score-circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
        .seo-circle-bg { fill: none; stroke: var(--border); stroke-width: 2.5; }
        .seo-circle-progress { fill: none; stroke-width: 2.5; stroke-linecap: round; transition: stroke-dasharray 0.5s ease; }
        .seo-score-value { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .seo-score-number { font-size: 20px; font-weight: 700; color: var(--text); line-height: 1; }
        .seo-grade { font-size: 12px; font-weight: 600; margin-top: 2px; }
        .seo-details { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .seo-stat { display: flex; justify-content: space-between; align-items: center; }
        .seo-stat-label { font-size: 12px; color: var(--text-secondary); }
        .seo-stat-value { font-size: 12px; font-weight: 600; color: var(--text); font-family: 'SF Mono', Monaco, monospace; }
        .seo-categories { display: flex; flex-direction: column; gap: 6px; }
        .seo-category { display: flex; align-items: center; gap: 8px; }
        .seo-cat-name { font-size: 10px; color: var(--text-secondary); width: 50px; text-transform: capitalize; }
        .seo-cat-bar { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .seo-cat-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
        .seo-cat-value { font-size: 10px; font-weight: 600; color: var(--text-secondary); width: 20px; text-align: right; font-family: 'SF Mono', Monaco, monospace; }
        .seo-issues-summary { display: flex; gap: 8px; margin-top: 4px; }
        .seo-issue-badge { font-size: 10px; padding: 3px 8px; border-radius: 10px; }
        .seo-issue-badge.warning { background: rgba(234, 179, 8, 0.15); color: #eab308; }
        .seo-issue-badge.info { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .seo-mini-card { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--badge-bg); border-radius: 20px; font-size: 12px; color: var(--text-secondary); margin-top: 12px; }
        .seo-mini-score { font-weight: 600; font-family: 'SF Mono', Monaco, monospace; }

        /* SEO Feature Badge (idle state) */
        .seo-feature-badge { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; margin-bottom: 16px; position: relative; overflow: hidden; }
        .seo-feature-badge::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); animation: seoShimmer 3s infinite; }
        @keyframes seoShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .seo-feature-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .seo-feature-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .seo-feature-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .seo-feature-desc { font-size: 11px; color: var(--text-secondary); }
        .seo-feature-new { position: absolute; top: 8px; right: 8px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 3px 6px; background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%); color: white; border-radius: 4px; }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

export default DeploymentCard;
