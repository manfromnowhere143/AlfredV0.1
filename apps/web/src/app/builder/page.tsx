'use client';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║            ALFRED PRO BUILDER PAGE - MOBILE-FIRST STATE OF THE ART           ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  The browser IDE experience where chat meets code.                            ║
 * ║  LLM streaming generates files → VirtualFS → ESBuild → Live Preview          ║
 * ║                                                                               ║
 * ║  Mobile Experience (Steve Jobs approved):                                     ║
 * ║  • Floating AI chat button (FAB)                                              ║
 * ║  • Full-screen chat modal                                                     ║
 * ║  • Swipe gestures between panels                                              ║
 * ║  • Touch-optimized controls                                                   ║
 * ║                                                                               ║
 * ║  Desktop Layout:                                                              ║
 * ║  ┌─────────────────────────────────────────────────────────────┐              ║
 * ║  │ Header (project name, controls)                             │              ║
 * ║  ├──────────┬─────────────────────────┬────────────────────────┤              ║
 * ║  │ Files    │ Editor (Monaco)         │ Preview (iframe)       │              ║
 * ║  │          │                         │                        │              ║
 * ║  ├──────────┴─────────────────────────┴────────────────────────┤              ║
 * ║  │ Chat Input                                                  │              ║
 * ║  └─────────────────────────────────────────────────────────────┘              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { BuilderLayout } from '@/components/builder';
import { useBuilder } from '@/hooks/useBuilder';
import type { ConsoleEntry, VirtualFile } from '@alfred/core';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
}

// ============================================================================
// HOOKS
// ============================================================================

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ============================================================================
// MOBILE CHAT FAB (Floating Action Button)
// ============================================================================

interface MobileChatFABProps {
  onClick: () => void;
  isStreaming: boolean;
  hasMessages: boolean;
}

function MobileChatFAB({ onClick, isStreaming, hasMessages }: MobileChatFABProps) {
  return (
    <button className="chat-fab" onClick={onClick}>
      {isStreaming ? (
        <div className="fab-streaming">
          <div className="streaming-ring" />
          <div className="streaming-core" />
        </div>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )}
      {hasMessages && !isStreaming && <div className="message-badge" />}

      <style jsx>{`
        .chat-fab {
          position: fixed;
          bottom: 88px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 28px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 20px rgba(139, 92, 246, 0.4),
            0 8px 40px rgba(0, 0, 0, 0.3);
          z-index: 90;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .chat-fab:active {
          transform: scale(0.92);
        }

        .message-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
          border: 2px solid #0a0a0c;
        }

        .fab-streaming {
          position: relative;
          width: 24px;
          height: 24px;
        }

        .streaming-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(255, 255, 255, 0.8);
          animation: spin 0.8s linear infinite;
        }

        .streaming-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.2); }
        }
      `}</style>
    </button>
  );
}

// ============================================================================
// MOBILE CHAT MODAL - Full Screen Chat
// ============================================================================

interface MobileChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isStreaming: boolean;
}

