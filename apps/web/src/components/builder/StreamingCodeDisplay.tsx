'use client';

/**
 * Streaming Code Display — State of the Art
 *
 * Elegant component that shows code being generated in real-time.
 * Features:
 * - Full code visibility (no line limits)
 * - Typewriter animation effect
 * - Syntax highlighting
 * - Auto-scroll to bottom during streaming
 * - Interactive edit mode after streaming ends
 * - Line count display
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';

// Simple syntax highlighting patterns
const TOKEN_PATTERNS = [
  { pattern: /^(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|enum|async|await|try|catch|finally|throw|new|delete|typeof|instanceof|void|yield|static|extends|implements|public|private|protected|readonly)\b/, className: 'keyword' },
  { pattern: /^(true|false|null|undefined|this|super|NaN|Infinity)\b/, className: 'builtin' },
  { pattern: /^'(?:[^'\\]|\\.)*'|^"(?:[^"\\]|\\.)*"|^`(?:[^`\\]|\\.)*`/, className: 'string' },
  { pattern: /^0x[0-9a-fA-F]+|^0b[01]+|^0o[0-7]+|^\d+(\.\d+)?([eE][+-]?\d+)?/, className: 'number' },
  { pattern: /^\/\/.*/, className: 'comment' },
  { pattern: /^\/\*[\s\S]*?\*\//, className: 'comment' },
  { pattern: /^[<>{}()\[\];:,.]/, className: 'punctuation' },
  { pattern: /^(===|!==|=>|<=|>=|&&|\|\||[=+\-*/%!&|^~<>?]+)/, className: 'operator' },
  { pattern: /^[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*[<(])/, className: 'function' },
  { pattern: /^[A-Z][a-zA-Z0-9_$]*/, className: 'type' },
  { pattern: /^[a-zA-Z_$][a-zA-Z0-9_$]*/, className: 'identifier' },
];

function highlightCode(code: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = code;
  let key = 0;

  while (remaining.length > 0) {
    // Skip whitespace
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      tokens.push(<span key={key++}>{wsMatch[0]}</span>);
      remaining = remaining.slice(wsMatch[0].length);
      continue;
    }

    // Try to match tokens
    let matched = false;
    for (const { pattern, className } of TOKEN_PATTERNS) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push(
          <span key={key++} className={className}>
            {match[0]}
          </span>
        );
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }

    // If no match, take one character
    if (!matched) {
      tokens.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export interface StreamingCodeDisplayProps {
  /** Current file being generated */
  currentFile?: string | null;
  /** Code content to display */
  code: string;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Language for syntax highlighting */
  language?: string;
  /** Callback when user wants to edit */
  onRequestEdit?: () => void;
  /** Show edit hint when not streaming */
  showEditHint?: boolean;
}

export const StreamingCodeDisplay = memo(function StreamingCodeDisplay({
  currentFile,
  code,
  isStreaming = false,
  language = 'typescript',
  onRequestEdit,
  showEditHint = true,
}: StreamingCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (containerRef.current && isStreaming && autoScroll) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [code, isStreaming, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !isStreaming) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, [isStreaming]);

  // Re-enable auto-scroll when streaming restarts
  useEffect(() => {
    if (isStreaming) setAutoScroll(true);
  }, [isStreaming]);

  // Handle keyboard events for edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isStreaming && e.key === 'Enter' && onRequestEdit) {
      e.preventDefault();
      onRequestEdit();
    }
  }, [isStreaming, onRequestEdit]);

  const lines = code.split('\n');
  const lineCount = lines.length;
  const charCount = code.length;

  return (
    <div
      className="streaming-code-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* File header */}
      <div className="file-header">
        <div className="file-indicator">
          <div className={`file-dot ${isStreaming ? 'streaming' : 'ready'}`} />
          <span className="file-name">{currentFile || 'Untitled'}</span>
          <span className="file-stats">{lineCount} lines • {charCount.toLocaleString()} chars</span>
        </div>
        <div className="header-right">
          {isStreaming ? (
            <div className="streaming-badge">
              <div className="pulse-dot" />
              <span>Generating</span>
            </div>
          ) : showEditHint && onRequestEdit && (
            <button className="edit-hint" onClick={onRequestEdit}>
              <span>Press Enter to edit</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Code display - full scrollable view */}
      <div
        className="code-display"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div className="line-numbers">
          {lines.map((_, i) => (
            <span key={i} className="line-number">{i + 1}</span>
          ))}
        </div>
        <pre className="code-content">
          <code>
            {highlightCode(code)}
            {isStreaming && <span className="cursor" />}
          </code>
        </pre>
      </div>

      {/* Scroll indicator when auto-scroll is disabled */}
      {isStreaming && !autoScroll && (
        <button
          className="scroll-to-bottom"
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
          <span>Scroll to latest</span>
        </button>
      )}

      <style jsx>{`
        .streaming-code-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: #0d0d10;
          border-radius: 8px;
          overflow: hidden;
          font-family: 'Fira Code', 'JetBrains Mono', 'SF Mono', Monaco, monospace;
          outline: none;
        }

        .streaming-code-container:focus {
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }

        .file-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
        }

        .file-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .file-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .file-dot.streaming {
          background: #8b5cf6;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .file-dot.ready {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
        }

        .file-name {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .file-stats {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .streaming-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 12px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .streaming-badge span {
          font-size: 10px;
          font-weight: 500;
          color: rgba(139, 92, 246, 0.9);
          letter-spacing: 0.5px;
        }

        .edit-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: 8px;
          color: rgba(34, 197, 94, 0.9);
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-hint:hover {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.4);
          color: #22c55e;
        }

        .code-display {
          flex: 1;
          display: flex;
          overflow-y: auto;
          overflow-x: auto;
          padding: 12px 0;
          min-height: 0;
        }

        .line-numbers {
          display: flex;
          flex-direction: column;
          padding: 0 12px;
          text-align: right;
          user-select: none;
          flex-shrink: 0;
          background: #0d0d10;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }

        .line-number {
          font-size: 12px;
          line-height: 20px;
          color: rgba(255, 255, 255, 0.2);
          min-width: 32px;
          height: 20px;
        }

        .code-content {
          flex: 1;
          margin: 0;
          padding: 0 16px;
          font-size: 13px;
          line-height: 20px;
          color: rgba(255, 255, 255, 0.9);
          min-width: 0;
          /* Ensure the pre element displays correctly */
          display: flex;
        }

        .code-content code {
          display: block;
          white-space: pre;
          flex: 1;
        }

        .cursor {
          display: inline-block;
          width: 8px;
          height: 16px;
          background: #8b5cf6;
          animation: blink 1s step-end infinite;
          vertical-align: middle;
          margin-left: 2px;
        }

        .scroll-to-bottom {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(139, 92, 246, 0.9);
          border: none;
          border-radius: 20px;
          color: white;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          transition: all 0.2s ease;
          z-index: 10;
        }

        .scroll-to-bottom:hover {
          background: #8b5cf6;
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
        }

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

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .code-display::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .code-display::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }

        .code-display::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 4px;
        }

        .code-display::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .code-display::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  );
});

export default StreamingCodeDisplay;
