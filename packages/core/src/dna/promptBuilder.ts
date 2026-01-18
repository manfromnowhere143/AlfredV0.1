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
import {
  compileDesignSystem,
  INTERACTION_STATES,
  RESPONSIVE,
  ACCESSIBILITY,
  LAYOUT,
  MOTION,
} from './designSystem';
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

/**
 * Compiles DNA design system into a format ready for system prompt injection.
 * This MUST be included in every code generation prompt for Apple-quality output.
 */
export function compileDNAForPrompt(): string {
  return `
## ═══════════════════════════════════════════════════════════════════════════
## MANDATORY DESIGN SYSTEM - USE THESE EXACT VALUES
## Arbitrary values are FORBIDDEN. Use only these patterns.
## ═══════════════════════════════════════════════════════════════════════════

### INTERACTION STATES (Apply to ALL interactive elements)

**Button Pattern:**
\`${INTERACTION_STATES.tailwind.button}\`

**Card Pattern:**
\`${INTERACTION_STATES.tailwind.card}\`

**Interactive Element Pattern:**
\`${INTERACTION_STATES.tailwind.interactive}\`

**Link Pattern:**
\`${INTERACTION_STATES.tailwind.link}\`

**Individual States:**
- Hover: \`${INTERACTION_STATES.tailwind.hover}\`
- Active: \`${INTERACTION_STATES.tailwind.active}\`
- Disabled: \`${INTERACTION_STATES.tailwind.disabled}\`
- Focus: \`${INTERACTION_STATES.tailwind.focusVisible}\`
- Loading: \`${INTERACTION_STATES.tailwind.loading}\`
- Error: \`${INTERACTION_STATES.tailwind.error}\`
- Success: \`${INTERACTION_STATES.tailwind.success}\`

### RESPONSIVE DESIGN (Mobile-First)

**Breakpoints:**
- sm: ${RESPONSIVE.breakpoints.sm} (phones landscape)
- md: ${RESPONSIVE.breakpoints.md} (tablets)
- lg: ${RESPONSIVE.breakpoints.lg} (laptops)
- xl: ${RESPONSIVE.breakpoints.xl} (desktops)
- 2xl: ${RESPONSIVE.breakpoints['2xl']} (large screens)

**Fluid Typography (USE THESE):**
- Hero: \`${RESPONSIVE.fluidTypography.hero}\`
- Title: \`${RESPONSIVE.fluidTypography.title}\`
- Heading: \`${RESPONSIVE.fluidTypography.heading}\`
- Body: \`${RESPONSIVE.fluidTypography.body}\`
- Small: \`${RESPONSIVE.fluidTypography.small}\`

**Device Patterns:**
- Mobile: \`${RESPONSIVE.patterns.mobile.padding}\` + \`${RESPONSIVE.patterns.mobile.touchTarget}\`
- Tablet: \`${RESPONSIVE.patterns.tablet.padding}\` + \`${RESPONSIVE.patterns.tablet.columns}\`
- Desktop: \`${RESPONSIVE.patterns.desktop.padding}\` + \`${RESPONSIVE.patterns.desktop.maxWidth}\`

### ACCESSIBILITY (WCAG AAA Required)

**Focus Management:**
\`${ACCESSIBILITY.focus.ring}\`

**Screen Reader:**
- Hidden but accessible: \`${ACCESSIBILITY.screenReader.only}\`
- Skip link: \`${ACCESSIBILITY.focus.skipLink}\`

**Reduced Motion:**
\`${ACCESSIBILITY.motion.respectPreference}\`

### LAYOUT PATTERNS

**Container:**
\`${LAYOUT.patterns.container}\`

**Flex Patterns:**
- Center: \`${LAYOUT.patterns.flexCenter}\`
- Between: \`${LAYOUT.patterns.flexBetween}\`
- Column: \`${LAYOUT.patterns.flexCol}\`

**Stack Patterns:**
- Default: \`${LAYOUT.patterns.stack}\`
- Tight: \`${LAYOUT.patterns.stackTight}\`
- Loose: \`${LAYOUT.patterns.stackLoose}\`

**Section Spacing:**
- Hero: \`${LAYOUT.sections.hero}\`
- Section: \`${LAYOUT.sections.section}\`

**Z-Index Scale:**
dropdown: ${LAYOUT.zIndex.dropdown}, modal: ${LAYOUT.zIndex.modal}, tooltip: ${LAYOUT.zIndex.tooltip}, toast: ${LAYOUT.zIndex.toast}

### MOTION & ANIMATION

**Easing:**
- Spring: \`${MOTION.easing.spring}\`
- Smooth: \`${MOTION.easing.smooth}\`

**Durations:**
- Hover: ${MOTION.duration.hover}
- Active: ${MOTION.duration.active}
- Enter: ${MOTION.duration.enter}
- Exit: ${MOTION.duration.exit}

**Presets:**
- Fade In: \`${MOTION.presets.fadeIn}\`
- Scale In: \`${MOTION.presets.scaleIn}\`
- Slide In: \`${MOTION.presets.slideInFromBottom}\`

**Micro-interactions:**
- Button Press: \`${MOTION.micro.buttonPress}\`
- Card Hover: \`${MOTION.micro.cardHover}\`

### ⛔ FORBIDDEN PATTERNS - NEVER USE

**Arbitrary Spacing:**
❌ gap-[13px] → ✅ gap-3 (12px) or gap-4 (16px)
❌ p-[17px] → ✅ p-4 (16px) or p-5 (20px)
❌ m-[23px] → ✅ m-6 (24px)

**Arbitrary Typography:**
❌ text-[15px] → ✅ text-sm (14px) or text-base (16px)
❌ text-[19px] → ✅ text-lg (18px) or text-xl (20px)

**Arbitrary Colors:**
❌ bg-[#1a1a1a] → ✅ bg-[#0a0a0a] or bg-white/5
❌ bg-[#2a2a2a] → ✅ bg-white/10
❌ text-[#888] → ✅ text-gray-400

**Arbitrary Border Radius:**
❌ rounded-[10px] → ✅ rounded-lg (8px) or rounded-xl (12px)

**Missing States:**
❌ Button without hover/active/focus states
❌ Card without hover elevation
❌ Input without focus ring
❌ Interactive element without disabled state

## ═══════════════════════════════════════════════════════════════════════════
## ENFORCEMENT: Before outputting ANY code, verify:
## 1. All interactive elements have hover/active/focus/disabled states
## 2. All spacing uses Tailwind scale (gap-4, p-6, not gap-[17px])
## 3. All colors from palette (white/10, gray-400, not #888)
## 4. All animations have proper easing and durations
## 5. Reduced motion is respected with motion-reduce: classes
## ═══════════════════════════════════════════════════════════════════════════
`;
}