/**
 * Memory Types
 *
 * Type definitions specific to the memory system.
 */

import type { AlfredMode, SkillLevel } from '@alfred/core';

// ============================================================================
// SESSION MEMORY
// ============================================================================

export interface SessionMemory {
  id: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  currentMode: AlfredMode;
  messages: SessionMessage[];
  activeContext: ActiveContext;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  tokenCount: number;
}

export interface ActiveContext {
  projectType?: string;
  stack?: string[];
  currentTask?: string;
  pendingDecisions: PendingDecision[];
}

export interface PendingDecision {
  id: string;
  question: string;
  options: string[];
  createdAt: Date;
}

// ============================================================================
// USER MEMORY
// ============================================================================

export interface UserMemory {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  skillProfile: SkillProfile;
  history: UserHistory;
}

export interface UserPreferences {
  defaultMode: AlfredMode;
  optimizeFor: 'speed' | 'clarity' | 'learning';
  verbosity: 'minimal' | 'normal' | 'detailed';
  codeStyle: CodeStylePreferences;
}

export interface CodeStylePreferences {
  indentation: 'tabs' | 'spaces';
  indentSize: 2 | 4;
  quotes: 'single' | 'double';
  semicolons: boolean;
}

export interface SkillProfile {
  level: SkillLevel;
  confidence: number;
  signals: SkillSignal[];
  lastAssessedAt: Date;
}

export interface SkillSignal {
  type: 'vocabulary' | 'question_complexity' | 'code_quality' | 'tool_familiarity';
  value: string;
  weight: number;
  observedAt: Date;
}

export interface UserHistory {
  totalSessions: number;
  totalMessages: number;
  projectsDiscussed: string[];
  frequentTopics: TopicFrequency[];
}

export interface TopicFrequency {
  topic: string;
  count: number;
  lastMentionedAt: Date;
}

// ============================================================================
// PROJECT MEMORY
// ============================================================================

export interface ProjectMemory {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  context: ProjectContext;
  decisions: ProjectDecision[];
  constraints: ProjectConstraint[];
}

export interface ProjectContext {
  type: 'web_app' | 'dashboard' | 'api' | 'library' | 'other';
  stack: StackDefinition;
  architecture?: ArchitectureSnapshot;
  repository?: RepositoryInfo;
}

export interface StackDefinition {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
}

export interface ArchitectureSnapshot {
  components: string[];
  dataFlow: string;
  stateManagement: string;
  capturedAt: Date;
}

export interface RepositoryInfo {
  url?: string;
  branch?: string;
  lastSyncedAt?: Date;
}

export interface ProjectDecision {
  id: string;
  description: string;
  rationale: string;
  alternatives: string[];
  madeAt: Date;
  confidence: number;
}

export interface ProjectConstraint {
  id: string;
  type: 'technical' | 'business' | 'timeline' | 'resource';
  description: string;
  priority: 'hard' | 'soft';
  addedAt: Date;
}

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

export interface MemoryQuery {
  userId: string;
  projectId?: string;
  type: 'session' | 'user' | 'project' | 'all';
  limit?: number;
}

export interface MemoryUpdate<T> {
  target: 'session' | 'user' | 'project';
  operation: 'set' | 'merge' | 'delete';
  path: string;
  value?: T;
}
