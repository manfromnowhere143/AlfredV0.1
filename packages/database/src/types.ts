/**
 * Database Types
 *
 * TypeScript types derived from schema.
 * Provides strict typing for all database operations.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

// ============================================================================
// USER TYPES
// ============================================================================

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type UserTier = 'free' | 'pro' | 'enterprise';
export type AlfredMode = 'builder' | 'mentor' | 'reviewer';
export type SkillLevel = 'beginner' | 'intermediate' | 'experienced' | 'inferred';

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export type Conversation = InferSelectModel<typeof schema.conversations>;
export type NewConversation = InferInsertModel<typeof schema.conversations>;

export type Message = InferSelectModel<typeof schema.messages>;
export type NewMessage = InferInsertModel<typeof schema.messages>;

export type MessageRole = 'user' | 'alfred';

export interface MessageAttachment {
  type: string;
  content: string;
  metadata?: Record<string, string>;
}

export interface MessageArtifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type Project = InferSelectModel<typeof schema.projects>;
export type NewProject = InferInsertModel<typeof schema.projects>;

export type ProjectDecision = InferSelectModel<typeof schema.projectDecisions>;
export type NewProjectDecision = InferInsertModel<typeof schema.projectDecisions>;

export type ProjectType = 'web_app' | 'dashboard' | 'api' | 'library' | 'other';

export interface ProjectStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
}

export interface ProjectArchitecture {
  components?: string[];
  dataFlow?: string;
  stateManagement?: string;
  capturedAt?: string;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

export type MemoryEntry = InferSelectModel<typeof schema.memoryEntries>;
export type NewMemoryEntry = InferInsertModel<typeof schema.memoryEntries>;

export type MemoryType = 'preference' | 'project' | 'decision' | 'skill_signal' | 'stack_preference';

// ============================================================================
// DOCUMENT TYPES (RAG)
// ============================================================================

export type Document = InferSelectModel<typeof schema.documents>;
export type NewDocument = InferInsertModel<typeof schema.documents>;

export type Chunk = InferSelectModel<typeof schema.chunks>;
export type NewChunk = InferInsertModel<typeof schema.chunks>;

export type DocumentType = 'code' | 'markdown' | 'architecture' | 'decision' | 'pattern';
export type QualityTier = 'gold' | 'silver' | 'bronze';

// ============================================================================
// API KEY TYPES
// ============================================================================

export type ApiKey = InferSelectModel<typeof schema.apiKeys>;
export type NewApiKey = InferInsertModel<typeof schema.apiKeys>;

// ============================================================================
// USAGE TYPES
// ============================================================================

export type UsageRecord = InferSelectModel<typeof schema.usageRecords>;
export type NewUsageRecord = InferInsertModel<typeof schema.usageRecords>;

export type PeriodType = 'daily' | 'monthly';

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ProjectWithDecisions extends Project {
  decisions: ProjectDecision[];
}

export interface UserWithMemory extends User {
  memoryEntries: MemoryEntry[];
}

export interface DocumentWithChunks extends Document {
  chunks: Chunk[];
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: string[];
}

// ============================================================================
// DATABASE STATISTICS
// ============================================================================

export interface DatabaseStats {
  userCount: number;
  conversationCount: number;
  messageCount: number;
  projectCount: number;
  memoryEntryCount: number;
  documentCount: number;
  chunkCount: number;
}

export interface UserStats {
  userId: string;
  conversationCount: number;
  messageCount: number;
  projectCount: number;
  memoryEntryCount: number;
  totalTokensUsed: number;
}
