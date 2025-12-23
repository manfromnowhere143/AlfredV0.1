/**
 * Session Memory
 *
 * Manages current conversation state.
 * Temporary. Resets between sessions.
 */

import type {
  SessionMemory,
  SessionMessage,
  ActiveContext,
  PendingDecision,
} from './types';
import type { AlfredMode } from '@alfred/core';

// ============================================================================
// SESSION CREATION
// ============================================================================

export function createSession(userId: string, mode: AlfredMode = 'builder'): SessionMemory {
  const now = new Date();
  return {
    id: generateSessionId(),
    userId,
    startedAt: now,
    lastActivityAt: now,
    currentMode: mode,
    messages: [],
    activeContext: {
      pendingDecisions: [],
    },
  };
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

export function addMessage(
  session: SessionMemory,
  role: 'user' | 'alfred',
  content: string
): SessionMemory {
  const message: SessionMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    tokenCount: estimateTokens(content),
  };

  return {
    ...session,
    lastActivityAt: new Date(),
    messages: [...session.messages, message],
  };
}

export function getRecentMessages(
  session: SessionMemory,
  limit: number = 10
): SessionMessage[] {
  return session.messages.slice(-limit);
}

export function getMessagesByRole(
  session: SessionMemory,
  role: 'user' | 'alfred'
): SessionMessage[] {
  return session.messages.filter(m => m.role === role);
}

// ============================================================================
// CONTEXT MANAGEMENT
// ============================================================================

export function updateContext(
  session: SessionMemory,
  updates: Partial<ActiveContext>
): SessionMemory {
  return {
    ...session,
    lastActivityAt: new Date(),
    activeContext: {
      ...session.activeContext,
      ...updates,
    },
  };
}

export function setStack(session: SessionMemory, stack: string[]): SessionMemory {
  return updateContext(session, { stack });
}

export function setProjectType(session: SessionMemory, projectType: string): SessionMemory {
  return updateContext(session, { projectType });
}

export function setCurrentTask(session: SessionMemory, task: string): SessionMemory {
  return updateContext(session, { currentTask: task });
}

// ============================================================================
// PENDING DECISIONS
// ============================================================================

export function addPendingDecision(
  session: SessionMemory,
  question: string,
  options: string[]
): SessionMemory {
  const decision: PendingDecision = {
    id: `decision_${Date.now()}`,
    question,
    options,
    createdAt: new Date(),
  };

  return {
    ...session,
    activeContext: {
      ...session.activeContext,
      pendingDecisions: [...session.activeContext.pendingDecisions, decision],
    },
  };
}

export function resolvePendingDecision(
  session: SessionMemory,
  decisionId: string
): SessionMemory {
  return {
    ...session,
    activeContext: {
      ...session.activeContext,
      pendingDecisions: session.activeContext.pendingDecisions.filter(
        d => d.id !== decisionId
      ),
    },
  };
}

// ============================================================================
// MODE MANAGEMENT
// ============================================================================

export function switchMode(session: SessionMemory, mode: AlfredMode): SessionMemory {
  return {
    ...session,
    currentMode: mode,
    lastActivityAt: new Date(),
  };
}

// ============================================================================
// SESSION METRICS
// ============================================================================

export function getSessionDuration(session: SessionMemory): number {
  return session.lastActivityAt.getTime() - session.startedAt.getTime();
}

export function getTotalTokens(session: SessionMemory): number {
  return session.messages.reduce((sum, m) => sum + m.tokenCount, 0);
}

// ============================================================================
// UTILITIES
// ============================================================================

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}
