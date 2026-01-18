'use client';

/**
 * Markdown Renderer — State of the Art
 *
 * Beautiful GitHub-style markdown rendering with:
 * - Mermaid diagram support
 * - Syntax highlighting for code blocks
 * - Tables, task lists, and GFM extensions
 * - Dark theme optimized
 */

import React, { memo, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';

// Lazy load MermaidRenderer for code splitting
const MermaidRenderer = dynamic(
  () => import('./MermaidRenderer').then(mod => mod.MermaidRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="mermaid-placeholder">
        <div className="loading-spinner" />
      </div>
    ),
  }
);

export interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;
  /** Optional className */
  className?: string;
}

// Token patterns for inline highlighting
const INLINE_PATTERNS = [
  { regex: /`([^`]+)`/g, type: 'code' },
  { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
  { regex: /\*([^*]+)\*/g, type: 'italic' },
  { regex: /~~([^~]+)~~/g, type: 'strikethrough' },
  { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
];

// Syntax highlighting patterns for code blocks
const CODE_PATTERNS = [
  { pattern: /^(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|enum|async|await)\b/, className: 'keyword' },
  { pattern: /^(true|false|null|undefined|this)\b/, className: 'builtin' },
  { pattern: /^'[^']*'|^"[^"]*"|^`[^`]*`/, className: 'string' },
  { pattern: /^\d+(\.\d+)?/, className: 'number' },
  { pattern: /^\/\/.*/, className: 'comment' },
  { pattern: /^[<>{}()\[\];:,.]/, className: 'punctuation' },
  { pattern: /^[=+\-*/%!&|^~<>?]+/, className: 'operator' },
  { pattern: /^[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*[<(])/, className: 'function' },
  { pattern: /^[A-Z][a-zA-Z0-9_$]*/, className: 'type' },
  { pattern: /^[a-zA-Z_$][a-zA-Z0-9_$]*/, className: 'identifier' },
];

