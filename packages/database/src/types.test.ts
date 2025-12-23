/**
 * Types Tests
 *
 * Verifies type exports and structure.
 */

import { describe, it, expect } from 'vitest';
import type {
  User,
  NewUser,
  Conversation,
  Message,
  Project,
  MemoryEntry,
  Document,
  Chunk,
  ApiKey,
  UsageRecord,
  UserTier,
  AlfredMode,
  SkillLevel,
  MessageRole,
  MemoryType,
  DocumentType,
  QualityTier,
  ProjectStack,
  ProjectArchitecture,
  ConversationWithMessages,
  ProjectWithDecisions,
  PaginatedResult,
  SearchResult,
} from './types';

// ============================================================================
// TYPE COMPILATION TESTS
// ============================================================================

describe('type exports', () => {
  it('exports User type', () => {
    const user: Partial<User> = {
      id: 'uuid',
      email: 'test@example.com',
      tier: 'free',
    };
    expect(user).toBeDefined();
  });

  it('exports Conversation type', () => {
    const conversation: Partial<Conversation> = {
      id: 'uuid',
      mode: 'builder',
      messageCount: 0,
    };
    expect(conversation).toBeDefined();
  });

  it('exports Message type', () => {
    const message: Partial<Message> = {
      id: 'uuid',
      role: 'user',
      content: 'Hello',
    };
    expect(message).toBeDefined();
  });

  it('exports Project type', () => {
    const project: Partial<Project> = {
      id: 'uuid',
      name: 'Test Project',
      type: 'web_app',
    };
    expect(project).toBeDefined();
  });

  it('exports MemoryEntry type', () => {
    const entry: Partial<MemoryEntry> = {
      id: 'uuid',
      type: 'preference',
      content: 'Prefers TypeScript',
      confidence: 0.8,
    };
    expect(entry).toBeDefined();
  });

  it('exports Document type', () => {
    const doc: Partial<Document> = {
      id: 'uuid',
      type: 'code',
      content: 'function test() {}',
      qualityTier: 'gold',
    };
    expect(doc).toBeDefined();
  });

  it('exports Chunk type', () => {
    const chunk: Partial<Chunk> = {
      id: 'uuid',
      content: 'chunk content',
      chunkType: 'function',
      tokenCount: 50,
    };
    expect(chunk).toBeDefined();
  });
});

// ============================================================================
// ENUM TYPE TESTS
// ============================================================================

describe('enum types', () => {
  it('UserTier accepts valid values', () => {
    const tiers: UserTier[] = ['free', 'pro', 'enterprise'];
    expect(tiers).toHaveLength(3);
  });

  it('AlfredMode accepts valid values', () => {
    const modes: AlfredMode[] = ['builder', 'mentor', 'reviewer'];
    expect(modes).toHaveLength(3);
  });

  it('SkillLevel accepts valid values', () => {
    const levels: SkillLevel[] = ['beginner', 'intermediate', 'experienced', 'inferred'];
    expect(levels).toHaveLength(4);
  });

  it('MessageRole accepts valid values', () => {
    const roles: MessageRole[] = ['user', 'alfred'];
    expect(roles).toHaveLength(2);
  });

  it('MemoryType accepts valid values', () => {
    const types: MemoryType[] = ['preference', 'project', 'decision', 'skill_signal', 'stack_preference'];
    expect(types).toHaveLength(5);
  });

  it('DocumentType accepts valid values', () => {
    const types: DocumentType[] = ['code', 'markdown', 'architecture', 'decision', 'pattern'];
    expect(types).toHaveLength(5);
  });

  it('QualityTier accepts valid values', () => {
    const tiers: QualityTier[] = ['gold', 'silver', 'bronze'];
    expect(tiers).toHaveLength(3);
  });
});

// ============================================================================
// COMPOSITE TYPE TESTS
// ============================================================================

describe('composite types', () => {
  it('ProjectStack has correct structure', () => {
    const stack: ProjectStack = {
      frontend: ['React', 'TypeScript'],
      backend: ['Node.js'],
      database: ['PostgreSQL'],
      infrastructure: ['Docker'],
    };
    expect(stack.frontend).toContain('React');
  });

  it('ProjectArchitecture has correct structure', () => {
    const arch: ProjectArchitecture = {
      components: ['API', 'Web'],
      dataFlow: 'unidirectional',
      stateManagement: 'React Query',
      capturedAt: new Date().toISOString(),
    };
    expect(arch.components).toContain('API');
  });

  it('PaginatedResult has correct structure', () => {
    const result: PaginatedResult<string> = {
      items: ['a', 'b', 'c'],
      total: 100,
      page: 1,
      pageSize: 10,
      hasMore: true,
    };
    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });

  it('SearchResult has correct structure', () => {
    const result: SearchResult<{ id: string }> = {
      item: { id: 'test' },
      score: 0.95,
      highlights: ['matched text'],
    };
    expect(result.score).toBeGreaterThan(0);
  });
});
