'use client';

import React, { useState, useMemo, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';

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

  // Clear artifacts when conversation changes
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
// PARSING
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
  <script>
    document.addEventListener('touchmove', function(e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); });
  <\/script>
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
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
        }
      }
    }
  <\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { min-height: 100%; }
    html, body { touch-action: pan-x pan-y; -webkit-touch-callout: none; }
    body { 
      min-height: 100vh;
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root { min-height: 100vh; }
    html { scroll-behavior: smooth; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
    img { max-width: 100%; height: auto; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
    .animate-slideUp { animation: slideUp 0.5s ease-out; }
    .animate-slideDown { animation: slideDown 0.5s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
  </style>
  <script>
    document.addEventListener('touchmove', function(e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); });
  <\/script>
</head>
<body>
  <div id="root"></div>
  <script>
    // Image error fallback
    document.addEventListener("error", function(e) {
      if (e.target.tagName === "IMG") {
        e.target.style.background = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
        e.target.alt = "Image unavailable";
      }
    }, true);
  </script>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback, Fragment, createContext, useContext } = React;

    // ═══════════════════════════════════════════════════════════════════
    // HEROICONS - Complete Set
    // ═══════════════════════════════════════════════════════════════════
    
    const ChevronRightIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
    const ChevronLeftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
    const ChevronDownIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
    const ChevronUpIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
    const StarIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>;
    const HeartIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>;
    const HeartSolidIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>;
    const ShoppingBagIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    const ShoppingCartIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>;
    const Bars3Icon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
    const XMarkIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
    const SparklesIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;
    const CheckIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
    const CheckCircleIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>;
    const ArrowRightIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
    const ArrowLeftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;
    const ArrowUpRightIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>;
    const PlayIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
    const PauseIcon = (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>;
    const EnvelopeIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
    const UserIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
    const MapPinIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    const PhoneIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
    const CalendarIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
    const ClockIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    const HomeIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
    const PlusIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
    const MinusIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;
    const SunIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
    const MoonIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>;
    const GlobeAltIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
    const ShieldCheckIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    const GiftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;

    // ═══════════════════════════════════════════════════════════════════
    // FRAMER MOTION SHIM - Production-grade CSS-based animation engine
    // ═══════════════════════════════════════════════════════════════════
    
    const toCSS = (props) => {
      if (!props || typeof props !== 'object') return {};
      const css = {};
      const transforms = [];
      
      Object.entries(props).forEach(([key, val]) => {
        switch(key) {
          case 'x': transforms.push('translateX(' + (typeof val === 'number' ? val + 'px' : val) + ')'); break;
          case 'y': transforms.push('translateY(' + (typeof val === 'number' ? val + 'px' : val) + ')'); break;
          case 'scale': transforms.push('scale(' + val + ')'); break;
          case 'scaleX': transforms.push('scaleX(' + val + ')'); break;
          case 'scaleY': transforms.push('scaleY(' + val + ')'); break;
          case 'rotate': transforms.push('rotate(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'rotateX': transforms.push('rotateX(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'rotateY': transforms.push('rotateY(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'skewX': transforms.push('skewX(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'skewY': transforms.push('skewY(' + (typeof val === 'number' ? val + 'deg' : val) + ')'); break;
          case 'opacity': css.opacity = val; break;
          case 'backgroundColor': case 'background': css.backgroundColor = val; break;
          case 'color': css.color = val; break;
          case 'borderRadius': css.borderRadius = typeof val === 'number' ? val + 'px' : val; break;
          case 'boxShadow': css.boxShadow = val; break;
          case 'width': css.width = typeof val === 'number' ? val + 'px' : val; break;
          case 'height': css.height = typeof val === 'number' ? val + 'px' : val; break;
          case 'letterSpacing': css.letterSpacing = typeof val === 'number' ? val + 'px' : val; break;
          default: if (typeof val === 'number' || typeof val === 'string') css[key] = val;
        }
      });
      if (transforms.length > 0) css.transform = transforms.join(' ');
      return css;
    };

    const easingMap = {
      linear: 'linear', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out',
      backIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)', backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      backInOut: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)', anticipate: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    };

    const buildTransition = (t = {}) => {
      const duration = t.duration != null ? t.duration : 0.5;
      const delay = t.delay != null ? t.delay : 0;
      const ease = Array.isArray(t.ease) ? 'cubic-bezier(' + t.ease.join(',') + ')' : (easingMap[t.ease] || t.ease || 'ease-out');
      return 'all ' + duration + 's ' + ease + ' ' + delay + 's';
    };

    const createMotionComponent = (tag) => {
      return React.forwardRef(({ 
        initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport,
        variants, layout, layoutId, style, className, children, ...props 
      }, ref) => {
        const [phase, setPhase] = useState('initial');
        const [isHovered, setIsHovered] = useState(false);
        const [isTapped, setIsTapped] = useState(false);
        const [isInView, setIsInView] = useState(false);
        const internalRef = useRef(null);
        const combinedRef = ref || internalRef;
        const mounted = useRef(false);

        useEffect(() => {
          if (!mounted.current) {
            mounted.current = true;
            requestAnimationFrame(() => { requestAnimationFrame(() => setPhase('animate')); });
          }
        }, []);

        useEffect(() => {
          if (!whileInView) return;
          const el = combinedRef.current;
          if (!el) return;
          const opts = { threshold: (viewport && viewport.amount) || 0.3 };
          const observer = new IntersectionObserver(function(entries) {
            if (viewport && viewport.once && isInView) return;
            setIsInView(entries[0].isIntersecting);
          }, opts);
          observer.observe(el);
          return function() { observer.disconnect(); };
        }, [whileInView, viewport, isInView]);

        const computedStyles = useMemo(() => {
          let base = {};
          if (phase === 'initial' && initial) base = toCSS(initial);
          else if (phase === 'animate' && animate) Object.assign(base, toCSS(animate));
          if (whileInView && isInView) Object.assign(base, toCSS(whileInView));
          if (whileHover && isHovered) Object.assign(base, toCSS(whileHover));
          if (whileTap && isTapped) Object.assign(base, toCSS(whileTap));
          return base;
        }, [phase, initial, animate, whileHover, whileTap, whileInView, isHovered, isTapped, isInView]);

        const finalStyle = Object.assign({}, style || {}, { transition: buildTransition(transition), willChange: 'transform, opacity' }, computedStyles);
        const handlers = {};
        if (whileHover) {
          handlers.onMouseEnter = function(e) { setIsHovered(true); if (props.onMouseEnter) props.onMouseEnter(e); };
          handlers.onMouseLeave = function(e) { setIsHovered(false); setIsTapped(false); if (props.onMouseLeave) props.onMouseLeave(e); };
        }
        if (whileTap) {
          handlers.onMouseDown = function(e) { setIsTapped(true); if (props.onMouseDown) props.onMouseDown(e); };
          handlers.onMouseUp = function(e) { setIsTapped(false); if (props.onMouseUp) props.onMouseUp(e); };
        }
        return React.createElement(tag, Object.assign({ ref: combinedRef, style: finalStyle, className: className || '' }, props, handlers), children);
      });
    };

    const motionCache = {};
    const motion = new Proxy({}, { get: function(_, tag) { if (!motionCache[tag]) motionCache[tag] = createMotionComponent(tag); return motionCache[tag]; } });
    const AnimatePresence = function(props) { return props.children; };
    const useAnimation = function() { return { start: function() { return Promise.resolve(); }, stop: function() {}, set: function() {} }; };
    const useInView = function(ref, options) { const [inView, setInView] = useState(false); useEffect(function() { const el = ref && ref.current; if (!el) return; const observer = new IntersectionObserver(function(entries) { setInView(entries[0].isIntersecting); }, { threshold: 0.5 }); observer.observe(el); return function() { observer.disconnect(); }; }, [ref]); return inView; };
    const useScroll = function() { return { scrollY: { get: function() { return 0; }, current: 0 }, scrollYProgress: { get: function() { return 0; }, current: 0 } }; };
    const useTransform = function(v, i, o) { return o ? o[0] : 0; };
    const useSpring = function(v) { return v; };
    const useMotionValue = function(initial) { return { get: function() { return initial; }, set: function() {}, current: initial }; };

    // ═══════════════════════════════════════════════════════════════════
    // USER COMPONENT
    // ═══════════════════════════════════════════════════════════════════

    ${cleanCode}

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${componentName}));
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding:48px;color:#ef4444;font-family:system-ui;background:#fef2f2;min-height:100vh;"><h2 style="margin-bottom:12px;font-weight:600;">Render Error</h2><pre style="white-space:pre-wrap;opacity:0.8;font-size:13px;font-family:monospace;">' + err.message + '</pre></div>';
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
  artifactId?: string;
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
        .alfred-gallery-root{position:fixed!important;inset:0!important;z-index:99999!important;background:#000!important;display:flex!important;flex-direction:column!important;touch-action:none!important;-webkit-touch-callout:none!important;overscroll-behavior:none!important}
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
        .alfred-gallery-preview{flex:1!important;position:relative!important;background:#000!important;min-height:0!important;height:100%!important;touch-action:none!important}
        .alfred-gallery-iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:none!important;background:#000!important;opacity:0!important;transition:opacity 0.3s ease!important;touch-action:none!important}
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
// TEXT FORMATTING - Clean markdown, elegant typography
// ═══════════════════════════════════════════════════════════════════════════════

function formatText(text: string): React.ReactNode[] {
  // Clean up excessive markdown artifacts
  let cleaned = text
    .replace(/^[-─━]{3,}$/gm, '') // Remove horizontal rules (---, ───, ━━━)
    .replace(/^\*{3,}$/gm, '')    // Remove *** dividers
    .replace(/^#{1,6}\s*/gm, '')  // Remove heading markers (keep text)
    .replace(/\n{3,}/g, '\n\n')   // Collapse multiple newlines
    .trim();

  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split into paragraphs
  const paragraphs = cleaned.split(/\n\n+/);

  paragraphs.forEach((para, pIndex) => {
    if (!para.trim()) return;

    // Process inline formatting
    const lines = para.split('\n');
    const lineElements: React.ReactNode[] = [];

    lines.forEach((line, lIndex) => {
      if (!line.trim()) return;

      // Check for bullet points
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

      // Check for numbered lists
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

      // Regular line
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
  
  // Regex to match **bold**, *italic*, `code`, and regular text
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let partKey = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(<span key={`${keyPrefix}-${partKey++}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    if (match[2]) {
      // Bold **text** - slightly bolder, inherit color
      elements.push(
        <span key={`${keyPrefix}-${partKey++}`} style={{ fontWeight: 600 }}>
          {match[2]}
        </span>
      );
    } else if (match[3]) {
      // Italic *text* - inherit color
      elements.push(
        <span key={`${keyPrefix}-${partKey++}`} style={{ fontStyle: 'italic', opacity: 0.9 }}>
          {match[3]}
        </span>
      );
    } else if (match[4]) {
      // Inline code `text` - theme-aware background
      elements.push(
        <code key={`${keyPrefix}-${partKey++}`} style={{ 
          fontFamily: "'SF Mono', 'Fira Code', monospace",
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

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(<span key={`${keyPrefix}-${partKey++}`}>{text.slice(lastIndex)}</span>);
  }

  return elements.length > 0 ? elements : [<span key={`${keyPrefix}-0`}>{text}</span>];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Message({ id, role, content, timestamp, isStreaming = false }: MessageProps) {
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
        // Elegant typography
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: '15px', 
        lineHeight: 1.75,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        // Theme-aware colors using CSS variables with fallbacks
        color: role === 'user' 
          ? 'var(--text-primary, var(--foreground, inherit))' 
          : 'var(--text-secondary, var(--foreground, inherit))',
        fontFeatureSettings: '"cv01", "cv02", "cv03", "cv04"',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        {parsedContent.map((part, index) => {
          if (part.type === 'code' || part.type === 'code-streaming') {
            return <CodeBlock key={index} language={part.language || 'plaintext'} code={part.content} isStreaming={part.type === 'code-streaming'} onPreview={part.type === 'code' ? () => handlePreview(index) : undefined} />;
          }
          // Use elegant text formatting
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