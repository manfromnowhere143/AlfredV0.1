/**
 * ALFRED OUTPUT CONTRACTS
 * 
 * Strict rules for what Alfred produces.
 * These are not guidelines — they are contracts.
 * 
 * Every output is validated against these rules.
 */

export const OUTPUT_CONTRACTS = {
    /**
     * Architecture output contract
     */
    architecture: {
      required: [
        'Component/module breakdown',
        'Data flow direction',
        'State ownership',
        'Key decisions with rationale',
      ],
      forbidden: [
        'Vague boxes with no responsibility',
        'Unlabeled arrows',
        'Missing error handling strategy',
      ],
      format: 'Structured markdown with clear hierarchy',
    },
  
    /**
     * Code output contract
     */
    code: {
      required: [
        'Production-ready (runs without modification)',
        'Properly typed (TypeScript when applicable)',
        'Follows stated standards',
        'Handles errors appropriately',
      ],
      forbidden: [
        'Incomplete snippets without warning',
        'Code that won\'t compile',
        'Placeholder comments like "// add logic here"',
        'Console.log debugging left in',
        'Any TODO without context',
      ],
      format: {
        language: 'Always specify language in code blocks',
        filename: 'Include filename comment when relevant',
        imports: 'Show all required imports',
      },
    },
  
    /**
     * Review output contract
     */
    review: {
      required: [
        'Prioritized issues (Critical → Important → Optional)',
        'Specific location references',
        'Concrete fix suggestions',
      ],
      forbidden: [
        'Vague feedback ("this could be better")',
        'Overwhelming lists without priority',
        'Criticism without solution',
        'Praise padding',
      ],
      format: {
        structure: '## Critical\\n## Important\\n## Optional',
        issueFormat: '**Issue**: [what]\\n**Location**: [where]\\n**Fix**: [how]',
      },
    },
  
    /**
     * Explanation output contract
     */
    explanation: {
      required: [
        'Answer the question first',
        'Context only if needed',
        'Examples when helpful',
      ],
      forbidden: [
        'Throat-clearing preamble',
        'Excessive caveats',
        'Tangential information',
      ],
      format: 'Direct prose, no unnecessary headers',
    },
  } as const;
  
  /**
   * Streaming rules for real-time output
   */
  export const STREAMING_RULES = {
    /**
     * How to handle partial code during streaming
     */
    code: {
      rule: 'Complete logical units before streaming',
      specifics: [
        'Never stream half a function',
        'Complete import blocks before function bodies',
        'Finish component before moving to next',
      ],
    },
  
    /**
     * How to handle explanations during streaming
     */
    explanation: {
      rule: 'Front-load the answer',
      specifics: [
        'First sentence should answer the question',
        'Details stream after the core answer',
        'Never bury the lede',
      ],
    },
  
    /**
     * Error recovery during streaming
     */
    errors: {
      rule: 'Acknowledge and correct inline',
      specifics: [
        'Don\'t delete — show correction',
        'Brief acknowledgment: "Correction:"',
        'Continue without drama',
      ],
    },
  } as const;
  
  /**
   * Code block validation
   */
  export interface CodeValidation {
    isValid: boolean;
    issues: string[];
  }
  
  export function validateCodeBlock(code: string, language: string): CodeValidation {
    const issues: string[] = [];
  
    // Check for forbidden patterns
    if (code.includes('// add logic here') || code.includes('// TODO: implement')) {
      issues.push('Contains placeholder comments');
    }
    if (code.includes('console.log') && !code.includes('// DEBUG')) {
      issues.push('Contains console.log without DEBUG marker');
    }
    if (code.includes('any') && language.includes('ts')) {
      // Allow some 'any' but flag excessive use
      const anyCount = (code.match(/: any/g) || []).length;
      if (anyCount > 2) {
        issues.push(`Excessive use of 'any' type (${anyCount} occurrences)`);
      }
    }
  
    // Check for incomplete code
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('Unbalanced braces - code appears incomplete');
    }
  
    return {
      isValid: issues.length === 0,
      issues,
    };
  }
  
  /**
   * Compile output contracts into prompt-ready text
   */
  export function compileOutputContracts(): string {
    return `## Output Contracts
  
  ### When Providing Code
  
  Always:
  ${OUTPUT_CONTRACTS.code.required.map(r => `- ${r}`).join('\n')}
  
  Never:
  ${OUTPUT_CONTRACTS.code.forbidden.map(f => `- ${f}`).join('\n')}
  
  ### When Reviewing
  
  Always:
  ${OUTPUT_CONTRACTS.review.required.map(r => `- ${r}`).join('\n')}
  
  Never:
  ${OUTPUT_CONTRACTS.review.forbidden.map(f => `- ${f}`).join('\n')}
  
  ### When Explaining
  
  Always:
  ${OUTPUT_CONTRACTS.explanation.required.map(r => `- ${r}`).join('\n')}
  
  Never:
  ${OUTPUT_CONTRACTS.explanation.forbidden.map(f => `- ${f}`).join('\n')}`;
  }