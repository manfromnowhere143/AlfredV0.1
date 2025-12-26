'use client';

import { useState, useEffect } from 'react';

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
  onSelectProject?: (id: string) => void;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR — Compact, Elegant, 1/3 Mobile Width
// ═══════════════════════════════════════════════════════════════════════════════

export default function Sidebar({
  isOpen,
  onClose,
  projects = [],
  conversations = [],
  onSelectProject,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<SidebarView>('main');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('alfred-theme') as Theme | null;
    if (saved && ['dark', 'space', 'light'].includes(saved)) setTheme(saved);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('alfred-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleViewChange = (newView: SidebarView) => {
    if (newView === view || isAnimating) return;
    setIsAnimating(true);
    setView(newView);
    setTimeout(() => setIsAnimating(false), 300);
  };

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setView('main'), 300);
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

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header — Minimal */}
        <div className="sidebar-header">
          <span className="brand">A</span>
          <button className="close-btn" onClick={onClose} aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="views">
            {/* Main View */}
            <div className={`view ${view === 'main' ? 'active' : 'exit-left'}`}>
              <button className="new-btn" onClick={onNewConversation}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
                <span>New</span>
              </button>

              <nav className="nav">
                <button className="nav-item" onClick={() => handleViewChange('projects')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                  <span>Projects</span>
                  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <button className="nav-item" onClick={() => handleViewChange('conversations')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                  </svg>
                  <span>Chats</span>
                  <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </nav>
            </div>

            {/* Projects View */}
            <div className={`view ${view === 'projects' ? 'active' : 'exit-right'}`}>
              <button className="back-btn" onClick={() => handleViewChange('main')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Projects</span>
              </button>
              <div className="list">
                {projects.length === 0 ? (
                  <div className="empty">No projects</div>
                ) : projects.map((p, i) => (
                  <button key={p.id} className="list-item" onClick={() => { onSelectProject?.(p.id); onClose(); }} style={{ animationDelay: `${i * 30}ms` }}>
                    <span className="item-title">{p.name}</span>
                    <span className="item-meta">{formatDate(p.lastActive)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations View */}
            <div className={`view ${view === 'conversations' ? 'active' : 'exit-right'}`}>
              <button className="back-btn" onClick={() => handleViewChange('main')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Chats</span>
              </button>
              <div className="list">
                {conversations.length === 0 ? (
                  <div className="empty">No chats</div>
                ) : conversations.map((c, i) => (
                  <button key={c.id} className="list-item" onClick={() => { onSelectConversation?.(c.id); onClose(); }} style={{ animationDelay: `${i * 30}ms` }}>
                    <span className="item-title">{c.title}</span>
                    <span className="item-meta">{c.preview.slice(0, 30)}...</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer — Theme Toggle */}
        <div className="sidebar-footer">
          <div className="theme-toggle">
            <button className={`theme-btn dark ${theme === 'dark' ? 'active' : ''}`} onClick={() => handleThemeChange('dark')} aria-label="Dark theme"/>
            <button className={`theme-btn space ${theme === 'space' ? 'active' : ''}`} onClick={() => handleThemeChange('space')} aria-label="Space theme"/>
            <button className={`theme-btn light ${theme === 'light' ? 'active' : ''}`} onClick={() => handleThemeChange('light')} aria-label="Light theme"/>
          </div>
        </div>
      </aside>

      <style jsx>{`
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* SIDEBAR — Compact, Left-aligned                                                 */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 200px;
          height: 100vh;
          height: 100dvh;
          background: var(--bg-void);
          border-right: 1px solid var(--border-subtle);
          z-index: 100;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
                      background-color 0.4s ease,
                      border-color 0.4s ease;
          display: flex;
          flex-direction: column;
          
          /* No tap flash */
          -webkit-tap-highlight-color: transparent;
        }
        
        .sidebar.open { transform: translateX(0); }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* HEADER — Minimal                                                                */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 12px;
          border-bottom: 1px solid var(--border-subtle);
          transition: border-color 0.4s ease;
        }
        
        .brand {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          transition: color 0.4s ease;
          letter-spacing: -0.02em;
        }
        
        .close-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.15s ease;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .close-btn:hover { 
          color: var(--text-primary); 
          background: var(--border-subtle);
        }
        
        .close-btn:active { transform: scale(0.95); }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CONTENT                                                                         */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar-content { 
          flex: 1; 
          overflow: hidden; 
          position: relative; 
        }
        
        .views { position: relative; height: 100%; }
        
        .view {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          padding: 12px 8px;
          overflow-y: auto;
          overflow-x: hidden;
          transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease;
          
          /* Hide scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .view::-webkit-scrollbar { display: none; }
        
        .view.active { transform: translateX(0); opacity: 1; pointer-events: auto; }
        .view.exit-left { transform: translateX(-100%); opacity: 0; pointer-events: none; }
        .view.exit-right { transform: translateX(100%); opacity: 0; pointer-events: none; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* NEW BUTTON                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .new-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 12px;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .new-btn svg {
          color: var(--text-secondary);
          transition: color 0.15s ease;
        }
        
        .new-btn:hover {
          background: var(--border-subtle);
          border-color: var(--border-hover);
        }
        
        .new-btn:hover svg { color: var(--text-primary); }
        .new-btn:active { transform: scale(0.98); }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* NAVIGATION                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .nav { display: flex; flex-direction: column; gap: 2px; }
        
        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s ease;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .nav-item:hover { background: var(--border-subtle); }
        .nav-item:active { transform: scale(0.98); }
        
        .nav-item > svg:first-child {
          color: var(--text-muted);
          transition: color 0.15s ease;
          flex-shrink: 0;
        }
        
        .nav-item:hover > svg:first-child { color: var(--text-secondary); }
        
        .nav-item span { 
          flex: 1; 
          text-align: left; 
          transition: color 0.4s ease; 
        }
        
        .chevron {
          color: var(--text-subtle);
          transition: transform 0.15s ease;
          opacity: 0.5;
        }
        
        .nav-item:hover .chevron {
          transform: translateX(2px);
          opacity: 0.8;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* BACK BUTTON                                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 4px;
          margin-bottom: 8px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .back-btn svg {
          color: var(--text-muted);
          transition: transform 0.15s ease;
        }
        
        .back-btn:hover svg { transform: translateX(-2px); }
        .back-btn:active { opacity: 0.7; }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* LIST                                                                            */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .list { display: flex; flex-direction: column; gap: 1px; }
        
        .list-item {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
          animation: slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1) backwards;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .list-item:hover { background: var(--border-subtle); }
        .list-item:active { transform: scale(0.98); }
        
        .item-title {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.4s ease;
          text-align: left;
          flex: 1;
        }
        
        .item-meta {
          font-size: 11px;
          color: var(--text-muted);
          transition: color 0.4s ease;
          flex-shrink: 0;
          margin-left: 8px;
        }
        
        .empty {
          padding: 24px 12px;
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
          transition: color 0.4s ease;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* FOOTER                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid var(--border-subtle);
          transition: border-color 0.4s ease;
        }
        
        .theme-toggle { 
          display: flex; 
          gap: 8px; 
          justify-content: center;
        }
        
        .theme-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .theme-btn.dark {
          background: linear-gradient(145deg, #1a1a1a, #000);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 4px rgba(0,0,0,0.4);
        }
        
        .theme-btn.space {
          background: linear-gradient(145deg, #48484A, #2C2C2E);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 4px rgba(0,0,0,0.3);
        }
        
        .theme-btn.light {
          background: linear-gradient(145deg, #fff, #e5e5e5);
          box-shadow: inset 0 1px 0 #fff, 0 1px 4px rgba(0,0,0,0.12);
        }
        
        .theme-btn.active {
          transform: scale(1.2);
          box-shadow: 0 0 0 2px var(--accent-primary), 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .theme-btn:hover:not(.active) { transform: scale(1.1); }
        .theme-btn:active { transform: scale(0.95); }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MOBILE — 1/3 Screen Width                                                       */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        @media (max-width: 768px) { 
          .sidebar { 
            width: 33.33vw;
            min-width: 120px;
            max-width: 160px;
          }
          
          .sidebar-header { padding: 14px 10px; }
          .brand { font-size: 14px; }
          .close-btn { width: 26px; height: 26px; }
          
          .view { padding: 10px 6px; }
          
          .new-btn { 
            padding: 8px 10px; 
            font-size: 12px;
            gap: 6px;
          }
          .new-btn svg { width: 14px; height: 14px; }
          
          .nav-item { 
            padding: 8px 10px; 
            font-size: 12px;
            gap: 8px;
          }
          .nav-item svg { width: 14px; height: 14px; }
          .chevron { width: 12px; height: 12px; }
          
          .back-btn { font-size: 12px; }
          .back-btn svg { width: 12px; height: 12px; }
          
          .list-item { padding: 8px 10px; }
          .item-title { font-size: 12px; }
          .item-meta { font-size: 10px; }
          
          .sidebar-footer { padding: 10px 8px; }
          .theme-toggle { gap: 6px; }
          .theme-btn { width: 20px; height: 20px; }
        }
        
        @media (max-width: 380px) {
          .sidebar {
            min-width: 100px;
            max-width: 130px;
          }
          
          .new-btn span,
          .nav-item span { 
            font-size: 11px; 
          }
        }
      `}</style>
    </>
  );
}