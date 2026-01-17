'use client';

/**
 * Modification Progress Component - State of the Art
 *
 * Premium real-time progress display during Alfred Code modifications.
 * OpenAI/Anthropic engineer level: Every detail is intentional.
 *
 * Features:
 * - Glassmorphism with floating appearance
 * - Real-time step animations with stagger
 * - Premium typography with tracking
 * - Sophisticated micro-interactions
 */

import React, { useEffect, useRef } from 'react';
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
// ICONS - Refined, minimal
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  analyze: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  scan: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  find: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  modify: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  create: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  delete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  complete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES - Premium glassmorphism
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  container: {
    position: 'relative' as const,
    background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95), rgba(10, 10, 18, 0.98))',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.05) inset,
      0 20px 50px -10px rgba(0, 0, 0, 0.5),
      0 0 80px -20px rgba(99, 102, 241, 0.15)
    `,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute' as const,
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
    pointerEvents: 'none' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  orb: {
    position: 'relative' as const,
    width: '12px',
    height: '12px',
  },
  orbCore: {
    position: 'absolute' as const,
    inset: '2px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  orbRing: {
    position: 'absolute' as const,
    inset: '-3px',
    borderRadius: '50%',
    border: '2px solid rgba(99, 102, 241, 0.4)',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  project: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    margin: 0,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressText: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: '"SF Mono", "Fira Code", Monaco, monospace',
    letterSpacing: '0.05em',
  },
  progressBar: {
    width: '80px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
    borderRadius: '2px',
    boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
  },
  stepsContainer: {
    maxHeight: '220px',
    overflowY: 'auto' as const,
    padding: '12px 14px',
    scrollbarWidth: 'thin' as const,
    scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    marginBottom: '6px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid transparent',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  stepActive: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    boxShadow: '0 4px 20px -4px rgba(99, 102, 241, 0.2)',
  },
  stepDone: {
    opacity: 0.7,
  },
  stepError: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  stepIcon: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
    paddingTop: '4px',
  },
  stepMessage: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: '-0.005em',
    lineHeight: 1.4,
    margin: 0,
  },
  stepDetail: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: '"SF Mono", "Fira Code", Monaco, monospace',
    letterSpacing: '0.02em',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  stepCheck: {
    paddingTop: '6px',
    opacity: 0.8,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(99, 102, 241, 0.3)',
    borderTopColor: '#818cf8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getStepColors(type: ProgressStep['type'], status: ProgressStep['status']) {
  if (status === 'error') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
  if (status === 'active') return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' };

  const colors: Record<string, { bg: string; text: string }> = {
    analyze: { bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8' },
    scan: { bg: 'rgba(14, 165, 233, 0.1)', text: '#38bdf8' },
    find: { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24' },
    modify: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a78bfa' },
    create: { bg: 'rgba(34, 197, 94, 0.1)', text: '#4ade80' },
    delete: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171' },
    complete: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  };

  return colors[type] || { bg: 'rgba(255, 255, 255, 0.05)', text: 'rgba(255, 255, 255, 0.6)' };
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

  // Auto-scroll to bottom
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={styles.container}
    >
      {/* Ambient glow */}
      <div style={styles.glow} />

      {/* Keyframes for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse-core {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.85); }
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
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.orb}>
            <motion.div
              style={{
                ...styles.orbCore,
                background: isActive
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'linear-gradient(135deg, #22c55e, #10b981)',
              }}
              animate={isActive ? {
                scale: [1, 0.85, 1],
                opacity: [1, 0.7, 1],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            {isActive && (
              <motion.div
                style={styles.orbRing}
                animate={{
                  scale: [1, 2.5],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            )}
          </div>
          <div style={styles.headerText}>
            <p style={styles.title}>
              {isActive ? 'Alfred is working...' : 'Changes ready'}
            </p>
            {projectName && (
              <p style={styles.project}>on {projectName}</p>
            )}
          </div>
        </div>

        {totalSteps > 0 && (
          <div style={styles.progressContainer}>
            <span style={styles.progressText}>{completedSteps}/{totalSteps}</span>
            <div style={styles.progressBar}>
              <motion.div
                style={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div
        ref={scrollRef}
        style={styles.stepsContainer}
        className="progress-steps"
      >
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => {
            const colors = getStepColors(step.type, step.status);
            const Icon = Icons[step.type] || Icons.analyze;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.03,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  ...styles.step,
                  ...(step.status === 'active' ? styles.stepActive : {}),
                  ...(step.status === 'done' ? styles.stepDone : {}),
                  ...(step.status === 'error' ? styles.stepError : {}),
                }}
              >
                <div
                  style={{
                    ...styles.stepIcon,
                    background: colors.bg,
                    color: colors.text,
                  }}
                >
                  {step.status === 'active' ? (
                    <div style={styles.spinner} />
                  ) : (
                    Icon
                  )}
                </div>

                <div style={styles.stepContent}>
                  <p style={styles.stepMessage}>{step.message}</p>
                  {step.detail && (
                    <p style={styles.stepDetail}>{step.detail}</p>
                  )}
                </div>

                {step.status === 'done' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    style={{ ...styles.stepCheck, color: colors.text }}
                  >
                    {Icons.complete}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS STEP GENERATORS
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

// Pre-defined step creators
export const ProgressSteps = {
  analyzing: (request: string) =>
    createProgressStep('analyze', 'Analyzing your request', request.slice(0, 60) + (request.length > 60 ? '...' : '')),

  scanningProject: (fileCount: number) =>
    createProgressStep('scan', `Scanning ${fileCount} files`),

  scanningFile: (fileName: string) =>
    createProgressStep('scan', `Reading ${fileName}`),

  foundLocations: (count: number) =>
    createProgressStep('find', `Found ${count} location${count !== 1 ? 's' : ''} to modify`),

  modifying: (fileName: string, description?: string) =>
    createProgressStep('modify', `Modifying ${fileName}`, description),

  applyingChange: (index: number, total: number, description: string) =>
    createProgressStep('modify', `Applying change ${index}/${total}`, description),

  creating: (fileName: string) =>
    createProgressStep('create', `Creating ${fileName}`),

  deleting: (fileName: string) =>
    createProgressStep('delete', `Removing ${fileName}`),

  complete: (changesApplied: number) =>
    createProgressStep('complete', `Applied ${changesApplied} change${changesApplied !== 1 ? 's' : ''} successfully`),

  error: (message: string) =>
    createProgressStep('error', message),
};

export default ModificationProgress;
