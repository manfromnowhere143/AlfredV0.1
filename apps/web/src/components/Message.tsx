'use client';

import React, { useState, useMemo, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import MessageAttachments from './MessageAttachments';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface Artifact { id: string; code: string; language: string; title?: string; }
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

  useEffect(() => { setArtifacts([]); setIsGalleryOpen(false); setCurrentIndex(0); }, [conversationId]);

  const addArtifact = useCallback((artifact: Artifact) => {
    setArtifacts(prev => prev.some(a => a.id === artifact.id) ? prev : [...prev, artifact]);
  }, []);

  return (
    <ArtifactContext.Provider value={{ artifacts, addArtifact, openGallery: (idx = 0) => { setCurrentIndex(idx); setIsGalleryOpen(true); }, isGalleryOpen, closeGallery: () => setIsGalleryOpen(false), currentIndex, setCurrentIndex }}>
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

interface Attachment { id: string; type: 'image' | 'video' | 'document' | 'code'; name: string; size: number; url?: string; preview?: string; duration?: number; }
interface MessageProps { id: string; role: 'user' | 'alfred'; content: string; timestamp: Date; isStreaming?: boolean; files?: Attachment[]; }
interface ParsedContent { type: 'text' | 'code' | 'code-streaming'; content: string; language?: string; }

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE ACTIONS - State of the art like Claude
// ═══════════════════════════════════════════════════════════════════════════════

function MessageActions({ content, isAlfred }: { content: string; isAlfred: boolean }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message-actions">
      <button className={'action-btn' + (copied ? ' success' : '')} onClick={handleCopy} title="Copy">
        {copied ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        )}
      </button>
      {isAlfred && (
        <>
          <button className="action-btn" onClick={() => {}} title="Read aloud">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
          </button>
          <button className={'action-btn' + (liked === true ? ' active' : '')} onClick={() => setLiked(liked === true ? null : true)} title="Good response">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked === true ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
          </button>
          <button className={'action-btn' + (liked === false ? ' active' : '')} onClick={() => setLiked(liked === false ? null : false)} title="Bad response">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked === false ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
          </button>
          <button className="action-btn" onClick={() => {}} title="Regenerate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>
          <button className="action-btn" onClick={() => {}} title="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
        </>
      )}
      <style jsx>{`
        .message-actions { display: flex; align-items: center; gap: 2px; padding-top: 8px; }
        .action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: rgba(156,163,175,0.7); }
        .action-btn:hover { background: rgba(156,163,175,0.12); color: rgba(156,163,175,1); transform: scale(1.05); }
        .action-btn:active { transform: scale(0.95); }
        .action-btn.active { color: #C9B99A; }
        .action-btn.success { color: #4ade80; }
        @media (max-width: 768px) { .action-btn { width: 36px; height: 36px; } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function parseContent(content: string, isStreaming: boolean = false): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const completeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const incompleteBlockRegex = /```(\w+)?\n([\s\S]*)$/;
  let lastIndex = 0, match;

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
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.tailwindcss.com"><\/script><style>*{margin:0;padding:0;box-sizing:border-box}img{max-width:100%;height:auto}</style></head><body>${code}</body></html>`;
  }
  const componentName = extractComponentName(code);
  const cleanCode = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '').replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '').replace(/^import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '').replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '').replace(/^import\s+\w+\s*,\s*\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '').replace(/export\s+default\s+/, '').trim();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin><\/script><script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin><\/script><script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif}img{max-width:100%;height:auto}</style></head><body><div id="root"></div><script type="text/babel">const{useState,useEffect,useRef,useMemo,useCallback}=React;const motion={div:'div',span:'span',button:'button',img:'img',a:'a',section:'section',header:'header',nav:'nav',footer:'footer',h1:'h1',h2:'h2',h3:'h3',p:'p',ul:'ul',li:'li'};const AnimatePresence=({children})=>children;${cleanCode};try{ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${componentName}))}catch(err){document.getElementById('root').innerHTML='<div style="padding:24px;color:#ef4444">'+err.message+'</div>'}<\/script></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CODE BLOCK - State of the Art
