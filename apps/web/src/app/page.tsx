'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import ChatInput from '@/components/ChatInput';
import Message, { AlfredThinking, ArtifactProvider } from '@/components/Message';
import AuthModal from '@/components/AuthModal';

const GoldenSpiral3D = dynamic(() => import('@/components/Goldenspiral3d'), {
  ssr: false,
  loading: () => <div style={{ width: 280, height: 280 }} />
});

interface ChatMessage {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
}

interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  file: File;
}

interface Project {
  id: string;
  name: string;
  lastActive: Date;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

function LoadingScreen({ progress, isVisible }: { progress: number; isVisible: boolean }) {
  return (
    <div className={`loading-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="loading-logo">Alfred</div>
      <div className="loading-progress-container">
        <div className="loading-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function UserMenu({ 
  isSignedIn, 
  onLogout,
  userInitial = 'U'
}: { 
  isSignedIn: boolean; 
  onLogout: () => void;
  userInitial?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isSignedIn) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-avatar" onClick={() => setIsOpen(!isOpen)} aria-label="User menu">
        {userInitial}
      </button>
      <div className={`user-dropdown ${isOpen ? 'open' : ''}`}>
        <button className="user-dropdown-item" onClick={() => setIsOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </button>
        <button className="user-dropdown-item" onClick={() => setIsOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
        <button className="user-dropdown-item danger" onClick={() => { setIsOpen(false); onLogout(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>
      </div>
    </div>
  );
}

export default function AlfredChat() {
  const { data: session, status } = useSession();
  const isSignedIn = !!session?.user;
  const isAuthChecked = status !== 'loading';

  const [isAppReady, setIsAppReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = useRef<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      setLoadingProgress(10);
      await new Promise(r => setTimeout(r, 50));
      const savedTheme = localStorage.getItem('alfred-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
      setLoadingProgress(30);
      await new Promise(r => setTimeout(r, 50));
      setLoadingProgress(60);
      setLoadingProgress(90);
      await new Promise(r => setTimeout(r, 100));
      setLoadingProgress(100);
      await new Promise(r => setTimeout(r, 200));
      setIsAppReady(true);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      const loadUserData = async () => {
        try {
          const [projectsRes, convsRes] = await Promise.all([
            fetch('/api/projects'),
            fetch('/api/conversations')
          ]);
          if (projectsRes.ok) {
            const data = await projectsRes.json();
            setProjects(data.data || []);
          }
          if (convsRes.ok) {
            const data = await convsRes.json();
            setConversations(data.data || []);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      };
      loadUserData();
    }
  }, [isSignedIn]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSignIn = async (method: 'apple' | 'google' | 'email' | 'sso', email?: string) => {
    console.log('Sign in with:', method, email);
    if (method === 'google') {
      await signIn('google');
    } else if (method === 'email' && email) {
      const result = await signIn('credentials', { email, redirect: false });
      if (result?.ok) {
        setAuthModalOpen(false);
      } else {
        console.error('Sign in failed:', result?.error);
      }
    } else if (method === 'apple') {
      alert('Apple Sign In requires Apple Developer credentials. Coming soon!');
    } else if (method === 'sso') {
      alert('SSO coming soon!');
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    setProjects([]);
    setConversations([]);
    setMessages([]);
    conversationId.current = null;
  };

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && !attachments?.length) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const history = messages.map(m => ({
        role: m.role === 'alfred' ? 'assistant' : 'user',
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history,
          conversationId: conversationId.current,
          userId: (session?.user as any)?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

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
                  setStreamingContent(fullContent);
                }
                if (parsed.conversationId) {
                  conversationId.current = parsed.conversationId;
                }
              } catch {
                fullContent += data;
                setStreamingContent(fullContent);
              }
            }
          }
        }
      }

      const alfredMessage: ChatMessage = {
        id: `alfred-${Date.now()}`,
        role: 'alfred',
        content: fullContent || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, alfredMessage]);
      setStreamingContent('');

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `alfred-${Date.now()}`,
        role: 'alfred',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    conversationId.current = null;
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        conversationId.current = id;
        setMessages(data.data?.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
    setSidebarOpen(false);
  };

  const handleSelectProject = (id: string) => {
    console.log('Select project:', id);
    setSidebarOpen(false);
  };

  const hasMessages = messages.length > 0;
  const userInitial = session?.user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <LoadingScreen progress={loadingProgress} isVisible={!isAppReady} />

      <div className="alfred-app" style={{ opacity: isAppReady ? 1 : 0 }}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          projects={projects}
          conversations={conversations}
          onNewConversation={handleNewConversation}
          onSelectProject={handleSelectProject}
          onSelectConversation={handleSelectConversation}
        />

        <button
          className={`sidebar-trigger ${sidebarOpen ? 'hidden' : ''}`}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <div className="sidebar-trigger-icon">
            <span className="sidebar-trigger-line" />
            <span className="sidebar-trigger-line" />
            <span className="sidebar-trigger-line" />
          </div>
        </button>

        <UserMenu isSignedIn={isSignedIn} onLogout={handleLogout} userInitial={userInitial} />

        <main className="chat-container">
          {!hasMessages ? (
            <div className="chat-empty">
              {isSignedIn ? (
                <GoldenSpiral3D />
              ) : (
                <>
                  <h1 className="chat-empty-brand">Alfred</h1>
                  <p className="chat-empty-tagline">A product architect with taste</p>
                </>
              )}
            </div>
          ) : (
            <div className="chat-messages">
              <div className="chat-messages-inner">
                <ArtifactProvider>
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      id={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  ))}
                  {isLoading && streamingContent && (
                    <Message
                      id="streaming"
                      role="alfred"
                      content={streamingContent}
                      timestamp={new Date()}
                      isStreaming
                    />
                  )}
                </ArtifactProvider>
                {isLoading && !streamingContent && <AlfredThinking />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder={hasMessages ? "Continue the conversation..." : "What are we building?"}
            isSignedIn={isSignedIn}
            isAuthChecked={isAuthChecked}
            onSignIn={() => setAuthModalOpen(true)}
          />
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignIn={handleSignIn}
      />

      <style jsx>{`
        .spiral-loading {
          width: 280px;
          height: 280px;
          margin: 0 auto;
        }
      `}</style>
    </>
  );
}