'use client';

/**
 * SEO Dashboard - Compact Single-Page Design
 * State of the Art - Everything visible at once
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wand2,
  FileText,
  Globe,
  Settings,
  Eye,
  Share2,
  Zap,
  Info,
} from 'lucide-react';
import type { SEOAnalysisResult, SEOCategory, SEOIssue } from '@/lib/seo/types';

interface Project {
  id: string;
  name: string;
  primaryDomain?: string;
}

export default function SEODashboardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [project, setProject] = useState<Project | null>(null);
  const [seoResult, setSeoResult] = useState<SEOAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const urlTheme = searchParams.get('theme');
    if (urlTheme === 'dark' || urlTheme === 'light') {
      setTheme(urlTheme);
    } else {
      const savedTheme = localStorage.getItem('alfred-theme');
      if (savedTheme === 'dark') setTheme('dark');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (!projectRes.ok) {
        setError('Project not found');
        setLoading(false);
        return;
      }
      const projectData = await projectRes.json();
      setProject(projectData.project);

      // Fetch SEO analysis
      const seoRes = await fetch(`/api/seo/analyze?projectId=${projectId}`);
      const seoData = await seoRes.json();

      console.log('[SEO Dashboard] Fetch result:', seoData);

      if (seoData.success && seoData.result) {
        setSeoResult(seoData.result);
      } else if (seoData.message) {
        setMessage(seoData.message);
      } else if (seoData.error) {
        setError(seoData.error);
      }
    } catch (err) {
      console.error('[SEO Dashboard] Error:', err);
      setError('Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      setMessage(null);

      const res = await fetch(`/api/seo/analyze?projectId=${projectId}`);
      const data = await res.json();

      console.log('[SEO Dashboard] Analysis result:', data);

      if (data.success && data.result) {
        setSeoResult(data.result);
        setMessage(null);
      } else if (data.message) {
        setMessage(data.message);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('[SEO Dashboard] Analysis error:', err);
      setError('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => router.push(`/builder?project=${projectId}`);

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': case 'A': return '#22c55e';
      case 'B': return '#84cc16';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Category icons
  const categoryIcons: Record<SEOCategory, React.ReactNode> = {
    technical: <Settings size={14} />,
    content: <FileText size={14} />,
    on_page: <Globe size={14} />,
    ux: <Eye size={14} />,
    schema: <Share2 size={14} />,
  };

  const categoryNames: Record<SEOCategory, string> = {
    technical: 'Technical',
    content: 'Content',
    on_page: 'On-Page',
    ux: 'UX',
    schema: 'Schema',
  };

  if (loading) {
    return (
      <div className={`page ${theme}-theme loading-page`}>
        <div className="loading-spinner">
          <RefreshCw size={24} className="spinning" />
          <span>Loading SEO Dashboard...</span>
        </div>
        <style jsx>{`
          .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .page.light-theme { background: #fafafa; color: #171717; }
          .page.dark-theme { background: #0a0a0a; color: #fafafa; }
          .loading-spinner { display: flex; flex-direction: column; align-items: center; gap: 16px; }
          .loading-spinner :global(.spinning) { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`page ${theme}-theme`}>
      {/* Compact Header */}
      <header className="header">
        <button className="back-btn" onClick={handleBack}>
          <ArrowLeft size={16} />
          <span>Back to Builder</span>
        </button>
        <h1 className="title">SEO Dashboard</h1>
        <span className="project-name">{project?.name || 'Project'}</span>
        <button
          className="analyze-btn"
          onClick={runAnalysis}
          disabled={analyzing}
        >
          <RefreshCw size={14} className={analyzing ? 'spinning' : ''} />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Error or Message State */}
        {(error || message) && !seoResult && (
          <div className="message-box">
            <Info size={20} />
            <div>
              <strong>{error ? 'Error' : 'Info'}</strong>
              <p>{error || message}</p>
              {message && (
                <span className="hint">Deploy your project first, then run SEO analysis.</span>
              )}
            </div>
          </div>
        )}

        {/* Score Section */}
        <section className="score-section">
          <div className="score-ring">
            <svg viewBox="0 0 100 100" className="score-svg">
              <circle cx="50" cy="50" r="45" className="ring-bg" />
              <circle
                cx="50" cy="50" r="45"
                className="ring-progress"
                style={{
                  strokeDasharray: `${(seoResult?.score || 0) * 2.83} 283`,
                  stroke: seoResult ? getGradeColor(seoResult.grade) : '#e5e5e5'
                }}
              />
            </svg>
            <div className="score-content">
              <span className="score-number" style={{ color: seoResult ? getGradeColor(seoResult.grade) : 'inherit' }}>
                {seoResult?.score ?? '--'}
              </span>
              <span className="score-grade">{seoResult?.grade || '-'}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="stat-item passed">
              <CheckCircle size={16} />
              <span className="stat-value">{seoResult?.passedChecks ?? 0}</span>
              <span className="stat-label">Passed</span>
            </div>
            <div className="stat-item critical">
              <AlertCircle size={16} />
              <span className="stat-value">{seoResult?.criticalCount ?? 0}</span>
              <span className="stat-label">Critical</span>
            </div>
            <div className="stat-item warning">
              <AlertCircle size={16} />
              <span className="stat-value">{seoResult?.warningCount ?? 0}</span>
              <span className="stat-label">Warnings</span>
            </div>
            <div className="stat-item fixable">
              <Wand2 size={16} />
              <span className="stat-value">{seoResult?.issues?.filter(i => i.isAutoFixable).length ?? 0}</span>
              <span className="stat-label">Auto-fix</span>
            </div>
          </div>
        </section>

        {/* Category Scores */}
        <section className="categories-section">
          <h2>Category Scores</h2>
          <div className="categories-grid">
            {seoResult?.categoryScores ? (
              Object.entries(seoResult.categoryScores).map(([cat, score]) => (
                <div key={cat} className="category-item">
                  <div className="cat-icon">{categoryIcons[cat as SEOCategory]}</div>
                  <div className="cat-info">
                    <span className="cat-name">{categoryNames[cat as SEOCategory]}</span>
                    <div className="cat-bar">
                      <div
                        className="cat-fill"
                        style={{
                          width: `${score}%`,
                          background: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                  <span className="cat-score">{score}%</span>
                </div>
              ))
            ) : (
              <div className="empty-categories">
                <span>Run analysis to see category scores</span>
              </div>
            )}
          </div>
        </section>

        {/* Top Issues */}
        <section className="issues-section">
          <h2>
            Top Issues
            {seoResult?.issues && <span className="issue-count">{seoResult.issues.length}</span>}
          </h2>
          <div className="issues-list">
            {seoResult?.issues && seoResult.issues.length > 0 ? (
              seoResult.issues
                .sort((a, b) => {
                  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };
                  return (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
                })
                .slice(0, 6)
                .map((issue, i) => (
                  <div key={i} className={`issue-item ${issue.severity}`}>
                    <div className="issue-dot" />
                    <span className="issue-msg">{issue.message}</span>
                    <span className="issue-cat">{categoryNames[issue.category]}</span>
                    {issue.isAutoFixable && (
                      <span className="issue-fix">
                        <Wand2 size={12} />
                      </span>
                    )}
                  </div>
                ))
            ) : (
              <div className="no-issues">
                {seoResult ? (
                  <>
                    <CheckCircle size={24} />
                    <span>No issues found - Great job!</span>
                  </>
                ) : (
                  <>
                    <Zap size={24} />
                    <span>Run analysis to check for issues</span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        /* Theme Variables */
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        }
        .page.light-theme {
          --bg: #fafafa;
          --surface: #ffffff;
          --border: #e5e5e5;
          --text: #171717;
          --text-secondary: #525252;
          --text-muted: #a3a3a3;
          background: var(--bg);
          color: var(--text);
        }
        .page.dark-theme {
          --bg: #0a0a0a;
          --surface: #171717;
          --border: #262626;
          --text: #fafafa;
          --text-secondary: #a3a3a3;
          --text-muted: #737373;
          background: var(--bg);
          color: var(--text);
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .back-btn:hover {
          background: var(--bg);
          color: var(--text);
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        .project-name {
          flex: 1;
          font-size: 13px;
          color: var(--text-muted);
        }
        .analyze-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }
        .analyze-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .analyze-btn :global(.spinning) {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Main */
        .main {
          flex: 1;
          padding: 24px;
          display: grid;
          grid-template-columns: 280px 1fr 1fr;
          gap: 20px;
          max-height: calc(100vh - 60px);
          overflow: hidden;
        }

        /* Message Box */
        .message-box {
          grid-column: 1 / -1;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          color: #3b82f6;
        }
        .message-box strong {
          display: block;
          font-size: 14px;
          color: var(--text);
        }
        .message-box p {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .message-box .hint {
          display: block;
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Score Section */
        .score-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
        }
        .score-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }
        .score-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .ring-bg {
          fill: none;
          stroke: var(--border);
          stroke-width: 8;
        }
        .ring-progress {
          fill: none;
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dasharray 0.5s ease;
        }
        .score-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .score-number {
          font-size: 36px;
          font-weight: 700;
          line-height: 1;
        }
        .score-grade {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 4px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: var(--bg);
          border-radius: 10px;
        }
        .stat-item.passed { color: #22c55e; }
        .stat-item.critical { color: #ef4444; }
        .stat-item.warning { color: #f59e0b; }
        .stat-item.fixable { color: #3b82f6; }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Categories Section */
        .categories-section {
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .categories-section h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px;
          color: var(--text);
        }
        .categories-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .category-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cat-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          border-radius: 6px;
          color: var(--text-muted);
        }
        .cat-info {
          flex: 1;
        }
        .cat-name {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .cat-bar {
          height: 6px;
          background: var(--bg);
          border-radius: 3px;
          overflow: hidden;
        }
        .cat-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .cat-score {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          min-width: 40px;
          text-align: right;
        }
        .empty-categories {
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        /* Issues Section */
        .issues-section {
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .issues-section h2 {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .issue-count {
          padding: 2px 8px;
          background: var(--bg);
          border-radius: 10px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .issues-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }
        .issue-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--bg);
          border-radius: 8px;
          font-size: 12px;
        }
        .issue-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .issue-item.critical .issue-dot { background: #ef4444; }
        .issue-item.warning .issue-dot { background: #f59e0b; }
        .issue-item.info .issue-dot { background: #3b82f6; }
        .issue-msg {
          flex: 1;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .issue-cat {
          font-size: 10px;
          padding: 2px 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text-muted);
        }
        .issue-fix {
          color: #3b82f6;
        }
        .no-issues {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
        }
        .no-issues :global(svg) {
          opacity: 0.5;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .main {
            grid-template-columns: 1fr 1fr;
          }
          .score-section {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: space-around;
          }
        }
        @media (max-width: 768px) {
          .main {
            grid-template-columns: 1fr;
            max-height: none;
            overflow: auto;
          }
          .score-section {
            flex-direction: column;
          }
          .header {
            flex-wrap: wrap;
          }
          .project-name {
            order: 3;
            flex-basis: 100%;
          }
        }
      `}</style>
    </div>
  );
}
