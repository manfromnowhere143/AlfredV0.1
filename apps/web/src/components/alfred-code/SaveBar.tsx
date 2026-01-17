'use client';

/**
 * SaveBar Component
 *
 * Appears at the bottom of the screen when there are unsaved changes.
 * Shows which files have been modified and allows save/discard.
 *
 * Steve Jobs approach: Clear, simple, actionable.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SaveBarProps {
  /** List of file paths that have unsaved changes */
  pendingChanges: string[];
  /** Callback when save is clicked */
  onSave: () => void;
  /** Callback when discard is clicked */
  onDiscard: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Optional class name */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  alert: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  save: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
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
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SaveBar({
  pendingChanges,
  onSave,
  onDiscard,
  isSaving,
  className = '',
}: SaveBarProps) {
  // Don't render if no pending changes
  if (pendingChanges.length === 0) return null;

  // Format file names for display
  const fileNames = pendingChanges.map(path => path.split('/').pop() || path);
  const displayText = fileNames.length <= 2
    ? fileNames.join(', ')
    : `${fileNames.slice(0, 2).join(', ')} +${fileNames.length - 2} more`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`save-bar ${className}`}
      >
        <div className="save-bar-content">
          {/* Left: Info */}
          <div className="save-info">
            <div className="save-icon">
              {Icons.alert}
            </div>
            <div className="save-text">
              <span className="save-count">
                {pendingChanges.length} file{pendingChanges.length !== 1 ? 's' : ''} modified
              </span>
              <span className="save-files">{displayText}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="save-actions">
            <button
              className="btn-discard"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              className="btn-save"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  {Icons.loader}
                  Saving...
                </>
              ) : (
                <>
                  {Icons.save}
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <style jsx>{`
          .save-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 16px;
            pointer-events: none;
          }

          .save-bar-content {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 20px;
            background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 28, 0.98));
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            pointer-events: all;
          }

          .save-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .save-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
          }

          .save-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .save-count {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.95);
          }

          .save-files {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
          }

          .save-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .btn-discard {
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.6);
            background: transparent;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-discard:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.05);
          }

          .btn-discard:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-save {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            color: white;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
          }

          .btn-save:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
          }

          .btn-save:active:not(:disabled) {
            transform: translateY(0);
          }

          .btn-save:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          @media (max-width: 640px) {
            .save-bar {
              padding: 12px;
            }

            .save-bar-content {
              flex-direction: column;
              align-items: stretch;
              gap: 12px;
              padding: 12px 16px;
            }

            .save-info {
              justify-content: center;
            }

            .save-actions {
              justify-content: center;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

export default SaveBar;
