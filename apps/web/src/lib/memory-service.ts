/**
 * Memory Service
 * 
 * Bridges @alfred/memory with database persistence.
 * Extracts skill signals, tracks preferences, provides context.
 */

import type { DatabaseClient } from '@alfred/database';
import { 
  createMemoryEntry, 
  getMemoryEntriesByUserId,
  reinforceMemoryEntry,
} from '@alfred/database';
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
  'abstraction', 'polymorphism', 'composition over inheritance',
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

// ============================================================================
// SKILL LEVEL CALCULATION
// ============================================================================

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
// MEMORY SERVICE
// ============================================================================

export async function recordSkillSignals(
  db: DatabaseClient,
  userId: string,
  message: string,
  conversationId?: string,
  messageId?: string
): Promise<void> {
  const signals = extractSkillSignals(message);
  
  for (const signal of signals) {
    await createMemoryEntry(db, {
      userId,
      type: 'skill_signal' as MemoryType,
      content: JSON.stringify(signal),
      confidence: signal.weight,
      sourceConversationId: conversationId,
      sourceMessageId: messageId,
      metadata: { signalType: signal.type, value: signal.value },
    });
  }
}

export async function recordStackPreferences(
  db: DatabaseClient,
  userId: string,
  message: string,
  conversationId?: string
): Promise<void> {
  const stacks = extractStackPreferences(message);
  
  for (const stack of stacks) {
    const existing = await getMemoryEntriesByUserId(db, userId, {
      type: 'stack_preference',
      minConfidence: 0.1,
    });

    const existingStack = existing.find(e => {
      const meta = e.metadata as { stack?: string } | null;
      return meta?.stack === stack;
    });

    if (existingStack) {
      await reinforceMemoryEntry(db, existingStack.id, 0.1);
    } else {
      await createMemoryEntry(db, {
        userId,
        type: 'stack_preference' as MemoryType,
        content: stack,
        confidence: 0.5,
        sourceConversationId: conversationId,
        metadata: { stack },
      });
    }
  }
}

export async function getUserContext(
  db: DatabaseClient,
  userId: string
): Promise<UserContext> {
  const skillSignals = await getMemoryEntriesByUserId(db, userId, {
    type: 'skill_signal',
    minConfidence: 0.3,
    limit: 50,
  });

  const stackPrefs = await getMemoryEntriesByUserId(db, userId, {
    type: 'stack_preference',
    minConfidence: 0.3,
    limit: 20,
  });

  const signalWeights = skillSignals.map(s => {
    const parsed = JSON.parse(s.content) as { weight: number };
    return { weight: parsed.weight * s.confidence };
  });
  const { level, confidence } = calculateSkillLevel(signalWeights);

  const recentTopics = skillSignals.slice(0, 10).map(s => {
    const parsed = JSON.parse(s.content) as { value: string };
    return parsed.value;
  });

  const stackPreferences = stackPrefs.map(s => s.content);

  return {
    skillLevel: level,
    skillConfidence: confidence,
    preferredMode: 'builder',
    recentTopics: [...new Set(recentTopics)],
    stackPreferences: [...new Set(stackPreferences)],
  };
}

export async function getContextForPrompt(
  db: DatabaseClient,
  userId: string
): Promise<string> {
  const context = await getUserContext(db, userId);
  
  const parts: string[] = [];
  
  if (context.skillLevel !== 'inferred') {
    parts.push(`User skill level: ${context.skillLevel} (confidence: ${(context.skillConfidence * 100).toFixed(0)}%)`);
  }
  
  if (context.stackPreferences.length > 0) {
    parts.push(`Preferred stack: ${context.stackPreferences.slice(0, 5).join(', ')}`);
  }
  
  if (context.recentTopics.length > 0) {
    parts.push(`Recent topics: ${context.recentTopics.slice(0, 5).join(', ')}`);
  }
  
  return parts.length > 0 
    ? `\n\n<user_context>\n${parts.join('\n')}\n</user_context>`
    : '';
}