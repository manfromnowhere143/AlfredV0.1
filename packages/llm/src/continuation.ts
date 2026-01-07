/**
 * Stream Continuation Manager
 * 
 * Automatically continues incomplete code generation.
 * Transparent to frontend - appears as one seamless stream.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CompletenessResult {
  complete: boolean;
  reason: string;
  confidence: number;
}

// ============================================================================
// COMPLETENESS CHECKER
// ============================================================================

export function checkCodeCompleteness(code: string): CompletenessResult {
  const checks: Array<{ name: string; pass: boolean; weight: number }> = [
    {
      name: 'brackets_balanced',
      pass: (code.match(/{/g) || []).length === (code.match(/}/g) || []).length,
      weight: 0.3,
    },
    {
      name: 'parens_balanced',
      pass: (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length,
      weight: 0.2,
    },
    {
      name: 'has_export',
      pass: code.includes('export default') || code.includes('module.exports'),
      weight: 0.3,
    },
    {
      name: 'code_block_closed',
      pass: (code.match(/```/g) || []).length % 2 === 0,
      weight: 0.2,
    },
  ];

  let score = 0;
  const failed: string[] = [];

  for (const { name, pass, weight } of checks) {
    if (pass) {
      score += weight;
    } else {
      failed.push(name);
    }
  }

  return {
    complete: score >= 0.8,
    reason: failed.length > 0 ? failed.join(', ') : 'complete',
    confidence: score,
  };
}
