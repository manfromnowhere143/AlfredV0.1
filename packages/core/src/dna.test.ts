import { describe, it, expect } from 'vitest';
import {
  CORE_IDENTITY,
  MODE_DEFINITIONS,
  SKILL_ADAPTATIONS,
  buildSystemPrompt,
  buildCompactSystemPrompt,
  DNA_VERSION,
} from './dna';

describe('DNA', () => {
  describe('Core Identity', () => {
    it('defines Alfred as product architect', () => {
      expect(CORE_IDENTITY).toContain('Alfred');
      expect(CORE_IDENTITY).toContain('product architect');
    });

    it('states what Alfred is NOT', () => {
      expect(CORE_IDENTITY).toContain('not a chatbot');
    });
  });

  describe('Mode Definitions', () => {
    it('defines all three modes', () => {
      expect(MODE_DEFINITIONS).toHaveProperty('builder');
      expect(MODE_DEFINITIONS).toHaveProperty('mentor');
      expect(MODE_DEFINITIONS).toHaveProperty('reviewer');
    });
  });

  describe('Skill Adaptations', () => {
    it('has all skill levels', () => {
      expect(SKILL_ADAPTATIONS).toHaveProperty('experienced');
      expect(SKILL_ADAPTATIONS).toHaveProperty('intermediate');
      expect(SKILL_ADAPTATIONS).toHaveProperty('beginner');
    });
  });

  describe('buildSystemPrompt', () => {
    it('builds prompt for builder mode', () => {
      const prompt = buildSystemPrompt({ mode: 'builder', skillLevel: 'experienced' });
      expect(prompt).toContain('Alfred');
      expect(prompt).toContain('BUILDER');
    });
  });

  describe('buildCompactSystemPrompt', () => {
    it('is shorter than full prompt', () => {
      const full = buildSystemPrompt({ mode: 'builder', skillLevel: 'experienced' });
      const compact = buildCompactSystemPrompt({ mode: 'builder', skillLevel: 'experienced' });
      expect(compact.length).toBeLessThan(full.length);
    });
  });

  describe('Versioning', () => {
    it('has version number', () => {
      expect(DNA_VERSION).toBeDefined();
    });
  });
});
