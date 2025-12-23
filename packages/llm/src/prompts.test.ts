/**
 * Prompts Tests
 *
 * Verifies system prompt generation and templates.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  renderTemplate,
  suggestMode,
  PROMPT_VERSION,
  PROMPT_TEMPLATES,
} from './prompts';
import type { AlfredContext } from './types';

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

describe('buildSystemPrompt', () => {
  it('includes core identity', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Alfred');
    expect(prompt).toContain('BUILDER');
    expect(prompt).toContain('MENTOR');
    expect(prompt).toContain('REVIEWER');
  });

  it('includes mode-specific instructions for builder', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('CURRENT MODE: BUILDER');
    expect(prompt).toContain('production-quality code');
  });

  it('includes mode-specific instructions for mentor', () => {
    const context: AlfredContext = {
      mode: 'mentor',
      skillLevel: 'beginner',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('CURRENT MODE: MENTOR');
    expect(prompt).toContain('Teach');
  });

  it('includes mode-specific instructions for reviewer', () => {
    const context: AlfredContext = {
      mode: 'reviewer',
      skillLevel: 'experienced',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('CURRENT MODE: REVIEWER');
    expect(prompt).toContain('surgical precision');
  });

  it('adapts to skill level', () => {
    const beginnerContext: AlfredContext = {
      mode: 'builder',
      skillLevel: 'beginner',
    };

    const expertContext: AlfredContext = {
      mode: 'builder',
      skillLevel: 'experienced',
    };

    const beginnerPrompt = buildSystemPrompt(beginnerContext);
    const expertPrompt = buildSystemPrompt(expertContext);

    expect(beginnerPrompt).toContain('BEGINNER');
    expect(beginnerPrompt).toContain('fundamental concepts');

    expect(expertPrompt).toContain('EXPERIENCED');
    expect(expertPrompt).toContain('concise');
  });

  it('includes project context when provided', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
      projectContext: {
        name: 'MyApp',
        type: 'web_app',
        stack: {
          frontend: ['React', 'TypeScript'],
          backend: ['Node.js'],
        },
      },
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('PROJECT CONTEXT');
    expect(prompt).toContain('MyApp');
    expect(prompt).toContain('React');
  });

  it('includes memory context when provided', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
      memoryContext: {
        preferences: ['Prefers TypeScript', 'Likes functional style'],
        skillSignals: ['Strong with React'],
        recentInteractions: [],
      },
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('USER CONTEXT');
    expect(prompt).toContain('Prefers TypeScript');
  });

  it('includes RAG context when provided', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
      ragContext: {
        relevantChunks: [
          { content: 'Example code here', source: 'patterns.md', score: 0.9 },
        ],
      },
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('RELEVANT KNOWLEDGE');
    expect(prompt).toContain('Example code here');
    expect(prompt).toContain('patterns.md');
  });

  it('includes response guidelines', () => {
    const context: AlfredContext = {
      mode: 'builder',
      skillLevel: 'intermediate',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('RESPONSE GUIDELINES');
    expect(prompt).toContain('markdown');
  });
});

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

describe('renderTemplate', () => {
  it('replaces variables', () => {
    const template = 'Hello {{name}}, you are {{age}} years old.';
    const result = renderTemplate(template, { name: 'Alice', age: '30' });

    expect(result).toBe('Hello Alice, you are 30 years old.');
  });

  it('handles missing variables', () => {
    const template = 'Hello {{name}}!';
    const result = renderTemplate(template, {});

    expect(result).toBe('Hello !');
  });

  it('handles conditionals with truthy values', () => {
    const template = '{{#if context}}Context: {{context}}{{/if}}';
    const result = renderTemplate(template, { context: 'Some context' });

    expect(result).toBe('Context: Some context');
  });

  it('handles conditionals with falsy values', () => {
    const template = '{{#if context}}Context: {{context}}{{/if}}';
    const result = renderTemplate(template, { context: '' });

    expect(result).toBe('');
  });

  it('handles complex template', () => {
    const template = PROMPT_TEMPLATES.codeReview;
    const result = renderTemplate(template, {
      language: 'typescript',
      code: 'const x = 1;',
      context: 'Performance critical',
    });

    expect(result).toContain('typescript');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('Performance critical');
  });
});

// ============================================================================
// MODE SUGGESTION
// ============================================================================

describe('suggestMode', () => {
  it('suggests builder for build keywords', () => {
    expect(suggestMode('Build me a login form')).toBe('builder');
    expect(suggestMode('Create a new component')).toBe('builder');
    expect(suggestMode('Implement the API endpoint')).toBe('builder');
    expect(suggestMode('Write a function that sorts')).toBe('builder');
    expect(suggestMode('Fix this bug')).toBe('builder');
  });

  it('suggests mentor for learning keywords', () => {
    expect(suggestMode('Explain how React hooks work')).toBe('mentor');
    expect(suggestMode('Why does this pattern exist?')).toBe('mentor');
    expect(suggestMode('How does the event loop work?')).toBe('mentor');
    expect(suggestMode('What is a closure?')).toBe('mentor');
    expect(suggestMode('Teach me about TypeScript generics')).toBe('mentor');
  });

  it('suggests reviewer for review keywords', () => {
    expect(suggestMode('Review this code')).toBe('reviewer');
    expect(suggestMode('Check my implementation')).toBe('reviewer');
    expect(suggestMode('Analyze this function')).toBe('reviewer');
    expect(suggestMode('Give me feedback on this')).toBe('reviewer');
  });

  it('returns null for ambiguous messages', () => {
    expect(suggestMode('Hello')).toBeNull();
    expect(suggestMode('Thanks')).toBeNull();
    expect(suggestMode('OK')).toBeNull();
  });
});

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

describe('PROMPT_TEMPLATES', () => {
  it('has codeReview template', () => {
    expect(PROMPT_TEMPLATES.codeReview).toBeDefined();
    expect(PROMPT_TEMPLATES.codeReview).toContain('{{language}}');
    expect(PROMPT_TEMPLATES.codeReview).toContain('{{code}}');
  });

  it('has architecture template', () => {
    expect(PROMPT_TEMPLATES.architecture).toBeDefined();
    expect(PROMPT_TEMPLATES.architecture).toContain('{{requirements}}');
  });

  it('has explain template', () => {
    expect(PROMPT_TEMPLATES.explain).toBeDefined();
    expect(PROMPT_TEMPLATES.explain).toContain('{{topic}}');
    expect(PROMPT_TEMPLATES.explain).toContain('{{skillLevel}}');
  });

  it('has debug template', () => {
    expect(PROMPT_TEMPLATES.debug).toBeDefined();
    expect(PROMPT_TEMPLATES.debug).toContain('{{error}}');
  });
});

// ============================================================================
// PROMPT VERSION
// ============================================================================

describe('PROMPT_VERSION', () => {
  it('is defined', () => {
    expect(PROMPT_VERSION).toBeDefined();
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
