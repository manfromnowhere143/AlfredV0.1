/**
 * ALFRED STANDARDS
 * 
 * Concrete, measurable rules for quality.
 * Unlike philosophy (beliefs), standards are checkable.
 * 
 * These inform code review, architecture decisions, and output validation.
 */

export const STANDARDS = {
    /**
     * Design standards — visual and UX
     */
    design: {
      typography: {
        rule: 'Thin, elegant fonts. Never heavy. Never decorative without purpose.',
        specifics: [
          'Prefer weights 300-500 for body text',
          'Use weight contrast for hierarchy, not size alone',
          'Line height: 1.5-1.7 for readability',
          'Letter spacing: subtle, never extreme',
        ],
      },
      color: {
        rule: 'Restrained palettes. Dark themes done correctly. Light themes clean and breathable.',
        specifics: [
          'Maximum 5 colors in primary palette',
          'Semantic colors for states (success, error, warning)',
          'Sufficient contrast ratios (WCAG AA minimum)',
          'Dark mode: not just inverted, properly designed',
        ],
      },
      spacing: {
        rule: 'Generous whitespace. Elements breathe. Nothing cramped.',
        specifics: [
          'Consistent spacing scale (4, 8, 12, 16, 24, 32, 48, 64)',
          'Margins increase with element importance',
          'Padding proportional to content density',
        ],
      },
      animation: {
        rule: 'Subtle, physics-based springs. Never jarring, never slow.',
        specifics: [
          'Duration: 150-300ms for micro-interactions',
          'Easing: ease-out for entrances, ease-in for exits',
          'No animation for animation\'s sake',
          'Respect prefers-reduced-motion',
        ],
      },
    },
  
    /**
     * Architecture standards — system design
     */
    architecture: {
      separation: {
        rule: 'UI, logic, and data are distinct layers.',
        specifics: [
          'Components: presentation only',
          'Hooks: behavior and state',
          'Services: data fetching and business logic',
          'Types: shared contracts',
        ],
      },
      components: {
        rule: 'Small, focused, reusable. No god components.',
        specifics: [
          'Single responsibility',
          'Props for configuration, not behavior branching',
          'Composition over configuration',
          'Maximum ~150 lines (soft limit)',
        ],
      },
      state: {
        rule: 'Explicit, predictable, minimal. State is earned, not scattered.',
        specifics: [
          'Local state by default',
          'Lift only when needed',
          'Server state via React Query / SWR',
          'Global state only for truly global concerns',
        ],
      },
      errors: {
        rule: 'Graceful degradation. Never silent failures. Never cryptic errors.',
        specifics: [
          'Error boundaries at strategic points',
          'User-friendly error messages',
          'Detailed logs for debugging',
          'Recovery paths when possible',
        ],
      },
    },
  
    /**
     * Code standards — syntax and style
     */
    code: {
      clarity: {
        rule: 'Code is read more than written. Optimize for the reader.',
        specifics: [
          'Explicit over implicit',
          'Verbose names over short names',
          'Small functions over long functions',
          'Early returns over deep nesting',
        ],
      },
      naming: {
        rule: 'Precise, descriptive, consistent. Names are documentation.',
        specifics: [
          'Boolean: isX, hasX, shouldX, canX',
          'Handlers: handleX, onX',
          'Async: fetchX, loadX, syncX',
          'Components: NounPhrase (UserProfile, not ProfileUser)',
        ],
      },
      dependencies: {
        rule: 'Minimal. Every dependency is a liability. Justify each one.',
        specifics: [
          'Prefer native APIs when sufficient',
          'Evaluate bundle size impact',
          'Check maintenance status',
          'Consider security surface',
        ],
      },
    },

    /**
     * ARTIFACT STANDARDS — Never ship broken artifacts
     * Added after learning from white-page failures
     */
    artifacts: {
      completeness: {
        rule: 'Every artifact must render immediately. No white pages. Ever.',
        specifics: [
          'Include ALL required dependencies inline or via CDN',
          'Self-contained: no external file imports',
          'Complete HTML structure with proper head/body',
          'All CSS included inline or via CDN',
          'All JS/React dependencies loaded before component',
        ],
      },
      validation: {
        rule: 'Validate before display. Fix automatically if broken.',
        specifics: [
          'Parse JSX/TSX for syntax errors before render',
          'Check for undefined component references',
          'Verify all imports resolve to available libraries',
          'Catch render errors and trigger self-heal',
        ],
      },
      selfHealing: {
        rule: 'If artifact fails, diagnose and fix automatically.',
        specifics: [
          'Capture error message from iframe',
          'Identify root cause (missing dep, syntax, undefined)',
          'Generate fix request to Alfred',
          'Re-render without user intervention',
          'Maximum 2 auto-fix attempts before showing error',
        ],
      },
      libraries: {
        rule: 'Only use libraries available in artifact sandbox.',
        available: [
          'react',
          'react-dom',
          'framer-motion (via CDN)',
          'lucide-react (via CDN)',
          'tailwindcss (via CDN)',
          'recharts (via CDN)',
        ],
        forbidden: [
          '@heroicons/react (use lucide-react instead)',
          'next/image (use img tag)',
          'next/link (use a tag)',
          'External file imports',
        ],
      },
    },
  
    /**
     * Stack preferences — defaults, not dogma
     */
    stack: {
      note: 'Preferences, not requirements. Quality matters more than specific tools.',
      frontend: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      backend: ['Node.js', 'Python (FastAPI)', 'PostgreSQL'],
      infrastructure: ['Vercel', 'Docker', 'GitHub Actions'],
      dataViz: ['Recharts', 'D3', 'Plotly'],
    },
  } as const;
  
  /**
   * Compile standards into prompt-ready text
   */
  export function compileStandards(): string {
    return `## Standards
  
  ### Design Standards
  
  - **Typography**: ${STANDARDS.design.typography.rule}
  - **Color**: ${STANDARDS.design.color.rule}
  - **Spacing**: ${STANDARDS.design.spacing.rule}
  - **Animation**: ${STANDARDS.design.animation.rule}
  
  ### Architecture Standards
  
  - **Separation of concerns**: ${STANDARDS.architecture.separation.rule}
  - **Component design**: ${STANDARDS.architecture.components.rule}
  - **State management**: ${STANDARDS.architecture.state.rule}
  - **Error handling**: ${STANDARDS.architecture.errors.rule}
  
  ### Code Standards
  
  - **Clarity over brevity**: ${STANDARDS.code.clarity.rule}
  - **Naming**: ${STANDARDS.code.naming.rule}
  - **Dependencies**: ${STANDARDS.code.dependencies.rule}

  ### Artifact Standards (CRITICAL)
  
  - **Completeness**: ${STANDARDS.artifacts.completeness.rule}
  - **Validation**: ${STANDARDS.artifacts.validation.rule}
  - **Self-Healing**: ${STANDARDS.artifacts.selfHealing.rule}
  - **Available libraries**: ${STANDARDS.artifacts.libraries.available.join(', ')}
  - **Forbidden in artifacts**: ${STANDARDS.artifacts.libraries.forbidden.join(', ')}
  
  ### Stack Preferences
  
  - **Frontend**: ${STANDARDS.stack.frontend.join(', ')}
  - **Backend**: ${STANDARDS.stack.backend.join(', ')}
  - **Infrastructure**: ${STANDARDS.stack.infrastructure.join(', ')}
  
  You are not dogmatic about stack. You are dogmatic about quality.
  Artifacts must ALWAYS render. A white page is a failure.`;
  }
  
  export type Standards = typeof STANDARDS;