/**
 * ALFRED PROMPT BUILDER
 * 
 * Assembles the complete system prompt from DNA components.
 * This is the only place where DNA becomes a prompt.
 * 
 * The builder is declarative — it composes, never hardcodes.
 */

import { DNA_VERSION, DNA_CODENAME } from './VERSION';
import { IDENTITY } from './identity';
import { compilePhilosophy } from './philosophy';
import { compileVoice } from './voice';
import { compileStandards } from './standards';
import { compileFacets } from './facets';
import { getSkillAdaptation, type SkillLevel } from './skills';
import { compileBoundaries } from './boundaries';
import { compileOutputContracts } from './output';
import { compileProcess } from './process';
import { compileDesignSystem } from './designSystem';
import {
  compileProjectContext,
  compileMemoryContext,
  compileUserPreferences,
  type ProjectContext,
  type MemoryContext,
  type UserContext,
} from './context';

/**
 * Configuration for prompt building
 */
/**
 * Configuration for prompt building
 */
export interface PromptConfig {
  readonly skillLevel: SkillLevel;
  readonly includePhilosophy: boolean;
  readonly includeStandards: boolean;
  readonly includeBoundaries: boolean;
  readonly includeOutputContracts: boolean;
  readonly includeProcess: boolean;
  readonly includeDesignSystem: boolean;
  readonly includeFacets: boolean;
  readonly context?: {
    readonly project?: ProjectContext;
    readonly memory?: MemoryContext;
    readonly user?: UserContext;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: PromptConfig = {
  skillLevel: 'intermediate',
  includePhilosophy: true,
  includeStandards: true,
  includeBoundaries: true,
  includeOutputContracts: true,
  includeProcess: true,
  includeDesignSystem: true,
  includeFacets: true,
} as const;

/**
 * Build the complete system prompt
 */
export function buildSystemPrompt(config: Partial<PromptConfig> = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const sections: string[] = [];

  // DNA Version header (for debugging/tracing)
  sections.push(`<!-- Alfred DNA v${DNA_VERSION} (${DNA_CODENAME}) -->`);

  // Core identity (always included)
  sections.push(`# ALFRED\n\n${IDENTITY.declaration}`);

  // Philosophy (optional but recommended)
  if (cfg.includePhilosophy) {
    sections.push(compilePhilosophy());
  }

  // Standards (optional)
  if (cfg.includeStandards) {
    sections.push(compileStandards());
  }

  // Process (professional workflow)
  if (cfg.includeProcess) {
    sections.push(compileProcess());
  }

  // Design System (visual constitution)
  if (cfg.includeDesignSystem) {
    sections.push(compileDesignSystem());
  }

  // Unified Mind / Facets
  if (cfg.includeFacets) {
    sections.push(compileFacets());
  }

  // Skill adaptation
  sections.push(getSkillAdaptation(cfg.skillLevel));

  // Boundaries (optional but recommended)
  if (cfg.includeBoundaries) {
    sections.push(compileBoundaries());
  }

  // Voice
  sections.push(compileVoice());

  // Response style (no LLM formatting)
  sections.push(`# RESPONSE STYLE - CRITICAL

NEVER use in responses:
- Emojis (🚀 ⚡ 🎨 etc)
- Bold markers (**text**)
- Horizontal rules (--- or ***)
- Bullet point lists with dashes
- Numbered lists for features
- Headers like "Groundbreaking Enhancements:"

ALWAYS respond with:
- Natural conversational prose
- Short confident sentences
- Direct and wise tone
- Like a senior architect talking to a peer

Example bad: "🚀 **Feature** - Description"
Example good: "Added mouse tracking for ambient lighting. Keyboard shortcuts work. Clean and fast."`);

  // Output contracts (optional)
  if (cfg.includeOutputContracts) {
    sections.push(compileOutputContracts());
  }

  // Contextual sections (injected, not hardcoded)
  if (cfg.context?.project) {
    sections.push(compileProjectContext(cfg.context.project));
  }
  if (cfg.context?.memory) {
    sections.push(compileMemoryContext(cfg.context.memory));
  }
  if (cfg.context?.user) {
    sections.push(compileUserPreferences(cfg.context.user));
  }

  // Essence (closing statement)
  sections.push(`---

Alfred exists because most software is mediocre.

Not because developers lack skill — but because they lack a clear standard to build against.

Alfred is that standard.`);

  return sections.join('\n\n---\n\n');
}

/**
 * Build a minimal prompt (for constrained contexts)
 */
export function buildMinimalPrompt(): string {
  return `${IDENTITY.declaration}

${compileFacets()}

${compileVoice()}

Be concise. Be correct. Ship quality.`;
}

/**
 * Build a prompt for specific use cases
 */
export const SPECIALIZED_PROMPTS = {
  /**
   * For code review tasks — emphasizes review facet
   */
  codeReview: (): string => buildSystemPrompt({
    includePhilosophy: false,
    includeOutputContracts: true,
  }),

  /**
   * For teaching/explanation tasks — full context for learning
   */
  teaching: (): string => buildSystemPrompt({
    skillLevel: 'beginner',
    includePhilosophy: true,
  }),

  /**
   * For rapid prototyping — minimal overhead
   */
  prototyping: (): string => buildSystemPrompt({
    skillLevel: 'experienced',
    includePhilosophy: false,
    includeStandards: false,
    includeProcess: false,
  }),

  /**
   * For architecture discussions — full depth
   */
  architecture: (): string => buildSystemPrompt({
    skillLevel: 'expert',
    includePhilosophy: true,
    includeStandards: true,
  }),

  /**
   * For UI generation — emphasizes design system
   */
  uiGeneration: (): string => buildSystemPrompt({
    skillLevel: 'experienced',
    includeDesignSystem: true,
    includeProcess: true,
  }),
} as const;

/**
 * Estimate token count for a prompt
 */
export function estimateTokens(prompt: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(prompt.length / 4);
}

/**
 * Compact a prompt to fit within token budget
 */
export function compactPrompt(prompt: string, maxTokens: number): string {
  const estimated = estimateTokens(prompt);
  
  if (estimated <= maxTokens) {
    return prompt;
  }

  // Progressive reduction - build config step by step
  let compact = buildSystemPrompt({ includeDesignSystem: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  compact = buildSystemPrompt({ includeDesignSystem: false, includeProcess: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  compact = buildSystemPrompt({ includeDesignSystem: false, includeProcess: false, includePhilosophy: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  compact = buildSystemPrompt({ includeDesignSystem: false, includeProcess: false, includePhilosophy: false, includeStandards: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  compact = buildSystemPrompt({ includeDesignSystem: false, includeProcess: false, includePhilosophy: false, includeStandards: false, includeBoundaries: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  compact = buildSystemPrompt({ includeDesignSystem: false, includeProcess: false, includePhilosophy: false, includeStandards: false, includeBoundaries: false, includeOutputContracts: false });
  if (estimateTokens(compact) <= maxTokens) return compact;

  // Last resort: minimal prompt
  return buildMinimalPrompt();
}