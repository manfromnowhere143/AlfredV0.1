'use client';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║            ALFRED PRO BUILDER - MOBILE-FIRST STATE OF THE ART                ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  Premium IDE experience with:                                                 ║
 * ║  • Mobile-first responsive design (Steve Jobs approved)                       ║
 * ║  • Swipeable panel navigation on mobile                                       ║
 * ║  • Bottom tab bar navigation (iOS-style)                                      ║
 * ║  • Touch-optimized controls and gestures                                      ║
 * ║  • Fluid animations and micro-interactions                                    ║
 * ║  • Desktop: Premium 3-panel IDE layout                                        ║
 * ║  • Tablet: Smart 2-panel split view                                           ║
 * ║  • Mobile: Single panel with swipe navigation                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback, useEffect, useRef, memo, useMemo, TouchEvent } from 'react';
import dynamic from 'next/dynamic';
import type { VirtualFile, VirtualDirectory, ConsoleEntry, PreviewResult } from '@alfred/core';
import { FileExplorer } from './FileExplorer';
import { BuilderPreview } from './BuilderPreview';

// Dynamic import for Monaco
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => <EditorLoadingState />,
});

// ============================================================================
// TYPES
// ============================================================================

export interface BuilderLayoutProps {
  fileTree: VirtualDirectory | null;
  selectedFile: VirtualFile | null;
  previewResult: PreviewResult | null;
  isBuilding?: boolean;
  isStreaming?: boolean;
  projectName?: string;
  onFileSelect?: (file: VirtualFile) => void;
  onFileChange?: (path: string, content: string) => void;
  onConsole?: (entry: ConsoleEntry) => void;
  onDeploy?: () => void;
  className?: string;
}

type MobilePanel = 'files' | 'editor' | 'preview';
type DesktopPanel = 'files' | 'search' | 'ai' | 'settings';

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

function useSwipeGesture(onSwipe: (direction: 'left' | 'right') => void) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > minSwipeDistance) {
      onSwipe(distance > 0 ? 'left' : 'right');
    }
  }, [onSwipe]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ============================================================================
// LOADING STATES
// ============================================================================

function EditorLoadingState() {
  return (
    <div className="editor-loading">
      <div className="loading-orb">
        <div className="orb-ring" />
        <div className="orb-core" />
      </div>
      <span className="loading-text">Initializing Editor</span>

      <style jsx>{`
        .editor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
          background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
        }

        .loading-orb {
          position: relative;
          width: 48px;
          height: 48px;
        }

        .orb-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(139, 92, 246, 0.8);
          border-right-color: rgba(99, 102, 241, 0.4);
          animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-text {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          animation: fadeInOut 1.5s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MOBILE HEADER - Compact Top Bar
// ============================================================================

interface MobileHeaderProps {
  projectName: string;
  isBuilding: boolean;
  isStreaming: boolean;
  activePanel: MobilePanel;
}

const MobileHeader = memo(function MobileHeader({
  projectName,
  isBuilding,
  isStreaming,
  activePanel,
}: MobileHeaderProps) {
  const panelLabels: Record<MobilePanel, string> = {
    files: 'Files',
    editor: 'Editor',
    preview: 'Preview',
  };

  return (
    <header className="mobile-header">
      <div className="header-left">
        <span className="alfred-mark">A</span>
        <div className="header-info">
          <span className="panel-label">{panelLabels[activePanel]}</span>
          <span className="project-name">{projectName}</span>
        </div>
      </div>

      <div className="header-right">
        {(isStreaming || isBuilding) && (
          <div className={`status-indicator ${isStreaming ? 'streaming' : 'building'}`}>
            <div className="status-dot" />
          </div>
        )}
      </div>

      <style jsx>{`
        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 16px;
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 14, 0.95) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          z-index: 100;
        }

        .mobile-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alfred-mark {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 8px;
          color: white;
        }

        .header-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .panel-label {
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          letter-spacing: -0.02em;
        }

        .project-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        .status-indicator.streaming .status-dot {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
        }

        .status-indicator.building .status-dot {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </header>
  );
});

// ============================================================================
// MOBILE BOTTOM NAVIGATION - iOS-Style Tab Bar
// ============================================================================

interface MobileBottomNavProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
  hasFiles: boolean;
  hasSelectedFile: boolean;
  hasPreview: boolean;
}

