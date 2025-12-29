'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Theme = 'dark' | 'space' | 'light';
type SidebarView = 'main' | 'projects' | 'conversations';

interface Project { id: string; name: string; lastActive: Date; }
interface Conversation { id: string; title: string; preview: string; timestamp: Date; }

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  conversations?: Conversation[];
  isLoadingConversations?: boolean;
  onSelectProject?: (id: string) => void;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  user?: { name?: string; email?: string; avatar?: string } | null;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR — State of the Art Floating Design
// ═══════════════════════════════════════════════════════════════════════════════

export default function Sidebar({
  isOpen,
  onClose,
  projects = [],
  conversations = [],
  onSelectProject,
  onSelectConversation,
  onNewConversation,
  isLoadingConversations = false,
  user,
  onSignOut,
  onSignIn,
}: SidebarProps) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<SidebarView>('main');
  const [isVisible, setIsVisible] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [fadeColor, setFadeColor] = useState('#0a0a0b');
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync fade color with theme instantly
  useEffect(() => {
    const update = () => setFadeColor(document.documentElement.getAttribute('data-theme') === 'light' ? '#FFFFFF' : '#0a0a0b');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('alfred-theme') as Theme | null;
    if (saved && ['dark', 'space', 'light'].includes(saved)) setTheme(saved);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('alfred-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setView('main'), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* Backdrop - very subtle, click to close */}
      <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />

      {/* Sidebar from LEFT - Floating, transparent */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closing'}`}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* USER AVATAR - Floating top                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="user-section" ref={userMenuRef}>
          {user ? (
            <button className="user-avatar-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-initial">{getUserInitial()}</span>
              )}
            </button>
          ) : (
            <button className="sign-in-floating" onClick={onSignIn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21v-1a4 4 0 014-4h8a4 4 0 014 4v1"/>
              </svg>
            </button>
          )}

          {/* User dropdown */}
          {showUserMenu && user && (
            <div className="user-dropdown">
              <div className="user-info">
                <span className="user-name">{user.name || 'User'}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { onSignOut?.(); setShowUserMenu(false); onClose(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FLOATING ACTION ICONS - Like portfolio nav                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="floating-actions">
          {/* New Chat */}
          <button className="floating-icon" onClick={() => { onNewConversation?.(); onClose(); }} title="New Chat">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Projects */}
          <button
            className={`floating-icon ${view === 'projects' ? 'active' : ''}`}
            onClick={() => setView(view === 'projects' ? 'main' : 'projects')}
            title="Projects"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </button>

          {/* Chats History */}
          <button
            className={`floating-icon ${view === 'conversations' ? 'active' : ''}`}
            onClick={() => setView(view === 'conversations' ? 'main' : 'conversations')}
            title="Chat History"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FLOATING LIST CONTAINER - Like code blocks                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`floating-list-container ${view !== 'main' ? 'visible' : ''}`}>
          <div className="list-header">
            <span className="list-title">{view === 'projects' ? 'PROJECTS' : 'CHATS'}</span>
            <button className="list-close" onClick={() => setView('main')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="list-body">
            <div
              className="list-fade-top"
              style={{ background: `linear-gradient(to bottom, ${fadeColor} 0%, ${fadeColor} 30%, transparent 100%)` }}
            />

            <div className="list-scroll">
              {view === 'projects' && (
                projects.length === 0 ? (
                  <div className="list-empty">No projects yet</div>
                ) : projects.map((p, i) => (
                  <button
                    key={p.id}
                    className="list-item"
                    onClick={() => { onSelectProject?.(p.id); onClose(); }}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="item-title">{p.name}</span>
                    <span className="item-meta">{formatDate(p.lastActive)}</span>
                  </button>
                ))
              )}

              {view === 'conversations' && (
                isLoadingConversations ? (
                  <div className="list-empty">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="list-empty">No chats yet</div>
                ) : conversations.map((c, i) => (
                  <button
                    key={c.id}
                    className="list-item"
                    onClick={() => { onSelectConversation?.(c.id); onClose(); }}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="item-title">{c.title}</span>
                    <span className="item-meta">{c.preview?.slice(0, 30) || ''}...</span>
                  </button>
                ))
              )}
            </div>

            <div
              className="list-fade-bottom"
              style={{ background: `linear-gradient(to top, ${fadeColor} 0%, ${fadeColor} 30%, transparent 100%)` }}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* THEME TOGGLE - Floating bottom                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="theme-section">
          <button
            className={`theme-orb dark ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeChange('dark')}
            aria-label="Dark theme"
          />
          <button
            className={`theme-orb space ${theme === 'space' ? 'active' : ''}`}
            onClick={() => handleThemeChange('space')}
            aria-label="Space theme"
          />
          <button
            className={`theme-orb light ${theme === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeChange('light')}
            aria-label="Light theme"
          />
        </div>
      </aside>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* BACKDROP                                                                        */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0);
          z-index: 99;
          pointer-events: none;
          transition: background 0.4s ease;
        }
        
        .sidebar-backdrop.open {
          background: rgba(0, 0, 0, 0.3);
          pointer-events: auto;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* SIDEBAR - Floating, Transparent, from LEFT                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 200px;
          height: 100vh;
          height: 100dvh;
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: 24px 20px;
          gap: 32px;
          
          /* NO background - floating elements only */
          background: transparent;
          
          transform: translateX(-100%);
          opacity: 0;
          transition: 
            transform 0.5s cubic-bezier(0.32, 0.72, 0, 1),
            opacity 0.4s ease;
          
          -webkit-tap-highlight-color: transparent;
        }
        
        .sidebar.open { 
          transform: translateX(0); 
          opacity: 1;
        }
        
        .sidebar.closing {
          transform: translateX(-100%);
          opacity: 0;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* USER SECTION - Floating avatar                                                  */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-section {
          position: relative;
        }
        
        .user-avatar-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.4),
            0 8px 24px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .user-avatar-btn:hover {
          transform: scale(1.08);
          box-shadow: 
            0 6px 16px rgba(0, 0, 0, 0.5),
            0 12px 32px rgba(0, 0, 0, 0.4);
        }
        
        .user-avatar-btn:active {
          transform: scale(0.95);
        }
        
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .avatar-initial {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }
        
        .sign-in-floating {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: linear-gradient(145deg, #1a1a1a, #0a0a0a);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.4),
            0 8px 24px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary, #fff);
        }
        
        .sign-in-floating:hover {
          transform: scale(1.08);
        }
        
        /* Light theme avatars */
        :global([data-theme="light"]) .user-avatar-btn,
        :global([data-theme="light"]) .sign-in-floating {
          background: linear-gradient(145deg, #ffffff, #f0f0f0);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.1),
            0 8px 24px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        /* User dropdown */
        .user-dropdown {
          position: absolute;
          top: 56px;
          left: 0;
          min-width: 180px;
          background: var(--bg-secondary, #0a0a0b);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: dropIn 0.2s ease;
        }
        
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .user-info {
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .user-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }
        
        .user-email {
          font-size: 11px;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        
        .dropdown-divider {
          height: 1px;
          background: var(--border-subtle, rgba(255,255,255,0.08));
          margin: 6px 0;
        }
        
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: none;
          background: transparent;
          border-radius: 8px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .dropdown-item:hover {
          background: var(--border-subtle, rgba(255,255,255,0.08));
          color: var(--text-primary, #fff);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* FLOATING ACTION ICONS - Like portfolio nav                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .floating-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .floating-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary, #fff);
          
          background: linear-gradient(145deg, #161616, #0c0c0c);
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.04),
            0 4px 10px rgba(0, 0, 0, 0.5),
            0 8px 20px rgba(0, 0, 0, 0.4),
            inset 0 0.5px 0 rgba(255, 255, 255, 0.05);
          
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          -webkit-tap-highlight-color: transparent;
        }
        
        .floating-icon::before {
          content: '';
          position: absolute;
          inset: -0.5px;
          border-radius: 16.5px;
          padding: 0.5px;
          background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.5;
        }
        
        .floating-icon:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.08),
            0 8px 16px rgba(0, 0, 0, 0.5),
            0 16px 32px rgba(0, 0, 0, 0.4);
        }
        
        .floating-icon:active {
          transform: scale(0.95);
          transition: transform 0.1s ease;
        }
        
        .floating-icon.active {
          background: linear-gradient(145deg, #1e1e1e, #121212);
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.1),
            0 0 20px rgba(201, 185, 154, 0.15),
            0 6px 14px rgba(0, 0, 0, 0.45);
          color: #C9B99A;
        }
        
        /* Light theme icons */
        :global([data-theme="light"]) .floating-icon {
          background: linear-gradient(145deg, #ffffff, #f0f0f0);
          color: #1a1a1a;
          box-shadow: 
            0 4px 10px rgba(0, 0, 0, 0.08),
            0 8px 20px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        :global([data-theme="light"]) .floating-icon:hover {
          box-shadow: 
            0 8px 20px rgba(0, 0, 0, 0.12),
            0 16px 40px rgba(0, 0, 0, 0.1);
        }
        
        :global([data-theme="light"]) .floating-icon.active {
          background: linear-gradient(145deg, #f8f8f8, #ebebeb);
          color: #8B7355;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* FLOATING LIST CONTAINER - Like code blocks                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .floating-list-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .floating-list-container.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px 12px 4px;
        }
        
        .list-title {
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        
        .list-close {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.5));
          transition: all 0.15s ease;
        }
        
        .list-close:hover {
          background: var(--border-subtle, rgba(255,255,255,0.08));
          color: var(--text-primary, #fff);
        }
        
        .list-body {
          position: relative;
          flex: 1;
          overflow: hidden;
        }
        
        .list-fade-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 24px;
          pointer-events: none;
          z-index: 10;
        }
        
        .list-fade-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 24px;
          pointer-events: none;
          z-index: 10;
        }
        
        .list-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 24px 0;
          scrollbar-width: none;
        }
        
        .list-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .list-empty {
          padding: 32px 8px;
          text-align: center;
          color: var(--text-muted, rgba(255,255,255,0.4));
          font-size: 12px;
        }
        
        .list-item {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          padding: 10px 12px;
          margin-bottom: 4px;
          border-radius: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          animation: itemSlide 0.3s cubic-bezier(0.32, 0.72, 0, 1) backwards;
          -webkit-tap-highlight-color: transparent;
        }
        
        @keyframes itemSlide {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .list-item:hover {
          background: var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .list-item:active {
          transform: scale(0.98);
        }
        
        .item-title {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-align: left;
        }
        
        .item-meta {
          font-size: 11px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-align: left;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* THEME TOGGLE - Floating bottom                                                  */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .theme-section {
          display: flex;
          gap: 10px;
          padding-top: 12px;
        }
        
        .theme-orb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
        }
        
        .theme-orb.dark {
          background: linear-gradient(145deg, #1a1a1a, #000);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.4);
        }
        
        .theme-orb.space {
          background: linear-gradient(145deg, #48484A, #2C2C2E);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .theme-orb.light {
          background: linear-gradient(145deg, #fff, #e8e8e8);
          box-shadow: 
            inset 0 1px 0 #fff,
            0 2px 6px rgba(0, 0, 0, 0.12);
        }
        
        .theme-orb.active {
          transform: scale(1.2);
          box-shadow: 
            0 0 0 2px var(--accent-primary, #C9B99A),
            0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .theme-orb:hover:not(.active) {
          transform: scale(1.1);
        }
        
        .theme-orb:active {
          transform: scale(0.95);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MOBILE                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .sidebar {
            width: 180px;
            padding: 20px 16px;
            gap: 24px;
          }
          
          .user-avatar-btn,
          .sign-in-floating {
            width: 44px;
            height: 44px;
          }
          
          .floating-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
          }
          
          .floating-icon svg {
            width: 20px;
            height: 20px;
          }
          
          .list-item {
            padding: 8px 10px;
          }
          
          .item-title {
            font-size: 12px;
          }
          
          .item-meta {
            font-size: 10px;
          }
          
          .theme-orb {
            width: 22px;
            height: 22px;
          }
        }
      `}</style>
    </>
  );
}