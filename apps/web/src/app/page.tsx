'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

type AlfredMode = 'builder' | 'mentor' | 'reviewer';
type Theme = 'dark' | 'light' | 'silver';
type AnimationState = 'idle' | 'entering' | 'active' | 'exiting';

interface Message {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  animState: AnimationState;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  mode: AlfredMode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function renderMarkdown(content: string): string {
  if (!content) return '';
  
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'text';
      return `<div class="code-block"><div class="code-header"><span>${language}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">Copy</button></div><pre><code>${code.trim()}</code></pre></div>`;
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="md-list">$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/([^>])\n([^<])/g, '$1<br/>$2');

  return `<p>${html}</p>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

function AlfredIcon({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  const vertices = useMemo(() => 
    [0, 60, 120, 180, 240, 300].map(angle => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 38 * Math.cos(rad), y: 50 + 38 * Math.sin(rad) };
    }), []
  );

  const particles = useMemo(() => 
    [0, 90, 180, 270].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      return { x: 50 + 46 * Math.cos(rad), y: 50 + 46 * Math.sin(rad), delay: i * 0.4 };
    }), []
  );

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={animated ? 'alfred-icon-animated' : ''}>
      <g className="alfred-ring-outer">
        <circle cx="50" cy="50" r="46" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.2" />
      </g>
      <g className="alfred-geometry">
        {vertices.map((v, i) => (
          <circle key={`v${i}`} cx={v.x} cy={v.y} r="1.5" fill="var(--icon-color)" opacity="0.35" className="alfred-vertex" />
        ))}
        {vertices.map((v, i) => {
          const next = vertices[(i + 1) % 6];
          return <line key={`l${i}`} x1={v.x} y1={v.y} x2={next.x} y2={next.y} stroke="var(--icon-color)" strokeWidth="0.3" opacity="0.2" />;
        })}
        {vertices.map((v, i) => (
          <line key={`r${i}`} x1="50" y1="50" x2={v.x} y2={v.y} stroke="var(--icon-color)" strokeWidth="0.2" opacity="0.12" />
        ))}
      </g>
      <g className="alfred-ring-middle">
        <circle cx="50" cy="50" r="26" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.25" />
      </g>
      <g className="alfred-core">
        <circle cx="50" cy="50" r="14" stroke="var(--icon-color)" strokeWidth="0.6" opacity="0.4" />
        <circle cx="50" cy="50" r="8" stroke="var(--icon-color)" strokeWidth="0.5" opacity="0.6" />
        <circle cx="50" cy="50" r="4" fill="var(--icon-color)" opacity="0.95" className="alfred-eye" />
      </g>
      <g className="alfred-particles">
        {particles.map((p, i) => (
          <circle key={`p${i}`} cx={p.x} cy={p.y} r="0.8" fill="var(--icon-color)" opacity="0.5" className="alfred-particle" style={{ animationDelay: `${p.delay}s` }} />
        ))}
      </g>
    </svg>
  );
}

function AlfredAvatarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="50" r="40" stroke="var(--icon-color)" strokeWidth="2" opacity="0.3" />
      <circle cx="50" cy="50" r="26" stroke="var(--icon-color)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="12" stroke="var(--icon-color)" strokeWidth="1" opacity="0.7" />
      <circle cx="50" cy="50" r="5" fill="var(--icon-color)" opacity="0.95" />
    </svg>
  );
}

function UserAvatarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="avatar-icon">
      <circle cx="50" cy="38" r="18" stroke="var(--icon-color)" strokeWidth="2" opacity="0.6" fill="none" />
      <path d="M20 85 Q20 60 50 55 Q80 60 80 85" stroke="var(--icon-color)" strokeWidth="2" opacity="0.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MicIcon({ recording = false }: { recording?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={recording ? 'recording' : ''}>
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={recording ? 'currentColor' : 'none'}/>
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE RECORDING HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
  }, []);

  return { isRecording, audioBlob, startRecording, stopRecording, clearRecording };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STREAMING HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    mode: AlfredMode,
    history: { role: string; content: string }[],
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode, history }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) onChunk(parsed.text);
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError(error.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { sendMessage, isStreaming, abort };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useFileUpload() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment) URL.revokeObjectURL(attachment.url);
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach(a => URL.revokeObjectURL(a.url));
    setAttachments([]);
  }, [attachments]);

  return { attachments, fileInputRef, openFilePicker, handleFileSelect, removeAttachment, clearAttachments };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR COMPONENT - Used for both mobile and desktop
// ═══════════════════════════════════════════════════════════════════════════════

function Sidebar({ 
  conversations, 
  currentConversation,
  onSelectConversation,
  onNewChat,
  mode,
  onModeChange,
  theme,
  onThemeChange,
  isMobile = false,
  isOpen = true,
  onClose
}: { 
  conversations: Conversation[];
  currentConversation: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  mode: AlfredMode;
  onModeChange: (m: AlfredMode) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  };

  return (
    <aside className={`sidebar ${isMobile ? 'mobile-sidebar' : 'desktop-sidebar'} ${isOpen ? 'open' : ''}`}>
      {/* Header with time */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <AlfredIcon size={32} />
          <span className="brand-name">Alfred</span>
        </div>
        {isMobile && onClose && (
          <button className="sidebar-close" onClick={onClose}>
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Time Display */}
      <div className="sidebar-time">
        <span className="time-value">{formatTime(time)}</span>
        <span className="time-date">{formatDate(time)}</span>
      </div>

      {/* New Chat Button */}
      <button className="new-chat-btn" onClick={() => { onNewChat(); onClose?.(); }}>
        <NewChatIcon />
        <span>New Chat</span>
      </button>

      {/* Mode Selector */}
      <div className="sidebar-section">
        <div className="section-label">Mode</div>
        <div className="sidebar-mode-selector">
          {(['builder', 'mentor', 'reviewer'] as AlfredMode[]).map(m => (
            <button
              key={m}
              className={`sidebar-mode-btn ${mode === m ? 'active' : ''}`}
              onClick={() => onModeChange(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations */}
      <div className="sidebar-section conversations-section">
        <div className="section-label">
          <HistoryIcon />
          <span>History</span>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">No conversations yet</div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                className={`conversation-item ${currentConversation === conv.id ? 'active' : ''}`}
                onClick={() => { onSelectConversation(conv.id); onClose?.(); }}
              >
                <div className="conv-title">{conv.title}</div>
                <div className="conv-preview">{conv.lastMessage}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom - Theme Toggle */}
      <div className="sidebar-footer">
        <div className="sidebar-theme-toggle">
          {(['dark', 'silver', 'light'] as Theme[]).map(t => (
            <button
              key={t}
              className={`sidebar-theme-btn theme-btn-${t} ${theme === t ? 'active' : ''}`}
              onClick={() => onThemeChange(t)}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<AlfredMode>('builder');
  const [theme, setTheme] = useState<Theme>('dark');
  const [inputValue, setInputValue] = useState('');
  const [pageState, setPageState] = useState<AnimationState>('idle');
  const [emptyState, setEmptyState] = useState<AnimationState>('idle');
  const [inputState, setInputState] = useState<AnimationState>('idle');
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming } = useStreamingChat();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const { attachments, fileInputRef, openFilePicker, handleFileSelect, removeAttachment, clearAttachments } = useFileUpload();

  // Viewport handling
  useEffect(() => {
    const updateViewport = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Entrance animations
  useEffect(() => {
    const timers = [
      setTimeout(() => setPageState('entering'), 0),
      setTimeout(() => setPageState('active'), 50),
      setTimeout(() => setEmptyState('entering'), 200),
      setTimeout(() => setEmptyState('active'), 250),
      setTimeout(() => setInputState('entering'), 400),
      setTimeout(() => setInputState('active'), 450),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const handleThemeChange = useCallback((newTheme: Theme) => setTheme(newTheme), []);
  const handleModeChange = useCallback((newMode: AlfredMode) => setMode(newMode), []);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      const title = messages[0]?.content.slice(0, 40) + '...' || 'New Chat';
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        title,
        lastMessage: messages[messages.length - 1]?.content.slice(0, 60) || '',
        timestamp: new Date(),
        mode,
      };
      setConversations(prev => [newConv, ...prev]);
    }
    setMessages([]);
    setCurrentConversation(null);
    setEmptyState('entering');
    setTimeout(() => setEmptyState('active'), 50);
  }, [messages, mode]);

  const handleSendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isStreaming) return;

    if (messages.length === 0) setEmptyState('exiting');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      animState: 'entering',
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    clearAttachments();
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, animState: 'active' } : m));
    }, 50);

    const alfredMessageId = `alfred-${Date.now()}`;
    setStreamingMessageId(alfredMessageId);

    const alfredMessage: Message = {
      id: alfredMessageId,
      role: 'alfred',
      content: '',
      timestamp: new Date(),
      animState: 'entering',
    };

    setTimeout(() => {
      setMessages(prev => [...prev, alfredMessage]);
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === alfredMessageId ? { ...m, animState: 'active' } : m));
      }, 50);
    }, 300);

    const history = messages.map(m => ({
      role: m.role === 'alfred' ? 'assistant' : 'user',
      content: m.content,
    }));

    await sendMessage(
      content,
      mode,
      history,
      (text) => {
        setMessages(prev => prev.map(m => 
          m.id === alfredMessageId ? { ...m, content: m.content + text } : m
        ));
      },
      () => setStreamingMessageId(null),
      (error) => {
        setMessages(prev => prev.map(m => 
          m.id === alfredMessageId ? { ...m, content: `Error: ${error}` } : m
        ));
        setStreamingMessageId(null);
      }
    );
  }, [inputValue, isStreaming, messages, mode, sendMessage, attachments, clearAttachments]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const getAnimClass = (state: AnimationState, prefix: string) => 
    state === 'idle' ? '' : `${prefix}-${state}`;

  return (
    <main 
      className={`alfred-app theme-${theme} gpu ${getAnimClass(pageState, 'page')}`} 
      style={{ height: viewportHeight }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.html,.css"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Desktop Sidebar - Always visible */}
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={setCurrentConversation}
        onNewChat={handleNewChat}
        mode={mode}
        onModeChange={handleModeChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        isMobile={false}
        isOpen={true}
      />

      {/* Mobile Sidebar - Slide in */}
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={setCurrentConversation}
        onNewChat={handleNewChat}
        mode={mode}
        onModeChange={handleModeChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        isMobile={true}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Messages Area */}
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className={`empty-state ${getAnimClass(emptyState, 'empty')}`}>
              <div className="empty-logo gpu-transform">
                <AlfredIcon size={100} animated />
              </div>
              <div className="empty-text">
                <h1 className="empty-title">Alfred</h1>
                <p className="empty-subtitle">Your AI development partner</p>
              </div>
              <div className="mode-selector">
                {(['builder', 'mentor', 'reviewer'] as AlfredMode[]).map(m => (
                  <button
                    key={m}
                    className={`mode-btn ${mode === m ? 'active' : ''} gpu-transform`}
                    onClick={() => handleModeChange(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map(message => (
                <div key={message.id} className={`message-row ${message.animState} gpu-transform`}>
                  <div className="message-avatar">
                    {message.role === 'alfred' ? <AlfredAvatarIcon /> : <UserAvatarIcon />}
                  </div>
                  <div className="message-content">
                    <div className="message-sender">{message.role === 'alfred' ? 'Alfred' : 'You'}</div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map(att => (
                          <div key={att.id} className={`attachment-preview ${att.type}`}>
                            {att.type === 'image' ? (
                              <img src={att.url} alt={att.name} />
                            ) : (
                              <div className="file-icon">📄</div>
                            )}
                            <span className="attachment-name">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div 
                      className="message-text"
                      dangerouslySetInnerHTML={{ 
                        __html: message.content 
                          ? renderMarkdown(message.content) + (streamingMessageId === message.id ? '<span class="cursor"></span>' : '')
                          : '<p>&nbsp;</p>' + (streamingMessageId === message.id ? '<span class="cursor"></span>' : '')
                      }}
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} style={{ height: 1 }} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className={`input-container gpu ${getAnimClass(inputState, 'input')}`}>
            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="attachments-preview">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-chip">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="chip-thumbnail" />
                    ) : (
                      <span className="chip-icon">📄</span>
                    )}
                    <span className="chip-name">{att.name}</span>
                    <button className="chip-remove" onClick={() => removeAttachment(att.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="input-wrapper">
              {/* Attach Button */}
              <button
                className="input-action attach-btn"
                onClick={openFilePicker}
                aria-label="Attach file"
              >
                <AttachIcon />
              </button>

              {/* Text Input */}
              <textarea
                ref={inputRef}
                className="input-field"
                placeholder="Message Alfred..."
                rows={1}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
              />

              {/* Voice Button */}
              <button
                className={`input-action voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceToggle}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <MicIcon recording={isRecording} />
              </button>

              {/* Send Button */}
              <button
                className="input-send gpu-transform"
                disabled={isStreaming || (!inputValue.trim() && attachments.length === 0)}
                onClick={handleSendMessage}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}