const MobileBottomNav = memo(function MobileBottomNav({
  activePanel,
  onPanelChange,
  hasFiles,
  hasSelectedFile,
  hasPreview,
}: MobileBottomNavProps) {
  const tabs: { id: MobilePanel; label: string; icon: JSX.Element; available: boolean }[] = [
    {
      id: 'files',
      label: 'Files',
      available: true,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'editor',
      label: 'Editor',
      available: hasSelectedFile,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      id: 'preview',
      label: 'Preview',
      available: hasPreview,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {/* Safe area background */}
      <div className="nav-safe-area" />

      <div className="nav-content">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activePanel === tab.id ? 'active' : ''} ${!tab.available ? 'disabled' : ''}`}
            onClick={() => tab.available && onPanelChange(tab.id)}
            disabled={!tab.available}
          >
            <div className="tab-icon">{tab.icon}</div>
            <span className="tab-label">{tab.label}</span>
            {activePanel === tab.id && <div className="active-indicator" />}
          </button>
        ))}
      </div>

      <style jsx>{`
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 14, 1) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .nav-safe-area {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: env(safe-area-inset-bottom, 0px);
          background: rgba(10, 10, 14, 1);
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 64px;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .nav-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
          height: 100%;
          padding: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-tab:active:not(.disabled) {
          transform: scale(0.95);
        }

        .nav-tab.active {
          color: #8b5cf6;
        }

        .nav-tab.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .tab-icon {
          width: 24px;
          height: 24px;
          transition: transform 0.2s ease;
        }

        .nav-tab.active .tab-icon {
          transform: scale(1.1);
        }

        .tab-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .active-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 2px;
          background: linear-gradient(90deg, #8b5cf6, #6366f1);
          border-radius: 0 0 2px 2px;
        }
      `}</style>
    </nav>
  );
});

// ============================================================================
// MOBILE PANEL CONTAINER - Swipeable Panels
// ============================================================================

interface MobilePanelContainerProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
  children: {
    files: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
  };
}

const MobilePanelContainer = memo(function MobilePanelContainer({
  activePanel,
  onPanelChange,
  children,
}: MobilePanelContainerProps) {
  const panels: MobilePanel[] = ['files', 'editor', 'preview'];
  const currentIndex = panels.indexOf(activePanel);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const newIndex = direction === 'left'
        ? Math.min(currentIndex + 1, panels.length - 1)
        : Math.max(currentIndex - 1, 0);
      if (newIndex !== currentIndex) {
        onPanelChange(panels[newIndex]);
      }
    },
    [currentIndex, onPanelChange, panels]
  );

  const swipeHandlers = useSwipeGesture(handleSwipe);

  return (
    <div className="mobile-panel-container" {...swipeHandlers}>
      <div
        className="panels-track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {panels.map((panel) => (
          <div key={panel} className={`panel ${activePanel === panel ? 'active' : ''}`}>
            {children[panel]}
          </div>
        ))}
      </div>

      {/* Swipe Indicator Dots */}
      <div className="swipe-indicators">
        {panels.map((panel, i) => (
          <button
            key={panel}
            className={`indicator-dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => onPanelChange(panel)}
            aria-label={`Go to ${panel}`}
          />
        ))}
      </div>

      <style jsx>{`
        .mobile-panel-container {
          flex: 1;
          overflow: hidden;
          position: relative;
          touch-action: pan-y pinch-zoom;
        }

        .panels-track {
          display: flex;
          height: 100%;
          transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
          will-change: transform;
        }

        .panel {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .swipe-indicators {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 50;
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }

        .indicator-dot.active {
          width: 24px;
          border-radius: 4px;
          background: linear-gradient(90deg, #8b5cf6, #6366f1);
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// DESKTOP HEADER BAR - Premium Project Header
// ============================================================================

interface HeaderBarProps {
  projectName: string;
  isBuilding: boolean;
  isStreaming: boolean;
  onDeploy?: () => void;
}

const HeaderBar = memo(function HeaderBar({
  projectName,
  isBuilding,
  isStreaming,
  onDeploy,
}: HeaderBarProps) {
  return (
    <header className="header-bar">
      {/* Left Section - Project Info */}
      <div className="header-left">
        <div className="project-badge">
          <div className="badge-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="project-name">{projectName}</span>
        </div>

        {/* Status Indicator */}
        <div className={`status-pill ${isStreaming ? 'streaming' : isBuilding ? 'building' : 'ready'}`}>
          <div className="status-dot" />
          <span className="status-text">
            {isStreaming ? 'AI Generating' : isBuilding ? 'Building' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Center Section */}
      <div className="header-center">
        <div className="alfred-branding">
          <span className="alfred-text">ALFRED</span>
          <span className="pro-badge">PRO</span>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="header-right">
        <button className="header-btn secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span>New File</span>
        </button>

        <button className="header-btn primary" onClick={onDeploy}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 14l8-8 8 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 6v15" strokeLinecap="round" />
          </svg>
          <span>Deploy</span>
        </button>
      </div>

      <style jsx>{`
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 20px;
          background: linear-gradient(180deg, rgba(15, 15, 20, 0.98) 0%, rgba(10, 10, 14, 0.95) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative;
          z-index: 50;
        }

        .header-bar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
          opacity: 0.5;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .project-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .project-badge:hover {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .badge-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b5cf6;
        }

        .project-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: -0.01em;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-pill.ready .status-dot {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .status-pill.building .status-dot {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);
          animation: pulse 1s ease-in-out infinite;
        }

        .status-pill.streaming .status-dot {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
          animation: pulse 0.8s ease-in-out infinite;
        }

        .status-text {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .alfred-branding {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alfred-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 4px;
          color: rgba(255, 255, 255, 0.25);
        }

        .pro-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 3px 6px;
          background: linear-gradient(135deg, rgba(201, 185, 154, 0.2), rgba(201, 185, 154, 0.1));
          color: #c9b99a;
          border-radius: 4px;
          border: 1px solid rgba(201, 185, 154, 0.2);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .header-btn.secondary {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }

        .header-btn.primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .header-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .header-btn:active {
          transform: scale(0.97);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </header>
  );
});

