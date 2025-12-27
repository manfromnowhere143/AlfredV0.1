'use client';

import { useState, useMemo, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';

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

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100%; }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
    body { 
      min-height: 100vh;
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root { min-height: 100vh; }
    
    /* Smooth scrolling */
    html { scroll-behavior: smooth; }
    
    /* Beautiful scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
    
    /* Ensure images are responsive */
    img { max-width: 100%; height: auto; }
    
    /* Animation utilities */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
    .animate-slideUp { animation: slideUp 0.5s ease-out; }
    .animate-slideDown { animation: slideDown 0.5s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
  </style>
</head>
<body>
  <div id="root"></div>
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
    const UserCircleIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    const BellIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
    const MagnifyingGlassIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
    const MapPinIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    const PhoneIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
    const CalendarIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
    const ClockIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    const CogIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    const HomeIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
    const PlusIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
    const MinusIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;
    const TrashIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
    const ShareIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>;
    const GlobeAltIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
    const PhotoIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    const VideoCameraIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>;
    const SunIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
    const MoonIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>;
    const AdjustmentsHorizontalIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
    const Squares2X2Icon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
    const ListBulletIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    const InformationCircleIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
    const ExclamationCircleIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>;
    const BookmarkIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>;
    const FireIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>;
    const BoltIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
    const ChatBubbleLeftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>;
    const WifiIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>;
    const CreditCardIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>;
    const TruckIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>;
    const ShieldCheckIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    const LockClosedIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
    const GiftIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;

    // ═══════════════════════════════════════════════════════════════════
    // FRAMER MOTION SHIM - Seamless fallback
    // ═══════════════════════════════════════════════════════════════════
    
    const motion = new Proxy({}, {
      get: (_, tag) => React.forwardRef(({ 
        initial, animate, exit, transition, whileHover, whileTap, whileInView, 
        viewport, variants, layout, layoutId, ...props 
      }, ref) => React.createElement(tag, { ...props, ref }))
    });
    const AnimatePresence = ({ children, mode }) => children;
    const useAnimation = () => ({ start: () => {}, set: () => {} });
    const useInView = () => [null, true];
    const useScroll = () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } });
    const useTransform = (v, i, o) => o?.[0] || 0;
    const useSpring = (v) => v;
    const useMotionValue = (v) => ({ get: () => v, set: () => {} });

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
      document.getElementById('root').innerHTML = \`
        <div style="padding:48px;color:#ef4444;font-family:system-ui;background:#fef2f2;min-height:100vh;">
          <h2 style="margin-bottom:12px;font-weight:600;">Render Error</h2>
          <pre style="white-space:pre-wrap;opacity:0.8;font-size:13px;font-family:monospace;">\${err.message}</pre>
        </div>
      \`;
    }
  <\/script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE BLOCK - FIXED 322px HEIGHT - FULL WIDTH
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

  // USE INLINE STYLES - most reliable way to ensure dimensions
  return (
    <div style={{
      width: '100%',
      minWidth: '300px',
      maxWidth: '800px',
      height: '322px',
      minHeight: '322px',
      maxHeight: '322px',
      margin: '12px 0',
      borderRadius: '10px',
      background: '#111',
      border: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: '42px',
        minHeight: '42px',
        maxHeight: '42px',
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

      {/* Body */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '280px',
        minHeight: '280px',
        maxHeight: '280px',
        overflow: 'hidden',
      }}>
        <div
          ref={scrollRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'auto',
            padding: '14px 0',
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{
              display: 'flex',
              padding: '1px 14px',
              minHeight: '20px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '12px',
              lineHeight: '20px',
            }}>
              <span style={{
                width: '32px',
                minWidth: '32px',
                flexShrink: 0,
                color: '#444',
                textAlign: 'right',
                paddingRight: '14px',
                userSelect: 'none',
              }}>{i + 1}</span>
              <span style={{ color: '#e0e0e0', whiteSpace: 'pre' }}>{line || ' '}</span>
            </div>
          ))}
          {isStreaming && (
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '14px',
              background: '#C9B99A',
              marginLeft: '46px',
              animation: 'alfredBlink 0.8s step-end infinite',
            }} />
          )}
        </div>
      </div>
      <style>{`@keyframes alfredBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT GALLERY - z-index:99999
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
              <iframe
                ref={iframeRef}
                srcDoc={previewHTML}
                sandbox="allow-scripts allow-same-origin"
                title="Preview"
                onLoad={() => setIsLoaded(true)}
                className={`alfred-gallery-iframe ${isLoaded ? 'loaded' : ''}`}
              />
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
        .alfred-gallery-root{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;z-index:99999!important;background:#000!important;display:flex!important;flex-direction:column!important}
        .alfred-gallery-wrap{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important}
        .alfred-gallery-head{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:12px 16px!important;border-bottom:1px solid rgba(255,255,255,0.1)!important;flex-shrink:0!important;background:#000!important}
        .alfred-gallery-headleft{display:flex!important;align-items:center!important;gap:8px!important}
        .alfred-gallery-headright{display:flex!important;align-items:center!important;gap:8px!important}
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
        .alfred-gallery-iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:none!important;background:#000!important;opacity:0!important;transition:opacity 0.3s ease!important}
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
        @media(max-width:767px){.alfred-gallery-head{padding:10px 12px!important}.alfred-gallery-navbtn,.alfred-gallery-iconbtn{width:28px!important;height:28px!important}.alfred-gallery-title{font-size:12px!important;margin-left:8px!important}.alfred-gallery-thumbs{display:none!important}.alfred-gallery-preview{width:100%!important}}
      `}</style>
    </>
  );
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: role === 'user' ? 'flex-end' : 'flex-start',
      width: '100%',
    }}>
      <div style={{ 
        width: role === 'user' ? 'auto' : '100%',
        maxWidth: role === 'user' ? '80%' : '100%',
        fontSize: 15, 
        lineHeight: 1.7, 
        color: 'var(--text-primary, #fff)' 
      }}>
        {parsedContent.map((part, index) => {
          if (part.type === 'code' || part.type === 'code-streaming') {
            return (
              <CodeBlock
                key={index}
                language={part.language || 'plaintext'}
                code={part.content}
                isStreaming={part.type === 'code-streaming'}
                onPreview={part.type === 'code' ? () => handlePreview(index) : undefined}
              />
            );
          }
          return <p key={index} style={{ margin: 0, padding: '3px 0' }}>{part.content}</p>;
        })}
        {isStreaming && parsedContent.every(p => p.type === 'text') && (
          <span style={{ display: 'inline-block', width: 2, height: 16, background: '#fff', marginLeft: 2, animation: 'alfredBlink 0.8s step-end infinite', verticalAlign: 'text-bottom' }} />
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
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#666',
          animation: `alfredDot 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
      <style>{`@keyframes alfredDot{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}