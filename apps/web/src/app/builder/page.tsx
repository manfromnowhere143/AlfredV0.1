'use client';

/**
 * Alfred Builder Page
 *
 * The browser IDE experience where chat meets code.
 * LLM streaming generates files → VirtualFS → ESBuild → Live Preview
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Header (project name, controls)                             │
 * ├──────────┬─────────────────────────┬────────────────────────┤
 * │ Files    │ Editor (Monaco)         │ Preview (iframe)       │
 * │          │                         │                        │
 * ├──────────┴─────────────────────────┴────────────────────────┤
 * │ Chat Input                                                  │
 * └─────────────────────────────────────────────────────────────┘
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
// MAIN COMPONENT
// ============================================================================

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const conversationId = useRef<string | null>(null);
  const streamingContentRef = useRef<string>('');

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

  // Auth check
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

  if (!session) {
    return (
      <div className="builder-auth">
        <div className="auth-content">
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
            background: linear-gradient(180deg, #0a0a0c 0%, #111115 100%);
          }
          .auth-content {
            text-align: center;
            color: white;
          }
          .auth-content h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .auth-content p {
            color: rgba(255, 255, 255, 0.5);
            margin-bottom: 24px;
          }
          .auth-content button {
            padding: 12px 24px;
            background: #6366f1;
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-content button:hover {
            background: #4f46e5;
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="builder-page">
      {/* Header */}
      <header className="builder-header">
        <div className="header-left">
          <span className="logo">Alfred</span>
          <span className="project-name">{builder.projectName}</span>
        </div>
        <div className="header-right">
          {builder.isBuilding && (
            <span className="building-indicator">
              <span className="building-dot" />
              Building...
            </span>
          )}
          <button className="header-button" onClick={() => builder.rebuild()}>
            Rebuild
          </button>
          <button className="header-button" onClick={() => builder.reset()}>
            Reset
          </button>
        </div>
      </header>

      {/* Main Content */}
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

      {/* Chat Panel */}
      <div className="chat-panel">
        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>Describe what you want to build and Alfred will generate the code.</p>
              <div className="chat-suggestions">
                <button onClick={() => setInputValue('Create a todo app with React')}>
                  Todo App
                </button>
                <button onClick={() => setInputValue('Build a weather dashboard')}>
                  Weather Dashboard
                </button>
                <button onClick={() => setInputValue('Create a landing page')}>
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
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe what you want to build..."
            disabled={isStreaming}
          />
          <button type="submit" disabled={isStreaming || !inputValue.trim()}>
            {isStreaming ? 'Building...' : 'Build'}
          </button>
        </form>
      </div>

      {/* Console Panel (collapsible) */}
      {consoleEntries.length > 0 && (
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
          background: #0a0a0c;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .builder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          font-size: 18px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .project-name {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          padding-left: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .building-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6366f1;
        }

        .building-dot {
          width: 6px;
          height: 6px;
          background: #6366f1;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .header-button {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .header-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .builder-main {
          flex: 1;
          overflow: hidden;
        }

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
