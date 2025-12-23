/**
 * Chunker Tests
 *
 * Verifies semantic chunking respects code boundaries.
 */

import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  chunkCode,
  chunkMarkdown,
  chunkGeneric,
  estimateTokens,
} from './chunker';
import type { Document } from './types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createDocument(content: string, type: Document['source']['type'] = 'code'): Document {
  return {
    id: 'test-doc',
    source: { type },
    content,
    metadata: {
      language: 'typescript',
      quality: 'gold',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

describe('estimateTokens', () => {
  it('estimates approximately 4 chars per token', () => {
    const text = 'abcdefghijklmnop'; // 16 chars
    expect(estimateTokens(text)).toBe(4);
  });

  it('rounds up', () => {
    const text = 'abc'; // 3 chars
    expect(estimateTokens(text)).toBe(1);
  });
});

// ============================================================================
// CODE CHUNKING
// ============================================================================

describe('chunkCode', () => {
  it('identifies function boundaries', () => {
    const code = `
function hello() {
  console.log('hello');
}

function world() {
  console.log('world');
}
`.trim();

    const doc = createDocument(code);
    const chunks = chunkCode(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.some(c => c.type === 'function')).toBe(true);
  });

  it('identifies class boundaries', () => {
    const code = `
export class UserService {
  constructor() {
    this.users = [];
  }

  getUser(id) {
    return this.users.find(u => u.id === id);
  }
}
`.trim();

    const doc = createDocument(code);
    const chunks = chunkCode(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks.some(c => c.type === 'class')).toBe(true);
  });

  it('identifies arrow functions', () => {
    const code = `
export const handleClick = (event) => {
  event.preventDefault();
  console.log('clicked');
};
`.trim();

    const doc = createDocument(code);
    const chunks = chunkCode(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks.some(c => c.type === 'function')).toBe(true);
  });

  it('respects minTokens', () => {
    const code = `
function tiny() {}
`.trim();

    const doc = createDocument(code);
    const chunks = chunkCode(doc, {
      maxTokens: 512,
      minTokens: 100,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks.length).toBe(0);
  });
});

// ============================================================================
// MARKDOWN CHUNKING
// ============================================================================

describe('chunkMarkdown', () => {
  it('splits by headers', () => {
    const markdown = `
# Introduction

This is the introduction.

# Methods

This describes the methods.

# Results

These are the results.
`.trim();

    const doc = createDocument(markdown, 'markdown');
    const chunks = chunkMarkdown(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every(c => c.type === 'section')).toBe(true);
  });

  it('preserves section titles in metadata', () => {
    const markdown = `
# My Section

Content here.
`.trim();

    const doc = createDocument(markdown, 'markdown');
    const chunks = chunkMarkdown(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    expect(chunks[0].metadata.name).toBe('My Section');
  });
});

// ============================================================================
// GENERIC CHUNKING
// ============================================================================

describe('chunkGeneric', () => {
  it('chunks by token limit', () => {
    const lines = Array(100).fill('This is a line of text that has some content.');
    const content = lines.join('\n');

    const doc = createDocument(content, 'pattern');
    const chunks = chunkGeneric(doc, {
      maxTokens: 100,
      minTokens: 10,
      overlap: 10,
      respectBoundaries: false,
    });

    expect(chunks.length).toBeGreaterThan(1);
  });

  it('includes line numbers in metadata', () => {
    const content = 'Line 1\nLine 2\nLine 3';

    const doc = createDocument(content, 'pattern');
    const chunks = chunkGeneric(doc, {
      maxTokens: 512,
      minTokens: 1,
      overlap: 0,
      respectBoundaries: false,
    });

    expect(chunks[0].metadata.lineStart).toBeDefined();
    expect(chunks[0].metadata.lineEnd).toBeDefined();
  });
});

// ============================================================================
// DOCUMENT CHUNKING (ROUTER)
// ============================================================================

describe('chunkDocument', () => {
  it('routes code documents to chunkCode', () => {
    const doc = createDocument('function test() {}', 'code');
    const chunks = chunkDocument(doc);
    // Should not throw and should return chunks
    expect(Array.isArray(chunks)).toBe(true);
  });

  it('routes markdown documents to chunkMarkdown', () => {
    const doc = createDocument('# Header\n\nContent', 'markdown');
    const chunks = chunkDocument(doc);
    expect(Array.isArray(chunks)).toBe(true);
  });

  it('routes architecture documents to chunkMarkdown', () => {
    const doc = createDocument('# Architecture\n\nDesign here', 'architecture');
    const chunks = chunkDocument(doc);
    expect(Array.isArray(chunks)).toBe(true);
  });
});

// ============================================================================
// CHUNK PROPERTIES
// ============================================================================

describe('chunk properties', () => {
  it('generates unique chunk IDs', () => {
    const code = `
function a() { return 1; }
function b() { return 2; }
function c() { return 3; }
`.trim();

    const doc = createDocument(code);
    const chunks = chunkCode(doc, {
      maxTokens: 512,
      minTokens: 5,
      overlap: 0,
      respectBoundaries: true,
    });

    const ids = chunks.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes token estimate in metadata', () => {
    const doc = createDocument('function test() { return true; }');
    const chunks = chunkDocument(doc);

    if (chunks.length > 0) {
      expect(chunks[0].metadata.tokenEstimate).toBeGreaterThan(0);
    }
  });
});
