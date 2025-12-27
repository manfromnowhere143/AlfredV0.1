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
  type: 'text' | 'code' | 'code-streaming';
  content: string;
  language?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK DETECTION — Handles streaming partial code
// ═══════════════════════════════════════════════════════════════════════════════

function parseContent(content: string, isStreaming: boolean = false): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const completeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const incompleteBlockRegex = /```(\w+)?\n([\s\S]*)$/;
  
  let lastIndex = 0;
  let match;

  while ((match = completeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', content: text });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) {
    const incompleteMatch = remaining.match(incompleteBlockRegex);
    if (incompleteMatch && isStreaming) {
      const textBefore = remaining.slice(0, incompleteMatch.index).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      parts.push({
        type: 'code-streaming',
        language: incompleteMatch[1] || 'plaintext',
        content: incompleteMatch[2] || '',
      });
    } else {
      const text = remaining.trim();
      if (text) parts.push({ type: 'text', content: text });
    }
  }

  if (parts.length === 0) parts.push({ type: 'text', content });
  return parts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK IF CODE IS RENDERABLE
// ═══════════════════════════════════════════════════════════════════════════════

function isRenderableCode(language: string, code: string): boolean {
  const renderableLanguages = ['html', 'jsx', 'tsx', 'react', 'javascript', 'js'];
  if (!renderableLanguages.includes(language.toLowerCase())) return false;
  const hasJSX = /<[A-Z][a-zA-Z]*|<div|<span|<button|<input|<form|<section|<header|<main|<nav|<footer/i.test(code);
  const hasHTML = /<html|<!DOCTYPE|<body|<head/i.test(code);
  const hasComponent = /export\s+(default\s+)?function|const\s+\w+\s*=\s*\(|function\s+\w+\s*\(/i.test(code);
  return hasJSX || hasHTML || hasComponent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE PREVIEW HTML
// ═══════════════════════════════════════════════════════════════════════════════

function generatePreviewHTML(code: string, language: string): string {
  const isReact = ['jsx', 'tsx', 'react', 'javascript', 'js'].includes(language.toLowerCase());
  const isHTML = language.toLowerCase() === 'html';

  if (isHTML) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body>${code}</body></html>`;
  }

  if (isReact) {
    let componentName = 'App';
    const exportFuncMatch = code.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    const constMatch = code.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(/);
    const funcMatch = code.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
    if (exportFuncMatch) componentName = exportFuncMatch[1];
    else if (constMatch) componentName = constMatch[1];
    else if (funcMatch) componentName = funcMatch[1];

    let cleanedCode = code
      .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/export\s+default\s+/, '')
      .trim();

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    #root { min-height: 100vh; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    const ChevronRightIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
    const StarIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>;
    const MapPinIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    const PhoneIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
    const EnvelopeIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
    const ShoppingBagIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    const HeartIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    const Bars3Icon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
    const XMarkIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

    ${cleanedCode}

    try {
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${componentName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:40px;color:#ff6b6b;font-family:monospace;background:#1a1a1a;min-height:100vh;"><h2 style="margin-bottom:16px;">Render Error</h2><pre style="white-space:pre-wrap;opacity:0.7;">' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html><html><head><style>body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;}</style></head><body><pre>${code}</pre></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK — Streaming Support + Fixed Scroll
// ═══════════════════════════════════════════════════════════════════════════════

interface CodeBlockProps {
  language: string;
  code: string;
  isStreaming?: boolean;
  onPreview?: () => void;
}

function CodeBlock({ language, code, isStreaming = false, onPreview }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRenderable = !isStreaming && isRenderableCode(language, code);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <>
      <div className={`code-block ${isStreaming ? 'streaming' : ''}`}>
        <div className="code-header">
          <span className="code-lang">{language.toUpperCase()}</span>
          <div className="code-actions">
            <button className={`code-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} disabled={isStreaming}>
              {copied ? 'COPIED' : 'COPY'}
            </button>
            {isRenderable && onPreview && (
              <button className="code-btn preview" onClick={onPreview}>PREVIEW</button>
            )}
          </div>
        </div>
        <div className="code-wrapper">
          <div className="code-scroll" ref={scrollRef}>
            <div className="code-inner">
              {lines.map((line, i) => (
                <div key={i} className="code-line">
                  <span className="line-num">{i + 1}</span>
                  <span className="line-code">{line || ' '}</span>
                </div>
              ))}
              {isStreaming && <span className="code-cursor" />}
            </div>
          </div>
          <div className="fade-top" />
          <div className="fade-bottom" />
        </div>
      </div>

      <style jsx>{`
        .code-block {
          position: relative;
          width: 100%;
          max-width: 700px;
          margin: 12px 0;
          border-radius: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
        }
        .code-block.streaming { border-color: color-mix(in srgb, var(--accent-gold) 30%, transparent); }
        
        .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border-subtle);
        }
        .code-lang {
          font-family: 'SF Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          opacity: 0.5;
        }
        .code-actions { display: flex; gap: 6px; }
        .code-btn {
          font-family: 'SF Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .code-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-light); }
        .code-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .code-btn.copied { color: #34d399; border-color: #34d399; }
        .code-btn.preview {
          color: var(--accent-gold);
          border-color: color-mix(in srgb, var(--accent-gold) 40%, transparent);
        }
        .code-btn.preview:hover {
          background: color-mix(in srgb, var(--accent-gold) 10%, transparent);
          border-color: var(--accent-gold);
        }
        
        .code-wrapper { position: relative; height: 280px; }
        .code-scroll {
          position: absolute;
          inset: 0;
          overflow: auto;
          overscroll-behavior: contain;
        }
        .code-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .code-scroll::-webkit-scrollbar-track { background: transparent; }
        .code-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .code-scroll::-webkit-scrollbar-corner { background: transparent; }
        
        .code-inner { padding: 14px 0; min-width: max-content; }
        .code-line {
          display: flex;
          padding: 1px 14px;
          min-height: 20px;
          font-family: 'SF Mono', monospace;
          font-size: 12px;
          line-height: 20px;
        }
        .line-num {
          width: 32px;
          flex-shrink: 0;
          color: var(--text-subtle);
          opacity: 0.3;
          text-align: right;
          padding-right: 14px;
          user-select: none;
        }
        .line-code { color: var(--text-primary); white-space: pre; opacity: 0.85; }
        
        .code-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: var(--accent-gold);
          margin-left: 2px;
          animation: blink 0.8s step-end infinite;
          vertical-align: middle;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        
        .fade-top, .fade-bottom {
          position: absolute;
          left: 0;
          right: 6px;
          height: 16px;
          pointer-events: none;
          z-index: 5;
        }
        .fade-top { top: 0; background: linear-gradient(to bottom, var(--bg-surface), transparent); }
        .fade-bottom { bottom: 0; background: linear-gradient(to top, var(--bg-surface), transparent); }
        
        @media (max-width: 640px) {
          .code-wrapper { height: 200px; }
          .code-line { font-size: 11px; min-height: 18px; line-height: 18px; }
          .line-num { width: 26px; padding-right: 10px; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PREVIEW — Mobile: Full Preview | Desktop: Split
// ═══════════════════════════════════════════════════════════════════════════════

interface SplitPreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

function SplitPreview({ code, language, onClose }: SplitPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [splitPosition, setSplitPosition] = useState(42);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const previewHTML = useMemo(() => generatePreviewHTML(code, language), [code, language]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPosition(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 25), 70));
    };
    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const handleRefresh = () => {
    setIsLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = '';
      setTimeout(() => { if (iframeRef.current) iframeRef.current.srcdoc = previewHTML; }, 50);
    }
  };

  const lines = code.split('\n');

  return (
    <>
      <div className="split-overlay">
        <div className={`split-container ${isMobile ? 'mobile' : ''}`} ref={containerRef}>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>

          {!isMobile && (
            <>
              <div className="panel code-panel" style={{ width: `${splitPosition}%` }}>
                <div className="panel-header">
                  <span className="panel-title">Code</span>
                  <span className="panel-lang">{language.toUpperCase()}</span>
                </div>
                <div className="panel-body">
                  <div className="code-scroll-split">
                    {lines.map((line, i) => (
                      <div key={i} className="split-line">
                        <span className="ln">{i + 1}</span>
                        <span className="lc">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`drag-handle ${isDragging ? 'active' : ''}`} onMouseDown={() => setIsDragging(true)}>
                <div className="dots"><span /><span /><span /></div>
              </div>
            </>
          )}

          <div className="panel preview-panel" style={{ width: isMobile ? '100%' : `${100 - splitPosition}%` }}>
            <div className="panel-header">
              <span className="panel-title"><span className="live-dot" />Preview</span>
              <button className="refresh-btn" onClick={handleRefresh}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="preview-frame">
              {!isLoaded && <div className="loading"><div className="spinner" /></div>}
              <iframe
                ref={iframeRef}
                srcDoc={previewHTML}
                sandbox="allow-scripts allow-same-origin"
                title="Preview"
                onLoad={() => setIsLoaded(true)}
                style={{ opacity: isLoaded ? 1 : 0 }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .split-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: var(--bg-void);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .split-container { display: flex; width: 100%; height: 100%; position: relative; }
        
        .close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 100;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
        }
        .close-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.08); transform: scale(1.05); }
        
        .panel { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .code-panel { background: var(--bg-void); }
        .preview-panel { background: #0a0a0a; }
        
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        .panel-lang {
          font-family: 'SF Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: var(--text-subtle);
          padding: 3px 7px;
          background: rgba(255,255,255,0.04);
          border-radius: 3px;
        }
        
        .refresh-btn {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
        }
        .refresh-btn:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
        .refresh-btn:active svg { animation: spin 0.4s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .panel-body { flex: 1; overflow: hidden; }
        .code-scroll-split { height: 100%; overflow: auto; padding: 14px 0; }
        .code-scroll-split::-webkit-scrollbar { width: 6px; height: 6px; }
        .code-scroll-split::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        
        .split-line {
          display: flex;
          padding: 1px 18px;
          min-height: 20px;
          font-family: 'SF Mono', monospace;
          font-size: 12px;
          line-height: 20px;
        }
        .ln { width: 32px; flex-shrink: 0; color: var(--text-subtle); opacity: 0.3; text-align: right; padding-right: 14px; user-select: none; }
        .lc { color: var(--text-primary); white-space: pre; opacity: 0.85; }
        
        .preview-frame { flex: 1; position: relative; overflow: hidden; }
        .preview-frame iframe { width: 100%; height: 100%; border: none; transition: opacity 0.2s ease; }
        .loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #0a0a0a; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--text-muted); border-radius: 50%; animation: spin 0.6s linear infinite; }
        
        .drag-handle {
          width: 1px;
          background: rgba(255,255,255,0.06);
          cursor: col-resize;
          position: relative;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .drag-handle::before { content: ''; position: absolute; inset: 0; width: 14px; left: -7px; }
        .drag-handle:hover, .drag-handle.active { background: rgba(255,255,255,0.15); }
        .dots {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          gap: 3px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .drag-handle:hover .dots, .drag-handle.active .dots { opacity: 1; }
        .dots span { width: 3px; height: 3px; border-radius: 50%; background: var(--text-muted); }
        
        /* Mobile: Full Preview Only */
        .split-container.mobile .code-panel,
        .split-container.mobile .drag-handle { display: none; }
        .split-container.mobile .preview-panel { width: 100%; }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Message({ id, role, content, timestamp, isStreaming = false }: MessageProps) {
  const [previewCode, setPreviewCode] = useState<{ code: string; language: string } | null>(null);
  const parsedContent = useMemo(() => parseContent(content, isStreaming), [content, isStreaming]);

  const renderText = (text: string) => {
    const parts: ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      if (match[1]) parts.push(<strong key={key++} className="font-medium">{match[2]}</strong>);
      else if (match[3]) parts.push(<code key={key++} className="inline-code">{match[4]}</code>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    return parts.length ? parts : text;
  };

  return (
    <>
      <div className={`message ${role}`}>
        <div className="message-content">
          {parsedContent.map((part, index) => {
            if (part.type === 'code' || part.type === 'code-streaming') {
              return (
                <CodeBlock
                  key={index}
                  language={part.language || 'plaintext'}
                  code={part.content}
                  isStreaming={part.type === 'code-streaming'}
                  onPreview={part.type === 'code' ? () => setPreviewCode({ code: part.content, language: part.language || 'plaintext' }) : undefined}
                />
              );
            }
            return <p key={index} className="message-text">{renderText(part.content)}</p>;
          })}
          {isStreaming && parsedContent.every(p => p.type === 'text') && <span className="cursor" />}
        </div>
      </div>

      {previewCode && (
        <SplitPreview code={previewCode.code} language={previewCode.language} onClose={() => setPreviewCode(null)} />
      )}

      <style jsx>{`
        .message { display: flex; flex-direction: column; animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .message.user { align-items: flex-end; }
        .message.alfred { align-items: flex-start; }
        .message-content { max-width: 90%; font-size: 15px; line-height: 1.7; color: var(--text-primary); }
        .message-text { margin: 0; padding: 3px 0; }
        .message.user .message-text { text-align: right; }
        .message-text :global(.inline-code) {
          font-family: 'SF Mono', monospace;
          font-size: 13px;
          padding: 2px 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
        }
        .cursor {
          display: inline-block;
          width: 2px;
          height: 16px;
          background: var(--text-primary);
          margin-left: 2px;
          animation: blink 0.8s step-end infinite;
          vertical-align: text-bottom;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALFRED THINKING
// ═══════════════════════════════════════════════════════════════════════════════

export function AlfredThinking() {
  return (
    <>
      <div className="thinking"><span /><span /><span /></div>
      <style jsx>{`
        .thinking { display: flex; gap: 5px; padding: 12px 0; }
        .thinking span {
          width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted);
          animation: dot 1.4s ease-in-out infinite;
        }
        .thinking span:nth-child(2) { animation-delay: 0.15s; }
        .thinking span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes dot { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </>
  );
}