/**
 * Prompts
 *
 * System prompts for Alfred's modes.
 * Versioned, templated, tested.
 */

import type { AlfredContext } from './types';
import type { AlfredMode, SkillLevel } from '@alfred/core';

// ============================================================================
// PROMPT VERSION
// ============================================================================

export const PROMPT_VERSION = '1.0.0';

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

export function buildSystemPrompt(context: AlfredContext): string {
  const parts: string[] = [];

  parts.push(CORE_IDENTITY);
  parts.push(getModePrompt(context.mode));
  parts.push(getSkillLevelPrompt(context.skillLevel));

  if (context.projectContext) {
    parts.push(buildProjectContext(context.projectContext));
  }

  if (context.memoryContext) {
    parts.push(buildMemoryContext(context.memoryContext));
  }

  if (context.ragContext && context.ragContext.relevantChunks.length > 0) {
    parts.push(buildRAGContext(context.ragContext));
  }

  parts.push(RESPONSE_GUIDELINES);

  return parts.join('\n\n');
}

// ============================================================================
// CORE IDENTITY
// ============================================================================

const CORE_IDENTITY = `You are Alfred, an AI architect and development partner.

You have three modes:
- BUILDER: Execute with precision. Write code. Ship features.
- MENTOR: Teach through building. Explain the why, not just the what.
- REVIEWER: Analyze with surgical precision. Find issues. Suggest fixes.

Your personality:
- Minimal words, maximum clarity
- No filler phrases or excessive pleasantries
- Direct but not rude
- Confident but open to correction
- You build with the user, not for the user`;

// ============================================================================
// MODE PROMPTS
// ============================================================================

const MODE_PROMPTS: Record<AlfredMode, string> = {
  builder: `CURRENT MODE: BUILDER

In Builder mode, you:
- Write production-quality code immediately
- Ask clarifying questions only when truly ambiguous
- Default to best practices without explaining them
- Ship incrementally — working code over perfect code`,

  mentor: `CURRENT MODE: MENTOR

In Mentor mode, you:
- Teach through the process of building
- Explain WHY, not just WHAT
- Use analogies appropriate to the user's skill level
- Build understanding before building code`,

  reviewer: `CURRENT MODE: REVIEWER

In Reviewer mode, you:
- Analyze code with surgical precision
- Prioritize issues by severity: critical > important > optional
- Provide specific, actionable fixes
- Acknowledge what's done well`,
};

function getModePrompt(mode: AlfredMode): string {
  return MODE_PROMPTS[mode];
}

// ==========================================================================
// SKILL LEVEL PROMPTS
// ============================================================================

const SKILL_LEVEL_PROMPTS: Record<SkillLevel, string> = {
  beginner: `USER SKILL LEVEL: BEGINNER

Adapt your responses:
- Explain fundamental concepts when relevant
- Avoid jargon or define it when used
- Provide more context for code examples`,

  intermediate: `USER SKILL LEVEL: INTERMEDIATE

Adapt your responses:
- Assume familiarity with common patterns
- Focus on best practices and trade-offs
- Challenge them to think through problems`,

  experienced: `USER SKILL LEVEL: EXPERIENCED

Adapt your responses:
- Be concise — they know the basics
- Focus on nuance and edge cases
- Engage as a peer`,

  inferred: `USER SKILL LEVEL: INFERRED

You're still learning this user's skill level.
- Start with intermediate assumptions
- Adjust based on their questions and code`,
};

function getSkillLevelPrompt(level: SkillLevel): string {
  return SKILL_LEVEL_PROMPTS[level];
}

// ==========================================================================
// CONTEXT BUILDERS
// ============================================================================

function buildProjectContext(project: AlfredContext['projectContext']): string {
  if (!project) return '';

  const lines = ['PROJECT CONTEXT:'];
  lines.push(`Name: ${project.name}`);
  lines.push(`Type: ${project.type}`);

  if (project.stack) {
    const stackParts: string[] = [];
    if (project.stack.frontend?.length) {
      stackParts.push(`Frontend: ${project.stack.frontend.join(', ')}`);
    }
    if (project.stack.backend?.length) {
      stackParts.push(`Backend: ${project.stack.backend.join(', ')}`);
    }
    if (stackParts.length) {
      lines.push(`Stack: ${stackParts.join(' | ')}`);
    }
  }

  return lines.join('\n');
}

function buildMemoryContext(memory: AlfredContext['memoryContext']): string {
  if (!memory) return '';

  const lines = ['USER CONTEXT (from memory):'];

  if (memory.preferences.length) {
    lines.push(`Preferences: ${memory.preferences.slice(0, 5).join('; ')}`);
  }

  return lines.join('\n');
}

function buildRAGContext(rag: AlfredContext['ragContext']): string {
  if (!rag || !rag.relevantChunks.length) return '';

  const lines = ['RELEVANT KNOWLEDGE:'];

  for (const chunk of rag.relevantChunks.slice(0, 5)) {
    lines.push(`---`);
    lines.push(`Source: ${chunk.source}`);
    lines.push(chunk.content.slice(0, 500));
  }

  return lines.join('\n');
}

// ============================================================================
// RESPONSE GUIDELINES
// ============================================================================

const RESPONSE_GUIDELINES = `RESPONSE GUIDELINES:

Format:
- Use markdown for code blocks
- Keep paragraphs short

Code:
- Always specify language in code blocks
- Include necessary imports
- Use TypeScript unless user specifies otherwise`;

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPT_TEMPLATES = {
  codeReview: `Review the following code. Focus on:
1. Critical issues (bugs, security, data loss)
2. Important issues (performance, maintainability)
3. Optional improvements

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\`

{{#if context}}
Context: {{context}}
{{/if}}`,

  architecture: `Design the architecture for: {{requirements}}

{{#if constraints}}
Constraints: {{constraints}}
{{/if}}`,

  explain: `Explain {{topic}} to someone with {{skillLevel}} experience.`,

  debug: `Help debug this issue:

Error: {{error}}

Code:
\`\`\`{{language}}
{{code}}
\`\`\``,
};

// ============================================================================
// TEMPLATE RENDERER
// ============================================================================

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;

  // Replace all {{key}} with value or empty string
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');

  // Handle conditionals
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => (variables[key] ? content : '')
  );

  return result.trim();
}

// ============================================================================
// MODE DETECTION
// ============================================================================

export function suggestMode(userMessage: string): AlfredMode | null {
  const lower = userMessage.toLowerCase();

  // Reviewer signals (check first - more specific)
  const reviewerKeywords = ['review', 'check', 'analyze', 'feedback', 'issues'];
  if (reviewerKeywords.some(k => lower.includes(k))) {
    return 'reviewer';
  }

  // Mentor signals
  const mentorKeywords = ['explain', 'why', 'how does', 'what is', 'teach', 'learn', 'understand'];
  if (mentorKeywords.some(k => lower.includes(k))) {
    return 'mentor';
  }

  // Builder signals (last - most general)
  const builderKeywords = ['build', 'create', 'implement', 'write', 'add', 'make', 'fix', 'improve'];
  if (builderKeywords.some(k => lower.includes(k))) {
    return 'builder';
  }

  return null;
}
