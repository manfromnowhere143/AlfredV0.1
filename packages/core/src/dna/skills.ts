/**
 * ALFRED SKILLS (Adaptation Layer)
 * 
 * Alfred adapts to user skill level WITHOUT dumbing down quality.
 * This is about explanation depth, not output quality.
 * 
 * A senior gets terse responses.
 * A junior gets the same quality code with more context.
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'experienced' | 'expert';

export interface SkillProfile {
  readonly level: SkillLevel;
  readonly indicators: readonly string[];
  readonly adaptations: {
    readonly explanationDepth: string;
    readonly assumedKnowledge: readonly string[];
    readonly codeStyle: string;
    readonly handholding: boolean;
  };
}

export const SKILL_PROFILES: Record<SkillLevel, SkillProfile> = {
  beginner: {
    level: 'beginner',
    indicators: [
      'Asks what basic syntax means',
      'Unsure about file structure',
      'Copies code without understanding',
      'Asks "how do I run this?"',
    ],
    adaptations: {
      explanationDepth: 'Explain concepts when introducing them. Name things explicitly.',
      assumedKnowledge: ['Basic programming concepts'],
      codeStyle: 'Full files with clear structure. Explicit imports.',
      handholding: true,
    },
  },

  intermediate: {
    level: 'intermediate',
    indicators: [
      'Understands basics, asks about patterns',
      'Can read code but needs architecture guidance',
      'Knows what React is, unsure about advanced patterns',
      'Asks "what\'s the best way to..."',
    ],
    adaptations: {
      explanationDepth: 'Brief explanations when introducing new concepts.',
      assumedKnowledge: ['JavaScript/TypeScript', 'React basics', 'Git', 'CLI'],
      codeStyle: 'Complete components. Mention patterns by name.',
      handholding: false,
    },
  },

  experienced: {
    level: 'experienced',
    indicators: [
      'Speaks in technical terms',
      'Asks about trade-offs',
      'References specific libraries/patterns',
      'Shares code for review',
    ],
    adaptations: {
      explanationDepth: 'Terse. Skip basics. Move fast.',
      assumedKnowledge: ['Full stack development', 'System design', 'DevOps basics'],
      codeStyle: 'Focused snippets. Diff-style when modifying.',
      handholding: false,
    },
  },

  expert: {
    level: 'expert',
    indicators: [
      'Discusses architecture trade-offs',
      'References internals/implementation details',
      'Asks about edge cases',
      'Challenges suggestions with valid points',
    ],
    adaptations: {
      explanationDepth: 'Minimal. Peer conversation.',
      assumedKnowledge: ['Everything reasonable'],
      codeStyle: 'Whatever is fastest to communicate.',
      handholding: false,
    },
  },
} as const;

/**
 * Signals that indicate skill level from user input
 */
export const SKILL_SIGNALS = {
  beginner: [
    /what does .+ mean/i,
    /how do i (run|start|install)/i,
    /i('m| am) (new|learning|beginner)/i,
    /can you explain/i,
    /i don't understand/i,
  ],
  intermediate: [
    /what('s| is) the best (way|practice)/i,
    /should i use/i,
    /how would you/i,
    /is this (correct|right|good)/i,
  ],
  experienced: [
    /trade.?off/i,
    /performance/i,
    /scalab/i,
    /architect/i,
    /pattern/i,
  ],
  expert: [
    /implementation detail/i,
    /edge case/i,
    /internal/i,
    /constraint/i,
    /concurrent/i,
    /distributed/i,
  ],
} as const;

/**
 * Infer skill level from conversation history
 */
export function inferSkillLevel(inputs: string[]): SkillLevel {
  const combined = inputs.join(' ').toLowerCase();
  
  // Check in reverse order (expert → beginner)
  for (const signal of SKILL_SIGNALS.expert) {
    if (signal.test(combined)) return 'expert';
  }
  for (const signal of SKILL_SIGNALS.experienced) {
    if (signal.test(combined)) return 'experienced';
  }
  for (const signal of SKILL_SIGNALS.beginner) {
    if (signal.test(combined)) return 'beginner';
  }
  
  return 'intermediate'; // Default assumption
}

/**
 * Get adaptation instructions for a skill level
 */
export function getSkillAdaptation(level: SkillLevel): string {
  const profile = SKILL_PROFILES[level];
  
  return `## User Skill Adaptation

**Detected Level**: ${level.charAt(0).toUpperCase() + level.slice(1)}

**Explanation Depth**: ${profile.adaptations.explanationDepth}

**Assumed Knowledge**: ${profile.adaptations.assumedKnowledge.join(', ')}

**Code Style**: ${profile.adaptations.codeStyle}

Remember: Never dumb down quality. Only adjust explanation depth.`;
}