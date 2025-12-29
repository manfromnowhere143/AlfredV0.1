'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Theme = 'dark' | 'space' | 'light';

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
// FLOATING CONTROL PANEL - State of the Art
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
  const [showChats, setShowChats] = useState(false);
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
      setShowChats(false);
      setShowUserMenu(false);
      const timer = setTimeout(() => setIsVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('alfred-theme') as Theme | null;
    if (saved && ['dark', 'space', 'light'].includes(saved)) setTheme(saved);
  }, []);

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
      {/* NO BACKDROP - Page stays fully interactive */}

      <aside className={`control-panel ${isOpen ? 'open' : 'closing'}`}>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* THEME TOGGLE - Top, rounded header                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="panel-header">
          <div className="theme-row">
            <button
              className={`theme-orb dark ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
              aria-label="Dark"
            />
            <button
              className={`theme-orb space ${theme === 'space' ? 'active' : ''}`}
              onClick={() => handleThemeChange('space')}
              aria-label="Space"
            />
            <button
              className={`theme-orb light ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
              aria-label="Light"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* USER AVATAR - Floating with dropdown                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="user-section" ref={userMenuRef}>
          {user ? (
            <button className="icon-btn user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-initial">{getUserInitial()}</span>
              )}
            </button>
          ) : (
            <button className="icon-btn" onClick={onSignIn}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M6 28C6 28 8 19 16 19C24 19 26 28 26 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
          )}

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
        {/* FLOATING ACTION ICONS - State of the art 3D glass                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="icon-row">
          {/* New Chat */}
          <button className="icon-btn" onClick={() => { onNewConversation?.(); onClose(); }} title="New Chat">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Chat History */}
          <button
            className={`icon-btn ${showChats ? 'active' : ''}`}
            onClick={() => setShowChats(!showChats)}
            title="Chat History"
          >
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M27 15.5a10.5 10.5 0 01-1.1 4.7 10.5 10.5 0 01-9.4 5.8 10.5 10.5 0 01-4.7-1.1L5 27l2.4-7.1a10.5 10.5 0 01-1.1-4.7A10.5 10.5 0 0112 5.8a10.5 10.5 0 014.7-1.1h.6A10.5 10.5 0 0127 15v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>

          {/* Projects */}
          <button className="icon-btn" onClick={() => {}} title="Projects">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="18" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="5" y="18" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="18" y="18" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CHAT LIST - Floating container with fade overlays                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`chat-container ${showChats ? 'visible' : ''}`}>
          <div className="chat-header">
            <span className="chat-label">HISTORY</span>
          </div>

          <div className="chat-body">
            <div
              className="fade-top"
              style={{ background: `linear-gradient(to bottom, ${fadeColor} 0%, ${fadeColor} 40%, transparent 100%)` }}
            />

            <div className="chat-scroll">
              {isLoadingConversations ? (
                <div className="chat-empty">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="chat-empty">No chats yet</div>
              ) : conversations.map((c, i) => (
                <button
                  key={c.id}
                  className="chat-item"
                  onClick={() => { onSelectConversation?.(c.id); onClose(); }}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="chat-title">{c.title}</span>
                  <span className="chat-meta">{formatDate(c.timestamp)}</span>
                </button>
              ))}
            </div>

            <div
              className="fade-bottom"
              style={{ background: `linear-gradient(to top, ${fadeColor} 0%, ${fadeColor} 40%, transparent 100%)` }}
            />
          </div>
        </div>

      </aside>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CONTROL PANEL - Floating, transparent, from LEFT                                */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .control-panel {
          position: fixed;
          top: 24px;
          left: 24px;
          bottom: 24px;
          width: 72px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          
          background: transparent;
          pointer-events: none;
          
          transform: translateX(-120%);
          opacity: 0;
          transition: 
            transform 0.5s cubic-bezier(0.32, 0.72, 0, 1),
            opacity 0.4s ease;
        }
        
        .control-panel > * {
          pointer-events: auto;
        }
        
        .control-panel.open { 
          transform: translateX(0); 
          opacity: 1;
        }
        
        .control-panel.closing {
          transform: translateX(-120%);
          opacity: 0;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* PANEL HEADER - Theme orbs with rounded container                                */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .panel-header {
          padding: 12px 10px;
          border-radius: 20px;
          background: linear-gradient(145deg, 
            rgba(26, 26, 26, 0.9), 
            rgba(10, 10, 11, 0.95)
          );
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        :global([data-theme="light"]) .panel-header {
          background: linear-gradient(145deg, 
            rgba(255, 255, 255, 0.95), 
            rgba(245, 245, 240, 0.9)
          );
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.08),
            0 8px 32px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        .theme-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .theme-orb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        
        .theme-orb.dark {
          background: linear-gradient(145deg, #1a1a1a, #000);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.5);
        }
        
        .theme-orb.dark::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 5px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
        }
        
        .theme-orb.space {
          background: linear-gradient(145deg, #48484A, #2C2C2E);
          box-shadow: 
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.4);
        }
        
        .theme-orb.space::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 5px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
        }
        
        .theme-orb.light {
          background: linear-gradient(145deg, #fff, #e5e5e5);
          box-shadow: 
            inset 0 1px 0 #fff,
            0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .theme-orb.light::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 5px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 60%);
        }
        
        .theme-orb.active {
          transform: scale(1.15);
          box-shadow: 
            0 0 0 2px rgba(201, 185, 154, 0.6),
            0 0 16px rgba(201, 185, 154, 0.3),
            0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        .theme-orb:hover:not(.active) {
          transform: scale(1.1);
        }
        
        .theme-orb:active {
          transform: scale(0.92);
          transition: transform 0.1s ease;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* ICON BUTTONS - State of the art 3D glass like portfolio                        */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-section {
          position: relative;
        }
        
        .icon-row {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .icon-btn {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary, #fff);
          
          background: linear-gradient(
            145deg,
            #1a1a1a 0%,
            #0e0e0e 50%,
            #080808 100%
          );
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.04),
            0 4px 12px rgba(0, 0, 0, 0.5),
            0 8px 24px rgba(0, 0, 0, 0.4),
            0 16px 40px rgba(0, 0, 0, 0.3),
            inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
          
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          -webkit-tap-highlight-color: transparent;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          transform: translateZ(0) scale(1);
          overflow: hidden;
        }
        
        /* Gradient border */
        .icon-btn::before {
          content: '';
          position: absolute;
          inset: -0.5px;
          border-radius: 16.5px;
          padding: 0.5px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.12),
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.01)
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
        }
        
        /* Top shine */
        .icon-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 45%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            transparent 100%
          );
          border-radius: 16px 16px 50% 50%;
          pointer-events: none;
          z-index: 10;
        }
        
        .icon-btn:hover {
          transform: translateZ(0) scale(1.1) translateY(-3px);
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.1),
            0 0 24px rgba(255, 255, 255, 0.05),
            0 8px 20px rgba(0, 0, 0, 0.5),
            0 16px 40px rgba(0, 0, 0, 0.4);
        }
        
        .icon-btn:active {
          transform: translateZ(0) scale(0.95);
          transition: transform 0.1s ease;
        }
        
        .icon-btn.active {
          background: linear-gradient(
            145deg,
            #262626 0%,
            #181818 50%,
            #0c0c0c 100%
          );
          box-shadow: 
            0 0 0 0.5px rgba(255, 255, 255, 0.1),
            0 0 20px rgba(201, 185, 154, 0.2),
            0 6px 16px rgba(0, 0, 0, 0.45);
          color: #C9B99A;
        }
        
        .icon-btn.active::after {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.03) 50%,
            transparent 100%
          );
        }
        
        .icon-btn svg {
          position: relative;
          z-index: 5;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          transition: filter 0.3s ease;
        }
        
        .icon-btn.active svg {
          filter: drop-shadow(0 0 8px rgba(201, 185, 154, 0.4))
                  drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
        
        /* Light theme icons */
        :global([data-theme="light"]) .icon-btn {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #f5f5f5 50%,
            #ebebeb 100%
          );
          color: #1a1a1a;
          box-shadow: 
            0 0 0 0.5px rgba(0, 0, 0, 0.04),
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 8px 24px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        :global([data-theme="light"]) .icon-btn::before {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.9),
            rgba(0, 0, 0, 0.02),
            rgba(255, 255, 255, 0.5),
            rgba(0, 0, 0, 0.01)
          );
        }
        
        :global([data-theme="light"]) .icon-btn::after {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
        }
        
        :global([data-theme="light"]) .icon-btn:hover {
          box-shadow: 
            0 0 0 0.5px rgba(0, 0, 0, 0.06),
            0 12px 32px rgba(0, 0, 0, 0.12),
            0 24px 56px rgba(0, 0, 0, 0.1);
        }
        
        :global([data-theme="light"]) .icon-btn.active {
          background: linear-gradient(
            145deg,
            #f8f8f8 0%,
            #f0f0f0 50%,
            #e8e8e8 100%
          );
          color: #8B7355;
        }
        
        :global([data-theme="light"]) .icon-btn svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
        }
        
        /* User button with avatar */
        .user-btn {
          border-radius: 50%;
          overflow: hidden;
        }
        
        .user-btn::before {
          border-radius: 50%;
        }
        
        .user-btn::after {
          border-radius: 50%;
        }
        
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: relative;
          z-index: 5;
        }
        
        .avatar-initial {
          font-size: 18px;
          font-weight: 600;
          position: relative;
          z-index: 5;
        }
        
        /* User dropdown */
        .user-dropdown {
          position: absolute;
          top: 60px;
          left: 0;
          min-width: 180px;
          background: var(--bg-secondary, rgba(10, 10, 11, 0.95));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 14px;
          padding: 8px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 16px 48px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: dropIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 200;
        }
        
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        :global([data-theme="light"]) .user-dropdown {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(0, 0, 0, 0.06);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 16px 48px rgba(0, 0, 0, 0.1);
        }
        
        .user-info {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
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
          gap: 10px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 10px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .dropdown-item:hover {
          background: var(--border-subtle, rgba(255,255,255,0.08));
          color: var(--text-primary, #fff);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CHAT CONTAINER - Floating with fade overlays                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .chat-container {
          flex: 1;
          max-height: 280px;
          width: 200px;
          margin-left: -10px;
          display: flex;
          flex-direction: column;
          
          background: linear-gradient(145deg, 
            rgba(26, 26, 26, 0.9), 
            rgba(10, 10, 11, 0.95)
          );
          border-radius: 16px;
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          
          opacity: 0;
          transform: translateX(-10px);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .chat-container.visible {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }
        
        :global([data-theme="light"]) .chat-container {
          background: linear-gradient(145deg, 
            rgba(255, 255, 255, 0.95), 
            rgba(245, 245, 240, 0.9)
          );
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.08),
            0 8px 32px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        .chat-header {
          padding: 12px 14px 8px;
        }
        
        .chat-label {
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: var(--text-muted, rgba(255,255,255,0.4));
        }
        
        .chat-body {
          position: relative;
          flex: 1;
          overflow: hidden;
        }
        
        .fade-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 20px;
          pointer-events: none;
          z-index: 10;
        }
        
        .fade-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          pointer-events: none;
          z-index: 10;
        }
        
        .chat-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 16px 10px;
          scrollbar-width: none;
        }
        
        .chat-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .chat-empty {
          padding: 24px 8px;
          text-align: center;
          color: var(--text-muted, rgba(255,255,255,0.35));
          font-size: 12px;
        }
        
        .chat-item {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          padding: 10px 12px;
          margin-bottom: 4px;
          border-radius: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          animation: itemSlide 0.25s cubic-bezier(0.32, 0.72, 0, 1) backwards;
          -webkit-tap-highlight-color: transparent;
          text-align: left;
        }
        
        @keyframes itemSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .chat-item:hover {
          background: var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .chat-item:active {
          transform: scale(0.98);
        }
        
        .chat-title {
          font-size: 12px;
          font-weight: 400;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        
        .chat-meta {
          font-size: 10px;
          color: var(--text-muted, rgba(255,255,255,0.35));
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MOBILE                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .control-panel {
            top: 16px;
            left: 16px;
            bottom: 16px;
            width: 64px;
            gap: 12px;
            padding: 12px 0;
          }
          
          .panel-header {
            padding: 10px 8px;
            border-radius: 18px;
          }
          
          .theme-row {
            gap: 6px;
          }
          
          .theme-orb {
            width: 24px;
            height: 24px;
          }
          
          .icon-btn {
            width: 46px;
            height: 46px;
            border-radius: 14px;
          }
          
          .icon-btn svg {
            width: 20px;
            height: 20px;
          }
          
          .chat-container {
            width: 180px;
            max-height: 240px;
            margin-left: -8px;
            border-radius: 14px;
          }
          
          .chat-header {
            padding: 10px 12px 6px;
          }
          
          .chat-item {
            padding: 8px 10px;
          }
          
          .chat-title {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}