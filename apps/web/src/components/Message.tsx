'use client';

import React, { useState, useMemo, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import MessageAttachments from './MessageAttachments';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface Artifact {
  id: string;
  code: string;
  language: string;
  title?: string;
}

interface ArtifactContextType {
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  openGallery: (startIndex?: number) => void;
  isGalleryOpen: boolean;
  closeGallery: () => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export function ArtifactProvider({ children, conversationId }: { children: ReactNode; conversationId?: string | null }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setArtifacts([]);
    setIsGalleryOpen(false);
    setCurrentIndex(0);
  }, [conversationId]);

  const addArtifact = useCallback((artifact: Artifact) => {
    setArtifacts(prev => {
      if (prev.some(a => a.id === artifact.id)) return prev;
      return [...prev, artifact];
    });
  }, []);

  return (
    <ArtifactContext.Provider value={{ 
      artifacts, 
      addArtifact, 
      openGallery: (idx = 0) => { setCurrentIndex(idx); setIsGalleryOpen(true); },
      isGalleryOpen, 
      closeGallery: () => setIsGalleryOpen(false), 
      currentIndex, 
      setCurrentIndex 
    }}>
      {children}
      {isGalleryOpen && <ArtifactGallery />}
    </ArtifactContext.Provider>
  );
}

