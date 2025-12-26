/**
 * Schema Tests
 *
 * Verifies schema structure and constraints.
 */

import { describe, it, expect } from 'vitest';
import * as schema from './schema';

// ============================================================================
// TABLE EXISTENCE
// ============================================================================

describe('schema tables', () => {
  it('exports users table', () => {
    expect(schema.users).toBeDefined();
  });

  it('exports conversations table', () => {
    expect(schema.conversations).toBeDefined();
  });

  it('exports messages table', () => {
    expect(schema.messages).toBeDefined();
  });

  it('exports projects table', () => {
    expect(schema.projects).toBeDefined();
  });

  it('exports projectDecisions table', () => {
    expect(schema.projectDecisions).toBeDefined();
  });

  it('exports memoryEntries table', () => {
    expect(schema.memoryEntries).toBeDefined();
  });

  it('exports documents table', () => {
    expect(schema.documents).toBeDefined();
  });

  it('exports chunks table', () => {
    expect(schema.chunks).toBeDefined();
  });

  it('exports apiKeys table', () => {
    expect(schema.apiKeys).toBeDefined();
  });

  it('exports usageRecords table', () => {
    expect(schema.usageRecords).toBeDefined();
  });
});

// ============================================================================
// ENUM DEFINITIONS
// ============================================================================

describe('schema enums', () => {
  it('defines userTierEnum', () => {
    expect(schema.userTierEnum).toBeDefined();
    expect(schema.userTierEnum.enumValues).toContain('free');
    expect(schema.userTierEnum.enumValues).toContain('pro');
    expect(schema.userTierEnum.enumValues).toContain('enterprise');
  });

  it('defines alfredFacetEnum', () => {
    expect(schema.alfredFacetEnum).toBeDefined();
    expect(schema.alfredFacetEnum.enumValues).toContain('build');
    expect(schema.alfredFacetEnum.enumValues).toContain('teach');
    expect(schema.alfredFacetEnum.enumValues).toContain('review');
  });

  it('defines skillLevelEnum', () => {
    expect(schema.skillLevelEnum).toBeDefined();
    expect(schema.skillLevelEnum.enumValues).toContain('beginner');
    expect(schema.skillLevelEnum.enumValues).toContain('intermediate');
    expect(schema.skillLevelEnum.enumValues).toContain('experienced');
  });

  it('defines messageRoleEnum', () => {
    expect(schema.messageRoleEnum).toBeDefined();
    expect(schema.messageRoleEnum.enumValues).toContain('user');
    expect(schema.messageRoleEnum.enumValues).toContain('alfred');
  });

  it('defines memoryTypeEnum', () => {
    expect(schema.memoryTypeEnum).toBeDefined();
    expect(schema.memoryTypeEnum.enumValues).toContain('preference');
    expect(schema.memoryTypeEnum.enumValues).toContain('project');
    expect(schema.memoryTypeEnum.enumValues).toContain('decision');
  });

  it('defines documentTypeEnum', () => {
    expect(schema.documentTypeEnum).toBeDefined();
    expect(schema.documentTypeEnum.enumValues).toContain('code');
    expect(schema.documentTypeEnum.enumValues).toContain('markdown');
    expect(schema.documentTypeEnum.enumValues).toContain('architecture');
  });

  it('defines qualityTierEnum', () => {
    expect(schema.qualityTierEnum).toBeDefined();
    expect(schema.qualityTierEnum.enumValues).toContain('gold');
    expect(schema.qualityTierEnum.enumValues).toContain('silver');
    expect(schema.qualityTierEnum.enumValues).toContain('bronze');
  });
});

// ============================================================================
// RELATIONS
// ============================================================================

describe('schema relations', () => {
  it('defines usersRelations', () => {
    expect(schema.usersRelations).toBeDefined();
  });

  it('defines conversationsRelations', () => {
    expect(schema.conversationsRelations).toBeDefined();
  });

  it('defines messagesRelations', () => {
    expect(schema.messagesRelations).toBeDefined();
  });

  it('defines projectsRelations', () => {
    expect(schema.projectsRelations).toBeDefined();
  });

  it('defines memoryEntriesRelations', () => {
    expect(schema.memoryEntriesRelations).toBeDefined();
  });

  it('defines documentsRelations', () => {
    expect(schema.documentsRelations).toBeDefined();
  });

  it('defines chunksRelations', () => {
    expect(schema.chunksRelations).toBeDefined();
  });
});