function MobileChatModal({
  isOpen,
  onClose,
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  isStreaming,
}: MobileChatModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (!isOpen) return null;

  return (
    <div className="chat-modal">
      {/* Header */}
      <div className="modal-header">
        <div className="header-left">
          <div className="alfred-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="header-text">
            <span className="header-title">Alfred AI</span>
            <span className="header-subtitle">Ask me to build anything</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>What would you like to build?</h3>
            <p>Describe your app and Alfred will generate the code</p>

            <div className="suggestions">
              <button onClick={() => onInputChange('Create a todo app with React')}>
                Todo App
              </button>
              <button onClick={() => onInputChange('Build a weather dashboard')}>
                Weather Dashboard
              </button>
              <button onClick={() => onInputChange('Create a landing page')}>
                Landing Page
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? 'U' : 'A'}
            </div>
            <div className="message-content">
              <span className="message-role">
                {msg.role === 'user' ? 'You' : 'Alfred'}
              </span>
              <p className="message-text">{msg.content}</p>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="message alfred streaming">
            <div className="message-avatar">A</div>
            <div className="message-content">
              <span className="message-role">Alfred</span>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form className="input-container" onSubmit={onSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Describe what you want to build..."
          disabled={isStreaming}
          autoFocus
        />
        <button type="submit" disabled={isStreaming || !inputValue.trim()}>
          {isStreaming ? (
            <div className="send-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>

      <style jsx>{`
        .chat-modal {
          position: fixed;
          inset: 0;
          background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
          z-index: 200;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(15, 15, 20, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alfred-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .header-title {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .header-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .close-btn {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          border: none;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }

        .close-btn:active {
          background: rgba(255, 255, 255, 0.1);
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          padding-bottom: 100px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          padding: 20px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b5cf6;
          margin-bottom: 24px;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 32px;
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .suggestions button {
          padding: 12px 20px;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          color: #a5b4fc;
          font-size: 14px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.2s ease;
        }

        .suggestions button:active {
          background: rgba(139, 92, 246, 0.25);
          transform: scale(0.96);
        }

        .message {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          flex-shrink: 0;
        }

        .message.alfred .message-avatar {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
        }

        .message-content {
          max-width: 80%;
        }

        .message-role {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 6px;
        }

        .message.user .message-role {
          text-align: right;
        }

        .message-text {
          font-size: 15px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
        }

        .message.user .message-text {
          background: rgba(139, 92, 246, 0.2);
          padding: 12px 16px;
          border-radius: 16px 16px 4px 16px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          width: fit-content;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #8b5cf6;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .input-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.95) 0%, rgba(10, 10, 14, 1) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .input-container input {
          flex: 1;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          color: white;
          font-size: 16px;
          outline: none;
          -webkit-appearance: none;
        }

        .input-container input:focus {
          border-color: rgba(139, 92, 246, 0.5);
        }

        .input-container input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .input-container button {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .input-container button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-container button:active:not(:disabled) {
          transform: scale(0.92);
        }

        .send-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// DESKTOP CHAT PANEL
// ============================================================================

interface DesktopChatPanelProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isStreaming: boolean;
}

function DesktopChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
  isStreaming,
}: DesktopChatPanelProps) {
  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Describe what you want to build and Alfred will generate the code.</p>
            <div className="chat-suggestions">
              <button onClick={() => onInputChange('Create a todo app with React')}>
                Todo App
              </button>
              <button onClick={() => onInputChange('Build a weather dashboard')}>
                Weather Dashboard
              </button>
              <button onClick={() => onInputChange('Create a landing page')}>
                Landing Page
              </button>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <span className="message-role">
              {msg.role === 'user' ? 'You' : 'Alfred'}
            </span>
            <span className="message-content">{msg.content}</span>
          </div>
        ))}
        {isStreaming && (
          <div className="chat-message alfred streaming">
            <span className="message-role">Alfred</span>
            <span className="typing-indicator">
              <span></span><span></span><span></span>
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Describe what you want to build..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !inputValue.trim()}>
          {isStreaming ? 'Building...' : 'Build'}
        </button>
      </form>

      <style jsx>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 200px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
        }

        .chat-empty {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.5);
        }

        .chat-empty p {
          margin-bottom: 16px;
          font-size: 14px;
        }

        .chat-suggestions {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .chat-suggestions button {
          padding: 8px 16px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          color: #a5b4fc;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chat-suggestions button:hover {
          background: rgba(99, 102, 241, 0.25);
        }

        .chat-message {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 0;
        }

        .chat-message.user {
          align-items: flex-end;
        }

        .message-role {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.4);
        }

        .message-content {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          max-width: 80%;
        }

        .chat-message.user .message-content {
          background: rgba(99, 102, 241, 0.2);
          padding: 8px 12px;
          border-radius: 12px 12px 4px 12px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #6366f1;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .chat-input-form {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .chat-input-form input {
          flex: 1;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .chat-input-form input:focus {
          border-color: rgba(99, 102, 241, 0.5);
        }

        .chat-input-form input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .chat-input-form button {
          padding: 10px 20px;
          background: #6366f1;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chat-input-form button:hover:not(:disabled) {
          background: #4f46e5;
        }

        .chat-input-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const conversationId = useRef<string | null>(null);
  const streamingContentRef = useRef<string>('');

  const isMobile = useMediaQuery('(max-width: 767px)');

  // Builder hook - manages files, preview, and streaming integration
  const builder = useBuilder({
    projectName: 'New Project',
    onStreamEvent: (event) => {
      // Update project name from stream
      if (event.type === 'project_start') {
        // Project started generating
      }
    },
  });

  // Handle file selection from explorer
  const handleFileSelect = useCallback((file: VirtualFile) => {
    builder.selectFile(file.path);
  }, [builder]);

  // Handle file content changes from editor
  const handleFileChange = useCallback((path: string, content: string) => {
    builder.updateFile(path, content);
  }, [builder]);

  // Handle console entries from preview
  const handleConsole = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries(prev => [...prev.slice(-99), entry]); // Keep last 100
  }, []);

  // Send message and stream response to builder
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    streamingContentRef.current = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId.current,
          mode: 'builder', // Signal to API that we want multi-file output
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  streamingContentRef.current = fullContent;

                  // Feed content to builder parser
                  builder.processChunk(parsed.content);
                }
                if (parsed.conversationId && !conversationId.current) {
                  conversationId.current = parsed.conversationId;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Add assistant message
      setMessages(prev => [...prev, {
        id: `alfred-${Date.now()}`,
        role: 'alfred',
        content: fullContent || 'I created your project!',
        timestamp: new Date(),
      }]);

    } catch (error) {
      console.error('[Builder] Chat error:', error);
      setMessages(prev => [...prev, {
        id: `alfred-${Date.now()}`,
        role: 'alfred',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
      streamingContentRef.current = '';
    }
  }, [isStreaming, builder]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  // Auth check - Loading state
  if (status === 'loading') {
    return (
      <div className="builder-loading">
        <div className="loading-spinner" />
        <style jsx>{`
          .builder-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            height: 100dvh;
            background: #0a0a0c;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Auth check - Not signed in
  if (!session) {
    return (
      <div className="builder-auth">
        <div className="auth-content">
          <div className="auth-logo">A</div>
          <h1>Alfred Builder</h1>
          <p>Sign in to start building</p>
          <button onClick={() => signIn()}>Sign In</button>
        </div>
        <style jsx>{`
          .builder-auth {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            height: 100dvh;
            background: linear-gradient(180deg, #0a0a0c 0%, #111115 100%);
            padding: 20px;
          }
          .auth-content {
            text-align: center;
            color: white;
            max-width: 300px;
          }
          .auth-logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            border-radius: 16px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
          }
          .auth-content h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .auth-content p {
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 24px;
          }
          .auth-content button {
            width: 100%;
            padding: 14px 24px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-content button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="builder-page">
      {/* Main Content - BuilderLayout handles responsive layout */}
      <main className="builder-main">
        <BuilderLayout
          fileTree={builder.fileTree}
          selectedFile={builder.selectedFile}
          previewResult={builder.previewResult}
          isBuilding={builder.isBuilding}
          projectName={builder.projectName}
          onFileSelect={handleFileSelect}
          onFileChange={handleFileChange}
          onConsole={handleConsole}
        />
      </main>

      {/* Mobile: Floating Chat Button + Modal */}
      {isMobile && (
        <>
          <MobileChatFAB
            onClick={() => setIsChatOpen(true)}
            isStreaming={isStreaming}
            hasMessages={messages.length > 0}
          />
          <MobileChatModal
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            isStreaming={isStreaming}
          />
        </>
      )}

      {/* Desktop: Integrated Chat Panel */}
      {!isMobile && (
        <DesktopChatPanel
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
        />
      )}

      {/* Console Panel (desktop only, collapsible) */}
      {!isMobile && consoleEntries.length > 0 && (
        <div className="console-panel">
          <div className="console-header">
            <span>Console</span>
            <button onClick={() => setConsoleEntries([])}>Clear</button>
          </div>
          <div className="console-entries">
            {consoleEntries.map((entry, i) => (
              <div key={i} className={`console-entry ${entry.type}`}>
                <span className="entry-type">{entry.type}</span>
                <span className="entry-content">
                  {entry.args.map(a => JSON.stringify(a)).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .builder-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          background: #0a0a0c;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }

        .builder-main {
          flex: 1;
          overflow: hidden;
        }

        .console-panel {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.3);
          max-height: 150px;
        }

        .console-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .console-header button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
          cursor: pointer;
        }

        .console-entries {
          overflow-y: auto;
          max-height: 100px;
          padding: 8px;
          font-family: 'Fira Code', monospace;
          font-size: 11px;
        }

        .console-entry {
          display: flex;
          gap: 8px;
          padding: 2px 0;
        }

        .console-entry.error { color: #ef4444; }
        .console-entry.warn { color: #f59e0b; }
        .console-entry.log { color: rgba(255, 255, 255, 0.7); }
        .console-entry.info { color: #3b82f6; }

        .entry-type {
          min-width: 40px;
          opacity: 0.6;
        }

        .entry-content {
          flex: 1;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
