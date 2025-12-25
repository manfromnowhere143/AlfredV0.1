'use client';

import { useState, useRef, useEffect, useCallback, useMemo, Component, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type AlfredMode = 'builder' | 'mentor' | 'reviewer';
type Theme = 'dark' | 'light' | 'silver';
type AnimationState = 'idle' | 'entering' | 'active' | 'exiting';

interface Message {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  animState: AnimationState;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  mode: AlfredMode;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  isRenderable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — Graceful Failure
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Alfred Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="error-title">Something went wrong</p>
          <p className="error-message">Alfred encountered an issue. Please refresh to continue.</p>
          <button 
            className="error-retry-btn"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE DETECTION & RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function extractCodeBlocks(content: string): { text: string; blocks: CodeBlock[] } {
  const blocks: CodeBlock[] = [];
  let blockIndex = 0;
  
  let cleaned = content
    .replace(/<div[^>]*type="react"[^>]*>\s*/gi, '')
    .replace(/<div[^>]*>\s*```/gi, '```')
    .replace(/```\s*<\/div>/gi, '```')
    .replace(/<\/div>\s*$/gi, '');
  
  const text = cleaned.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = (lang || 'text').toLowerCase().trim();
    const id = `code-${blockIndex++}`;
    const trimmedCode = code.trim();
    
    if (!trimmedCode) return '';
    
    const isReact = ['jsx', 'tsx', 'react', 'javascript', 'js'].includes(language) && 
      (trimmedCode.includes('function') || trimmedCode.includes('const') || trimmedCode.includes('return') || trimmedCode.includes('<'));
    const isHtml = language === 'html';
    const isSvg = language === 'svg' || trimmedCode.trim().startsWith('<svg');
    const isRenderable = isReact || isHtml || isSvg;
    
    blocks.push({ id, language, code: trimmedCode, isRenderable });
    return `\n{{CODE_BLOCK_${id}}}\n`;
  });
  
  return { text, blocks };
}

function renderReactCode(code: string): string {
  let cleanCode = code
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+function\s+(\w+)/gm, 'function $1')
    .replace(/^export\s+default\s+/gm, 'const __DefaultExport__ = ')
    .replace(/^export\s+function\s+(\w+)/gm, 'function $1')
    .replace(/^export\s+const\s+(\w+)/gm, 'const $1')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .trim();

  const exportDefaultFuncMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  const exportFuncMatch = code.match(/export\s+function\s+(\w+)/);
  const funcMatch = code.match(/function\s+([A-Z]\w*)\s*\(/);
  const constMatch = code.match(/const\s+([A-Z]\w*)\s*=\s*\(/);
  const componentName = exportDefaultFuncMatch?.[1] || exportFuncMatch?.[1] || funcMatch?.[1] || constMatch?.[1] || 'App';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      max-width: 100%; 
      overflow-x: hidden; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    }
    #root { 
      width: 100%; 
      max-width: 100%; 
      min-height: 100vh; 
      overflow-x: hidden; 
    }
    .error { padding: 20px; color: #ef4444; font-size: 14px; white-space: pre-wrap; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext, Fragment } = React;
    
    const Icon = ({ d, className = "", size = 24 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>
    );
    
    const ArrowRight = ({ className, size }) => <Icon className={className} size={size} d="M5 12h14M12 5l7 7-7 7" />;
    const ArrowLeft = ({ className, size }) => <Icon className={className} size={size} d="M19 12H5M12 19l-7-7 7-7" />;
    const Heart = ({ className, size }) => (<svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>);
    const Star = ({ className, size }) => (<svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>);
    const Check = ({ className, size }) => <Icon className={className} size={size} d="M20 6L9 17l-5-5" />;
    const X = ({ className, size }) => <Icon className={className} size={size} d="M18 6L6 18M6 6l12 12" />;
    const Plus = ({ className, size }) => <Icon className={className} size={size} d="M12 5v14M5 12h14" />;
    const Minus = ({ className, size }) => <Icon className={className} size={size} d="M5 12h14" />;
    const Menu = ({ className, size }) => <Icon className={className} size={size} d="M3 12h18M3 6h18M3 18h18" />;
    const Search = ({ className, size }) => (<svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>);
    const ShoppingCart = ({ className, size }) => (<svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>);
    const ChevronRight = ({ className, size }) => <Icon className={className} size={size} d="M9 18l6-6-6-6" />;
    const ChevronLeft = ({ className, size }) => <Icon className={className} size={size} d="M15 18l-6-6 6-6" />;
    const ChevronDown = ({ className, size }) => <Icon className={className} size={size} d="M6 9l6 6 6-6" />;
    const ChevronUp = ({ className, size }) => <Icon className={className} size={size} d="M18 15l-6-6-6 6" />;
    
    ${cleanCode}
    
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
      window.parent.postMessage({ type: 'preview-success' }, '*');
    } catch(e) {
      document.getElementById('root').innerHTML = '<div class="error"><strong>Render Error:</strong>\\n' + e.message + '</div>';
      window.parent.postMessage({ type: 'preview-error', error: e.message }, '*');
      console.error(e);
    }
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK WITH PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CodeBlockWithPreview({ block, theme }: { block: CodeBlock; theme: Theme }) {
  const [view, setView] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const previewContent = useMemo(() => {
    if (!block.isRenderable || !block.code) return '';
    
    if (block.language === 'html') {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;max-width:100%;overflow-x:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${block.code}</body></html>`;
    }
    
    if (block.language === 'svg' || block.code.trim().startsWith('<svg')) {
      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;max-width:100%;overflow-x:hidden;}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fafafa 0%,#f0f0f0 100%);padding:40px;}svg{max-width:80%;height:auto;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.1));}</style></head><body>${block.code.trim()}</body></html>`;
    }
    
    if (['jsx', 'tsx', 'react', 'javascript', 'js'].includes(block.language)) {
      return renderReactCode(block.code);
    }
    
    return '';
  }, [block]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-success') {
        setIsLoading(false);
        setHasError(false);
      } else if (event.data?.type === 'preview-error') {
        setIsLoading(false);
        setHasError(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handlePreviewClick = () => {
    setView('preview');
    setIsLoading(true);
    setHasError(false);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsLoading(false), 3000);
  };

  const handleIframeLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument?.body) {
          const hasContent = iframe.contentDocument.body.innerHTML.trim().length > 0;
          if (!hasContent) setHasError(true);
        }
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    }, 500);
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  const lineCount = block.code.split('\n').length;

  return (
    <ErrorBoundary fallback={<div className="code-block-error">Failed to render code block</div>}>
      <div className={`code-block-container ${view === 'preview' ? 'preview-mode' : ''}`}>
        <div className="code-block-header">
          <div className="code-block-title">
            <span className="code-language-badge">
              <span className="code-dot" />
              <span className="code-language">{block.language}</span>
            </span>
            <span className="code-meta">{lineCount} lines</span>
          </div>
          <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {block.isRenderable && block.code && (
          <div className="code-block-toolbar">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${view === 'code' ? 'active' : ''}`}
                onClick={() => setView('code')}
              >
                <CodeIcon />
                <span>Code</span>
              </button>
              <button 
                className={`toggle-btn ${view === 'preview' ? 'active' : ''}`}
                onClick={handlePreviewClick}
              >
                <PlayIcon />
                <span>Preview</span>
              </button>
            </div>
            <button 
              className="expand-btn" 
              onClick={() => setIsFullscreen(true)} 
              title="Open in fullscreen"
            >
              <ExpandIcon />
              <span>Expand</span>
            </button>
          </div>
        )}
        
        <div className="code-block-content">
          {view === 'code' ? (
            <div className="code-view-wrapper">
              <div className="code-fade-top" />
              <div className="code-scroll-area">
                <pre className="code-pre"><code>{block.code}</code></pre>
              </div>
              <div className="code-fade-bottom" />
              {lineCount > 10 && (
                <div className="scroll-hint">
                  <ScrollIcon />
                </div>
              )}
            </div>
          ) : (
            <div className="preview-view">
              {isLoading && (
                <div className="preview-loading">
                  <div className="preview-spinner" />
                  <span>Rendering...</span>
                </div>
              )}
              {hasError && !isLoading && (
                <div className="preview-error">
                  <div className="preview-error-icon">⚠</div>
                  <div className="preview-error-text">Preview failed to render</div>
                  <button className="preview-retry-btn" onClick={handlePreviewClick}>Retry</button>
                </div>
              )}
              <iframe
                ref={iframeRef}
                srcDoc={previewContent}
                sandbox="allow-scripts"
                className={`preview-iframe ${isLoading ? 'loading' : ''}`}
                title="Live Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          )}
        </div>
      </div>

      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={(e) => e.target === e.currentTarget && setIsFullscreen(false)}>
          <div className="fullscreen-header">
            <div className="fullscreen-title">
              <span className="code-dot" />
              <span>{block.language} — Live Preview</span>
            </div>
            <button className="fullscreen-close" onClick={() => setIsFullscreen(false)}>
              <CloseIconSvg />
              <span>Close</span>
            </button>
          </div>
          <div className="fullscreen-content">
            <iframe
              srcDoc={previewContent}
              sandbox="allow-scripts"
              className="fullscreen-iframe"
              title="Fullscreen Preview"
            />
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

// Icons — Minimal, precise
function CodeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>;
}

function ExpandIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
}

function ScrollIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CloseIconSvg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function parseMarkdownToElements(content: string, theme: Theme, isStreaming: boolean): React.ReactNode[] {
  if (!content) return [];
  
  let cleaned = content
    .replace(/^[-─━—]{3,}$/gm, '')
    .replace(/\n[-─━—]{3,}\n/g, '\n\n')
    .replace(/^\*\*\*+$/gm, '')
    .replace(/^___+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  const { text, blocks } = extractCodeBlocks(cleaned);
  const parts = text.split(/({{CODE_BLOCK_code-\d+}})/);
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    const codeMatch = part.match(/{{CODE_BLOCK_(code-\d+)}}/);
    
    if (codeMatch) {
      const block = blocks.find(b => b.id === codeMatch[1]);
      if (block) {
        if (isStreaming) {
          elements.push(
            <div key={`code-${index}`} className="code-block-container streaming">
              <div className="code-block-header">
                <div className="code-block-title">
                  <span className="code-language-badge">
                    <span className="code-dot streaming" />
                    <span className="code-language">{block.language}</span>
                  </span>
                </div>
              </div>
              <div className="code-block-content">
                <div className="code-view-wrapper">
                  <div className="code-scroll-area">
                    <pre className="code-pre"><code>{block.code}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          elements.push(<CodeBlockWithPreview key={`code-${index}`} block={block} theme={theme} />);
        }
      }
    } else if (part.trim()) {
      const html = part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/^\d+[.)] (.+)$/gm, '<li>$1</li>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br/>');
      
      elements.push(
        <div key={`text-${index}`} className="prose-content" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />
      );
    }
  });
  
  return elements;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS — Sacred Geometry (Refined)
// ═══════════════════════════════════════════════════════════════════════════════

function AlfredIcon({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  const vertices = useMemo(() => 
    [0, 60, 120, 180, 240, 300].map(angle => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 38 * Math.cos(rad), y: 50 + 38 * Math.sin(rad) };
    }), []
  );

  const particles = useMemo(() => 
    [0, 72, 144, 216, 288].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 44 * Math.cos(rad), y: 50 + 44 * Math.sin(rad), delay: i * 0.3 };
    }), []
  );

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={animated ? 'alfred-icon-animated' : ''}>
      <defs>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--icon-color)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--icon-color)" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <g className="alfred-ring-outer">
        <circle cx="50" cy="50" r="46" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.12" />
      </g>
      <g className="alfred-geometry">
        {vertices.map((v, i) => (
          <circle key={`v${i}`} cx={v.x} cy={v.y} r="1.5" fill="var(--icon-color)" opacity="0.25" className="alfred-vertex" />
        ))}
        {vertices.map((v, i) => {
          const next = vertices[(i + 1) % 6];
          return <line key={`l${i}`} x1={v.x} y1={v.y} x2={next.x} y2={next.y} stroke="var(--icon-color)" strokeWidth="0.4" opacity="0.12" />;
        })}
        {vertices.map((v, i) => (
          <line key={`r${i}`} x1="50" y1="50" x2={v.x} y2={v.y} stroke="var(--icon-color)" strokeWidth="0.25" opacity="0.08" />
        ))}
      </g>
      <g className="alfred-ring-middle">
        <circle cx="50" cy="50" r="26" stroke="var(--icon-color)" strokeWidth="0.6" opacity="0.18" />
      </g>
      <g className="alfred-core">
        <circle cx="50" cy="50" r="14" stroke="var(--icon-color)" strokeWidth="0.7" opacity="0.3" />
        <circle cx="50" cy="50" r="8" stroke="var(--icon-color)" strokeWidth="0.6" opacity="0.45" />
        <circle cx="50" cy="50" r="4.5" fill="url(#coreGradient)" className="alfred-eye" />
      </g>
      <g className="alfred-particles">
        {particles.map((p, i) => (
          <circle key={`p${i}`} cx={p.x} cy={p.y} r="0.9" fill="var(--icon-color)" opacity="0.35" className="alfred-particle" style={{ animationDelay: `${p.delay}s` }} />
        ))}
      </g>
    </svg>
  );
}

function AlfredAvatarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="50" r="38" stroke="var(--icon-color)" strokeWidth="2" opacity="0.2" />
      <circle cx="50" cy="50" r="24" stroke="var(--icon-color)" strokeWidth="1.5" opacity="0.35" />
      <circle cx="50" cy="50" r="11" stroke="var(--icon-color)" strokeWidth="1" opacity="0.5" />
      <circle cx="50" cy="50" r="5" fill="var(--icon-color)" opacity="0.85" />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="36" r="16" stroke="var(--icon-color)" strokeWidth="2" opacity="0.45" fill="none" />
      <path d="M22 82 Q22 58 50 54 Q78 58 78 82" stroke="var(--icon-color)" strokeWidth="2" opacity="0.45" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MicIcon({ recording = false }: { recording?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.5" fill={recording ? 'currentColor' : 'none'}/>
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => { stream.getTracks().forEach(track => track.stop()); };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // Microphone not available
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, startRecording, stopRecording };
}

function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    mode: AlfredMode,
    history: { role: string; content: string }[],
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode, history }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) onChunk(parsed.text);
            } catch {
              // Invalid JSON chunk
            }
          }
        }
      }

      onComplete();
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { sendMessage, isStreaming };
}

function useFileUpload() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach(a => URL.revokeObjectURL(a.url));
    setAttachments([]);
  }, [attachments]);

  return { attachments, fileInputRef, openFilePicker, handleFileSelect, removeAttachment, clearAttachments };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  mode: AlfredMode;
  onModeChange: (m: AlfredMode) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

function Sidebar({ 
  conversations, currentConversation, onSelectConversation, onNewChat,
  mode, onModeChange, theme, onThemeChange,
  isMobile = false, isOpen = true, onClose
}: SidebarProps) {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <aside className={`sidebar ${isMobile ? 'mobile-sidebar' : 'desktop-sidebar'} ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <AlfredIcon size={24} />
          <span className="brand-name">Alfred</span>
        </div>
        {isMobile && onClose && (
          <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar"><CloseIcon /></button>
        )}
      </div>

      <div className="sidebar-time">
        <span className="time-value">{formatTime(time)}</span>
        <span className="time-date">{formatDate(time)}</span>
      </div>

      <button className="new-chat-btn" onClick={() => { onNewChat(); onClose?.(); }}>
        <NewChatIcon />
        <span>New Chat</span>
      </button>

      <div className="sidebar-section">
        <div className="section-label">Mode</div>
        <div className="sidebar-mode-selector">
          {(['builder', 'mentor', 'reviewer'] as const).map(m => (
            <button key={m} className={`sidebar-mode-btn ${mode === m ? 'active' : ''}`} onClick={() => onModeChange(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section conversations-section">
        <div className="section-label"><HistoryIcon /><span>History</span></div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">No conversations yet</div>
          ) : (
            conversations.map(conv => (
              <button key={conv.id} className={`conversation-item ${currentConversation === conv.id ? 'active' : ''}`} onClick={() => { onSelectConversation(conv.id); onClose?.(); }}>
                <div className="conv-title">{conv.title}</div>
                <div className="conv-preview">{conv.lastMessage}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-theme-toggle">
          {(['dark', 'silver', 'light'] as const).map(t => (
            <button 
              key={t} 
              className={`sidebar-theme-btn theme-btn-${t} ${theme === t ? 'active' : ''}`} 
              onClick={() => onThemeChange(t)} 
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              aria-label={`Switch to ${t} theme`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function MessageContent({ content, isStreaming, theme }: { content: string; isStreaming: boolean; theme: Theme; }) {
  const elements = useMemo(() => parseMarkdownToElements(content, theme, isStreaming), [content, theme, isStreaming]);
  return (
    <div className={`message-text ${isStreaming ? 'streaming' : ''}`}>
      {elements.length > 0 ? elements : (isStreaming ? null : <span className="text-muted">...</span>)}
      {isStreaming && <span className="cursor" />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<AlfredMode>('builder');
  const [theme, setTheme] = useState<Theme>('dark');
  const [inputValue, setInputValue] = useState('');
  const [pageState, setPageState] = useState<AnimationState>('idle');
  const [emptyState, setEmptyState] = useState<AnimationState>('idle');
  const [inputState, setInputState] = useState<AnimationState>('idle');
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming } = useStreamingChat();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const { attachments, fileInputRef, openFilePicker, handleFileSelect, removeAttachment, clearAttachments } = useFileUpload();

  // Hydration safety
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPageState('entering'), 50),
      setTimeout(() => setPageState('active'), 100),
      setTimeout(() => setEmptyState('entering'), 400),
      setTimeout(() => setEmptyState('active'), 500),
      setTimeout(() => setInputState('entering'), 700),
      setTimeout(() => setInputState('active'), 800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      setConversations(prev => [{
        id: `conv-${Date.now()}`,
        title: messages[0]?.content.slice(0, 40) + '...',
        lastMessage: messages[messages.length - 1]?.content.slice(0, 60) || '',
        timestamp: new Date(),
        mode,
      }, ...prev]);
    }
    setMessages([]);
    setCurrentConversation(null);
    setEmptyState('entering');
    setTimeout(() => setEmptyState('active'), 100);
  }, [messages, mode]);

  const handleSendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isStreaming) return;

    if (messages.length === 0) setEmptyState('exiting');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      animState: 'entering',
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    clearAttachments();
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, animState: 'active' } : m));
    }, 50);

    const alfredMessageId = `alfred-${Date.now()}`;
    setStreamingMessageId(alfredMessageId);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: alfredMessageId,
        role: 'alfred',
        content: '',
        timestamp: new Date(),
        animState: 'entering',
      }]);
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === alfredMessageId ? { ...m, animState: 'active' } : m));
      }, 50);
    }, 150);

    const history = messages.map(m => ({ role: m.role === 'alfred' ? 'assistant' : 'user', content: m.content }));

    await sendMessage(
      content,
      mode,
      history,
      (text) => setMessages(prev => prev.map(m => m.id === alfredMessageId ? { ...m, content: m.content + text } : m)),
      () => setStreamingMessageId(null),
      () => {
        setMessages(prev => prev.map(m => m.id === alfredMessageId ? { ...m, content: 'Something went wrong. Please try again.' } : m));
        setStreamingMessageId(null);
      }
    );
  }, [inputValue, isStreaming, messages, mode, sendMessage, attachments, clearAttachments]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const getAnimClass = (state: AnimationState, prefix: string) => state === 'idle' ? '' : `${prefix}-${state}`;

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <main className="alfred-app theme-dark page-active" style={{ height: '100vh' }}>
        <div className="main-content">
          <div className="messages-area">
            <div className="empty-state empty-active">
              <div className="empty-logo">
                <AlfredIcon size={120} />
              </div>
              <div className="empty-text">
                <h1 className="empty-title">Alfred</h1>
                <p className="empty-subtitle">Your AI development partner</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className={`alfred-app theme-${theme} ${getAnimClass(pageState, 'page')}`} style={{ height: viewportHeight }}>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css" onChange={handleFileSelect} style={{ display: 'none' }} aria-hidden="true" />

        <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu"><MenuIcon /></button>
        <div className={`sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`} onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />

        <Sidebar 
          conversations={conversations} currentConversation={currentConversation} 
          onSelectConversation={setCurrentConversation} onNewChat={handleNewChat}
          mode={mode} onModeChange={setMode} theme={theme} onThemeChange={setTheme}
          isMobile={false} isOpen={true}
        />
        <Sidebar 
          conversations={conversations} currentConversation={currentConversation}
          onSelectConversation={setCurrentConversation} onNewChat={handleNewChat}
          mode={mode} onModeChange={setMode} theme={theme} onThemeChange={setTheme}
          isMobile={true} isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="main-content">
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className={`empty-state ${getAnimClass(emptyState, 'empty')}`}>
                <div className="empty-logo">
                  <AlfredIcon size={120} animated />
                </div>
                <div className="empty-text">
                  <h1 className="empty-title">Alfred</h1>
                  <p className="empty-subtitle">Your AI development partner</p>
                </div>
              </div>
            ) : (
              <div className="messages-container">
                {messages.map(message => (
                  <div key={message.id} className={`message-row ${message.role} ${message.animState}`}>
                    <div className="message-avatar">
                      {message.role === 'alfred' ? <AlfredAvatarIcon /> : <UserAvatarIcon />}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">{message.role === 'alfred' ? 'Alfred' : 'You'}</span>
                      </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map(att => (
                            <div key={att.id} className={`attachment-preview ${att.type}`}>
                              {att.type === 'image' ? <img src={att.url} alt={att.name} /> : <span className="file-icon">📄</span>}
                              <span className="attachment-name">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <MessageContent content={message.content} isStreaming={streamingMessageId === message.id} theme={theme} />
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="scroll-anchor" />
              </div>
            )}
          </div>

          <div className="input-area">
            <div className={`input-container ${getAnimClass(inputState, 'input')}`}>
              {attachments.length > 0 && (
                <div className="attachments-preview">
                  {attachments.map(att => (
                    <div key={att.id} className="attachment-chip">
                      {att.type === 'image' ? <img src={att.url} alt={att.name} className="chip-thumbnail" /> : <span className="file-icon">📄</span>}
                      <span className="chip-name">{att.name}</span>
                      <button className="chip-remove" onClick={() => removeAttachment(att.id)} aria-label="Remove attachment">×</button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="input-wrapper">
                <button className="input-action" onClick={openFilePicker} aria-label="Attach file"><AttachIcon /></button>
                <textarea 
                  ref={inputRef} 
                  className="input-field" 
                  placeholder="Message Alfred..." 
                  rows={1} 
                  value={inputValue} 
                  onChange={handleInputChange} 
                  onKeyDown={handleKeyDown} 
                  disabled={isStreaming} 
                  aria-label="Message input"
                />
                <button className={`input-action ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording} aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}>
                  <MicIcon recording={isRecording} />
                </button>
                <button className="input-send" disabled={isStreaming || (!inputValue.trim() && attachments.length === 0)} onClick={handleSendMessage} aria-label="Send message">
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}