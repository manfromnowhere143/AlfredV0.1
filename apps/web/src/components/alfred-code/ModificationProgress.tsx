'use client';

/**
 * Modification Progress Component
 *
 * State-of-the-art real-time progress display during Alfred Code modifications.
 * Shows exactly what Alfred is doing - analyzing, scanning, modifying.
 *
 * Steve Jobs level: Every detail matters. Every animation is intentional.
 * Sam Altman level: AI that shows its thinking, builds trust.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProgressStep {
  id: string;
  type: 'analyze' | 'scan' | 'find' | 'modify' | 'create' | 'delete' | 'complete' | 'error';
  message: string;
  detail?: string;
  status: 'active' | 'done' | 'error';
  timestamp: number;
}

interface ModificationProgressProps {
  steps: ProgressStep[];
  isActive: boolean;
  projectName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS - Elegant, purposeful
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  analyze: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  scan: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  find: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  modify: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  create: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  delete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  complete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  spinner: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 019.5 13" strokeLinecap="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getStepIcon(type: ProgressStep['type'], status: ProgressStep['status']) {
  if (status === 'active') return Icons.spinner;
  if (status === 'error') return Icons.error;
  return Icons[type] || Icons.analyze;
}

function getStepColor(type: ProgressStep['type'], status: ProgressStep['status']) {
  if (status === 'error') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
  if (status === 'active') return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' };

  switch (type) {
    case 'analyze': return { bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8' };
    case 'scan': return { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8' };
    case 'find': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24' };
    case 'modify': return { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa' };
    case 'create': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80' };
    case 'delete': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171' };
    case 'complete': return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' };
    default: return { bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255, 255, 255, 0.6)' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ModificationProgress({
  steps,
  isActive,
  projectName,
}: ModificationProgressProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  if (steps.length === 0 && !isActive) return null;

  const completedSteps = steps.filter(s => s.status === 'done').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="modification-progress"
    >
      {/* Header */}
      <div className="progress-header">
        <div className="header-left">
          <div className={`status-orb ${isActive ? 'active' : 'done'}`}>
            <div className="orb-core" />
            {isActive && <div className="orb-ring" />}
          </div>
          <div className="header-text">
            <span className="header-title">
              {isActive ? 'Alfred is working...' : 'Changes ready'}
            </span>
            {projectName && (
              <span className="header-project">on {projectName}</span>
            )}
          </div>
        </div>
        {totalSteps > 0 && (
          <div className="header-progress">
            <span className="progress-text">{completedSteps}/{totalSteps}</span>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="progress-steps" ref={scrollRef}>
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => {
            const colors = getStepColor(step.type, step.status);
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 10 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.02,
                  height: { duration: 0.15 }
                }}
                className={`step-item ${step.status}`}
              >
                <div
                  className="step-icon"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {getStepIcon(step.type, step.status)}
                </div>
                <div className="step-content">
                  <span className="step-message">{step.message}</span>
                  {step.detail && (
                    <span className="step-detail">{step.detail}</span>
                  )}
                </div>
                {step.status === 'done' && (
                  <div className="step-check" style={{ color: colors.text }}>
                    {Icons.complete}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .modification-progress {
          background: linear-gradient(135deg, rgba(15, 15, 20, 0.98), rgba(20, 20, 28, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-orb {
          position: relative;
          width: 10px;
          height: 10px;
        }

        .orb-core {
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          background: #6366f1;
        }

        .status-orb.active .orb-core {
          animation: pulse-core 1.5s ease-in-out infinite;
        }

        .status-orb.done .orb-core {
          background: #22c55e;
        }

        .orb-ring {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 2px solid rgba(99, 102, 241, 0.4);
          animation: pulse-ring 1.5s ease-out infinite;
        }

        @keyframes pulse-core {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.9); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .header-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .header-project {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }

        .header-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-text {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .progress-bar {
          width: 60px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 2px;
        }

        .progress-steps {
          max-height: 200px;
          overflow-y: auto;
          padding: 8px 10px;
        }

        .progress-steps::-webkit-scrollbar {
          width: 4px;
        }

        .progress-steps::-webkit-scrollbar-track {
          background: transparent;
        }

        .progress-steps::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 6px;
          margin-bottom: 4px;
          transition: background 0.15s;
        }

        .step-item:last-child {
          margin-bottom: 0;
        }

        .step-item.active {
          background: rgba(99, 102, 241, 0.08);
        }

        .step-item.error {
          background: rgba(239, 68, 68, 0.08);
        }

        .step-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 3px;
        }

        .step-message {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.3;
        }

        .step-detail {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .step-check {
          padding-top: 5px;
          opacity: 0.7;
        }
      `}</style>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS STEP GENERATORS
// Helper functions to create consistent progress steps
// ═══════════════════════════════════════════════════════════════════════════════

let stepIdCounter = 0;

export function createProgressStep(
  type: ProgressStep['type'],
  message: string,
  detail?: string
): ProgressStep {
  return {
    id: `step-${Date.now()}-${++stepIdCounter}`,
    type,
    message,
    detail,
    status: 'active',
    timestamp: Date.now(),
  };
}

export function markStepDone(step: ProgressStep): ProgressStep {
  return { ...step, status: 'done' };
}

export function markStepError(step: ProgressStep): ProgressStep {
  return { ...step, status: 'error' };
}

// Pre-defined step creators for common operations
export const ProgressSteps = {
  analyzing: (request: string) =>
    createProgressStep('analyze', 'Analyzing your request', request.slice(0, 50) + (request.length > 50 ? '...' : '')),

  scanningProject: (fileCount: number) =>
    createProgressStep('scan', `Scanning project`, `${fileCount} files`),

  scanningFile: (fileName: string) =>
    createProgressStep('scan', `Reading ${fileName}`),

  foundLocations: (count: number) =>
    createProgressStep('find', `Found ${count} location${count !== 1 ? 's' : ''} to modify`),

  modifying: (fileName: string, description?: string) =>
    createProgressStep('modify', `Modifying ${fileName}`, description),

  applyingChange: (index: number, total: number, description: string) =>
    createProgressStep('modify', `Applying change ${index} of ${total}`, description),

  creating: (fileName: string) =>
    createProgressStep('create', `Creating ${fileName}`),

  deleting: (fileName: string) =>
    createProgressStep('delete', `Removing ${fileName}`),

  complete: (changesApplied: number) =>
    createProgressStep('complete', `Successfully applied ${changesApplied} change${changesApplied !== 1 ? 's' : ''}`),

  error: (message: string) =>
    createProgressStep('error', message),
};

export default ModificationProgress;