// ============================================================================
// ACTIVITY BAR - Desktop Left Side Icons
// ============================================================================

interface ActivityBarProps {
  activePanel: DesktopPanel;
  onPanelChange: (panel: DesktopPanel) => void;
}

const ActivityBar = memo(function ActivityBar({ activePanel, onPanelChange }: ActivityBarProps) {
  const items = [
    { id: 'files' as const, icon: 'files', label: 'Explorer' },
    { id: 'search' as const, icon: 'search', label: 'Search' },
    { id: 'ai' as const, icon: 'ai', label: 'AI Assistant' },
    { id: 'settings' as const, icon: 'settings', label: 'Settings' },
  ];

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`activity-btn ${activePanel === item.id ? 'active' : ''}`}
          onClick={() => onPanelChange(item.id)}
          title={item.label}
        >
          <ActivityIcon type={item.icon} />
          {activePanel === item.id && <div className="active-indicator" />}
        </button>
      ))}

      <style jsx>{`
        .activity-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 52px;
          padding: 12px 0;
          gap: 4px;
          background: linear-gradient(180deg, #0c0c10 0%, #08080a 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .activity-btn {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .activity-btn:hover {
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.04);
        }

        .activity-btn.active {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 0 2px 2px 0;
        }
      `}</style>
    </div>
  );
});

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    files: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    search: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
    ai: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    settings: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  };
  return icons[type] || null;
}

// ============================================================================
// STATUS BAR - Desktop Bottom Info Bar
// ============================================================================

interface StatusBarProps {
  file: VirtualFile | null;
  isBuilding: boolean;
}

