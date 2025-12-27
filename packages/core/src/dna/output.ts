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
     * ARTIFACT RENDERING CONTRACT (CRITICAL)
     * 
     * Rules for React components that will be previewed in Alfred's sandbox.
     * Violations cause WHITE PAGES - the artifact fails to render.
     */
    artifact: {
      available: [
        'React (useState, useEffect, useRef, useMemo, useCallback, useContext, createContext)',
        'Tailwind CSS (all utility classes)',
        'CSS animations (@keyframes, transition, transform)',
        'Inline styles',
        'Inline SVG icons (copy SVG paths directly into components)',
        'Standard HTML elements',
        'CSS pseudo-classes (:hover, :focus, :active)',
        'CSS custom properties (--var-name)',
        'Google Fonts (Inter, Playfair Display already loaded)',
      ],
      forbidden: [
        'framer-motion - causes white page (use CSS animations instead)',
        '@heroicons/react - causes white page (use inline SVG instead)',
        'lucide-react imports - causes white page (use inline SVG instead)',
        'next/image - causes white page (use <img> tag instead)',
        'next/link - causes white page (use <a> tag instead)',
        'next/router - causes white page (not available)',
        'External npm imports - causes white page',
        'import statements for external packages',
        'require() calls',
      ],
      replacements: {
        'framer-motion': 'Use CSS: @keyframes, transition, transform. Example: className="animate-fadeIn" with @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }',
        '@heroicons/react': 'Copy the SVG path directly. Example: const Icon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        'next/image': 'Use <img src="..." alt="..." className="..." />',
        'next/link': 'Use <a href="...">text</a>',
      },
      cssAnimationExamples: `
/* Available animation classes (pre-defined in sandbox): */
.animate-fadeIn { animation: fadeIn 0.5s ease-out; }
.animate-slideUp { animation: slideUp 0.5s ease-out; }
.animate-slideDown { animation: slideDown 0.5s ease-out; }
.animate-scaleIn { animation: scaleIn 0.3s ease-out; }

/* For custom animations, define inline: */
<style>{\`
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-float { animation: float 3s ease-in-out infinite; }
\`}</style>
      `,
      inlineSvgExample: `
// Instead of: import { StarIcon } from '@heroicons/react/24/solid'
// Use inline SVG:
const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/>
  </svg>
);
      `,
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

    // Check for forbidden artifact imports
    const forbiddenImports = [
      'framer-motion',
      '@heroicons/react',
      'lucide-react',
      'next/image',
      'next/link',
      'next/router',
    ];
    for (const pkg of forbiddenImports) {
      if (code.includes(`from '${pkg}'`) || code.includes(`from "${pkg}"`)) {
        issues.push(`Uses forbidden import: ${pkg} - will cause white page in preview`);
      }
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

  ### ARTIFACT RENDERING RULES (CRITICAL - READ CAREFULLY)

  When generating React components for preview/artifacts, the sandbox has LIMITED libraries.
  Using unavailable libraries causes WHITE PAGES (blank screen, nothing renders).

  **AVAILABLE in sandbox:**
  ${OUTPUT_CONTRACTS.artifact.available.map(a => `- ${a}`).join('\n')}

  **FORBIDDEN - WILL CAUSE WHITE PAGE:**
  ${OUTPUT_CONTRACTS.artifact.forbidden.map(f => `- ${f}`).join('\n')}

  **HOW TO REPLACE FORBIDDEN LIBRARIES:**

  Instead of framer-motion:
  \`\`\`css
  /* Define keyframes */
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  
  /* Use with className */
  <div className="animate-[fadeIn_0.5s_ease-out]">Content</div>
  /* Or Tailwind's built-in: */
  <div className="transition-all duration-300 hover:scale-105">Content</div>
  \`\`\`

  Instead of @heroicons/react or lucide-react:
  \`\`\`tsx
  // Define icons as inline SVG components
  const ChevronIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
  
  // Use in component
  <ChevronIcon className="w-5 h-5" />
  \`\`\`

  Instead of next/image:
  \`\`\`tsx
  <img src="https://example.com/image.jpg" alt="Description" className="w-full h-auto rounded-lg" />
  \`\`\`

  **REMEMBER: A white page destroys user trust. Always use available alternatives.**
  
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