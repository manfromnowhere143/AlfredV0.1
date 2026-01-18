'use client';

/**
 * SEO Pre-Deploy Modal
 *
 * Appears before deployment to show SEO analysis and auto-fix options.
 * Uses styled-jsx to match the rest of the app.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  analyzeSEO,
  getAutoFixableIssues,
  calculatePotentialScore,
  getCategoryDisplayName,
  getGradeColor,
} from '@/lib/seo';
import type { SEOAnalysisResult, SEOIssue, SEOConfigInput, SEOGrade } from '@/lib/seo/types';

interface SEOPreDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (files: Array<{ path: string; content: string }>) => void;
  files: Array<{ path: string; content: string }>;
  projectName: string;
  deployUrl?: string;
  seoConfig?: SEOConfigInput;
}

function getGradeFromScore(score: number): SEOGrade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function SEOPreDeployModal({
  isOpen,
  onClose,
  onDeploy,
  files,
  projectName,
  deployUrl,
  seoConfig,
}: SEOPreDeployModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SEOAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [modifiedFiles, setModifiedFiles] = useState<Array<{ path: string; content: string }>>(files);
  const [showDetails, setShowDetails] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Track previous files signature to prevent unnecessary resets
  const prevFilesSignatureRef = useRef<string>('');

  // Create a stable signature for files to detect actual changes
  const getFilesSignature = useCallback((fileList: typeof files) => {
    return fileList.map(f => `${f.path}:${f.content.length}`).sort().join('|');
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Run analysis when modal opens
  useEffect(() => {
    if (isOpen && !result && !analyzing) {
      runAnalysis();
    }
  }, [isOpen]);

  // Reset only when files actually change (by content, not reference)
  useEffect(() => {
    const newSignature = getFilesSignature(files);
    if (prevFilesSignatureRef.current !== newSignature) {
      prevFilesSignatureRef.current = newSignature;
      setModifiedFiles(files);
      setResult(null);
      setAppliedFixes(new Set());
    }
  }, [files, getFilesSignature]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzeSEO(modifiedFiles, {
        projectName,
        deployUrl,
        seoConfig,
      });
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoFixAll = async () => {
    if (!result) return;

    setApplying(true);

    try {
      const autoFixableIssues = getAutoFixableIssues(result);
      let updatedFiles = [...modifiedFiles];
      const newAppliedFixes = new Set(appliedFixes);

      for (const issue of autoFixableIssues) {
        if (issue.autoFix && !appliedFixes.has(issue.ruleId)) {
          const fix = issue.autoFix;

          const fileIndex = updatedFiles.findIndex(f => f.path === fix.filePath || f.path === `/${fix.filePath}`);
          if (fileIndex === -1) continue;

          let content = updatedFiles[fileIndex].content;

          switch (fix.type) {
            case 'replace':
              if (fix.oldValue) {
                content = content.replace(fix.oldValue, fix.newValue);
              }
              break;
            case 'insert':
              if (fix.target === 'head') {
                const headMatch = content.match(/<head[^>]*>/i);
                if (headMatch) {
                  const insertPos = content.indexOf(headMatch[0]) + headMatch[0].length;
                  content = content.slice(0, insertPos) + '\n    ' + fix.newValue + content.slice(insertPos);
                }
              }
              break;
            case 'attribute':
              if (fix.target) {
                const tagRegex = new RegExp(`<${fix.target}([^>]*)>`, 'i');
                content = content.replace(tagRegex, `<${fix.target}$1 ${fix.newValue}>`);
              }
              break;
          }

          updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content };
          newAppliedFixes.add(issue.ruleId);
        }
      }

      setModifiedFiles(updatedFiles);
      setAppliedFixes(newAppliedFixes);

      const newResult = await analyzeSEO(updatedFiles, {
        projectName,
        deployUrl,
        seoConfig,
      });
      setResult(newResult);
    } catch (err) {
      console.error('[SEO] Auto-fix error:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleDeploy = () => {
    onDeploy(modifiedFiles);
    handleClose();
  };

  if (!isOpen || !mounted) return null;

  const autoFixableCount = result ? getAutoFixableIssues(result).filter(i => !appliedFixes.has(i.ruleId)).length : 0;
  const potentialScore = result ? calculatePotentialScore(result) : 0;
  const hasAppliedFixes = appliedFixes.size > 0;

  const content = (
    <div className={`seo-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="seo-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>SEO Analysis</span>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {analyzing ? (
            <div className="loading-state">
              <div className="spinner" />
              <p className="loading-text">Analyzing SEO...</p>
              <p className="loading-sub">Running 54 checks across 5 categories</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <p className="error-title">Analysis Failed</p>
              <p className="error-message">{error}</p>
              <button className="retry-btn" onClick={runAnalysis}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Retry
              </button>
            </div>
          ) : result ? (
            <div className="result-content">
              {/* Score Section */}
              <div className="score-section">
                <div className="score-circle" style={{ '--grade-color': getGradeColor(result.grade) } as React.CSSProperties}>
                  <svg className="score-ring" viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="42" />
                    <circle
                      className="ring-fill"
                      cx="50"
                      cy="50"
                      r="42"
                      style={{
                        strokeDasharray: `${(result.score / 100) * 264} 264`,
                        stroke: getGradeColor(result.grade)
                      }}
                    />
                  </svg>
                  <div className="score-content">
                    <span className="score-number" style={{ color: getGradeColor(result.grade) }}>{result.score}</span>
                    <span className="score-grade" style={{ background: getGradeColor(result.grade) }}>{result.grade}</span>
                  </div>
                </div>

                <div className="score-info">
                  <p className="score-desc">
                    {result.score >= 90 ? 'Excellent SEO' : result.score >= 75 ? 'Good SEO - Some issues to address' : result.score >= 60 ? 'Fair SEO - Improvements needed' : 'Needs Work - Multiple issues'}
                  </p>

                  {/* Category Scores */}
                  <div className="category-scores">
                    {Object.entries(result.categoryScores).map(([category, score]) => (
                      <div key={category} className="category-item">
                        <div
                          className="category-score"
                          style={{
                            background: `${getGradeColor(getGradeFromScore(score))}20`,
                            color: getGradeColor(getGradeFromScore(score)),
                          }}
                        >
                          {score}
                        </div>
                        <span className="category-name">{getCategoryDisplayName(category).split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="stats-row">
                    <div className="stat passed">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <span>{result.passedChecks} passed</span>
                    </div>
                    {result.criticalCount > 0 && (
                      <div className="stat critical">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>{result.criticalCount} critical</span>
                      </div>
                    )}
                    {result.warningCount > 0 && (
                      <div className="stat warning">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>{result.warningCount} warnings</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auto-fix Banner */}
              {autoFixableCount > 0 && (
                <div className="autofix-banner">
                  <div className="autofix-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
                    </svg>
                    <span>
                      {autoFixableCount} issues can be auto-fixed
                      {potentialScore > result.score && (
                        <strong> (+{potentialScore - result.score} points)</strong>
                      )}
                    </span>
                  </div>
                  <button className="fix-btn" onClick={handleAutoFixAll} disabled={applying}>
                    {applying ? (
                      <div className="btn-spinner" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5" />
                      </svg>
                    )}
                    Fix All
                  </button>
                </div>
              )}

              {hasAppliedFixes && (
                <div className="fixes-applied">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>{appliedFixes.size} fixes applied</span>
                </div>
              )}

              {/* Details Toggle */}
              <button className="details-toggle" onClick={() => setShowDetails(!showDetails)}>
                <span>{showDetails ? 'Hide' : 'Show'} Details ({result.issues.length} issues)</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showDetails ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
                </svg>
              </button>

              {/* Issues List */}
              {showDetails && (
                <div className="issues-list">
                  {result.issues.filter(i => !appliedFixes.has(i.ruleId)).slice(0, 10).map((issue, idx) => (
                    <div key={idx} className={`issue-item ${issue.severity}`}>
                      <div className="issue-severity" />
                      <div className="issue-content">
                        <p className="issue-title">{issue.message}</p>
                        {issue.description && <p className="issue-details">{issue.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {result && (
          <div className="modal-footer">
            <p className="footer-hint">
              {result.score >= 75
                ? 'Good to deploy!'
                : result.score >= 50
                  ? 'Consider fixing critical issues'
                  : 'Many issues found'}
            </p>
            <div className="footer-actions">
              <button className="btn secondary" onClick={handleClose}>Cancel</button>
              <button className="btn primary" onClick={handleDeploy}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                  <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
                </svg>
                Deploy
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .seo-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .seo-modal-overlay.closing { animation: fadeOut 0.2s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

        .seo-modal {
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          background: #0f0f10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .closing .seo-modal { animation: modalOut 0.2s ease forwards; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalOut { from { opacity: 1; } to { opacity: 0; transform: scale(0.95); } }

        .modal-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }
        .header-title svg { color: #22c55e; }
        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .close-btn:hover { background: rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.8); }

        .modal-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px;
        }

        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #22c55e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500; margin-bottom: 4px; }
        .loading-sub { color: rgba(255, 255, 255, 0.5); font-size: 12px; }

        .error-state svg { color: #ef4444; margin-bottom: 12px; }
        .error-title { color: #ef4444; font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .error-message { color: rgba(255, 255, 255, 0.5); font-size: 13px; margin-bottom: 16px; }
        .retry-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .retry-btn:hover { background: rgba(255, 255, 255, 0.12); }

        .result-content { display: flex; flex-direction: column; gap: 16px; }

        .score-section {
          display: flex;
          gap: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .score-circle {
          position: relative;
          width: 100px;
          height: 100px;
          flex-shrink: 0;
        }
        .score-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
        .ring-bg { fill: none; stroke: rgba(255, 255, 255, 0.1); stroke-width: 6; }
        .ring-fill { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dasharray 0.8s ease; }
        .score-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .score-number { font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, monospace; line-height: 1; }
        .score-grade { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; color: #000; margin-top: 4px; }

        .score-info { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .score-desc { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9); margin: 0; }

        .category-scores { display: flex; gap: 8px; flex-wrap: wrap; }
        .category-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .category-score {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }
        .category-name { font-size: 9px; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.05em; }

        .stats-row { display: flex; flex-wrap: wrap; gap: 12px; }
        .stat { display: flex; align-items: center; gap: 5px; font-size: 12px; }
        .stat.passed { color: #22c55e; }
        .stat.critical { color: #ef4444; }
        .stat.warning { color: #f59e0b; }

        .autofix-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.06));
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 10px;
        }
        .autofix-info { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #60a5fa; }
        .autofix-info strong { color: #93c5fd; }
        .fix-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .fix-btn:hover { background: #2563eb; }
        .fix-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }

        .fixes-applied {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #22c55e;
        }

        .details-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .details-toggle:hover { background: rgba(255, 255, 255, 0.06); }
        .details-toggle svg { color: rgba(255, 255, 255, 0.5); }

        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .issue-item {
          display: flex;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          border-left: 3px solid;
        }
        .issue-item.critical { border-left-color: #ef4444; }
        .issue-item.warning { border-left-color: #f59e0b; }
        .issue-item.info { border-left-color: #3b82f6; }
        .issue-content { flex: 1; min-width: 0; }
        .issue-title { font-size: 12px; color: rgba(255, 255, 255, 0.85); margin: 0; }
        .issue-details { font-size: 11px; color: rgba(255, 255, 255, 0.5); margin: 4px 0 0; }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }
        .footer-hint { font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 0; }
        .footer-actions { display: flex; gap: 10px; }
        .btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn.secondary { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.9); }
        .btn.secondary:hover { background: rgba(255, 255, 255, 0.12); }
        .btn.primary { background: #22c55e; color: white; }
        .btn.primary:hover { background: #16a34a; }

        /* Mobile-first optimizations */
        @media (max-width: 480px) {
          .seo-modal-overlay {
            padding: 0;
            align-items: flex-end;
            overflow: hidden;
          }
          .seo-modal {
            max-height: 92vh;
            min-height: 60vh;
            border-radius: 20px 20px 0 0;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
          }
          @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
          .closing .seo-modal { animation: slideDown 0.2s ease forwards; }
          @keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100%); } }

          .modal-header {
            padding: 24px 16px 16px;
            flex-shrink: 0;
          }
          .modal-header::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 5px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 3px;
          }

          .modal-content {
            flex: 1;
            min-height: 0;
            padding: 16px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }

          .result-content {
            padding-bottom: 20px;
          }

          .score-section { flex-direction: column; gap: 16px; }
          .score-circle { width: 90px; height: 90px; align-self: center; }
          .score-number { font-size: 24px; }
          .score-info { align-items: center; text-align: center; }

          .category-scores { justify-content: center; gap: 6px; flex-wrap: wrap; }
          .category-item { min-width: 50px; }
          .category-score { width: 32px; height: 32px; font-size: 11px; }
          .category-name { font-size: 8px; }

          .stats-row { justify-content: center; flex-wrap: wrap; }
          .autofix-banner { flex-direction: column; gap: 12px; text-align: center; }
          .autofix-info { flex-direction: column; gap: 6px; }
          .fix-btn { width: 100%; justify-content: center; padding: 12px; }

          .issues-list {
            max-height: none;
            overflow: visible;
          }

          .modal-footer {
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            flex-shrink: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: #0f0f10;
          }
          .footer-hint { text-align: center; }
          .footer-actions { width: 100%; display: flex; gap: 10px; }
          .btn { flex: 1; justify-content: center; padding: 14px 16px; font-size: 14px; }
        }

        /* Extra small devices */
        @media (max-width: 360px) {
          .score-circle { width: 80px; height: 80px; }
          .score-number { font-size: 20px; }
          .category-score { width: 28px; height: 28px; font-size: 10px; }
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

export default SEOPreDeployModal;
