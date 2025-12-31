'use client';

import { upload } from '@vercel/blob/client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHAT INPUT COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A state-of-the-art chat input component with:
 * - Text input with auto-resize
 * - File attachments (drag & drop, paste, click)
 * - Voice recording with real-time visualization
 * - AI-powered transcription (Groq/OpenAI Whisper)
 * - Mobile-first responsive design
 * - Accessibility support
 * 
 * @author Alfred AI
 * @version 2.0.0
 */

import { 
  useState, 
  useRef, 
  useEffect, 
  useCallback,
  type KeyboardEvent, 
  type ChangeEvent,
  type DragEvent,
  type ClipboardEvent,
} from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
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

export interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (message: string, attachments?: Attachment[]) => void;
  /** Callback when voice recording starts */
  onVoiceStart?: () => void;
  /** Callback when voice recording ends with audio blob */
  onVoiceEnd?: (audioBlob: Blob) => void;
  /** Disable all input */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** User authentication state */
  isSignedIn?: boolean;
  /** Whether auth check is complete */
  isAuthChecked?: boolean;
  /** Callback for sign in action */
  onSignIn?: () => void;
  /** Current conversation ID for file uploads */
  conversationId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  MAX_FILES: 10,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  WAVEFORM_BARS: 40,
  WAVEFORM_SMOOTHING: 0.92, // Faster response
  TEXTAREA_MAX_HEIGHT: 200,
} as const;

const SUPPORTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf'],
  code: [
    'text/plain', 
    'text/markdown', 
    'text/csv', 
    'text/html', 
    'text/css', 
    'application/json', 
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'application/typescript',
  ],
} as const;

const ALL_ACCEPTED_TYPES = [
  ...SUPPORTED_FILE_TYPES.image,
  ...SUPPORTED_FILE_TYPES.video,
  ...SUPPORTED_FILE_TYPES.document,
  ...SUPPORTED_FILE_TYPES.code,
].join(',');

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Format bytes to human readable size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, exponent)).toFixed(1);
  return `${size} ${units[exponent]}`;
};

/**
 * Format seconds to MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Determine file type from MIME type
 */
const getFileType = (mimeType: string): Attachment['type'] => {
  if (SUPPORTED_FILE_TYPES.image.some(t => mimeType.includes(t.split('/')[1]))) return 'image';
  if (SUPPORTED_FILE_TYPES.video.some(t => mimeType.includes(t.split('/')[1]))) return 'video';
  if (SUPPORTED_FILE_TYPES.document.includes(mimeType as any)) return 'document';
  return 'code';
};

/**
 * Convert file to data URL
 */
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert file to base64 string (without data URL prefix)
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extract video thumbnail and duration
 */
const extractVideoMetadata = (file: File): Promise<{ preview: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const preview = canvas.toDataURL('image/jpeg', 0.8);
      
      cleanup();
      resolve({ preview, duration: video.duration });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attachment Preview Component
 */
interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
}

