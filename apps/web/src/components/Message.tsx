'use client';

import { useState, useMemo, useRef, useEffect, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MessageProps {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ParsedContent {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function parseContent(content: string): ParsedContent[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: ParsedContent[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: 'text', content: text });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK IF CODE IS RENDERABLE (React/HTML)
// ═══════════════════════════════════════════════════════════════════════════════

function isRenderableCode(language: string, code: string): boolean {
  const renderableLanguages = ['html', 'jsx', 'tsx', 'react', 'vue', 'svelte'];
  if (!renderableLanguages.includes(language.toLowerCase())) return false;
  
  const hasJSX = /<[A-Z][a-zA-Z]*|<div|<span|<button|<input|<form|<section|<header|<main/i.test(code);
  const hasHTML = /<html|<!DOCTYPE|<body|<head/i.test(code);
  const hasComponent = /export\s+(default\s+)?function|const\s+\w+\s*=\s*\(|function\s+\w+\s*\(/i.test(code);
  
  return hasJSX || hasHTML || hasComponent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CODE TERMINAL — Your Portfolio's Exact Style
// ═══════════════════════════════════════════════════════════════════════════════

interface FloatingCodeTerminalProps {
  language: string;
  code: string;
  onPreview?: () => void;
}

function FloatingCodeTerminal({ language, code, onPreview }: FloatingCodeTerminalProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const isRenderable = isRenderableCode(language, code);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setCanScroll(el.scrollHeight > el.clientHeight);
    }
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <>
      <div className="floating-terminal">
        <div className="floating-terminal-header">
          <span className="floating-terminal-lang">{language.toUpperCase()}</span>
          <div className="floating-terminal-actions">
            <button 
              className={`floating-terminal-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
            {isRenderable && onPreview && (
              <button 
                className="floating-terminal-btn preview-btn"
                onClick={onPreview}
              >
                PREVIEW
              </button>
            )}
          </div>
        </div>

        <div className="floating-terminal-window">
          <div className="terminal-fade-top" />
          
          <div className="floating-terminal-content" ref={contentRef}>
            {lines.map((line, index) => (
              <div key={index} className="code-line">
                <span className="line-number">{index + 1}</span>
                <span className="line-content">{line || ' '}</span>
              </div>
            ))}
          </div>

          <div className="terminal-fade-bottom" />

          {canScroll && (
            <div className="scroll-arrow">
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .floating-terminal {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 16px 0;
        }
        
        .floating-terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          margin-bottom: 4px;
        }
        
        .floating-terminal-lang {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: var(--text-muted);
          opacity: 0.6;
          transition: color 0.4s ease;
        }
        
        .floating-terminal-actions {
          display: flex;
          gap: 8px;
        }
        
        .floating-terminal-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .floating-terminal-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-light);
          background: var(--border-subtle);
        }
        
        .floating-terminal-btn.copied {
          color: var(--color-positive);
          border-color: var(--color-positive);
        }
        
        .floating-terminal-btn.preview-btn {
          color: var(--accent-gold);
          border-color: var(--accent-gold-muted);
        }
        
        .floating-terminal-btn.preview-btn:hover {
          background: var(--accent-gold-muted);
          border-color: var(--accent-gold);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* FLOATING TERMINAL WINDOW — Your Exact Style                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .floating-terminal-window {
          position: relative;
          background: transparent;
          overflow: visible;
        }
        
        /* Top fade - text disappears upward */
        .terminal-fade-top {
          position: absolute;
          top: -4px;
          left: -24px;
          right: -24px;
          height: 40px;
          pointer-events: none;
          z-index: 15;
          background: linear-gradient(to bottom, 
            var(--bg-void) 0%,
            var(--bg-void) 20%,
            color-mix(in srgb, var(--bg-void) 95%, transparent) 35%,
            color-mix(in srgb, var(--bg-void) 80%, transparent) 50%,
            color-mix(in srgb, var(--bg-void) 50%, transparent) 70%,
            color-mix(in srgb, var(--bg-void) 20%, transparent) 85%,
            transparent 100%
          );
          transition: background 0.4s ease;
        }
        
        /* Bottom fade - text disappears downward */
        .terminal-fade-bottom {
          position: absolute;
          bottom: -8px;
          left: -24px;
          right: -24px;
          height: 50px;
          pointer-events: none;
          z-index: 15;
          background: linear-gradient(to top, 
            var(--bg-void) 0%,
            var(--bg-void) 25%,
            color-mix(in srgb, var(--bg-void) 95%, transparent) 40%,
            color-mix(in srgb, var(--bg-void) 80%, transparent) 55%,
            color-mix(in srgb, var(--bg-void) 50%, transparent) 72%,
            color-mix(in srgb, var(--bg-void) 20%, transparent) 88%,
            transparent 100%
          );
          transition: background 0.4s ease;
        }
        
        .floating-terminal-content {
          position: relative;
          padding: 24px 0;
          max-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .floating-terminal-content::-webkit-scrollbar {
          display: none;
        }
        
        .code-line {
          display: flex;
          padding: 1px 8px;
          min-height: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 20px;
          letter-spacing: 0.02em;
          font-weight: 300;
        }
        
        .line-number {
          width: 32px;
          flex-shrink: 0;
          color: var(--text-subtle);
          opacity: 0.4;
          text-align: right;
          padding-right: 16px;
          user-select: none;
          font-variant-numeric: tabular-nums;
          transition: color 0.4s ease;
        }
        
        .line-content {
          color: var(--text-primary);
          white-space: pre;
          opacity: 0.9;
          transition: color 0.4s ease;
        }
        
        /* Scroll arrow */
        .scroll-arrow {
          position: absolute;
          bottom: 8px;
          right: 4px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          opacity: 0.3;
          animation: arrowFloat 2.5s ease-in-out infinite;
        }
        
        .scroll-arrow svg {
          width: 12px;
          height: 12px;
          stroke: var(--text-primary);
          stroke-width: 1.5;
          fill: none;
          transition: stroke 0.4s ease;
        }
        
        @keyframes arrowFloat {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(3px); opacity: 0.5; }
        }
        
        @media (max-width: 600px) {
          .floating-terminal-content {
            max-height: 220px;
            padding: 20px 0;
          }
          .terminal-fade-top { height: 32px; }
          .terminal-fade-bottom { height: 40px; }
          .code-line { font-size: 11px; min-height: 18px; line-height: 18px; }
          .line-number { width: 28px; padding-right: 12px; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PREVIEW SYSTEM — State of the Art
// ═══════════════════════════════════════════════════════════════════════════════

interface SplitPreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

function SplitPreview({ code, language, onClose }: SplitPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const previewHTML = useMemo(() => {
    const isReact = ['jsx', 'tsx', 'react'].includes(language.toLowerCase());
    const isHTML = language.toLowerCase() === 'html';

    if (isHTML) {
      return code;
    }

    if (isReact) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #root { width: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    
    // Auto-render detection
    const possibleComponents = ['App', 'Component', 'Default', 'Main', 'Page'];
    let ComponentToRender = null;
    
    for (const name of possibleComponents) {
      if (typeof window[name] === 'function') {
        ComponentToRender = window[name];
        break;
      }
    }
    
    if (ComponentToRender) {
      ReactDOM.createRoot(document.getElementById('root')).render(<ComponentToRender />);
    } else {
      document.getElementById('root').innerHTML = '<div style="color:#888;text-align:center;">No component found to render</div>';
    }
  </script>
</body>
</html>`;
    }

    return `<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:20px;">
      <pre style="white-space:pre-wrap;word-break:break-word;">${code}</pre>
    </body></html>`;
  }, [code, language]);

  const handleMouseDown = () => setIsDragging(true);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(newPosition, 20), 80));
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = previewHTML;
    }
  };

  return (
    <>
      <div className="split-preview-overlay">
        <div className="split-preview-container" ref={containerRef}>
          <button className="split-preview-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>

          <div className="split-panel code-panel" style={{ width: `${splitPosition}%` }}>
            <div className="split-panel-header">
              <span className="split-panel-label">CODE</span>
              <span className="split-panel-lang">{language.toUpperCase()}</span>
            </div>
            <div className="split-panel-content">
              <FloatingCodeTerminal language={language} code={code} />
            </div>
          </div>

          <div 
            className={`split-handle ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="split-handle-line" />
          </div>

          <div className="split-panel preview-panel" style={{ width: `${100 - splitPosition}%` }}>
            <div className="split-panel-header">
              <span className="split-panel-label">PREVIEW</span>
              <button className="preview-refresh-btn" onClick={handleRefresh} title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="split-panel-preview">
              <iframe
                ref={iframeRef}
                srcDoc={previewHTML}
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .split-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: var(--bg-void);
          animation: splitFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes splitFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .split-preview-container {
          display: flex;
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .split-preview-close {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 100;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        
        .split-preview-close:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
          transform: scale(1.05);
        }
        
        .split-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .split-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        
        .split-panel-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--text-muted);
        }
        
        .split-panel-lang {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--text-subtle);
          padding: 4px 8px;
          background: var(--border-subtle);
          border-radius: 4px;
        }
        
        .split-panel-content {
          flex: 1;
          overflow: auto;
          padding: 24px;
        }
        
        .code-panel {
          background: var(--bg-void);
          border-right: 1px solid var(--border-subtle);
        }
        
        .preview-panel {
          background: var(--bg-surface);
        }
        
        .split-panel-preview {
          flex: 1;
          overflow: hidden;
        }
        
        .split-panel-preview iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #0a0a0a;
        }
        
        .preview-refresh-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid var(--border-default);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
        }
        
        .preview-refresh-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        
        /* Drag handle */
        .split-handle {
          width: 8px;
          background: var(--border-subtle);
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
          flex-shrink: 0;
        }
        
        .split-handle:hover,
        .split-handle.dragging {
          background: var(--border-default);
        }
        
        .split-handle-line {
          width: 2px;
          height: 40px;
          background: var(--text-subtle);
          border-radius: 1px;
          opacity: 0.5;
        }
        
        .split-handle.dragging .split-handle-line {
          opacity: 1;
          background: var(--text-muted);
        }
        
        @media (max-width: 768px) {
          .split-preview-container {
            flex-direction: column;
          }
          
          .split-panel {
            width: 100% !important;
            height: 50%;
          }
          
          .code-panel {
            border-right: none;
            border-bottom: 1px solid var(--border-subtle);
          }
          
          .split-handle {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT — NO HEADER, Pure Floating Text
// ═══════════════════════════════════════════════════════════════════════════════

export default function Message({ 
  id, 
  role, 
  content, 
  timestamp,
  isStreaming = false 
}: MessageProps) {
  const [previewCode, setPreviewCode] = useState<{ code: string; language: string } | null>(null);
  const parsedContent = useMemo(() => parseContent(content), [content]);

  const renderText = (text: string) => {
    const inlineCodeRegex = /`([^`]+)`/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <code 
          key={`code-${match.index}`}
          className="inline-code"
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    return parts.length ? parts : text;
  };

  return (
    <>
      <div className={`message ${role}`}>
        {/* NO HEADER — Pure floating text */}
        <div className="message-content">
          {parsedContent.map((part, index) => {
            if (part.type === 'code') {
              return (
                <FloatingCodeTerminal
                  key={index}
                  language={part.language || 'plaintext'}
                  code={part.content}
                  onPreview={() => setPreviewCode({ 
                    code: part.content, 
                    language: part.language || 'plaintext' 
                  })}
                />
              );
            }
            return (
              <p key={index} className="message-text">
                {renderText(part.content)}
              </p>
            );
          })}

          {isStreaming && (
            <span className="streaming-cursor" />
          )}
        </div>
      </div>

      {/* Split Preview */}
      {previewCode && (
        <SplitPreview
          code={previewCode.code}
          language={previewCode.language}
          onClose={() => setPreviewCode(null)}
        />
      )}

      <style jsx>{`
        .message {
          display: flex;
          flex-direction: column;
          animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message.user { align-items: flex-end; }
        .message.alfred { align-items: flex-start; }
        
        .message-content {
          max-width: 85%;
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-primary);
          transition: color 0.4s ease;
        }
        
        .message-text {
          margin: 0;
          padding: 6px 0;
        }
        
        .message.user .message-text {
          text-align: right;
        }
        
        .inline-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 2px 6px;
          background: var(--border-subtle);
          border-radius: 4px;
          transition: background 0.4s ease;
        }
        
        .streaming-cursor {
          display: inline-block;
          width: 8px;
          height: 18px;
          background: var(--text-primary);
          margin-left: 2px;
          animation: blink 1s ease-in-out infinite;
          transition: background 0.4s ease;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALFRED THINKING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function AlfredThinking() {
  return (
    <>
      <div className="alfred-thinking">
        <div className="alfred-thinking-dot" />
        <div className="alfred-thinking-dot" />
        <div className="alfred-thinking-dot" />
      </div>
      
      <style jsx>{`
        .alfred-thinking {
          display: flex;
          gap: 6px;
          padding: 16px 0;
        }
        
        .alfred-thinking-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: pulse 1.4s ease-in-out infinite;
          transition: background 0.4s ease;
        }
        
        .alfred-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .alfred-thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}