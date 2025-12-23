/**
 * Modes
 *
 * Alfred's three operational modes.
 * Mode routing and inference logic.
 */

import type { AlfredMode, ModeConfig, Message, SkillLevel } from './types';

// ============================================================================
// MODE DEFINITIONS
// ============================================================================

export const MODES: Record<AlfredMode, ModeConfig> = {
  builder: {
    name: 'builder',
    description: 'Get things done efficiently. Minimal explanation. Production-ready output.',
    voiceCharacteristics: ['direct', 'concise', 'confident'],
    defaultBehavior: [
      'Assumes competence',
      'Moves fast',
      'Minimal explanation unless asked',
      'Like a senior engineer pairing with another senior',
    ],
  },
  mentor: {
    name: 'mentor',
    description: 'Teach through building. Explains the why. Names patterns.',
    voiceCharacteristics: ['clear', 'instructive', 'never condescending'],
    defaultBehavior: [
      'Explains the why behind decisions',
      'Names patterns and principles',
      'Shows alternatives when relevant',
      'Still concise — no lectures',
    ],
  },
  reviewer: {
    name: 'reviewer',
    description: 'Critique and improve existing work. Brutally honest, constructive.',
    voiceCharacteristics: ['precise', 'surgical', 'respectful but unsparing'],
    defaultBehavior: [
      'Reviews against standards',
      'Prioritizes feedback (critical → important → optional)',
      'Offers concrete fixes, not vague complaints',
      'Identifies architecture issues, clarity problems, missed patterns',
    ],
  },
};

// ============================================================================
// MODE INFERENCE
// ============================================================================

interface InferenceResult {
  mode: AlfredMode;
  confidence: number;
}

/**
 * Infers the appropriate mode based on user message.
 * Returns mode and confidence score, or null iot infer.
 */
export function inferMode(message: string): InferenceResult | null {
  const lower = message.toLowerCase();

  // Check for code paste (likely review)
  const hasCodeBlock = message.includes('```') ||
    /function\s+\w+\s*\(/.test(message) ||
    /const\s+\w+\s*=/.test(message);

  if (hasCodeBlock) {
    return { mode: 'reviewer', confidence: 0.85 };
  }

  // Reviewer signals
  const reviewerPatterns = ['review', 'critique', 'check this', 'what do you think'];
  for (const pattern of reviewerPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'reviewer', confidence: 0.9 };
    }
  }

  // Mentor signals
  const mentorPatterns = ['explain', 'why', 'teach', 'how does', 'what is'];
  for (const pattern of mentorPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'mentor', confidence: 0.8 };
    }
  }

  // Builder signals
  const builderPatterns = ['build', 'create', 'make', 'generate', 'implement', 'scaffold'];
  for (const pattern of builderPatterns) {
    if (lower.includes(pattern)) {
      return { mode: 'builder', confidence: 0.85 };
    }
  }

  // Cannot infer confidently
  return null;
}

/**
 * Infers skill level from message patterns.
 */
export function inferSkillLevel(messages: Message[]): SkillLevel {
  if (messages.length === 0) {
    return 'inferred';
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const combinedText = userMessages.map(m => m.content).join(' ').toLowerCase();

  const experiencedSignals = [
    'architecture', 'refactor', 'dependency injection', 'composition',
    'abstraction', 'interface', 'type system', 'monorepo', 'ci/cd',
    'deployment', 'optimization', 'complexity', 'tradeoff', 'scalability',
  ];

  const beginnerSignals = [
    'how do i', 'what is', "don't understand", "doesn't work",
    'error', 'help me', 'tutorial', 'beginner', 'new to', 'first time',
  ];

  const experiencedScore = experiencedSignals.filter(s => combinedText.includes(s)).length;
  const beginnerScore = beginnerSignals.filter(s => combinedText.includes(s)).length;

  if (experiencedScore >= 3) return 'experienced';
  if (experiencedScore >= 2 && beginnerScore === 0) return 'experienced';
  if (beginnerScore >= 2 && experiencedScore < 2) return 'beginner';

  return 'intermediate';
}

// ============================================================================
// MODE SWITCHING
// ============================================================================

/**
 * Generates mode switch announcement.
 * Alfred never switches modes silently.
 */
export function announceModeSwtich(to: AlfredMode, reason?: string): string {
  const announcements: Record<AlfredMode, string> = {
    builder: 'Switching to Builder mode.',
    mentor: 'Switching to Mentor mode to explain this.',
    reviewer: 'Entering Reviewer mode.',
  };

  const base = announcements[to];
  return reason ? `${base} ${reason}` : base;
}

/**
 * Determines if a mode switch is appropriate.
 */
export function shouldSwitchMode(
  currentMode: AlfredMode,
  message: string
): { shouldSwitch: boolean; suggestedMode?: AlfredMode; reason?: string } {
  const inferred = inferMode(message);

  if (!inferred) {
    return { shouldSwitch: false };
  }

  if (inferred.mode === currentMode) {
    return { shouldSwitch: false };
  }

  if (inferred.confidence >= 0.8) {
    return {
      shouldSwitch: true,
      suggestedMode: inferred.mode,
      reason: `User intent suggests ${inferred.mode} mode.`,
    };
  }

  return { shouldSwitch: false };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const DEFAULT_MODE: AlfredMode = 'builder';
