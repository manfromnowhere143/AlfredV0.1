'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOBILE BUILDER LAYOUT — State of the Art Premium Experience
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Zero generic elements. Every icon hand-crafted. Every animation intentional.
 * This is what happens when obsession meets execution.
 *
 * "Details matter, it's worth waiting to get it right." - Steve Jobs
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { VirtualFile, VirtualDirectory, PreviewResult } from '@alfred/core';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MobileTab = 'files' | 'code' | 'preview' | 'chat';

interface MobileBuilderLayoutProps {
  fileTree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedFile: VirtualFile | null;
  projectName: string;
  previewResult: PreviewResult | null;
  isBuilding: boolean;
  isStreaming: boolean;
  onFileSelect: (file: VirtualFile) => void;
  onFileChange: (content: string) => void;
  onSendMessage: (message: string) => void;
  onRebuild: () => void;
  streamingFile: string | null;
  streamingCode: string;
  streamingSteps: Array<{
    id: string;
    type: string;
    name: string;
    status: 'active' | 'done';
  }>;
  messages: Array<{
    id: string;
    role: 'user' | 'alfred';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM ICON SYSTEM — Hand-crafted, pixel-perfect SVGs
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  // Navigation Icons
  files: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L12 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 7V6C3 4.89543 3.89543 4 5 4H8.58579C8.851 4 9.10536 4.10536 9.29289 4.29289L11 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  ),
  code: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 4L10 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  preview: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C7.02944 3 3 6.58172 3 11C3 13.2091 4.04751 15.1824 5.71066 16.5715L4 21L8.8906 19.0657C9.87519 19.3511 10.9183 19.5 12 19.5C16.9706 19.5 21 15.9183 21 11.5C21 7.08172 16.9706 3.5 12 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 10H8.01M12 10H12.01M16 10H16.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  // Action Icons
  addFile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12V18M9 15H15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  refactor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3V6M12 18V21M21 12H18M6 12H3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M5.63604 5.63604L7.75736 7.75736M16.2426 16.2426L18.364 18.364M18.364 5.63604L16.2426 7.75736M7.75736 16.2426L5.63604 18.364" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  debug: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L12 5M12 19L12 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M2 12H5M19 12H22M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.5"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  ),
  style: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5L14.09 8.26L20 9.27L15.5 13.14L16.82 19.02L12 16.27L7.18 19.02L8.5 13.14L4 9.27L9.91 8.26L12 2.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 6L13.09 8.91L16 9.27L13.75 11.32L14.36 14.25L12 12.9L9.64 14.25L10.25 11.32L8 9.27L10.91 8.91L12 6Z" fill="currentColor" opacity="0.3"/>
    </svg>
  ),

  // Suggestion Icons
  todo: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="url(#todoGrad)" fillOpacity="0.15"/>
      <defs>
        <linearGradient id="todoGrad" x1="3" y1="3" x2="21" y2="21">
          <stop stopColor="#22c55e"/>
          <stop offset="1" stopColor="#16a34a"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  calculator: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="6" y="4" width="12" height="5" rx="1" fill="currentColor" fillOpacity="0.2"/>
      <circle cx="8" cy="13" r="1.25" fill="currentColor"/>
      <circle cx="12" cy="13" r="1.25" fill="currentColor"/>
      <circle cx="16" cy="13" r="1.25" fill="currentColor"/>
      <circle cx="8" cy="17" r="1.25" fill="currentColor"/>
      <circle cx="12" cy="17" r="1.25" fill="currentColor"/>
      <circle cx="16" cy="17" r="1.25" fill="currentColor"/>
      <rect x="4" y="2" width="16" height="20" rx="2" fill="url(#calcGrad)" fillOpacity="0.1"/>
      <defs>
        <linearGradient id="calcGrad" x1="4" y1="2" x2="20" y2="22">
          <stop stopColor="#f59e0b"/>
          <stop offset="1" stopColor="#d97706"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  rocket: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 4 7 12C7 15.5 8 18.5 9 20.5L12 18L15 20.5C16 18.5 17 15.5 17 12C17 4 12 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="2" fill="currentColor"/>
      <path d="M5 15C5 15 3 16 3 18C3 20 5 21 5 21L7 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M19 15C19 15 21 16 21 18C21 20 19 21 19 21L17 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M12 2C12 2 7 4 7 12C7 15.5 8 18.5 9 20.5L12 18L15 20.5C16 18.5 17 15.5 17 12C17 4 12 2 12 2Z" fill="url(#rocketGrad)" fillOpacity="0.15"/>
      <defs>
        <linearGradient id="rocketGrad" x1="7" y1="2" x2="17" y2="20">
          <stop stopColor="#8b5cf6"/>
          <stop offset="1" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  weather: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      <path d="M12 1V2M12 10V11M17.66 3.34L16.95 4.05M7.05 4.05L6.34 3.34M20 6H19M5 6H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <path d="M18.5 17.5C20.433 17.5 22 15.933 22 14C22 12.067 20.433 10.5 18.5 10.5H17.7C17.5 8.567 15.9 7 13.9 7C11.633 7 9.8 8.9 9.8 11.167V11.5H9C6.79 11.5 5 13.29 5 15.5C5 17.71 6.79 19.5 9 19.5H18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 17.5C20.433 17.5 22 15.933 22 14C22 12.067 20.433 10.5 18.5 10.5H17.7C17.5 8.567 15.9 7 13.9 7C11.633 7 9.8 8.9 9.8 11.167V11.5H9C6.79 11.5 5 13.29 5 15.5C5 17.71 6.79 19.5 9 19.5H18.5" fill="url(#weatherGrad)" fillOpacity="0.15"/>
      <defs>
        <linearGradient id="weatherGrad" x1="5" y1="7" x2="22" y2="19">
          <stop stopColor="#0ea5e9"/>
          <stop offset="1" stopColor="#0284c7"/>
        </linearGradient>
      </defs>
    </svg>
  ),

  // UI Icons
  alfred: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  refresh: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 15A9 9 0 115.64 5.64L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  edit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  mobile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.75"/>
      <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  tablet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  desktop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  ),
};

