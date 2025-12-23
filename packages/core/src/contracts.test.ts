/**
 * Contract Validation Tests
 *
 * Verifies that output contracts are enforced correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  validateArchitectureOutput,
  validateReviewOutput,
  sortReviewIssues,
  isActionAllowed,
} from './contracts';
import type { ArchitectureOutput, ReviewOutput, ReviewIssue } from './types';

// ============================================================================
// ARCHITECTURE OUTPUT VALIDATION
// ============================================================================

describe('validateArchitectureOutput', () => {
  it('passes valid architecture output', () => {
    const valid: ArchitectureOutput = {
      components: [
        {
          name: 'UserService',
          responsibility: 'Manages user data',
          dependencies: ['DatabaseService'],
          publicInterface: ['getUser', 'createUser'],
        },
      ],
      dataFlow: {
        direction: 'unidirectional',
        sources: ['API'],
        sinks: ['Database'],
        transformations: ['validate', 'normalize'],
      },
      stateOwnership: {
        owner: 'UserContext',
        consumers: ['UserProfile', 'UserSettings'],
        updatePattern: 'context',
      },
      decisions: [
        {
          id: '1',
          description: 'Use context for state',
          rationale: 'Avoids prop drilling across 5+ levels',
          timestamp: new Date(),
        },
      ],
    };

    const result = validateArchitectureOutput(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when components missing', () => {
    const invalid = {
      dataFlow: { direction: 'unidirectional', sources: [], sinks: [], transformations: [] },
      stateOwnership: { owner: 'Test', consumers: [], updatePattern: 'lift' },
      decisions: [{ id: '1', description: 'Test', rationale: 'Test', timestamp: new Date() }],
    };

    const result = validateArchitectureOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Architecture must include component breakdown');
  });

  it('fails when data flow missing', () => {
    const invalid = {
      components: [{ name: 'Test', responsibility: 'Test', dependencies: [], publicInterface: [] }],
      stateOwnership: { owner: 'Test', consumers: [], updatePattern: 'lift' },
      decisions: [{ id: '1', description: 'Test', rationale: 'Test', timestamp: new Date() }],
    };

    const result = validateArchitectureOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Architecture must specify data flow');
  });

  it('fails when state ownership missing', () => {
    const invalid = {
      components: [{ name: 'Test', responsibility: 'Test', dependencies: [], publicInterface: [] }],
      dataFlow: { direction: 'unidirectional', sources: [], sinks: [], transformations: [] },
      decisions: [{ id: '1', description: 'Test', rationale: 'Test', timestamp: new Date() }],
    };

    const result = validateArchitectureOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Architecture must define state ownership');
  });

  it('fails when decisions missing rationale', () => {
    const invalid = {
      components: [{ name: 'Test', responsibility: 'Test', dependencies: [], publicInterface: [] }],
      dataFlow: { direction: 'unidirectional', sources: [], sinks: [], transformations: [] },
      stateOwnership: { owner: 'Test', consumers: [], updatePattern: 'lift' },
      decisions: [{ id: '1', description: 'Test', rationale: '', timestamp: new Date() }],
    };

    const result = validateArchitectureOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Decision 1 missing rationale');
  });
});

// ============================================================================
// REVIEW OUTPUT VALIDATION
// ============================================================================

describe('validateReviewOutput', () => {
  it('passes valid review output', () => {
    const valid: ReviewOutput = {
      summary: 'Three issues found',
      issues: [
        { severity: 'critical', location: 'line 42', description: 'Memory leak', fix: 'Add cleanup' },
        { severity: 'important', location: 'line 100', description: 'Missing type', fix: 'Add type annotation' },
        { severity: 'optional', location: 'line 150', description: 'Naming', fix: 'Rename to camelCase' },
      ],
    };

    const result = validateReviewOutput(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when issues missing location', () => {
    const invalid = {
      summary: 'Issues found',
      issues: [
        { severity: 'critical', location: '', description: 'Bug', fix: 'Fix it' },
      ],
    };

    const result = validateReviewOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Issue 1 missing specific location');
  });

  it('fails when issues missing fix', () => {
    const invalid = {
      summary: 'Issues found',
      issues: [
        { severity: 'critical', location: 'line 1', description: 'Bug', fix: '' },
      ],
    };

    const result = validateReviewOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Issue 1 missing concrete fix suggestion');
  });

  it('fails when issues not sorted by severity', () => {
    const invalid = {
      summary: 'Issues found',
      issues: [
        { severity: 'optional', location: 'line 1', description: 'Minor', fix: 'Fix' },
        { severity: 'critical', location: 'line 2', description: 'Major', fix: 'Fix' },
      ],
    };

    const result = validateReviewOutput(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Issues must be ordered: critical → important → optional');
  });
});

// ============================================================================
// ISSUE SORTING
// ========================================================================

describe('sortReviewIssues', () => {
  it('sorts issues by severity', () => {
    const issues: ReviewIssue[] = [
      { severity: 'optional', location: 'a', description: 'a', fix: 'a' },
      { severity: 'critical', location: 'b', description: 'b', fix: 'b' },
      { severity: 'important', location: 'c', description: 'c', fix: 'c' },
    ];

    const sorted = sortReviewIssues(issues);

    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('important');
    expect(sorted[2].severity).toBe('optional');
  });

  it('does not mutate original array', () => {
    const issues: ReviewIssue[] = [
      { severity: 'optional', location: 'a', description: 'a', fix: 'a' },
      { severity: 'critical', location: 'b', description: 'b', fix: 'b' },
    ];

    sortReviewIssues(issues);

    expect(issues[0].severity).toBe('optional');
  });
});

// ============================================================================
// MODE ACTION VALIDATION
// ============================================================================

describe('isActionAllowed', () => {
  it('allows generate_code in builder mode', () => {
    expect(isActionAllowed('builder', 'generate_code')).toBe(true);
  });

  it('allows explain in mentor mode', () => {
    expect(isActionAllowed('mentor', 'explain')).toBe(true);
  });

  it('allows review in reviewer mode', () => {
    expect(isActionAllowed('reviewer', 'review')).toBe(true);
  });

  it('disallows explain in builder mode', () => {
    expect(isActionAllowed('builder', 'explain')).toBe(false);
  });

  it('disallows generate_code in reviewer mode', () => {
    expect(isActionAllowed('reviewer', 'generate_code')).toBe(false);
  });
});
