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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
            } else if (event.type === 'complete' && event.result?.url) {
              setDeployedUrl(event.result.url);
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
                <div className="input-wrapper">
                  <input id="projectName" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-project" maxLength={50} />
                  <span className="input-suffix">.vercel.app</span>
                </div>
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
        .overlay { --bg: rgba(0,0,0,0.7); --card-bg: #0d0d0e; --card-border: rgba(255,255,255,0.08); --text: rgba(255,255,255,0.9); --text-secondary: rgba(255,255,255,0.5); --text-muted: rgba(255,255,255,0.25); --border: rgba(255,255,255,0.08); --input-bg: rgba(255,255,255,0.05); --input-border: rgba(255,255,255,0.1); --badge-bg: rgba(255,255,255,0.08); --btn-secondary-bg: rgba(255,255,255,0.08); --btn-secondary-hover: rgba(255,255,255,0.12); --btn-primary-bg: #fff; --btn-primary-text: #000; --success-color: #10b981; --error-color: #ef4444; --glow-color: rgba(255,255,255,0.1); --pro-color: #8b5cf6; }
        .overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: var(--bg); backdrop-filter: blur(8px); animation: overlayIn 0.25s ease-out; padding: 20px; }
        .overlay.closing { animation: overlayOut 0.2s ease-in forwards; }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }
        .card { width: 100%; max-width: 460px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: cardIn 0.3s cubic-bezier(0.16,1,0.3,1); overflow: hidden; }
        .closing .card { animation: cardOut 0.2s ease-in forwards; }
        @keyframes cardIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cardOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .icon-container { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--pro-color), #6366f1); display: flex; align-items: center; justify-content: center; color: white; }
        .header-text h2 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
        .header-text p { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .close-btn:hover { background: var(--btn-secondary-bg); color: var(--text); }
        .close-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .content { padding: 24px; }
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
        .input-suffix { padding: 12px 14px; font-size: 14px; color: var(--text-muted); background: var(--badge-bg); border-left: 1px solid var(--border); font-family: 'SF Mono', Monaco, monospace; }
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
        .custom-domain-input { margin-top: 12px; animation: slideDown 0.2s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
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
        .btn { flex: 1; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn.secondary { background: var(--btn-secondary-bg); color: var(--text); }
        .btn.secondary:hover:not(:disabled) { background: var(--btn-secondary-hover); }
        .btn.primary { background: linear-gradient(135deg, var(--pro-color), #6366f1); color: white; }
        .btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.4); }
        .deploying-container { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
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
        .success-container { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .success-animation { position: relative; width: 80px; height: 80px; margin-bottom: 24px; }
        .success-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--success-color); animation: successRing 0.6s ease-out forwards; }
        @keyframes successRing { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        .success-check { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--success-color); border-radius: 50%; color: white; animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes successPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        .success-container h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
        .success-container > p { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; }
        .url-display { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: var(--badge-bg); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: var(--text); width: 100%; margin-bottom: 24px; transition: all 0.15s; }
        .url-display:hover { border-color: var(--pro-color); transform: translateY(-1px); }
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
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

export default BuilderDeploymentCard;
