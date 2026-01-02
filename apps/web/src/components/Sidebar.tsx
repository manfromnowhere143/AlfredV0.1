'use client';
import React from 'react';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  user?: { 
    name?: string | null; 
    email?: string | null; 
    image?: string | null;
    tier?: 'free' | 'pro' | 'enterprise';
  } | null;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING CONTROL PANEL - State of the Art
// ═══════════════════════════════════════════════════════════════════════════════

const Sidebar = React.memo(function Sidebar({
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
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('dark');
  const [activePanel, setActivePanel] = useState<'none' | 'chats' | 'projects'>('none');
  const [isVisible, setIsVisible] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentTier = user?.tier || 'free';
  const tierLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setActivePanel('none');
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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  const handleUpgrade = () => {
    setShowUserMenu(false);
    onClose();
    router.push('/pricing');
  };

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* USER BUTTON - Top Left                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`user-panel ${isOpen ? 'open' : 'closing'}`} ref={userMenuRef}>
        {user ? (
          <>
            <button
              className={`icon-btn user-btn ${currentTier === 'pro' ? 'pro-ring' : ''} ${currentTier === 'enterprise' ? 'enterprise-ring' : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
              aria-label="User menu"
            >
              {user.image ? (
                <img src={user.image} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-initial">{getUserInitial()}</span>
              )}
            </button>
            {/* User Dropdown */}
            <div className={`user-dropdown ${showUserMenu ? 'open' : ''}`}>
              {/* User Info Header */}
              <div className="user-header">
                <div className="user-avatar-large">
                  {user.image ? (
                    <img src={user.image} alt="" />
                  ) : (
                    <span>{getUserInitial()}</span>
                  )}
                  {currentTier !== 'free' && (
                    <div className={`tier-badge-avatar ${currentTier}`}>
                      {currentTier === 'pro' ? '✦' : '◆'}
                    </div>
                  )}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name || 'User'}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
              
              {/* Plan Section */}
              <div className="plan-section">
                <div className="plan-info">
                  <span className={`plan-badge ${currentTier}`}>
                    {currentTier === 'pro' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                      </svg>
                    )}
                    {currentTier === 'enterprise' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      </svg>
                    )}
                    {tierLabels[currentTier]}
                  </span>
                </div>
                {currentTier === 'free' && (
                  <button className="upgrade-btn" onClick={handleUpgrade}>
                    <div className="upgrade-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span>Upgrade to Pro</span>
                    <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                {currentTier === 'pro' && (
                  <button className="manage-btn" onClick={handleUpgrade}>
                    <span>Manage subscription</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Theme Selector */}
              <div className="theme-section">
                <span className="theme-label">Theme</span>
                <div className="theme-orbs-row">
                  <button
                    className={`theme-orb dark ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                    aria-label="Dark theme"
                    title="Dark"
                  />
                  <button
                    className={`theme-orb space ${theme === 'space' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('space')}
                    aria-label="Space theme"
                    title="Space"
                  />
                  <button
                    className={`theme-orb light ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                    aria-label="Light theme"
                    title="Light"
                  />
                </div>
              </div>
              
              <div className="dropdown-divider" />
              
              {/* Menu Items */}
              <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>
              <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={() => { onSignOut?.(); setShowUserMenu(false); onClose(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <button className="icon-btn" onClick={onSignIn} title="Sign In">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M6 28C6 28 8 19 16 19C24 19 26 28 26 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT ICONS - Centered                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <aside className={`control-panel left ${isOpen ? 'open' : 'closing'}`}>
        <div className="icon-column">
          <button className="icon-btn" onClick={() => { onNewConversation?.(); onClose(); }} title="New Chat">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            className={`icon-btn ${activePanel === 'chats' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'chats' ? 'none' : 'chats')}
            title="Chat History"
          >
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M27 15.5a10.5 10.5 0 01-1.1 4.7 10.5 10.5 0 01-9.4 5.8 10.5 10.5 0 01-4.7-1.1L5 27l2.4-7.1a10.5 10.5 0 01-1.1-4.7A10.5 10.5 0 0112 5.8a10.5 10.5 0 014.7-1.1h.6A10.5 10.5 0 0127 15v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>

          <button
            className={`icon-btn ${activePanel === 'projects' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'projects' ? 'none' : 'projects')}
            title="Projects"
          >
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="18" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="5" y="18" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="18" y="18" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LIST PANEL - Premium Styled                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`list-panel ${activePanel !== 'none' && isOpen ? 'visible' : ''}`}>
        {/* Header */}
        <div className="list-header">
          <div className="list-header-left">
            <div className="list-icon">
              {activePanel === 'chats' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="list-title">{activePanel === 'projects' ? 'Projects' : 'History'}</span>
          </div>
          <button className="list-close" onClick={() => setActivePanel('none')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="list-content">
          {activePanel === 'chats' && (
            isLoadingConversations ? (
              <div className="list-loading">
                <div className="loading-spinner" />
                <span>Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="list-empty-state">
                <div className="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="empty-title">No conversations</span>
                <span className="empty-subtitle">Start chatting to see history</span>
              </div>
            ) : (
              <div className="list-items">
                {conversations.map((c, i) => (
                  <button
                    key={c.id}
                    className="list-item"
                    onClick={() => { onSelectConversation?.(c.id); onClose(); }}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="item-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="item-content">
                      <span className="item-title">{c.title}</span>
                      <span className="item-meta">{formatDate(c.timestamp)}</span>
                    </div>
                    <div className="item-arrow">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {activePanel === 'projects' && (
            projects.length === 0 ? (
              <div className="list-empty-state">
                <div className="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="empty-title">No projects</span>
                <span className="empty-subtitle">Projects will appear here</span>
              </div>
            ) : (
              <div className="list-items">
                {projects.map((p, i) => (
                  <button
                    key={p.id}
                    className="list-item"
                    onClick={() => { router.push(`/projects/${p.id}`); onClose(); }}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="item-icon project">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="item-content">
                      <span className="item-title">{p.name}</span>
                      <span className="item-meta">{formatDate(p.lastActive)}</span>
                    </div>
                    <div className="item-arrow">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {activePanel === 'chats' && conversations.length > 0 && (
          <div className="list-footer">
            <button className="footer-btn" onClick={() => { onNewConversation?.(); onClose(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
              New conversation
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* USER PANEL                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-panel {
          contain: layout style;
          will-change: transform;
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 100;
          opacity: 0;
          transform: translateX(-120%);
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
        }
        
        .user-panel.open { transform: translateX(0); opacity: 1; }
        .user-panel.closing { transform: translateX(-120%); opacity: 0; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CONTROL PANELS                                                                  */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .control-panel {
          position: fixed;
          top: 50%;
          z-index: 100;
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
        }
        
        .control-panel.left {
          left: 24px;
          transform: translateY(-50%) translateX(-120%);
        }
        .control-panel.left.open { transform: translateY(-50%) translateX(0); opacity: 1; }
        .control-panel.left.closing { transform: translateY(-50%) translateX(-120%); opacity: 0; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* ICON BUTTONS                                                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .icon-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        
        .icon-btn {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary, #fff);
          background: linear-gradient(145deg, #1a1a1a 0%, #0e0e0e 50%, #080808 100%);
          box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.04), 0 4px 12px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
        }
        
        .icon-btn::before {
          content: '';
          position: absolute;
          inset: -0.5px;
          border-radius: 14.5px;
          padding: 0.5px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
        }
        
        .icon-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 45%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 100%);
          border-radius: 14px 14px 50% 50%;
          pointer-events: none;
          z-index: 10;
        }
        
        .icon-btn:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.05), 0 8px 20px rgba(0, 0, 0, 0.5); }
        .icon-btn:active { transform: scale(0.95); transition: transform 0.1s ease; }
        
        .icon-btn.active {
          background: linear-gradient(145deg, #262626 0%, #181818 50%, #0c0c0c 100%);
          box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 0 20px rgba(201, 185, 154, 0.2), 0 6px 16px rgba(0, 0, 0, 0.45);
          color: #C9B99A;
        }
        
        .icon-btn svg { position: relative; z-index: 5; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }
        .icon-btn.active svg { filter: drop-shadow(0 0 8px rgba(201, 185, 154, 0.4)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); }
        
        :global([data-theme="light"]) .icon-btn {
          background: linear-gradient(145deg, #ffffff 0%, #f5f5f5 50%, #ebebeb 100%);
          color: #1a1a1a;
          box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        :global([data-theme="light"]) .icon-btn:hover { box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.12); }
        :global([data-theme="light"]) .icon-btn.active { background: linear-gradient(145deg, #f8f8f8 0%, #f0f0f0 50%, #e8e8e8 100%); color: #8B7355; }
        :global([data-theme="light"]) .icon-btn::after { background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%); }
        
        /* User Button Special Styling */
        .user-btn { border-radius: 50%; }
        .user-btn::before, .user-btn::after { border-radius: 50%; }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 5; border-radius: 50%; }
        .avatar-initial { font-size: 18px; font-weight: 600; position: relative; z-index: 5; }
        
        /* Pro/Enterprise Ring around avatar */
        .user-btn.pro-ring {
          box-shadow: 0 0 0 2px rgba(201, 185, 154, 0.6), 0 0 20px rgba(201, 185, 154, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .user-btn.enterprise-ring {
          box-shadow: 0 0 0 2px rgba(147, 112, 219, 0.6), 0 0 20px rgba(147, 112, 219, 0.3), 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* USER DROPDOWN                                                                   */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-dropdown {
          position: absolute;
          top: 0;
          left: 60px;
          min-width: 260px;
          background: var(--bg-secondary, rgba(10, 10, 11, 0.98));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 16px 48px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 200;
          opacity: 0;
          visibility: hidden;
          transform: translateX(-8px) scale(0.95);
          pointer-events: none;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        
        .user-dropdown.open {
          opacity: 1;
          visibility: visible;
          transform: translateX(0) scale(1);
          pointer-events: auto;
        }
        
        :global([data-theme="light"]) .user-dropdown {
          background: rgba(255, 255, 255, 0.98);
          border-color: rgba(0, 0, 0, 0.06);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
        
        /* User Header */
        .user-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
        }
        
        .user-avatar-large {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: visible;
        }
        
        .user-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        
        .user-avatar-large span {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }
        
        .tier-badge-avatar {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          border: 2px solid var(--bg-secondary, #0a0a0b);
        }
        
        .tier-badge-avatar.pro {
          background: linear-gradient(135deg, #C9B99A 0%, #A89968 100%);
          color: #1a1a1a;
        }
        
        .tier-badge-avatar.enterprise {
          background: linear-gradient(135deg, #9370DB 0%, #7B68EE 100%);
          color: #fff;
        }
        
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .user-email {
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.5));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Plan Section */
        .plan-section {
          padding: 12px 16px;
          background: var(--border-subtle, rgba(255,255,255,0.02));
        }
        
        .plan-info {
          margin-bottom: 10px;
        }
        
        .plan-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 8px;
          letter-spacing: 0.02em;
        }
        
        .plan-badge.free {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.6);
        }
        
        .plan-badge.pro {
          background: linear-gradient(135deg, rgba(201,185,154,0.2) 0%, rgba(201,185,154,0.1) 100%);
          color: #C9B99A;
          border: 1px solid rgba(201,185,154,0.2);
        }
        
        .plan-badge.pro svg {
          color: #C9B99A;
        }
        
        .plan-badge.enterprise {
          background: linear-gradient(135deg, rgba(147,112,219,0.2) 0%, rgba(147,112,219,0.1) 100%);
          color: #9370DB;
          border: 1px solid rgba(147,112,219,0.2);
        }
        
        .plan-badge.enterprise svg {
          color: #9370DB;
        }
        
        :global([data-theme="light"]) .plan-badge.free {
          background: rgba(0,0,0,0.04);
          color: rgba(0,0,0,0.5);
        }
        
        :global([data-theme="light"]) .plan-badge.pro {
          background: linear-gradient(135deg, rgba(201,185,154,0.15) 0%, rgba(201,185,154,0.08) 100%);
          color: #8B7355;
          border-color: rgba(201,185,154,0.25);
        }
        
        /* Upgrade Button - State of the Art */
        .upgrade-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: linear-gradient(135deg, #C9B99A 0%, #A89968 100%);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        
        .upgrade-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .upgrade-btn:hover::before {
          opacity: 1;
        }
        
        .upgrade-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201, 185, 154, 0.4);
        }
        
        .upgrade-btn:active {
          transform: translateY(0) scale(0.98);
        }
        
        .upgrade-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a1a;
          flex-shrink: 0;
        }
        
        .upgrade-btn span {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          text-align: left;
        }
        
        .upgrade-btn .arrow {
          color: rgba(0,0,0,0.4);
          transition: transform 0.2s ease;
        }
        
        .upgrade-btn:hover .arrow {
          transform: translateX(3px);
          color: rgba(0,0,0,0.6);
        }
        
        /* Manage Button for Pro users */
        .manage-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .manage-btn span {
          font-size: 13px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
        }
        
        .manage-btn svg {
          color: var(--text-muted, rgba(255,255,255,0.4));
          transition: transform 0.2s ease;
        }
        
        .manage-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.12);
        }
        
        .manage-btn:hover span {
          color: var(--text-primary, #fff);
        }
        
        .manage-btn:hover svg {
          transform: translateX(3px);
          color: var(--text-secondary, rgba(255,255,255,0.6));
        }
        
        /* Theme Section */
        .theme-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }
        
        .theme-label {
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.5));
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .theme-orbs-row {
          display: flex;
          gap: 10px;
        }
        
        .theme-orb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        
        .theme-orb.dark {
          background: linear-gradient(145deg, #1a1a1a, #000);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 6px rgba(0, 0, 0, 0.5);
        }
        .theme-orb.dark::after { content: ''; position: absolute; top: 4px; left: 5px; width: 5px; height: 5px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%); }
        
        .theme-orb.space {
          background: linear-gradient(145deg, #48484A, #2C2C2E);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4);
        }
        .theme-orb.space::after { content: ''; position: absolute; top: 4px; left: 5px; width: 5px; height: 5px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%); }
        
        .theme-orb.light {
          background: linear-gradient(145deg, #fff, #e5e5e5);
          box-shadow: inset 0 1px 0 #fff, 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .theme-orb.light::after { content: ''; position: absolute; top: 4px; left: 5px; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 60%); }
        
        .theme-orb.active { 
          transform: scale(1.15); 
          box-shadow: 0 0 0 2px rgba(201, 185, 154, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4); 
        }
        .theme-orb:hover:not(.active) { transform: scale(1.1); }
        .theme-orb:active { transform: scale(0.95); transition: transform 0.1s ease; }
        
        .dropdown-divider { height: 1px; background: var(--border-subtle, rgba(255,255,255,0.06)); margin: 0; }
        
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary, rgba(255,255,255,0.7));
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .dropdown-item svg { width: 18px; height: 18px; flex-shrink: 0; }
        .dropdown-item:hover { background: var(--border-subtle, rgba(255,255,255,0.06)); color: var(--text-primary, #fff); }
        .dropdown-item.danger { color: #ef4444; }
        .dropdown-item.danger:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* LIST PANEL - Premium Styled                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .list-panel {
          position: fixed;
          top: 50%;
          left: 90px;
          width: 260px;
          max-height: 70vh;
          transform: translateY(-50%) translateX(-20px);
          z-index: 99;
          background: var(--bg-secondary, rgba(10, 10, 11, 0.98));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 16px 48px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .list-panel.visible {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
          pointer-events: auto;
        }
        
        :global([data-theme="light"]) .list-panel {
          background: rgba(255, 255, 255, 0.98);
          border-color: rgba(0, 0, 0, 0.06);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
        
        /* Header */
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .list-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .list-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--border-subtle, rgba(255,255,255,0.06));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        
        .list-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          letter-spacing: -0.01em;
        }
        
        .list-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.4));
          transition: all 0.15s ease;
        }
        
        .list-close:hover {
          background: var(--border-subtle, rgba(255,255,255,0.08));
          color: var(--text-primary, #fff);
        }
        
        /* Content */
        .list-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          scrollbar-width: none;
        }
        
        .list-content::-webkit-scrollbar { display: none; }
        
        /* Loading State */
        .list-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          font-size: 12px;
        }
        
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-subtle, rgba(255,255,255,0.1));
          border-top-color: var(--text-muted, rgba(255,255,255,0.5));
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Empty State */
        .list-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
        }
        
        .empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: var(--border-subtle, rgba(255,255,255,0.04));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.25));
          margin-bottom: 4px;
        }
        
        .empty-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary, rgba(255,255,255,0.6));
        }
        
        .empty-subtitle {
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.35));
        }
        
        /* List Items */
        .list-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .list-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: itemFadeIn 0.3s ease backwards;
          text-align: left;
        }
        
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .list-item:hover {
          background: var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .list-item:active {
          transform: scale(0.98);
        }
        
        .item-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.5));
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        
        .item-icon.project {
          background: linear-gradient(135deg, rgba(201,185,154,0.15) 0%, rgba(201,185,154,0.08) 100%);
          color: rgba(201,185,154,0.8);
        }
        
        .list-item:hover .item-icon {
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          color: var(--text-secondary, rgba(255,255,255,0.7));
        }
        
        .list-item:hover .item-icon.project {
          background: linear-gradient(135deg, rgba(201,185,154,0.2) 0%, rgba(201,185,154,0.12) 100%);
          color: #C9B99A;
        }
        
        .item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .item-title {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .item-meta {
          font-size: 11px;
          color: var(--text-muted, rgba(255,255,255,0.35));
        }
        
        .item-arrow {
          color: var(--text-muted, rgba(255,255,255,0.2));
          opacity: 0;
          transform: translateX(-4px);
          transition: all 0.2s ease;
        }
        
        .list-item:hover .item-arrow {
          opacity: 1;
          transform: translateX(0);
          color: var(--text-muted, rgba(255,255,255,0.4));
        }
        
        /* Footer */
        .list-footer {
          padding: 8px;
          border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .footer-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px dashed var(--border-subtle, rgba(255,255,255,0.15));
          background: transparent;
          color: var(--text-muted, rgba(255,255,255,0.5));
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .footer-btn:hover {
          border-color: var(--text-muted, rgba(255,255,255,0.3));
          color: var(--text-secondary, rgba(255,255,255,0.7));
          background: var(--border-subtle, rgba(255,255,255,0.04));
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MOBILE                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .user-panel {
            contain: layout style;
            will-change: transform;
            top: 16px;
            left: 16px;
          }
          .control-panel.left { left: 16px; }
          .icon-column { gap: 10px; }
          .icon-btn { width: 44px; height: 44px; border-radius: 12px; }
          .icon-btn svg { width: 18px; height: 18px; }
          
          .list-panel {
            left: 70px;
            width: calc(100vw - 140px);
            max-width: 280px;
            max-height: 60vh;
          }
          
          .user-dropdown { 
            min-width: 240px;
            left: 54px;
          }
        }
      `}</style>
    </>
  );
});
export default Sidebar;