'use client';

/**
 * Modification Progress Component - Compact State of the Art
 *
 * Premium real-time progress display optimized for chat panel.
 * Compact, elegant, and fits perfectly in the conversation flow.
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
// ICONS - Compact, refined
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  analyze: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  scan: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  find: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  modify: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  create: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  delete: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  complete: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  error: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES - Compact for chat panel
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  container: {
    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(15, 15, 22, 0.98))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
    overflow: 'hidden',
    margin: '8px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  orb: {
    position: 'relative' as const,
    width: '8px',
    height: '8px',
  },
  orbCore: {
    position: 'absolute' as const,
    inset: '1px',
    borderRadius: '50%',
  },
  orbRing: {
    position: 'absolute' as const,
    inset: '-2px',
    borderRadius: '50%',
    border: '1.5px solid rgba(99, 102, 241, 0.5)',
  },
  title: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: '0.01em',
    margin: 0,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  progressText: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'SF Mono, Monaco, monospace',
  },
  progressBar: {
    width: '50px',
    height: '3px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
    borderRadius: '2px',
  },
  stepsContainer: {
    maxHeight: '140px',
    overflowY: 'auto' as const,
    padding: '6px 8px',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '6px',
    marginBottom: '4px',
  },
  stepActive: {
    background: 'rgba(99, 102, 241, 0.1)',
  },
  stepDone: {
    opacity: 0.6,
  },
  stepIcon: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '5px',
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepMessage: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.85)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  stepDetail: {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'SF Mono, Monaco, monospace',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '1.5px solid rgba(99, 102, 241, 0.3)',
    borderTopColor: '#818cf8',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
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

export function ModificationProgress({ steps, isActive, projectName }: ModificationProgressProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={styles.container}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.orb}>
            <motion.div
              style={{
                ...styles.orbCore,
                background: isActive ? '#6366f1' : '#22c55e',
              }}
              animate={isActive ? { scale: [1, 0.8, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {isActive && (
              <motion.div
                style={styles.orbRing}
                animate={{ scale: [1, 2], opacity: [1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
          <p style={styles.title}>
            {isActive ? 'Working...' : 'Ready'}
            {projectName && <span style={{ opacity: 0.5, fontWeight: 400 }}> · {projectName}</span>}
          </p>
        </div>

        {totalSteps > 0 && (
          <div style={styles.progressContainer}>
            <span style={styles.progressText}>{completedSteps}/{totalSteps}</span>
            <div style={styles.progressBar}>
              <motion.div
                style={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div ref={scrollRef} style={styles.stepsContainer}>
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => {
            const colors = getStepColors(step.type, step.status);
            const Icon = Icons[step.type] || Icons.analyze;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                style={{
                  ...styles.step,
                  ...(step.status === 'active' ? styles.stepActive : {}),
                  ...(step.status === 'done' ? styles.stepDone : {}),
                }}
              >
                <div style={{ ...styles.stepIcon, background: colors.bg, color: colors.text }}>
                  {step.status === 'active' ? <div style={styles.spinner} /> : Icon}
                </div>
                <div style={styles.stepContent}>
                  <p style={styles.stepMessage}>{step.message}</p>
                  {step.detail && <p style={styles.stepDetail}>{step.detail}</p>}
                </div>
                {step.status === 'done' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ color: colors.text, opacity: 0.7 }}
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

export function createProgressStep(type: ProgressStep['type'], message: string, detail?: string): ProgressStep {
  return { id: `step-${Date.now()}-${++stepIdCounter}`, type, message, detail, status: 'active', timestamp: Date.now() };
}

export function markStepDone(step: ProgressStep): ProgressStep {
  return { ...step, status: 'done' };
}

export function markStepError(step: ProgressStep): ProgressStep {
  return { ...step, status: 'error' };
}

export const ProgressSteps = {
  analyzing: (request: string) => createProgressStep('analyze', 'Analyzing request', request.slice(0, 40) + (request.length > 40 ? '...' : '')),
  scanningProject: (fileCount: number) => createProgressStep('scan', `Scanning ${fileCount} files`),
  scanningFile: (fileName: string) => createProgressStep('scan', `Reading ${fileName}`),
  foundLocations: (count: number) => createProgressStep('find', `Found ${count} location${count !== 1 ? 's' : ''}`),
  modifying: (fileName: string, description?: string) => createProgressStep('modify', `Modifying ${fileName}`, description),
  applyingChange: (index: number, total: number, description: string) => createProgressStep('modify', `Change ${index}/${total}`, description),
  creating: (fileName: string) => createProgressStep('create', `Creating ${fileName}`),
  deleting: (fileName: string) => createProgressStep('delete', `Removing ${fileName}`),
  complete: (changesApplied: number) => createProgressStep('complete', `Applied ${changesApplied} change${changesApplied !== 1 ? 's' : ''}`),
  error: (message: string) => createProgressStep('error', message),
};

export default ModificationProgress;
