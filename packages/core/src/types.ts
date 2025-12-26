/**
 * Core Types
 *
 * Foundational type definitions for Alfred.
 * These types are immutable contracts.
 */

// ============================================================================
// MODES
// ============================================================================

export type AlfredMode = 'builder' | 'mentor' | 'reviewer';

export interface ModeConfig {
  name: AlfredMode;
  description: string;
  voiceCharacteristics: string[];
  defaultBehavior: string[];
}

// ============================================================================
// USER
// ============================================================================

export interface User {
  id: string;
  createdAt: Date;
  tier: UserTier;
  preferences: UserPreferences;
}

export type UserTier = 'free' | 'pro';

export interface UserPreferences {
  mode: AlfredMode;
  optimizeFor: 'speed' | 'clarity' | 'learning';
  skillLevel: UserSkillLevel;
}

export type UserSkillLevel = 'beginner' | 'intermediate' | 'experienced' | 'inferred';

// ============================================================================
// CONVERSATION
// ============================================================================

export interface Conversation {
  id: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  mode: AlfredMode;
  messages: Message[];
  context: ConversationContext;
}

export interface Message {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  mode?: AlfredMode;
}

export interface ConversationContext {
  inferredSkillLevel: UserSkillLevel;
  projectType?: string;
  stack?: string[];
  decisions: Decision[];
}

export interface Decision {
  id: string;
  description: string;
  rationale: string;
  timestamp: Date;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

export interface ArchitectureOutput {
  components: ComponentSpec[];
  dataFlow: DataFlowSpec;
  stateOwnership: StateOwnershipSpec;
  decisions: Decision[];
}

export interface ComponentSpec {
  name: string;
  responsibility: string;
  dependencies: string[];
  publicInterface: string[];
}

export interface DataFlowSpec {
  direction: 'unidirectional' | 'bidirectional';
  sources: string[];
  sinks: string[];
  transformations: string[];
}

export interface StateOwnershipSpec {
  owner: string;
  consumers: string[];
  updatePattern: 'lift' | 'context' | 'store';
}

export interface ReviewOutput {
  issues: ReviewIssue[];
  summary: string;
}

export interface ReviewIssue {
  severity: 'critical' | 'important' | 'optional';
  location: string;
  description: string;
  fix: string;
}

// ============================================================================
// MEMORY
// ============================================================================

export interface MemoryEntry {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  confidence: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

export type MemoryType =
  | 'preference'
  | 'project'
  | 'decision'
  | 'skill_signal'
  | 'stack_preference';

// ============================================================================
// RAG
// ============================================================================

export interface RetrievedContext {
  id: string;
  source: string;
  content: string;
  relevanceScore: number;
  type: 'code' | 'architecture' | 'pattern' | 'decision';
}

// Message type for API
export interface AlfredMessage {
  role: 'user' | 'assistant';
  content: string;
}
