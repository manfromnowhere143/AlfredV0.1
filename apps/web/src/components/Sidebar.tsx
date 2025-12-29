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
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
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
  const [activePanel, setActivePanel] = useState<'none' | 'chats' | 'projects'>('none');
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
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT CONTROL PANEL                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <aside className={`control-panel left ${isOpen ? 'open' : 'closing'}`}>

        {/* User Avatar */}
        <div className="user-section" ref={userMenuRef}>
          {user ? (
            <>
              <button
                className="icon-btn user-btn"
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                aria-label="User menu"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="avatar-img" />
                ) : (
                  <span className="avatar-initial">{getUserInitial()}</span>
                )}
              </button>
              {/* User Dropdown - Always in DOM, toggle with class */}
              <div className={`user-dropdown ${showUserMenu ? 'open' : ''}`}>
                <div className="user-info">
                  <span className="user-name">{user.name || 'User'}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <div className="dropdown-divider" />
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
                  Log out
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

        {/* Action Icons */}
        <div className="icon-row">
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
      {/* RIGHT THEME PANEL - Aligned with left icons                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <aside className={`control-panel right ${isOpen ? 'open' : 'closing'}`}>
        <div className="theme-column">
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
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LIST PANEL - Chats or Projects                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`list-panel ${activePanel !== 'none' && isOpen ? 'visible' : ''}`}>
        <div className="list-header">
          <span className="list-label">{activePanel === 'projects' ? 'PROJECTS' : 'HISTORY'}</span>
          <button className="list-close" onClick={() => setActivePanel('none')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="list-body">
          <div
            className="fade-top"
            style={{ background: `linear-gradient(to bottom, ${fadeColor} 0%, ${fadeColor} 40%, transparent 100%)` }}
          />

          <div className="list-scroll">
            {activePanel === 'chats' && (
              isLoadingConversations ? (
                <div className="list-empty">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="list-empty">No chats yet</div>
              ) : conversations.map((c, i) => (
                <button
                  key={c.id}
                  className="list-item"
                  onClick={() => { onSelectConversation?.(c.id); onClose(); }}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="item-title">{c.title}</span>
                  <span className="item-meta">{formatDate(c.timestamp)}</span>
                </button>
              ))
            )}

            {activePanel === 'projects' && (
              projects.length === 0 ? (
                <div className="list-empty">No projects yet</div>
              ) : projects.map((p, i) => (
                <button
                  key={p.id}
                  className="list-item"
                  onClick={() => { onSelectProject?.(p.id); onClose(); }}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="item-title">{p.name}</span>
                  <span className="item-meta">{formatDate(p.lastActive)}</span>
                </button>
              ))
            )}
          </div>

          <div
            className="fade-bottom"
            style={{ background: `linear-gradient(to top, ${fadeColor} 0%, ${fadeColor} 40%, transparent 100%)` }}
          />
        </div>
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CONTROL PANELS - Left and Right                                                 */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .control-panel {
          position: fixed;
          top: 50%;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background: transparent;
          pointer-events: none;
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
        }
        
        .control-panel > * { pointer-events: auto; }
        
        /* LEFT panel */
        .control-panel.left {
          left: 24px;
          transform: translateY(-50%) translateX(-120%);
        }
        .control-panel.left.open { transform: translateY(-50%) translateX(0); opacity: 1; }
        .control-panel.left.closing { transform: translateY(-50%) translateX(-120%); opacity: 0; }
        
        /* RIGHT panel - theme orbs */
        .control-panel.right {
          right: 24px;
          transform: translateY(-50%) translateX(120%);
        }
        .control-panel.right.open { transform: translateY(-50%) translateX(0); opacity: 1; }
        .control-panel.right.closing { transform: translateY(-50%) translateX(120%); opacity: 0; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* THEME COLUMN - Right side                                                       */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .theme-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 12px;
          border-radius: 20px;
          background: linear-gradient(145deg, rgba(26, 26, 26, 0.9), rgba(10, 10, 11, 0.95));
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        :global([data-theme="light"]) .theme-column {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(245, 245, 240, 0.9));
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        .theme-orb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        
        .theme-orb.dark {
          background: linear-gradient(145deg, #1a1a1a, #000);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .theme-orb.dark::after { content: ''; position: absolute; top: 5px; left: 6px; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%); }
        
        .theme-orb.space {
          background: linear-gradient(145deg, #48484A, #2C2C2E);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 8px rgba(0, 0, 0, 0.4);
        }
        .theme-orb.space::after { content: ''; position: absolute; top: 5px; left: 6px; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%); }
        
        .theme-orb.light {
          background: linear-gradient(145deg, #fff, #e5e5e5);
          box-shadow: inset 0 1px 0 #fff, 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .theme-orb.light::after { content: ''; position: absolute; top: 5px; left: 6px; width: 7px; height: 7px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 60%); }
        
        .theme-orb.active { transform: scale(1.15); box-shadow: 0 0 0 2px rgba(201, 185, 154, 0.6), 0 0 16px rgba(201, 185, 154, 0.3), 0 4px 12px rgba(0, 0, 0, 0.4); }
        .theme-orb:hover:not(.active) { transform: scale(1.1); }
        .theme-orb:active { transform: scale(0.92); transition: transform 0.1s ease; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* ICON BUTTONS                                                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-section { position: relative; }
        .icon-row { display: flex; flex-direction: column; gap: 10px; }
        
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
        
        /* Light theme */
        :global([data-theme="light"]) .icon-btn {
          background: linear-gradient(145deg, #ffffff 0%, #f5f5f5 50%, #ebebeb 100%);
          color: #1a1a1a;
          box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        :global([data-theme="light"]) .icon-btn:hover { box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.12); }
        :global([data-theme="light"]) .icon-btn.active { background: linear-gradient(145deg, #f8f8f8 0%, #f0f0f0 50%, #e8e8e8 100%); color: #8B7355; }
        :global([data-theme="light"]) .icon-btn::after { background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%); }
        
        /* User button */
        .user-btn { border-radius: 50%; }
        .user-btn::before, .user-btn::after { border-radius: 50%; }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 5; border-radius: 50%; }
        .avatar-initial { font-size: 18px; font-weight: 600; position: relative; z-index: 5; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* USER DROPDOWN                                                                   */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .user-dropdown {
          position: absolute;
          top: 0;
          left: 60px;
          min-width: 200px;
          background: var(--bg-secondary, rgba(10, 10, 11, 0.98));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 16px 48px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 200;
          
          /* Hidden by default */
          opacity: 0;
          visibility: hidden;
          transform: translateX(-8px) scale(0.95);
          pointer-events: none;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
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
        
        .user-info { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
        .user-name { font-size: 13px; font-weight: 500; color: var(--text-primary, #fff); }
        .user-email { font-size: 11px; color: var(--text-muted, rgba(255,255,255,0.5)); }
        .dropdown-divider { height: 1px; background: var(--border-subtle, rgba(255,255,255,0.08)); margin: 6px 0; }
        
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
        
        .dropdown-item svg { width: 16px; height: 16px; flex-shrink: 0; }
        .dropdown-item:hover { background: var(--border-subtle, rgba(255,255,255,0.08)); color: var(--text-primary, #fff); }
        .dropdown-item.danger { color: #ef4444; }
        .dropdown-item.danger:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* LIST PANEL                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .list-panel {
          position: fixed;
          top: 50%;
          left: 100px;
          transform: translateY(-50%) translateX(-20px);
          width: 240px;
          max-height: 70vh;
          display: flex;
          flex-direction: column;
          z-index: 99;
          background: linear-gradient(145deg, rgba(26, 26, 26, 0.98), rgba(10, 10, 11, 0.99));
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 12px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          opacity: 0;
          pointer-events: none;
          transition: all 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
        
        .list-panel.visible { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }
        
        :global([data-theme="light"]) .list-panel {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.99), rgba(250, 250, 248, 0.98));
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 12px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
        }
        
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
        }
        
        .list-label {
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: var(--text-muted, rgba(255,255,255,0.4));
        }
        
        .list-close {
          width: 26px;
          height: 26px;
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
        
        .list-close:hover { background: var(--border-subtle, rgba(255,255,255,0.08)); color: var(--text-primary, #fff); }
        
        .list-body { position: relative; flex: 1; min-height: 180px; max-height: 50vh; overflow: hidden; }
        
        .fade-top, .fade-bottom { position: absolute; left: 0; right: 0; height: 24px; pointer-events: none; z-index: 10; }
        .fade-top { top: 0; }
        .fade-bottom { bottom: 0; }
        
        .list-scroll { height: 100%; overflow-y: auto; padding: 20px 12px; scrollbar-width: none; }
        .list-scroll::-webkit-scrollbar { display: none; }
        
        .list-empty { padding: 32px 8px; text-align: center; color: var(--text-muted, rgba(255,255,255,0.35)); font-size: 12px; }
        
        .list-item {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          padding: 12px 14px;
          margin-bottom: 6px;
          border-radius: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          animation: itemSlide 0.25s cubic-bezier(0.32, 0.72, 0, 1) backwards;
          text-align: left;
        }
        
        @keyframes itemSlide { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        
        .list-item:hover { background: var(--border-subtle, rgba(255,255,255,0.06)); }
        .list-item:active { transform: scale(0.98); }
        
        .item-title { font-size: 13px; font-weight: 400; color: var(--text-primary, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        .item-meta { font-size: 11px; color: var(--text-muted, rgba(255,255,255,0.35)); }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MOBILE                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) {
          .control-panel.left { left: 16px; gap: 10px; }
          .control-panel.right { right: 16px; }
          
          .theme-column { padding: 10px 8px; border-radius: 16px; gap: 10px; }
          .theme-orb { width: 24px; height: 24px; }
          
          .icon-btn { width: 44px; height: 44px; border-radius: 12px; }
          .icon-btn svg { width: 18px; height: 18px; }
          
          .list-panel { left: 76px; width: calc(100vw - 100px); max-width: 260px; max-height: 60vh; }
          .list-body { min-height: 150px; max-height: 45vh; }
          .list-item { padding: 10px 12px; }
          .item-title { font-size: 12px; }
        }
      `}</style>
    </>
  );
}