function highlightCode(code: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = code;
  let key = 0;

  while (remaining.length > 0) {
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      tokens.push(<span key={key++}>{wsMatch[0]}</span>);
      remaining = remaining.slice(wsMatch[0].length);
      continue;
    }

    let matched = false;
    for (const { pattern, className } of CODE_PATTERNS) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push(<span key={key++} className={className}>{match[0]}</span>);
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

// Parse markdown to blocks
interface Block {
  type: 'heading' | 'paragraph' | 'code' | 'mermaid' | 'list' | 'quote' | 'table' | 'hr' | 'taskList';
  content: string;
  level?: number;
  language?: string;
  items?: string[];
  rows?: string[][];
  ordered?: boolean;
}

function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (including mermaid)
    if (line.startsWith('```')) {
      const language = line.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      if (language === 'mermaid') {
        blocks.push({ type: 'mermaid', content: codeLines.join('\n') });
      } else {
        blocks.push({ type: 'code', content: codeLines.join('\n'), language });
      }
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].slice(1).trim());
        i++;
      }
      blocks.push({ type: 'quote', content: quoteLines.join('\n') });
      continue;
    }

    // Task list
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const tm = lines[i].match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
        if (!tm) break;
        items.push(`${tm[1] === ' ' ? '[ ]' : '[x]'} ${tm[2]}`);
        i++;
      }
      blocks.push({ type: 'taskList', content: '', items });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items, ordered: false });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items, ordered: true });
      continue;
    }

    // Table
    if (line.includes('|') && lines[i + 1]?.includes('|') && lines[i + 1]?.includes('-')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length > 0 && !cells.every(c => /^[-:]+$/.test(c))) {
          rows.push(cells);
        }
        i++;
      }
      blocks.push({ type: 'table', content: '', rows });
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```')) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
    }
  }

  return blocks;
}

// Render inline markdown
function renderInline(text: string): React.ReactNode {
  // Simple inline rendering
  let result = text;

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Code
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // SECURITY: Sanitize HTML to prevent XSS attacks
  const sanitized = DOMPurify.sanitize(result, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'del', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={`markdown-renderer ${className}`}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
            return <HeadingTag key={i} className={`heading h${block.level}`}>{renderInline(block.content)}</HeadingTag>;

          case 'paragraph':
            return <p key={i} className="paragraph">{renderInline(block.content)}</p>;

          case 'code':
            return (
              <div key={i} className="code-block">
                {block.language && <span className="code-language">{block.language}</span>}
                <pre><code>{highlightCode(block.content)}</code></pre>
              </div>
            );

          case 'mermaid':
            return (
              <div key={i} className="mermaid-block">
                <Suspense fallback={<div className="mermaid-placeholder"><div className="loading-spinner" /></div>}>
                  <MermaidRenderer chart={block.content} />
                </Suspense>
              </div>
            );

          case 'list':
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag key={i} className="list">
                {block.items?.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </ListTag>
            );

          case 'taskList':
            return (
              <ul key={i} className="task-list">
                {block.items?.map((item, j) => {
                  const checked = item.startsWith('[x]');
                  const text = item.replace(/^\[[ xX]\]\s*/, '');
                  return (
                    <li key={j} className="task-item">
                      <span className={`task-checkbox ${checked ? 'checked' : ''}`}>
                        {checked ? '✓' : ''}
                      </span>
                      {renderInline(text)}
                    </li>
                  );
                })}
              </ul>
            );

          case 'quote':
            return <blockquote key={i} className="blockquote">{renderInline(block.content)}</blockquote>;

          case 'table':
            return (
              <div key={i} className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {block.rows?.[0]?.map((cell, j) => <th key={j}>{renderInline(cell)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows?.slice(1).map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => <td key={k}>{renderInline(cell)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'hr':
            return <hr key={i} className="divider" />;

          default:
            return null;
        }
      })}

      <style jsx>{`
        .markdown-renderer {
          color: rgba(255, 255, 255, 0.9);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.7;
        }

        .heading { font-weight: 600; margin: 24px 0 16px; color: white; }
        .h1 { font-size: 28px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .h2 { font-size: 22px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .h3 { font-size: 18px; }
        .h4 { font-size: 16px; }
        .h5 { font-size: 14px; }
        .h6 { font-size: 13px; color: rgba(255, 255, 255, 0.7); }

        .paragraph { margin: 16px 0; color: rgba(255, 255, 255, 0.85); }

        .code-block {
          position: relative;
          margin: 16px 0;
          background: #0d0d10;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .code-language {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .code-block pre {
          margin: 0;
          padding: 16px;
          overflow-x: auto;
        }

        .code-block code {
          font-family: "Fira Code", "SF Mono", Monaco, monospace;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre;
        }

        .mermaid-block {
          margin: 24px 0;
        }

        .mermaid-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: rgba(139, 92, 246, 0.05);
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 8px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .list, .task-list {
          margin: 16px 0;
          padding-left: 24px;
        }

        .list li, .task-item {
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.85);
        }

        .task-list {
          list-style: none;
          padding-left: 0;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .task-checkbox {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          font-size: 11px;
          color: transparent;
        }

        .task-checkbox.checked {
          background: #8b5cf6;
          border-color: #8b5cf6;
          color: white;
        }

        .blockquote {
          margin: 16px 0;
          padding: 12px 20px;
          border-left: 4px solid #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border-radius: 0 8px 8px 0;
        }

        .table-wrapper {
          margin: 16px 0;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th, td {
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left;
        }

        th {
          background: rgba(255, 255, 255, 0.04);
          font-weight: 600;
          color: white;
        }

        td {
          color: rgba(255, 255, 255, 0.8);
        }

        tr:hover td {
          background: rgba(139, 92, 246, 0.05);
        }

        .divider {
          margin: 24px 0;
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Inline styles */
        :global(strong) { font-weight: 600; color: white; }
        :global(em) { font-style: italic; color: rgba(255, 255, 255, 0.9); }
        :global(code) {
          padding: 2px 6px;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 4px;
          font-family: "Fira Code", monospace;
          font-size: 0.9em;
          color: #c084fc;
        }
        :global(del) { text-decoration: line-through; opacity: 0.6; }
        :global(a) { color: #8b5cf6; text-decoration: none; }
        :global(a:hover) { text-decoration: underline; }

        /* Syntax highlighting */
        :global(.keyword) { color: #c678dd; }
        :global(.builtin) { color: #d19a66; }
        :global(.string) { color: #98c379; }
        :global(.number) { color: #d19a66; }
        :global(.comment) { color: #5c6370; font-style: italic; }
        :global(.punctuation) { color: #abb2bf; }
        :global(.operator) { color: #56b6c2; }
        :global(.function) { color: #61afef; }
        :global(.type) { color: #e5c07b; }
        :global(.identifier) { color: #e06c75; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default MarkdownRenderer;
