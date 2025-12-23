/**
 * Chunker
 *
 * Semantic chunking that respects code boundaries.
 * Does NOT split in the middle of functions, classes, or logical blocks.
 */

import {
  Document,
  Chunk,
  ChunkType,
  ChunkMetadata,
  ChunkingConfig,
  DEFAULT_CHUNKING_CONFIG,
} from './types';

// ============================================================================
// MAIN CHUNKER
// ============================================================================

/**
 * Chunks a document into semantic units.
 * Respects code boundaries (functions, classes, components).
 */
export function chunkDocument(
  document: Document,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Chunk[] {
  const { type } = document.source;

  switch (type) {
    case 'code':
      return chunkCode(document, config);
    case 'markdown':
      return chunkMarkdown(document, config);
    case 'architecture':
    case 'decision':
    case 'pattern':
      return chunkMarkdown(document, config);
    default:
      return chunkGeneric(document, config);
  }
}

// ============================================================================
// CODE CHUNKING
// ============================================================================

/**
 * Chunks code respecting structural boundaries.
 * Identifies: functions, classes, components, interfaces.
 */
export function chunkCode(
  document: Document,
  config: ChunkingConfig
): Chunk[] {
  const content = document.content;
  const lines = content.split('\n');
  const chunks: Chunk[] = [];

  const boundaries = findCodeBoundaries(content, document.metadata.language);

  if (boundaries.length === 0) {
    return chunkGeneric(document, config);
  }

  for (const boundary of boundaries) {
    const chunkContent = lines.slice(boundary.lineStart, boundary.lineEnd + 1).join('\n');
    const tokenEstimate = estimateTokens(chunkContent);

    if (tokenEstimate < config.minTokens) {
      continue;
    }

    if (tokenEstimate > config.maxTokens) {
      const subChunks = splitLargeChunk(
        chunkContent,
        boundary,
        document.id,
        chunks.length,
        config
      );
      chunks.push(...subChunks);
    } else {
      chunks.push(createChunk(
        document.id,
        chunks.length,
        chunkContent,
        boundary.type,
        boundary.lineStart,
        boundary.lineEnd,
        boundary.name
      ));
    }
  }

  return chunks;
}

interface CodeBoundary {
  type: ChunkType;
  name?: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Finds structural boundaries in code.
 */
function findCodeBoundaries(content: string, language?: string): CodeBoundary[] {
  const boundaries: CodeBoundary[] = [];
  const lines = content.split('\n');

  // Patterns for different constructs
  const patterns = {
    function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    arrowFunction: /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/,
    class: /^(?:export\s+)?class\s+(\w+)/,
    interface: /^(?:export\s+)?interface\s+(\w+)/,
    type: /^(?:export\s+)?type\s+(\w+)/,
    component: /^(?:export\s+)?(?:const|function)\s+(\w+).*(?:React|JSX|=>.*<)/,
  };

  let currentBoundary: CodeBoundary | null = null;
  let braceDepth = 0;
  let inMultilineString = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments when looking for starts
    if (!currentBoundary && (trimmedLine === '' || trimmedLine.startsWith('//'))) {
      continue;
    }

    // Check for boundary starts
    if (!currentBoundary) {
      for (const [type, pattern] of Object.entries(patterns)) {
        const match = trimmedLine.match(pattern);
        if (match) {
          currentBoundary = {
            type: mapPatternToChunkType(type),
            name: match[1],
            lineStart: i,
            lineEnd: i,
          };
          break;
        }
      }
    }

    // Track brace depth
    if (currentBoundary) {
      for (const char of line) {
        if (char === '{' && !inMultilineString) braceDepth++;
        if (char === '}' && !inMultilineString) braceDepth--;
      }

      currentBoundary.lineEnd = i;

      // Check for boundary end
      if (braceDepth === 0 && line.includes('}')) {
        boundaries.push(currentBoundary);
        currentBoundary = null;
      }
    }
  }

  // Handle unclosed boundary (file end)
  if (currentBoundary) {
    boundaries.push(currentBoundary);
  }

  return boundaries;
}

function mapPatternToChunkType(pattern: string): ChunkType {
  const map: Record<string, ChunkType> = {
    function: 'function',
    arrowFunction: 'function',
    class: 'class',
    interface: 'interface',
    type: 'interface',
    component: 'component',
  };
  return map[pattern] || 'generic';
}

// ============================================================================
// MARKDOWN CHUNKING
// ============================================================================

/**
 * Chunks markdown by sections.
 */
export function chunkMarkdown(
  document: Document,
  config: ChunkingConfig
): Chunk[] {
  const content = document.content;
  const chunks: Chunk[] = [];
  const sections = splitMarkdownSections(content);

  for (const section of sections) {
    const tokenEstimate = estimateTokens(section.content);

    if (tokenEstimate < config.minTokens) {
      continue;
    }

    if (tokenEstimate > config.maxTokens) {
      const subChunks = splitByParagraphs(section, document.id, chunks.length, config);
      chunks.push(...subChunks);
    } else {
      chunks.push(createChunk(
        document.id,
        chunks.length,
        section.content,
        'section',
        section.lineStart,
        section.lineEnd,
        section.title
      ));
    }
  }

  return chunks;
}

interface MarkdownSection {
  title?: string;
  content: string;
  lineStart: number;
  lineEnd: number;
}

function splitMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split('\n');
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      if (currentSection) {
        currentSection.lineEnd = i - 1;
        sections.push(currentSection);
      }

      currentSection = {
        title: headerMatch[2],
        content: line,
        lineStart: i,
        lineEnd: i,
      };
    } else if (currentSection) {
      currentSection.content += '\n' + line;
      currentSection.lineEnd = i;
    } else {
      currentSection = {
        content: line,
        lineStart: i,
        lineEnd: i,
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function splitByParagraphs(
  section: MarkdownSection,
  documentId: string,
  startIndex: number,
  config: ChunkingConfig
): Chunk[] {
  const paragraphs = section.content.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let lineOffset = section.lineStart;

  for (const paragraph of paragraphs) {
    const combined = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    const tokens = estimateTokens(combined);

    if (tokens > config.maxTokens && currentChunk) {
      chunks.push(createChunk(
        documentId,
        startIndex + chunks.length,
        currentChunk,
        'paragraph',
        lineOffset,
        lineOffset + currentChunk.split('\n').length - 1
      ));
      currentChunk = paragraph;
      lineOffset += currentChunk.split('\n').length;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk && estimateTokens(currentChunk) >= config.minTokens) {
    chunks.push(createChunk(
      documentId,
      startIndex + chunks.length,
      currentChunk,
      'paragraph',
      lineOffset,
      section.lineEnd
    ));
  }

  return chunks;
}

// ============================================================================
// GENERIC CHUNKING
// ============================================================================

/**
 * Generic chunking by token count with overlap.
 */
export function chunkGeneric(
  document: Document,
  config: ChunkingConfig
): Chunk[] {
  const content = document.content;
  const lines = content.split('\n');
  const chunks: Chunk[] = [];

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = estimateTokens(line);

    if (currentTokens + lineTokens > config.maxTokens && currentChunk.length > 0) {
      chunks.push(createChunk(
        document.id,
        chunks.length,
        currentChunk.join('\n'),
        'generic',
        chunkStartLine,
        i - 1
      ));

      // Overlap: keep last N tokens worth of lines
      const overlapLines = calculateOverlapLines(currentChunk, config.overlap);
      currentChunk = overlapLines;
      currentTokens = estimateTokens(currentChunk.join('\n'));
      chunkStartLine = i - overlapLines.length;
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  if (currentChunk.length > 0 && estimateTokens(currentChunk.join('\n')) >= config.minTokens) {
    chunks.push(createChunk(
      document.id,
      chunks.length,
      currentChunk.join('\n'),
      'generic',
      chunkStartLine,
      lines.length - 1
    ));
  }

  return chunks;
}

function calculateOverlapLines(lines: string[], targetTokens: number): string[] {
  const result: string[] = [];
  let tokens = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
    const lineTokens = estimateTokens(lines[i]);
    if (tokens + lineTokens > targetTokens) break;
    result.unshift(lines[i]);
    tokens += lineTokens;
  }

  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

function createChunk(
  documentId: string,
  index: number,
  content: string,
  type: ChunkType,
  lineStart: number,
  lineEnd: number,
  name?: string
): Chunk {
  return {
    id: `${documentId}_chunk_${index}`,
    documentId,
    content,
    startOffset: 0,
    endOffset: content.length,
    type,
    metadata: {
      name,
      lineStart,
      lineEnd,
      tokenEstimate: estimateTokens(content),
    },
  };
}

function splitLargeChunk(
  content: string,
  boundary: CodeBoundary,
  documentId: string,
  startIndex: number,
  config: ChunkingConfig
): Chunk[] {
  const lines = content.split('\n');
  const chunks: Chunk[] = [];
  let currentLines: string[] = [];
  let lineOffset = boundary.lineStart;

  for (let i = 0; i < lines.length; i++) {
    currentLines.push(lines[i]);

    if (estimateTokens(currentLines.join('\n')) >= config.maxTokens) {
      chunks.push(createChunk(
        documentId,
        startIndex + chunks.length,
        currentLines.join('\n'),
        boundary.type,
        lineOffset,
        lineOffset + currentLines.length - 1,
        boundary.name
      ));

      const overlap = calculateOverlapLines(currentLines, config.overlap);
      currentLines = overlap;
      lineOffset = boundary.lineStart + i - overlap.length + 1;
    }
  }

  if (currentLines.length > 0) {
    chunks.push(createChunk(
      documentId,
      startIndex + chunks.length,
      currentLines.join('\n'),
      boundary.type,
      lineOffset,
      boundary.lineEnd,
      boundary.name
    ));
  }

  return chunks;
}

/**
 * Estimates token count for text.
 * Approximation: ~4 characters per token for code.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
