/**
 * Mode Tests
 *
 * Verifies mode inference and switching logic.
 */

import { describe, it, expect } from 'vitest';
import {
  MODES,
  DEFAULT_MODE,
  inferMode,
  inferSkillLevel,
  announceModeSwtich,
  shouldSwitchMode,
} from './modes';
import type { Message } from './types';

// ============================================================================
// MODE DEFINITIONS
// ============================================================================

describe('MODES', () => {
  it('defines all three modes', () => {
    expect(MODES.builder).toBeDefined();
    expect(MODES.mentor).toBeDefined();
    expect(MODES.reviewer).toBeDefined();
  });

  it('builder is the default mode', () => {
    expect(DEFAULT_MODE).toBe('builder');
  });

  it('each mode has required properties', () => {
    Object.values(MODES).forEach(mode => {
      expect(mode.name).toBeDefined();
      expect(mode.description).toBeDefined();
      expect(mode.voiceCharacteristics).toBeInstanceOf(Array);
      expect(mode.defaultBehavior).toBeInstanceOf(Array);
    });
  });
});

// ============================================================================
// MODE INFERENCE
// ============================================================================

describe('inferMode', () => {
  it('infers reviewer mode from "review" keyword', () => {
    const result = inferMode('Can you review this code?');
    expect(result?.mode).toBe('reviewer');
  });

  it('infers reviewer mode from code blocks', () => {
    const result = inferMode('```javascript\nconst x = 1;\n```');
    expect(result?.mode).toBe('reviewer');
  });

  it('infers reviewer mode from function pattern', () => {
    const result = inferMode('function handleClick() { }');
    expect(result?.mode).toBe('reviewer');
  });

  it('infers mentor mode from "explain" keyword', () => {
    const result = inferMode('Can you explain how this works?');
    expect(result?.mode).toBe('mentor');
  });

  it('infers mentor mode from "why" keyword', () => {
    const result = inferMode('Why did you structure it that way?');
    expect(result?.mode).toBe('mentor');
  });

  it('infers builder mode from "build" keyword', () => {
    const result = inferMode('Build me a dashboard');
    expect(result?.mode).toBe('builder');
  });

  it('infers builder mode from "create" keyword', () => {
    const result = inferMode('Create a new component');
    expect(result?.mode).toBe('builder');
  });

  it('returns null for ambiguous messages', () => {
    const result = inferMode('Hello there');
    expect(result).toBeNull();
  });

  it('returns confidence score with inference', () => {
    const result = inferMode('Review my code please');
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// SKILL LEVEL INFERENCE
// ============================================================================

describe('inferSkillLevel', () => {
  it('returns inferred for empty messages', () => {
    expect(inferSkillLevel([])).toBe('inferred');
  });

  it('detects experienced user from vocabulary', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'I need to refactor the architecture and set up dependency injection',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'The monorepo needs better CI/CD and deployment optimization',
        timestamp: new Date(),
      },
    ];

    expect(inferSkillLevel(messages)).toBe('experienced');
  });

  it('detects beginner from help-seeking language', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: "How do I fix this error? It doesn't work",
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: "I don't understand what this does, help me please",
        timestamp: new Date(),
      },
    ];

    expect(inferSkillLevel(messages)).toBe('beginner');
  });

  it('returns intermediate for mixed signals', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'How do I set up a React component?',
        timestamp: new Date(),
      },
    ];

    expect(inferSkillLevel(messages)).toBe('intermediate');
  });

  it('ignores alfred messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'alfred',
        content: 'Let me explain the architecture and dependency injection pattern',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'user',
        content: 'Thanks!',
        timestamp: new Date(),
      },
    ];

    // Should not detect as experienced just because Alfred mentioned those terms
    expect(inferSkillLevel(messages)).toBe('intermediate');
  });
});

// ============================================================================
// MODE SWITCHING
// ============================================================================

describe('announceModeSwtich', () => {
  it('announces switch to builder mode', () => {
    const announcement = announceModeSwtich('builder');
    expect(announcement).toContain('Builder');
  });

  it('announces switch to mentor mode', () => {
    const announcement = announceModeSwtich('mentor');
    expect(announcement).toContain('Mentor');
  });

  it('announces switch to reviewer mode', () => {
    const announcement = announceModeSwtich('reviewer');
    expect(announcement).toContain('Reviewer');
  });

  it('includes reason when provided', () => {
    const announcement = announceModeSwtich('mentor', 'User asked why.');
    expect(announcement).toContain('User asked why.');
  });
});

describe('shouldSwitchMode', () => {
  it('recommends switch when inference is confident', () => {
    const result = shouldSwitchMode('builder', 'Please review this code');
    expect(result.shouldSwitch).toBe(true);
    expect(result.suggestedMode).toBe('reviewer');
  });

  it('does not recommend switch to same mode', () => {
    const result = shouldSwitchMode('builder', 'Build me a component');
    expect(result.shouldSwitch).toBe(false);
  });

  it('does not recommend switch for ambiguous messages', () => {
    const result = shouldSwitchMode('builder', 'Hello');
    expect(result.shouldSwitch).toBe(false);
  });

  it('provides reason when recommending switch', () => {
    const result = shouldSwitchMode('builder', 'Explain how this works');
    if (result.shouldSwitch) {
      expect(result.reason).toBeDefined();
    }
  });
});
