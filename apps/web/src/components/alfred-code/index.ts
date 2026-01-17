/**
 * Alfred Code Components
 *
 * The Steve Jobs approach to code modifications:
 * - ModificationPreview: Shows proposed changes before applying
 * - ForensicInvestigation: Shows forensic analysis before changes
 * - SaveBar: Appears when there are unsaved changes
 * - ExportToClaudeCode: One-click export for power users
 */

export { ModificationPreview } from './ModificationPreview';
export { ForensicInvestigation, createForensicReport } from './ForensicInvestigation';
export { SaveBar } from './SaveBar';
export { ExportToClaudeCode } from './ExportToClaudeCode';

// Re-export types
export type { ModificationPlan, FileModification, FileChange, ProjectFile } from '@/lib/alfred-code/modify-project';
export type { ForensicReport, ForensicFinding } from './ForensicInvestigation';
