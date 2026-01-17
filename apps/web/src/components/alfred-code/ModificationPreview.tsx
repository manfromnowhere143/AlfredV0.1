'use client';

/**
 * Modification Preview Component
 *
 * Shows the user exactly what changes will be made before applying them.
 * The Steve Jobs approach: Simple, clear, elegant.
 */

import { motion } from 'framer-motion';
import type { ModificationPlan, FileModification } from '@/lib/alfred-code/modify-project';

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  sparkle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.5 2L10.5 5L13.5 6L10.5 7L9.5 10L8.5 7L5.5 6L8.5 5L9.5 2Z"/>
      <path d="M19 8L20 10L22 11L20 12L19 14L18 12L16 11L18 10L19 8Z"/>
      <path d="M14.5 14L15.5 17L18.5 18L15.5 19L14.5 22L13.5 19L10.5 18L13.5 17L14.5 14Z"/>
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  minus: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  plus: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ModificationPreviewProps {
  plan: ModificationPlan;
  onApply: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getConfidenceStyles(confidence: ModificationPlan['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function getActionStyles(action: FileModification['action']): string {
  switch (action) {
    case 'modify':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'create':
      return 'bg-green-500/20 text-green-400';
    case 'delete':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
}

function truncateCode(code: string, maxLength: number = 100): string {
  if (code.length <= maxLength) return code;
  return code.slice(0, maxLength) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ModificationPreview({
  plan,
  onApply,
  onCancel,
  isApplying = false,
}: ModificationPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 space-y-4 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-purple-400">
            {Icons.sparkle}
          </div>
          <span className="font-semibold text-white">Proposed Changes</span>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getConfidenceStyles(plan.confidence)}`}>
          {plan.confidence} confidence
        </span>
      </div>

      {/* Analysis */}
      <p className="text-sm text-slate-400 leading-relaxed">
        {plan.analysis}
      </p>

      {/* Changes */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {plan.modifications.map((mod, i) => (
          <motion.div
            key={`${mod.path}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30"
          >
            {/* File header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="text-blue-400">
                {Icons.file}
              </div>
              <span className="text-sm font-mono text-slate-300">{mod.path}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionStyles(mod.action)}`}>
                {mod.action}
              </span>
            </div>

            {/* Changes for modify action */}
            {mod.action === 'modify' && mod.changes?.map((change, j) => (
              <div key={j} className="font-mono text-xs space-y-1.5 mt-2">
                {/* Before */}
                <div className="flex items-start gap-2 text-red-400">
                  <div className="mt-0.5 flex-shrink-0">{Icons.minus}</div>
                  <code className="bg-red-500/10 px-2 py-1 rounded block overflow-x-auto whitespace-pre">
                    {truncateCode(change.search)}
                  </code>
                </div>
                {/* After */}
                <div className="flex items-start gap-2 text-green-400">
                  <div className="mt-0.5 flex-shrink-0">{Icons.plus}</div>
                  <code className="bg-green-500/10 px-2 py-1 rounded block overflow-x-auto whitespace-pre">
                    {truncateCode(change.replace)}
                  </code>
                </div>
              </div>
            ))}

            {/* Content preview for create action */}
            {mod.action === 'create' && mod.newContent && (
              <div className="mt-2 text-xs">
                <code className="text-green-400 bg-green-500/10 px-2 py-1 rounded block overflow-x-auto whitespace-pre max-h-20 overflow-y-auto">
                  {truncateCode(mod.newContent, 300)}
                </code>
              </div>
            )}

            {/* Reason */}
            <p className="text-xs text-slate-500 mt-2 italic">
              {mod.reason}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Impact summary */}
      {plan.impact.length > 0 && (
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700/30">
          <span className="text-slate-400">Impact:</span>{' '}
          {plan.impact.join(', ')}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isApplying}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={isApplying}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
        >
          {isApplying ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25"/>
                <path d="M12 2a10 10 0 019.5 13" strokeLinecap="round"/>
              </svg>
              Applying...
            </>
          ) : (
            <>
              {Icons.check}
              Apply Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default ModificationPreview;
