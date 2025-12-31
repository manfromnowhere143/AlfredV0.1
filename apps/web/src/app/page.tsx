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
  loading: () => <div style={{ width: 200, height: 200 }} />
});

interface ChatMessage {
  id: string;
  role: 'user' | 'alfred';
  content: string;
  timestamp: Date;
  files?: Attachment[];
}

interface DBMessage {
  id: string;
  role: 'user' | 'assistant' | 'alfred';
  content: string;
  createdAt: string;
  files?: Attachment[];
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'code';
  name: string;
  file?: File;
  size: number;
  url?: string;
  base64?: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  progress: number;
  error?: string;
  duration?: number;
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

function mapDBMessageToChat(msg: DBMessage): ChatMessage {
  return {
    id: msg.id,
    role: msg.role === 'assistant' ? 'alfred' : (msg.role as 'user' | 'alfred'),
    content: msg.files && msg.files.length > 0 && msg.content === '[File attachment]' ? '' : msg.content,
    timestamp: new Date(msg.createdAt),
    files: msg.files,
  };
}

function LoadingScreen({ progress, isVisible }: { progress: number; isVisible: boolean }) {
  return (
    <div className={'loading-screen ' + (isVisible ? '' : 'fade-out')}>
      <div className="loading-logo">Alfred</div>
      <div className="loading-progress-container">
        <div className="loading-progress-bar" style={{ width: progress + '%' }} />
      </div>
    </div>
  );
}

function ConversationLoader() {
  return (
    <div className="conversation-loader">
      <div className="loader-container">
        <div className="loader-spinner" />
      </div>
      <style jsx>{`
        .conversation-loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 15vh;
        }
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: fadeIn 0.2s ease;
        }
        .loader-spinner {
          width: 24px;
          height: 24px;
          border: 1.5px solid rgba(201, 185, 154, 0.15);
          border-top-color: rgba(201, 185, 154, 0.7);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
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
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // Prevent iOS viewport resize on keyboard open - lock visual viewport
  useEffect(() => {
    // Set initial viewport height
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--initial-vh', `${vh}px`);
    };
    
    setViewportHeight();
    
    // Handle Visual Viewport for keyboard detection (iOS Safari)
    if (typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;
      
      const handleViewportChange = () => {
        // Calculate keyboard height
        const keyboardHeight = window.innerHeight - viewport.height;
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        
        // Update viewport offset for smooth positioning
        document.documentElement.style.setProperty('--viewport-offset', `${viewport.offsetTop}px`);
      };
      
      viewport.addEventListener('resize', handleViewportChange);
      viewport.addEventListener('scroll', handleViewportChange);
      
      return () => {
        viewport.removeEventListener('resize', handleViewportChange);
        viewport.removeEventListener('scroll', handleViewportChange);
      };
    }
    
    // Fallback: only update on orientation change
    const handleOrientationChange = () => {
      setTimeout(setViewportHeight, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      setLoadingProgress(10);
      await new Promise(r => setTimeout(r, 50));
      const savedTheme = localStorage.getItem('alfred-theme');
      if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
      setLoadingProgress(30);
      await new Promise(r => setTimeout(r, 50));
      setLoadingProgress(60);
      setLoadingProgress(90);
      setLoadingProgress(100);
      await new Promise(r => setTimeout(r, 200));
      setIsAppReady(true);
      if (status !== "loading" && !session?.user) setAuthModalOpen(true);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    const preventGestureZoom = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGestureZoom);
    document.addEventListener('gesturechange', preventGestureZoom);
    document.addEventListener('gestureend', preventGestureZoom);
    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGestureZoom);
      document.removeEventListener('gesturechange', preventGestureZoom);
      document.removeEventListener('gestureend', preventGestureZoom);
    };
  }, []);

  const loadUserData = useCallback(async () => {
    if (!isSignedIn) {
      setIsLoadingConversations(false);
      return;
    }
    setIsLoadingConversations(true);
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
        const mappedConvs = (data.data || []).map((c: any) => ({
          id: c.id,
          title: c.title || 'Untitled',
          preview: c.summary || c.title || '',
          timestamp: new Date(c.updatedAt || c.createdAt),
        }));
        setConversations(mappedConvs);
      }
    } catch (error) {
      console.error('[Alfred] Failed to load user data:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isSignedIn]);

  useEffect(() => { if (status !== "loading") loadUserData(); }, [loadUserData, status]);

  const scrollToBottom = useCallback(() => {
    if (!userHasScrolledRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 20) userHasScrolledRef.current = true;
  }, []);
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    if (el.scrollTop < lastScrollTopRef.current - 10) {
      userHasScrolledRef.current = true;
    }
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (isAtBottom) userHasScrolledRef.current = false;
    lastScrollTopRef.current = el.scrollTop;
  }, []);
  useEffect(() => { if (isLoading) userHasScrolledRef.current = false; }, [isLoading]);
  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  const handleSignIn = async (method: 'apple' | 'google' | 'email' | 'sso', email?: string) => {
    if (method === 'google') {
      await signIn('google', { callbackUrl: '/' });
    } else if (method === 'email' && email) {
      await signIn('email', { email, redirect: false });
      // AuthModal shows success view internally
    } else if (method === 'apple') {
      alert('Apple Sign In coming soon!');
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
      id: 'user-' + Date.now(),
      role: 'user',
      content,
      timestamp: new Date(),
      files: attachments?.map(a => ({ ...a })),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId.current,
          files: attachments?.filter(a => a.status === 'ready').map(a => ({
            id: a.id,
            name: a.name,
            type: a.type === 'image' ? 'image/' + (a.name.split('.').pop()?.toLowerCase() || 'jpeg') : a.type,
            size: a.size,
            url: a.url,
            base64: a.type === 'video' ? undefined : a.base64,
          })),
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
                if (parsed.conversationId && !conversationId.current) {
                  conversationId.current = parsed.conversationId;
                  loadUserData();
                }
              } catch {}
            }
          }
        }
      }

      setMessages(prev => [...prev, {
        id: 'alfred-' + Date.now(),
        role: 'alfred',
        content: fullContent || 'I encountered an issue processing your request.',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('[Alfred] Chat error:', error);
      setMessages(prev => [...prev, {
        id: 'alfred-' + Date.now(),
        role: 'alfred',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
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
    setSidebarOpen(false);
    setIsLoadingConversation(true);
    setMessages([]);
    
    try {
      const res = await fetch('/api/conversations/' + id);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          conversationId.current = id;
          const dbMessages: DBMessage[] = data.data.messages || [];
          await new Promise(r => setTimeout(r, 100));
          setMessages(dbMessages.map(mapDBMessageToChat));
        }
      }
    } catch (error) {
      console.error('[Alfred] Failed to load conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleSelectProject = (id: string) => {
    console.log('[Alfred] Select project:', id);
    setSidebarOpen(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      <LoadingScreen progress={loadingProgress} isVisible={!isAppReady} />

      <div className="alfred-app" style={{ opacity: isAppReady ? 1 : 0 }}>
        {/* SIDEBAR - Full control panel with user, projects, chats */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          projects={projects}
          conversations={conversations}
          onNewConversation={handleNewConversation}
          onSelectProject={handleSelectProject}
          onSelectConversation={handleSelectConversation}
          isLoadingConversations={isLoadingConversations}
          user={session?.user}
          onSignIn={() => setAuthModalOpen(true)}
          onSignOut={handleLogout}
        />

        {/* HAMBURGER - Top Right, Portfolio Style */}
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          <div className="hamburger-lines">
            <span className={'line line-1 ' + (sidebarOpen ? 'open' : '')} />
            <span className={'line line-2 ' + (sidebarOpen ? 'open' : '')} />
            <span className={'line line-3 ' + (sidebarOpen ? 'open' : '')} />
          </div>
        </button>

        <main className="chat-container">
          {isLoadingConversation ? (
            <ConversationLoader />
          ) : !hasMessages ? (
            <div className="chat-empty">
              {/* Title - Only when NOT signed in */}
              {!isSignedIn && (
                <h1 className="chat-empty-brand">Alfred</h1>
              )}
              
              {/* Golden Spiral - Only when signed in */}
              {isSignedIn && (
                <div className="spiral-container">
                  <GoldenSpiral3D />
                </div>
              )}
            </div>
          ) : (
            <div className="chat-messages" ref={chatContainerRef} onScroll={handleChatScroll} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
              <div className="chat-messages-inner">
                <ArtifactProvider conversationId={conversationId.current}>
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      id={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      files={message.files}
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
            conversationId={conversationId.current}
          />
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignIn={handleSignIn}
      />

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* HAMBURGER - Top Right, Portfolio Style Lines                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .hamburger-btn {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 101;
          width: 44px;
          height: 44px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px;
          -webkit-tap-highlight-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .hamburger-lines {
          width: 26px;
          height: 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .line {
          display: block;
          height: 2px;
          border-radius: 1px;
          background: var(--text-primary, #fff);
          transform-origin: right center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .line-1 { width: 26px; }
        .line-1.open {
          width: 22px;
          transform: rotate(-45deg) translateX(2px) translateY(-1px);
        }
        
        .line-2 { width: 18px; }
        .line-2.open {
          width: 0;
          opacity: 0;
          transform: translateX(10px);
        }
        
        .line-3 { width: 12px; }
        .line-3.open {
          width: 22px;
          transform: rotate(45deg) translateX(2px) translateY(1px);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CHAT EMPTY - Rock solid, never moves                                            */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-empty {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          /* Use initial viewport height - keyboard doesn't affect this */
          height: calc(var(--initial-vh, 1vh) * 100);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-bottom: 15vh;
          pointer-events: none;
          overflow: hidden;
          /* GPU acceleration for smooth rendering */
          -webkit-transform: translate3d(0, 0, 0);
          transform: translate3d(0, 0, 0);
        }
        
        .chat-empty-brand {
          font-family: var(--font-display, 'SF Pro Display', -apple-system, sans-serif);
          font-size: clamp(40px, 8vw, 56px);
          font-weight: 200;
          letter-spacing: -0.03em;
          color: var(--text-primary, #fff);
          margin: 0;
          opacity: 0.95;
          user-select: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          position: relative;
        }
        
        .spiral-container {
          pointer-events: auto;
        }
        
        @media (max-width: 768px) {
          .hamburger-btn {
            top: 16px;
            right: 16px;
            width: 40px;
            height: 40px;
            padding: 8px;
          }
          
          .hamburger-lines {
            width: 24px;
            height: 16px;
          }
          
          .line-1 { width: 24px; }
          .line-1.open { width: 20px; }
          .line-2 { width: 16px; }
          .line-3 { width: 10px; }
          .line-3.open { width: 20px; }
          
          .chat-empty {
            padding-bottom: 12vh;
          }
          
          .chat-empty-brand {
            font-size: clamp(36px, 12vw, 48px);
          }
          
          .spiral-container {
            transform: scale(0.9);
          }
        }
        
        /* iOS specific - prevent ALL keyboard layout shift */
        @supports (-webkit-touch-callout: none) {
          .chat-empty {
            /* Lock to window height at load time */
            height: 100vh;
            height: -webkit-fill-available;
          }
        }
      `}</style>
    </>
  );
}