// ═══════════════════════════════════════════════════════════════════════════════

function CodeBlock({ language, code, isStreaming = false, onPreview }: { language: string; code: string; isStreaming?: boolean; onPreview?: () => void; }) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRenderable = !isStreaming && isRenderableCode(language, code);

  useEffect(() => { if (isStreaming && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [code, isStreaming]);

  const lines = code.split('\n');

  const highlightLine = (line: string) => {
    return line
      .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|default|from|async|await|class|extends|new|this|try|catch|throw)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="bool">$1</span>')
      .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="str">$&</span>')
      .replace(/\/\/.*/g, '<span class="cmt">$&</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <div className="code-header-left">
          <span className="code-lang">{language.toUpperCase()}</span>
          <button className="code-icon-btn" onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} disabled={isStreaming} title="Copy code">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            )}
          </button>
          {isRenderable && onPreview && (
            <button className="code-icon-btn preview" onClick={onPreview} title="Preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>
      <div className="code-container">
        <div className="code-fade-top" />
        <div className="code-content" ref={scrollRef}>
          {lines.map((line, i) => (<div key={i} className="code-line"><span className="line-num">{i + 1}</span><span className="line-code" dangerouslySetInnerHTML={{ __html: highlightLine(line) || ' ' }} /></div>))}
          {isStreaming && <span className="cursor" />}
        </div>
        <div className="code-fade-bottom" />
      </div>
      <style jsx>{`
        .code-block { position: relative; margin: 16px 0; background: transparent; overflow: visible; }
        .code-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 8px 0; }
        .code-header-left { display: flex; align-items: center; gap: 10px; }
        .code-lang { font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 10px; font-weight: 400; letter-spacing: 0.08em; color: rgba(156,163,175,0.6); transition: color 0.3s; }
        .code-icon-btn { width: 26px; height: 26px; border-radius: 6px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: rgba(156,163,175,0.5); }
        .code-icon-btn:hover { color: rgba(156,163,175,0.9); background: rgba(156,163,175,0.1); }
        .code-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .code-icon-btn.preview { color: rgba(201,185,154,0.6); }
        .code-icon-btn.preview:hover { color: #C9B99A; background: rgba(201,185,154,0.12); }
        .code-container { position: relative; max-height: 320px; overflow: hidden; }
        .code-fade-top { position: absolute; top: 0; left: -16px; right: -16px; height: 28px; pointer-events: none; z-index: 15; background: linear-gradient(to bottom, #0a0a0b 0%, #0a0a0b 30%, transparent 100%); } :global([data-theme="light"]) .code-fade-top { background: linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 30%, transparent 100%); }
        .code-fade-bottom { position: absolute; bottom: 0; left: -16px; right: -16px; height: 28px; pointer-events: none; z-index: 15; background: linear-gradient(to top, #0a0a0b 0%, #0a0a0b 30%, transparent 100%); } :global([data-theme="light"]) .code-fade-bottom { background: linear-gradient(to top, #FFFFFF 0%, #FFFFFF 30%, transparent 100%); }
        .code-content { overflow-y: auto; padding: 32px 0; max-height: 320px; scrollbar-width: none; -webkit-overflow-scrolling: touch; touch-action: pan-y; overscroll-behavior: contain; }
        .code-content::-webkit-scrollbar { display: none; }
        .code-line { display: block; padding: 1px 8px; min-height: 20px; font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 12px; line-height: 20px; letter-spacing: 0.02em; font-weight: 300; }
        .line-num { display: inline-block; width: 28px; color: rgba(156,163,175,0.3); text-align: right; padding-right: 16px; user-select: none; transition: color 0.3s; }
        .line-code { color: var(--text-primary, rgba(255,255,255,0.85)); white-space: pre; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; transition: color 0.3s; }
        .line-code :global(.kw) { color: #C586C0; }
        .line-code :global(.str) { color: #CE9178; }
        .line-code :global(.num) { color: #B5CEA8; }
        .line-code :global(.bool) { color: #569CD6; }
        .line-code :global(.cmt) { color: rgba(156,163,175,0.5); font-style: italic; }
        .cursor { display: inline-block; width: 2px; height: 14px; background: var(--text-primary, #C9B99A); margin-left: 2px; animation: cursorBlink 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite; box-shadow: 0 0 12px currentColor; border-radius: 1px; }
        @keyframes cursorBlink { 0%, 40% { opacity: 1; } 50%, 90% { opacity: 0; } 100% { opacity: 1; } }
        @media (max-width: 768px) { .code-line { font-size: 10px; padding: 1px 4px; min-height: 18px; line-height: 18px; } .line-num { width: 24px; padding-right: 12px; } .code-container, .code-content { max-height: 260px; } .code-content { padding: 28px 0; } .code-fade-top { height: 50px; top: -4px; left: -16px; right: -16px; } .code-fade-bottom { height: 60px; bottom: -8px; left: -16px; right: -16px; } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT GALLERY - State of the art split screen
// ═══════════════════════════════════════════════════════════════════════════════

function ArtifactGallery() {
  const { artifacts, currentIndex, setCurrentIndex, closeGallery } = useArtifacts();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const isDragging = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const displayArtifacts = useMemo(() => {
    if (artifacts.length === 0) return [];
    const valid = artifacts.filter(a => !['App', 'Component', 'Index'].includes(extractComponentName(a.code)));
    return valid.length > 0 ? valid : artifacts;
  }, [artifacts]);

  const safeIndex = displayArtifacts.length > 0 ? Math.max(0, Math.min(currentIndex, displayArtifacts.length - 1)) : 0;
  const current = displayArtifacts[safeIndex];
  const previewHTML = useMemo(() => current ? generatePreviewHTML(current.code, current.language) : '', [current]);

  useEffect(() => { const check = () => setIsMobile(window.innerWidth < 768); check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check); }, []);

  const handleClose = useCallback(() => { setIsClosing(true); setTimeout(closeGallery, 280); }, [closeGallery]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft' && safeIndex > 0) setCurrentIndex(safeIndex - 1);
      if (e.key === 'ArrowRight' && safeIndex < displayArtifacts.length - 1) setCurrentIndex(safeIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [safeIndex, displayArtifacts.length, handleClose, setCurrentIndex]);

  useEffect(() => { setIsLoaded(false); }, [safeIndex]);

  const handleMouseDown = useCallback(() => { isDragging.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (!isDragging.current) return; setSplitPosition(Math.max(25, Math.min(75, (e.clientX / window.innerWidth) * 100))); };
    const handleMouseUp = () => { isDragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  if (!current) return null;
  const currentName = extractComponentName(current.code);

  return (
    <>
      <div className={'gallery-root' + (isClosing ? ' closing' : '')}>
        <div className="gallery-header">
          <div className="gallery-nav-left">
            <button className="nav-btn" onClick={() => setCurrentIndex(safeIndex - 1)} disabled={safeIndex === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="counter">{safeIndex + 1}/{displayArtifacts.length}</span>
            <button className="nav-btn" onClick={() => setCurrentIndex(safeIndex + 1)} disabled={safeIndex === displayArtifacts.length - 1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <span className="title">{currentName}</span>
          </div>
          <div className="gallery-nav-right">
            {!isMobile && <button className={'toggle-btn' + (showCode ? ' active' : '')} onClick={() => setShowCode(!showCode)}>{showCode ? 'HIDE CODE' : 'SHOW CODE'}</button>}
            <button className="icon-btn" onClick={() => { setIsLoaded(false); if(iframeRef.current) iframeRef.current.src = iframeRef.current.src; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            </button>
            <button className="icon-btn close-btn" onClick={handleClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="gallery-main">
          <div className="preview-area" style={{ width: showCode && !isMobile ? splitPosition + '%' : '100%' }}>
            {!isLoaded && <div className="loader"><div className="spinner" /></div>}
            <iframe ref={iframeRef} srcDoc={previewHTML} sandbox="allow-scripts allow-same-origin" onLoad={() => setIsLoaded(true)} className={isLoaded ? 'loaded' : ''} />
          </div>
          {showCode && !isMobile && (
            <>
              <div className="splitter" onMouseDown={handleMouseDown}><div className="splitter-line" /></div>
              <div className="code-area" style={{ width: (100 - splitPosition) + '%' }}>
                <div className="code-scroll">
                  {current.code.split('\n').map((line, i) => (<div key={i} className="gal-line"><span className="gal-ln">{i + 1}</span><span className="gal-lc">{line}</span></div>))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .gallery-root { position: fixed; inset: 0; z-index: 99999; background: #000; display: flex; flex-direction: column; animation: galleryIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .gallery-root.closing { animation: galleryOut 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; }
        @keyframes galleryIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes galleryOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.98); } }
        .gallery-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.5); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .gallery-nav-left, .gallery-nav-right { display: flex; align-items: center; gap: 8px; }
        .nav-btn, .icon-btn { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .nav-btn:hover:not(:disabled), .icon-btn:hover { color: #fff; background: rgba(255,255,255,0.1); transform: scale(1.05); }
        .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .close-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
        .counter { font-family: 'SF Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.4); min-width: 40px; text-align: center; }
        .title { font-size: 13px; font-weight: 500; color: #fff; margin-left: 12px; }
        .toggle-btn { font-family: 'SF Mono', monospace; font-size: 9px; letter-spacing: 0.05em; color: rgba(255,255,255,0.5); background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px 12px; cursor: pointer; transition: all 0.2s; }
        .toggle-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .toggle-btn.active { color: #C9B99A; border-color: rgba(201,185,154,0.4); background: rgba(201,185,154,0.1); }
        .gallery-main { flex: 1; display: flex; overflow: hidden; }
        .preview-area { position: relative; background: #000; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        iframe.loaded { opacity: 1; }
        .loader { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .spinner { width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.08); border-top-color: rgba(255,255,255,0.5); border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .splitter { width: 12px; background: rgba(255,255,255,0.02); cursor: col-resize; display: flex; align-items: center; justify-content: center; transition: background 0.2s; position: relative; z-index: 10; }
        .splitter:hover { background: rgba(255,255,255,0.05); }
        .splitter:hover .splitter-line { background: rgba(201,185,154,0.6); }
        .splitter-line { width: 3px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 2px; transition: all 0.2s; }
        .code-area { background: #0d0d0f; border-left: 1px solid rgba(255,255,255,0.06); overflow: hidden; display: flex; flex-direction: column; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .code-scroll { flex: 1; overflow-y: auto; padding: 16px 0; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .code-scroll::-webkit-scrollbar { width: 6px; }
        .code-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .gal-line { display: flex; padding: 1px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.7; }
        .gal-ln { width: 36px; color: rgba(255,255,255,0.2); text-align: right; padding-right: 16px; user-select: none; flex-shrink: 0; }
        .gal-lc { color: rgba(255,255,255,0.8); white-space: pre; }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

function formatText(text: string): React.ReactNode[] {
  let cleaned = text.replace(/^[-─━]{3,}$/gm, '').replace(/^\*{3,}$/gm, '').replace(/^#{1,6}\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();
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
        lineElements.push(<div key={lIndex} style={{ display: 'flex', gap: '10px', marginLeft: '4px', marginBottom: '6px' }}><span style={{ color: 'rgba(156,163,175,0.6)', fontSize: '8px', marginTop: '8px' }}>●</span><span>{processInline(bulletMatch[1], lIndex)}</span></div>);
        return;
      }
      lineElements.push(<span key={lIndex}>{processInline(line, lIndex)}{lIndex < lines.length - 1 && <br />}</span>);
    });

    if (lineElements.length > 0) elements.push(<p key={pIndex} style={{ margin: 0, marginBottom: pIndex < paragraphs.length - 1 ? '16px' : 0 }}>{lineElements}</p>);
  });

  return elements.length > 0 ? elements : [<span key="empty">{text}</span>];
}

function processInline(text: string, key: number): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0, match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) elements.push(<span key={key + '-' + lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    if (match[2]) elements.push(<span key={key + '-' + match.index} style={{ fontWeight: 600 }}>{match[2]}</span>);
    else if (match[3]) elements.push(<span key={key + '-' + match.index} style={{ fontStyle: 'italic', opacity: 0.9 }}>{match[3]}</span>);
    else if (match[4]) elements.push(<code key={key + '-' + match.index} style={{ fontFamily: "'SF Mono', monospace", fontSize: '0.9em', background: 'rgba(156,163,175,0.12)', padding: '2px 6px', borderRadius: '4px', color: '#C9B99A' }}>{match[4]}</code>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) elements.push(<span key={key + '-end'}>{text.slice(lastIndex)}</span>);
  return elements.length > 0 ? elements : [<span key={key}>{text}</span>];
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
        artifactCtx!.addArtifact({ id: id + '-' + index, code: part.content, language: part.language || 'jsx', title: extractComponentName(part.content) });
      }
    });
  }, [parsedContent, isStreaming, id, artifactCtx]);

  const handlePreview = useCallback((index: number) => {
    if (artifactCtx) {
      const idx = artifactCtx.artifacts.findIndex(a => a.id === id + '-' + index);
      artifactCtx.openGallery(idx >= 0 ? idx : 0);
    }
  }, [artifactCtx, id]);

  return (
    <div className="message-wrapper">
      <div className={'message-content ' + role}>
        {files && files.length > 0 && <MessageAttachments attachments={files} isUser={role === 'user'} />}
        {parsedContent.map((part, index) => {
          if (part.type === 'code' || part.type === 'code-streaming') return <CodeBlock key={index} language={part.language || 'plaintext'} code={part.content} isStreaming={part.type === 'code-streaming'} onPreview={part.type === 'code' ? () => handlePreview(index) : undefined} />;
          return <div key={index} style={{ padding: '2px 0' }}>{formatText(part.content)}</div>;
        })}
        {isStreaming && parsedContent.every(p => p.type === 'text') && <span className="streaming-cursor" />}
      </div>
      {!isStreaming && role === 'alfred' && <MessageActions content={content} isAlfred={true} />}
      <style jsx>{`
        .message-wrapper { display: flex; flex-direction: column; align-items: ${role === 'user' ? 'flex-end' : 'flex-start'}; width: 100%; }
        .message-content { display: flex; flex-direction: column; gap: 8px; width: ${role === 'user' ? 'auto' : '100%'}; max-width: ${role === 'user' ? '80%' : '100%'}; font-family: 'Inter', -apple-system, sans-serif; font-size: 15px; line-height: 1.75; color: var(--text-primary, rgba(255,255,255,0.9)); -webkit-font-smoothing: antialiased; transition: color 0.3s; }
        .streaming-cursor { display: inline-block; width: 2px; height: 16px; background: #C9B99A; margin-left: 2px; animation: blink 1s step-end infinite; vertical-align: text-bottom; box-shadow: 0 0 8px #C9B99A; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALFRED THINKING
// ═══════════════════════════════════════════════════════════════════════════════

export function AlfredThinking() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 0' }}>
      {[0, 1, 2].map(i => (<span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#666', animation: 'dot 1.4s ease-in-out infinite', animationDelay: i * 0.15 + 's' }} />))}
      <style>{`@keyframes dot{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}