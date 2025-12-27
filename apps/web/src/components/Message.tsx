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
// GENERATE PREVIEW HTML — Properly renders React + Tailwind
// ═══════════════════════════════════════════════════════════════════════════════

function generatePreviewHTML(code: string, language: string): string {
  const isReact = ['jsx', 'tsx', 'react', 'javascript', 'js'].includes(language.toLowerCase());
  const isHTML = language.toLowerCase() === 'html';

  if (isHTML) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>${code}</body>
</html>`;
  }

  if (isReact) {
    // Extract the component name - try multiple patterns
    let componentName = 'App';
    
    // Pattern 1: const ComponentName = () =>
    const constMatch = code.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(/);
    // Pattern 2: function ComponentName()
    const funcMatch = code.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/);
    // Pattern 3: export default function ComponentName
    const exportFuncMatch = code.match(/export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/);
    // Pattern 4: Just find any PascalCase function/const that returns JSX
    const anyComponentMatch = code.match(/(?:const|function)\s+([A-Z][a-zA-Z0-9]*)/);
    
    if (exportFuncMatch) componentName = exportFuncMatch[1];
    else if (constMatch) componentName = constMatch[1];
    else if (funcMatch) componentName = funcMatch[1];
    else if (anyComponentMatch) componentName = anyComponentMatch[1];

    // Clean imports - remove all import statements
    let cleanedCode = code
      .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
      .trim();
    
    // Remove export default if present (we'll handle rendering ourselves)
    cleanedCode = cleanedCode.replace(/export\s+default\s+/, '');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    #root { min-height: 100vh; }
    
    /* Smooth scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // ═══════════════════════════════════════════════════════════════════════════
    // HEROICONS — Complete implementations
    // ═══════════════════════════════════════════════════════════════════════════
    
    const ChevronRightIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    );
    
    const ChevronLeftIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    );
    
    const StarIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
      </svg>
    );
    
    const MapPinIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    );
    
    const PhoneIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    );
    
    const EnvelopeIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    );
    
    const ShoppingBagIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    );
    
    const HeartIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    );
    
    const Bars3Icon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    );
    
    const XMarkIcon = (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // USER COMPONENT CODE
    // ═══════════════════════════════════════════════════════════════════════════
    
    ${cleanedCode}

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:40px;color:#ff6b6b;font-family:monospace;"><h2>Render Error</h2><pre>' + err.message + '</pre></div>';
      console.error('Render error:', err);
    }
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html><head><style>body{background:#0a0a0a;color:#fff;font-family:monospace;padding:20px;}</style></head>
<body><pre>${code}</pre></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CODE TERMINAL — Minimal Elegance
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
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          opacity: 0.5;
        }
        
        .floating-terminal-actions {
          display: flex;
          gap: 8px;
        }
        
        .floating-terminal-btn {
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 5px 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .floating-terminal-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-light);
        }
        
        .floating-terminal-btn.copied {
          color: #34d399;
          border-color: #34d399;
        }
        
        .floating-terminal-btn.preview-btn {
          color: var(--accent-gold);
          border-color: color-mix(in srgb, var(--accent-gold) 40%, transparent);
        }
        
        .floating-terminal-btn.preview-btn:hover {
          background: color-mix(in srgb, var(--accent-gold) 10%, transparent);
          border-color: var(--accent-gold);
        }
        
        .floating-terminal-window {
          position: relative;
          background: transparent;
        }
        
        .terminal-fade-top {
          position: absolute;
          top: 0;
          left: -20px;
          right: -20px;
          height: 32px;
          pointer-events: none;
          z-index: 10;
          background: linear-gradient(to bottom, var(--bg-void) 0%, transparent 100%);
        }
        
        .terminal-fade-bottom {
          position: absolute;
          bottom: 0;
          left: -20px;
          right: -20px;
          height: 40px;
          pointer-events: none;
          z-index: 10;
          background: linear-gradient(to top, var(--bg-void) 0%, transparent 100%);
        }
        
        .floating-terminal-content {
          position: relative;
          padding: 20px 0;
          max-height: 280px;
          overflow-y: auto;
          scrollbar-width: none;
        }
        
        .floating-terminal-content::-webkit-scrollbar {
          display: none;
        }
        
        .code-line {
          display: flex;
          padding: 1px 8px;
          min-height: 20px;
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 20px;
          letter-spacing: 0.01em;
        }
        
        .line-number {
          width: 32px;
          flex-shrink: 0;
          color: var(--text-subtle);
          opacity: 0.35;
          text-align: right;
          padding-right: 16px;
          user-select: none;
          font-variant-numeric: tabular-nums;
        }
        
        .line-content {
          color: var(--text-primary);
          white-space: pre;
          opacity: 0.85;
        }
        
        .scroll-arrow {
          position: absolute;
          bottom: 8px;
          right: 4px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 15;
          opacity: 0.25;
          animation: float 2.5s ease-in-out infinite;
        }
        
        .scroll-arrow svg {
          width: 12px;
          height: 12px;
          stroke: var(--text-primary);
          stroke-width: 1.5;
          fill: none;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50% { transform: translateY(3px); opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT PREVIEW — Steve Jobs Level Elegance
// ═══════════════════════════════════════════════════════════════════════════════

interface SplitPreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

function SplitPreview({ code, language, onClose }: SplitPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [splitPosition, setSplitPosition] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const previewHTML = useMemo(() => generatePreviewHTML(code, language), [code, language]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPosition(Math.min(Math.max(newPosition, 25), 75));
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleRefresh = () => {
    setIsLoaded(false);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = previewHTML;
        }
      }, 50);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const lines = code.split('\n');

  return (
    <>
      <div className="split-overlay">
        <div className="split-container" ref={containerRef}>
          {/* Close Button */}
          <button className="split-close" onClick={onClose} aria-label="Close preview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>

          {/* Code Panel */}
          <div className="split-panel code-panel" style={{ width: `${splitPosition}%` }}>
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-dot"></span>
                Code
              </div>
              <span className="panel-lang">{language.toUpperCase()}</span>
            </div>
            <div className="panel-content">
              <div className="code-scroll">
                {lines.map((line, index) => (
                  <div key={index} className="code-line">
                    <span className="line-num">{index + 1}</span>
                    <span className="line-code">{line || ' '}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drag Handle */}
          <div 
            className={`split-handle ${isDragging ? 'active' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <div className="handle-grip">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="split-panel preview-panel" style={{ width: `${100 - splitPosition}%` }}>
            <div className="panel-header">
              <div className="panel-title">
                <span className="panel-dot live"></span>
                Preview
              </div>
              <button className="refresh-btn" onClick={handleRefresh} title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="panel-preview">
              {!isLoaded && (
                <div className="preview-loading">
                  <div className="loading-spinner"></div>
                </div>
              )}
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
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .split-container {
          display: flex;
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        /* Close Button — Minimal */
        .split-close {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 100;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }
        
        .split-close:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.06);
          transform: scale(1.05);
        }
        
        /* Panels */
        .split-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .code-panel {
          background: var(--bg-void);
        }
        
        .preview-panel {
          background: #0a0a0a;
        }
        
        /* Panel Header — Ultra Clean */
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0;
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: var(--text-secondary);
        }
        
        .panel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-subtle);
          opacity: 0.4;
        }
        
        .panel-dot.live {
          background: #34d399;
          opacity: 1;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .panel-lang {
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: var(--text-subtle);
          padding: 4px 8px;
          background: rgba(255,255,255,0.03);
          border-radius: 4px;
        }
        
        .refresh-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
        }
        
        .refresh-btn:hover {
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.03);
        }
        
        .refresh-btn:active svg {
          animation: spin 0.5s ease;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Code Content */
        .panel-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        
        .code-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 20px 0;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        
        .code-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .code-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .code-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        
        .code-line {
          display: flex;
          padding: 1px 24px;
          min-height: 22px;
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 22px;
        }
        
        .line-num {
          width: 40px;
          flex-shrink: 0;
          color: var(--text-subtle);
          opacity: 0.3;
          text-align: right;
          padding-right: 20px;
          user-select: none;
          font-variant-numeric: tabular-nums;
        }
        
        .line-code {
          color: var(--text-primary);
          white-space: pre;
          opacity: 0.85;
        }
        
        /* Preview Content */
        .panel-preview {
          flex: 1;
          overflow: hidden;
          position: relative;
          background: #0a0a0a;
        }
        
        .panel-preview iframe {
          width: 100%;
          height: 100%;
          border: none;
          transition: opacity 0.3s ease;
        }
        
        .preview-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
        }
        
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--text-muted);
          border-radius: 50%;
          animation: spinner 0.8s linear infinite;
        }
        
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        
        /* Drag Handle — Elegant */
        .split-handle {
          width: 1px;
          background: rgba(255,255,255,0.06);
          cursor: col-resize;
          position: relative;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        
        .split-handle::before {
          content: '';
          position: absolute;
          inset: 0;
          width: 12px;
          left: -6px;
        }
        
        .split-handle:hover,
        .split-handle.active {
          background: rgba(255,255,255,0.12);
        }
        
        .handle-grip {
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
        
        .split-handle:hover .handle-grip,
        .split-handle.active .handle-grip {
          opacity: 1;
        }
        
        .handle-grip span {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        
        /* Mobile */
        @media (max-width: 768px) {
          .split-container {
            flex-direction: column;
          }
          
          .split-panel {
            width: 100% !important;
            height: 50%;
          }
          
          .split-handle {
            width: 100%;
            height: 1px;
            cursor: row-resize;
          }
          
          .handle-grip {
            flex-direction: row;
          }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
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
    const parts: ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        parts.push(<strong key={key++} className="font-medium">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<code key={key++} className="inline-code">{match[4]}</code>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts.length ? parts : text;
  };

  return (
    <>
      <div className={`message ${role}`}>
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

          {isStreaming && <span className="streaming-cursor" />}
        </div>
      </div>

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
          animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message.user { align-items: flex-end; }
        .message.alfred { align-items: flex-start; }
        
        .message-content {
          max-width: 85%;
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-primary);
        }
        
        .message-text {
          margin: 0;
          padding: 4px 0;
        }
        
        .message.user .message-text {
          text-align: right;
        }
        
        .message-text :global(.inline-code) {
          font-family: 'SF Mono', 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 2px 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
        }
        
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: var(--text-primary);
          margin-left: 2px;
          animation: blink 1s step-end infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
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
      <div className="thinking">
        <span></span>
        <span></span>
        <span></span>
      </div>
      
      <style jsx>{`
        .thinking {
          display: flex;
          gap: 5px;
          padding: 16px 0;
        }
        
        .thinking span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: pulse 1.4s ease-in-out infinite;
        }
        
        .thinking span:nth-child(2) { animation-delay: 0.15s; }
        .thinking span:nth-child(3) { animation-delay: 0.3s; }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}