// File type icons
const getFileIcon = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#3178c6"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui">TS</text>
        </svg>
      );
    case 'jsx':
    case 'js':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#f7df1e"/>
          <text x="12" y="16" textAnchor="middle" fill="#323330" fontSize="9" fontWeight="bold" fontFamily="system-ui">JS</text>
        </svg>
      );
    case 'css':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#264de4"/>
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui">CSS</text>
        </svg>
      );
    case 'json':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" stroke="#fbbf24" strokeWidth="1.5" fill="none"/>
          <path d="M8 8C8 6.5 9 6 10 6M16 8C16 6.5 15 6 14 6M8 16C8 17.5 9 18 10 18M16 16C16 17.5 15 18 14 18" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'md':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" stroke="#6b7280" strokeWidth="1.5"/>
          <text x="12" y="16" textAnchor="middle" fill="#6b7280" fontSize="8" fontWeight="bold" fontFamily="system-ui">MD</text>
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE HEADER — Glass morphism premium
// ═══════════════════════════════════════════════════════════════════════════════

function MobileHeader({
  title,
  subtitle,
  isStreaming,
  isBuilding,
  onBack,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  isStreaming?: boolean;
  isBuilding?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <header className="mobile-header">
      <div className="header-glow" />
      <div className="header-content">
        <div className="header-left">
          {onBack && (
            <button className="back-btn" onClick={onBack}>
              {Icons.chevronLeft}
            </button>
          )}
          <div className="header-title-group">
            <h1 className="header-title">{title}</h1>
            {subtitle && <span className="header-subtitle">{subtitle}</span>}
          </div>
        </div>

        <div className="header-right">
          {(isStreaming || isBuilding) && (
            <div className="status-pill">
              <div className="status-orb">
                <div className="orb-core" />
                <div className="orb-ring" />
              </div>
              <span>{isStreaming ? 'Generating' : 'Building'}</span>
            </div>
          )}
          {rightAction}
        </div>
      </div>

      <style jsx>{`
        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(9, 9, 11, 0.85);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          padding: 0 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          border-radius: 12px;
          margin-left: -8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-btn:active {
          background: rgba(255, 255, 255, 0.08);
          transform: scale(0.92);
        }

        .header-title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .header-title {
          font-size: 18px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.97);
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 450;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 24px;
        }

        .status-orb {
          position: relative;
          width: 10px;
          height: 10px;
        }

        .orb-core {
          position: absolute;
          inset: 2px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%;
        }

        .orb-ring {
          position: absolute;
          inset: 0;
          border: 1.5px solid #8b5cf6;
          border-radius: 50%;
          animation: pulse-ring 1.5s ease-out infinite;
        }

        .status-pill span {
          font-size: 12px;
          font-weight: 550;
          color: #a78bfa;
          letter-spacing: 0.01em;
        }

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION — Floating glass bar
// ═══════════════════════════════════════════════════════════════════════════════

function BottomNavigation({
  activeTab,
  onTabChange,
  hasUnreadChat,
  fileCount,
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasUnreadChat?: boolean;
  fileCount: number;
}) {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'files', label: 'Files', icon: Icons.files },
    { id: 'code', label: 'Code', icon: Icons.code },
    { id: 'preview', label: 'Preview', icon: Icons.preview },
    { id: 'chat', label: 'Alfred', icon: Icons.chat },
  ];

  return (
    <nav className="bottom-nav">
      <div className="nav-glow" />
      <div className="nav-content">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div className="nav-icon-wrapper">
              <div className="nav-icon">{tab.icon}</div>
              {tab.id === 'files' && fileCount > 0 && (
                <span className="badge">{fileCount > 99 ? '99+' : fileCount}</span>
              )}
              {tab.id === 'chat' && hasUnreadChat && <span className="dot" />}
            </div>
            <span className="nav-label">{tab.label}</span>
            {activeTab === tab.id && <div className="active-glow" />}
          </button>
        ))}
      </div>

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 8px 12px;
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0));
          background: rgba(9, 9, 11, 0.92);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .nav-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.4), transparent);
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 6px;
        }

        .nav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 10px 8px;
          background: transparent;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }

        .nav-item.active {
          background: rgba(245, 158, 11, 0.1);
        }

        .nav-item:active {
          transform: scale(0.94);
        }

        .nav-icon-wrapper {
          position: relative;
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          transition: all 0.25s;
        }

        .nav-item.active .nav-icon {
          color: #f59e0b;
          transform: translateY(-2px);
        }

        .badge {
          position: absolute;
          top: -6px;
          right: -12px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 9px;
          font-size: 10px;
          font-weight: 650;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }

        .dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50%;
          border: 2px solid #09090b;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        }

        .nav-label {
          font-size: 10px;
          font-weight: 550;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
          transition: all 0.25s;
          letter-spacing: 0.01em;
        }

        .nav-item.active .nav-label {
          color: #f59e0b;
        }

        .active-glow {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          border-radius: 2px;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
        }
      `}</style>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE FILE EXPLORER
// ═══════════════════════════════════════════════════════════════════════════════

function MobileFileExplorer({
  tree,
  files,
  selectedPath,
  projectName,
  onFileSelect,
  onNavigateToCode,
}: {
  tree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedPath: string | null;
  projectName: string;
  onFileSelect: (file: VirtualFile) => void;
  onNavigateToCode: () => void;
}) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['/src', '/components', '/lib', '/app'])
  );

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleFileClick = useCallback((file: VirtualFile) => {
    onFileSelect(file);
    onNavigateToCode();
  }, [onFileSelect, onNavigateToCode]);

  const renderFile = (file: VirtualFile, depth: number = 0) => (
    <button
      key={file.path}
      className={`file-item ${selectedPath === file.path ? 'selected' : ''}`}
      onClick={() => handleFileClick(file)}
      style={{ paddingLeft: `${20 + depth * 20}px` }}
    >
      <span className="file-icon">{getFileIcon(file.path)}</span>
      <span className="file-name">{file.name}</span>
      {file.isEntryPoint && <span className="entry-badge">ENTRY</span>}
      <span className="chevron">{Icons.chevronRight}</span>
    </button>
  );

  const renderDirectory = (dir: VirtualDirectory, depth: number = 0) => {
    const isExpanded = expandedPaths.has(dir.path);
    return (
      <div key={dir.path} className="directory-item">
        <button
          className="directory-header"
          onClick={() => toggleExpand(dir.path)}
          style={{ paddingLeft: `${20 + depth * 20}px` }}
        >
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>{Icons.chevronRight}</span>
          {Icons.folder}
          <span className="directory-name">{dir.name}</span>
        </button>
        {isExpanded && (
          <div className="directory-children">
            {dir.children
              .filter((c): c is VirtualDirectory => 'children' in c)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((d) => renderDirectory(d, depth + 1))}
            {dir.children
              .filter((c): c is VirtualFile => !('children' in c))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => renderFile(f, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-file-explorer">
      <MobileHeader title={projectName} subtitle={`${files.length} files`} />
      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-visual">
              <div className="empty-folder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="url(#emptyGrad)" strokeWidth="1.5"/>
                  <defs>
                    <linearGradient id="emptyGrad" x1="2" y1="3" x2="22" y2="21">
                      <stop stopColor="#8b5cf6" stopOpacity="0.5"/>
                      <stop offset="1" stopColor="#6366f1" stopOpacity="0.3"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="empty-particles">
                {[...Array(3)].map((_, i) => <div key={i} className="particle" style={{ animationDelay: `${i * 0.4}s` }} />)}
              </div>
            </div>
            <h3>No files yet</h3>
            <p>Start a conversation with Alfred to generate code</p>
          </div>
        ) : tree ? (
          <>
            {tree.children.filter((c): c is VirtualFile => !('children' in c)).sort((a, b) => a.name.localeCompare(b.name)).map((f) => renderFile(f, 0))}
            {tree.children.filter((c): c is VirtualDirectory => 'children' in c).sort((a, b) => a.name.localeCompare(b.name)).map((d) => renderDirectory(d, 0))}
          </>
        ) : (
          files.map((f) => renderFile(f, 0))
        )}
      </div>

      <style jsx>{`
        .mobile-file-explorer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #09090b;
        }

        .file-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 100px;
        }

        .file-item, .directory-header {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 56px;
          padding: 14px 20px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .file-item:active, .directory-header:active {
          background: rgba(255, 255, 255, 0.04);
        }

        .file-item.selected {
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05));
          border-left: 3px solid #8b5cf6;
        }

        .file-icon { margin-right: 14px; flex-shrink: 0; }
        .expand-icon {
          margin-right: 8px;
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .expand-icon.expanded { transform: rotate(90deg); }

        .directory-header svg:not(.expand-icon svg) { margin-right: 12px; }

        .file-name, .directory-name {
          flex: 1;
          font-size: 15px;
          font-weight: 450;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .directory-name { font-weight: 550; }

        .entry-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.15));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          font-size: 9px;
          font-weight: 650;
          color: #f59e0b;
          margin-right: 10px;
          letter-spacing: 0.05em;
        }

        .chevron { flex-shrink: 0; color: rgba(255, 255, 255, 0.2); }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 48px 32px;
          text-align: center;
        }

        .empty-visual {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .empty-folder {
          position: relative;
          z-index: 1;
        }

        .empty-particles {
          position: absolute;
          inset: 0;
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #8b5cf6;
          border-radius: 50%;
          animation: float 3s ease-in-out infinite;
        }

        .particle:nth-child(1) { top: 10%; left: 20%; }
        .particle:nth-child(2) { top: 60%; right: 15%; }
        .particle:nth-child(3) { bottom: 20%; left: 10%; }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .empty-state p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
          max-width: 240px;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CODE EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function MobileCodeEditor({
  file,
  onChange,
  isStreaming,
  streamingCode,
  streamingFile,
}: {
  file: VirtualFile | null;
  onChange: (content: string) => void;
  isStreaming: boolean;
  streamingCode: string;
  streamingFile: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayPath = streamingFile || file?.path || '';
  const displayContent = streamingFile && isStreaming ? streamingCode : file?.content || '';
  const displayName = displayPath.split('/').pop() || 'Select a file';

  const codeKeys = ['Tab', '{', '}', '(', ')', '[', ']', ';', ':', '"', "'", '<', '>'];

  const insertKey = useCallback((key: string) => {
    if (!textareaRef.current || !file) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const insert = key === 'Tab' ? '  ' : key;
    const newText = text.substring(0, start) + insert + text.substring(end);
    onChange(newText);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + insert.length; ta.focus(); }, 0);
  }, [file, onChange]);

  if (!file && !streamingFile) {
    return (
      <div className="mobile-code-empty">
        <div className="empty-visual">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M16 18L22 12L16 6" stroke="url(#codeGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6L2 12L8 18" stroke="url(#codeGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="codeGrad" x1="2" y1="6" x2="22" y2="18">
                <stop stopColor="#8b5cf6" stopOpacity="0.5"/>
                <stop offset="1" stopColor="#6366f1" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h3>No file selected</h3>
        <p>Select a file from the Files tab to view code</p>
        <style jsx>{`
          .mobile-code-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 48px 32px;
            text-align: center;
            background: #09090b;
          }
          .empty-visual { margin-bottom: 24px; }
          h3 { font-size: 20px; font-weight: 650; color: rgba(255,255,255,0.9); margin: 0 0 8px; }
          p { font-size: 14px; color: rgba(255,255,255,0.45); margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mobile-code-editor">
      <MobileHeader
        title={displayName}
        subtitle={isStreaming ? 'Generating...' : undefined}
        rightAction={!isStreaming && file && (
          <button className={`edit-toggle ${isEditing ? 'active' : ''}`} onClick={() => setIsEditing(!isEditing)}>
            {Icons.edit}
          </button>
        )}
      />
      <div className="code-container">
        {isStreaming ? (
          <pre className="code-display streaming"><code>{displayContent}</code><span className="cursor" /></pre>
        ) : isEditing ? (
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={displayContent}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        ) : (
          <pre className="code-display"><code>{displayContent}</code></pre>
        )}
      </div>
      {isEditing && !isStreaming && (
        <div className="code-toolbar">
          {codeKeys.map((key) => (
            <button key={key} className="code-key" onClick={() => insertKey(key)}>{key}</button>
          ))}
        </div>
      )}
      <style jsx>{`
        .mobile-code-editor { display: flex; flex-direction: column; height: 100%; background: #0a0a0c; }
        .edit-toggle {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .edit-toggle.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
        .code-container { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; padding-bottom: 100px; }
        .code-display, .code-textarea {
          width: 100%; min-height: 100%; margin: 0; padding: 20px;
          background: transparent;
          font-family: 'SF Mono', 'Fira Code', Monaco, monospace;
          font-size: 13px; line-height: 1.7; color: #e5e7eb;
          white-space: pre; overflow-x: auto;
        }
        .code-textarea { border: none; outline: none; resize: none; }
        .code-display code { font-family: inherit; }
        .code-display.streaming { position: relative; }
        .cursor {
          display: inline-block; width: 2px; height: 18px;
          background: linear-gradient(180deg, #8b5cf6, #6366f1);
          animation: blink 1s infinite;
          vertical-align: text-bottom;
          border-radius: 1px;
          box-shadow: 0 0 8px rgba(139,92,246,0.6);
        }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .code-toolbar {
          display: flex; gap: 8px; padding: 12px 16px;
          background: rgba(0,0,0,0.6);
          border-top: 1px solid rgba(255,255,255,0.06);
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          position: sticky; bottom: 84px;
          backdrop-filter: blur(12px);
        }
        .code-key {
          flex-shrink: 0; min-width: 44px; height: 40px; padding: 0 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: rgba(255,255,255,0.9);
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 15px; font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .code-key:active { background: rgba(255,255,255,0.12); transform: scale(0.94); }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function MobilePreview({
  preview,
  isBuilding,
  onRefresh,
}: {
  preview: PreviewResult | null;
  isBuilding: boolean;
  onRefresh: () => void;
}) {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (preview?.html && iframeRef.current) iframeRef.current.srcdoc = preview.html;
  }, [preview?.html]);

  const viewportSizes = { mobile: { width: 375, height: 667 }, tablet: { width: 768, height: 1024 }, desktop: { width: '100%', height: '100%' } };

  return (
    <div className="mobile-preview">
      <MobileHeader
        title="Preview"
        isBuilding={isBuilding}
        rightAction={
          <div className="preview-actions">
            <div className="viewport-toggle">
              {(['mobile', 'tablet', 'desktop'] as const).map((vp) => (
                <button key={vp} className={viewport === vp ? 'active' : ''} onClick={() => setViewport(vp)}>
                  {vp === 'mobile' && Icons.mobile}
                  {vp === 'tablet' && Icons.tablet}
                  {vp === 'desktop' && Icons.desktop}
                </button>
              ))}
            </div>
            <button className="refresh-btn" onClick={onRefresh}>{Icons.refresh}</button>
          </div>
        }
      />
      <div className="preview-container">
        {isBuilding ? (
          <div className="building-state">
            <div className="building-orb">
              <div className="orb-core" />
              <div className="orb-ring r1" />
              <div className="orb-ring r2" />
              <div className="orb-ring r3" />
            </div>
            <h3>Building preview...</h3>
            <p>Alfred is crafting your creation</p>
          </div>
        ) : preview?.html ? (
          <div className={`iframe-wrapper ${viewport}`}>
            {viewport === 'mobile' && <div className="device-notch" />}
            <iframe
              ref={iframeRef}
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              style={viewport === 'desktop' ? { width: '100%', height: '100%' } : { width: viewportSizes[viewport].width, height: viewportSizes[viewport].height }}
            />
            {viewport === 'mobile' && <div className="device-home" />}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-visual">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="url(#previewGrad)" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" stroke="url(#previewGrad)" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="previewGrad" x1="2" y1="5" x2="22" y2="19">
                    <stop stopColor="#8b5cf6" stopOpacity="0.5"/>
                    <stop offset="1" stopColor="#6366f1" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>No preview available</h3>
            <p>Build something to see it here</p>
          </div>
        )}
      </div>
      <style jsx>{`
        .mobile-preview { display: flex; flex-direction: column; height: 100%; background: #09090b; }
        .preview-actions { display: flex; align-items: center; gap: 10px; }
        .viewport-toggle {
          display: flex;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 3px;
        }
        .viewport-toggle button {
          width: 36px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; border-radius: 8px;
          color: rgba(255,255,255,0.4); cursor: pointer;
          transition: all 0.2s;
        }
        .viewport-toggle button.active { background: rgba(255,255,255,0.1); color: white; }
        .refresh-btn {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none;
          color: rgba(255,255,255,0.6); cursor: pointer;
          border-radius: 12px; transition: all 0.3s;
        }
        .refresh-btn:active { background: rgba(255,255,255,0.08); transform: rotate(180deg); }
        .preview-container {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 20px; padding-bottom: 100px; overflow: hidden;
        }
        .iframe-wrapper {
          background: #1a1a1c; border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
          display: flex; flex-direction: column;
        }
        .iframe-wrapper.mobile { padding: 12px 8px; }
        .device-notch {
          width: 80px; height: 24px;
          background: #0a0a0c; border-radius: 0 0 16px 16px;
          margin: 0 auto 8px;
        }
        .device-home {
          width: 100px; height: 5px;
          background: rgba(255,255,255,0.2); border-radius: 3px;
          margin: 12px auto 0;
        }
        .iframe-wrapper.tablet { border-radius: 20px; max-height: 80vh; }
        .iframe-wrapper.desktop { width: 100%; height: 100%; border-radius: 12px; }
        .iframe-wrapper iframe { display: block; border: none; background: white; border-radius: 12px; }
        .iframe-wrapper.mobile iframe { border-radius: 20px; }
        .building-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center; padding: 48px;
        }
        .building-orb {
          position: relative; width: 100px; height: 100px; margin-bottom: 28px;
        }
        .orb-core {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%;
          box-shadow: 0 0 40px rgba(139,92,246,0.5);
        }
        .orb-ring {
          position: absolute; inset: 0;
          border: 2px solid #8b5cf6; border-radius: 50%;
          animation: orbit 3s linear infinite;
        }
        .orb-ring.r1 { animation-delay: 0s; opacity: 0.6; }
        .orb-ring.r2 { animation-delay: -1s; opacity: 0.4; }
        .orb-ring.r3 { animation-delay: -2s; opacity: 0.2; }
        @keyframes orbit {
          0% { transform: rotate(0deg) scale(1); opacity: 0.6; }
          50% { transform: rotate(180deg) scale(1.15); opacity: 0.2; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.6; }
        }
        .building-state h3, .empty-state h3 { font-size: 20px; font-weight: 650; color: rgba(255,255,255,0.9); margin: 0 0 8px; }
        .building-state p, .empty-state p { font-size: 14px; color: rgba(255,255,255,0.45); margin: 0; }
        .empty-visual { margin-bottom: 24px; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CHAT — Premium conversational UI
// ═══════════════════════════════════════════════════════════════════════════════

function MobileChat({
  messages,
  streamingSteps,
  isStreaming,
  onSendMessage,
}: {
  messages: MobileBuilderLayoutProps['messages'];
  streamingSteps: MobileBuilderLayoutProps['streamingSteps'];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingSteps]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSendMessage(text);
  }, [input, isStreaming, onSendMessage]);

  const quickActions = [
    { icon: Icons.addFile, label: 'Add file', prompt: 'Create a new file for ' },
    { icon: Icons.refactor, label: 'Refactor', prompt: 'Refactor the ' },
    { icon: Icons.debug, label: 'Debug', prompt: 'Help me debug ' },
    { icon: Icons.style, label: 'Style', prompt: 'Improve the styling of ' },
  ];

  const suggestions = [
    { icon: Icons.todo, label: 'Todo App', prompt: 'Create a modern todo app with React and local storage' },
    { icon: Icons.calculator, label: 'Calculator', prompt: 'Build a calculator with a clean minimal design' },
    { icon: Icons.rocket, label: 'Landing Page', prompt: 'Create a beautiful landing page for a SaaS product' },
    { icon: Icons.weather, label: 'Weather App', prompt: 'Build a weather dashboard that shows current conditions' },
  ];

  return (
    <div className="mobile-chat">
      <MobileHeader title="Alfred AI" subtitle={isStreaming ? 'Generating...' : 'Online'} isStreaming={isStreaming} />
      <div className="messages-container" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="welcome-state">
            <div className="welcome-icon">
              <div className="icon-glow" />
              {Icons.alfred}
            </div>
            <h3>What would you like to build?</h3>
            <p>Describe your idea and I'll generate the code.</p>
            <div className="suggestion-grid">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s.prompt)}>
                  <span className="suggestion-icon">{s.icon}</span>
                  <span className="suggestion-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? 'Y' : Icons.alfred}
              </div>
              <div className="message-body">
                <div className="message-header">
                  <span className="message-sender">{msg.role === 'user' ? 'You' : 'Alfred'}</span>
                  <span className="message-time">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {msg.isStreaming ? (
                  <div className="streaming-indicator">
                    {streamingSteps.map((step) => (
                      <div key={step.id} className={`step ${step.status}`}>
                        <span className="step-icon">
                          {step.status === 'active' ? <div className="spinner" /> : Icons.check}
                        </span>
                        <span className="step-name">{step.name}</span>
                      </div>
                    ))}
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                ) : (
                  <div className="message-content">{msg.content}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="input-area">
        <div className="quick-actions">
          {quickActions.map((action, i) => (
            <button key={i} className="quick-action" onClick={() => setInput(action.prompt)}>
              <span className="action-icon">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <div className="input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Describe what you want to build..."
            disabled={isStreaming}
            rows={1}
          />
          <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isStreaming}>
            {Icons.send}
          </button>
        </div>
      </div>
      <style jsx>{`
        .mobile-chat { display: flex; flex-direction: column; height: 100%; background: #09090b; }
        .messages-container { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px; padding-bottom: 200px; }
        .welcome-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 100%; text-align: center; padding: 24px;
        }
        .welcome-icon {
          position: relative; width: 80px; height: 80px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1));
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 24px; color: #8b5cf6; margin-bottom: 24px;
        }
        .icon-glow {
          position: absolute; inset: -20px;
          background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
          filter: blur(20px);
        }
        .welcome-state h3 { font-size: 22px; font-weight: 650; color: rgba(255,255,255,0.97); margin: 0 0 8px; letter-spacing: -0.02em; }
        .welcome-state p { font-size: 15px; color: rgba(255,255,255,0.5); margin: 0 0 32px; }
        .suggestion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 340px; }
        .suggestion-grid button {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 20px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; color: rgba(255,255,255,0.85);
          font-size: 13px; font-weight: 550; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          -webkit-tap-highlight-color: transparent;
        }
        .suggestion-grid button:active {
          background: rgba(139,92,246,0.12);
          border-color: rgba(139,92,246,0.3);
          transform: scale(0.96);
        }
        .suggestion-icon { display: flex; }
        .suggestion-label { letter-spacing: 0.01em; }
        .message { display: flex; gap: 12px; margin-bottom: 20px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .message-avatar {
          width: 36px; height: 36px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 12px; font-size: 13px; font-weight: 650;
        }
        .message.user .message-avatar { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .message.alfred .message-avatar { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .message-body { flex: 1; min-width: 0; }
        .message-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .message-sender { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.95); }
        .message-time { font-size: 11px; color: rgba(255,255,255,0.35); }
        .message-content { font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.85); }
        .streaming-indicator { display: flex; flex-direction: column; gap: 8px; }
        .step {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 10px;
        }
        .step.done { opacity: 0.6; }
        .step-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; color: #8b5cf6; }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(139,92,246,0.3); border-top-color: #8b5cf6;
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .step-name { font-size: 12px; color: rgba(255,255,255,0.75); font-family: 'SF Mono', Monaco, monospace; }
        .typing-dots { display: flex; gap: 5px; padding: 10px 0; }
        .typing-dots span {
          width: 8px; height: 8px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%; animation: bounce 1.4s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        .input-area {
          position: fixed; bottom: 84px; left: 0; right: 0;
          padding: 12px 16px;
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
          background: rgba(9,9,11,0.95);
          border-top: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .quick-actions {
          display: flex; gap: 8px; margin-bottom: 12px;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }
        .quick-action {
          flex-shrink: 0; display: flex; align-items: center; gap: 8px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          color: rgba(255,255,255,0.75);
          font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .quick-action:active { background: rgba(255,255,255,0.08); transform: scale(0.96); }
        .action-icon { display: flex; color: rgba(255,255,255,0.5); }
        .input-row {
          display: flex; align-items: flex-end; gap: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 12px 16px;
          transition: border-color 0.2s;
        }
        .input-row:focus-within { border-color: rgba(139,92,246,0.4); }
        .input-row textarea {
          flex: 1; background: transparent; border: none; outline: none;
          color: rgba(255,255,255,0.95);
          font-size: 16px; font-family: inherit;
          line-height: 1.5; resize: none;
          min-height: 26px; max-height: 120px;
        }
        .input-row textarea::placeholder { color: rgba(255,255,255,0.35); }
        .send-btn {
          width: 44px; height: 44px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none; border-radius: 14px;
          color: white; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 4px 16px rgba(139,92,246,0.3);
        }
        .send-btn:active:not(:disabled) { transform: scale(0.92); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MOBILE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MobileBuilderLayout({
  fileTree,
  files,
  selectedFile,
  projectName,
  previewResult,
  isBuilding,
  isStreaming,
  onFileSelect,
  onFileChange,
  onSendMessage,
  onRebuild,
  streamingFile,
  streamingCode,
  streamingSteps,
  messages,
}: MobileBuilderLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('chat');

  useEffect(() => {
    if (!isBuilding && !isStreaming && previewResult?.html && activeTab === 'chat') {
      const timer = setTimeout(() => setActiveTab('preview'), 500);
      return () => clearTimeout(timer);
    }
  }, [isBuilding, isStreaming, previewResult?.html, activeTab]);

  const navigateToCode = useCallback(() => setActiveTab('code'), []);

  return (
    <div className="mobile-builder">
      <div className="tab-content">
        {activeTab === 'files' && (
          <MobileFileExplorer
            tree={fileTree} files={files} selectedPath={selectedFile?.path || null}
            projectName={projectName} onFileSelect={onFileSelect} onNavigateToCode={navigateToCode}
          />
        )}
        {activeTab === 'code' && (
          <MobileCodeEditor
            file={selectedFile} onChange={onFileChange} isStreaming={isStreaming}
            streamingCode={streamingCode} streamingFile={streamingFile}
          />
        )}
        {activeTab === 'preview' && (
          <MobilePreview preview={previewResult} isBuilding={isBuilding || isStreaming} onRefresh={onRebuild} />
        )}
        {activeTab === 'chat' && (
          <MobileChat messages={messages} streamingSteps={streamingSteps} isStreaming={isStreaming} onSendMessage={onSendMessage} />
        )}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} fileCount={files.length} hasUnreadChat={false} />
      <style jsx>{`
        .mobile-builder {
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh;
          background: #09090b; overflow: hidden;
        }
        .tab-content { flex: 1; min-height: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
