'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  file: File;
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT INPUT COMPONENT — State of the Art Mobile Experience
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChatInput({ 
  onSend,
  onVoiceStart,
  onVoiceEnd,
  disabled = false,
  placeholder = "Ask anything...",
  isSignedIn = false,
  isAuthChecked = false,
  onSignIn,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // KEYBOARD HEIGHT DETECTION — Elegant rise animation
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Use visualViewport API for accurate keyboard detection
    const viewport = window.visualViewport;
    
    if (viewport) {
      const handleResize = () => {
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const newKeyboardHeight = windowHeight - viewportHeight;
        
        // Only update if keyboard is actually showing (> 100px difference)
        if (newKeyboardHeight > 100) {
          setKeyboardHeight(newKeyboardHeight);
        } else {
          setKeyboardHeight(0);
        }
      };

      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
      
      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleFocus = () => {
    setIsFocused(true);
    // Scroll to bottom smoothly when focused
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;

    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur(); // Close keyboard after send
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      file,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE RECORDING — OpenAI Style
  // ═══════════════════════════════════════════════════════════════════════════════

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (onVoiceEnd && audioChunksRef.current.length > 0) {
          onVoiceEnd(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onVoiceStart?.();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled;
  const showVoiceButton = message.trim().length === 0 && attachments.length === 0;

  return (
    <>
      <div 
        ref={containerRef}
        className={`chat-input-container ${isFocused ? 'focused' : ''}`}
        style={{ 
          transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : 'translateY(0)',
        }}
      >
        {/* Sign In Button — Only show after auth check complete, and not signed in */}
        {isAuthChecked && !isSignedIn && !isFocused && (
          <button className="sign-in-btn" onClick={onSignIn}>
            Sign In
          </button>
        )}

        <div className={`chat-input-wrapper ${isRecording ? 'recording' : ''}`}>
          {/* Recording UI */}
          {isRecording ? (
            <div className="recording-ui">
              <div className="recording-indicator">
                <div className="recording-dot" />
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </div>
              <div className="recording-waveform">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
              <div className="recording-actions">
                <button className="recording-cancel" onClick={cancelRecording} aria-label="Cancel recording">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
                <button className="recording-stop" onClick={stopRecording} aria-label="Stop and send">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="chat-input-attachments">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="chat-input-attachment">
                      {attachment.type === 'image' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      )}
                      <span>{attachment.name}</span>
                      <button
                        className="attachment-remove"
                        onClick={() => removeAttachment(attachment.id)}
                        aria-label="Remove attachment"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row */}
              <div className="chat-input-inner">
                <button
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  aria-label="Attach file"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.txt,.md,.json,.csv"
                />

                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={message}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  disabled={disabled}
                  rows={1}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  spellCheck="false"
                />

                {/* Voice or Send Button */}
                {showVoiceButton ? (
                  <button
                    className="voice-btn"
                    onClick={startRecording}
                    disabled={disabled}
                    aria-label="Start voice recording"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <path d="M12 19v4M8 23h8" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* GLOBAL MOBILE FIXES — No blue flash, no zoom                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-input-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 50;
          
          /* Smooth keyboard animation */
          transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          will-change: transform;
          
          /* Remove ALL tap highlights */
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          touch-action: manipulation;
        }
        
        .chat-input-container.focused {
          padding-bottom: 12px;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* SIGN IN BUTTON                                                                  */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sign-in-btn {
          padding: 10px 24px;
          border-radius: 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        
        .sign-in-btn:hover {
          background: var(--bg-elevated);
          border-color: var(--border-light);
        }
        
        .sign-in-btn:active {
          transform: scale(0.98);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* INPUT WRAPPER — Floating Glass                                                  */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-input-wrapper {
          width: 100%;
          max-width: 720px;
          background: var(--glass-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          box-shadow: var(--shadow-elevated);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
        }
        
        .chat-input-wrapper:focus-within {
          border-color: var(--border-light);
          box-shadow: 
            var(--shadow-elevated),
            0 0 0 1px var(--glow-white);
        }
        
        .chat-input-wrapper.recording {
          border-color: #ff4444;
          box-shadow: 
            0 0 0 1px rgba(255, 68, 68, 0.3),
            0 0 30px rgba(255, 68, 68, 0.15);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* RECORDING UI — OpenAI Style                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .recording-ui {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 16px;
        }
        
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .recording-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ff4444;
          animation: recordingPulse 1s ease-in-out infinite;
        }
        
        @keyframes recordingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        
        .recording-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          min-width: 45px;
        }
        
        .recording-waveform {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 32px;
        }
        
        .waveform-bar {
          width: 3px;
          height: 100%;
          background: var(--text-muted);
          border-radius: 2px;
          animation: waveformBounce 0.8s ease-in-out infinite;
        }
        
        @keyframes waveformBounce {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        
        .recording-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .recording-cancel,
        .recording-stop {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        
        .recording-cancel {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: transparent;
          border: 1px solid var(--border-default);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }
        
        .recording-cancel:hover {
          color: #ff4444;
          border-color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
        }
        
        .recording-cancel:active {
          transform: scale(0.95);
        }
        
        .recording-stop {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ff4444;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          transition: all 0.2s ease;
        }
        
        .recording-stop:hover {
          background: #ff5555;
        }
        
        .recording-stop:active {
          transform: scale(0.95);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* ATTACHMENTS                                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-input-attachments {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }
        
        .chat-input-attachment {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--border-subtle);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          transition: background 0.2s ease;
          
          -webkit-tap-highlight-color: transparent;
        }
        
        .attachment-remove {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--border-default);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .attachment-remove:hover {
          background: #ff4444;
          color: #fff;
        }
        
        .attachment-remove:active {
          transform: scale(0.9);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* INPUT ROW                                                                       */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-input-inner {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 14px 16px;
        }
        
        .attach-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid var(--border-default);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s ease;
          flex-shrink: 0;
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        
        .attach-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-light);
          background: var(--border-subtle);
        }
        
        .attach-btn:active {
          transform: scale(0.95);
        }
        
        .attach-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* TEXT INPUT — 16px prevents iOS zoom                                             */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          /* 16px minimum prevents iOS zoom on focus */
          font-size: 16px;
          color: var(--text-primary);
          resize: none;
          min-height: 24px;
          max-height: 200px;
          line-height: 1.5;
          transition: color 0.4s ease;
          
          /* Remove all tap/selection styling */
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          appearance: none;
        }
        
        .chat-input::placeholder {
          color: var(--text-muted);
          transition: color 0.4s ease;
        }
        
        /* Remove iOS input shadow */
        .chat-input:focus {
          outline: none;
          box-shadow: none;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* VOICE BUTTON — OpenAI Style                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .voice-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--text-primary);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bg-void);
          transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
          flex-shrink: 0;
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        
        .voice-btn:hover {
          box-shadow: 0 0 20px var(--glow-white-strong);
        }
        
        .voice-btn:active {
          transform: scale(0.95);
        }
        
        .voice-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* SEND BUTTON                                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .send-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--text-primary);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
          flex-shrink: 0;
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        
        .send-btn svg {
          width: 18px;
          height: 18px;
          color: var(--bg-void);
          transition: color 0.4s ease;
        }
        
        .send-btn:hover {
          box-shadow: 0 0 20px var(--glow-white-strong);
        }
        
        .send-btn:active {
          transform: scale(0.95);
        }
        
        .send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* RESPONSIVE                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .chat-input-container {
            padding: 16px;
            padding-bottom: max(16px, env(safe-area-inset-bottom));
          }
          
          .chat-input-container.focused {
            padding-bottom: 8px;
          }
          
          .chat-input-wrapper {
            border-radius: 20px;
          }
          
          .chat-input-inner {
            padding: 12px 14px;
            gap: 10px;
          }
          
          .attach-btn,
          .voice-btn,
          .send-btn {
            width: 40px;
            height: 40px;
          }
          
          .recording-ui {
            padding: 14px 16px;
          }
          
          /* Ensure 16px font on mobile */
          .chat-input {
            font-size: 16px;
          }
        }
        
        /* Extra small screens */
        @media (max-width: 380px) {
          .chat-input-inner {
            gap: 8px;
            padding: 10px 12px;
          }
          
          .attach-btn,
          .voice-btn,
          .send-btn {
            width: 38px;
            height: 38px;
          }
        }
      `}</style>
    </>
  );
}