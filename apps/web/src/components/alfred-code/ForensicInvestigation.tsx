'use client';

/**
 * Forensic Investigation Component
 *
 * Shows the forensic analysis BEFORE applying any changes.
 * This is what makes Alfred Code state-of-the-art - it THINKS before it ACTS!
 *
 * Flow:
 * 1. User requests a change
 * 2. Alfred investigates the codebase
 * 3. Shows findings, proposed changes, dependencies, risks
 * 4. User approves or cancels
 * 5. Only THEN are changes applied
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ModificationPlan, FileModification, FileChange } from '@/lib/alfred-code/modify-project';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForensicFinding {
  file: string;
  description: string;
  currentValue?: string;
  linesAffected?: number[];
}

export interface ForensicReport {
  projectName: string;
  totalFiles: number;
  totalLines: number;
  findings: ForensicFinding[];
  plan: ModificationPlan;
  confidence: number;
  risks: string[];
  dependencies: { file: string; importedBy: string[] }[];
}

interface ForensicInvestigationProps {
  report: ForensicReport;
  onApply: () => void;
  onCancel: () => void;
  isApplying: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  minus: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  plus: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  wrench: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  loader: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 019.5 13" strokeLinecap="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function Section({ title, expanded, onToggle, badge, children }: SectionProps) {
  return (
    <div className="section-container">
      <button className="section-header" onClick={onToggle}>
        <span className="section-title">{title}</span>
        <div className="section-right">
          {badge && <span className="section-badge">{badge}</span>}
          <span className={`section-chevron ${expanded ? 'expanded' : ''}`}>
            {Icons.chevronDown}
          </span>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="section-content"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .section-container {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
        }
        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .section-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        .section-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border-radius: 4px;
          font-weight: 500;
        }
        .section-chevron {
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s;
          display: flex;
        }
        .section-chevron.expanded {
          transform: rotate(180deg);
        }
        .section-content {
          padding: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ForensicInvestigation({
  report,
  onApply,
  onCancel,
  isApplying,
}: ForensicInvestigationProps) {
  const [expandedSections, setExpandedSections] = useState({
    findings: true,
    plan: true,
    dependencies: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const totalChanges = report.plan.modifications.reduce((acc, mod) => {
    return acc + (mod.changes?.length || 1);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="forensic-container"
    >
      {/* Header */}
      <div className="forensic-header">
        <div className="header-icon">
          {Icons.search}
        </div>
        <div className="header-info">
          <h3 className="header-title">Forensic Investigation</h3>
          <p className="header-subtitle">
            {report.projectName} &bull; {report.totalFiles} files &bull; {report.totalLines} lines
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="forensic-content">
        {/* Investigation Findings */}
        <Section
          title="Investigation Findings"
          expanded={expandedSections.findings}
          onToggle={() => toggleSection('findings')}
        >
          <div className="findings-list">
            {report.findings.map((finding, i) => (
              <div key={i} className="finding-item">
                <div className="finding-header">
                  <span className="finding-icon">{Icons.file}</span>
                  <span className="finding-file">{finding.file}</span>
                </div>
                <p className="finding-description">{finding.description}</p>
                {finding.currentValue && (
                  <p className="finding-value">
                    Current: <code>{finding.currentValue}</code>
                  </p>
                )}
                {finding.linesAffected && finding.linesAffected.length > 0 && (
                  <p className="finding-lines">
                    Lines: {finding.linesAffected.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Modification Plan */}
        <Section
          title="Proposed Changes"
          expanded={expandedSections.plan}
          onToggle={() => toggleSection('plan')}
          badge={`${totalChanges} changes`}
        >
          <div className="plan-list">
            {report.plan.modifications.map((mod, i) => (
              <div key={`${mod.path}-${i}`} className="plan-item">
                <div className="plan-header">
                  <span className="plan-label">
                    Change {i + 1} of {report.plan.modifications.length}
                  </span>
                  <span className="plan-file">{mod.path}</span>
                  <span className={`plan-action ${mod.action}`}>{mod.action}</span>
                </div>

                {/* Diff view for modifications */}
                {mod.action === 'modify' && mod.changes?.map((change, j) => (
                  <div key={j} className="change-diff">
                    <div className="diff-line removed">
                      <span className="diff-icon">{Icons.minus}</span>
                      <code>{truncate(change.search, 80)}</code>
                    </div>
                    <div className="diff-line added">
                      <span className="diff-icon">{Icons.plus}</span>
                      <code>{truncate(change.replace, 80)}</code>
                    </div>
                  </div>
                ))}

                {/* New content preview for create */}
                {mod.action === 'create' && mod.newContent && (
                  <div className="change-diff">
                    <div className="diff-line added">
                      <span className="diff-icon">{Icons.plus}</span>
                      <code>{truncate(mod.newContent, 150)}</code>
                    </div>
                  </div>
                )}

                <p className="plan-reason">{mod.reason}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Dependencies */}
        {report.dependencies.length > 0 && (
          <Section
            title="Dependency Analysis"
            expanded={expandedSections.dependencies}
            onToggle={() => toggleSection('dependencies')}
          >
            <div className="dependencies-list">
              {report.dependencies.map((dep, i) => (
                <div key={i} className="dependency-item">
                  <span className="dependency-icon">{Icons.link}</span>
                  <span className="dependency-file">{dep.file}</span>
                  <span className="dependency-arrow">imported by</span>
                  <span className="dependency-importers">{dep.importedBy.join(', ')}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Risks */}
        {report.risks.length > 0 && (
          <div className="risks-container">
            <div className="risks-header">
              <span className="risks-icon">{Icons.alert}</span>
              <span className="risks-title">Potential Risks</span>
            </div>
            <ul className="risks-list">
              {report.risks.map((risk, i) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="forensic-footer">
        {/* Confidence */}
        <div className="confidence-container">
          <span className="confidence-label">Confidence:</span>
          <div className="confidence-bar-wrapper">
            <div className="confidence-bar">
              <div
                className={`confidence-fill ${getConfidenceClass(report.confidence)}`}
                style={{ width: `${report.confidence}%` }}
              />
            </div>
            <span className={`confidence-value ${getConfidenceClass(report.confidence)}`}>
              {report.confidence}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="actions-container">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={isApplying}
          >
            Cancel
          </button>
          <button
            className="btn-apply"
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                {Icons.loader}
                Applying...
              </>
            ) : (
              <>
                {Icons.wrench}
                Apply {totalChanges} Changes
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .forensic-container {
          background: rgba(15, 15, 20, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .forensic-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }

        .header-info {
          flex: 1;
        }

        .header-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .header-subtitle {
          margin: 2px 0 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .forensic-content {
          padding: 12px 16px;
          max-height: 400px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .findings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .finding-item {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          padding: 10px;
        }

        .finding-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .finding-icon {
          color: rgba(255, 255, 255, 0.4);
          display: flex;
        }

        .finding-file {
          font-size: 11px;
          font-family: 'SF Mono', Monaco, monospace;
          color: #818cf8;
        }

        .finding-description {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
        }

        .finding-value {
          margin: 6px 0 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .finding-value code {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .finding-lines {
          margin: 4px 0 0;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }

        .plan-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .plan-item {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          padding: 10px;
        }

        .plan-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .plan-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }

        .plan-file {
          font-size: 10px;
          font-family: 'SF Mono', Monaco, monospace;
          color: rgba(255, 255, 255, 0.6);
        }

        .plan-action {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .plan-action.modify {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .plan-action.create {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .plan-action.delete {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .change-diff {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 11px;
          margin: 6px 0;
        }

        .diff-line {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 3px 6px;
          border-radius: 3px;
          overflow-x: auto;
        }

        .diff-line.removed {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }

        .diff-line.added {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
        }

        .diff-icon {
          flex-shrink: 0;
          display: flex;
          margin-top: 2px;
        }

        .diff-line code {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .plan-reason {
          margin: 8px 0 0;
          font-size: 11px;
          font-style: italic;
          color: rgba(255, 255, 255, 0.5);
        }

        .dependencies-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dependency-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          flex-wrap: wrap;
        }

        .dependency-icon {
          color: rgba(255, 255, 255, 0.4);
          display: flex;
        }

        .dependency-file {
          color: rgba(255, 255, 255, 0.7);
        }

        .dependency-arrow {
          color: rgba(255, 255, 255, 0.3);
        }

        .dependency-importers {
          color: rgba(255, 255, 255, 0.5);
        }

        .risks-container {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 8px;
          padding: 10px;
        }

        .risks-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .risks-icon {
          color: #f59e0b;
          display: flex;
        }

        .risks-title {
          font-size: 12px;
          font-weight: 600;
          color: #f59e0b;
        }

        .risks-list {
          margin: 0;
          padding: 0 0 0 16px;
          font-size: 11px;
          color: rgba(245, 158, 11, 0.8);
        }

        .risks-list li {
          margin: 4px 0;
        }

        .forensic-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .confidence-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .confidence-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .confidence-bar {
          width: 80px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .confidence-fill.high {
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }

        .confidence-fill.medium {
          background: linear-gradient(90deg, #eab308, #ca8a04);
        }

        .confidence-fill.low {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .confidence-value {
          font-size: 11px;
          font-weight: 600;
        }

        .confidence-value.high {
          color: #22c55e;
        }

        .confidence-value.medium {
          color: #eab308;
        }

        .confidence-value.low {
          color: #ef4444;
        }

        .actions-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-cancel {
          padding: 8px 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.15s;
        }

        .btn-cancel:hover:not(:disabled) {
          color: rgba(255, 255, 255, 0.9);
        }

        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-apply {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
        }

        .btn-apply:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-apply:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-apply:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function getConfidenceClass(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * Convert a ModificationPlan to a ForensicReport
 * This helper bridges the existing ModificationPlan type to the richer ForensicReport
 */
export function createForensicReport(
  plan: ModificationPlan,
  projectName: string,
  files: { path: string; content: string }[]
): ForensicReport {
  // Calculate total lines
  const totalLines = files.reduce((acc, f) => acc + f.content.split('\n').length, 0);

  // Generate findings from plan analysis and modifications
  const findings: ForensicFinding[] = plan.modifications.map(mod => {
    const file = files.find(f => f.path === mod.path);
    const currentValue = mod.changes?.[0]?.search?.slice(0, 50);

    return {
      file: mod.path,
      description: mod.reason,
      currentValue: currentValue ? currentValue : undefined,
      linesAffected: findLineNumbers(file?.content || '', mod.changes || []),
    };
  });

  // Calculate confidence as number (0-100)
  const confidenceMap = { high: 92, medium: 65, low: 35 };
  const confidence = confidenceMap[plan.confidence] || 65;

  // Analyze dependencies (simplified)
  const dependencies: { file: string; importedBy: string[] }[] = [];
  plan.modifications.forEach(mod => {
    const importedBy = findImporters(files, mod.path);
    if (importedBy.length > 0) {
      dependencies.push({ file: mod.path, importedBy });
    }
  });

  // Generate risks based on confidence and scope
  const risks: string[] = [];
  if (plan.confidence === 'low') {
    risks.push('Low confidence - review changes carefully');
  }
  if (plan.modifications.length > 3) {
    risks.push('Multiple files affected - verify all changes');
  }
  if (dependencies.length > 0) {
    risks.push('Modified files are imported elsewhere - check for breaking changes');
  }

  return {
    projectName,
    totalFiles: files.length,
    totalLines,
    findings,
    plan,
    confidence,
    risks,
    dependencies,
  };
}

function findLineNumbers(content: string, changes: FileChange[]): number[] {
  const lines: number[] = [];
  const contentLines = content.split('\n');

  changes.forEach(change => {
    const searchLines = change.search.split('\n');
    const firstLine = searchLines[0];

    contentLines.forEach((line, idx) => {
      if (line.includes(firstLine)) {
        lines.push(idx + 1);
      }
    });
  });

  return [...new Set(lines)].slice(0, 5); // Limit to 5 lines
}

function findImporters(files: { path: string; content: string }[], targetPath: string): string[] {
  const fileName = targetPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
  const importers: string[] = [];

  files.forEach(file => {
    if (file.path === targetPath) return;

    // Check for imports of this file
    const importPatterns = [
      new RegExp(`from\\s+['"]\\..*${fileName}['"]`),
      new RegExp(`import\\s+['"]\\..*${fileName}['"]`),
      new RegExp(`require\\(['"]\\..*${fileName}['"]\\)`),
    ];

    if (importPatterns.some(pattern => pattern.test(file.content))) {
      importers.push(file.path.split('/').pop() || file.path);
    }
  });

  return importers;
}

export default ForensicInvestigation;
