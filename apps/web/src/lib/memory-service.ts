/**
 * Memory Service
 * 
 * Bridges @alfred/memory with database persistence.
 * Extracts skill signals, tracks preferences, provides context.
 * 
 * TODO: Re-enable when database functions are implemented
 */

// import type { DatabaseClient } from '@alfred/database';
// import { 
//   createMemoryEntry, 
//   getMemoryEntriesByUserId,
//   reinforceMemoryEntry,
// } from '@alfred/database';
import type { AlfredMode } from '@alfred/core';

// ============================================================================
// TYPES
// ============================================================================

type MemoryType = 'preference' | 'project' | 'decision' | 'skill_signal' | 'stack_preference';
type SkillLevel = 'beginner' | 'intermediate' | 'experienced' | 'inferred';

interface SkillSignal {
  type: 'vocabulary' | 'question_complexity' | 'code_quality' | 'tool_familiarity';
  value: string;
  weight: number;
}

interface UserContext {
  skillLevel: SkillLevel;
  skillConfidence: number;
  preferredMode: AlfredMode;
  recentTopics: string[];
  stackPreferences: string[];
}

// ============================================================================
// SKILL SIGNAL EXTRACTION
// ============================================================================

const EXPERIENCED_SIGNALS = [
  'architecture', 'refactor', 'dependency injection', 'monorepo', 'ci/cd',
  'kubernetes', 'terraform', 'microservices', 'event sourcing', 'cqrs',
  'design pattern', 'solid principles', 'dry', 'separation of concerns',
];

const INTERMEDIATE_SIGNALS = [
  'component', 'api', 'database', 'authentication', 'deployment',
  'testing', 'typescript', 'react hooks', 'state management', 'routing',
];

const BEGINNER_SIGNALS = [
  'how do i', 'what is', "don't understand", 'help me', 'tutorial',
  'explain', 'beginner', 'new to', 'first time', 'simple example',
];

const STACK_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'next', 'nuxt',
  'node', 'express', 'fastify', 'nest',
  'postgres', 'mysql', 'mongodb', 'redis',
  'tailwind', 'styled-components', 'css modules',
  'typescript', 'javascript', 'python', 'go', 'rust',
];

export function extractSkillSignals(message: string): SkillSignal[] {
  const signals: SkillSignal[] = [];
  const lowerMessage = message.toLowerCase();

  for (const term of EXPERIENCED_SIGNALS) {
    if (lowerMessage.includes(term)) {
      signals.push({ type: 'vocabulary', value: term, weight: 0.9 });
    }
  }

  for (const term of INTERMEDIATE_SIGNALS) {
    if (lowerMessage.includes(term)) {
      signals.push({ type: 'vocabulary', value: term, weight: 0.6 });
    }
  }

  for (const term of BEGINNER_SIGNALS) {
    if (lowerMessage.includes(term)) {
      signals.push({ type: 'question_complexity', value: term, weight: 0.2 });
    }
  }

  return signals;
}

export function extractStackPreferences(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  return STACK_KEYWORDS.filter(stack => lowerMessage.includes(stack));
}

export function calculateSkillLevel(signals: Array<{ weight: number }>): { level: SkillLevel; confidence: number } {
  if (signals.length < 3) {
    return { level: 'inferred', confidence: 0.3 };
  }

  const avgWeight = signals.reduce((sum, s) => sum + s.weight, 0) / signals.length;
  const confidence = Math.min(signals.length / 20, 0.95);

  let level: SkillLevel;
  if (avgWeight >= 0.75) {
    level = 'experienced';
  } else if (avgWeight >= 0.45) {
    level = 'intermediate';
  } else {
    level = 'beginner';
  }

  return { level, confidence };
}

// ============================================================================
// DATABASE FUNCTIONS - TODO: Implement when database exports are ready
// ============================================================================

// export async function recordSkillSignals(...) { }
// export async function recordStackPreferences(...) { }
// export async function getUserContext(...) { }
// export async function getContextForPrompt(...) { }
