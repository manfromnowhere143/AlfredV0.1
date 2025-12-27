/**
 * User Memory
 *
 * Long-term user preferences and skill profile.
 * Persists across sessions. Evolves over time.
 */

import type {
  UserMemory,
  UserPreferences,
  SkillProfile,
  SkillSignal,
  TopicFrequency,
} from './types';
import type { AlfredMode, SkillLevel } from '@alfred/core';

// ============================================================================
// USER CREATION
// ============================================================================

export function createUserMemory(userId: string): UserMemory {
  const now = new Date();
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    preferences: getDefaultPreferences(),
    skillProfile: getDefaultSkillProfile(),
    history: {
      totalSessions: 0,
      totalMessages: 0,
      projectsDiscussed: [],
      frequentTopics: [],
    },
  };
}

function getDefaultPreferences(): UserPreferences {
  return {
    defaultMode: 'builder',
    optimizeFor: 'clarity',
    verbosity: 'minimal',
    codeStyle: {
      indentation: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
    },
  };
}

function getDefaultSkillProfile(): SkillProfile {
  return {
    level: 'intermediate',
    confidence: 0,
    signals: [],
    lastAssessedAt: new Date(),
  };
}

// ============================================================================
// PREFERENCE MANAGEMENT
// ============================================================================

export function updatePreferences(
  user: UserMemory,
  updates: Partial<UserPreferences>
): UserMemory {
  return {
    ...user,
    updatedAt: new Date(),
    preferences: {
      ...user.preferences,
      ...updates,
    },
  };
}

export function setDefaultMode(user: UserMemory, mode: AlfredMode): UserMemory {
  return updatePreferences(user, { defaultMode: mode });
}

export function setOptimizeFor(
  user: UserMemory,
  optimizeFor: 'speed' | 'clarity' | 'learning'
): UserMemory {
  return updatePreferences(user, { optimizeFor });
}

export function setVerbosity(
  user: UserMemory,
  verbosity: 'minimal' | 'normal' | 'detailed'
): UserMemory {
  return updatePreferences(user, { verbosity });
}

// ============================================================================
// SKILL ASSESSMENT
// ============================================================================

export function addSkillSignal(
  user: UserMemory,
  type: SkillSignal['type'],
  value: string,
  weight: number = 1.0
): UserMemory {
  const signal: SkillSignal = {
    type,
    value,
    weight,
    observedAt: new Date(),
  };

  const updatedSignals = [...user.skillProfile.signals, signal];
  const newLevel = calculateSkillLevel(updatedSignals);
  const newConfidence = calculateConfidence(updatedSignals);

  return {
    ...user,
    updatedAt: new Date(),
    skillProfile: {
      level: newLevel,
      confidence: newConfidence,
      signals: updatedSignals,
      lastAssessedAt: new Date(),
    },
  };
}

function calculateSkillLevel(signals: SkillSignal[]): SkillLevel {
  if (signals.length < 3) {
    return 'intermediate';
  }

  const weights = {
    vocabulary: 0.3,
    question_complexity: 0.25,
    code_quality: 0.3,
    tool_familiarity: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  const signalScores: Record<string, number[]> = {
    vocabulary: [],
    question_complexity: [],
    code_quality: [],
    tool_familiarity: [],
  };

  signals.forEach(signal => {
    signalScores[signal.type]?.push(signal.weight);
  });

  Object.entries(signalScores).forEach(([type, scores]) => {
    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const typeWeight = weights[type as keyof typeof weights] || 0;
      totalScore += avgScore * typeWeight;
      totalWeight += typeWeight;
    }
  });

  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  if (normalizedScore >= 0.8) return 'experienced';
  if (normalizedScore >= 0.5) return 'intermediate';
  return 'beginner';
}

function calculateConfidence(signals: SkillSignal[]): number {
  // Confidence increases with more signals, caps at 0.95
  const baseConfidence = Math.min(signals.length / 20, 0.95);
  
  // Recent signals count more
  const recentSignals = signals.filter(s => {
    const age = Date.now() - s.observedAt.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    return age < 7 * dayInMs;
  });

  const recencyBonus = Math.min(recentSignals.length / 10, 0.2);
  
  return Math.min(baseConfidence + recencyBonus, 0.95);
}

// ============================================================================
// HISTORY TRACKING
// ============================================================================

export function recordSession(user: UserMemory, messageCount: number): UserMemory {
  return {
    ...user,
    updatedAt: new Date(),
    history: {
      ...user.history,
      totalSessions: user.history.totalSessions + 1,
      totalMessages: user.history.totalMessages + messageCount,
    },
  };
}

export function recordProject(user: UserMemory, projectName: string): UserMemory {
  const projects = user.history.projectsDiscussed;
  if (projects.includes(projectName)) {
    return user;
  }

  return {
    ...user,
    updatedAt: new Date(),
    history: {
      ...user.history,
      projectsDiscussed: [...projects, projectName],
    },
  };
}

export function recordTopic(user: UserMemory, topic: string): UserMemory {
  const topics = user.history.frequentTopics;
  const existingIndex = topics.findIndex(t => t.topic === topic);

  let updatedTopics: TopicFrequency[];

  if (existingIndex >= 0) {
    updatedTopics = topics.map((t, i) =>
      i === existingIndex
        ? { ...t, count: t.count + 1, lastMentionedAt: new Date() }
        : t
    );
  } else {
    updatedTopics = [
      ...topics,
      { topic, count: 1, lastMentionedAt: new Date() },
    ];
  }

  return {
    ...user,
    updatedAt: new Date(),
    history: {
      ...user.history,
      frequentTopics: updatedTopics,
    },
  };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getTopTopics(user: UserMemory, limit: number = 5): TopicFrequency[] {
  return [...user.history.frequentTopics]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function isExperienced(user: UserMemory): boolean {
  return (
    user.skillProfile.level === 'experienced' &&
    user.skillProfile.confidence >= 0.7
  );
}

export function needsMoreSignals(user: UserMemory): boolean {
  return user.skillProfile.confidence < 0.5;
}
