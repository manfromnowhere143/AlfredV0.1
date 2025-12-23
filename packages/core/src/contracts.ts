/**
 * Contracts
 *
 * Validation and enforcement logic for Alfred's outputs.
 * Every output must satisfy its contract.
 */

import type {
  ArchitectureOutput,
  ReviewOutput,
  ReviewIssue,
  AlfredMode,
} from './types';

// ============================================================================
// CONTRACT VALIDATORS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates architecture output against contract.
 * Must include: components, data flow, state ownership, decisions with rationale.
 */
export function validateArchitectureOutput(
  output: Partial<ArchitectureOutput>
): ValidationResult {
  const errors: string[] = [];

  if (!output.components || output.components.length === 0) {
    errors.push('Architecture must include component breakdown');
  }

  if (!output.dataFlow) {
    errors.push('Architecture must specify data flow');
  }

  if (!output.stateOwnership) {
    errors.push('Architecture must define state ownership');
  }

  if (!output.decisions || output.decisions.length === 0) {
    errors.push('Architecture must include key decisions with rationale');
  }

  output.decisions?.forEach((decision, index) => {
    if (!decision.rationale || decision.rationale.trim() === '') {
      errors.push(`Decision ${index + 1} missing rationale`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validates review output against contract.
 * Must include: prioritized issues, locations, concrete fixes.
 */
export function validateReviewOutput(
  output: Partial<ReviewOutput>
): ValidationResult {
  const errors: string[] = [];

  if (!output.issues) {
    errors.push('Review must include issues array');
    return { valid: false, errors };
  }

  output.issues.forEach((issue, index) => {
    if (!issue.location || issue.location.trim() === '') {
      errors.push(`Issue ${index + 1} missing specific location`);
    }

    if (!issue.fix || issue.fix.trim() === '') {
      errors.push(`Issue ${index + 1} missing concrete fix suggestion`);
    }

    if (!['critical', 'important', 'optional'].includes(issue.severity)) {
      errors.push(`Issue ${index + 1} has invalid severity`);
    }
  });

  const severityOrder = { critical: 0, important: 1, optional: 2 };
  for (let i = 1; i < output.issues.length; i++) {
    const prev = output.issues[i - 1];
    const curr = output.issues[i];
    if (prev && curr && severityOrder[prev.severity] > severityOrder[curr.severity]) {
      errors.push('Issues must be ordered: critical → important → optional');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// OUTPUT FORMATTERS
// ============================================================================

/**
 * Sorts review issues by severity (critical first).
 */
export function sortReviewIssues(issues: ReviewIs]): ReviewIssue[] {
  const severityOrder = { critical: 0, important: 1, optional: 2 };
  return [...issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

// ============================================================================
// MODE CONTRACTS
// ============================================================================

interface ModeContract {
  allowedActions: string[];
  explanationLevel: 'minimal' | 'detailed' | 'targeted';
  assumeCompetence: boolean;
}

export const MODE_CONTRACTS: Record<AlfredMode, ModeContract> = {
  builder: {
    allowedActions: ['generate_code', 'generate_architecture', 'scaffold'],
    explanationLevel: 'minimal',
    assumeCompetence: true,
  },
  mentor: {
    allowedActions: ['generate_code', 'generate_architecture', 'explain', 'compare'],
    explanationLevel: 'detailed',
    assumeCompetence: false,
  },
  reviewer: {
    allowedActions: ['review', 'suggest_fix', 'prioritize_issues'],
    explanationLevel: 'targeted',
    assumeCompetence: true,
  },
};

/**
 * Checks if an action is allowed in a given mode.
 */
export function isActionAllowed(mode: AlfredMode, action: string): boolean {
  return MODE_CONTRACTS[mode].allowedActions.includes(action);
}
