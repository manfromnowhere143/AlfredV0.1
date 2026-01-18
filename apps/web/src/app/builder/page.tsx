'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALFRED PRO BUILDER — STATE OF THE ART
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Steve Jobs level browser IDE with:
 * • Minimizable chat panel with smooth transitions
 * • Voice recording with real-time orb visualizer
 * • AI prompt enhancement
 * • No generic emojis - elegant SVG iconography
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { useSession, signIn } from 'next-auth/react';
import { useBuilder } from '@/hooks/useBuilder';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FileExplorer, BuilderPreview, StreamingCodeDisplay, ProjectsSidebar } from '@/components/builder';
import LimitReached from '@/components/LimitReached';
import { BuilderDeploymentCard } from '@/components/BuilderDeploymentCard';
import MessageAttachments from '@/components/MessageAttachments';
import { ModificationPreview, ForensicInvestigation, SaveBar, ExportToClaudeCode, createForensicReport, WelcomePanel, ModificationProgress, ProgressSteps, createProgressStep, markStepDone } from '@/components/alfred-code';
import type { ForensicReport, ProgressStep } from '@/components/alfred-code';
import type { ModificationPlan } from '@/lib/alfred-code/modify-project';
import { isModificationRequest, applyModifications } from '@/lib/alfred-code/modify-project';
import type { VirtualFile, StreamingEvent } from '@alfred/core';
import type { FileAttachment } from '@/lib/types';

const MonacoEditor = nextDynamic(
  () => import('@/components/builder/MonacoEditor').then(mod => mod.MonacoEditor),
  { ssr: false, loading: () => <div className="editor-loading"><div className="loading-pulse" /></div> }
);