const StatusBar = memo(function StatusBar({ file, isBuilding }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-left">
        {isBuilding && (
          <div className="build-indicator">
            <div className="build-spinner" />
            <span>Building...</span>
          </div>
        )}
        {!isBuilding && (
          <div className="ready-indicator">
            <div className="ready-dot" />
            <span>Ready</span>
          </div>
        )}
      </div>

      <div className="status-center">
        {file && (
          <>
            <span className="file-info">{file.path}</span>
            <span className="separator">|</span>
            <span className="lang-badge">{file.language.toUpperCase()}</span>
          </>
        )}
      </div>

      <div className="status-right">
        <span className="version">Alfred Pro v2.0</span>
      </div>

      <style jsx>{`
        .status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 28px;
          padding: 0 16px;
          background: linear-gradient(180deg, rgba(12, 12, 16, 0.98) 0%, rgba(8, 8, 10, 0.98) 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 11px;
        }

        .status-left, .status-center, .status-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .build-indicator, .ready-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255, 255, 255, 0.5);
        }

        .build-spinner {
          width: 12px;
          height: 12px;
          border: 1.5px solid transparent;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ready-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        .file-info {
          color: rgba(255, 255, 255, 0.4);
        }

        .separator {
          color: rgba(255, 255, 255, 0.2);
        }

        .lang-badge {
          padding: 2px 6px;
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-radius: 4px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .version {
          color: rgba(255, 255, 255, 0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </footer>
  );
});

// ============================================================================
// RESIZABLE PANEL - Desktop Only
// ============================================================================

interface ResizablePanelProps {
  children: React.ReactNode;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  side: 'left' | 'right';
}

function ResizablePanel({ children, minWidth, maxWidth, defaultWidth, side }: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      let newWidth = side === 'left' ? e.clientX - rect.left : rect.right - e.clientX;
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, side]);

  return (
    <div ref={panelRef} className={`resizable-panel ${side}`} style={{ width }}>
      {children}
      <div
        className={`resize-handle ${side} ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
      />

      <style jsx>{`
        .resizable-panel {
          position: relative;
          flex-shrink: 0;
          height: 100%;
        }

        .resize-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          transition: background 0.15s ease;
          z-index: 10;
        }

        .resize-handle.left { right: 0; }
        .resize-handle.right { left: 0; }

        .resize-handle:hover,
        .resize-handle.active {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.6) 100%);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EDITOR PANEL
// ============================================================================

interface EditorPanelProps {
  file: VirtualFile | null;
  onChange: (content: string) => void;
}

function EditorPanel({ file, onChange }: EditorPanelProps) {
  if (!file) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <div className="empty-glow" />
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <span className="empty-title">No file selected</span>
          <span className="empty-subtitle">Select a file from the explorer or create a new one</span>
        </div>

        <style jsx>{`
          .editor-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
            position: relative;
          }

          .empty-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            position: relative;
          }

          .empty-glow {
            position: absolute;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
            filter: blur(40px);
            pointer-events: none;
          }

          .empty-icon {
            color: rgba(255, 255, 255, 0.15);
            position: relative;
          }

          .empty-title {
            font-size: 16px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.5);
          }

          .empty-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.25);
          }
        `}</style>
      </div>
    );
  }

  return <MonacoEditor value={file.content} language={file.language} path={file.path} onChange={onChange} theme="dark" />;
}

// ============================================================================
// MOBILE EDITOR - Optimized for Touch
// ============================================================================

interface MobileEditorProps {
  file: VirtualFile | null;
  onChange: (content: string) => void;
}

function MobileEditor({ file, onChange }: MobileEditorProps) {
  if (!file) {
    return (
      <div className="mobile-editor-empty">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <span className="empty-title">No file selected</span>
        <span className="empty-hint">Tap a file to start editing</span>

        <style jsx>{`
          .mobile-editor-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 16px;
            background: linear-gradient(180deg, #0a0a0c 0%, #0f0f14 100%);
            padding: 32px;
          }

          .empty-icon {
            color: rgba(139, 92, 246, 0.3);
          }

          .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.6);
          }

          .empty-hint {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mobile-editor-container">
      {/* File Header */}
      <div className="file-header">
        <div className="file-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span className="file-name">{file.name}</span>
        <span className="file-lang">{file.language}</span>
      </div>

      {/* Monaco Editor */}
      <div className="editor-wrapper">
        <MonacoEditor
          value={file.content}
          language={file.language}
          onChange={onChange}
          theme="dark"
        />
      </div>

      <style jsx>{`
        .mobile-editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0f0f12;
        }

        .file-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .file-icon {
          color: #8b5cf6;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          flex: 1;
        }

        .file-lang {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 4px 8px;
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
          border-radius: 4px;
        }

        .editor-wrapper {
          flex: 1;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MOBILE FILE EXPLORER - Touch Optimized
// ============================================================================

interface MobileFileExplorerProps {
  tree: VirtualDirectory | null;
  selectedPath: string | null;
  onFileSelect: (file: VirtualFile) => void;
  onFileOpen: (file: VirtualFile) => void;
  projectName: string;
}

function MobileFileExplorer({
  tree,
  selectedPath,
  onFileSelect,
  onFileOpen,
  projectName,
}: MobileFileExplorerProps) {
  return (
    <div className="mobile-file-explorer">
      <FileExplorer
        tree={tree}
        selectedPath={selectedPath}
        onFileSelect={onFileSelect}
        onFileOpen={onFileOpen}
        projectName={projectName}
      />

      <style jsx>{`
        .mobile-file-explorer {
          height: 100%;
          background: linear-gradient(180deg, #0f0f12 0%, #111115 100%);
        }

        .mobile-file-explorer :global(.file-item),
        .mobile-file-explorer :global(.directory-item) {
          padding: 12px 16px;
          min-height: 48px;
        }

        .mobile-file-explorer :global(.file-name),
        .mobile-file-explorer :global(.directory-name) {
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

export function BuilderLayout({
  fileTree,
  selectedFile,
  previewResult,
  isBuilding = false,
  isStreaming = false,
  projectName = 'Untitled Project',
  onFileSelect = () => {},
  onFileChange = () => {},
  onConsole = () => {},
  onDeploy = () => {},
  className = '',
}: BuilderLayoutProps) {
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Mobile state
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('files');

  // Desktop state
  const [activePanel, setActivePanel] = useState<DesktopPanel>('files');

  const handleFileSelect = useCallback((file: VirtualFile) => {
    onFileSelect(file);
    // On mobile, auto-switch to editor when file is selected
    if (isMobile) {
      setMobilePanel('editor');
    }
  }, [onFileSelect, isMobile]);

  const handleEditorChange = useCallback(
    (content: string) => {
      if (selectedFile) onFileChange(selectedFile.path, content);
    },
    [selectedFile, onFileChange]
  );

  // Memoize panel content
  const hasFiles = useMemo(() => fileTree !== null, [fileTree]);
  const hasSelectedFile = useMemo(() => selectedFile !== null, [selectedFile]);
  const hasPreview = useMemo(() => previewResult !== null || isBuilding, [previewResult, isBuilding]);

  // ========================================================================
  // MOBILE LAYOUT
  // ========================================================================
  if (isMobile) {
    return (
      <div className={`builder-mobile ${className}`}>
        {/* Mobile Header */}
        <MobileHeader
          projectName={projectName}
          isBuilding={isBuilding}
          isStreaming={isStreaming}
          activePanel={mobilePanel}
        />

        {/* Swipeable Panel Container */}
        <MobilePanelContainer
          activePanel={mobilePanel}
          onPanelChange={setMobilePanel}
          children={{
            files: (
              <MobileFileExplorer
                tree={fileTree}
                selectedPath={selectedFile?.path || null}
                onFileSelect={handleFileSelect}
                onFileOpen={handleFileSelect}
                projectName={projectName}
              />
            ),
            editor: (
              <MobileEditor
                file={selectedFile}
                onChange={handleEditorChange}
              />
            ),
            preview: (
              <BuilderPreview
                preview={previewResult}
                isBuilding={isStreaming || isBuilding}
                onConsole={onConsole}
              />
            ),
          }}
        />

        {/* Bottom Navigation */}
        <MobileBottomNav
          activePanel={mobilePanel}
          onPanelChange={setMobilePanel}
          hasFiles={hasFiles}
          hasSelectedFile={hasSelectedFile}
          hasPreview={hasPreview}
        />

        <style jsx>{`
          .builder-mobile {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100vh;
            height: 100dvh;
            background: #0a0a0c;
            overflow: hidden;
            position: fixed;
            inset: 0;
          }
        `}</style>
      </div>
    );
  }

  // ========================================================================
  // TABLET LAYOUT - 2 Panel Split
  // ========================================================================
  if (isTablet) {
    return (
      <div className={`builder-tablet ${className}`}>
        {/* Header */}
        <HeaderBar
          projectName={projectName}
          isBuilding={isBuilding}
          isStreaming={isStreaming}
          onDeploy={onDeploy}
        />

        {/* Main Content */}
        <div className="builder-main">
          {/* Left Panel - Files + Editor */}
          <div className="left-panel">
            <div className="panel-tabs">
              <button
                className={`tab ${activePanel === 'files' ? 'active' : ''}`}
                onClick={() => setActivePanel('files')}
              >
                Files
              </button>
              <button
                className={`tab ${activePanel === 'search' ? 'active' : ''}`}
                onClick={() => setActivePanel('search')}
              >
                Search
              </button>
            </div>

            <div className="panel-content">
              {activePanel === 'files' && (
                <FileExplorer
                  tree={fileTree}
                  selectedPath={selectedFile?.path}
                  onFileSelect={handleFileSelect}
                  onFileOpen={handleFileSelect}
                  projectName={projectName}
                />
              )}
            </div>
          </div>

          {/* Center - Editor */}
          <div className="editor-panel">
            <EditorPanel file={selectedFile} onChange={handleEditorChange} />
          </div>

          {/* Right - Preview (Collapsible) */}
          <div className="preview-panel">
            <BuilderPreview preview={previewResult} isBuilding={isStreaming || isBuilding} onConsole={onConsole} />
          </div>
        </div>

        {/* Status Bar */}
        <StatusBar file={selectedFile} isBuilding={isBuilding} />

        <style jsx>{`
          .builder-tablet {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100vh;
            background: #0a0a0c;
            overflow: hidden;
          }

          .builder-main {
            display: flex;
            flex: 1;
            min-height: 0;
          }

          .left-panel {
            display: flex;
            flex-direction: column;
            width: 240px;
            border-right: 1px solid rgba(255, 255, 255, 0.04);
          }

          .panel-tabs {
            display: flex;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          }

          .tab {
            flex: 1;
            padding: 12px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
          }

          .tab.active {
            color: #8b5cf6;
            border-bottom: 2px solid #8b5cf6;
          }

          .panel-content {
            flex: 1;
            overflow: hidden;
          }

          .editor-panel {
            flex: 1;
            min-width: 0;
          }

          .preview-panel {
            width: 360px;
            border-left: 1px solid rgba(255, 255, 255, 0.04);
          }
        `}</style>
      </div>
    );
  }

  // ========================================================================
  // DESKTOP LAYOUT - Full 3-Panel IDE
  // ========================================================================
  return (
    <div className={`builder-container ${className}`}>
      {/* Header */}
      <HeaderBar
        projectName={projectName}
        isBuilding={isBuilding}
        isStreaming={isStreaming}
        onDeploy={onDeploy}
      />

      {/* Main Content */}
      <div className="builder-main">
        {/* Activity Bar */}
        <ActivityBar activePanel={activePanel} onPanelChange={setActivePanel} />

        {/* Sidebar Panel */}
        <ResizablePanel minWidth={200} maxWidth={400} defaultWidth={260} side="left">
          <div className="sidebar-panel">
            {activePanel === 'files' && (
              <FileExplorer
                tree={fileTree}
                selectedPath={selectedFile?.path}
                onFileSelect={handleFileSelect}
                onFileOpen={handleFileSelect}
                projectName={projectName}
              />
            )}
            {activePanel === 'ai' && (
              <div className="ai-panel">
                <div className="ai-header">
                  <span className="ai-title">AI Assistant</span>
                  <div className="ai-status online" />
                </div>
                <div className="ai-content">
                  <p>Ask Alfred to generate code, fix bugs, or explain concepts.</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        {/* Editor Panel */}
        <div className="editor-container">
          <EditorPanel file={selectedFile} onChange={handleEditorChange} />
        </div>

        {/* Preview Panel */}
        <ResizablePanel minWidth={320} maxWidth={800} defaultWidth={480} side="right">
          <BuilderPreview preview={previewResult} isBuilding={isStreaming || isBuilding} onConsole={onConsole} />
        </ResizablePanel>
      </div>

      {/* Status Bar */}
      <StatusBar file={selectedFile} isBuilding={isBuilding} />

      <style jsx>{`
        .builder-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100vh;
          background: #0a0a0c;
          overflow: hidden;
        }

        .builder-main {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .sidebar-panel {
          height: 100%;
          background: linear-gradient(180deg, #0c0c10 0%, #0a0a0e 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .editor-container {
          flex: 1;
          min-width: 0;
          height: 100%;
          border-left: 1px solid rgba(255, 255, 255, 0.04);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
        }

        .ai-panel {
          padding: 16px;
          height: 100%;
        }

        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .ai-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: -0.01em;
        }

        .ai-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .ai-status.online {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .ai-content {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

export default BuilderLayout;
