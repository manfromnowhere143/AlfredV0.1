/**
 * Alfred Code Components
 *
 * The Steve Jobs approach to code modifications:
 * - ModificationPreview: Shows proposed changes before applying
 * - ExportToClaudeCode: One-click export for power users
 */

export { ModificationPreview } from './ModificationPreview';
export { ExportToClaudeCode } from './ExportToClaudeCode';

// Re-export types
export type { ModificationPlan, FileModification, FileChange, ProjectFile } from '@/lib/alfred-code/modify-project';
