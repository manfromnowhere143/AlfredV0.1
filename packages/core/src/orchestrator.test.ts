import { describe, it, expect } from 'vitest';
import {
  createOrchestratorContext,
  analyzeTask,
  shouldBuild,
} from './orchestrator';

describe('Orchestrator', () => {
  describe('createOrchestratorContext', () => {
    it('creates context with default values', () => {
      const ctx = createOrchestratorContext();
      expect(ctx.state).toBe('IDLE');
      expect(ctx.mode).toBe('builder');
      expect(ctx.confidence).toBe(0);
    });

    it('accepts custom mode', () => {
      const ctx = createOrchestratorContext('mentor', 'experienced');
      expect(ctx.mode).toBe('mentor');
      expect(ctx.skillLevel).toBe('experienced');
    });
  });

  describe('analyzeTask', () => {
    it('identifies trivial tasks', () => {
      const result = analyzeTask('fix the button');
      expect(result.complexity).toBe('trivial');
    });

    it('identifies complex tasks', () => {
      const result = analyzeTask('build authentication system with database');
      expect(result.complexity).toBe('complex');
      expect(result.requiresDesign).toBe(true);
    });

    it('suggests reviewer for code', () => {
      const result = analyzeTask('review ```const x = 1```');
      expect(result.suggestedMode).toBe('reviewer');
    });

    it('suggests mentor for explanations', () => {
      const result = analyzeTask('explain how hooks work');
      expect(result.suggestedMode).toBe('mentor');
    });

    it('suggests builder for build requests', () => {
      const result = analyzeTask('build a dashboard component');
      expect(result.suggestedMode).toBe('builder');
    });

    it('returns null for ambiguous requests', () => {
      const result = analyzeTask('fix the button');
      expect(result.suggestedMode).toBeNull();
    });
  });

  describe('shouldBuild', () => {
    it('allows explicit commands', () => {
      const ctx = createOrchestratorContext();
      const result = shouldBuild(ctx, 'go ahead');
      expect(result.allowed).toBe(true);
    });

    it('blocks when not in build state', () => {
      const ctx = createOrchestratorContext();
      ctx.state = 'UNDERSTANDING';
      const result = shouldBuild(ctx, 'make it');
      expect(result.allowed).toBe(false);
    });

    it('blocks reviewer mode builds', () => {
      const ctx = createOrchestratorContext('reviewer');
      ctx.state = 'BUILDING';
      ctx.confidence = 0.9;
      const result = shouldBuild(ctx, 'continue');
      expect(result.allowed).toBe(false);
    });

    it('allows building when conditions met', () => {
      const ctx = createOrchestratorContext('builder');
      ctx.state = 'BUILDING';
      ctx.confidence = 0.9;
      ctx.taskComplexity = 'simple';
      const result = shouldBuild(ctx, 'continue');
      expect(result.allowed).toBe(true);
    });
  });
});