function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const isVideo = attachment.type === 'video';
  const hasPreview = Boolean(attachment.preview);
  const isUploading = attachment.status === 'uploading';
  const isError = attachment.status === 'error';

  return (
    <div className={`attachment-preview ${isError ? 'attachment-preview--error' : ''}`}>
      {/* Thumbnail */}
      <div className="attachment-preview__thumb">
        {hasPreview ? (
          <>
            <img 
              src={attachment.preview} 
              alt={attachment.name}
              className="attachment-preview__image"
            />
            {isVideo && (
              <div className="attachment-preview__video-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                {attachment.duration !== undefined && (
                  <span>{formatDuration(Math.floor(attachment.duration))}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="attachment-preview__icon">
            {attachment.type === 'document' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="16 18 22 18 22 12" />
                <polyline points="8 6 2 6 2 12" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
            )}
          </div>
        )}

        {/* Upload overlay */}
        {isUploading && (
          <div className="attachment-preview__upload-overlay">
            <div className="attachment-preview__spinner" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="attachment-preview__info">
        <span className="attachment-preview__name">{attachment.name}</span>
        <span className={`attachment-preview__meta ${isError ? 'attachment-preview__meta--error' : ''}`}>
          {isError ? attachment.error : formatFileSize(attachment.size)}
        </span>
      </div>

      {/* Remove button */}
      <button 
        className="attachment-preview__remove"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <style jsx>{`
        .attachment-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          transition: border-color 0.2s ease;
        }

        .attachment-preview:hover {
          border-color: rgba(0, 0, 0, 0.15);
        }

        .attachment-preview--error {
          background: rgba(255, 59, 48, 0.06);
          border-color: rgba(255, 59, 48, 0.15);
        }

        .attachment-preview__thumb {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .attachment-preview__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .attachment-preview__video-badge {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: white;
          font-size: 9px;
          font-weight: 500;
        }

        .attachment-preview__icon {
          color: rgba(0, 0, 0, 0.3);
        }

        .attachment-preview__upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .attachment-preview__spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .attachment-preview__info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .attachment-preview__name {
          font-size: 12px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .attachment-preview__meta {
          font-size: 10px;
          color: rgba(0, 0, 0, 0.4);
        }

        .attachment-preview__meta--error {
          color: #ff453a;
        }

        .attachment-preview__remove {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .attachment-preview__remove:hover {
          background: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.7);
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .attachment-preview {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.06);
          }

          .attachment-preview:hover {
            border-color: rgba(255, 255, 255, 0.1);
          }

          .attachment-preview__thumb {
            background: rgba(255, 255, 255, 0.04);
          }

          .attachment-preview__icon {
            color: rgba(255, 255, 255, 0.3);
          }

          .attachment-preview__name {
            color: rgba(255, 255, 255, 0.85);
          }

          .attachment-preview__meta {
            color: rgba(255, 255, 255, 0.35);
          }

          .attachment-preview__remove {
            background: rgba(255, 255, 255, 0.04);
            color: rgba(255, 255, 255, 0.4);
          }

          .attachment-preview__remove:hover {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.8);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Waveform Visualizer Component
 */
interface WaveformVisualizerProps {
  levels: number[];
  isActive: boolean;
  isInitializing?: boolean;
}

function WaveformVisualizer({ levels, isActive, isInitializing = false }: WaveformVisualizerProps) {
  return (
    <div className={`waveform ${isInitializing ? 'waveform--initializing' : ''}`}>
      {levels.map((level, index) => (
        <div
          key={index}
          className="waveform__bar"
          style={{
            height: isInitializing ? '20%' : `${Math.max(4, level * 100)}%`,
            opacity: isActive ? 0.4 + level * 0.6 : 0.3,
            animationDelay: isInitializing ? `${index * 30}ms` : '0ms',
          }}
        />
      ))}

      <style jsx>{`
        .waveform {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          height: 32px;
          width: 100%;
        }

        .waveform__bar {
          width: 3px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 1.5px;
          transition: height 0.05s ease-out;
        }

        .waveform--initializing .waveform__bar {
          animation: initWave 1s ease-in-out infinite;
        }

        @keyframes initWave {
          0%, 100% { 
            height: 20%;
            opacity: 0.3;
          }
          50% { 
            height: 50%;
            opacity: 0.6;
          }
        }

        @media (prefers-color-scheme: dark) {
          .waveform__bar {
            background: rgba(255, 255, 255, 0.4);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Processing Indicator Component
 */
function ProcessingIndicator() {
  return (
    <div className="processing">
      <span className="processing__text">Processing</span>
      <div className="processing__dots">
        <span />
        <span />
        <span />
      </div>

      <style jsx>{`
        .processing {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 24px 16px;
          color: rgba(0, 0, 0, 0.45);
          font-size: 17px;
          font-weight: 400;
        }

        .processing__dots {
          display: flex;
          gap: 3px;
          margin-left: 2px;
        }

        .processing__dots span {
          width: 4px;
          height: 4px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse 1.3s ease-in-out infinite;
        }

        .processing__dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .processing__dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }

        .processing__text {
          letter-spacing: -0.01em;
        }

        @media (prefers-color-scheme: dark) {
          .processing {
            color: rgba(255, 255, 255, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChatInput({
  onSend,
  onVoiceStart,
  onVoiceEnd,
  disabled = false,
  placeholder = "Message Alfred...",
  isSignedIn = false,
  isAuthChecked = false,
  onSignIn,
  conversationId,
}: ChatInputProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    new Array(CONFIG.WAVEFORM_BARS).fill(0)
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Smart Enhancement State
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [enhancedText, setEnhancedText] = useState('');
  const [detectedIntent, setDetectedIntent] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [customInstruction, setCustomInstruction] = useState('');

  // Debug enhancer state
  useEffect(() => {
    console.log('[Enhancer State]', { showEnhancer, isEnhancing, originalText: originalText.slice(0, 20), enhancedText: enhancedText.slice(0, 20) });
  }, [showEnhancer, isEnhancing, originalText, enhancedText]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────────────
  
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  // Handle mobile keyboard - State-of-the-art iOS-style approach
  // Uses bottom positioning instead of transforms to avoid disturbing other elements
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    // Track if keyboard is actually open (not just viewport resize from rotation)
    let lastHeight = viewport.height;
    let isKeyboardOpen = false;

    const updatePosition = () => {
      // Calculate keyboard height from viewport
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const viewportOffsetTop = viewport.offsetTop;
      
      // The keyboard height is the difference, but only if it's significant
      const heightDiff = windowHeight - viewportHeight - viewportOffsetTop;
      const newKeyboardHeight = heightDiff > 100 ? heightDiff : 0;
      
      // Detect if keyboard just opened or closed
      const keyboardJustOpened = newKeyboardHeight > 0 && !isKeyboardOpen;
      const keyboardJustClosed = newKeyboardHeight === 0 && isKeyboardOpen;
      
      isKeyboardOpen = newKeyboardHeight > 0;
      
      // Update CSS variable for bottom positioning (not transform!)
      document.documentElement.style.setProperty('--keyboard-height', `${newKeyboardHeight}px`);
      
      // On iOS Safari, we also need to handle the viewport offset
      document.documentElement.style.setProperty('--viewport-offset', `${viewportOffsetTop}px`);
      
      setKeyboardHeight(newKeyboardHeight);
      lastHeight = viewportHeight;
    };

    // Initial check
    updatePosition();

    // Use both resize and scroll events for iOS Safari compatibility
    viewport.addEventListener('resize', updatePosition);
    viewport.addEventListener('scroll', updatePosition);
    
    // Also listen for focus/blur on inputs for immediate response
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        // Small delay to let iOS calculate keyboard height
        setTimeout(updatePosition, 100);
        setTimeout(updatePosition, 300);
      }
    };
    
    const handleFocusOut = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        // Reset after keyboard closes
        setTimeout(updatePosition, 100);
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      viewport.removeEventListener('resize', updatePosition);
      viewport.removeEventListener('scroll', updatePosition);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.documentElement.style.setProperty('--viewport-offset', '0px');
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, CONFIG.TEXTAREA_MAX_HEIGHT)}px`;
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cancelAnimationFrame(animationRef.current);
      
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio Analysis
  // ─────────────────────────────────────────────────────────────────────────────

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bands = CONFIG.WAVEFORM_BARS;
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
        prevLevel * (1 - CONFIG.WAVEFORM_SMOOTHING) + newLevels[i] * CONFIG.WAVEFORM_SMOOTHING
      )
    );

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // File Handling
  // ─────────────────────────────────────────────────────────────────────────────

  const processFiles = useCallback(async (files: File[]) => {
    if (!isSignedIn) {
      onSignIn?.();
      return;
    }

    const availableSlots = CONFIG.MAX_FILES - attachments.length;
    if (availableSlots <= 0) return;

    const filesToProcess = files.slice(0, availableSlots);

    for (const file of filesToProcess) {
      const id = generateId();
      const type = getFileType(file.type);

      const attachment: Attachment = {
        id,
        type,
        name: file.name,
        file,
        size: file.size,
        status: 'pending',
        progress: 0,
      };

      // Check file size
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        attachment.status = 'error';
        attachment.error = 'File too large (max 50MB)';
        setAttachments(prev => [...prev, attachment]);
        continue;
      }

      // Add attachment immediately (non-blocking UI)
      setAttachments(prev => [...prev, { ...attachment, status: 'uploading', progress: 10 }]);

      // Instant preview using createObjectURL (no file reading needed)
      const instantPreview = URL.createObjectURL(file);
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, preview: instantPreview } : a));

      // Start upload immediately (parallel with preview)
      setAttachments(prev =>
        prev.map(a => a.id === id ? { ...a, progress: 30 } : a)
      );

      try {
        const IS_LARGE_FILE = file.size > 4 * 1024 * 1024; // 4MB threshold
        
        let uploadResult: { id: string; url: string; base64?: string } | null = null;
        
        if (IS_LARGE_FILE) {
          // Client-side direct upload to Vercel Blob (bypasses API body limit)
          const blob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/files/token',
          });
          
          // Register file in database
          const registerRes = await fetch('/api/files/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: blob.url,
              name: file.name,
              type: file.type,
              size: file.size,
              conversationId,
            }),
          });
          
          if (registerRes.ok) {
            uploadResult = await registerRes.json();
          }
        } else {
          // Small files go through API (faster, includes optimization)
          const formData = new FormData();
          formData.append('file', file);
          if (conversationId) {
            formData.append('conversationId', conversationId);
          }

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            uploadResult = await response.json();
          }
        }
        
        const response = { ok: !!uploadResult };

        if (response.ok && uploadResult) {
          setAttachments(prev =>
            prev.map(a => a.id === id ? {
              ...a,
              id: uploadResult!.id,
              url: uploadResult!.url,
              base64: uploadResult!.base64,
              status: 'ready',
              progress: 100,
            } : a)
          );
        } else {
          // Fallback to base64
          const base64 = await fileToBase64(file);
          setAttachments(prev =>
            prev.map(a => a.id === id ? {
              ...a,
              base64,
              status: 'ready',
              progress: 100,
            } : a)
          );
        }
      } catch (error) {
        console.error('Upload failed:', error);
        
        // Try base64 fallback
        try {
          const base64 = await fileToBase64(file);
          setAttachments(prev =>
            prev.map(a => a.id === id ? {
              ...a,
              base64,
              status: 'ready',
              progress: 100,
            } : a)
          );
        } catch {
          setAttachments(prev =>
            prev.map(a => a.id === id ? {
              ...a,
              status: 'error',
              error: 'Upload failed',
            } : a)
          );
        }
      }
    }
  }, [attachments.length, isSignedIn, onSignIn, conversationId]);

  const removeAttachment = useCallback((id: string) => {
    const attachment = attachments.find(a => a.id === id);
    
    // Delete from server if uploaded
    if (attachment?.url) {
      fetch(`/api/files/upload?id=${id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, [attachments]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Voice Recording
  // ─────────────────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    setVoiceError(null);
    
    // Show UI immediately (optimistic)
    setIsInitializing(true);
    setIsRecording(true);
    isRecordingRef.current = true;

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      analyserRef.current.smoothingTimeConstant = 0.4;
      source.connect(analyserRef.current);

      // Setup media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording - mic is ready!
      mediaRecorder.start(500);
      setIsInitializing(false);
      setRecordingTime(0);
      onVoiceStart?.();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualization
      requestAnimationFrame(analyzeAudio);

    } catch (error: any) {
      console.error('Recording failed:', error);
      
      // Revert optimistic UI
      setIsInitializing(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      
      if (error.name === 'NotAllowedError') {
        setVoiceError('Microphone access denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        setVoiceError('No microphone found. Please connect a microphone.');
      } else {
        setVoiceError(`Recording failed: ${error.message}`);
      }
    }
  };

  const stopRecording = async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animation
    cancelAnimationFrame(animationRef.current);

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve();
          return;
        }
        mediaRecorderRef.current.onstop = () => resolve();
        mediaRecorderRef.current.stop();
      });
    }

    // Stop microphone
    streamRef.current?.getTracks().forEach(track => track.stop());

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      await audioContextRef.current?.close();
    }

    // Reset visualization
    setAudioLevels(new Array(CONFIG.WAVEFORM_BARS).fill(0));

    // Process audio
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onVoiceEnd?.(audioBlob);
      await transcribeAudio(audioBlob);
    }
  };

  const cancelRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsInitializing(false);
    audioChunksRef.current = [];

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    cancelAnimationFrame(animationRef.current);

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    streamRef.current?.getTracks().forEach(track => track.stop());

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    setAudioLevels(new Array(CONFIG.WAVEFORM_BARS).fill(0));
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.text) {
        const newText = data.text;
        setOriginalText(newText);
        setMessage(newText);
        
        // Auto-enhance the transcription
        await enhancePrompt(newText);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setIsTranscribing(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // SMART PROMPT ENHANCEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  const enhancePrompt = async (text: string) => {
    console.log('[Enhancer] Starting enhancement for:', text);
    
    // Always show enhancer immediately
    setShowEnhancer(true);
    setIsEnhancing(true);
    setOriginalText(text);
    setEnhancedText(''); // Clear previous
    setDetectedIntent('');
    setSuggestions([]);
    
    console.log('[Enhancer] State set, showEnhancer should be true');
    
    try {
      console.log('[Enhancer] Fetching /api/optimize...');
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode: 'enhance' }),
      });

      console.log('[Enhancer] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Enhancer] Response data:', data);
      
      if (data.skipped) {
        // Simple message - show it anyway with a note
        setEnhancedText(text);
        setDetectedIntent('Simple message - already clear');
      } else if (data.enhanced) {
        setEnhancedText(data.enhanced);
        setDetectedIntent(data.intent || '');
        setSuggestions(data.suggestions || []);
      } else {
        // Fallback
        setEnhancedText(text);
        setDetectedIntent('Enhancement complete');
      }
    } catch (error) {
      console.error('[Enhancer] Error:', error);
      // Fallback: show original in both places
      setEnhancedText(text);
      setDetectedIntent('Enhancement unavailable - using original');
    } finally {
      setIsEnhancing(false);
      console.log('[Enhancer] Done, isEnhancing set to false');
    }
  };

  // Custom refinement with instruction
  const refineWithInstruction = async () => {
    if (!customInstruction.trim() || !message.trim()) return;
    
    setIsEnhancing(true);
    
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          instruction: customInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error('Refine API error');
      }

      const data = await response.json();
      
      if (data.refined) {
        setEnhancedText(data.refined);
        setOriginalText(message);
      }
    } catch (error) {
      console.error('Refinement failed:', error);
      // Keep showing current state
    } finally {
      setIsEnhancing(false);
      setCustomInstruction('');
    }
  };

  // Use the original text
  const useOriginal = () => {
    setMessage(originalText);
    setShowEnhancer(false);
    resetEnhancer();
    textareaRef.current?.focus();
  };

  // Use the enhanced text
  const useEnhanced = () => {
    setMessage(enhancedText || originalText);
    setShowEnhancer(false);
    resetEnhancer();
    textareaRef.current?.focus();
  };

  // Apply a quick suggestion
  const applySuggestion = (suggestion: string) => {
    const newText = message + ' ' + suggestion;
    setMessage(newText);
    setOriginalText(newText);
    enhancePrompt(newText);
  };

  // Reset enhancer state
  const resetEnhancer = () => {
    setOriginalText('');
    setEnhancedText('');
    setDetectedIntent('');
    setSuggestions([]);
    setCustomInstruction('');
  };

  // Cancel enhancement
  const cancelEnhancer = () => {
    setShowEnhancer(false);
    resetEnhancer();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSend = () => {
    const trimmedMessage = message.trim();
    const readyAttachments = attachments.filter(a => a.status === 'ready');

    if (!trimmedMessage && readyAttachments.length === 0) return;
    if (disabled) return;

    onSend(trimmedMessage, readyAttachments.length > 0 ? readyAttachments : undefined);
    
    setMessage('');
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────

  const canSend = (
    (message.trim().length > 0 || attachments.some(a => a.status === 'ready')) &&
    !disabled &&
    !isRecording &&
    !isTranscribing
  );

  const showVoiceButton = message.trim().length === 0 && attachments.length === 0;
  const isUploading = attachments.some(a => a.status === 'uploading');

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`chat-input ${isDragging ? 'chat-input--dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Sign In Button */}
        {isAuthChecked && !isSignedIn && !isFocused && (
          <button className="chat-input__sign-in" onClick={onSignIn}>
            Sign In
          </button>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="chat-input__drag-overlay">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop files here</span>
          </div>
        )}

        {/* Voice Error */}
        {voiceError && (
          <div className="chat-input__error">
            <span>{voiceError}</span>
            <button onClick={() => setVoiceError(null)} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {/* Main Input Container */}
        <div className={`chat-input__container ${isRecording ? 'chat-input__container--recording' : ''} ${isTranscribing ? 'chat-input__container--transcribing' : ''}`}>
          
          {/* Minimal Elegant Enhancer - Floating Above */}
          {showEnhancer && (
            <div className="prompt-enhance">
              <div className="prompt-enhance__card">
                {/* Loading */}
                {isEnhancing ? (
                  <div className="prompt-enhance__loading">
                    <span className="prompt-enhance__dot" />
                    <span className="prompt-enhance__dot" />
                    <span className="prompt-enhance__dot" />
                  </div>
                ) : (
                  <>
                    {/* Enhanced Text */}
                    <p className="prompt-enhance__text">{enhancedText || originalText}</p>
                    
                    {/* Subtle divider */}
                    <div className="prompt-enhance__divider" />
                    
                    {/* Actions Row */}
                    <div className="prompt-enhance__row">
                      <span className="prompt-enhance__hint">Enhanced from your input</span>
                      <div className="prompt-enhance__actions">
                        <button 
                          className="prompt-enhance__btn prompt-enhance__btn--dismiss"
                          onClick={useOriginal}
                        >
                          Dismiss
                        </button>
                        <button 
                          className="prompt-enhance__btn prompt-enhance__btn--apply"
                          onClick={useEnhanced}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Recording UI - Unique Pulsing Orb Visualizer */}
          {isRecording ? (
            <div className="chat-input__recording">
              {/* Cancel button */}
              <button
                className="chat-input__recording-cancel"
                onClick={cancelRecording}
                aria-label="Cancel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>

              {/* Center - Pulsing Orb Visualizer */}
              <div className="chat-input__recording-center">
                <div className="chat-input__orb-container">
                  {/* The breathing orb */}
                  <div 
                    className="chat-input__orb"
                    style={{
                      transform: `scale(${1 + (audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length) * 0.5})`,
                    }}
                  />
                  {/* Ripple rings */}
                  <div 
                    className="chat-input__orb-ring chat-input__orb-ring--1"
                    style={{
                      transform: `scale(${1.3 + (audioLevels[5] || 0) * 0.4})`,
                      opacity: 0.15 + (audioLevels[5] || 0) * 0.2,
                    }}
                  />
                  <div 
                    className="chat-input__orb-ring chat-input__orb-ring--2"
                    style={{
                      transform: `scale(${1.6 + (audioLevels[15] || 0) * 0.5})`,
                      opacity: 0.08 + (audioLevels[15] || 0) * 0.15,
                    }}
                  />
                </div>
              </div>

              {/* Send button */}
              <button
                className="chat-input__recording-send"
                onClick={stopRecording}
                aria-label="Done"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          ) : isTranscribing ? (
            <ProcessingIndicator />
          ) : (
            <>
              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="chat-input__attachments">
                  {attachments.map(attachment => (
                    <AttachmentPreview
                      key={attachment.id}
                      attachment={attachment}
                      onRemove={() => removeAttachment(attachment.id)}
                    />
                  ))}
                </div>
              )}

              {/* Input Row */}
              <div className="chat-input__row">
                {/* Attach Button */}
                <button
                  className="chat-input__btn chat-input__btn--attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || attachments.length >= CONFIG.MAX_FILES}
                  aria-label="Attach files"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept={ALL_ACCEPTED_TYPES}
                  style={{ display: 'none' }}
                />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  className="chat-input__textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  disabled={disabled}
                  rows={1}
                  aria-label="Message input"
                />

                {/* Enhance Button - Show when there's text */}
                {message.trim() && !showEnhancer && (
                  <button
                    className="chat-input__btn chat-input__btn--refine"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[Enhancer] Button clicked, message:', message);
                      enhancePrompt(message);
                    }}
                    disabled={disabled || isEnhancing}
                    aria-label="Enhance with Alfred"
                    title="Enhance prompt"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.5 2L10.5 5L13.5 6L10.5 7L9.5 10L8.5 7L5.5 6L8.5 5L9.5 2Z" />
                      <path d="M19 8L20 10L22 11L20 12L19 14L18 12L16 11L18 10L19 8Z" />
                      <path d="M14.5 14L15.5 17L18.5 18L15.5 19L14.5 22L13.5 19L10.5 18L13.5 17L14.5 14Z" />
                    </svg>
                  </button>
                )}

                {/* Voice/Send Button */}
                {showVoiceButton ? (
                  <button
                    className="chat-input__btn chat-input__btn--voice"
                    onClick={startRecording}
                    disabled={disabled}
                    aria-label="Start voice recording"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <path d="M12 19v4M8 23h8" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className="chat-input__btn chat-input__btn--send"
                    onClick={handleSend}
                    disabled={!canSend || isUploading}
                    aria-label="Send message"
                  >
                    {isUploading ? (
                      <div className="chat-input__spinner" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 4L12 20M12 4L6 10M12 4L18 10" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
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
        /* ═══════════════════════════════════════════════════════════════════════
           CONTAINER - State-of-the-art keyboard handling
           Uses bottom positioning, NOT transforms, to avoid disturbing other elements
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input {
          position: fixed;
          left: 0;
          right: 0;
          /* KEY FIX: Use bottom positioning instead of transform */
          bottom: var(--keyboard-height, 0px);
          padding: 16px 20px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 50;
          /* Smooth animation with Apple-level bezier - only on bottom property */
          transition: bottom 0.28s cubic-bezier(0.25, 0.1, 0.25, 1);
          /* Isolation to prevent affecting other elements */
          isolation: isolate;
          /* Prevent any transform inheritance */
          transform: none;
          /* GPU acceleration without transform */
          will-change: bottom;
          contain: layout style;
        }
        
        /* When keyboard is open, reduce bottom padding since keyboard provides safe area */
        @supports (bottom: env(safe-area-inset-bottom)) {
          .chat-input {
            padding-bottom: calc(16px + max(0px, env(safe-area-inset-bottom) - var(--keyboard-height, 0px)));
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           DRAG OVERLAY
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__drag-overlay {
          position: absolute;
          inset: 12px;
          background: rgba(0, 0, 0, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: rgba(255, 255, 255, 0.6);
          z-index: 100;
        }

        .chat-input__drag-overlay span {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           ERROR MESSAGE
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 59, 48, 0.08);
          border: 1px solid rgba(255, 59, 48, 0.15);
          border-radius: 14px;
          color: #ff453a;
          font-size: 13px;
          max-width: 720px;
          width: 100%;
        }

        .chat-input__error span {
          flex: 1;
        }

        .chat-input__error button {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          padding: 0;
          line-height: 1;
          transition: opacity 0.15s;
        }

        .chat-input__error button:hover {
          opacity: 1;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SIGN IN BUTTON - Fixed for Light/Dark mode
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__sign-in {
          padding: 10px 24px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.85);
          border: none;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .chat-input__sign-in:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-1px);
        }

        .chat-input__sign-in:active {
          transform: scale(0.97);
        }

        @media (prefers-color-scheme: dark) {
          .chat-input__sign-in {
            background: rgba(255, 255, 255, 0.9);
            color: #000;
          }

          .chat-input__sign-in:hover {
            background: rgba(255, 255, 255, 0.8);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           MAIN CONTAINER - Adaptive for Light/Dark backgrounds
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__container {
          position: relative;
          width: 100%;
          max-width: 720px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 24px;
          transition: all 0.2s ease;
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.04),
            0 4px 24px -4px rgba(0, 0, 0, 0.08);
          color: black;
        }

        .chat-input__container:focus-within {
          border-color: rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.06),
            0 4px 32px -4px rgba(0, 0, 0, 0.12);
        }

        .chat-input__container--recording {
          border-color: rgba(0, 0, 0, 0.12);
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .chat-input__container {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 
              0 4px 24px -4px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
            color: white;
          }

          .chat-input__container:focus-within {
            border-color: rgba(255, 255, 255, 0.18);
            box-shadow: 
              0 4px 32px -4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }

          .chat-input__container--recording {
            border-color: rgba(255, 255, 255, 0.15);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           ATTACHMENTS
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__attachments {
          display: flex;
          gap: 8px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          flex-wrap: wrap;
          max-height: 200px;
          overflow-y: auto;
        }

        @media (prefers-color-scheme: dark) {
          .chat-input__attachments {
            border-bottom-color: rgba(255, 255, 255, 0.06);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           INPUT ROW
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          padding: 10px 12px;
        }

        .chat-input__textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
          font-size: 16px;
          color: rgba(0, 0, 0, 0.85);
          resize: none;
          min-height: 24px;
          max-height: 150px;
          line-height: 1.5;
          padding: 0;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.15) transparent;
        }

        .chat-input__textarea::placeholder {
          color: rgba(0, 0, 0, 0.4);
        }

        .chat-input__textarea::-webkit-scrollbar {
          width: 4px;
        }

        .chat-input__textarea::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-input__textarea::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 2px;
        }

        @media (prefers-color-scheme: dark) {
          .chat-input__textarea {
            color: rgba(255, 255, 255, 0.92);
            scrollbar-color: rgba(255,255,255,0.2) transparent;
          }

          .chat-input__textarea::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }

          .chat-input__textarea::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
          }
        }

        .chat-input__textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           BUTTONS
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .chat-input__btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          transform: none !important;
        }

        .chat-input__btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.25);
          outline-offset: 2px;
        }

        .chat-input__btn--attach {
          background: transparent;
          color: rgba(0, 0, 0, 0.35);
        }

        .chat-input__btn--attach:hover:not(:disabled) {
          color: rgba(0, 0, 0, 0.7);
          background: rgba(0, 0, 0, 0.04);
        }

        .chat-input__btn--refine {
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.45);
        }

        .chat-input__btn--refine:hover:not(:disabled) {
          color: rgba(0, 0, 0, 0.8);
          background: rgba(0, 0, 0, 0.08);
        }

        .chat-input__btn--refine:active:not(:disabled) {
          transform: scale(0.95);
        }

        .chat-input__btn--voice {
          background: transparent;
          color: rgba(0, 0, 0, 0.4);
        }

        .chat-input__btn--voice:hover:not(:disabled) {
          color: rgba(0, 0, 0, 0.8);
          background: rgba(0, 0, 0, 0.04);
        }

        .chat-input__btn--voice:active:not(:disabled) {
          transform: scale(0.95);
        }

        .chat-input__btn--send {
          background: black;
          color: white;
          border-radius: 12px;
        }

        .chat-input__btn--send:disabled {
          background: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.3);
        }

        .chat-input__btn--send:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.85);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .chat-input__btn--send:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }

        /* Dark mode buttons */
        @media (prefers-color-scheme: dark) {
          .chat-input__btn--attach {
            color: rgba(255, 255, 255, 0.4);
          }

          .chat-input__btn--attach:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.06);
          }

          .chat-input__btn--refine {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.5);
          }

          .chat-input__btn--refine:hover:not(:disabled) {
            color: white;
            background: rgba(255, 255, 255, 0.12);
          }

          .chat-input__btn--voice {
            color: rgba(255, 255, 255, 0.5);
          }

          .chat-input__btn--voice:hover:not(:disabled) {
            color: white;
            background: rgba(255, 255, 255, 0.08);
          }

          .chat-input__btn--send {
            background: white;
            color: black;
          }

          .chat-input__btn--send:disabled {
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.3);
          }

          .chat-input__btn--send:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
          }
        }

        .chat-input__spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0, 0, 0, 0.15);
          border-top-color: black;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @media (prefers-color-scheme: dark) {
          .chat-input__spinner {
            border-color: rgba(255, 255, 255, 0.15);
            border-top-color: white;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           RECORDING UI
           ═══════════════════════════════════════════════════════════════════════ */
        
        /* ═══════════════════════════════════════════════════════════════════════
           RECORDING UI - Unique Pulsing Orb (Fast & Responsive)
           ═══════════════════════════════════════════════════════════════════════ */
        
        .chat-input__recording {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          gap: 12px;
          animation: recordingFadeIn 0.3s ease-out;
        }

        @keyframes recordingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Cancel Button */
        .chat-input__recording-cancel {
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
          -webkit-tap-highlight-color: transparent;
        }

        .chat-input__recording-cancel:hover {
          background: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.5);
        }

        .chat-input__recording-cancel:active {
          transform: scale(0.94);
        }

        /* Center - Orb Container */
        .chat-input__recording-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
        }

        /* Orb Container */
        .chat-input__orb-container {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* The Core Orb - Breathes with voice */
        .chat-input__orb {
          width: 20px;
          height: 20px;
          background: black;
          border-radius: 50%;
          transition: transform 0.03s linear;
          will-change: transform;
        }

        /* Ripple Rings */
        .chat-input__orb-ring {
          position: absolute;
          inset: 0;
          border: 1.5px solid black;
          border-radius: 50%;
          transition: transform 0.04s linear, opacity 0.04s linear;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .chat-input__orb-ring--1 {
          inset: 4px;
        }

        .chat-input__orb-ring--2 {
          inset: -2px;
        }

        /* Send Button */
        .chat-input__recording-send {
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
          -webkit-tap-highlight-color: transparent;
        }

        .chat-input__recording-send:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .chat-input__recording-send:active {
          transform: scale(0.95);
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .chat-input__recording-cancel {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.35);
          }

          .chat-input__recording-cancel:hover {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.5);
          }

          .chat-input__orb {
            background: white;
          }

          .chat-input__orb-ring {
            border-color: white;
          }

          .chat-input__recording-send {
            background: white;
            color: black;
          }

          .chat-input__recording-send:hover {
            box-shadow: 0 4px 20px rgba(255, 255, 255, 0.15);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           PROMPT ENHANCE - Adaptive Light/Dark
           ═══════════════════════════════════════════════════════════════════════ */
        
        .prompt-enhance {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          padding: 0 0 10px 0;
          z-index: 10;
        }

        .prompt-enhance__card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 16px 20px;
          animation: enhanceSlide 0.2s ease-out;
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.04),
            0 4px 24px -4px rgba(0, 0, 0, 0.1);
          color: black;
        }

        @keyframes enhanceSlide {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Loading */
        .prompt-enhance__loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 0;
        }

        .prompt-enhance__dot {
          width: 5px;
          height: 5px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 50%;
          animation: enhanceDot 1.2s ease-in-out infinite;
        }

        .prompt-enhance__dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .prompt-enhance__dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes enhanceDot {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.3;
          }
          40% {
            transform: scale(1);
            opacity: 0.7;
          }
        }

        /* Text */
        .prompt-enhance__text {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(0, 0, 0, 0.85);
          max-height: 100px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.1) transparent;
        }

        .prompt-enhance__text::-webkit-scrollbar {
          width: 3px;
        }

        .prompt-enhance__text::-webkit-scrollbar-track {
          background: transparent;
        }

        .prompt-enhance__text::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }

        /* Divider */
        .prompt-enhance__divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.06);
          margin: 12px 0;
        }

        /* Bottom Row */
        .prompt-enhance__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .prompt-enhance__hint {
          font-size: 11px;
          color: rgba(0, 0, 0, 0.4);
          letter-spacing: 0.01em;
        }

        .prompt-enhance__actions {
          display: flex;
          gap: 6px;
        }

        .prompt-enhance__btn {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .prompt-enhance__btn--dismiss {
          background: transparent;
          border: none;
          color: rgba(0, 0, 0, 0.45);
        }

        .prompt-enhance__btn--dismiss:hover {
          color: rgba(0, 0, 0, 0.7);
        }

        .prompt-enhance__btn--apply {
          background: black;
          border: none;
          color: white;
          font-weight: 600;
        }

        .prompt-enhance__btn--apply:hover {
          background: rgba(0, 0, 0, 0.85);
          transform: translateY(-1px);
        }

        /* Dark mode enhancer */
        @media (prefers-color-scheme: dark) {
          .prompt-enhance__card {
            background: rgba(0, 0, 0, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 
              0 4px 24px -4px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
            color: white;
          }

          .prompt-enhance__dot {
            background: rgba(255, 255, 255, 0.4);
          }

          .prompt-enhance__text {
            color: rgba(255, 255, 255, 0.92);
            scrollbar-color: rgba(255,255,255,0.15) transparent;
          }

          .prompt-enhance__text::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
          }

          .prompt-enhance__divider {
            background: rgba(255, 255, 255, 0.1);
          }

          .prompt-enhance__hint {
            color: rgba(255, 255, 255, 0.4);
          }

          .prompt-enhance__btn--dismiss {
            color: rgba(255, 255, 255, 0.5);
          }

          .prompt-enhance__btn--dismiss:hover {
            color: rgba(255, 255, 255, 0.8);
          }

          .prompt-enhance__btn--apply {
            background: white;
            color: black;
          }

          .prompt-enhance__btn--apply:hover {
            background: rgba(255, 255, 255, 0.9);
          }
        }


        /* ═══════════════════════════════════════════════════════════════════════
           RESPONSIVE - Mobile-first perfection
           ═══════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .chat-input {
            padding: 12px 16px;
            /* On mobile, when keyboard is open, we don't need safe area padding */
            padding-bottom: calc(12px + max(0px, env(safe-area-inset-bottom) - var(--keyboard-height, 0px)));
            /* Faster animation on mobile for snappier feel */
            transition: bottom 0.22s cubic-bezier(0.25, 0.1, 0.25, 1);
          }

          .chat-input__container {
            border-radius: 20px;
            max-width: 100%;
          }

          .chat-input__row {
            padding: 10px 12px;
          }

          .chat-input__btn {
            width: 36px;
            height: 36px;
          }

          .chat-input__recording {
            padding: 10px 12px;
          }

          .chat-input__recording-cancel {
            width: 36px;
            height: 36px;
          }

          .chat-input__recording-send {
            width: 42px;
            height: 42px;
          }

          .chat-input__orb-container {
            width: 44px;
            height: 44px;
          }

          .chat-input__orb {
            width: 16px;
            height: 16px;
          }

          .chat-input__attachments {
            padding: 10px 12px;
          }

          /* Prompt Enhance Mobile */
          .prompt-enhance {
            padding: 0 0 8px 0;
          }

          .prompt-enhance__card {
            padding: 12px 14px;
            border-radius: 14px;
          }

          .prompt-enhance__text {
            font-size: 14px;
            max-height: 80px;
          }

          .prompt-enhance__row {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .prompt-enhance__hint {
            text-align: center;
          }

          .prompt-enhance__actions {
            justify-content: stretch;
          }

          .prompt-enhance__btn {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .chat-input {
            padding: 10px 12px;
            padding-bottom: calc(10px + max(0px, env(safe-area-inset-bottom) - var(--keyboard-height, 0px)));
          }

          .chat-input__textarea {
            font-size: 16px; /* Prevent zoom on iOS */
          }
          
          .chat-input__btn {
            width: 34px;
            height: 34px;
          }
          
          .chat-input__recording-cancel {
            width: 34px;
            height: 34px;
          }
          
          .chat-input__recording-send {
            width: 40px;
            height: 40px;
          }
          
          .chat-input__orb-container {
            width: 40px;
            height: 40px;
          }
          
          .chat-input__orb {
            width: 14px;
            height: 14px;
          }
        }
        
        /* iOS Safari specific - use standalone display detection */
        @supports (-webkit-touch-callout: none) {
          .chat-input {
            /* iOS uses different keyboard animation timing */
            transition: bottom 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           ACCESSIBILITY
           ═══════════════════════════════════════════════════════════════════════ */
        
        @media (prefers-reduced-motion: reduce) {
          .chat-input,
          .chat-input__container,
          .chat-input__btn,
          .chat-input__recording-cancel,
          .chat-input__recording-send,
          .chat-input__orb,
          .chat-input__orb-ring {
            transition: none;
          }

          .chat-input__spinner,
          .attachment-preview__spinner {
            animation-duration: 1.5s;
          }
        }
      `}</style>
    </>
  );
}