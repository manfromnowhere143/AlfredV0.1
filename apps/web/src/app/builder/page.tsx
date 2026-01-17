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
import { FileExplorer, BuilderPreview, StreamingCodeDisplay, ProjectsSidebar } from '@/components/builder';
import LimitReached from '@/components/LimitReached';
import type { VirtualFile, StreamingEvent } from '@alfred/core';

const MonacoEditor = nextDynamic(
  () => import('@/components/builder/MonacoEditor').then(mod => mod.MonacoEditor),
  { ssr: false, loading: () => <div className="editor-loading"><div className="loading-pulse" /></div> }
);

const MobileBuilderLayout = nextDynamic(
  () => import('@/components/builder/MobileBuilderLayout'),
  { ssr: false, loading: () => <div className="loading-screen"><div className="loading-orb"><div className="orb-ring" /><div className="orb-core" /></div></div> }
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
        .chat-message + .chat-message { border-top: 1px solid rgba(255, 255, 255, 0.04); }
        .message-avatar { width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 11px; font-weight: 600; }
        .chat-message.user .message-avatar { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6); }
        .chat-message.alfred .message-avatar { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .message-body { flex: 1; min-width: 0; }
        .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
        .message-role { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.9); }
        .message-time { font-size: 9px; color: rgba(255, 255, 255, 0.3); }
        .message-content { font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); }
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
        .view-toggle { display: flex; padding: 3px; gap: 2px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; }
        button { padding: 5px 12px; background: transparent; border: none; border-radius: 6px; color: rgba(255, 255, 255, 0.5); font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        button:hover { color: rgba(255, 255, 255, 0.8); }
        button.active { color: white; background: rgba(139, 92, 246, 0.2); }
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
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const conversationId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  // If we have files but isBuilding is stuck true for 5 seconds, force reset
  useEffect(() => {
    if (builder.files.length > 0 && (isStreaming || builder.isBuilding)) {
      const timeout = setTimeout(() => {
        console.warn('[Builder Page] ⚠️ SAFETY TIMEOUT: Forcing state reset after 5s');
        setIsStreaming(false);
        // Force a rebuild to ensure preview updates - PASS FILES DIRECTLY
        if (builder.files.length > 0 && !builder.previewResult?.html) {
          console.log('[Builder Page] 🔄 Forcing rebuild after timeout with', builder.files.length, 'files...');
          builder.rebuild?.(builder.files);
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [builder.files.length, isStreaming, builder.isBuilding, builder.previewResult?.html, builder.rebuild]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingSteps]);

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
    if (builder.files.length === 0) {
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
      const files = builder.files.map(f => ({
        path: f.path,
        name: f.name,
        content: f.content,
        language: f.language,
        fileType: f.fileType,
        isEntryPoint: f.isEntryPoint,
        generatedBy: f.generatedBy,
      }));

      const res = await fetch('/api/builder/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectMeta.name || 'Untitled Project',
          description: projectMeta.description || '',
          framework: projectMeta.framework || 'react',
          dependencies: projectMeta.dependencies || {},
          devDependencies: projectMeta.devDependencies || {},
          files,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      const data = await res.json();
      setCurrentProjectId(data.project.id);
      console.log('[Builder] Project saved:', data.project.id);
    } catch (error) {
      console.error('[Builder] Save failed:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [builder]);

  const loadProject = useCallback(async (projectId: string) => {
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
    }
  }, [builder]);

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
  // SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleSuggestionClick = (text: string) => { setInputValue(text); setTimeout(() => sendMessage(text), 100); };

  const sendMessage = useCallback(async (overrideContent?: string) => {
    const content = (overrideContent || inputValue).trim();
    if (!content || isStreaming) return;

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

    setInputValue('');
    setStreamingSteps([]);
    setShowEnhancer(false);
    builder.reset();
    if (chatMinimized) setChatMinimized(false);

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    const streamingMessage: ChatMessage = { id: `a-${Date.now()}`, role: 'alfred', content: '', timestamp: new Date(), isStreaming: true };
    setMessages(prev => [...prev, userMessage, streamingMessage]);
    setIsStreaming(true);

    try {
      console.log('[Builder] 🚀 Sending request to /api/chat in builder mode...');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, conversationId: conversationId.current, mode: 'builder' }),
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
      // Safety net: ensure isStreaming is always false when done
      console.log('[Builder] 🏁 finally block, ensuring isStreaming=false');
      setIsStreaming(false);
    }
  }, [inputValue, isStreaming, builder, chatMinimized]);

  // Loading/Auth
  if (status === 'loading') return <div className="loading-screen"><div className="loading-orb"><div className="orb-ring" /><div className="orb-core" /></div><style jsx>{`.loading-screen{display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b}.loading-orb{position:relative;width:48px;height:48px}.orb-ring{position:absolute;inset:0;border:2px solid transparent;border-top-color:#8b5cf6;border-radius:50%;animation:spin 1s linear infinite}.orb-core{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:50%}@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
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
        />
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
    <div className="builder-page">
      {/* Header */}
      <header className="builder-header">
        <div className="header-left">
          <div className="logo">{Icons.layers}</div>
          <div className="project-info">
            <span className="project-name">{builder.projectName}</span>
            <span className="project-label">Alfred Pro</span>
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
          <FileExplorer tree={builder.fileTree} selectedPath={builder.selectedFile?.path || null} onFileSelect={handleFileSelect} onFileOpen={handleFileSelect} projectName={builder.projectName} />
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
                  <div className="editor-content"><MonacoEditor key={builder.selectedFile.path} value={builder.selectedFile.content} language={builder.selectedFile.language} onChange={handleEditorChange} theme="dark" /></div>
                </>
              ) : (
                <div className="editor-empty">{Icons.file}<span>Select a file to edit</span></div>
              )}
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`preview-panel ${viewMode === 'split' ? 'split' : 'full'}`}>
              {/* DEBUG: Show state values - both React state AND direct manager read */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{position:'absolute',top:4,right:4,zIndex:9999,fontSize:10,background:'rgba(0,0,0,0.8)',color:'#0f0',padding:'4px 8px',borderRadius:4,fontFamily:'monospace',maxWidth:300}}>
                  <div>streaming:{String(isStreaming)} | building:{String(builder.isBuilding)}</div>
                  <div>React files:{builder.files.length} | Manager files:{builder.manager?.getFiles?.()?.length ?? 'N/A'}</div>
                  <div>selected:{builder.selectedFile?.path?.slice(-20) || 'none'}</div>
                  <div>preview:{builder.previewResult ? `${builder.previewResult.success ? '✓' : '✗'} ${builder.previewResult.html?.length || 0}b` : 'null'}</div>
                </div>
              )}
              <BuilderPreview
                preview={builder.previewResult}
                isBuilding={isStreaming || builder.isBuilding}
                onConsole={() => {}}
                onRebuild={() => builder.rebuild?.(builder.files)}
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
            <div className="chat-content">
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
                  <div className="chat-welcome">
                    <div className="welcome-icon">{Icons.layers}</div>
                    <h3>What would you like to build?</h3>
                    <p>Describe your idea and I'll generate the code.</p>
                    <div className="suggestions">
                      <button onClick={() => handleSuggestionClick('Create a modern todo app with React and local storage')}>
                        {Icons.todo}<span>Todo App</span>
                      </button>
                      <button onClick={() => handleSuggestionClick('Build a calculator with a clean minimal design')}>
                        {Icons.calc}<span>Calculator</span>
                      </button>
                      <button onClick={() => handleSuggestionClick('Create a beautiful landing page for a SaaS product')}>
                        {Icons.rocket}<span>Landing Page</span>
                      </button>
                      <button onClick={() => handleSuggestionClick('Build a weather dashboard that shows current conditions')}>
                        {Icons.weather}<span>Weather App</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => <ChatMessage key={msg.id} message={msg} streamingSteps={msg.isStreaming ? streamingSteps : undefined} />)
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
                      <button className="btn-send" onClick={() => sendMessage()} disabled={isStreaming}>{Icons.send}</button>
                    ) : (
                      <button className="btn-mic" onClick={startRecording} disabled={isStreaming}>{Icons.mic}</button>
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
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .builder-page { display: flex; flex-direction: column; height: 100vh; background: #09090b; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; overflow: hidden; }

        /* Header */
        .builder-header { display: flex; align-items: center; justify-content: space-between; height: 54px; padding: 0 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .logo { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 10px; color: white; }
        .project-info { display: flex; flex-direction: column; gap: 1px; }
        .project-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.95); }
        .project-label { font-size: 9px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .header-center { position: absolute; left: 50%; transform: translateX(-50%); }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .header-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.15s ease; }
        .header-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(139,92,246,0.4); color: rgba(255,255,255,0.9); }
        .header-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .header-btn svg { flex-shrink: 0; }
        .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.1); border-top-color: rgba(255,255,255,0.7); border-radius: 50%; animation: spin 0.8s linear infinite; }
        .status-badge { display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.7); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status-badge.ready .status-dot { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
        .status-badge.building .status-dot { background: #eab308; animation: pulse 1s infinite; }
        .status-badge.streaming .status-dot { background: #8b5cf6; animation: pulse 0.8s infinite; }

        /* Content */
        .builder-content { display: flex; flex: 1; min-height: 0; }
        .file-panel { width: 220px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.06); transition: width 0.4s cubic-bezier(0.4,0,0.2,1); }
        .editor-area { flex: 1; display: flex; min-width: 0; height: 100%; overflow: hidden; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .editor-panel, .preview-panel { display: flex; flex-direction: column; height: 100%; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .editor-panel.full, .preview-panel.full { flex: 1; }
        .editor-panel.split, .preview-panel.split { flex: 1; }
        .preview-panel.split { border-left: 1px solid rgba(255,255,255,0.06); }
        .editor-tabs { display: flex; height: 34px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .tab { display: flex; align-items: center; padding: 0 14px; border-top: 2px solid transparent; }
        .tab.active { background: #09090b; border-top-color: #8b5cf6; }
        .tab span { font-size: 11px; font-family: "SF Mono", Monaco, monospace; color: rgba(255,255,255,0.8); }
        .editor-content { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
        .editor-content.streaming { padding: 0; background: #0d0d10; height: 100%; position: relative; }
        .editor-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: rgba(255,255,255,0.25); font-size: 12px; }
        .editor-loading { display: flex; align-items: center; justify-content: center; height: 100%; background: #09090b; }
        .loading-pulse { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6, #6366f1); animation: pulse 1.5s infinite; }

        /* Projects Panel */
        .projects-panel { position: absolute; right: 0; top: 0; bottom: 0; width: 320px; z-index: 50; box-shadow: -8px 0 24px rgba(0,0,0,0.3); animation: slideIn 0.2s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Chat Panel */
        .chat-panel { position: relative; display: flex; flex-direction: column; width: 360px; min-width: 360px; background: linear-gradient(180deg, #0c0c0f 0%, #09090b 100%); border-left: 1px solid rgba(255,255,255,0.06); transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
        .chat-panel.minimized { width: 44px; min-width: 44px; }
        .chat-toggle { position: absolute; left: -11px; top: 50%; transform: translateY(-50%); width: 22px; height: 44px; background: linear-gradient(135deg, #1a1a1f, #0f0f12); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px 0 0 6px; color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: all 0.2s; }
        .chat-toggle:hover { background: linear-gradient(135deg, #252530, #1a1a1f); color: rgba(255,255,255,0.9); }
        .minimized-icon { flex: 1; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); }
        .chat-content { display: flex; flex-direction: column; height: 100%; }
        .chat-header { padding: 14px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .chat-header-left { display: flex; align-items: center; gap: 10px; }
        .alfred-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 10px; color: white; }
        .header-text { display: flex; flex-direction: column; gap: 1px; }
        .header-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.95); }
        .header-status { font-size: 10px; font-weight: 500; }
        .header-status.online { color: #22c55e; }
        .header-status.streaming { color: #8b5cf6; animation: blink 1.5s infinite; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 0 16px; }
        .chat-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; padding: 20px; }
        .welcome-icon { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08)); border: 1px solid rgba(139,92,246,0.2); border-radius: 18px; color: #8b5cf6; margin-bottom: 20px; }
        .chat-welcome h3 { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.95); margin: 0 0 6px; }
        .chat-welcome p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 24px; }
        .suggestions { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .suggestions button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: rgba(255,255,255,0.75); font-size: 13px; text-align: left; cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .suggestions button:hover { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.25); color: white; transform: translateX(3px); }

        /* Input Area - Properly contained in chat panel */
        .chat-input-area { padding: 14px 16px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); }
        .input-row { display: flex; align-items: flex-end; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 10px 12px; transition: border-color 0.2s; }
        .input-row:focus-within { border-color: rgba(139,92,246,0.4); }
        .input-row textarea { flex: 1; background: transparent; border: none; outline: none; color: rgba(255,255,255,0.95); font-size: 13px; font-family: inherit; resize: none; min-height: 20px; max-height: 100px; line-height: 1.5; }
        .input-row textarea::placeholder { color: rgba(255,255,255,0.35); }
        .btn-enhance, .btn-mic, .btn-send { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .btn-enhance { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
        .btn-enhance:hover { background: rgba(255,255,255,0.1); color: white; }
        .btn-mic { background: transparent; color: rgba(255,255,255,0.5); }
        .btn-mic:hover { color: white; }
        .btn-send { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .btn-send:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.4); }
        .btn-send:disabled, .btn-mic:disabled, .btn-enhance:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* Prompt Enhancer */
        .prompt-enhancer { background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
        .enhanced-text { margin: 0 0 10px; font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5; }
        .enhancer-actions { display: flex; align-items: center; gap: 8px; }
        .enhancer-hint { flex: 1; font-size: 10px; color: rgba(255,255,255,0.4); }
        .btn-dismiss, .btn-apply { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-dismiss { background: transparent; border: none; color: rgba(255,255,255,0.5); }
        .btn-dismiss:hover { color: white; }
        .btn-apply { background: white; border: none; color: black; font-weight: 600; }
        .btn-apply:hover { transform: translateY(-1px); }
        .enhancer-loading { display: flex; justify-content: center; gap: 4px; padding: 8px 0; }
        .enhancer-loading span { width: 5px; height: 5px; background: rgba(255,255,255,0.4); border-radius: 50%; animation: dot 1.2s infinite; }
        .enhancer-loading span:nth-child(2) { animation-delay: 0.15s; }
        .enhancer-loading span:nth-child(3) { animation-delay: 0.3s; }

        /* Recording UI */
        .recording-ui { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .recording-cancel, .recording-done { width: 38px; height: 38px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .recording-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
        .recording-cancel:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
        .recording-done { background: white; color: black; }
        .recording-done:hover { transform: scale(1.05); }
        .recording-visualizer { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
        .orb { width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.03s linear; }
        .orb-ring { position: absolute; inset: 0; border: 1.5px solid white; border-radius: 50%; transition: all 0.04s linear; pointer-events: none; }
        .orb-ring.r1 { inset: 4px; }
        .orb-ring.r2 { inset: -2px; }
        .transcribing { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0; color: rgba(255,255,255,0.5); font-size: 14px; }
        .dots { display: flex; gap: 3px; }
        .dots span { width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: dot 1.3s infinite; }
        .dots span:nth-child(2) { animation-delay: 0.15s; }
        .dots span:nth-child(3) { animation-delay: 0.3s; }

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
