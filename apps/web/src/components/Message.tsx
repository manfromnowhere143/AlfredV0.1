'use client';

import React, { useState, useMemo, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import MessageAttachments from './MessageAttachments';
import { DeployButton } from './DeployButton';

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT CONTEXT - with updateArtifact for live modifications
// ═══════════════════════════════════════════════════════════════════════════════

interface Artifact { id: string; dbId?: string; code: string; language: string; title?: string; }
interface ArtifactContextType {
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, code: string, title?: string) => void;
  saveArtifactToDb: (artifactId: string, code: string, language: string, title: string) => Promise<void>;
  openGallery: (startIndex?: number) => void;
  isGalleryOpen: boolean;
  closeGallery: () => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  conversationId: string | null;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export function ArtifactProvider({ children, conversationId }: { children: ReactNode; conversationId?: string | null }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Multi-artifact support: Map of artifactId -> saved data
  const [savedDataMap, setSavedDataMap] = useState<Map<string, { code: string; title?: string }>>(new Map());

  // Fetch ALL saved artifacts on mount
  useEffect(() => {
    console.log('🔄 [Provider] Reset for conversation:', conversationId);
    setArtifacts([]);
    setSavedDataMap(new Map());
    
    if (!conversationId) return;
    
    fetch(`/api/artifacts/save?conversationId=${conversationId}`)
      .then(res => res.json())
      .then(data => {
        console.log('📡 [Fetch] Response:', data);
        const newMap = new Map<string, { code: string; title?: string }>();
        
        // Handle new format (multiple artifacts)
        if (data.artifacts && Array.isArray(data.artifacts)) {
          for (const art of data.artifacts) {
            if (art.artifactId && art.code && !art.code.includes('ReactDOM.createRoot(document.getElementById')) {
              console.log('✅ [Fetch] Loaded artifact:', art.artifactId);
              newMap.set(art.artifactId, { code: art.code, title: art.title });
            }
          }
        }
        // Fallback to old format (single artifact)
        else if (data.artifact?.code && !data.artifact.code.includes('ReactDOM.createRoot(document.getElementById')) {
          const artifactId = data.artifact.metadata?.artifactId;
          if (artifactId) {
            console.log('✅ [Fetch] Loaded single artifact:', artifactId);
            newMap.set(artifactId, { code: data.artifact.code, title: data.artifact.title });
          }
        }
        
        console.log('📦 Loaded', newMap.size, 'saved artifacts');
        setSavedDataMap(newMap);
      })
      .catch(err => console.error('❌ Fetch error:', err));
  }, [conversationId]);

  // Add artifact - check if it matches ANY saved data
  const addArtifact = useCallback((artifact: Artifact) => {
    const savedData = savedDataMap.get(artifact.id);
    console.log('➕ [Add] artifact.id:', artifact.id, 'has saved?', !!savedData);
    
    setArtifacts(prev => {
      // Skip if exists
      if (prev.some(a => a.id === artifact.id)) {
        return prev;
      }
      
      // Check for EXACT ID match in Map
      if (savedData) {
        console.log('   ✅ MATCH! Using saved code');
        return [...prev, { ...artifact, code: savedData.code, title: savedData.title || artifact.title }];
      }
      
      // No match - use original
      console.log('   📝 No match, using original code');
      return [...prev, artifact];
    });
  }, [savedDataMap]);

  // Late update - if savedDataMap loads after artifacts
  useEffect(() => {
    if (savedDataMap.size === 0 || artifacts.length === 0) return;
    
    let needsUpdate = false;
    const updated = artifacts.map(a => {
      const saved = savedDataMap.get(a.id);
      if (saved && a.code !== saved.code) {
        console.log('🔄 [Late] Updating artifact:', a.id);
        needsUpdate = true;
        return { ...a, code: saved.code, title: saved.title || a.title };
      }
      return a;
    });
    
    if (needsUpdate) setArtifacts(updated);
  }, [savedDataMap, artifacts]);

  const updateArtifact = useCallback((id: string, code: string, title?: string) => {
    setArtifacts(prev => prev.map(a => 
      a.id === id ? { ...a, code, title: title || a.title } : a
    ));
  }, []);

  // Save artifact to database - now includes artifactId to track WHICH artifact was modified
  const saveArtifactToDb = useCallback(async (artifactId: string, code: string, language: string, title: string) => {
    if (!conversationId) {
      console.warn('[Artifact] No conversationId, skipping save');
      return;
    }
    
    // CORRUPTION GUARD: Never save code with render wrapper
    if (code.includes('ReactDOM.createRoot(document.getElementById')) {
      console.error('[Artifact] ❌ BLOCKED: Attempted to save corrupted code with render wrapper!');
      return;
    }
    
    try {
      console.log('[Artifact] Saving artifact:', artifactId, 'code length:', code.length);
      const response = await fetch('/api/artifacts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          artifactId, // Track which artifact was modified!
          code,
          language,
          title,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save artifact');
      }
      
      const data = await response.json();
      console.log('[Artifact] ✅ Saved to DB:', data);

// Store the database UUID for deployment
      if (data.artifact?.id) {
  setArtifacts(prev => prev.map(a => 
    a.id === artifactId ? { ...a, dbId: data.artifact.id } : a
     ));
    }

// Update local savedDataMap so subsequent renders use this
setSavedDataMap(prev => {
        const next = new Map(prev);
        next.set(artifactId, { code, title });
        return next;
      });
    } catch (error) {
      console.error('[Artifact] Save to DB error:', error);
    }
  }, [conversationId]);

  return (
    <ArtifactContext.Provider value={{ 
      artifacts, 
      addArtifact, 
      updateArtifact,
      saveArtifactToDb,
      openGallery: (idx = 0) => { setCurrentIndex(idx); setIsGalleryOpen(true); }, 
      isGalleryOpen, 
      closeGallery: () => setIsGalleryOpen(false), 
      currentIndex, 
      setCurrentIndex,
      conversationId: conversationId || null,
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

interface Attachment { id: string; type: 'image' | 'video' | 'document' | 'code'; name: string; size: number; url?: string; preview?: string; duration?: number; }
interface MessageProps { id: string; role: 'user' | 'alfred'; content: string; timestamp: Date; isStreaming?: boolean; files?: Attachment[]; }
interface ParsedContent { type: 'text' | 'code' | 'code-streaming'; content: string; language?: string; }

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const MessageActions = React.memo(function MessageActions({ content, isAlfred }: { content: string; isAlfred: boolean }) {
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
        </>
      )}
      <style jsx>{`
        .message-actions { display: flex; align-items: center; gap: 2px; padding-top: 8px; }
        .action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: rgba(156,163,175,0.7); }
        .action-btn:hover { background: rgba(156,163,175,0.12); color: rgba(156,163,175,1); }
        .action-btn.active { color: var(--text-primary, rgba(0,0,0,0.7)); }
        .action-btn.success { color: #4ade80; }
      `}</style>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING UTILITIES
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

function extractCodeFromText(text: string): { code: string; language: string; } | null {
  const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
  if (match) {
    return { code: match[2].trim(), language: match[1] || 'jsx' };
  }
  return null;
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
// CODE BLOCK (for main chat)
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
            </button>
          )}
        </div>
      </div>
      <div className="code-container">
        <div className="code-content" ref={scrollRef}>
          {lines.map((line, i) => (<div key={i} className="code-line"><span className="line-num">{i + 1}</span><span className="line-code" dangerouslySetInnerHTML={{ __html: highlightLine(line) || ' ' }} /></div>))}
          {isStreaming && <span className="cursor" />}
        </div>
      </div>
      <style jsx>{`
        .code-block { position: relative; margin: 16px 0; background: transparent; overflow: visible; }
        .code-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 8px 0; }
        .code-header-left { display: flex; align-items: center; gap: 10px; }
        .code-lang { font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 10px; font-weight: 400; letter-spacing: 0.08em; color: rgba(156,163,175,0.6); }
        .code-icon-btn { width: 26px; height: 26px; border-radius: 6px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: rgba(156,163,175,0.5); }
        .code-icon-btn:hover { color: rgba(156,163,175,0.9); background: rgba(156,163,175,0.1); }
        .code-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .code-icon-btn.preview { color: var(--text-secondary, rgba(100,100,100,0.6)); }
        .code-icon-btn.preview:hover { color: var(--text-primary, rgba(50,50,50,0.9)); background: var(--bg-hover, rgba(100,100,100,0.12)); }
        .code-container { position: relative; max-height: 320px; overflow: hidden; }
        .code-content { overflow-y: auto; padding: 16px 0; max-height: 320px; scrollbar-width: none; }
        .code-content::-webkit-scrollbar { display: none; }
        .code-line { display: block; padding: 1px 8px; min-height: 20px; font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 12px; line-height: 20px; }
        .line-num { display: inline-block; width: 28px; color: rgba(156,163,175,0.3); text-align: right; padding-right: 16px; user-select: none; }
        .line-code { color: var(--text-primary, rgba(255,255,255,0.85)); white-space: pre; }
        .line-code :global(.kw) { color: #C586C0; }
        .line-code :global(.str) { color: #CE9178; }
        .line-code :global(.num) { color: #B5CEA8; }
        .line-code :global(.bool) { color: #569CD6; }
        .line-code :global(.cmt) { color: rgba(156,163,175,0.5); font-style: italic; }
        .cursor { display: inline-block; width: 2px; height: 14px; background: var(--text-primary, rgba(100,100,100,0.8)); margin-left: 2px; animation: cursorBlink 1.2s infinite; }
        @keyframes cursorBlink { 0%, 40% { opacity: 1; } 50%, 90% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT GALLERY - State of the Art
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatMessage {
  role: 'user' | 'alfred';
  content: string;
}

function ArtifactGallery() {
  const { artifacts, currentIndex, setCurrentIndex, closeGallery, updateArtifact, saveArtifactToDb } = useArtifacts();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'code' | 'preview'>('preview');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatAttachments, setChatAttachments] = useState<Array<{ id: string; file: File; preview?: string; type: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SMART MODIFICATION INTENT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  const isModificationIntent = useCallback((message: string): boolean => {
    const msg = message.toLowerCase().trim();
    
    // Too short - likely not a modification command
    if (msg.length < 5) return false;
    
    // Greetings and social phrases - NOT modifications
    const greetings = /^(hi|hello|hey|yo|sup|good\s*(morning|afternoon|evening|night)|howdy|greetings)/;
    if (greetings.test(msg)) return false;
    
    // Pure emotional expressions - NOT modifications
    const emotions = /^(i\s*love|love\s*you|thank|thanks|awesome|amazing|great|cool|nice|perfect|wow|lol|haha|omg)/;
    if (emotions.test(msg) && msg.length < 30) return false;
    
    // Questions about the artifact without modification intent
    const pureQuestions = /^(what\s*(is|does)|how\s*does|can\s*you\s*explain|tell\s*me\s*about|describe)/;
    if (pureQuestions.test(msg) && !msg.includes('change') && !msg.includes('make') && !msg.includes('add')) return false;
    
    // MODIFICATION KEYWORDS - Strong indicators
    const modificationKeywords = [
      'change', 'modify', 'update', 'edit', 'fix', 'replace', 'remove', 'delete',
      'add', 'insert', 'move', 'adjust', 'improve', 'enhance', 'refactor', 'rename',
      'resize', 'restyle', 'recolor', 'rewrite', 'redo', 'undo', 'swap', 'switch',
      'increase', 'decrease', 'bigger', 'smaller', 'larger', 'hide', 'show',
      'center', 'align', 'position', 'animate', 'style', 'format', 'wrap',
    ];
    
    if (modificationKeywords.some(kw => msg.includes(kw))) return true;
    
    // IMPERATIVE PHRASES - Strong indicators
    const imperatives = [
      'make it', 'make the', 'make this', 'can you make',
      'please make', 'i want', 'i need', 'could you',
      'would you', 'set the', 'put the', 'give it',
      'turn it', 'turn the', 'let\'s', 'try',
    ];
    
    if (imperatives.some(imp => msg.includes(imp))) return true;
    
    // CODE/UI TERMS combined with action words
    const uiTerms = ['button', 'header', 'footer', 'title', 'text', 'color', 'background', 
      'border', 'margin', 'padding', 'font', 'size', 'width', 'height', 'image',
      'icon', 'link', 'input', 'form', 'card', 'container', 'div', 'component',
      'function', 'variable', 'style', 'css', 'class', 'element'];
    
    const actionWords = ['to', 'into', 'with', 'should', 'needs', 'want', 'like'];
    
    const hasUiTerm = uiTerms.some(term => msg.includes(term));
    const hasAction = actionWords.some(word => msg.includes(word));
    
    if (hasUiTerm && hasAction) return true;
    
    // Color mentions with context
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'black', 'white', 'gray', 'grey'];
    if (colors.some(c => msg.includes(c)) && msg.length > 10) return true;
    
    // Default: if message is substantial and contains technical terms, assume modification
    if (msg.length > 20 && hasUiTerm) return true;
    
    return false;
  }, []);

  // File handling for mini-chat
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 5); // Max 5 files
    
    fileArray.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          setChatAttachments(prev => [...prev, { 
            id, 
            file, 
            preview: reader.result as string,
            type: 'image'
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        setChatAttachments(prev => [...prev, { 
          id, 
          file, 
          type: file.type.includes('pdf') ? 'pdf' : 'file'
        }]);
      }
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setChatAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Audio level analysis for responsive orb
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bands = 20;
    const bandSize = Math.floor(dataArray.length / bands);
    const newLevels: number[] = [];

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[i * bandSize + j];
      }
      const average = sum / bandSize;
      const normalized = Math.pow(average / 255, 0.65);
      newLevels.push(normalized);
    }

    // Smooth transition
    setAudioLevels(prev => 
      prev.map((prevLevel, i) => 
        prevLevel * 0.08 + newLevels[i] * 0.92
      )
    );

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.smoothingTimeConstant = 0.4;
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingTime(0);
      
      // Start audio analysis
      analyzeAudio();
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [analyzeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      isRecordingRef.current = false;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      setAudioLevels(new Array(20).fill(0));
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    stopRecording();
    audioChunksRef.current = [];
    setRecordingTime(0);
  }, [stopRecording]);

  const sendRecording = useCallback(async () => {
    stopRecording();
    
    // Wait for final data
    await new Promise(r => setTimeout(r, 100));
    
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const { text } = await response.json();
        if (text) setChatInput(text);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
      setRecordingTime(0);
    }
  }, [stopRecording]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingCode, setStreamingCode] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const prevIndexRef = useRef(0);
  const isSplitterDragging = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);

  // Watch for theme changes
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme !== 'light');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const displayArtifacts = useMemo(() => {
    if (artifacts.length === 0) return [];
    const valid = artifacts.filter(a => !['App', 'Component', 'Index'].includes(extractComponentName(a.code)));
    return valid.length > 0 ? valid : artifacts;
  }, [artifacts]);

  const safeIndex = displayArtifacts.length > 0 ? Math.max(0, Math.min(currentIndex, displayArtifacts.length - 1)) : 0;
  const current = displayArtifacts[safeIndex];
  
  const displayCode = streamingCode || (current?.code || '');
  const previewHTML = useMemo(() => current ? generatePreviewHTML(displayCode, current.language) : '', [displayCode, current?.language]);

  useEffect(() => { 
    const check = () => setIsMobile(window.innerWidth < 768); 
    check(); 
    window.addEventListener('resize', check); 
    return () => window.removeEventListener('resize', check); 
  }, []);

  const handleClose = useCallback(() => { 
    setIsClosing(true); 
    setTimeout(closeGallery, 280); 
  }, [closeGallery]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft' && safeIndex > 0 && !chatInput) setCurrentIndex(safeIndex - 1);
      if (e.key === 'ArrowRight' && safeIndex < displayArtifacts.length - 1 && !chatInput) setCurrentIndex(safeIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [safeIndex, displayArtifacts.length, handleClose, setCurrentIndex, chatInput]);

  useEffect(() => { setIsLoaded(false); }, [safeIndex, displayCode]);

  // Smooth transition between artifacts
  useEffect(() => {
    if (prevIndexRef.current !== safeIndex) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 400);
      prevIndexRef.current = safeIndex;
      return () => clearTimeout(timer);
    }
  }, [safeIndex]);

  // Splitter: Only expand PREVIEW (drag left to make preview bigger)
  // Code panel: min 25%, max 50% (so preview: min 50%, max 75%)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isSplitterDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isSplitterDragging.current || !containerRef.current) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        // Code panel: min 25%, max 50% (preview gets 50% to 75%)
        setSplitPosition(Math.max(25, Math.min(50, percent)));
      });
    };
    const handleMouseUp = () => {
      isSplitterDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-scroll code display during streaming
  useEffect(() => {
    if (streamingCode && codeDisplayRef.current) {
      codeDisplayRef.current.scrollTo({
        top: codeDisplayRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [streamingCode]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [chatInput]);

  const handleSendEdit = useCallback(async () => {
    if ((!chatInput.trim() && chatAttachments.length === 0) || !current || isTyping) return;
    
    const userMsg = chatInput.trim();
    const hasAttachments = chatAttachments.length > 0;
    setChatInput('');
    
    // Display message with attachment indicator
    const displayMsg = hasAttachments 
      ? `${userMsg || ''} [${chatAttachments.length} file${chatAttachments.length > 1 ? 's' : ''} attached]`.trim()
      : userMsg;
    setChatMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
    
    // Check if this is a modification intent
    const shouldModify = isModificationIntent(userMsg) || hasAttachments;
    
    if (!shouldModify) {
      // Just a conversational message - respond without modifying
      setChatMessages(prev => [...prev, { 
        role: 'alfred', 
        content: getConversationalResponse(userMsg)
      }]);
      return;
    }
    
    // It's a modification request - proceed with API call
    setIsTyping(true);
    setStreamingCode('');
    
    // Prepare attachments for API
    const attachmentData = await Promise.all(
      chatAttachments.map(async (att) => {
        const reader = new FileReader();
        return new Promise<{ name: string; type: string; data: string }>((resolve) => {
          reader.onload = () => {
            resolve({
              name: att.file.name,
              type: att.file.type,
              data: (reader.result as string).split(',')[1] // base64
            });
          };
          reader.readAsDataURL(att.file);
        });
      })
    );
    
    setChatAttachments([]); // Clear attachments after sending

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg || 'Please analyze the attached file(s) and update the artifact accordingly.',
          artifactCode: current.code,
          artifactTitle: extractComponentName(current.code),
          ...(attachmentData.length > 0 && { attachments: attachmentData }),
        }),
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                
                // Show streaming code in REAL-TIME (even before code block closes)
                // First try complete code block
                const completeMatch = fullResponse.match(/```(\w+)?\n([\s\S]*?)```/);
                if (completeMatch) {
                  setStreamingCode(completeMatch[2].trim());
                } else {
                  // Show partial code as it streams (before closing ```)
                  const partialMatch = fullResponse.match(/```(\w+)?\n([\s\S]*)/);
                  if (partialMatch && partialMatch[2]) {
                    setStreamingCode(partialMatch[2]);
                  }
                }
              }
            } catch {}
          }
        }
      }

      const extracted = extractCodeFromText(fullResponse);
      if (extracted && current) {
        updateArtifact(current.id, extracted.code, extractComponentName(extracted.code));
        setStreamingCode('');
        
        // Save to database - include current.id to track which artifact was modified!
        await saveArtifactToDb(current.id, extracted.code, extracted.language, extractComponentName(extracted.code));
      }

      const textPart = fullResponse.split(/```/)[0].trim();
      setChatMessages(prev => [...prev, { 
        role: 'alfred', 
        content: textPart || 'Done! The code has been updated.' 
      }]);
      
      // Show completion animation
      setShowCompletion(true);
      setTimeout(() => setShowCompletion(false), 1500);

    } catch (error) {
      console.error('[Gallery] API Error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'alfred', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
      setStreamingCode('');
    } finally {
      setIsTyping(false);
    }
  }, [chatInput, chatAttachments, current, isTyping, updateArtifact, saveArtifactToDb, isModificationIntent]);

  // Conversational responses for non-modification messages
  const getConversationalResponse = (msg: string): string => {
    const m = msg.toLowerCase();
    
    if (/^(hi|hello|hey|yo|sup)/.test(m)) {
      return "Hey there! I'm here to help you modify this artifact. Just tell me what changes you'd like to make!";
    }
    if (/love|thank|thanks|awesome|amazing|great|cool|nice|perfect/.test(m)) {
      return "Thank you! 😊 If you want any changes to this artifact, just let me know what you'd like to modify.";
    }
    if (/\?$/.test(m)) {
      return "Good question! I'm focused on helping you modify this artifact. If you'd like to make any changes, just describe what you want and I'll update the code.";
    }
    if (/who|what|how|why|when|where/.test(m)) {
      return "I'm Alfred, your artifact modification assistant. Tell me what changes you'd like to make - colors, layout, functionality, anything!";
    }
    
    return "I'm here to help modify this artifact. Try something like 'make the button blue' or 'add a dark mode toggle'. What would you like to change?";
  };

  if (!current) return null;
  const currentName = extractComponentName(current.code);

  return (
    <div className={`gallery-overlay ${isClosing ? 'closing' : ''} ${isDark ? 'dark' : 'light'}`}>
      {/* HEADER */}
      <header className="gallery-header">
        <div className="header-left">
          <button className="nav-btn" onClick={() => setCurrentIndex(safeIndex - 1)} disabled={safeIndex === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="counter">{safeIndex + 1}/{displayArtifacts.length}</span>
          <button className="nav-btn" onClick={() => setCurrentIndex(safeIndex + 1)} disabled={safeIndex === displayArtifacts.length - 1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          {/* Mobile tabs - in header left for better visibility */}
          {isMobile && (
            <div className="mobile-tabs">
              <button className={`tab ${mobileTab === 'code' ? 'active' : ''}`} onClick={() => setMobileTab('code')}>Code</button>
              <button className={`tab ${mobileTab === 'preview' ? 'active' : ''}`} onClick={() => setMobileTab('preview')}>Preview</button>
            </div>
          )}
          {/* Title only on desktop */}
          {!isMobile && <span className="title">{currentName}</span>}
          {isTyping && <span className="updating-badge">Crafting</span>}
        </div>
        <div className="header-right">
          {!isMobile && (
            <button className={`toggle-btn ${showCode ? 'active' : ''}`} onClick={() => setShowCode(!showCode)}>
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>
          )}
          {current && (
            <DeployButton
              artifactId={current.dbId || current.id}
              artifactTitle={currentName}
              artifactCode={displayCode}
              onDeployed={(url) => console.log('Deployed:', url)}
            />
          )}
          <button className="icon-btn" onClick={() => { setIsLoaded(false); if(iframeRef.current) iframeRef.current.src = iframeRef.current.src; }} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>
          <button className="icon-btn close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="gallery-main" ref={containerRef}>
        {/* CODE PANEL */}
        {((showCode && !isMobile) || (isMobile && mobileTab === 'code')) && (
          <div className="code-panel" style={{ width: isMobile ? '100%' : `${splitPosition}%` }}>
            {/* Code Display */}
            <div className={`code-display ${streamingCode ? 'streaming' : ''}`} ref={codeDisplayRef}>
              {streamingCode && (
                <div className="streaming-indicator">
                  <span className="pulse"></span> Alfred is writing...
                </div>
              )}
              {displayCode.split('\n').map((line, i) => (
                <div key={i} className={`code-line ${streamingCode && i === displayCode.split('\n').length - 1 ? 'active-line' : ''}`}>
                  <span className="ln">{i + 1}</span>
                  <span className="lc">{line}{streamingCode && i === displayCode.split('\n').length - 1 && <span className="cursor" />}</span>
                </div>
              ))}
            </div>

            {/* Chat Section - Fixed at bottom of code panel */}
            <div 
              className={`chat-section ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length > 0) {
                  handleFileSelect(e.dataTransfer.files);
                }
              }}
            >
              {/* Messages */}
              {chatMessages.length > 0 && (
                <div className="chat-messages" ref={chatScrollRef}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`msg ${msg.role}`}>
                      <span className="msg-role">{msg.role === 'user' ? 'You' : 'Alfred'}</span>
                      <span className="msg-text">{msg.content}</span>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="msg alfred">
                      <span className="msg-role">Alfred</span>
                      <span className="typing"><span/><span/><span/></span>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Preview */}
              {chatAttachments.length > 0 && (
                <div className="chat-attachments">
                  {chatAttachments.map((att) => (
                    <div key={att.id} className="chat-attachment">
                      {att.preview ? (
                        <img src={att.preview} alt={att.file.name} className="chat-attachment-img" />
                      ) : (
                        <div className="chat-attachment-file">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span>{att.file.name.slice(0, 12)}{att.file.name.length > 12 ? '...' : ''}</span>
                        </div>
                      )}
                      <button className="chat-attachment-remove" onClick={() => removeAttachment(att.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drag overlay */}
              {isDragging && (
                <div className="drag-overlay">
                  <div className="drag-content">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <span>Drop files here</span>
                  </div>
                </div>
              )}

              {/* Input Box - Enhanced with file upload and voice */}
              <div className="input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.jsx,.tsx,.css,.html"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
                <div className={`input-container ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}>
                  {isRecording ? (
                    /* Recording UI - Pulsing Orb (same as main page) */
                    <div className="recording-ui">
                      <button className="recording-cancel" onClick={cancelRecording} aria-label="Cancel">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </button>
                      <div className="recording-center">
                        <div className="orb-container">
                          <div 
                            className="orb" 
                            style={{
                              transform: `scale(${1 + (audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length) * 0.5})`,
                            }}
                          />
                          <div 
                            className="orb-ring orb-ring-1" 
                            style={{
                              transform: `scale(${1.3 + (audioLevels[5] || 0) * 0.4})`,
                              opacity: 0.15 + (audioLevels[5] || 0) * 0.2,
                            }}
                          />
                          <div 
                            className="orb-ring orb-ring-2" 
                            style={{
                              transform: `scale(${1.6 + (audioLevels[15] || 0) * 0.5})`,
                              opacity: 0.08 + (audioLevels[15] || 0) * 0.15,
                            }}
                          />
                        </div>
                      </div>
                      <button className="recording-send" onClick={sendRecording} aria-label="Done">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </div>
                  ) : isTranscribing ? (
                    /* Transcribing UI */
                    <div className="transcribing-ui">
                      <div className="transcribing-spinner" />
                      <span>Transcribing...</span>
                    </div>
                  ) : (
                    /* Normal input UI */
                    <>
                      <button 
                        className="attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach files"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                      </button>
                      <textarea
                        ref={inputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendEdit();
                          }
                        }}
                        onPaste={(e) => {
                          const files = Array.from(e.clipboardData.files);
                          if (files.length > 0) {
                            e.preventDefault();
                            handleFileSelect(files);
                          }
                        }}
                        placeholder="Describe changes or drop files..."
                        disabled={isTyping}
                        rows={1}
                      />
                      {(chatInput.trim() || chatAttachments.length > 0) ? (
                        <button 
                          className="send-btn active"
                          onClick={handleSendEdit}
                          disabled={isTyping}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      ) : (
                        <button 
                          className="voice-btn"
                          onClick={startRecording}
                          disabled={isTyping}
                          title="Voice input"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                            <path d="M19 10v2a7 7 0 01-14 0v-2" />
                            <path d="M12 19v4M8 23h8" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPLITTER */}
        {showCode && !isMobile && (
          <div className="splitter" onMouseDown={handleMouseDown}>
            <div className="splitter-handle" />
          </div>
        )}

        {/* PREVIEW PANEL - State of the Art with Crafting Animation */}
        {((!isMobile) || (isMobile && mobileTab === 'preview')) && (
          <div className="preview-panel" style={{ width: showCode && !isMobile ? `${100 - splitPosition}%` : '100%' }}>
            
            {/* Alfred Crafting Overlay - Shows while modifying */}
            {isTyping && (
              <div className="crafting-overlay">
                <div className="crafting-container">
                  {/* Orbital rings */}
                  <div className="orbit orbit-1">
                    <div className="orbit-dot" />
                    <div className="orbit-dot" style={{ animationDelay: '-2s' }} />
                  </div>
                  <div className="orbit orbit-2">
                    <div className="orbit-dot" />
                    <div className="orbit-dot" style={{ animationDelay: '-1.5s' }} />
                  </div>
                  <div className="orbit orbit-3">
                    <div className="orbit-dot" />
                  </div>
                  
                  {/* Central morphing cube */}
                  <div className="morph-cube">
                    <div className="cube-face face-front" />
                    <div className="cube-face face-back" />
                    <div className="cube-face face-left" />
                    <div className="cube-face face-right" />
                    <div className="cube-face face-top" />
                    <div className="cube-face face-bottom" />
                  </div>
                  
                  {/* Pulsing glow */}
                  <div className="pulse-ring pulse-1" />
                  <div className="pulse-ring pulse-2" />
                  <div className="pulse-ring pulse-3" />
                  
                  {/* Floating code particles */}
                  <div className="particles">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="particle" style={{ 
                        '--delay': `${i * 0.3}s`,
                        '--angle': `${i * 30}deg`,
                        '--distance': `${60 + (i % 3) * 25}px`
                      } as React.CSSProperties} />
                    ))}
                  </div>
                </div>
                
                {/* Crafting text */}
                <div className="crafting-text">
                  <span className="crafting-label">Alfred is crafting</span>
                  <div className="crafting-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
                
                {/* Streaming code preview - subtle background */}
                {streamingCode && (
                  <div className="streaming-preview">
                    <div className="streaming-lines">
                      {streamingCode.split('\n').slice(-8).map((line, i) => (
                        <div key={i} className="streaming-line" style={{ opacity: 0.3 + (i * 0.08) }}>
                          {line.substring(0, 50)}{line.length > 50 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Normal loader - only when not typing and not loaded */}
            {!isLoaded && !isTyping && <div className="loader"><div className="spinner" /></div>}
            
            {/* Completion celebration - brief flash when done */}
            {showCompletion && (
              <div className="completion-overlay">
                <div className="completion-ring" />
                <div className="completion-check">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            
            {/* Preview iframe with smooth transition */}
            <iframe 
              ref={iframeRef} 
              srcDoc={previewHTML} 
              sandbox="allow-scripts allow-same-origin" 
              onLoad={() => setIsLoaded(true)} 
              className={`${isLoaded ? 'loaded' : ''} ${isTyping ? 'crafting' : ''} ${isTransitioning ? 'transitioning' : ''}`}
            />
          </div>
        )}
      </main>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════
           THEME VARIABLES
           ═══════════════════════════════════════════════════════════════════════ */
        .gallery-overlay.light {
          --bg: #f5f5f5;
          --bg-secondary: #fafafa;
          --bg-glass: rgba(255, 255, 255, 0.95);
          --border: rgba(0, 0, 0, 0.08);
          --border-hover: rgba(0, 0, 0, 0.15);
          --text: rgba(0, 0, 0, 0.85);
          --text-secondary: rgba(0, 0, 0, 0.5);
          --text-muted: rgba(0, 0, 0, 0.25);
          --btn-bg: rgba(0, 0, 0, 0.04);
          --btn-bg-hover: rgba(0, 0, 0, 0.08);
          --btn-active: black;
          --btn-active-text: white;
          --bubble: rgba(0, 0, 0, 0.04);
          --bubble-user: rgba(0, 0, 0, 0.08);
          --preview-bg: white;
          --input-bg: rgba(255, 255, 255, 0.95);
          --input-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 24px -4px rgba(0, 0, 0, 0.08);
        }

        .gallery-overlay.dark {
          --bg: #0a0a0b;
          --bg-secondary: #0d0d0e;
          --bg-glass: rgba(0, 0, 0, 0.7);
          --border: rgba(255, 255, 255, 0.08);
          --border-hover: rgba(255, 255, 255, 0.15);
          --text: rgba(255, 255, 255, 0.9);
          --text-secondary: rgba(255, 255, 255, 0.5);
          --text-muted: rgba(255, 255, 255, 0.25);
          --btn-bg: rgba(255, 255, 255, 0.06);
          --btn-bg-hover: rgba(255, 255, 255, 0.1);
          --btn-active: white;
          --btn-active-text: black;
          --bubble: rgba(255, 255, 255, 0.06);
          --bubble-user: rgba(255, 255, 255, 0.1);
          --preview-bg: #111;
          --input-bg: rgba(0, 0, 0, 0.7);
          --input-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        /* Dark mode recording styles */
        .gallery-overlay.dark .recording-cancel {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.35);
        }
        .gallery-overlay.dark .recording-cancel:hover {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.5);
        }
        .gallery-overlay.dark .orb {
          background: white;
        }
        .gallery-overlay.dark .orb-ring {
          border-color: white;
        }
        .gallery-overlay.dark .recording-send {
          background: white;
          color: black;
        }
        .gallery-overlay.dark .recording-send:hover {
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.15);
        }
        .gallery-overlay.dark .transcribing-spinner {
          border-color: rgba(255, 255, 255, 0.1);
          border-top-color: white;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           GALLERY OVERLAY
           ═══════════════════════════════════════════════════════════════════════ */
        .gallery-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          animation: fadeIn 0.3s ease-out;
        }
        .gallery-overlay.closing { animation: fadeOut 0.25s ease-in forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

        /* ═══════════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════════ */
        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-glass);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          flex-shrink: 0;
        }
        .header-left, .header-right { display: flex; align-items: center; gap: 8px; }
        .header-left { flex: 1; min-width: 0; }
        .header-right { flex-shrink: 0; }

        .nav-btn, .icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--btn-bg);
          border: 1px solid var(--border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .nav-btn:hover:not(:disabled), .icon-btn:hover {
          color: var(--text);
          background: var(--btn-bg-hover);
        }
        .nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .icon-btn.close:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

        .counter {
          font-family: 'SF Mono', monospace;
          font-size: 11px;
          color: var(--text-muted);
          min-width: 36px;
          text-align: center;
        }
        .title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          margin-left: 8px;
        }
        .updating-badge {
          font-size: 10px;
          font-weight: 500;
          color: var(--text);
          background: linear-gradient(135deg, var(--btn-bg) 0%, var(--btn-bg-hover) 100%);
          padding: 4px 10px;
          border-radius: 20px;
          margin-left: 8px;
          letter-spacing: 0.02em;
          border: 1px solid var(--border);
          animation: badgePulse 2s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .updating-badge::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: badgeShine 2s ease-in-out infinite;
        }
        @keyframes badgePulse { 
          0%, 100% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.8; transform: scale(0.98); } 
        }
        @keyframes badgeShine {
          0% { left: -100%; }
          50%, 100% { left: 100%; }
        }

        .mobile-tabs {
          display: flex;
          background: var(--btn-bg);
          border-radius: 6px;
          padding: 2px;
          margin-left: 8px;
          flex-shrink: 0;
        }
        .tab {
          padding: 5px 12px;
          border-radius: 5px;
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab.active {
          background: var(--btn-bg-hover);
          color: var(--text);
        }

        .toggle-btn {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .toggle-btn:hover { color: var(--text); border-color: var(--border-hover); }
        .toggle-btn.active { color: var(--text); background: var(--btn-bg); }

        /* ═══════════════════════════════════════════════════════════════════════
           MAIN LAYOUT
           ═══════════════════════════════════════════════════════════════════════ */
        .gallery-main { 
          flex: 1; 
          display: flex; 
          overflow: hidden;
          position: relative;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CODE PANEL - Contains code display + chat section
           ═══════════════════════════════════════════════════════════════════════ */
        .code-panel {
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          overflow: hidden;
          position: relative;
        }

        .code-display {
          flex: 1;
          overflow-y: auto;
          padding: 16px 0;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .code-display::-webkit-scrollbar { width: 6px; }
        .code-display::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        /* Streaming state */
        .code-display.streaming {
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
        }
        .streaming-indicator {
          position: sticky;
          top: 0;
          padding: 8px 16px;
          font-size: 12px;
          color: #3b82f6;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), transparent);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .streaming-indicator .pulse {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .code-line {
          display: flex;
          padding: 1px 16px;
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
        }
        .ln {
          width: 36px;
          color: var(--text-muted);
          text-align: right;
          padding-right: 16px;
          user-select: none;
          flex-shrink: 0;
        }
        .lc { color: var(--text); white-space: pre; opacity: 0.8; }
        
        /* Active line during streaming */
        .code-line.active-line {
          background: rgba(59, 130, 246, 0.08);
        }
        .cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #3b82f6;
          margin-left: 1px;
          animation: cursorBlink 1s step-end infinite;
          vertical-align: middle;
        }
        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CHAT SECTION - Fixed at bottom of code panel
           ═══════════════════════════════════════════════════════════════════════ */
        .chat-section {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          max-height: 40%;
          position: relative;
        }
        .chat-section.dragging {
          background: rgba(59, 130, 246, 0.05);
        }

        /* Drag overlay */
        .drag-overlay {
          position: absolute;
          inset: 0;
          background: rgba(59, 130, 246, 0.1);
          border: 2px dashed rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .drag-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: rgba(59, 130, 246, 0.8);
        }
        .drag-content span {
          font-size: 14px;
          font-weight: 500;
        }

        /* Chat attachments preview */
        .chat-attachments {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .chat-attachment {
          position: relative;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 8px;
          overflow: hidden;
          background: var(--bubble);
          border: 1px solid var(--border);
        }
        .chat-attachment-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .chat-attachment-file {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 4px;
        }
        .chat-attachment-file svg {
          opacity: 0.6;
        }
        .chat-attachment-file span {
          font-size: 8px;
          color: var(--text-secondary);
          text-align: center;
          word-break: break-all;
        }
        .chat-attachment-remove {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--text);
          color: var(--bg);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .chat-attachment:hover .chat-attachment-remove {
          opacity: 1;
        }

        /* Attach button */
        .attach-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .attach-btn:hover {
          background: var(--btn-bg);
          color: var(--text);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
          max-height: 180px;
        }
        .msg {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 90%;
        }
        .msg.user { align-self: flex-end; align-items: flex-end; }
        .msg.alfred { align-self: flex-start; align-items: flex-start; }
        .msg-role {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-secondary);
        }
        .msg-text {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text);
          padding: 10px 14px;
          border-radius: 16px;
          background: var(--bubble);
        }
        .msg.user .msg-text {
          background: var(--bubble-user);
          border-radius: 16px 16px 4px 16px;
        }
        .msg.alfred .msg-text { border-radius: 16px 16px 16px 4px; }

        .typing { display: flex; gap: 4px; padding: 10px 14px; }
        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-secondary);
          animation: bounce 1.2s ease-in-out infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.15s; }
        .typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }

        /* ═══════════════════════════════════════════════════════════════════════
           INPUT - Matches ChatInput.tsx exactly
           ═══════════════════════════════════════════════════════════════════════ */
        .input-wrapper {
          padding: 16px;
        }

        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          padding: 10px 12px;
          background: var(--input-bg);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--border);
          border-radius: 24px;
          transition: all 0.2s ease;
          box-shadow: var(--input-shadow);
        }
        .input-container:focus-within {
          border-color: var(--border-hover);
        }

        .input-container textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
          font-size: 16px;
          color: var(--text);
          resize: none;
          min-height: 24px;
          max-height: 120px;
          line-height: 1.5;
          padding: 0;
        }
        .input-container textarea::placeholder { color: var(--text-secondary); }
        .input-container textarea:disabled { opacity: 0.5; }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: none;
          background: var(--btn-bg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .send-btn:hover:not(:disabled) {
          background: var(--btn-bg-hover);
          color: var(--text-secondary);
        }
        .send-btn.active {
          background: var(--btn-active);
          color: var(--btn-active-text);
        }
        .send-btn.active:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Voice button */
        .voice-btn {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: none;
          background: var(--btn-bg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .voice-btn:hover:not(:disabled) {
          background: var(--btn-bg-hover);
          color: var(--text);
        }
        .voice-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Recording state - matching main ChatInput exactly */
        .input-container.recording {
          background: var(--input-bg);
        }
        .input-container.transcribing {
          background: var(--input-bg);
        }

        .recording-ui {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
          animation: recordingFadeIn 0.3s ease-out;
        }
        @keyframes recordingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Cancel Button - subtle gray with square icon */
        .recording-cancel {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.06);
          color: rgba(0, 0, 0, 0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .recording-cancel:hover {
          background: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.5);
        }
        .recording-cancel:active {
          transform: scale(0.94);
        }

        /* Center - Orb Container */
        .recording-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
        }
        .orb-container {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* The Core Orb - Breathes with voice */
        .orb {
          width: 20px;
          height: 20px;
          background: black;
          border-radius: 50%;
          transition: transform 0.03s linear;
          will-change: transform;
        }

        /* Ripple Rings - Respond to different frequencies */
        .orb-ring {
          position: absolute;
          inset: 0;
          border: 1.5px solid black;
          border-radius: 50%;
          transition: transform 0.04s linear, opacity 0.04s linear;
          will-change: transform, opacity;
          pointer-events: none;
        }
        .orb-ring-1 {
          inset: 4px;
        }
        .orb-ring-2 {
          inset: -2px;
        }

        /* Send Button - black circle with white checkmark */
        .recording-send {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: black;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .recording-send:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .recording-send:active {
          transform: scale(0.95);
        }

        /* Transcribing state */
        .transcribing-ui {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 8px 0;
        }
        .transcribing-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: black;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .transcribing-ui span {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SPLITTER - Only expands code panel (45% to 70%)
           ═══════════════════════════════════════════════════════════════════════ */
        .splitter {
          width: 12px;
          background: transparent;
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        .splitter::before {
          content: '';
          position: absolute;
          inset: 0;
          background: transparent;
          transition: background 0.15s;
        }
        .splitter:hover::before { background: var(--btn-bg); }
        .splitter:active::before { background: var(--btn-bg-hover); }
        .splitter-handle {
          width: 3px;
          height: 48px;
          background: var(--border);
          border-radius: 2px;
          transition: all 0.15s ease;
          z-index: 1;
        }
        .splitter:hover .splitter-handle { height: 64px; background: var(--border-hover); }
        .splitter:active .splitter-handle { height: 80px; background: var(--text-secondary); }

        /* ═══════════════════════════════════════════════════════════════════════
           PREVIEW PANEL
           ═══════════════════════════════════════════════════════════════════════ */
        .preview-panel {
          position: relative;
          background: var(--preview-bg);
          flex: 1;
          min-width: 0;
        }
        iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        iframe.loaded { opacity: 1; }

        .loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border);
          border-top-color: var(--text-secondary);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ═══════════════════════════════════════════════════════════════════════
           ALFRED CRAFTING ANIMATION - State of the Art
           ═══════════════════════════════════════════════════════════════════════ */
        .crafting-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--preview-bg);
          z-index: 10;
          animation: craftingFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes craftingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .crafting-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Orbital rings */
        .orbit {
          position: absolute;
          border: 1px solid var(--border);
          border-radius: 50%;
          animation: orbitSpin 8s linear infinite;
        }
        .orbit-1 { width: 120px; height: 120px; animation-duration: 6s; }
        .orbit-2 { width: 160px; height: 160px; animation-duration: 10s; animation-direction: reverse; }
        .orbit-3 { width: 190px; height: 190px; animation-duration: 14s; opacity: 0.5; }

        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .orbit-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, var(--text-secondary), var(--text-muted));
          border-radius: 50%;
          top: -4px;
          left: calc(50% - 4px);
          box-shadow: 0 0 12px var(--text-muted);
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
        }

        /* Morphing cube - the centerpiece */
        .morph-cube {
          position: relative;
          width: 40px;
          height: 40px;
          transform-style: preserve-3d;
          animation: cubeFloat 4s ease-in-out infinite, cubeMorph 8s ease-in-out infinite;
        }
        @keyframes cubeFloat {
          0%, 100% { transform: rotateX(-20deg) rotateY(0deg) translateY(0); }
          50% { transform: rotateX(-20deg) rotateY(180deg) translateY(-8px); }
        }
        @keyframes cubeMorph {
          0%, 100% { border-radius: 4px; }
          50% { border-radius: 50%; }
        }

        .cube-face {
          position: absolute;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, 
            rgba(var(--text-secondary), 0.1) 0%,
            rgba(var(--text-secondary), 0.05) 100%
          );
          border: 1px solid var(--border);
          backdrop-filter: blur(4px);
        }
        .gallery-overlay.dark .cube-face {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        }
        .gallery-overlay.light .cube-face {
          background: linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%);
        }

        .face-front { transform: translateZ(20px); }
        .face-back { transform: translateZ(-20px) rotateY(180deg); }
        .face-left { transform: translateX(-20px) rotateY(-90deg); }
        .face-right { transform: translateX(20px) rotateY(90deg); }
        .face-top { transform: translateY(-20px) rotateX(90deg); }
        .face-bottom { transform: translateY(20px) rotateX(-90deg); }

        /* Pulse rings */
        .pulse-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid var(--text-muted);
          animation: pulseExpand 3s ease-out infinite;
        }
        .pulse-1 { width: 60px; height: 60px; }
        .pulse-2 { width: 60px; height: 60px; animation-delay: 1s; }
        .pulse-3 { width: 60px; height: 60px; animation-delay: 2s; }

        @keyframes pulseExpand {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        /* Floating particles */
        .particles {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: var(--text-muted);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          animation: particleFloat 4s ease-in-out infinite;
          animation-delay: var(--delay);
        }
        @keyframes particleFloat {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) rotate(calc(var(--angle) + 180deg)) translateX(calc(var(--distance) * 1.3)) scale(1.5);
            opacity: 0.7;
          }
        }

        /* Crafting text */
        .crafting-text {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 32px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }
        .crafting-label {
          animation: textShimmer 2s ease-in-out infinite;
        }
        @keyframes textShimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .crafting-dots {
          display: flex;
          gap: 3px;
          padding-left: 2px;
        }
        .crafting-dots .dot {
          width: 4px;
          height: 4px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: dotBounce 1.4s ease-in-out infinite;
        }
        .crafting-dots .dot:nth-child(2) { animation-delay: 0.2s; }
        .crafting-dots .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }

        /* Streaming code preview - subtle background effect */
        .streaming-preview {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          max-width: 400px;
          padding: 16px;
          background: var(--bubble);
          border-radius: 12px;
          border: 1px solid var(--border);
          overflow: hidden;
          animation: streamingSlideUp 0.4s ease-out;
        }
        @keyframes streamingSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .streaming-lines {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 10px;
          line-height: 1.6;
          color: var(--text-muted);
          white-space: pre;
          overflow: hidden;
        }
        .streaming-line {
          animation: lineSlide 0.3s ease-out;
        }
        @keyframes lineSlide {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: inherit; }
        }

        /* Iframe crafting state - smooth blur transition */
        iframe.crafting {
          filter: blur(8px);
          transform: scale(0.98);
          transition: filter 0.4s ease, transform 0.4s ease, opacity 0.4s ease;
        }
        iframe.loaded:not(.crafting) {
          filter: blur(0);
          transform: scale(1);
          transition: filter 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.4s ease;
        }

        /* Smooth artifact switching transition */
        iframe.transitioning {
          animation: artifactSwitch 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes artifactSwitch {
          0% { opacity: 1; transform: scale(1); }
          40% { opacity: 0; transform: scale(0.96) translateY(8px); }
          60% { opacity: 0; transform: scale(0.96) translateY(-8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Preview panel smooth transitions */
        .preview-panel {
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ═══════════════════════════════════════════════════════════════════════
           COMPLETION CELEBRATION
           ═══════════════════════════════════════════════════════════════════════ */
        .completion-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 15;
          pointer-events: none;
          animation: completionFade 1.5s ease-out forwards;
        }
        @keyframes completionFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }

        .completion-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid var(--text-secondary);
          animation: ringExpand 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes ringExpand {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .completion-check {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          animation: checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
        }
        @keyframes checkPop {
          0% { transform: scale(0) rotate(-45deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .completion-check svg {
          animation: checkDraw 0.4s ease-out 0.2s forwards;
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           MOBILE
           ═══════════════════════════════════════════════════════════════════════ */
        @media (max-width: 767px) {
          .gallery-header { padding: 8px 10px; gap: 8px; }
          .header-left { gap: 4px; }
          .nav-btn, .icon-btn { width: 32px; height: 32px; }
          .counter { font-size: 10px; min-width: 28px; }
          .updating-badge { font-size: 9px; padding: 3px 8px; margin-left: 4px; }
          .code-panel { width: 100% !important; }
          .preview-panel { width: 100% !important; }
          .code-line { padding: 1px 12px; font-size: 11px; }
          .ln { width: 28px; padding-right: 12px; }
          .chat-messages { padding: 12px; max-height: 150px; }
          .input-wrapper { padding: 12px; }
          .input-container { border-radius: 20px; }
          .input-container textarea { font-size: 16px; }
        }
      `}</style>
    </div>
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
    else if (match[4]) elements.push(<code key={key + '-' + match.index} style={{ fontFamily: "'SF Mono', monospace", fontSize: '0.9em', background: 'rgba(156,163,175,0.12)', padding: '2px 6px', borderRadius: '4px', color: 'inherit' }}>{match[4]}</code>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) elements.push(<span key={key + '-end'}>{text.slice(lastIndex)}</span>);
  return elements.length > 0 ? elements : [<span key={key}>{text}</span>];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Message = React.memo(function Message({ id, role, content, timestamp, isStreaming = false, files }: MessageProps) {
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

  // Get the SAVED code for a code block (if available)
  const getCodeForBlock = useCallback((index: number, originalCode: string) => {
    if (!artifactCtx) return originalCode;
    const artifact = artifactCtx.artifacts.find(a => a.id === id + '-' + index);
    if (artifact && artifact.code !== originalCode) {
      console.log('[Message] Using SAVED code for block', index);
      return artifact.code;
    }
    return originalCode;
  }, [artifactCtx?.artifacts, id]);

  // Force re-render when artifacts change
  const artifactsVersion = artifactCtx?.artifacts.map(a => a.code.length).join('-') || '';
  
  // Debug log
  useEffect(() => {
    console.log('[Message] Artifacts in context:', artifactCtx?.artifacts.map(a => ({ id: a.id, codeLen: a.code.length })));
  }, [artifactCtx?.artifacts]);

  return (
    <div className="message-wrapper" data-artifacts-version={artifactsVersion}>
      <div className={'message-content ' + role}>
        {files && files.length > 0 && <MessageAttachments attachments={files} isUser={role === 'user'} />}
        {parsedContent.map((part, index) => {
          if (part.type === 'code' || part.type === 'code-streaming') {
            // Use saved artifact code if available!
            const displayCode = part.type === 'code' ? getCodeForBlock(index, part.content) : part.content;
            return <CodeBlock key={index} language={part.language || 'plaintext'} code={displayCode} isStreaming={part.type === 'code-streaming'} onPreview={part.type === 'code' ? () => handlePreview(index) : undefined} />;
          }
          return <div key={index} style={{ padding: '2px 0' }}>{formatText(part.content)}</div>;
        })}
        {isStreaming && parsedContent.every(p => p.type === 'text') && <span className="streaming-cursor" />}
      </div>
      {!isStreaming && role === 'alfred' && <MessageActions content={content} isAlfred={true} />}
      <style jsx>{`
        .message-wrapper { display: flex; flex-direction: column; align-items: ${role === 'user' ? 'flex-end' : 'flex-start'}; width: 100%; }
        .message-content { display: flex; flex-direction: column; gap: 8px; width: ${role === 'user' ? 'auto' : '100%'}; max-width: ${role === 'user' ? '80%' : '100%'}; font-family: 'Inter', -apple-system, sans-serif; font-size: 15px; line-height: 1.75; color: var(--text-primary); }
        .streaming-cursor { display: inline-block; width: 2px; height: 16px; background: var(--text-secondary, rgba(100,100,100,0.6)); margin-left: 2px; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
});

export default Message;

// ═══════════════════════════════════════════════════════════════════════════════
// ALFRED THINKING
// ═══════════════════════════════════════════════════════════════════════════════

export function AlfredThinking() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 0' }}>
      {[0, 1, 2].map(i => (<span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-secondary, rgba(100,100,100,0.5))', animation: 'dot 1.4s ease-in-out infinite', animationDelay: i * 0.15 + 's' }} />))}
      <style>{`@keyframes dot{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}