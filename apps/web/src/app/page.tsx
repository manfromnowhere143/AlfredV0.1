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
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS — Sacred Geometry
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
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      className={animated ? 'alfred-icon-animated' : ''}
    >
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
          <circle 
            key={`p${i}`} 
            cx={p.x} 
            cy={p.y} 
            r="0.8" 
            fill="var(--icon-color)" 
            opacity="0.5" 
            className="alfred-particle" 
            style={{ animationDelay: `${p.delay}s` }} 
          />
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

// ═══════════════════════════════════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

function ThemeToggle({ theme, onThemeChange, visible }: { theme: Theme; onThemeChange: (t: Theme) => void; visible: boolean }) {
  const themes: Theme[] = ['dark', 'silver', 'light'];
  
  return (
    <div className={`theme-toggle ${visible ? 'visible' : ''}`}>
      {themes.map(t => (
        <button
          key={t}
          className={`theme-btn theme-btn-${t} gpu-transform ${theme === t ? 'active' : ''}`}
          onClick={() => onThemeChange(t)}
          aria-label={`${t} theme`}
        />
      ))}
    </div>
  );
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

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

  return { sendMessage, isStreaming };
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
  const [themeVisible, setThemeVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage, isStreaming } = useStreamingChat();

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
      setTimeout(() => setThemeVisible(true), 600),
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
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
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
  }, [inputValue, isStreaming, messages, mode, sendMessage]);

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

  const getAnimClass = (state: AnimationState, prefix: string) => 
    state === 'idle' ? '' : `${prefix}-${state}`;

  return (
    <main 
      className={`alfred-app theme-${theme} gpu ${getAnimClass(pageState, 'page')}`} 
      style={{ height: viewportHeight }}
    >
      <ThemeToggle theme={theme} onThemeChange={handleThemeChange} visible={themeVisible} />

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
                  <div className="message-text">
                    <p>{message.content || '\u00A0'}</p>
                    {streamingMessageId === message.id && <span className="cursor">▊</span>}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} style={{ height: 1 }} />
          </div>
        )}
      </div>

      <div className="input-area">
        <div className={`input-container gpu ${getAnimClass(inputState, 'input')}`}>
          <div className="input-wrapper">
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
            <button
              className="input-send gpu-transform"
              disabled={isStreaming || !inputValue.trim()}
              onClick={handleSendMessage}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}