/**
 * ALFRED DNA TEST SUITE
 * 
 * Constitutional tests that verify Alfred's behavior matches its DNA.
 * These tests are not about implementation — they're about identity.
 * 
 * If these tests fail, Alfred has drifted from its constitution.
 */

import { describe, it, expect } from 'vitest';

import {
  DNA_VERSION,
  DNA_CODENAME,
  isCompatible,
  getDNAFingerprint,
} from './VERSION';

import { IDENTITY } from './identity';
import { PHILOSOPHY } from './philosophy';
import { VOICE } from './voice';
import { STANDARDS } from './standards';
import { FACETS, detectFacet, compileFacets } from './facets';
import { SKILL_PROFILES, inferSkillLevel } from './skills';
import { BOUNDARIES } from './boundaries';
import { OUTPUT_CONTRACTS, validateCodeBlock } from './output';
import {
  buildSystemPrompt,
  buildMinimalPrompt,
  compactPrompt,
  estimateTokens,
} from './promptBuilder';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('DNA Version', () => {
  it('has a valid semantic version', () => {
    expect(DNA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has a codename', () => {
    expect(DNA_CODENAME.length).toBeGreaterThan(0);
  });

  it('generates consistent fingerprints', () => {
    const fp1 = getDNAFingerprint();
    const fp2 = getDNAFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp1).toContain(DNA_VERSION);
  });

  it('handles version compatibility', () => {
    expect(isCompatible('1.0.0')).toBe(true);
    expect(isCompatible('2.0.0')).toBe(true);
    expect(isCompatible('99.0.0')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Identity', () => {
  it('has a name', () => {
    expect(IDENTITY.name).toBe('Alfred');
  });

  it('has a clear essence', () => {
    expect(IDENTITY.essence).toContain('architect');
    expect(IDENTITY.essence).toContain('taste');
  });

  it('declaration does not contain sycophantic language', () => {
    const sycophancy = [
      'happy to help',
      'glad to assist',
      'certainly',
      'of course',
    ];
    
    sycophancy.forEach(phrase => {
      expect(IDENTITY.declaration.toLowerCase()).not.toContain(phrase);
    });
  });

  it('declares what Alfred is NOT', () => {
    expect(IDENTITY.antiPatterns.length).toBeGreaterThan(0);
    expect(IDENTITY.antiPatterns).toContain('A chatbot that performs tricks');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHILOSOPHY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Philosophy', () => {
  it('has defined beliefs', () => {
    expect(PHILOSOPHY.beliefs.length).toBeGreaterThanOrEqual(5);
  });

  it('each belief has principle and meaning', () => {
    PHILOSOPHY.beliefs.forEach(belief => {
      expect(belief.principle.length).toBeGreaterThan(0);
      expect(belief.meaning.length).toBeGreaterThan(0);
    });
  });

  it('has ordered priorities', () => {
    expect(PHILOSOPHY.priorities[0]).toBe('Correctness');
    expect(PHILOSOPHY.priorities).toContain('Simplicity');
  });

  it('has non-negotiables', () => {
    expect(PHILOSOPHY.nonNegotiables.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Voice', () => {
  it('has core attributes', () => {
    expect(VOICE.attributes.concise).toBeDefined();
    expect(VOICE.attributes.confident).toBeDefined();
    expect(VOICE.attributes.direct).toBeDefined();
  });

  it('has forbidden phrases', () => {
    expect(VOICE.forbidden.length).toBeGreaterThan(5);
    expect(VOICE.forbidden).toContain('Great question!');
    expect(VOICE.forbidden).toContain('I\'d be happy to help!');
  });

  it('greeting is minimal', () => {
    VOICE.greeting.examples.forEach(greeting => {
      expect(greeting.split('\n').length).toBe(1); // One line
      expect(greeting.length).toBeLessThan(50); // Short
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FACETS TESTS (Unified Mind)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Facets', () => {
  it('has exactly 3 facets', () => {
    expect(Object.keys(FACETS)).toHaveLength(3);
  });

  it('has build, teach, and review', () => {
    expect(FACETS.build).toBeDefined();
    expect(FACETS.teach).toBeDefined();
    expect(FACETS.review).toBeDefined();
  });

  it('build is the default facet', () => {
    expect(detectFacet('hello')).toBe('build');
    expect(detectFacet('')).toBe('build');
    expect(detectFacet('make a dashboard')).toBe('build');
  });

  it('each facet has required properties', () => {
    Object.values(FACETS).forEach(facet => {
      expect(facet.id).toBeDefined();
      expect(facet.essence).toBeDefined();
      expect(facet.when.length).toBeGreaterThan(0);
      expect(facet.behaviors.length).toBeGreaterThan(0);
      expect(facet.voiceShift).toBeDefined();
    });
  });

  it('detects facets from input', () => {
    expect(detectFacet('build a dashboard')).toBe('build');
    expect(detectFacet('why does this work')).toBe('teach');
    expect(detectFacet('explain how hooks work')).toBe('teach');
    expect(detectFacet('review my code')).toBe('review');
    expect(detectFacet('is this correct')).toBe('review');
  });

  it('defaults to build for ambiguous input', () => {
    expect(detectFacet('hello')).toBe('build');
    expect(detectFacet('')).toBe('build');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKILLS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Skills', () => {
  it('has 4 skill levels', () => {
    expect(Object.keys(SKILL_PROFILES)).toHaveLength(4);
  });

  it('infers skill level from conversation', () => {
    expect(inferSkillLevel(['what does useState mean?'])).toBe('beginner');
    expect(inferSkillLevel(['what\'s the best way to handle state?'])).toBe('intermediate');
    expect(inferSkillLevel(['optimize performance architecture'])).toBe('experienced');
  });

  it('defaults to intermediate', () => {
    expect(inferSkillLevel(['random text'])).toBe('intermediate');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARIES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Boundaries', () => {
  it('has defined boundaries', () => {
    expect(BOUNDARIES.length).toBeGreaterThan(5);
  });

  it('each boundary has required properties', () => {
    BOUNDARIES.forEach(boundary => {
      expect(boundary.id).toBeDefined();
      expect(boundary.rule).toBeDefined();
      expect(boundary.reason).toBeDefined();
    });
  });

  it('includes critical boundaries', () => {
    const ids = BOUNDARIES.map(b => b.id);
    expect(ids).toContain('no-hallucination');
    expect(ids).toContain('no-sycophancy');
    expect(ids).toContain('no-mediocrity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Output Contracts', () => {
  it('has contracts for code, review, and explanation', () => {
    expect(OUTPUT_CONTRACTS.code).toBeDefined();
    expect(OUTPUT_CONTRACTS.review).toBeDefined();
    expect(OUTPUT_CONTRACTS.explanation).toBeDefined();
  });

  it('code contract forbids placeholders', () => {
    expect(OUTPUT_CONTRACTS.code.forbidden).toContain(
      'Placeholder comments like "// add logic here"'
    );
  });

  it('validates code blocks', () => {
    const good = validateCodeBlock('const x = 1;', 'ts');
    expect(good.isValid).toBe(true);

    const bad = validateCodeBlock('// add logic here', 'ts');
    expect(bad.isValid).toBe(false);
    expect(bad.issues).toContain('Contains placeholder comments');
  });

  it('detects unbalanced braces', () => {
    const unbalanced = validateCodeBlock('function x() { if (true) {', 'ts');
    expect(unbalanced.isValid).toBe(false);
    expect(unbalanced.issues[0]).toContain('Unbalanced braces');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Prompt Builder', () => {
  it('builds a complete system prompt', () => {
    const prompt = buildSystemPrompt();
    
    expect(prompt).toContain('Alfred');
    expect(prompt).toContain('architect');
    expect(prompt).toContain('Unified Mind'); // Facets system
  });

  it('includes DNA version in prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(DNA_VERSION);
  });

  it('includes unified facets', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('BUILD');
    expect(prompt).toContain('TEACH');
    expect(prompt).toContain('REVIEW');
  });

  it('includes skill adaptation', () => {
    const beginnerPrompt = buildSystemPrompt({ skillLevel: 'beginner' });
    expect(beginnerPrompt).toContain('Beginner');
  });

  it('builds minimal prompts', () => {
    const minimal = buildMinimalPrompt();
    const full = buildSystemPrompt();
    
    expect(minimal.length).toBeLessThan(full.length);
    expect(minimal).toContain('Alfred');
  });

  it('estimates tokens reasonably', () => {
    const prompt = buildSystemPrompt();
    const tokens = estimateTokens(prompt);
    
    expect(tokens).toBeGreaterThan(500);
    expect(tokens).toBeLessThan(15000);
  });

  it('compacts prompts to fit budget', () => {
    const full = buildSystemPrompt();
    const fullTokens = estimateTokens(full);
    
    const compacted = compactPrompt(full, 500);
    const compactedTokens = estimateTokens(compacted);
    
    expect(compactedTokens).toBeLessThanOrEqual(800);
    expect(compacted).toContain('Alfred'); // Still has identity
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('DNA Integration', () => {
  it('produces consistent prompts', () => {
    const prompt1 = buildSystemPrompt();
    const prompt2 = buildSystemPrompt();
    
    expect(prompt1).toBe(prompt2);
  });

  it('unified mind contains all facets', () => {
    const prompt = buildSystemPrompt();
    
    // All facets present in unified mind
    expect(prompt).toContain('BUILD');
    expect(prompt).toContain('TEACH');
    expect(prompt).toContain('REVIEW');
    expect(prompt).toContain('Unified Mind');
  });

  it('context is injected correctly', () => {
    const prompt = buildSystemPrompt({
      context: {
        project: {
          name: 'TestProject',
          stack: { framework: 'Next.js' },
        },
      },
    });
    
    expect(prompt).toContain('TestProject');
    expect(prompt).toContain('Next.js');
  });

  it('documents forbidden phrases in prompts', () => {
    const prompt = buildSystemPrompt();
    
    // Forbidden phrases appear in "What Alfred Never Says" section as examples
    expect(prompt).toContain('What Alfred Never Says');
    expect(prompt).toContain('Great question!'); // Listed as example of what NOT to say
  });

  it('includes professional process', () => {
    const prompt = buildSystemPrompt();
    
    expect(prompt).toContain('Discovery');
    expect(prompt).toContain('Architecture');
    expect(prompt).toContain('Validation');
  });

  it('includes design system', () => {
    const prompt = buildSystemPrompt();
    
    expect(prompt).toContain('Design System');
    expect(prompt).toContain('Typography');
    expect(prompt).toContain('Spacing');
  });
});