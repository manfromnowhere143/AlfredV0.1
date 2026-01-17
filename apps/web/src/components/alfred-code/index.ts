/**
 * Alfred Code Components
 *
 * The Steve Jobs approach to code modifications:
 * - ModificationPreview: Shows proposed changes before applying
 * - ForensicInvestigation: Shows forensic analysis before changes
 * - ModificationProgress: Real-time progress during modifications
 * - WelcomePanel: Context-aware welcome with smart suggestions
 * - SaveBar: Appears when there are unsaved changes
 * - ExportToClaudeCode: One-click export for power users
 */

export { ModificationPreview } from './ModificationPreview';
export { ForensicInvestigation, createForensicReport } from './ForensicInvestigation';
export { ModificationProgress, ProgressSteps, createProgressStep, markStepDone, markStepError } from './ModificationProgress';
export { WelcomePanel } from './WelcomePanel';
export { SaveBar } from './SaveBar';
export { ExportToClaudeCode } from './ExportToClaudeCode';

// Re-export types
export type { ModificationPlan, FileModification, FileChange, ProjectFile } from '@/lib/alfred-code/modify-project';
export type { ForensicReport, ForensicFinding } from './ForensicInvestigation';
export type { ProgressStep } from './ModificationProgress';
