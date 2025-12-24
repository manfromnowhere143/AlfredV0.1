'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

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
// CODE DETECTION & RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

const RENDERABLE_LANGUAGES = ['jsx', 'tsx', 'react', 'html', 'svg', 'javascript', 'js'];

function extractCodeBlocks(content: string): { text: string; blocks: CodeBlock[] } {
  const blocks: CodeBlock[] = [];
  let blockIndex = 0;
  
  // First, remove any <div> wrappers around code blocks (LLM artifact)
  let cleaned = content
    .replace(/<div[^>]*type="react"[^>]*>\s*/gi, '')
    .replace(/<div[^>]*>\s*```/gi, '```')
    .replace(/```\s*<\/div>/gi, '```')
    .replace(/<\/div>\s*$/gi, '');
  
  // Match code blocks - handle various formats
  const text = cleaned.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = (lang || 'text').toLowerCase().trim();
    const id = `code-${blockIndex++}`;
    const trimmedCode = code.trim();
    
    // Skip empty code blocks
    if (!trimmedCode) {
      return '';
    }
    
    // Check if renderable (React/HTML/SVG)
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
  // Clean up the code for browser rendering
  let cleanCode = code
    // Remove import statements (we'll provide globals)
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
    // Convert export statements
    .replace(/^export\s+default\s+function\s+(\w+)/gm, 'function $1')
    .replace(/^export\s+default\s+/gm, 'const __DefaultExport__ = ')
    .replace(/^export\s+function\s+(\w+)/gm, 'function $1')
    .replace(/^export\s+const\s+(\w+)/gm, 'const $1')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .trim();

  // Detect the component name from ORIGINAL code (before cleanup changes scope)
  const exportDefaultFuncMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  const exportFuncMatch = code.match(/export\s+function\s+(\w+)/);
  const funcMatch = code.match(/function\s+([A-Z]\w*)\s*\(/);
  const constMatch = code.match(/const\s+([A-Z]\w*)\s*=\s*\(/);
  const componentName = exportDefaultFuncMatch?.[1] || exportFuncMatch?.[1] || funcMatch?.[1] || constMatch?.[1] || 'App';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root { min-height: 100vh; }
    .error { padding: 20px; color: #ef4444; font-size: 14px; white-space: pre-wrap; }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-spin {
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext, Fragment } = React;
    
    // SVG Icon Components (inline, no external dependencies)
    const Icon = ({ d, className = "", size = 24 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d={d} />
      </svg>
    );
    
    const ArrowRight = ({ className, size }) => <Icon className={className} size={size} d="M5 12h14M12 5l7 7-7 7" />;
    const ArrowLeft = ({ className, size }) => <Icon className={className} size={size} d="M19 12H5M12 19l-7-7 7-7" />;
    const Heart = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
    const Star = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
    const Shield = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
    const Truck = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
    const Check = ({ className, size }) => <Icon className={className} size={size} d="M20 6L9 17l-5-5" />;
    const X = ({ className, size }) => <Icon className={className} size={size} d="M18 6L6 18M6 6l12 12" />;
    const Plus = ({ className, size }) => <Icon className={className} size={size} d="M12 5v14M5 12h14" />;
    const Minus = ({ className, size }) => <Icon className={className} size={size} d="M5 12h14" />;
    const Menu = ({ className, size }) => <Icon className={className} size={size} d="M3 12h18M3 6h18M3 18h18" />;
    const Search = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    );
    const ShoppingCart = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    );
    const User = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    );
    const Mail = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    );
    const Phone = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
    const ChevronRight = ({ className, size }) => <Icon className={className} size={size} d="M9 18l6-6-6-6" />;
    const ChevronLeft = ({ className, size }) => <Icon className={className} size={size} d="M15 18l-6-6 6-6" />;
    const ChevronDown = ({ className, size }) => <Icon className={className} size={size} d="M6 9l6 6 6-6" />;
    const ChevronUp = ({ className, size }) => <Icon className={className} size={size} d="M18 15l-6-6-6 6" />;
    const ExternalLink = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    );
    const Loader = ({ className, size }) => (
      <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
      </svg>
    );
    
    ${cleanCode}
    
    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch(e) {
      document.getElementById('root').innerHTML = '<div class="error"><strong>Render Error:</strong>\\n' + e.message + '</div>';
      console.error(e);
    }
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK COMPONENT WITH PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function CodeBlockWithPreview({ block, theme }: { block: CodeBlock; theme: Theme }) {
  const [view, setView] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewContent = useMemo(() => {
    if (!block.isRenderable || !block.code) return '';
    
    if (block.language === 'html') {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;}</style></head><body>${block.code}</body></html>`;
    }
    
    if (block.language === 'svg' || block.code.trim().startsWith('<svg')) {
      // SVG - wrap it properly with sizing
      const svgCode = block.code.trim();
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: #fafafa;
      padding: 20px;
    }
    svg { 
      width: 120px; 
      height: 120px;
      max-width: 100%;
    }
  </style>
</head>
<body>${svgCode}</body>
</html>`;
    }
    
    if (['jsx', 'tsx', 'react', 'javascript', 'js'].includes(block.language)) {
      return renderReactCode(block.code);
    }
    
    return '';
  }, [block]);

  // Reset loading when switching to preview
  useEffect(() => {
    if (view === 'preview') {
      setIsLoading(true);
    }
  }, [view]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-language">{block.language}</span>
        <div className="code-actions">
          {block.isRenderable && block.code && (
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${view === 'code' ? 'active' : ''}`}
                onClick={() => setView('code')}
              >
                Code
              </button>
              <button 
                className={`toggle-btn ${view === 'preview' ? 'active' : ''}`}
                onClick={() => setView('preview')}
              >
                Preview
              </button>
            </div>
          )}
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      <div className="code-block-content">
        {view === 'code' ? (
          <pre className="code-pre">
            <code>{block.code}</code>
          </pre>
        ) : (
          <div className="preview-container">
            {isLoading && (
              <div className="preview-loading">
                <div className="preview-spinner" />
                <span>Loading preview...</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              srcDoc={previewContent}
              sandbox="allow-scripts"
              className={`preview-iframe ${isLoading ? 'loading' : ''}`}
              title="Code Preview"
              onLoad={handleIframeLoad}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER — Clean streaming with proper code handling
// ═══════════════════════════════════════════════════════════════════════════════

function parseMarkdownToElements(content: string, theme: Theme, isStreaming: boolean): React.ReactNode[] {
  if (!content) return [];
  
  // Clean LLM artifacts
  let cleaned = content
    .replace(/^[-─━—]{3,}$/gm, '')
    .replace(/\n[-─━—]{3,}\n/g, '\n\n')
    .replace(/^\*\*\*+$/gm, '')
    .replace(/^___+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  // Extract code blocks
  const { text, blocks } = extractCodeBlocks(cleaned);
  
  // Split by code block placeholders
  const parts = text.split(/({{CODE_BLOCK_code-\d+}})/);
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    const codeMatch = part.match(/{{CODE_BLOCK_(code-\d+)}}/);
    
    if (codeMatch) {
      const block = blocks.find(b => b.id === codeMatch[1]);
      if (block) {
        // Don't show preview toggle while streaming
        if (isStreaming) {
          elements.push(
            <div key={`code-${index}`} className="code-block-container streaming">
              <div className="code-block-header">
                <span className="code-language">{block.language}</span>
              </div>
              <pre className="code-pre">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        } else {
          elements.push(
            <CodeBlockWithPreview key={`code-${index}`} block={block} theme={theme} />
          );
        }
      }
    } else if (part.trim()) {
      // Parse inline markdown
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
        <div 
          key={`text-${index}`} 
          className="prose-content"
          dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
        />
      );
    }
  });
  
  return elements;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

function AlfredIcon({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  const vertices = useMemo(() => 
    [0, 60, 120, 180, 240, 300].map(angle => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 38 * Math.cos(rad), y: 50 + 38 * Math.sin(rad) };
    }), []
  );

  const particles = useMemo(() => 
    [0, 90, 180, 270].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 46 * Math.cos(rad), y: 50 + 46 * Math.sin(rad), delay: i * 0.4 };
    }), []
  );

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={animated ? 'alfred-icon-animated' : ''}>
      <g className="alfred-ring-outer">
        <circle cx="50" cy="50" r="46" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.15" />
      </g>
      <g className="alfred-geometry">
        {vertices.map((v, i) => (
          <circle key={`v${i}`} cx={v.x} cy={v.y} r="1.5" fill="var(--icon-color)" opacity="0.3" className="alfred-vertex" />
        ))}
        {vertices.map((v, i) => {
          const next = vertices[(i + 1) % 6];
          return <line key={`l${i}`} x1={v.x} y1={v.y} x2={next.x} y2={next.y} stroke="var(--icon-color)" strokeWidth="0.3" opacity="0.15" />;
        })}
        {vertices.map((v, i) => (
          <line key={`r${i}`} x1="50" y1="50" x2={v.x} y2={v.y} stroke="var(--icon-color)" strokeWidth="0.2" opacity="0.1" />
        ))}
      </g>
      <g className="alfred-ring-middle">
        <circle cx="50" cy="50" r="26" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.2" />
      </g>
      <g className="alfred-core">
        <circle cx="50" cy="50" r="14" stroke="var(--icon-color)" strokeWidth="0.6" opacity="0.35" />
        <circle cx="50" cy="50" r="8" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.5" />
        <circle cx="50" cy="50" r="4" fill="var(--icon-color)" opacity="0.9" className="alfred-eye" />
      </g>
      <g className="alfred-particles">
        {particles.map((p, i) => (
          <circle key={`p${i}`} cx={p.x} cy={p.y} r="0.8" fill="var(--icon-color)" opacity="0.4" className="alfred-particle" style={{ animationDelay: `${p.delay}s` }} />
        ))}
      </g>
    </svg>
  );
}

function AlfredAvatarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="50" r="40" stroke="var(--icon-color)" strokeWidth="2" opacity="0.25" />
      <circle cx="50" cy="50" r="26" stroke="var(--icon-color)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="50" cy="50" r="12" stroke="var(--icon-color)" strokeWidth="1" opacity="0.6" />
      <circle cx="50" cy="50" r="5" fill="var(--icon-color)" opacity="0.9" />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="38" r="18" stroke="var(--icon-color)" strokeWidth="2" opacity="0.5" fill="none" />
      <path d="M20 85 Q20 60 50 55 Q80 60 80 85" stroke="var(--icon-color)" strokeWidth="2" opacity="0.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
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
              // Skip invalid JSON
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
  conversations, 
  currentConversation,
  onSelectConversation,
  onNewChat,
  mode,
  onModeChange,
  theme,
  onThemeChange,
  isMobile = false,
  isOpen = true,
  onClose
}: SidebarProps) {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <aside className={`sidebar ${isMobile ? 'mobile-sidebar' : 'desktop-sidebar'} ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <AlfredIcon size={28} />
          <span className="brand-name">Alfred</span>
        </div>
        {isMobile && onClose && (
          <button className="sidebar-close" onClick={onClose}><CloseIcon /></button>
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
            <button 
              key={m} 
              className={`sidebar-mode-btn ${mode === m ? 'active' : ''}`} 
              onClick={() => onModeChange(m)}
            >
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
              <button 
                key={conv.id} 
                className={`conversation-item ${currentConversation === conv.id ? 'active' : ''}`} 
                onClick={() => { onSelectConversation(conv.id); onClose?.(); }}
              >
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
              title={t} 
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT — Smooth rendering
// ═══════════════════════════════════════════════════════════════════════════════

function MessageContent({ 
  content, 
  isStreaming, 
  theme 
}: { 
  content: string; 
  isStreaming: boolean; 
  theme: Theme;
}) {
  const elements = useMemo(() => 
    parseMarkdownToElements(content, theme, isStreaming), 
    [content, theme, isStreaming]
  );

  return (
    <div className={`message-text ${isStreaming ? 'streaming' : ''}`}>
      {elements}
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming } = useStreamingChat();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const { attachments, fileInputRef, openFilePicker, handleFileSelect, removeAttachment, clearAttachments } = useFileUpload();

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
      setTimeout(() => setPageState('entering'), 0),
      setTimeout(() => setPageState('active'), 50),
      setTimeout(() => setEmptyState('entering'), 300),
      setTimeout(() => setEmptyState('active'), 350),
      setTimeout(() => setInputState('entering'), 500),
      setTimeout(() => setInputState('active'), 550),
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
    setTimeout(() => setEmptyState('active'), 50);
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
    }, 200);

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

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const getAnimClass = (state: AnimationState, prefix: string) => state === 'idle' ? '' : `${prefix}-${state}`;

  return (
    <main className={`alfred-app theme-${theme} gpu ${getAnimClass(pageState, 'page')}`} style={{ height: viewportHeight }}>
      <input 
        ref={fileInputRef} 
        type="file" 
        multiple 
        accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css" 
        onChange={handleFileSelect} 
        style={{ display: 'none' }} 
      />

      <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}>
        <MenuIcon />
      </button>
      
      <div 
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setMobileSidebarOpen(false)} 
      />

      <Sidebar 
        conversations={conversations} 
        currentConversation={currentConversation} 
        onSelectConversation={setCurrentConversation} 
        onNewChat={handleNewChat} 
        mode={mode} 
        onModeChange={setMode} 
        theme={theme} 
        onThemeChange={setTheme} 
        isMobile={false} 
        isOpen={true} 
      />
      
      <Sidebar 
        conversations={conversations} 
        currentConversation={currentConversation} 
        onSelectConversation={setCurrentConversation} 
        onNewChat={handleNewChat} 
        mode={mode} 
        onModeChange={setMode} 
        theme={theme} 
        onThemeChange={setTheme} 
        isMobile={true} 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
      />

      <div className="main-content">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className={`empty-state ${getAnimClass(emptyState, 'empty')}`}>
              <div className="empty-logo gpu-transform">
                <AlfredIcon size={140} animated />
              </div>
              <div className="empty-text">
                <h1 className="empty-title">Alfred</h1>
                <p className="empty-subtitle">Your AI development partner</p>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map(message => (
                <div key={message.id} className={`message-row ${message.animState} gpu-transform`}>
                  <div className="message-avatar">
                    {message.role === 'alfred' ? <AlfredAvatarIcon /> : <UserAvatarIcon />}
                  </div>
                  <div className="message-content">
                    <div className="message-sender">{message.role === 'alfred' ? 'Alfred' : 'You'}</div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map(att => (
                          <div key={att.id} className={`attachment-preview ${att.type}`}>
                            {att.type === 'image' ? <img src={att.url} alt={att.name} /> : <span>📄</span>}
                            <span className="attachment-name">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <MessageContent 
                      content={message.content}
                      isStreaming={streamingMessageId === message.id}
                      theme={theme}
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-area">
          <div className={`input-container gpu ${getAnimClass(inputState, 'input')}`}>
            {attachments.length > 0 && (
              <div className="attachments-preview">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-chip">
                    {att.type === 'image' ? <img src={att.url} alt={att.name} className="chip-thumbnail" /> : <span>📄</span>}
                    <span className="chip-name">{att.name}</span>
                    <button className="chip-remove" onClick={() => removeAttachment(att.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="input-wrapper">
              <button className="input-action" onClick={openFilePicker}>
                <AttachIcon />
              </button>
              <textarea 
                ref={inputRef} 
                className="input-field" 
                placeholder="Message Alfred..." 
                rows={1} 
                value={inputValue} 
                onChange={handleInputChange} 
                onKeyDown={handleKeyDown} 
                disabled={isStreaming} 
              />
              <button 
                className={`input-action ${isRecording ? 'recording' : ''}`} 
                onClick={handleVoiceToggle}
              >
                <MicIcon recording={isRecording} />
              </button>
              <button 
                className="input-send" 
                disabled={isStreaming || (!inputValue.trim() && attachments.length === 0)} 
                onClick={handleSendMessage}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}