const MobileBuilderLayout = nextDynamic(
  () => import('@/components/builder/MobileBuilderLayout'),
  { ssr: false, loading: () => <div className="elegant-loader"><div className="loader-content"><div className="loader-wordmark">Alfred</div><div className="loader-bar"><div className="loader-bar-fill" /></div></div><style jsx>{`.elegant-loader{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#ffffff}.loader-content{display:flex;flex-direction:column;align-items:center;gap:24px}.loader-wordmark{font-size:24px;font-weight:600;color:#1a1a1a;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif}.loader-bar{width:120px;height:2px;background:rgba(0,0,0,0.06);border-radius:1px;overflow:hidden}.loader-bar-fill{width:40%;height:100%;background:linear-gradient(90deg,rgba(0,0,0,0.08),rgba(0,0,0,0.4),rgba(0,0,0,0.08));border-radius:1px;animation:slide 1.8s ease-in-out infinite}@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style></div> }
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatMessage {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  files?: FileAttachment[];
}

interface StreamingStep {
  id: string;
  type: 'project' | 'file' | 'dependency' | 'complete';
  name: string;
  status: 'active' | 'done';
}

type ViewMode = 'editor' | 'preview' | 'split';

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS — Elegant SVG iconography (no generic emojis)
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  folder: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  file: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  package: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  mic: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><path d="M12 19v4M8 23h8"/></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  sparkle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2L10.5 5L13.5 6L10.5 7L9.5 10L8.5 7L5.5 6L8.5 5L9.5 2Z"/><path d="M19 8L20 10L22 11L20 12L19 14L18 12L16 11L18 10L19 8Z"/><path d="M14.5 14L15.5 17L18.5 18L15.5 19L14.5 22L13.5 19L10.5 18L13.5 17L14.5 14Z"/></svg>,
  todo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  calc: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></svg>,
  rocket: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  weather: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 116.71-9h1.79a4.5 4.5 0 110 9z"/></svg>,
  stop: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  layers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  loading: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 019.5 13" strokeLinecap="round"/></svg>,
  // File upload icons
  image: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  video: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  paperclip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  document: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING STEPS — Elegant build progress
// ═══════════════════════════════════════════════════════════════════════════════

function StreamingSteps({ steps, isActive }: { steps: StreamingStep[]; isActive: boolean }) {
  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="streaming-steps">
      <div className="steps-header">
        <div className="steps-indicator">
          {isActive && <div className="pulse-ring" />}
          <div className={`indicator-dot ${isActive ? 'active' : 'done'}`} />
        </div>
        <span className="steps-label">{isActive ? 'Building...' : 'Complete'}</span>
      </div>
      <div className="steps-list">
        {steps.map((step, i) => (
          <div key={step.id} className={`step-item ${step.status}`} style={{ animationDelay: `${i * 40}ms` }}>
            <span className="step-icon">
              {step.type === 'project' && Icons.folder}
              {step.type === 'file' && Icons.file}
              {step.type === 'dependency' && Icons.package}
              {step.type === 'complete' && Icons.check}
            </span>
            <span className="step-name">{step.name}</span>
            {step.status === 'active' && <div className="step-spinner" />}
          </div>
        ))}
      </div>
      <style jsx>{`
        .streaming-steps { background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 12px; padding: 12px 14px; margin: 8px 0; }
        .steps-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .steps-indicator { position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; }
        .pulse-ring { position: absolute; inset: -3px; border-radius: 50%; border: 2px solid rgba(139, 92, 246, 0.4); animation: pulse-ring 1.5s ease-out infinite; }
        .indicator-dot { width: 6px; height: 6px; border-radius: 50%; }
        .indicator-dot.active { background: #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.6); }
        .indicator-dot.done { background: #22c55e; }
        .steps-label { font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.8); }
        .steps-list { display: flex; flex-direction: column; gap: 4px; }
        .step-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; animation: fadeIn 0.25s ease forwards; opacity: 0; }
        .step-item.done { opacity: 0.6; }
        .step-icon { color: #8b5cf6; opacity: 0.7; display: flex; }
        .step-name { flex: 1; font-size: 10px; font-family: "SF Mono", Monaco, monospace; color: rgba(255, 255, 255, 0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .step-spinner { width: 10px; height: 10px; border: 1.5px solid rgba(139, 92, 246, 0.3); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

function ChatMessage({ message, streamingSteps }: { message: ChatMessage; streamingSteps?: StreamingStep[] }) {
  // Debug: Log files being passed
  if (message.files && message.files.length > 0) {
    console.log('[ChatMessage] Rendering with files:', message.files.map(f => ({ id: f.id, name: f.name, category: f.category, url: f.url, preview: !!f.preview })));
  }

  return (
    <div className={`chat-message ${message.role}`}>
      <div className="message-avatar">
        {message.role === 'user' ? 'Y' : Icons.layers}
      </div>
      <div className="message-body">
        <div className="message-header">
          <span className="message-role">{message.role === 'user' ? 'You' : 'Alfred'}</span>
          <span className="message-time">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {/* Show files for user messages using MessageAttachments component */}
        {message.files && message.files.length > 0 && (
          <MessageAttachments
            attachments={message.files.map(file => ({
              id: file.id,
              type: file.category as 'image' | 'video' | 'document' | 'code',
              name: file.name,
              size: file.size,
              url: file.url,
              preview: file.preview,
              duration: file.duration,
            }))}
            isUser={message.role === 'user'}
          />
        )}
        {message.isStreaming ? (
          <>
            <StreamingSteps steps={streamingSteps || []} isActive={true} />
            <div className="typing"><span /><span /><span /></div>
          </>
        ) : (
          <div className="message-content">{message.content}</div>
        )}
      </div>
      <style jsx>{`
        .chat-message { display: flex; gap: 10px; padding: 14px 0; animation: slideIn 0.25s ease; }
        .chat-message + .chat-message { border-top: 1px solid var(--border, rgba(255, 255, 255, 0.04)); }
        .message-avatar { width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 11px; font-weight: 600; }
        .chat-message.user .message-avatar { background: var(--surface-hover, rgba(255, 255, 255, 0.08)); color: var(--text-secondary, rgba(255, 255, 255, 0.6)); }
        .chat-message.alfred .message-avatar { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .message-body { flex: 1; min-width: 0; }
        .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
        .message-role { font-size: 12px; font-weight: 600; color: var(--text, rgba(255, 255, 255, 0.9)); }
        .message-time { font-size: 9px; color: var(--text-muted, rgba(255, 255, 255, 0.3)); }
        .message-content { font-size: 13px; line-height: 1.6; color: var(--text-secondary, rgba(255, 255, 255, 0.8)); }
        .typing { display: flex; gap: 3px; padding: 6px 0; }
        .typing span { width: 6px; height: 6px; background: #8b5cf6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
        .typing span:nth-child(1) { animation-delay: -0.32s; }
        .typing span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

function ViewToggle({ mode, onModeChange }: { mode: ViewMode; onModeChange: (m: ViewMode) => void }) {
  return (
    <div className="view-toggle">
      {(['editor', 'split', 'preview'] as const).map(m => (
        <button key={m} className={mode === m ? 'active' : ''} onClick={() => onModeChange(m)}>
          {m === 'editor' ? 'Code' : m === 'split' ? 'Split' : 'Preview'}
        </button>
      ))}
      <style jsx>{`
        .view-toggle { display: flex; padding: 3px; gap: 2px; background: var(--surface, rgba(255,255,255,0.03)); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 8px; }
        button { padding: 5px 12px; background: transparent; border: none; border-radius: 6px; color: var(--text-secondary, rgba(255,255,255,0.5)); font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        button:hover { color: var(--text, rgba(255,255,255,0.8)); }
        button.active { color: var(--text, white); background: rgba(139, 92, 246, 0.2); }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILDER PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const { isMobile } = useDeviceType();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false); // Prevents double-click race conditions
  const [streamingSteps, setStreamingSteps] = useState<StreamingStep[]>([]);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [limitReached, setLimitReached] = useState<{ type: 'daily' | 'monthly'; resetIn?: number } | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Prompt enhancer state
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedText, setEnhancedText] = useState('');
  const [originalText, setOriginalText] = useState('');

  // Streaming code display state
  const [streamingFile, setStreamingFile] = useState<string | null>(null);
  const [streamingCode, setStreamingCode] = useState('');

  // Projects sidebar state
  const [showProjects, setShowProjects] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deploy modal state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  // Theme System - State of the Art
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themes = [
    { id: 'dark', bg: '#0a0a0c', label: 'Dark', mode: 'dark' as const },
    { id: 'darker', bg: '#050506', label: 'Darker', mode: 'dark' as const },
    { id: 'purple', bg: '#1a1025', label: 'Purple', mode: 'dark' as const },
    { id: 'blue', bg: '#0a1628', label: 'Blue', mode: 'dark' as const },
    { id: 'light', bg: '#f5f5f7', label: 'Light', mode: 'light' as const },
    { id: 'white', bg: '#ffffff', label: 'White', mode: 'light' as const },
  ];
  const [currentTheme, setCurrentTheme] = useState(themes[5]);

  // Computed theme values
  const isLightTheme = currentTheme.mode === 'light';
  const themeVars = {
    '--bg': currentTheme.bg,
    '--text': isLightTheme ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    '--text-secondary': isLightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
    '--text-muted': isLightTheme ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
    '--border': isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
    '--border-light': isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
    '--surface': isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
    '--surface-hover': isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    '--icon': isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
  } as React.CSSProperties;

  // Alfred Code - Smart Modification Mode (Steve Jobs approach)
  const [modificationPlan, setModificationPlan] = useState<ModificationPlan | null>(null);
  const [forensicReport, setForensicReport] = useState<ForensicReport | null>(null);
  const [isAnalyzingModification, setIsAnalyzingModification] = useState(false);
  const [isApplyingModification, setIsApplyingModification] = useState(false);
  const [pendingModificationMessage, setPendingModificationMessage] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<string[]>([]); // Files with unsaved changes
  const [modificationSteps, setModificationSteps] = useState<ProgressStep[]>([]); // Real-time progress steps

  // Refs
  const conversationId = useRef<string | null>(null);

  // File upload hook (same as regular Alfred)
  const fileUpload = useFileUpload({ maxFiles: 10 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number>(0);
  const isRecordingRef = useRef(false);

  // Stream event handler - MUST be wrapped in useCallback to prevent manager recreation
  const handleStreamEvent = useCallback((event: StreamingEvent) => {
    if (event.type === 'project_start') {
      const projectName = (event as any).projectName;
      if (projectName && typeof projectName === 'string') {
        setStreamingSteps(prev => {
          // Avoid duplicate project entries
          if (prev.some(s => s.type === 'project')) return prev;
          return [...prev, { id: `p-${Date.now()}`, type: 'project', name: `Creating ${projectName}`, status: 'done' }];
        });
      }
      setStreamingCode('');
      setStreamingFile(null);
    } else if (event.type === 'file_start') {
      const path = (event as any).path;
      // Validate path
      if (!path || typeof path !== 'string' || path.length < 2 || !path.startsWith('/')) {
        return;
      }
      setStreamingSteps(prev => {
        // Avoid duplicate file entries
        if (prev.some(s => s.type === 'file' && s.name === path)) return prev;
        const updated = prev.map(s => s.type === 'file' && s.status === 'active' ? { ...s, status: 'done' as const } : s);
        return [...updated, { id: `f-${Date.now()}`, type: 'file', name: path, status: 'active' }];
      });
      // Start showing this file's code
      setStreamingFile(path);
      setStreamingCode('');
    } else if (event.type === 'file_content') {
      // Append code chunk
      const chunk = (event as any).chunk;
      if (chunk && typeof chunk === 'string') {
        setStreamingCode(prev => prev + chunk);
      }
    } else if (event.type === 'file_end') {
      setStreamingSteps(prev => prev.map(s => s.type === 'file' && s.status === 'active' ? { ...s, status: 'done' as const } : s));
    } else if (event.type === 'dependency') {
      const name = (event as any).name;
      const version = (event as any).version;
      // Validate dependency
      if (!name || !version || typeof name !== 'string' || typeof version !== 'string') {
        return;
      }
      const depKey = `${name}@${version}`;
      setStreamingSteps(prev => {
        // Avoid duplicate dependencies
        if (prev.some(s => s.type === 'dependency' && s.name === depKey)) return prev;
        return [...prev, { id: `d-${Date.now()}`, type: 'dependency', name: depKey, status: 'done' }];
      });
    } else if (event.type === 'project_end') {
      setStreamingSteps(prev => {
        // Avoid duplicate complete entries
        if (prev.some(s => s.type === 'complete')) return prev;
        return [...prev, { id: `c-${Date.now()}`, type: 'complete', name: 'Build complete', status: 'done' }];
      });
      // Clear streaming state
      setStreamingFile(null);
      setStreamingCode('');
    }
  }, []);

  // Builder hook - onStreamEvent is now stable
  const builder = useBuilder({
    projectName: 'New Project',
    onStreamEvent: handleStreamEvent,
  });

  // DEBUG: Log state changes
  useEffect(() => {
    console.log('[Builder Page] 🔍 State:', {
      isStreaming,
      'builder.isBuilding': builder.isBuilding,
      'builder.files.length': builder.files.length,
      'builder.selectedFile': builder.selectedFile?.path || 'none',
      'builder.previewResult': builder.previewResult ? `success:${builder.previewResult.success}, html:${builder.previewResult.html?.length || 0}` : 'null',
    });
  }, [isStreaming, builder.isBuilding, builder.files.length, builder.selectedFile, builder.previewResult]);

  // SAFETY: Force reset stuck states after stream completes
  // If we have files but isBuilding is stuck true for too long, force reset
  // ESBuild now has 20s init timeout + 25s transform timeout = 45s max
  // useBuilder has 35s hard timeout, so 45s safety timeout should be plenty
  useEffect(() => {
    if (builder.files.length > 0 && (isStreaming || builder.isBuilding)) {
      const timeout = setTimeout(() => {
        console.warn('[Builder Page] ⚠️ SAFETY TIMEOUT: Forcing state reset after 45s');
        setIsStreaming(false);
        // Don't try to rebuild here - the hard timeout in useBuilder will handle it
        // This just resets the streaming state
      }, 45000);
      return () => clearTimeout(timeout);
    }
  }, [builder.files.length, isStreaming, builder.isBuilding]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingSteps]);

  // Auto-expand textarea as user types (iMessage/Slack pattern)
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges.length]);

  // Handlers
  const handleFileSelect = useCallback((file: VirtualFile) => {
    builder.selectFile(file.path);
    if (viewMode === 'preview') setViewMode('split');
  }, [builder, viewMode]);

  const handleEditorChange = useCallback((content: string) => {
    if (builder.selectedFile) builder.updateFile(builder.selectedFile.path, content);
  }, [builder]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROJECT SAVE/LOAD
  // ═══════════════════════════════════════════════════════════════════════════════

  const saveProject = useCallback(async () => {
    // CRITICAL: Sync files from manager before checking length
    const syncedFiles = builder.syncFiles?.() || builder.files;
    console.log('[Builder:Save] Synced files count:', syncedFiles.length);

    if (syncedFiles.length === 0) {
      alert('No files to save. Create some code first!');
      return;
    }

    setIsSaving(true);
    try {
      const projectMeta = builder.manager?.getProjectMeta?.() || {
        name: builder.projectName,
        framework: 'react' as const,
        description: undefined,
        dependencies: {},
        devDependencies: {},
      };

      // Use synced files, not potentially stale builder.files
      const files = syncedFiles.map(f => ({
        path: f.path,
        name: f.name || f.path.split('/').pop() || 'unknown',
        content: f.content || '',
        language: f.language || 'typescript',
        fileType: f.fileType || 'component',
        isEntryPoint: f.isEntryPoint || false,
        generatedBy: f.generatedBy || 'llm',
      }));

      // Ensure we have a valid project name
      const projectName = projectMeta.name || builder.projectName || 'Untitled Project';

      const payload = {
        name: projectName,
        description: projectMeta.description || '',
        framework: projectMeta.framework || 'react',
        dependencies: projectMeta.dependencies || {},
        devDependencies: projectMeta.devDependencies || {},
        files,
        deployedUrl: deployedUrl || undefined,
      };

      const payloadSize = JSON.stringify(payload).length;
      console.log('[Builder:Save] Saving payload:', {
        name: payload.name,
        fileCount: files.length,
        totalSize: files.reduce((s, f) => s + (f.content?.length || 0), 0),
        payloadSize: `${(payloadSize / 1024).toFixed(1)} KB`,
        firstFile: files[0]?.path,
      });

      // Add timeout for slow connections (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let res: Response;
      try {
        res = await fetch('/api/builder/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        const errorName = (fetchError as Error).name;
        if (errorName === 'AbortError') {
          throw new Error('Save timed out. Please try again.');
        }
        // Network error - provide helpful message
        console.error('[Builder:Save] Network error:', fetchError);
        throw new Error(`Network error - check your connection (payload: ${(payloadSize / 1024).toFixed(0)}KB)`);
      }
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        console.error('[Builder:Save] API Error:', res.status, data);
        throw new Error(data.error || `Failed to save (${res.status})`);
      }

      setCurrentProjectId(data.project.id);
      console.log('[Builder:Save] Project saved successfully:', data.project.id);

      // Show success feedback (brief toast-style)
      const toast = document.createElement('div');
      toast.innerHTML = `<div style="position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;z-index:9999;animation:fadeIn 0.2s">Project saved successfully!</div>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (error) {
      console.error('[Builder:Save] Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save';
      alert(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [builder]);

  const loadProject = useCallback(async (projectId: string) => {
    // Instant feedback - set loading state immediately
    setLoadingProjectId(projectId);

    try {
      const res = await fetch(`/api/builder/projects/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to load project');
      }

      const data = await res.json();
      const { project, files } = data;

      // Reset builder and load files
      builder.reset();

      // Use manager to load files
      if (builder.manager) {
        for (const file of files) {
          builder.manager.createFile(file.path, file.content);
        }
        builder.manager.setProjectName(project.name);
        if (project.framework) {
          builder.manager.setProjectFramework(project.framework);
        }
      }

      // Sync to React state and capture synced files
      const syncedFiles = builder.syncFiles?.() || [];
      setCurrentProjectId(projectId);
      setShowProjects(false);

      // Load deployed URL if available
      if (project.deployedUrl) {
        setDeployedUrl(project.deployedUrl);
      } else {
        setDeployedUrl(null);
      }

      // Select first file
      if (files.length > 0) {
        builder.selectFile(files[0].path);
      }

      // Trigger rebuild - PASS FILES DIRECTLY
      console.log('[Builder] Triggering rebuild with', syncedFiles.length, 'synced files');
      await builder.rebuild?.(syncedFiles);

      console.log('[Builder] Project loaded:', projectId, files.length, 'files');
    } catch (error) {
      console.error('[Builder] Load failed:', error);
      alert('Failed to load project. Please try again.');
    } finally {
      setLoadingProjectId(null);
    }
  }, [builder]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEPLOY FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════════

  // Generate artifact code from all project files for deployment
  const generateArtifactCode = useCallback(() => {
    const syncedFiles = builder.syncFiles?.() || builder.files;
    if (syncedFiles.length === 0) return '';

    // Find the main app file (App.tsx, App.jsx, or main entry)
    const appFile = syncedFiles.find(f =>
      f.path.includes('App.tsx') ||
      f.path.includes('App.jsx') ||
      f.path.includes('App.ts') ||
      f.path.includes('App.js')
    );

    // If we have an App file, use it as the main artifact code
    // Otherwise, combine all component files
    if (appFile) {
      // For complex projects, we include all code as a multi-file artifact
      // Format: Each file is wrapped with a comment header
      const allCode = syncedFiles
        .filter(f => f.path.match(/\.(tsx?|jsx?|css)$/))
        .sort((a, b) => {
          // Order: CSS first, then utils/lib, then components, then App, then main
          const order = (p: string) => {
            if (p.includes('.css')) return 0;
            if (p.includes('lib/') || p.includes('utils/') || p.includes('hooks/')) return 1;
            if (p.includes('components/')) return 2;
            if (p.includes('context/') || p.includes('store/')) return 3;
            if (p.includes('App.')) return 4;
            if (p.includes('main.') || p.includes('index.')) return 5;
            return 3;
          };
          return order(a.path) - order(b.path);
        })
        .map(f => `// FILE: ${f.path}\n${f.content}`)
        .join('\n\n// ═══════════════════════════════════════════════════════════════\n\n');

      return allCode;
    }

    // Fallback: return first tsx/jsx file
    const firstComponent = syncedFiles.find(f => f.path.match(/\.(tsx|jsx)$/));
    return firstComponent?.content || '';
  }, [builder]);

  // State for files to deploy (synced when deploy modal opens)
  const [filesToDeploy, setFilesToDeploy] = useState<Array<{ path: string; content: string }>>([]);

  // Handle deploy button click
  const handleDeploy = useCallback(() => {
    const syncedFiles = builder.syncFiles?.() || builder.files;
    if (syncedFiles.length === 0) {
      alert('No files to deploy. Create some code first!');
      return;
    }
    // Store files for direct deployment (preserves exact structure)
    setFilesToDeploy(syncedFiles.map(f => ({
      path: f.path.startsWith('/') ? f.path.slice(1) : f.path,
      content: f.content,
    })));
    setShowDeployModal(true);
  }, [builder]);

  // Handle deployment complete
  const handleDeployed = useCallback((url: string) => {
    setDeployedUrl(url);
    setShowDeployModal(false);

    // Show success toast
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;padding:16px 24px;border-radius:12px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 8px 32px rgba(139,92,246,0.4);animation:fadeIn 0.3s;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
            <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>
          </svg>
          <span>Deployed successfully!</span>
        </div>
        <a href="${url}" target="_blank" style="color:rgba(255,255,255,0.9);font-size:12px;text-decoration:underline;">${url}</a>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);

    console.log('[Builder:Deploy] Deployed to:', url);
  }, []);

  // File handling uses useFileUpload hook (same as regular Alfred)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      fileUpload.addFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  }, [fileUpload]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE RECORDING
  // ═══════════════════════════════════════════════════════════════════════════════

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const bands = 20;
    const bandSize = Math.floor(dataArray.length / bands);
    const newLevels: number[] = [];
    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) sum += dataArray[i * bandSize + j];
      newLevels.push(Math.pow((sum / bandSize) / 255, 0.65));
    }
    setAudioLevels(prev => prev.map((p, i) => p * 0.08 + newLevels[i] * 0.92));
    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      source.connect(analyserRef.current);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(500);
      requestAnimationFrame(analyzeAudio);
    } catch (e) {
      console.error('Recording failed:', e);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      await new Promise<void>(r => { mediaRecorderRef.current!.onstop = () => r(); mediaRecorderRef.current!.stop(); });
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current?.state !== 'closed') await audioContextRef.current?.close();
    setAudioLevels(new Array(20).fill(0));
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await transcribeAudio(blob);
    }
  };

  const cancelRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    audioChunksRef.current = [];
    cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    setAudioLevels(new Array(20).fill(0));
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        setOriginalText(data.text);
        setInputValue(data.text);
        await enhancePrompt(data.text);
      }
    } catch (e) { console.error('Transcription failed:', e); }
    finally { setIsTranscribing(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROMPT ENHANCEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  const enhancePrompt = async (text: string) => {
    setShowEnhancer(true);
    setIsEnhancing(true);
    setOriginalText(text);
    setEnhancedText('');
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode: 'enhance' }),
      });
      const data = await res.json();
      setEnhancedText(data.enhanced || text);
    } catch { setEnhancedText(text); }
    finally { setIsEnhancing(false); }
  };

  const useEnhanced = () => { setInputValue(enhancedText || originalText); setShowEnhancer(false); inputRef.current?.focus(); };
  const useOriginal = () => { setInputValue(originalText); setShowEnhancer(false); inputRef.current?.focus(); };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ALFRED CODE - SMART MODIFICATION HANDLERS (Steve Jobs Approach)
  // ═══════════════════════════════════════════════════════════════════════════════

  const analyzeModification = useCallback(async (userRequest: string, attachments: FileAttachment[] = []) => {
    // CRITICAL: Use manager.getFiles() instead of builder.files (React state can be stale!)
    const currentFiles = builder.manager?.getFiles?.() || builder.files;
    if (currentFiles.length === 0) {
      console.log('[Alfred Code] No files found for modification analysis');
      return null;
    }

    setIsAnalyzingModification(true);
    setPendingModificationMessage(userRequest);

    // Start progress tracking - State of the Art UX
    setModificationSteps([]);
    const analyzeStep = ProgressSteps.analyzing(userRequest);
    setModificationSteps([analyzeStep]);

    try {
      // Convert builder files to ProjectFile format - use currentFiles from manager
      const projectFiles = currentFiles.map(f => ({
        path: f.path,
        content: f.content,
        language: f.language,
      }));

      // Add scanning step
      const scanStep = ProgressSteps.scanningProject(currentFiles.length);
      setModificationSteps(prev => [...prev.map(s => markStepDone(s)), scanStep]);

      console.log('[Alfred Code] Analyzing modification:', userRequest.slice(0, 100),
        attachments.length > 0 ? `with ${attachments.length} attachment(s)` : '');

      // Prepare attachments for API (extract base64/url data)
      const attachmentData = attachments.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        category: file.category,
        base64: file.base64,
        url: file.url,
      }));

      const response = await fetch('/api/builder/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: projectFiles,
          userRequest,
          attachments: attachmentData.length > 0 ? attachmentData : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze modification');
      }

      const data = await response.json();
      console.log('[Alfred Code] Modification plan:', data.plan);

      // Mark scanning done and add found locations step
      if (data.plan?.modifications?.length > 0) {
        const foundStep = ProgressSteps.foundLocations(data.plan.modifications.length);
        setModificationSteps(prev => [...prev.map(s => markStepDone(s)), foundStep]);
        setTimeout(() => {
          setModificationSteps(prev => prev.map(s => markStepDone(s)));
        }, 500);
      }

      return data.plan as ModificationPlan;
    } catch (error) {
      console.error('[Alfred Code] Analysis error:', error);
      return null;
    } finally {
      setIsAnalyzingModification(false);
    }
  }, [builder.files]);

  const handleApplyModification = useCallback(async () => {
    if (!modificationPlan) return;

    setIsApplyingModification(true);

    // Start apply progress tracking
    setModificationSteps([createProgressStep('modify', 'Preparing to apply changes')]);

    try {
      // CRITICAL: Use manager.getFiles() for most current files (React state can be stale!)
      const currentFiles = builder.manager?.getFiles?.() || builder.files;
      const filesMap = new Map<string, string>();
      currentFiles.forEach(f => filesMap.set(f.path, f.content));

      // Add applying step for each modification
      const totalMods = modificationPlan.modifications.length;
      modificationPlan.modifications.forEach((mod, idx) => {
        const step = ProgressSteps.applyingChange(idx + 1, totalMods, `${mod.action} ${mod.path.split('/').pop()}`);
        setTimeout(() => {
          setModificationSteps(prev => [...prev.map(s => markStepDone(s)), step]);
        }, idx * 150); // Stagger for visual effect
      });

      // Apply the modifications
      const result = applyModifications(filesMap, modificationPlan);

      if (result.failedChanges.length > 0) {
        console.warn('[Alfred Code] Some changes failed:', result.failedChanges);
      }

      console.log('[Alfred Code] Applied', result.appliedChanges, 'changes');

      // Update builder files with the new content
      result.newFiles.forEach((content, path) => {
        const existingFile = currentFiles.find(f => f.path === path);
        if (existingFile) {
          builder.updateFile(path, content);
        } else {
          // New file - create it
          builder.manager?.createFile(path, content);
        }
      });

      // Handle deleted files
      currentFiles.forEach(f => {
        if (!result.newFiles.has(f.path)) {
          // File was deleted
          builder.manager?.deleteFile?.(f.path);
        }
      });

      // Sync and rebuild - use synced files from manager
      const syncedFiles = builder.syncFiles?.() || [];
      await builder.rebuild?.(syncedFiles);

      // Mark all steps done and add complete step
      const completeStep = ProgressSteps.complete(result.appliedChanges);
      setModificationSteps(prev => [...prev.map(s => markStepDone(s)), completeStep]);
      setTimeout(() => {
        setModificationSteps(prev => prev.map(s => markStepDone(s)));
      }, 500);

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: `a-mod-${Date.now()}`,
        role: 'alfred',
        content: `Applied ${result.appliedChanges} change${result.appliedChanges !== 1 ? 's' : ''}. ${modificationPlan.analysis}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);

      // Clear modification state after a delay to show the complete step
      setTimeout(() => {
        setModificationPlan(null);
        setForensicReport(null);
        setPendingModificationMessage('');
        setModificationSteps([]);
      }, 1500);

      // Track as pending change (will need to be saved)
      const modifiedPaths = Array.from(result.newFiles.keys());
      setPendingChanges(prev => [...new Set([...prev, ...modifiedPaths])]);
    } catch (error) {
      console.error('[Alfred Code] Apply error:', error);
      const errorMessage: ChatMessage = {
        id: `a-err-${Date.now()}`,
        role: 'alfred',
        content: 'Failed to apply changes. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsApplyingModification(false);
    }
  }, [modificationPlan, builder]);

  const handleCancelModification = useCallback(() => {
    setModificationPlan(null);
    setForensicReport(null);
    setPendingModificationMessage('');
    setIsAnalyzingModification(false);
    setModificationSteps([]); // Clear progress steps
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleSuggestionClick = (text: string) => { setInputValue(text); setTimeout(() => sendMessage(text), 100); };

  const sendMessage = useCallback(async (overrideContent?: string) => {
    const content = (overrideContent || inputValue).trim();
    // Prevent double-click race conditions
    if (!content || isStreaming || isSending) return;

    // Immediately disable button to prevent multiple clicks
    setIsSending(true);

    // Ensure builder is initialized
    if (!builder.isInitialized) {
      console.warn('[Builder] ⚠️ Builder not initialized yet, waiting...');
      // Wait for initialization
      await new Promise<void>(resolve => {
        const checkInit = setInterval(() => {
          if (builder.isInitialized) {
            clearInterval(checkInit);
            resolve();
          }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInit);
          resolve();
        }, 5000);
      });
    }

    console.log('[Builder] ✅ Builder initialized:', builder.isInitialized, '| Manager:', !!builder.manager);

    // ═══════════════════════════════════════════════════════════════════════════
    // ALFRED CODE: Smart Modification Detection (Steve Jobs Approach)
    // If project exists and user is asking for modifications, use surgical edits
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Use manager.getFiles() for most accurate file count (React state can be stale!)
    const managerFiles = builder.manager?.getFiles?.() || [];
    const effectiveFileCount = managerFiles.length > 0 ? managerFiles.length : builder.files.length;

    console.log('[Alfred Code] File count check - Manager:', managerFiles.length, '| React state:', builder.files.length);

    if (effectiveFileCount > 0 && isModificationRequest(content, effectiveFileCount)) {
      console.log('[Alfred Code] Detected modification request, analyzing surgically...');

      // CRITICAL: Get files BEFORE clearing - must be done at start of modification path
      const modificationFiles = fileUpload.getReadyFiles();
      const attachedFiles = [...modificationFiles];
      fileUpload.clearFiles(); // Clear after copying

      setInputValue('');
      if (chatMinimized) setChatMinimized(false);

      // Add user message to chat WITH attached files
      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
      };
      setMessages(prev => [...prev, userMessage]);

      // Add analyzing message
      const analyzingMessage: ChatMessage = {
        id: `a-analyzing-${Date.now()}`,
        role: 'alfred',
        content: attachedFiles.length > 0
          ? `Analyzing your request with ${attachedFiles.length} attached file(s)...`
          : 'Analyzing your request...',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, analyzingMessage]);

      // Analyze the modification WITH attached files
      const plan = await analyzeModification(content, attachedFiles);

      // Remove the analyzing message
      setMessages(prev => prev.filter(m => !m.isStreaming));

      if (plan && plan.modifications.length > 0) {
        // Create forensic report from the plan (State of the Art!)
        const currentFiles = builder.manager?.getFiles?.() || builder.files;
        const projectName = builder.projectName || 'Project';
        const filesForReport = currentFiles.map(f => ({
          path: f.path,
          content: f.content || '',
        }));

        const report = createForensicReport(plan, projectName, filesForReport);

        // Show the forensic investigation
        setModificationPlan(plan);
        setForensicReport(report);
        setIsSending(false);
        return;
      } else {
        // Couldn't generate a plan - DON'T fall through to regeneration!
        // Ask user what they want instead of regenerating and losing their project
        console.log('[Alfred Code] No modification plan generated, asking for clarification');
        const helpMessage: ChatMessage = {
          id: `a-help-${Date.now()}`,
          role: 'alfred',
          content: 'I need to see the current code to make that change. Could you be more specific about which file or component you want to modify? For example: "Change the background color of Header.tsx to blue"',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, helpMessage]);
        setIsSending(false);
        return; // DON'T fall through to regeneration!
      }
    }
    // ═══════════════════════════════════════════════════════════════════════════

    setInputValue('');
    setStreamingSteps([]);
    setShowEnhancer(false);

    // CRITICAL: Reset builder state to clear any stale locks from previous builds
    // This is ONLY for new project generation, NOT for modifications
    console.log('[Builder] 🔄 Resetting builder state for NEW generation...');
    builder.reset();
    if (chatMinimized) setChatMinimized(false);

    // Get ready files from upload hook and clear them
    const readyFiles = fileUpload.getReadyFiles();
    const currentFiles = [...readyFiles];
    console.log('[Builder] Ready files for message:', currentFiles.map(f => ({ id: f.id, name: f.name, category: f.category, status: f.status, url: f.url, preview: !!f.preview })));
    fileUpload.clearFiles();

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      files: currentFiles.length > 0 ? currentFiles : undefined,
    };
    console.log('[Builder] User message files:', userMessage.files?.length || 0);
    const streamingMessage: ChatMessage = { id: `a-${Date.now()}`, role: 'alfred', content: '', timestamp: new Date(), isStreaming: true };
    setMessages(prev => [...prev, userMessage, streamingMessage]);
    setIsStreaming(true);

    try {
      // Format files for API (matching regular Alfred format)
      const filesData = currentFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        base64: file.category === 'video' ? undefined : file.base64,
      }));

      console.log('[Builder] 🚀 Sending request to /api/chat in builder mode...',
        filesData.length > 0 ? `with ${filesData.length} file(s)` : '');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId.current,
          mode: 'builder',
          files: filesData.length > 0 ? filesData : undefined,
        }),
      });

      // Handle usage limit exceeded
      if (res.status === 429) {
        const data = await res.json();
        console.log('[Builder] ⚠️ Usage limit exceeded');
        setLimitReached({
          type: data.message?.includes('daily') ? 'daily' : 'monthly',
          resetIn: data.resetInSeconds,
        });
        setMessages(prev => prev.filter(m => !m.isStreaming));
        setIsStreaming(false);
        return;
      }

      if (!res.ok) {
        console.error('[Builder] ❌ Response not OK:', res.status);
        throw new Error(`Failed: ${res.status}`);
      }
      console.log('[Builder] ✅ Response OK, reading stream...');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.content) {
                  chunkCount++;
                  fullResponse += parsed.content;
                  builder.processChunk(parsed.content);
                }
                if (parsed.conversationId && !conversationId.current) conversationId.current = parsed.conversationId;
              } catch (parseErr) {
                console.warn('[Builder] JSON parse error:', parseErr);
              }
            }
          }
        }
      }

      // CRITICAL: Set isStreaming to false IMMEDIATELY after stream ends
      // This allows builder.isBuilding to control the animation during ESBuild
      console.log('[Builder] 🏁 Stream reading complete, setting isStreaming=false');
      setIsStreaming(false);

      // Debug: Log marker summary on client
      const clientFileStarts = (fullResponse.match(/<<<FILE:/g) || []).length;
      const clientFileEnds = (fullResponse.match(/<<<END_FILE>>>/gi) || []).length;
      console.log(`[Builder] 📊 Client markers: FILE_START=${clientFileStarts}, FILE_END=${clientFileEnds}`);
      console.log('[Builder] 📝 Full response length:', fullResponse.length);

      // Force sync files from manager to React state
      // syncFiles() now accepts fullResponse for fallback parsing if streaming failed
      let managerFiles = builder.syncFiles?.(fullResponse) || [];

      // If syncFiles returned empty, try getting directly from manager after a delay
      if (managerFiles.length === 0) {
        console.log('[Builder] ⚠️ syncFiles returned 0, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 200));
        managerFiles = builder.manager?.getFileSystem()?.getAllFiles() || [];
      }

      console.log(`[Builder] 📦 Stream complete. Chunks: ${chunkCount}, Manager Files: ${managerFiles.length}`);
      if (managerFiles.length > 0) {
        console.log('[Builder] 📂 File paths:', managerFiles.map(f => f.path).join(', '));
      }
      console.log('[Builder] Full response preview:', fullResponse.slice(0, 500));

      // FALLBACK: If streaming parser didn't create files, manually extract them
      if (managerFiles.length === 0 && clientFileStarts > 0) {
        console.log('[Builder] ⚠️ Streaming parser failed! Using fallback extraction...');

        // Extract files using regex
        const fileRegex = /<<<FILE:\s*([^\s>]+)(?:\s+([^>]+))?\s*>>>([\s\S]*?)<<<\s*END_FILE\s*>>>/gi;
        let match;
        let extractedCount = 0;

        while ((match = fileRegex.exec(fullResponse)) !== null) {
          const path = match[1];
          const metadata = match[2] || '';
          const content = match[3]?.trim() || '';

          if (path && content) {
            // Normalize path
            const normalizedPath = path.startsWith('/') ? path : '/' + path;

            // Extract metadata
            const metaParts = metadata.split(/\s+/);
            const language = metaParts[0] || 'typescript';
            const isEntry = metadata.includes('entry');

            console.log('[Builder] 📄 Fallback extracted:', normalizedPath, '| Size:', content.length);

            // Create file directly in manager
            builder.manager?.createFile(normalizedPath, content);
            extractedCount++;
          }
        }

        if (extractedCount > 0) {
          console.log('[Builder] ✅ Fallback extracted', extractedCount, 'files');
          // Use syncFiles return value for immediate access
          managerFiles = builder.syncFiles?.() || [];
          if (managerFiles.length === 0) {
            // If still empty, wait and try again from manager directly
            await new Promise(r => setTimeout(r, 150));
            managerFiles = builder.manager?.getFileSystem()?.getAllFiles() || [];
          }
          console.log('[Builder] 📦 After fallback, files:', managerFiles.length);
        }
      }

      // Generate response message based on what happened
      let responseText: string;
      if (managerFiles.length > 0) {
        responseText = `Created ${managerFiles.length} file${managerFiles.length > 1 ? 's' : ''}. Building preview...`;

        // Select the entry point or first meaningful file
        const entryPoint = managerFiles.find(f =>
          f.isEntryPoint ||
          f.path.includes('main.tsx') ||
          f.path.includes('index.tsx') ||
          f.path.includes('App.tsx')
        );
        const fileToSelect = entryPoint || managerFiles[0];
        console.log('[Builder] 📂 Selecting file:', fileToSelect.path);
        builder.selectFile(fileToSelect.path);
        console.log('[Builder] 🎉 Files created:', managerFiles.map(f => f.path));

        // Force rebuild to trigger preview and wait for completion
        // CRITICAL: Pass files directly to avoid race conditions where files disappear
        console.log('[Builder] 🔨 Triggering rebuild with', managerFiles.length, 'files...');
        try {
          const previewResult = await builder.rebuild?.(managerFiles);
          if (previewResult?.errors?.length) {
            console.warn('[Builder] ⚠️ Preview built with errors:', previewResult.errors.length);
            console.warn('[Builder] Errors:', previewResult.errors.map(e => e.message).join(', '));
          } else {
            console.log('[Builder] ✅ Preview rebuilt successfully');
            console.log('[Builder] Preview HTML length:', previewResult?.html?.length || 0);
          }
        } catch (rebuildError) {
          console.error('[Builder] ❌ Rebuild error:', rebuildError);
        }
      } else {
        // Extract meaningful text from response (remove protocol markers if any)
        const cleanResponse = fullResponse
          .replace(/<<<PROJECT_START>>>[\s\S]*?<<<PROJECT_END>>>/g, '')
          .replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, '')
          .replace(/<<<[^>]+>>>/g, '')
          .replace(/<[^>]+>/g, '')
          .trim();
        responseText = cleanResponse || "I'm ready to help you build something. Describe what you'd like to create!";
        console.log('[Builder] 💬 No files created, showing text response');
      }
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, content: responseText, isStreaming: false } : m));
    } catch (err) {
      console.error('[Builder] ❌ Error:', err);
      setIsStreaming(false); // Ensure streaming state is reset on error
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false } : m));
    }
    finally {
      // Safety net: ensure streaming/sending states are always reset when done
      console.log('[Builder] 🏁 finally block, resetting all states');
      setIsStreaming(false);
      setIsSending(false);
    }
  }, [inputValue, isStreaming, isSending, builder, chatMinimized]);

  // Loading/Auth
  if (status === 'loading') return <div className="elegant-loader"><div className="loader-content"><div className="loader-wordmark">Alfred</div><div className="loader-bar"><div className="loader-bar-fill" /></div><p className="loader-hint">Loading</p></div><style jsx>{`.elegant-loader{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif}.loader-content{display:flex;flex-direction:column;align-items:center;gap:24px}.loader-wordmark{font-size:28px;font-weight:600;color:#1a1a1a;letter-spacing:-0.5px}.loader-bar{width:140px;height:2px;background:rgba(0,0,0,0.06);border-radius:1px;overflow:hidden}.loader-bar-fill{width:40%;height:100%;background:linear-gradient(90deg,rgba(0,0,0,0.08),rgba(0,0,0,0.4),rgba(0,0,0,0.08));border-radius:1px;animation:slide 1.8s ease-in-out infinite}.loader-hint{font-size:13px;color:rgba(0,0,0,0.35);letter-spacing:0.3px;margin:0}@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style></div>;
  if (!session) return <div className="auth-screen"><div className="auth-card"><div className="auth-logo">{Icons.layers}</div><h1>Alfred Builder</h1><p>Sign in to start building</p><button onClick={() => signIn()}>Sign In</button></div><style jsx>{`.auth-screen{display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.auth-card{text-align:center;color:white}.auth-logo{width:72px;height:72px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:20px}h1{font-size:28px;font-weight:700;margin:0 0 8px}p{color:rgba(255,255,255,0.5);margin:0 0 32px}button{padding:14px 32px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border:none;border-radius:12px;color:white;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s}button:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,92,246,0.4)}`}</style></div>;

  // ═══════════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT — Steve Jobs Level Mobile Experience
  // ═══════════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        <MobileBuilderLayout
          fileTree={builder.fileTree}
          files={builder.files}
          selectedFile={builder.selectedFile}
          projectName={builder.projectName}
          previewResult={builder.previewResult}
          isBuilding={builder.isBuilding}
          isStreaming={isStreaming}
          onFileSelect={handleFileSelect}
          onFileChange={handleEditorChange}
          onSendMessage={(msg) => sendMessage(msg)}
          onRebuild={() => builder.rebuild?.(builder.files)}
          streamingFile={streamingFile}
          streamingCode={streamingCode}
          streamingSteps={streamingSteps}
          messages={messages}
          // Theme System
          themes={themes}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          isLightTheme={isLightTheme}
          // Save/Projects
          onSave={saveProject}
          isSaving={isSaving}
          currentProjectId={currentProjectId}
          loadingProjectId={loadingProjectId}
          onOpenProjects={() => setShowProjects(true)}
          // Deploy
          onDeploy={async () => { handleDeploy(); }}
          isDeploying={isDeploying}
          deployedUrl={deployedUrl}
          // Export - Download as ZIP
          onExport={() => {
            const syncedFiles = builder.syncFiles?.() || builder.files;
            if (syncedFiles.length === 0) {
              alert('No files to export. Create some code first!');
              return;
            }
            // Create a simple text file with all code for now
            // TODO: Implement proper ZIP export
            const content = syncedFiles.map(f => `// ${f.path}\n${f.content}`).join('\n\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${builder.projectName || 'alfred-project'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          // Load project
          onLoadProject={loadProject}
          // Alfred Code - Modification Mode
          modificationPlan={modificationPlan}
          forensicReport={forensicReport}
          isAnalyzingModification={isAnalyzingModification}
          isApplyingModification={isApplyingModification}
          modificationSteps={modificationSteps}
          onApplyModification={handleApplyModification}
          onCancelModification={handleCancelModification}
          // File Upload
          uploadedFiles={fileUpload.files}
          isUploading={fileUpload.isUploading}
          onAddFiles={fileUpload.addFiles}
          onRemoveFile={fileUpload.removeFile}
        />

        {/* Deploy Modal for Mobile */}
        {showDeployModal && (
          <BuilderDeploymentCard
            files={filesToDeploy}
            projectName={builder.projectName || 'alfred-project'}
            artifactId={currentProjectId || `builder-${Date.now()}`}
            artifactTitle={builder.projectName || 'Alfred Project'}
            onClose={() => setShowDeployModal(false)}
            onDeployed={handleDeployed}
            existingDeployedUrl={deployedUrl || undefined}
          />
        )}

        {limitReached && (
          <LimitReached
            limitType={limitReached.type}
            resetIn={limitReached.resetIn}
            onDismiss={() => setLimitReached(null)}
          />
        )}
      </>
    );
  }

  // Main render (Desktop)
  return (
    <div className={`builder-page ${isLightTheme ? 'light-theme' : 'dark-theme'}`} style={{ ...themeVars, background: currentTheme.bg }}>
      {/* Header */}
      <header className="builder-header">
        <div className="header-left">
          <div className="logo">{Icons.layers}</div>
          <div className="project-info">
            <span className="project-name">{builder.projectName}</span>
            <span className="project-label">Alfred Pro</span>
          </div>
          {/* Theme Picker - Elegant placement */}
          <div className="theme-picker">
            <button
              className={`theme-btn-compact ${showThemePicker ? 'active' : ''}`}
              onClick={() => setShowThemePicker(!showThemePicker)}
              title="Change theme"
            >
              <div className="theme-swatch" style={{ background: currentTheme.bg, border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)' }} />
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {showThemePicker && (
              <div className="theme-dropdown">
                <div className="theme-dropdown-title">Theme</div>
                <div className="theme-options">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-option ${currentTheme.id === t.id ? 'active' : ''}`}
                      onClick={() => { setCurrentTheme(t); setShowThemePicker(false); }}
                    >
                      <div className="theme-dot" style={{ background: t.bg }} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="header-center"><ViewToggle mode={viewMode} onModeChange={setViewMode} /></div>
        <div className="header-right">
          <button
            className="header-btn"
            onClick={saveProject}
            disabled={isSaving || builder.files.length === 0}
            title="Save project"
          >
            {isSaving ? (
              <div className="btn-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            )}
            <span>Save</span>
          </button>
          <button
            className="header-btn"
            onClick={() => setShowProjects(true)}
            title="My projects"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span>Projects</span>
          </button>
          {/* Export to Claude Code - Power user feature */}
          {builder.files.length > 0 && (
            <ExportToClaudeCode
              files={new Map(builder.files.map(f => [f.path, f.content]))}
              projectName={builder.projectName}
              className="header-btn"
            />
          )}
          <button
            className="header-btn primary"
            onClick={handleDeploy}
            disabled={builder.files.length === 0 || isDeploying}
            title="Deploy to web"
          >
            {isDeploying ? (
              <div className="btn-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            )}
            <span>Deploy</span>
          </button>
          {deployedUrl && (
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="live-site-badge"
              title="View deployed site"
            >
              <div className="live-indicator">
                <div className="live-dot" />
                <span>LIVE</span>
              </div>
              <div className="live-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                <span className="url-text">{deployedUrl.replace('https://', '')}</span>
                <svg className="arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>
            </a>
          )}
          <div className={`status-badge ${isStreaming ? 'streaming' : builder.isBuilding ? 'building' : 'ready'}`}>
            <div className="status-dot" />
            <span>{isStreaming ? 'Generating' : builder.isBuilding ? 'Building' : 'Ready'}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="builder-content">
        {/* File Tree */}
        <div className="file-panel">
          <FileExplorer tree={builder.fileTree} selectedPath={builder.selectedFile?.path || null} onFileSelect={handleFileSelect} onFileOpen={handleFileSelect} projectName={builder.projectName} pendingChanges={pendingChanges} />
        </div>

        {/* Editor/Preview */}
        <div className="editor-area">
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div className={`editor-panel ${viewMode === 'split' ? 'split' : 'full'}`}>
              {/* Show streaming code during generation OR when viewing streamed file */}
              {(isStreaming && streamingFile) || (!builder.selectedFile && streamingFile && streamingCode) ? (
                <div className="editor-content streaming">
                  <StreamingCodeDisplay
                    currentFile={streamingFile}
                    code={streamingCode}
                    isStreaming={isStreaming}
                    language="typescript"
                    showEditHint={!isStreaming && !!streamingCode}
                    onRequestEdit={() => {
                      // Find the file in the builder and switch to edit mode
                      if (streamingFile) {
                        builder.selectFile(streamingFile);
                        setStreamingFile(null);
                        setStreamingCode('');
                      }
                    }}
                  />
                </div>
              ) : builder.selectedFile ? (
                <>
                  <div className="editor-tabs"><div className="tab active"><span>{builder.selectedFile.name}</span></div></div>
                  <div className="editor-content" style={{position: 'relative'}}>
                    <MonacoEditor key={builder.selectedFile.path} value={builder.selectedFile.content} language={builder.selectedFile.language} onChange={handleEditorChange} theme={isLightTheme ? 'light' : 'dark'} bgColor={currentTheme.bg} />
                    <div className="press-enter-hint">
                      <span>Press</span>
                      <kbd>Enter</kbd>
                      <span>to edit</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="editor-empty">{Icons.file}<span>Select a file to edit</span></div>
              )}
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`preview-panel ${viewMode === 'split' ? 'split' : 'full'}`}>
              <BuilderPreview
                preview={builder.previewResult}
                isBuilding={isStreaming || builder.isBuilding}
                onConsole={() => {}}
                onRebuild={() => builder.rebuild?.(builder.files)}
                bgColor={currentTheme.bg}
              />
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className={`chat-panel ${chatMinimized ? 'minimized' : ''}`}>
          <button className="chat-toggle" onClick={() => setChatMinimized(!chatMinimized)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {chatMinimized ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
            </svg>
          </button>

          {!chatMinimized && (
            <div className={`chat-content ${pendingChanges.length > 0 ? 'has-save-bar' : ''}`}>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-left">
                  <div className="alfred-icon">{Icons.layers}</div>
                  <div className="header-text">
                    <span className="header-title">Alfred AI</span>
                    <span className={`header-status ${isStreaming ? 'streaming' : 'online'}`}>{isStreaming ? 'Generating...' : 'Online'}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages" ref={scrollRef}>
                {messages.length === 0 ? (
                  <WelcomePanel
                    project={builder.files.length > 0 ? {
                      name: builder.projectName,
                      fileCount: builder.files.length,
                      framework: 'React',
                      hasComponents: builder.files.some(f => f.path.includes('component') || f.path.includes('Component')),
                      hasStyles: builder.files.some(f => f.path.endsWith('.css')),
                    } : null}
                    onSuggestionClick={handleSuggestionClick}
                    isProcessing={isStreaming || isSending}
                  />
                ) : (
                  messages.map(msg => <ChatMessage key={msg.id} message={msg} streamingSteps={msg.isStreaming ? streamingSteps : undefined} />)
                )}

                {/* Alfred Code - Forensic Investigation (State of the Art) */}
                {forensicReport && (
                  <div className="forensic-investigation-container">
                    <ForensicInvestigation
                      report={forensicReport}
                      onApply={handleApplyModification}
                      onCancel={handleCancelModification}
                      isApplying={isApplyingModification}
                    />
                  </div>
                )}

                {/* Fallback to simple preview if no forensic report but has plan */}
                {modificationPlan && !forensicReport && (
                  <div className="modification-preview-container">
                    <ModificationPreview
                      plan={modificationPlan}
                      onApply={handleApplyModification}
                      onCancel={handleCancelModification}
                      isApplying={isApplyingModification}
                    />
                  </div>
                )}

                {/* Modification Progress - State of the Art (replaces simple analyzing indicator) */}
                {isAnalyzingModification && modificationSteps.length > 0 && (
                  <div className="modification-progress-container">
                    <ModificationProgress
                      steps={modificationSteps}
                      isActive={isAnalyzingModification}
                      projectName={builder.projectName}
                    />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                {/* Prompt Enhancer */}
                {showEnhancer && (
                  <div className="prompt-enhancer">
                    {isEnhancing ? (
                      <div className="enhancer-loading"><span /><span /><span /></div>
                    ) : (
                      <>
                        <p className="enhanced-text">{enhancedText || originalText}</p>
                        <div className="enhancer-actions">
                          <span className="enhancer-hint">Enhanced from your input</span>
                          <button className="btn-dismiss" onClick={useOriginal}>Dismiss</button>
                          <button className="btn-apply" onClick={useEnhanced}>Apply</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.csv,.html,.css,.json,.js,.ts,.tsx,.jsx"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                />

                {/* File Preview Bar */}
                {fileUpload.files.length > 0 && (
                  <div className="attachments-preview">
                    {fileUpload.files.map((file) => (
                      <div key={file.id} className={`attachment-chip ${file.category}`}>
                        {file.preview ? (
                          <img src={file.preview} alt={file.name} className="attachment-thumb" />
                        ) : (
                          <span className="attachment-icon">
                            {file.category === 'document' && Icons.document}
                            {file.category === 'code' && Icons.code}
                            {file.category === 'video' && Icons.video}
                          </span>
                        )}
                        <span className="attachment-name">{file.name}</span>
                        <span className="attachment-size">
                          {file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                        {file.status === 'uploading' && (
                          <div className="attachment-progress-bar">
                            <div className="attachment-progress-fill" style={{ width: `${file.progress}%` }} />
                          </div>
                        )}
                        {file.status === 'ready' && <span className="attachment-ready">{Icons.check}</span>}
                        {file.status === 'error' && <span className="attachment-error">!</span>}
                        <button
                          className="attachment-remove"
                          onClick={() => fileUpload.removeFile(file.id)}
                          aria-label="Remove file"
                        >
                          {Icons.x}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recording UI */}
                {isRecording ? (
                  <div className="recording-ui">
                    <button className="recording-cancel" onClick={cancelRecording}>{Icons.stop}</button>
                    <div className="recording-visualizer">
                      <div className="orb" style={{ transform: `scale(${1 + (audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length) * 0.6})` }} />
                      <div className="orb-ring r1" style={{ transform: `scale(${1.3 + (audioLevels[5] || 0) * 0.5})`, opacity: 0.15 + (audioLevels[5] || 0) * 0.25 }} />
                      <div className="orb-ring r2" style={{ transform: `scale(${1.6 + (audioLevels[15] || 0) * 0.6})`, opacity: 0.08 + (audioLevels[15] || 0) * 0.15 }} />
                    </div>
                    <button className="recording-done" onClick={stopRecording}>{Icons.check}</button>
                  </div>
                ) : isTranscribing ? (
                  <div className="transcribing"><span>Processing</span><div className="dots"><span /><span /><span /></div></div>
                ) : (
                  <div className="input-row">
                    {/* Upload Buttons */}
                    <div className="upload-buttons">
                      <button
                        className="btn-upload"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isStreaming || fileUpload.isUploading}
                        title="Add image"
                      >
                        {Icons.image}
                      </button>
                      <button
                        className="btn-upload"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isStreaming || fileUpload.isUploading}
                        title="Add video"
                      >
                        {Icons.video}
                      </button>
                      <button
                        className="btn-upload"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isStreaming || fileUpload.isUploading}
                        title="Add file"
                      >
                        {Icons.paperclip}
                      </button>
                    </div>
                    {/* Enhance Button */}
                    {inputValue.trim() && !showEnhancer && (
                      <button className="btn-enhance" onClick={() => enhancePrompt(inputValue)} disabled={isEnhancing}>{Icons.sparkle}</button>
                    )}
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Describe what you want to build..."
                      disabled={isStreaming}
                      rows={1}
                    />
                    {inputValue.trim() ? (
                      <button className="btn-send" onClick={() => sendMessage()} disabled={isStreaming || isSending}>{isSending ? Icons.loading : Icons.send}</button>
                    ) : (
                      <button className="btn-mic" onClick={startRecording} disabled={isStreaming || isSending}>{Icons.mic}</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {chatMinimized && <div className="minimized-icon">{Icons.layers}</div>}
        </div>

        {/* Projects Sidebar */}
        {showProjects && (
          <div className="projects-panel">
            <ProjectsSidebar
              onLoadProject={loadProject}
              onClose={() => setShowProjects(false)}
              currentProjectId={currentProjectId}
              loadingProjectId={loadingProjectId}
            />
          </div>
        )}

        {/* Deploy Modal - Direct deployment preserving exact file structure */}
        {showDeployModal && (
          <BuilderDeploymentCard
            files={filesToDeploy}
            projectName={builder.projectName || 'alfred-project'}
            artifactId={currentProjectId || `builder-${Date.now()}`}
            artifactTitle={builder.projectName || 'Alfred Project'}
            onClose={() => setShowDeployModal(false)}
            onDeployed={handleDeployed}
            existingDeployedUrl={deployedUrl || undefined}
          />
        )}

        {/* Limit Reached Modal */}
        {limitReached && (
          <LimitReached
            limitType={limitReached.type}
            resetIn={limitReached.resetIn}
            onDismiss={() => setLimitReached(null)}
          />
        )}

        {/* Save Bar - Appears when there are unsaved changes */}
        <SaveBar
          pendingChanges={pendingChanges}
          onSave={async () => {
            await saveProject();
            setPendingChanges([]); // Clear pending after successful save
          }}
          onDiscard={() => {
            if (confirm('Discard all unsaved changes? This cannot be undone.')) {
              // Reload from saved version
              if (currentProjectId) {
                loadProject(currentProjectId);
              }
              setPendingChanges([]);
            }
          }}
          isSaving={isSaving}
        />
      </div>

      <style jsx>{`
        .builder-page { display: flex; flex-direction: column; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; overflow: hidden; transition: background 0.3s ease; color: var(--text); }

        /* Header */
        .builder-header { display: flex; align-items: center; justify-content: space-between; height: 54px; padding: 0 16px; background: var(--surface); border-bottom: 1px solid var(--border); position: relative; transition: all 0.3s ease; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .logo { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 10px; color: white; }
        .project-info { display: flex; flex-direction: column; gap: 1px; }
        .project-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .project-label { font-size: 9px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .header-center { position: absolute; left: 50%; transform: translateX(-50%); }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .header-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 11px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease; }
        .header-btn:hover { background: var(--surface-hover); border-color: rgba(139,92,246,0.4); color: var(--text); }
        .header-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .header-btn svg { flex-shrink: 0; color: var(--icon); }
        .header-btn.primary { background: linear-gradient(135deg, #8b5cf6, #6366f1); border-color: rgba(139,92,246,0.5); color: white; }
        .header-btn.primary:hover { background: linear-gradient(135deg, #9b6cf6, #7376f1); border-color: rgba(139,92,246,0.7); box-shadow: 0 4px 16px rgba(139,92,246,0.3); transform: translateY(-1px); }
        .header-btn.primary svg { color: white; }
        /* Theme Picker - State of the Art */
        .theme-picker { position: relative; margin-left: 12px; }
        .theme-btn-compact { display: flex; align-items: center; gap: 4px; padding: 6px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: all 0.15s; color: var(--text-muted); }
        .theme-btn-compact:hover { background: var(--surface-hover); color: var(--text-secondary); }
        .theme-btn-compact.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.4); }
        .theme-swatch { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
        .theme-dropdown { position: absolute; top: calc(100% + 8px); left: 0; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); z-index: 1000; min-width: 140px; animation: dropdownIn 0.15s ease; }
        .light-theme .theme-dropdown { box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .theme-dropdown-title { font-size: 9px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .theme-options { display: flex; flex-direction: column; gap: 2px; }
        .theme-option { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; transition: all 0.15s; color: var(--text-secondary); font-size: 11px; font-weight: 500; }
        .theme-option:hover { background: var(--surface-hover); color: var(--text); }
        .theme-option.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.3); color: #a78bfa; }
        .theme-dot { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border); flex-shrink: 0; }
        /* Live Site Badge - State of the Art */
        .live-site-badge { display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 8px; background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05)); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px; text-decoration: none; transition: all 0.2s ease; cursor: pointer; }
        .live-site-badge:hover { background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1)); border-color: rgba(34,197,94,0.4); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34,197,94,0.2); }
        .live-indicator { display: flex; align-items: center; gap: 5px; padding: 3px 8px; background: rgba(34,197,94,0.15); border-radius: 6px; }
        .live-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: livePulse 2s ease-in-out infinite; box-shadow: 0 0 8px rgba(34,197,94,0.6); }
        @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
        .live-indicator span { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #22c55e; }
        .live-url { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); }
        .live-url svg { flex-shrink: 0; opacity: 0.5; }
        .live-url .url-text { font-size: 11px; font-family: 'SF Mono', Monaco, monospace; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .live-url .arrow-icon { opacity: 0.3; transition: all 0.2s ease; }
        .live-site-badge:hover .live-url { color: var(--text); }
        .live-site-badge:hover .arrow-icon { opacity: 0.7; transform: translate(2px, -2px); }
        .btn-spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--text-secondary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        .status-badge { display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; font-size: 10px; font-weight: 500; color: var(--text-secondary); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-badge.ready .status-dot { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
        .status-badge.building .status-dot { background: #eab308; animation: pulse 1s infinite; }
        .status-badge.streaming .status-dot { background: #8b5cf6; animation: pulse 0.8s infinite; }

        /* Content */
        .builder-content { display: flex; flex: 1; min-height: 0; }
        .file-panel { width: 220px; flex-shrink: 0; border-right: 1px solid var(--border); background: var(--surface); transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .editor-area { flex: 1; display: flex; min-width: 0; height: 100%; overflow: hidden; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .editor-panel, .preview-panel { display: flex; flex-direction: column; height: 100%; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); background: var(--surface); }
        .editor-panel.full, .preview-panel.full { flex: 1; }
        .editor-panel.split, .preview-panel.split { flex: 1; }
        .preview-panel.split { border-left: 1px solid var(--border); }
        .editor-tabs { display: flex; height: 34px; background: var(--surface); border-bottom: 1px solid var(--border); }
        .tab { display: flex; align-items: center; padding: 0 14px; border-top: 2px solid transparent; color: var(--text-secondary); }
        .tab.active { background: var(--bg); border-top-color: #8b5cf6; color: var(--text); }
        .tab span { font-size: 11px; font-family: "SF Mono", Monaco, monospace; }
        .editor-content { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--surface); }
        .editor-content.streaming { padding: 0; height: 100%; position: relative; }
        .editor-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--text-muted); font-size: 12px; }
        .press-enter-hint { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 13px; backdrop-filter: blur(8px); pointer-events: none; }
        .press-enter-hint kbd { padding: 2px 8px; background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.3); border-radius: 4px; color: #a78bfa; font-family: "SF Mono", Monaco, monospace; font-size: 11px; }
        .editor-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: var(--bg, #09090b); gap: 16px; }
        .loading-pulse { width: 80px; height: 2px; background: var(--border, rgba(255,255,255,0.08)); border-radius: 1px; overflow: hidden; position: relative; }
        .loading-pulse::after { content: ''; position: absolute; top: 0; left: 0; width: 40%; height: 100%; background: linear-gradient(90deg, transparent, var(--text-muted, rgba(255,255,255,0.35)), transparent); animation: shimmer 1.5s ease-in-out infinite; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

        /* Projects Panel */
        .projects-panel { position: absolute; right: 0; top: 0; bottom: 0; width: 320px; z-index: 50; box-shadow: -8px 0 24px rgba(0,0,0,0.3); animation: slideIn 0.2s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Chat Panel */
        .chat-panel { position: relative; display: flex; flex-direction: column; width: 360px; min-width: 360px; background: var(--surface); border-left: 1px solid var(--border); transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .chat-panel.minimized { width: 44px; min-width: 44px; }
        .chat-toggle { position: absolute; left: -11px; top: 50%; transform: translateY(-50%); width: 22px; height: 44px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px 0 0 6px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: all 0.2s; }
        .chat-toggle:hover { background: var(--surface-hover); color: var(--text); }
        .minimized-icon { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
        .chat-content { display: flex; flex-direction: column; height: 100%; transition: padding-bottom 0.3s ease; }
        .chat-content.has-save-bar { padding-bottom: 100px; }
        .chat-header { padding: 14px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
        .chat-header-left { display: flex; align-items: center; gap: 10px; }
        .alfred-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 10px; color: white; }
        .header-text { display: flex; flex-direction: column; gap: 1px; }
        .header-title { font-size: 14px; font-weight: 600; color: var(--text); }
        .header-status { font-size: 10px; font-weight: 500; }
        .header-status.online { color: #22c55e; }
        .header-status.streaming { color: #8b5cf6; animation: blink 1.5s infinite; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 0 16px; }
        .chat-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; padding: 20px; }
        .welcome-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08)); border: 1px solid rgba(139,92,246,0.2); border-radius: 18px; color: #8b5cf6; margin-bottom: 20px; }
        .chat-welcome h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 0 0 6px; }
        .chat-welcome p { font-size: 13px; color: var(--text-secondary); margin: 0 0 24px; }
        .suggestions { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .suggestions button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text-secondary); font-size: 13px; text-align: left; cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .suggestions button:hover { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.25); color: var(--text); transform: translateX(3px); }
        .suggestions button svg { color: var(--icon); }

        /* Alfred Code - Modification Preview */
        .modification-preview-container { padding: 16px; }
        .analyzing-indicator { display: flex; align-items: center; gap: 8px; padding: 12px 16px; color: var(--text-secondary); font-size: 13px; }
        .analyzing-spinner { width: 16px; height: 16px; border: 2px solid rgba(139,92,246,0.2); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Input Area - Properly contained in chat panel */
        .chat-input-area { padding: 14px 16px; background: var(--surface); border-top: 1px solid var(--border); }
        .input-row { display: flex; align-items: flex-end; gap: 8px; background: var(--surface-hover); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; transition: border-color 0.2s; }
        .input-row:focus-within { border-color: rgba(139,92,246,0.4); }
        .input-row textarea { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 15px; font-family: inherit; resize: none; min-height: 24px; max-height: 160px; line-height: 1.5; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap; }
        .input-row textarea::placeholder { color: var(--text-muted); }
        .btn-enhance, .btn-mic, .btn-send { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .btn-enhance { background: var(--surface); color: var(--icon); }
        .btn-enhance:hover { background: var(--surface-hover); color: var(--text); }
        .btn-mic { background: transparent; color: var(--icon); }
        .btn-mic:hover { color: var(--text); }
        .btn-send { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .btn-send:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.4); }
        .btn-send:disabled, .btn-mic:disabled, .btn-enhance:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .btn-send .animate-spin { animation: spin 1s linear infinite; }

        /* Prompt Enhancer */
        .prompt-enhancer { background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
        .enhanced-text { margin: 0 0 10px; font-size: 13px; color: var(--text); line-height: 1.5; }
        .enhancer-actions { display: flex; align-items: center; gap: 8px; }
        .enhancer-hint { flex: 1; font-size: 10px; color: var(--text-muted); }
        .btn-dismiss, .btn-apply { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-dismiss { background: transparent; border: none; color: var(--text-secondary); }
        .btn-dismiss:hover { color: var(--text); }
        .btn-apply { background: #8b5cf6; border: none; color: white; font-weight: 600; }
        .btn-apply:hover { transform: translateY(-1px); }
        .enhancer-loading { display: flex; justify-content: center; gap: 4px; padding: 8px 0; }
        .enhancer-loading span { width: 5px; height: 5px; background: var(--text-muted); border-radius: 50%; animation: dot 1.2s infinite; }
        .enhancer-loading span:nth-child(2) { animation-delay: 0.15s; }
        .enhancer-loading span:nth-child(3) { animation-delay: 0.3s; }

        /* Recording UI */
        .recording-ui { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .recording-cancel, .recording-done { width: 38px; height: 38px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .recording-cancel { background: var(--surface-hover); color: var(--text-muted); }
        .recording-cancel:hover { background: var(--surface); color: var(--text-secondary); }
        .recording-done { background: #8b5cf6; color: white; }
        .recording-done:hover { transform: scale(1.05); }
        .recording-visualizer { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
        .orb { width: 16px; height: 16px; background: #8b5cf6; border-radius: 50%; transition: transform 0.03s linear; }
        .orb-ring { position: absolute; inset: 0; border: 1.5px solid #8b5cf6; border-radius: 50%; transition: all 0.04s linear; pointer-events: none; }
        .orb-ring.r1 { inset: 4px; }
        .orb-ring.r2 { inset: -2px; }
        .transcribing { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0; color: var(--text-secondary); font-size: 14px; }
        .dots { display: flex; gap: 3px; }
        .dots span { width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: dot 1.3s infinite; }
        .dots span:nth-child(2) { animation-delay: 0.15s; }
        .dots span:nth-child(3) { animation-delay: 0.3s; }

        /* File Upload Styles */
        .upload-buttons { display: flex; gap: 2px; margin-right: 4px; }
        .btn-upload { width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
        .btn-upload:hover { background: var(--surface-hover); color: var(--text-secondary); }
        .btn-upload:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Attachments Preview */
        .attachments-preview { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0; margin-bottom: 8px; }
        .attachment-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; max-width: 100%; animation: fadeIn 0.2s ease; }
        .attachment-chip.image { border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.08); }
        .attachment-chip.video { border-color: rgba(236,72,153,0.3); background: rgba(236,72,153,0.08); }
        .attachment-chip.document { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.08); }
        .attachment-chip.code { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); }
        .attachment-thumb { width: 32px; height: 32px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
        .attachment-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--surface-hover); border-radius: 4px; color: var(--icon); flex-shrink: 0; }
        .attachment-name { font-size: 11px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
        .attachment-size { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
        .attachment-remove { width: 20px; height: 20px; border: none; border-radius: 50%; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; flex-shrink: 0; }
        .attachment-remove:hover { background: var(--surface-hover); color: var(--text-secondary); }
        .attachment-progress-bar { width: 48px; height: 4px; background: rgba(139,92,246,0.2); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
        .attachment-progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa); border-radius: 2px; transition: width 0.3s ease-out; }
        .attachment-ready { width: 18px; height: 18px; border-radius: 50%; background: rgba(34,197,94,0.2); color: #22c55e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .attachment-ready svg { width: 12px; height: 12px; }
        .attachment-error { width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,0.2); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes dot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
      `}</style>

      {/* Usage Limit Modal */}
      {limitReached && (
        <LimitReached
          limitType={limitReached.type}
          resetIn={limitReached.resetIn}
          onDismiss={() => setLimitReached(null)}
        />
      )}
    </div>
  );
}