export function useArtifacts() {
  const ctx = useContext(ArtifactContext);
  if (!ctx) throw new Error('useArtifacts must be used within ArtifactProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'code';
  name: string;
  size: number;
  url?: string;
  preview?: string;
  duration?: number;
}

interface MessageProps {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: Attachment[];
}

interface ParsedContent {
  type: 'text' | 'code' | 'code-streaming';
  content: string;
  language?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING
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
    parts.push({ type: 'code', language: match[1] || 'plaintext', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) {
    const incompleteMatch = remaining.match(incompleteBlockRegex);
    if (incompleteMatch && isStreaming) {
      const textBefore = remaining.slice(0, incompleteMatch.index).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
      parts.push({ type: 'code-streaming', language: incompleteMatch[1] || 'plaintext', content: incompleteMatch[2] || '' });
    } else {
      const text = remaining.trim();
      if (text) parts.push({ type: 'text', content: text });
    }
  }

  if (parts.length === 0) parts.push({ type: 'text', content });
  return parts;
}

function isRenderableCode(language: string, code: string): boolean {
  const langs = ['html', 'jsx', 'tsx', 'react', 'javascript', 'js'];
  if (!langs.includes(language.toLowerCase())) return false;
  return /<[A-Z]|<div|<span|<button|<section|<header|export\s+default|function\s+[A-Z]|const\s+[A-Z]/i.test(code);
}

function extractComponentName(code: string): string {
  const m = code.match(/export\s+default\s+function\s+([A-Z]\w*)|function\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*=/);
  return m?.[1] || m?.[2] || m?.[3] || 'Component';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generatePreviewHTML(code: string, language: string): string {
  if (language.toLowerCase() === 'html') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100%; touch-action: pan-x pan-y; -webkit-touch-callout: none; }
    body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>${code}</body>
</html>`;
  }

  const componentName = extractComponentName(code);
  
  const cleanCode = code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+\w+\s*,\s*\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/export\s+default\s+/, '')
    .trim();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin><\/script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } }
    }
  <\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { min-height: 100%; }
    html, body { touch-action: pan-x pan-y; -webkit-touch-callout: none; }
    body { min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    #root { min-height: 100vh; }
    html { scroll-behavior: smooth; }
    img { 
      max-width: 100%; 
      height: auto; 
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    img.loaded { opacity: 1; }
    img:not(.loaded) {
      background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 100%);
      min-height: 100px;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
    .animate-slideUp { animation: slideUp 0.5s ease-out; }
  </style>
  <script>
    document.addEventListener("load", function(e) { if (e.target.tagName === "IMG") e.target.classList.add("loaded"); }, true);
    document.addEventListener("error", function(e) {
      if (e.target.tagName === "IMG" && e.type === "load") {
        e.target.classList.add("loaded");
      } else if (e.target.tagName === "IMG") {
        e.target.style.background = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
        e.target.alt = "Image unavailable";
      }
    }, true);
  <\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback, Fragment, createContext, useContext } = React;
    
    const ChevronRightIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
    const ChevronLeftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
    const StarIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>;
    const HeartIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    const PlayIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
    const ArrowRightIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
    
    const toCSS = (props) => {
      if (!props || typeof props !== 'object') return {};
      const css = {};
      const transforms = [];
      Object.entries(props).forEach(([key, val]) => {
        switch(key) {
          case 'x': transforms.push('translateX(' + (typeof val === 'number' ? val + 'px' : val) + ')'); break;
          case 'y': transforms.push('translateY(' + (typeof val === 'number' ? val + 'px' : val) + ')'); break;
          case 'scale': transforms.push('scale(' + val + ')'); break;
          case 'rotate': transforms.push('rotate(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'opacity': css.opacity = val; break;
          default: if (typeof val === 'number' || typeof val === 'string') css[key] = val;
        }
      });
      if (transforms.length > 0) css.transform = transforms.join(' ');
      return css;
    };
    
    const createMotionComponent = (tag) => {
      return React.forwardRef(({ initial, animate, transition, whileHover, whileTap, style, className, children, ...props }, ref) => {
        const [phase, setPhase] = useState('initial');
        const [isHovered, setIsHovered] = useState(false);
        const [isTapped, setIsTapped] = useState(false);
        useEffect(() => { requestAnimationFrame(() => setPhase('animate')); }, []);
        const computedStyles = useMemo(() => {
          let base = phase === 'initial' && initial ? toCSS(initial) : (phase === 'animate' && animate ? toCSS(animate) : {});
          if (whileHover && isHovered) Object.assign(base, toCSS(whileHover));
          if (whileTap && isTapped) Object.assign(base, toCSS(whileTap));
          return base;
        }, [phase, initial, animate, whileHover, whileTap, isHovered, isTapped]);
        const t = transition || {};
        const dur = t.duration != null ? t.duration : 0.5;
        const finalStyle = Object.assign({}, style, { transition: 'all ' + dur + 's ease-out', willChange: 'transform, opacity' }, computedStyles);
        const handlers = {};
        if (whileHover) {
          handlers.onMouseEnter = () => setIsHovered(true);
          handlers.onMouseLeave = () => { setIsHovered(false); setIsTapped(false); };
        }
        if (whileTap) {
          handlers.onMouseDown = () => setIsTapped(true);
          handlers.onMouseUp = () => setIsTapped(false);
        }
        return React.createElement(tag, Object.assign({ ref, style: finalStyle, className }, props, handlers), children);
      });
    };
    const motion = new Proxy({}, { get: (_, tag) => createMotionComponent(tag) });
    const AnimatePresence = (props) => props.children;

    ${cleanCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:48px;color:#ef4444;font-family:system-ui;background:#fef2f2;min-height:100vh;"><h2 style="margin-bottom:12px;font-weight:600;">Render Error</h2><pre style="white-space:pre-wrap;opacity:0.8;font-size:13px;">' + err.message + '</pre></div>';
    }
  <\/script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

function CodeBlock({ language, code, isStreaming = false, onPreview }: {
  language: string;
  code: string;
  isStreaming?: boolean;
  onPreview?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRenderable = !isStreaming && isRenderableCode(language, code);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  const lines = code.split('\n');
  const borderColor = isStreaming ? 'rgba(201,185,154,0.5)' : 'rgba(255,255,255,0.1)';

  return (
    <div style={{
      width: '100%',
      minWidth: 0,
      minHeight: '150px', maxHeight: '400px',
      margin: '12px 0',
      borderRadius: '10px',
      background: '#111',
      border: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: '42px',
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: '#666' }}>
          {language.toUpperCase()}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            disabled={isStreaming}
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: '9px',
              color: copied ? '#34d399' : '#888',
              background: 'transparent',
              border: `1px solid ${copied ? '#34d399' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              opacity: isStreaming ? 0.4 : 1,
            }}
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
          {isRenderable && onPreview && (
            <button
              onClick={onPreview}
              style={{
                fontFamily: "'SF Mono', monospace",
                fontSize: '9px',
                color: '#C9B99A',
                background: 'transparent',
                border: '1px solid rgba(201,185,154,0.4)',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              PREVIEW
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '14px 0' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', padding: '1px 14px', fontFamily: "'SF Mono', monospace", fontSize: '12px', lineHeight: '20px' }}>
              <span style={{ width: '32px', color: '#444', textAlign: 'right', paddingRight: '14px', userSelect: 'none' }}>{i + 1}</span>
              <span style={{ color: '#e0e0e0', whiteSpace: 'pre' }}>{line || ' '}</span>
            </div>
          ))}
          {isStreaming && <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#C9B99A', marginLeft: '46px', animation: 'alfredBlink 0.8s step-end infinite' }} />}
        </div>
      </div>
      <style>{`@keyframes alfredBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT GALLERY
// ═══════════════════════════════════════════════════════════════════════════════

function ArtifactGallery() {
  const { artifacts, currentIndex, setCurrentIndex, closeGallery } = useArtifacts();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const displayArtifacts = useMemo(() => {
    if (artifacts.length === 0) return [];
    const valid = artifacts.filter(a => !['App', 'Component', 'Index'].includes(extractComponentName(a.code)));
    return valid.length > 0 ? valid : artifacts;
  }, [artifacts]);

  const safeIndex = displayArtifacts.length > 0 ? Math.max(0, Math.min(currentIndex, displayArtifacts.length - 1)) : 0;
  const current = displayArtifacts[safeIndex];
  const previewHTML = useMemo(() => current ? generatePreviewHTML(current.code, current.language) : '', [current]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowLeft' && safeIndex > 0) setCurrentIndex(safeIndex - 1);
      if (e.key === 'ArrowRight' && safeIndex < displayArtifacts.length - 1) setCurrentIndex(safeIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [safeIndex, displayArtifacts.length, closeGallery, setCurrentIndex]);

  useEffect(() => { setIsLoaded(false); }, [safeIndex]);

  if (!current) return null;

  const lines = current.code.split('\n');
  const currentName = extractComponentName(current.code);

  return (
    <>
      <div className="alfred-gallery-root">
        <div className="alfred-gallery-wrap">
          <div className="alfred-gallery-head">
            <div className="alfred-gallery-headleft">
              <button className="alfred-gallery-navbtn" onClick={() => setCurrentIndex(safeIndex - 1)} disabled={safeIndex === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
              </button>
              <span className="alfred-gallery-counter">{safeIndex + 1}/{displayArtifacts.length}</span>
              <button className="alfred-gallery-navbtn" onClick={() => setCurrentIndex(safeIndex + 1)} disabled={safeIndex === displayArtifacts.length - 1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
              </button>
              <span className="alfred-gallery-title">{currentName}</span>
            </div>
            <div className="alfred-gallery-headright">
              {!isMobile && (
                <button className={`alfred-gallery-toggle ${showCode ? 'active' : ''}`} onClick={() => setShowCode(!showCode)}>
                  {showCode ? 'HIDE CODE' : 'SHOW CODE'}
                </button>
              )}
              <button className="alfred-gallery-iconbtn" onClick={() => { setIsLoaded(false); if(iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round"/></svg>
              </button>
              <button className="alfred-gallery-iconbtn alfred-gallery-closebtn" onClick={closeGallery}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
          <div className="alfred-gallery-main">
            {!isMobile && showCode && (
              <div className="alfred-gallery-codepanel">
                <div className="alfred-gallery-codescroll">
                  {lines.map((line, i) => (
                    <div key={i} className="alfred-gallery-codeline">
                      <span className="alfred-gallery-codenum">{i + 1}</span>
                      <span className="alfred-gallery-codetxt">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="alfred-gallery-preview" style={{ width: (!isMobile && showCode) ? '60%' : '100%' }}>
              {!isLoaded && <div className="alfred-gallery-loading"><div className="alfred-gallery-spinner" /></div>}
              <iframe ref={iframeRef} srcDoc={previewHTML} sandbox="allow-scripts allow-same-origin" title="Preview" onLoad={() => setIsLoaded(true)} className={`alfred-gallery-iframe ${isLoaded ? 'loaded' : ''}`} />
            </div>
          </div>
          {!isMobile && displayArtifacts.length > 1 && (
            <div className="alfred-gallery-thumbs">
              {displayArtifacts.map((a, i) => (
                <button key={a.id} className={`alfred-gallery-thumb ${i === safeIndex ? 'active' : ''}`} onClick={() => setCurrentIndex(i)}>
                  <span className="alfred-gallery-thumbnum">{i + 1}</span>
                  <span className="alfred-gallery-thumbname">{extractComponentName(a.code)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .alfred-gallery-root{position:fixed!important;inset:0!important;z-index:99999!important;background:#000!important;display:flex!important;flex-direction:column!important;touch-action:none!important}
        .alfred-gallery-wrap{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important}
        .alfred-gallery-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:12px 16px!important;border-bottom:1px solid rgba(255,255,255,0.1)!important;flex-shrink:0!important;background:#000!important}
        .alfred-gallery-headleft,.alfred-gallery-headright{display:flex!important;align-items:center!important;gap:8px!important}
        .alfred-gallery-title{font-size:13px!important;font-weight:500!important;color:#fff!important;margin-left:12px!important}
        .alfred-gallery-navbtn,.alfred-gallery-iconbtn{width:32px!important;height:32px!important;border-radius:6px!important;background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.1)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#888!important}
        .alfred-gallery-navbtn:hover:not(:disabled),.alfred-gallery-iconbtn:hover{color:#fff!important;background:rgba(255,255,255,0.1)!important}
        .alfred-gallery-navbtn:disabled{opacity:0.3!important;cursor:not-allowed!important}
        .alfred-gallery-closebtn:hover{background:rgba(239,68,68,0.2)!important;color:#ef4444!important}
        .alfred-gallery-counter{font-family:monospace!important;font-size:11px!important;color:#666!important;min-width:40px!important;text-align:center!important}
        .alfred-gallery-toggle{font-family:'SF Mono',monospace!important;font-size:9px!important;color:#888!important;background:transparent!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:4px!important;padding:6px 12px!important;cursor:pointer!important}
        .alfred-gallery-toggle:hover{color:#fff!important}
        .alfred-gallery-toggle.active{color:#C9B99A!important;border-color:#C9B99A!important}
        .alfred-gallery-main{flex:1!important;display:flex!important;overflow:hidden!important;min-height:0!important}
        .alfred-gallery-codepanel{width:40%!important;height:100%!important;border-right:1px solid rgba(255,255,255,0.1)!important;background:#050505!important;overflow:hidden!important}
        .alfred-gallery-codescroll{height:100%!important;overflow:auto!important;padding:14px 0!important}
        .alfred-gallery-codeline{display:flex!important;padding:1px 16px!important;font-family:'SF Mono',monospace!important;font-size:11px!important;line-height:18px!important}
        .alfred-gallery-codenum{width:32px!important;color:#333!important;text-align:right!important;padding-right:12px!important;user-select:none!important}
        .alfred-gallery-codetxt{color:#ccc!important;white-space:pre!important}
        .alfred-gallery-preview{flex:1!important;position:relative!important;background:#000!important;min-height:0!important;height:100%!important}
        .alfred-gallery-iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:none!important;background:#000!important;opacity:0!important;transition:opacity 0.3s ease!important}
        .alfred-gallery-iframe.loaded{opacity:1!important}
        .alfred-gallery-loading{position:absolute!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#000!important}
        .alfred-gallery-spinner{width:24px!important;height:24px!important;border:2px solid rgba(255,255,255,0.1)!important;border-top-color:#666!important;border-radius:50%!important;animation:alfredSpin 0.6s linear infinite!important}
        @keyframes alfredSpin{to{transform:rotate(360deg)}}
        .alfred-gallery-thumbs{display:flex!important;gap:8px!important;padding:12px 16px!important;border-top:1px solid rgba(255,255,255,0.1)!important;overflow-x:auto!important;flex-shrink:0!important;background:#000!important}
        .alfred-gallery-thumb{display:flex!important;align-items:center!important;gap:8px!important;padding:8px 14px!important;background:rgba(255,255,255,0.03)!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:6px!important;cursor:pointer!important;flex-shrink:0!important}
        .alfred-gallery-thumb:hover{background:rgba(255,255,255,0.06)!important}
        .alfred-gallery-thumb.active{background:rgba(201,185,154,0.1)!important;border-color:#C9B99A!important}
        .alfred-gallery-thumbnum{font-family:monospace!important;font-size:10px!important;color:#666!important}
        .alfred-gallery-thumbname{font-size:11px!important;color:#999!important}
        .alfred-gallery-thumb.active .alfred-gallery-thumbname{color:#C9B99A!important}
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

function formatText(text: string): React.ReactNode[] {
  let cleaned = text
    .replace(/^[-─━]{3,}$/gm, '')
    .replace(/^\*{3,}$/gm, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const elements: React.ReactNode[] = [];
  const paragraphs = cleaned.split(/\n\n+/);

  paragraphs.forEach((para, pIndex) => {
    if (!para.trim()) return;

    const lines = para.split('\n');
    const lineElements: React.ReactNode[] = [];

    lines.forEach((line, lIndex) => {
      if (!line.trim()) return;

      const bulletMatch = line.match(/^[\s]*[-•*]\s+(.+)$/);
      if (bulletMatch) {
        lineElements.push(
          <div key={`${pIndex}-${lIndex}`} style={{ display: 'flex', gap: '10px', marginLeft: '4px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--accent, #C9B99A)', opacity: 0.6, fontSize: '8px', marginTop: '8px' }}>●</span>
            <span>{processInlineFormatting(bulletMatch[1], `${pIndex}-${lIndex}`)}</span>
          </div>
        );
        return;
      }

      const numberedMatch = line.match(/^[\s]*(\d+)[.)]\s+(.+)$/);
      if (numberedMatch) {
        lineElements.push(
          <div key={`${pIndex}-${lIndex}`} style={{ display: 'flex', gap: '10px', marginLeft: '4px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--accent, #C9B99A)', opacity: 0.8, fontSize: '13px', fontWeight: 500, minWidth: '18px' }}>{numberedMatch[1]}.</span>
            <span>{processInlineFormatting(numberedMatch[2], `${pIndex}-${lIndex}`)}</span>
          </div>
        );
        return;
      }

      lineElements.push(
        <span key={`${pIndex}-${lIndex}`}>
          {processInlineFormatting(line, `${pIndex}-${lIndex}`)}
          {lIndex < lines.length - 1 && <br />}
        </span>
      );
    });

    if (lineElements.length > 0) {
      elements.push(
        <p key={pIndex} style={{ margin: 0, marginBottom: pIndex < paragraphs.length - 1 ? '16px' : 0 }}>
          {lineElements}
        </p>
      );
    }
  });

  return elements.length > 0 ? elements : [<span key="empty">{text}</span>];
}

function processInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let partKey = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`${keyPrefix}-${partKey++}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[2]) {
      elements.push(<span key={`${keyPrefix}-${partKey++}`} style={{ fontWeight: 600 }}>{match[2]}</span>);
    } else if (match[3]) {
      elements.push(<span key={`${keyPrefix}-${partKey++}`} style={{ fontStyle: 'italic', opacity: 0.9 }}>{match[3]}</span>);
    } else if (match[4]) {
      elements.push(
        <code key={`${keyPrefix}-${partKey++}`} style={{ 
          fontFamily: "'SF Mono', monospace",
          fontSize: '0.9em',
          background: 'var(--code-bg, rgba(128,128,128,0.15))',
          padding: '2px 6px',
          borderRadius: '4px',
          color: 'var(--accent, #C9B99A)'
        }}>
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(<span key={`${keyPrefix}-${partKey++}`}>{text.slice(lastIndex)}</span>);
  }

  return elements.length > 0 ? elements : [<span key={`${keyPrefix}-0`}>{text}</span>];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Message({ id, role, content, timestamp, isStreaming = false, files }: MessageProps) {
  const parsedContent = useMemo(() => parseContent(content, isStreaming), [content, isStreaming]);
  
  let artifactCtx: ArtifactContextType | null = null;
  try { artifactCtx = useArtifacts(); } catch {}

  useEffect(() => {
    if (!artifactCtx || isStreaming) return;
    parsedContent.forEach((part, index) => {
      if (part.type === 'code' && isRenderableCode(part.language || '', part.content)) {
        artifactCtx!.addArtifact({
          id: `${id}-${index}`,
          code: part.content,
          language: part.language || 'jsx',
          title: extractComponentName(part.content),
        });
      }
    });
  }, [parsedContent, isStreaming, id, artifactCtx]);

  const handlePreview = useCallback((index: number) => {
    if (artifactCtx) {
      const idx = artifactCtx.artifacts.findIndex(a => a.id === `${id}-${index}`);
      artifactCtx.openGallery(idx >= 0 ? idx : 0);
    }
  }, [artifactCtx, id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: role === 'user' ? 'flex-end' : 'flex-start', width: '100%', overflow: 'hidden' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        width: role === 'user' ? 'auto' : '100%', 
        maxWidth: role === 'user' ? '80%' : '100%', 
        overflow: 'hidden', 
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: '15px', 
        lineHeight: 1.75,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        color: role === 'user' 
          ? 'var(--text-primary, var(--foreground, inherit))' 
          : 'var(--text-secondary, var(--foreground, inherit))',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* ATTACHMENTS - Show uploaded media with elegant thumbnails */}
        {files && files.length > 0 && (
          <MessageAttachments attachments={files} isUser={role === 'user'} />
        )}
        
        {/* TEXT CONTENT */}
        {parsedContent.map((part, index) => {
          if (part.type === 'code' || part.type === 'code-streaming') {
            return <CodeBlock key={index} language={part.language || 'plaintext'} code={part.content} isStreaming={part.type === 'code-streaming'} onPreview={part.type === 'code' ? () => handlePreview(index) : undefined} />;
          }
          return (
            <div key={index} style={{ padding: '2px 0' }}>
              {formatText(part.content)}
            </div>
          );
        })}
        
        {isStreaming && parsedContent.every(p => p.type === 'text') && (
          <span style={{ display: 'inline-block', width: 2, height: 16, background: 'var(--accent, rgba(201,185,154,0.8))', marginLeft: 2, animation: 'alfredBlink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALFRED THINKING
// ═══════════════════════════════════════════════════════════════════════════════

export function AlfredThinking() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#666', animation: `alfredDot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
      <style>{`@keyframes alfredDot{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}