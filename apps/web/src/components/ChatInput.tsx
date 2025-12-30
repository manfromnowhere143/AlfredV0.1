'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'code';
  name: string;
  file: File;
  size: number;
  preview?: string;
  base64?: string;
  url?: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  progress: number;
  error?: string;
  duration?: number;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: (audioBlob: Blob) => void;
  disabled?: boolean;
  placeholder?: string;
  isSignedIn?: boolean;
  isAuthChecked?: boolean;
  onSignIn?: () => void;
  conversationId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

const ACCENT_COLOR = '#C9B99A';
const ACCENT_COLOR_LIGHT = 'rgba(201, 185, 154, 0.2)';
const ACCENT_COLOR_GLOW = 'rgba(201, 185, 154, 0.4)';

const FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf'],
  code: ['text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css', 'application/json', 'text/javascript'],
};

const ALL_ACCEPT = [...FILE_TYPES.image, ...FILE_TYPES.video, ...FILE_TYPES.document, ...FILE_TYPES.code].join(',');

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getFileType = (mimeType: string): Attachment['type'] => {
  if (FILE_TYPES.image.includes(mimeType)) return 'image';
  if (FILE_TYPES.video.includes(mimeType)) return 'video';
  if (FILE_TYPES.document.includes(mimeType)) return 'document';
  return 'code';
};

const toDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve((reader.result as string).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const getVideoThumbnail = (file: File): Promise<{ preview: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration / 4); };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve({ preview: canvas.toDataURL('image/jpeg', 0.7), duration: video.duration });
      } else { reject(new Error('Canvas failed')); }
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error('Video load failed')); };
    video.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENT PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const isVideo = attachment.type === 'video';
  const hasPreview = !!attachment.preview;
  const isUploading = attachment.status === 'uploading';
  const isError = attachment.status === 'error';

  return (
    <div className={`attachment-item ${isError ? 'error' : ''}`}>
      <div className="attachment-thumb">
        {hasPreview ? (
          <>
            <img src={attachment.preview} alt={attachment.name} />
            {isVideo && (
              <div className="video-overlay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
                {attachment.duration && <span className="video-duration">{formatDuration(attachment.duration)}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="file-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
            </svg>
          </div>
        )}
        {isUploading && <div className="upload-overlay"><div className="upload-spinner" /></div>}
      </div>
      <div className="attachment-info">
        <span className="attachment-name">{attachment.name}</span>
        <span className="attachment-size">{isError ? attachment.error : formatSize(attachment.size)}</span>
      </div>
      <button className="attachment-remove" onClick={onRemove}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <style jsx>{`
        .attachment-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--input-bg, rgba(255,255,255,0.05)); border: 1px solid var(--input-border, rgba(255,255,255,0.1)); border-radius: 10px; }
        .attachment-item.error { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
        .attachment-thumb { width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
        .attachment-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .video-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
        .video-duration { font-size: 9px; font-weight: 500; color: white; }
        .file-icon { color: var(--text-muted, rgba(255,255,255,0.5)); }
        .upload-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; }
        .upload-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #C9B99A; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .attachment-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .attachment-name { font-size: 12px; font-weight: 500; color: var(--text-primary, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .attachment-size { font-size: 10px; color: var(--text-muted, rgba(255,255,255,0.5)); }
        .attachment-item.error .attachment-size { color: #ef4444; }
        .attachment-remove { width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .attachment-remove:hover { background: rgba(239,68,68,0.2); color: #ef4444; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChatInput({ 
  onSend, onVoiceStart, onVoiceEnd, disabled = false, placeholder = "Ask anything...",
  isSignedIn = false, isAuthChecked = false, onSignIn, conversationId,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(0.3));
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number>(0);
  const dragCountRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Keyboard detection
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const diff = window.innerHeight - viewport.height;
      setKeyboardHeight(diff > 100 ? diff : 0);
    };
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    };
  }, []);

  // Audio visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const bands = 16;
    const bandSize = Math.floor(dataArray.length / bands);
    const newLevels: number[] = [];
    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) sum += dataArray[i * bandSize + j];
      const avg = sum / bandSize;
      newLevels.push(0.1 + Math.pow(avg / 255, 0.7) * 0.9);
    }
    setAudioLevels(newLevels);
    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // File processing
  const processFiles = useCallback(async (files: File[]) => {
    if (!isSignedIn) { onSignIn?.(); return; }
    const slots = MAX_FILES - attachments.length;
    if (slots <= 0) return;
    const batch = files.slice(0, slots);
    
    for (const file of batch) {
      const id = uid();
      const type = getFileType(file.type);
      const entry: Attachment = { id, type, name: file.name, file, size: file.size, status: 'pending', progress: 0 };
      
      if (file.size > MAX_SIZE) {
        entry.status = 'error'; entry.error = 'File too large (max 50MB)';
        setAttachments(prev => [...prev, entry]); continue;
      }
      
      try {
        if (type === 'image') entry.preview = await toDataURL(file);
        else if (type === 'video') {
          const { preview, duration } = await getVideoThumbnail(file);
          entry.preview = preview; entry.duration = duration;
        }
      } catch {}
      
      setAttachments(prev => [...prev, entry]);
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'uploading', progress: 30 } : a));
      
      try {
        const form = new FormData();
        form.append('file', file);
        if (conversationId) form.append('conversationId', conversationId);
        const res = await fetch('/api/files/upload', { method: 'POST', body: form });
        if (res.ok) {
          const data = await res.json();
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, id: data.id, url: data.url, base64: data.base64, status: 'ready', progress: 100 } : a));
        } else {
          const base64 = await toBase64(file);
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, base64, status: 'ready', progress: 100 } : a));
        }
      } catch {
        try {
          const base64 = await toBase64(file);
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, base64, status: 'ready', progress: 100 } : a));
        } catch {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error: 'Upload failed' } : a));
        }
      }
    }
  }, [attachments.length, isSignedIn, onSignIn, conversationId]);

  const removeAttachment = (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    if (attachment?.url) fetch(`/api/files/upload?id=${id}`, { method: 'DELETE' }).catch(() => {});
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = () => {
    const trimmed = message.trim();
    const ready = attachments.filter(a => a.status === 'ready');
    if (!trimmed && ready.length === 0) return;
    if (disabled) return;
    onSend(trimmed, ready.length > 0 ? ready : undefined);
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.blur(); }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current++; if (e.dataTransfer.items.length) setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current--; if (dragCountRef.current === 0) setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current = 0; setIsDragging(false); const files = Array.from(e.dataTransfer.files); if (files.length) processFiles(files); };
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];
    for (const item of items) { if (item.kind === 'file') { const file = item.getAsFile(); if (file) files.push(file); } }
    if (files.length) { e.preventDefault(); processFiles(files); }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE RECORDING - Uses Groq/OpenAI Whisper for transcription
  // ═══════════════════════════════════════════════════════════════════════════════

  const startRecording = async () => {
    console.log('[Voice] Starting...');
    setVoiceError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      console.log('[Voice] ✓ Microphone granted');
      streamRef.current = stream;

      // Audio visualization
      audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.5;
      source.connect(analyserRef.current);

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(500);

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      onVoiceStart?.();

      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      requestAnimationFrame(analyzeAudio);
      console.log('[Voice] ✓ Recording started');

    } catch (err: any) {
      console.error('[Voice] Error:', err);
      setVoiceError(err.name === 'NotAllowedError' ? 'Microphone access denied' : `Error: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    console.log('[Voice] Stopping...');
    isRecordingRef.current = false;
    setIsRecording(false);

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    cancelAnimationFrame(animationRef.current);

    // Get audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) { resolve(); return; }
        mediaRecorderRef.current.onstop = () => resolve();
        mediaRecorderRef.current.stop();
      });
    }

    // Stop mic
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current?.state !== 'closed') await audioContextRef.current?.close();
    setAudioLevels(new Array(16).fill(0.3));

    // Transcribe
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('[Voice] Audio size:', (audioBlob.size / 1024).toFixed(1), 'KB');
      onVoiceEnd?.(audioBlob);
      await transcribeAudio(audioBlob);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    console.log('[Voice] Transcribing...');
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await response.json();
      
      if (data.text) {
        console.log('[Voice] ✓ Transcribed:', data.text);
        setMessage(prev => (prev.trim() ? prev + ' ' : '') + data.text);
      } else if (data.message) {
        console.log('[Voice] Info:', data.message);
      }
    } catch (err) {
      console.error('[Voice] Transcription error:', err);
    } finally {
      setIsTranscribing(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const cancelRecording = () => {
    console.log('[Voice] Cancelling...');
    isRecordingRef.current = false;
    setIsRecording(false);
    audioChunksRef.current = [];
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    setAudioLevels(new Array(16).fill(0.3));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const canSend = (message.trim().length > 0 || attachments.some(a => a.status === 'ready')) && !disabled && !isRecording && !isTranscribing;
  const showVoiceButton = message.trim().length === 0 && attachments.length === 0;
  const isUploading = attachments.some(a => a.status === 'uploading');

  return (
    <>
      <div 
        className={`chat-input-container ${isFocused ? 'focused' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'translateY(0)' }}
        onDragEnter={handleDragEnter} onDragOver={(e) => e.preventDefault()} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {isAuthChecked && !isSignedIn && !isFocused && (
          <button className="sign-in-btn" onClick={onSignIn}>Sign In</button>
        )}

        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Drop files here</span>
            </div>
          </div>
        )}

        {voiceError && (
          <div className="voice-error">
            <span>{voiceError}</span>
            <button onClick={() => setVoiceError(null)}>×</button>
          </div>
        )}

        <div className={`chat-input-wrapper ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}>
          {isRecording ? (
            <div className="recording-ui">
              <div className="recording-indicator">
                <div className="recording-dot" />
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </div>
              <div className="recording-waveform">
                {audioLevels.map((level, i) => (
                  <div key={i} className="waveform-bar" style={{ height: `${level * 100}%` }} />
                ))}
              </div>
              <div className="recording-actions">
                <button className="recording-cancel" onClick={cancelRecording}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
                <button className="recording-stop" onClick={stopRecording}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : isTranscribing ? (
            <div className="transcribing-ui">
              <div className="transcribing-spinner" />
              <span>Transcribing...</span>
            </div>
          ) : (
            <>
              {attachments.length > 0 && (
                <div className="attachments-container">
                  {attachments.map(a => <AttachmentPreview key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />)}
                </div>
              )}
              <div className="chat-input-inner">
                <button className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={disabled || attachments.length >= MAX_FILES}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} accept={ALL_ACCEPT} style={{ display: 'none' }} />
                <textarea
                  ref={textareaRef} className="chat-input" value={message}
                  onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                  onPaste={handlePaste} placeholder={placeholder} disabled={disabled} rows={1}
                />
                {showVoiceButton ? (
                  <button className="voice-btn" onClick={startRecording} disabled={disabled}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <path d="M12 19v4M8 23h8" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <button className="send-btn" onClick={handleSend} disabled={!canSend || isUploading}>
                    {isUploading ? <div className="send-spinner" /> : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .chat-input-container { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; padding-bottom: max(20px, env(safe-area-inset-bottom)); background: transparent; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 50; transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .drag-overlay { position: absolute; inset: 10px; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; border-radius: 20px; border: 2px dashed ${ACCENT_COLOR}; }
        .drag-content { display: flex; flex-direction: column; align-items: center; gap: 12px; color: ${ACCENT_COLOR}; }
        .drag-content span { font-size: 16px; font-weight: 500; }
        .voice-error { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; color: #ef4444; font-size: 13px; max-width: 720px; width: 100%; }
        .voice-error span { flex: 1; }
        .voice-error button { background: none; border: none; color: #ef4444; font-size: 20px; cursor: pointer; padding: 0; line-height: 1; }
        .sign-in-btn { padding: 10px 20px; border-radius: 20px; background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
        .chat-input-wrapper { width: 100%; max-width: 720px; background: rgba(255,255,255,0.05); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; overflow: hidden; transition: all 0.3s ease; }
        .chat-input-wrapper:focus-within { border-color: rgba(255,255,255,0.2); }
        .chat-input-wrapper.recording { border-color: ${ACCENT_COLOR}; box-shadow: 0 0 0 2px ${ACCENT_COLOR_LIGHT}, 0 0 30px ${ACCENT_COLOR_LIGHT}; }
        .chat-input-wrapper.transcribing { border-color: ${ACCENT_COLOR}; }
        .attachments-container { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; max-height: 180px; overflow-y: auto; }
        .chat-input-inner { display: flex; align-items: flex-end; gap: 12px; padding: 14px 16px; }
        .attach-btn { width: 40px; height: 40px; border-radius: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); flex-shrink: 0; transition: all 0.2s ease; }
        .attach-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
        .attach-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .chat-input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 16px; color: #fff; resize: none; min-height: 24px; max-height: 200px; line-height: 1.5; }
        .chat-input::placeholder { color: rgba(255,255,255,0.5); }
        .voice-btn, .send-btn { width: 44px; height: 44px; border-radius: 50%; background: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000; flex-shrink: 0; transition: all 0.2s ease; }
        .send-btn svg { width: 18px; height: 18px; }
        .voice-btn:hover, .send-btn:hover { box-shadow: 0 0 20px rgba(255,255,255,0.2); transform: scale(1.05); }
        .voice-btn:disabled, .send-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
        .send-spinner { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .recording-ui { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 16px; }
        .recording-indicator { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .recording-dot { width: 12px; height: 12px; border-radius: 50%; background: ${ACCENT_COLOR}; animation: pulse 1.5s ease-in-out infinite; box-shadow: 0 0 10px ${ACCENT_COLOR_GLOW}; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }
        .recording-time { font-family: 'SF Mono', monospace; font-size: 15px; font-weight: 500; color: ${ACCENT_COLOR}; min-width: 45px; }
        .recording-waveform { flex: 1; display: flex; align-items: center; justify-content: center; gap: 3px; height: 36px; }
        .waveform-bar { width: 4px; min-height: 4px; background: ${ACCENT_COLOR}; border-radius: 2px; transition: height 0.05s ease-out; box-shadow: 0 0 6px ${ACCENT_COLOR_LIGHT}; }
        .recording-actions { display: flex; gap: 12px; flex-shrink: 0; }
        .recording-cancel { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); transition: all 0.2s ease; }
        .recording-cancel:hover { color: rgba(255,255,255,0.9); border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); }
        .recording-stop { width: 44px; height: 44px; border-radius: 50%; background: ${ACCENT_COLOR}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #1a1a1a; transition: all 0.2s ease; box-shadow: 0 0 20px ${ACCENT_COLOR_LIGHT}; }
        .recording-stop:hover { transform: scale(1.05); box-shadow: 0 0 30px ${ACCENT_COLOR_GLOW}; }
        .transcribing-ui { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; color: ${ACCENT_COLOR}; }
        .transcribing-spinner { width: 20px; height: 20px; border: 2px solid ${ACCENT_COLOR_LIGHT}; border-top-color: ${ACCENT_COLOR}; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .transcribing-ui span { font-size: 14px; font-weight: 500; }
        @media (max-width: 768px) { .chat-input-container { padding: 16px; } .chat-input-wrapper { border-radius: 20px; } .chat-input-inner { padding: 12px 14px; gap: 10px; } .attach-btn, .voice-btn, .send-btn { width: 40px; height: 40px; } .recording-ui { padding: 14px 16px; gap: 12px; } }
      `}</style>
    </>
  );
}