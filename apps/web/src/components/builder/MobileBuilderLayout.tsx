'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOBILE BUILDER LAYOUT — Steve Jobs Level Mobile Experience
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Zero generic elements. Every icon hand-crafted. Every animation intentional.
 * Full feature parity with desktop. This is what happens when obsession meets execution.
 *
 * "Details matter, it's worth waiting to get it right." - Steve Jobs
 *
 * Features:
 * - Theme System with 6 themes (full CSS variable support)
 * - Save/Projects/Deploy/Export - all desktop features
 * - Voice Input with real-time visualizer
 * - Gesture Navigation (swipe between tabs)
 * - Pull-to-refresh on preview
 * - Haptic feedback patterns
 */

import React, { useState, useCallback, useRef, useEffect, TouchEvent } from 'react';
import type { VirtualFile, VirtualDirectory, PreviewResult } from '@alfred/core';
import type { ModificationPlan } from '@/lib/alfred-code/modify-project';
import type { ForensicReport, ProgressStep } from '@/components/alfred-code';
import { ModificationPreview, ForensicInvestigation, ModificationProgress } from '@/components/alfred-code';
import MessageAttachments from '@/components/MessageAttachments';
import type { FileAttachment } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MobileTab = 'files' | 'code' | 'preview' | 'chat';

interface Theme {
  id: string;
  bg: string;
  label: string;
  mode: 'dark' | 'light';
}

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
    files?: Array<{
      id: string;
      name: string;
      category: string;
      size: number;
      url?: string;
      preview?: string;
      duration?: number;
    }>;
  }>;
  // Theme System
  themes?: Theme[];
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  isLightTheme?: boolean;
  // Save/Projects
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  currentProjectId?: string | null;
  onOpenProjects?: () => void;
  // Deploy
  onDeploy?: () => Promise<void>;
  isDeploying?: boolean;
  deployedUrl?: string | null;
  // Export
  onExport?: () => void;
  // Load project
  onLoadProject?: (projectId: string) => void;
  loadingProjectId?: string | null;
  // Alfred Code - Modification Mode
  modificationPlan?: ModificationPlan | null;
  forensicReport?: ForensicReport | null;
  isAnalyzingModification?: boolean;
  isApplyingModification?: boolean;
  modificationSteps?: ProgressStep[];
  onApplyModification?: () => void;
  onCancelModification?: () => void;
  // File Upload
  uploadedFiles?: FileAttachment[];
  isUploading?: boolean;
  onAddFiles?: (files: File[]) => Promise<void>;
  onRemoveFile?: (id: string) => void;
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
  // New icons for mobile features
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  save: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  deploy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  export: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  projects: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  theme: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  more: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
      <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  ),
  externalLink: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  stop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>
  ),
  // File type icons for upload buttons
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.75"/>
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.75"/>
      <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="1.75"/>
    </svg>
  ),
  paperclip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <polygon points="12 2 2 7 12 12 22 7 12 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="2 17 12 22 22 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="2 12 12 17 22 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  expand: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="9 21 3 21 3 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEMPLATE ICONS — Beautiful icons for quick start suggestions
  // ═══════════════════════════════════════════════════════════════════════════════
  templateDashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" rx="1.5"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5"/>
    </svg>
  ),
  templateEcommerce: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>
  ),
  templateSaas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  templateAI: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  templatePortfolio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  ),
  templateLiveData: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODIFICATION ICONS — Icons for quick modification suggestions
  // ═══════════════════════════════════════════════════════════════════════════════
  modColors: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor"/>
      <circle cx="16.5" cy="10.5" r="1.5" fill="currentColor"/>
    </svg>
  ),
  modFonts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4 7 4 4 20 4 20 7"/>
      <line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  ),
  modNav: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  modButtons: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="4"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>
  ),
  modLayout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  modAnimate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  modImages: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  modDark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
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
// MOBILE HEADER — Glass morphism premium with theme support
// ═══════════════════════════════════════════════════════════════════════════════

function MobileHeader({
  title,
  subtitle,
  isStreaming,
  isBuilding,
  onBack,
  rightAction,
  isLightTheme,
}: {
  title: string;
  subtitle?: string;
  isStreaming?: boolean;
  isBuilding?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isLightTheme?: boolean;
}) {
  return (
    <header className={`mobile-header ${isLightTheme ? 'light' : ''}`}>
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
          background: var(--header-bg, rgba(9, 9, 11, 0.85));
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        }

        .mobile-header.light {
          --header-bg: rgba(255, 255, 255, 0.85);
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
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          cursor: pointer;
          border-radius: 12px;
          margin-left: -8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-btn:active {
          background: var(--surface-hover, rgba(255, 255, 255, 0.08));
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
          color: var(--text, rgba(255, 255, 255, 0.97));
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 12px;
          color: var(--text-muted, rgba(255, 255, 255, 0.45));
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
  isLightTheme,
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasUnreadChat?: boolean;
  fileCount: number;
  isLightTheme?: boolean;
}) {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'files', label: 'Files', icon: Icons.files },
    { id: 'code', label: 'Code', icon: Icons.code },
    { id: 'preview', label: 'Preview', icon: Icons.preview },
    { id: 'chat', label: 'Alfred', icon: Icons.chat },
  ];

  // Trigger haptic feedback on tab change
  const handleTabChange = useCallback((tab: MobileTab) => {
    // Haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tab);
  }, [onTabChange]);

  return (
    <nav className={`bottom-nav ${isLightTheme ? 'light' : ''}`}>
      <div className="nav-glow" />
      <div className="nav-content">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
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
          background: var(--nav-bg, rgba(9, 9, 11, 0.92));
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
        }

        .bottom-nav.light {
          --nav-bg: rgba(255, 255, 255, 0.92);
        }

        .nav-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent);
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: var(--surface, rgba(255, 255, 255, 0.03));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
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
          background: rgba(139, 92, 246, 0.1);
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
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
          transition: all 0.25s;
        }

        .nav-item.active .nav-icon {
          color: #a78bfa;
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
          border: 2px solid var(--bg, #09090b);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        }

        .nav-label {
          font-size: 10px;
          font-weight: 550;
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
          margin-top: 4px;
          transition: all 0.25s;
          letter-spacing: 0.01em;
        }

        .nav-item.active .nav-label {
          color: #a78bfa;
        }

        .active-glow {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: linear-gradient(90deg, #8b5cf6, #a78bfa);
          border-radius: 2px;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
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
  isLightTheme,
}: {
  tree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedPath: string | null;
  projectName: string;
  onFileSelect: (file: VirtualFile) => void;
  onNavigateToCode: () => void;
  isLightTheme?: boolean;
}) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(['/src', '/components', '/lib', '/app', '/'])
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
      className={`tree-file ${selectedPath === file.path ? 'selected' : ''}`}
      onClick={() => handleFileClick(file)}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      <span className="tree-icon">{getFileIcon(file.path)}</span>
      <span className="tree-name">{file.name}</span>
      {file.isEntryPoint && <span className="entry-dot" />}
    </button>
  );

  const renderDirectory = (dir: VirtualDirectory, depth: number = 0) => {
    const isExpanded = expandedPaths.has(dir.path);
    return (
      <div key={dir.path} className="tree-folder">
        <button
          className={`tree-folder-header ${isExpanded ? 'open' : ''}`}
          onClick={() => toggleExpand(dir.path)}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          <span className={`tree-chevron ${isExpanded ? 'open' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </span>
          <span className="tree-folder-icon">{Icons.folder}</span>
          <span className="tree-name">{dir.name}</span>
        </button>
        {isExpanded && (
          <div className="tree-folder-children">
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
    <div className={`mobile-file-explorer ${isLightTheme ? 'light' : ''}`}>
      <MobileHeader
        title={projectName || 'Files'}
        subtitle={`${files.length} files`}
        isLightTheme={isLightTheme}
      />

      <div className="tree-container">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                <path d="M12 11v6M9 14h6" strokeLinecap="round"/>
              </svg>
            </div>
            <p>No files yet</p>
            <span>Chat with Alfred to generate code</span>
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
          background: var(--bg, #09090b);
        }

        .tree-container {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 8px 0;
          padding-bottom: 100px;
        }

        /* Tree File Item */
        .tree-file {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          height: 36px;
          padding-right: 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .tree-file:active {
          background: var(--surface-hover, rgba(255,255,255,0.05));
        }

        .tree-file.selected {
          background: linear-gradient(90deg, rgba(139,92,246,0.15), transparent);
        }

        .tree-file.selected .tree-name {
          color: #a78bfa;
        }

        .tree-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tree-name {
          flex: 1;
          font-size: 13px;
          font-weight: 450;
          color: var(--text-secondary, rgba(255,255,255,0.75));
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .entry-dot {
          width: 6px;
          height: 6px;
          background: #8b5cf6;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Tree Folder */
        .tree-folder-header {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          height: 36px;
          padding-right: 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }

        .tree-folder-header:active {
          background: var(--surface-hover, rgba(255,255,255,0.05));
        }

        .tree-folder-header .tree-name {
          font-weight: 550;
          color: var(--text, rgba(255,255,255,0.9));
        }

        .tree-chevron {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.35));
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .tree-chevron.open {
          transform: rotate(90deg);
        }

        .tree-folder-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .tree-folder-children {
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 48px 24px;
          text-align: center;
        }

        .empty-icon {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.05));
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 18px;
          color: rgba(139,92,246,0.5);
          margin-bottom: 20px;
        }

        .empty-state p {
          font-size: 16px;
          font-weight: 600;
          color: var(--text, rgba(255,255,255,0.85));
          margin: 0 0 6px;
        }

        .empty-state span {
          font-size: 13px;
          color: var(--text-muted, rgba(255,255,255,0.4));
        }

        /* Light Theme */
        .mobile-file-explorer.light .tree-file:active,
        .mobile-file-explorer.light .tree-folder-header:active {
          background: rgba(0,0,0,0.05);
        }
        .mobile-file-explorer.light .tree-file.selected {
          background: linear-gradient(90deg, rgba(139,92,246,0.12), transparent);
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
  isLightTheme,
}: {
  file: VirtualFile | null;
  onChange: (content: string) => void;
  isStreaming: boolean;
  streamingCode: string;
  streamingFile: string | null;
  isLightTheme?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const displayPath = streamingFile || file?.path || '';
  // Strip any leftover streaming markers from content
  const rawContent = streamingFile && isStreaming ? streamingCode : file?.content || '';
  const displayContent = rawContent
    .replace(/<<<\s*END_FILE\s*>>>/gi, '')
    .replace(/<<<FILE:[^>]+>>>/gi, '')
    .replace(/<<<PROJECT_START>>>/gi, '')
    .replace(/<<<PROJECT_END>>>/gi, '')
    .trim();
  const displayName = displayPath.split('/').pop() || 'Select a file';

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [isStreaming, displayContent]);

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
      <div className={`mobile-code-empty ${isLightTheme ? 'light' : ''}`}>
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
            background: var(--bg, #09090b);
          }
          .empty-visual { margin-bottom: 24px; }
          h3 { font-size: 20px; font-weight: 650; color: var(--text, rgba(255,255,255,0.9)); margin: 0 0 8px; }
          p { font-size: 14px; color: var(--text-muted, rgba(255,255,255,0.45)); margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`mobile-code-editor ${isLightTheme ? 'light' : ''}`}>
      <MobileHeader
        title={displayName}
        subtitle={isStreaming ? 'Generating...' : file ? `${displayContent.split('\n').length} lines` : undefined}
        isLightTheme={isLightTheme}
        rightAction={!isStreaming && file && (
          <button className={`edit-toggle ${isEditing ? 'active' : ''}`} onClick={() => setIsEditing(!isEditing)}>
            {Icons.edit}
          </button>
        )}
      />
      <div className="code-container" ref={codeContainerRef}>
        {isStreaming ? (
          <div className="code-wrapper">
            <div className="line-numbers">
              {displayContent.split('\n').map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <pre className="code-display streaming"><code>{displayContent}</code><span className="cursor" /></pre>
          </div>
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
          <div className="code-wrapper">
            <div className="line-numbers">
              {displayContent.split('\n').map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <pre className="code-display"><code>{displayContent}</code></pre>
          </div>
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
        .mobile-code-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg, #0d0d12);
        }
        .mobile-code-editor.light {
          background: var(--bg, #f5f5f7);
        }
        .edit-toggle {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          color: var(--text-secondary, rgba(255,255,255,0.6));
          cursor: pointer;
          transition: all 0.2s;
        }
        .edit-toggle.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
        .code-container {
          flex: 1;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 100px;
          background: var(--bg, #0d0d12);
        }
        .mobile-code-editor.light .code-container {
          background: var(--bg, #f5f5f7);
        }
        .code-wrapper {
          display: flex;
          min-height: 100%;
        }
        .line-numbers {
          display: flex;
          flex-direction: column;
          padding: 20px 0;
          min-width: 44px;
          text-align: right;
          background: var(--surface, rgba(0,0,0,0.3));
          border-right: 1px solid var(--border, rgba(255,255,255,0.06));
          user-select: none;
        }
        .mobile-code-editor.light .line-numbers {
          background: rgba(0,0,0,0.03);
        }
        .line-numbers span {
          padding: 0 12px;
          font-family: 'SF Mono', 'Fira Code', Monaco, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-muted, rgba(255,255,255,0.25));
        }
        .code-display, .code-textarea {
          flex: 1;
          margin: 0;
          padding: 20px;
          background: transparent;
          font-family: 'SF Mono', 'Fira Code', Monaco, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: var(--text, #e5e7eb);
          white-space: pre;
          overflow-x: auto;
        }
        .mobile-code-editor.light .code-display,
        .mobile-code-editor.light .code-textarea {
          color: #1a1a1a;
        }
        .code-textarea {
          border: none;
          outline: none;
          resize: none;
          min-height: 100%;
          width: 100%;
        }
        .code-display code {
          font-family: inherit;
          display: block;
        }
        .code-display.streaming {
          position: relative;
        }
        .cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: linear-gradient(180deg, #8b5cf6, #6366f1);
          animation: blink 1s infinite;
          vertical-align: text-bottom;
          border-radius: 1px;
          box-shadow: 0 0 8px rgba(139,92,246,0.6);
        }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .code-toolbar {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: var(--surface, rgba(0,0,0,0.6));
          border-top: 1px solid var(--border, rgba(255,255,255,0.06));
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          position: sticky;
          bottom: 84px;
          backdrop-filter: blur(12px);
        }
        .code-key {
          flex-shrink: 0;
          min-width: 44px;
          height: 40px;
          padding: 0 14px;
          background: var(--surface, rgba(255,255,255,0.06));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 10px;
          color: var(--text, rgba(255,255,255,0.9));
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .code-key:active { background: var(--surface-hover, rgba(255,255,255,0.12)); transform: scale(0.94); }
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
  isLightTheme,
  deployedUrl,
}: {
  preview: PreviewResult | null;
  isBuilding: boolean;
  onRefresh: () => void;
  isLightTheme?: boolean;
  deployedUrl?: string | null;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set iframe content - also triggers when switching fullscreen modes
  useEffect(() => {
    if (preview?.html && iframeRef.current) {
      setIsLoaded(false);
      iframeRef.current.srcdoc = preview.html;
    }
  }, [preview?.html, isFullscreen]);

  const handleLoad = useCallback(() => setIsLoaded(true), []);

  // Toggle fullscreen with haptic
  const toggleFullscreen = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(15);
    setIsFullscreen(prev => !prev);
  }, []);

  // Check for errors
  const hasErrors = !isBuilding && preview?.errors && preview.errors.length > 0;
  const firstError = hasErrors && preview?.errors ? preview.errors[0] : null;
  const hasPreviewContent = !!preview?.html && preview.html.length > 100;

  // Current time for status bar
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`mobile-preview ${isLightTheme ? 'light' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Header - Hidden in fullscreen */}
      {!isFullscreen && (
        <MobileHeader
          title="Preview"
          isBuilding={isBuilding}
          isLightTheme={isLightTheme}
          rightAction={
            <div className="preview-actions">
              {deployedUrl && (
                <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="live-badge">
                  <span className="live-dot" />
                  <span>LIVE</span>
                  {Icons.externalLink}
                </a>
              )}
              <button className="expand-btn" onClick={toggleFullscreen} title="Fullscreen">
                {Icons.expand}
              </button>
              <button className="refresh-btn" onClick={onRefresh}>{Icons.refresh}</button>
            </div>
          }
        />
      )}

      {/* Fullscreen iPhone Preview - True Fullscreen */}
      {isFullscreen && (
        <div className="fullscreen-overlay">
          {/* Floating Minimize Button */}
          <button className="minimize-fab" onClick={toggleFullscreen}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* State of the Art iPhone Frame - Full Height */}
          <div className="iphone-device">
            {/* Side Buttons */}
            <div className="iphone-button power" />
            <div className="iphone-button volume-up" />
            <div className="iphone-button volume-down" />
            <div className="iphone-button silent" />

            {/* Screen */}
            <div className="iphone-screen">
              {/* Dynamic Island */}
              <div className="dynamic-island">
                <div className="island-camera" />
                <div className="island-speaker" />
              </div>

              {/* Status Bar */}
              <div className="status-bar">
                <div className="status-left">
                  <span className="status-time">{currentTime}</span>
                </div>
                <div className="status-right">
                  <svg className="status-signal" viewBox="0 0 18 12" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="0.5" />
                    <rect x="4" y="6" width="3" height="6" rx="0.5" />
                    <rect x="8" y="3" width="3" height="9" rx="0.5" />
                    <rect x="12" y="0" width="3" height="12" rx="0.5" />
                  </svg>
                  <svg className="status-wifi" viewBox="0 0 16 12" fill="currentColor">
                    <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-4.3-2.1a6 6 0 018.6 0l-.9.9a4.8 4.8 0 00-6.8 0l-.9-.9zm-2.1-2.1a9 9 0 0112.8 0l-.9.9a7.8 7.8 0 00-11 0l-.9-.9z" />
                  </svg>
                  <div className="status-battery">
                    <div className="battery-body">
                      <div className="battery-level" />
                    </div>
                    <div className="battery-cap" />
                  </div>
                </div>
              </div>

              {/* App Content */}
              <div className="iphone-content">
                {hasPreviewContent ? (
                  <iframe
                    ref={iframeRef}
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={handleLoad}
                  />
                ) : (
                  <div className="no-content">
                    <span>No preview available</span>
                  </div>
                )}
              </div>

              {/* Home Indicator */}
              <div className="home-indicator" />
            </div>
          </div>
        </div>
      )}

      <div className="preview-container">
        {/* Building State */}
        {isBuilding && (
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
        )}

        {/* Error State */}
        {!isBuilding && hasErrors && (
          <div className="error-state">
            <div className="error-glow" />
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Build Error</h3>
            <p className="error-message">{firstError?.message || 'Unknown error'}</p>
            <button className="retry-btn" onClick={onRefresh}>
              {Icons.refresh}
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isBuilding && !hasErrors && !hasPreviewContent && (
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

        {/* Loading State (between build complete and iframe load) */}
        {!isBuilding && hasPreviewContent && !isLoaded && !hasErrors && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span>Rendering...</span>
          </div>
        )}

        {/* Actual Preview - Mobile Optimized (hidden in fullscreen) */}
        {!isBuilding && hasPreviewContent && !hasErrors && !isFullscreen && (
          <div className={`iframe-wrapper ${isLoaded ? 'loaded' : ''}`}>
            <div className="device-notch" />
            <iframe
              ref={iframeRef}
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
              onLoad={handleLoad}
            />
            <div className="device-home" />
          </div>
        )}
      </div>
      <style jsx>{`
        .mobile-preview { display: flex; flex-direction: column; height: 100%; background: var(--bg, #09090b); }
        .preview-actions { display: flex; align-items: center; gap: 10px; }
        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 16px;
          font-size: 10px;
          font-weight: 650;
          color: #22c55e;
          text-decoration: none;
          letter-spacing: 0.02em;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: livePulse 2s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .expand-btn {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          color: var(--text-secondary, rgba(255,255,255,0.6));
          cursor: pointer;
          transition: all 0.2s;
        }
        .expand-btn:active {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          color: #8b5cf6;
          transform: scale(0.94);
        }
        .refresh-btn {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none;
          color: var(--text-secondary, rgba(255,255,255,0.6)); cursor: pointer;
          border-radius: 12px; transition: all 0.3s;
        }
        .refresh-btn:active { background: var(--surface-hover, rgba(255,255,255,0.08)); transform: rotate(180deg); }
        .pull-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.1), transparent);
          overflow: hidden;
        }
        .pull-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          transition: all 0.2s;
        }
        .pull-spinner.ready {
          color: #8b5cf6;
          transform: rotate(180deg);
        }
        .preview-container {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 20px; padding-bottom: 100px; overflow: hidden;
        }
        .iframe-wrapper {
          background: #1a1a1c;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          padding: 12px 8px;
          width: 100%;
          max-width: 380px;
          height: auto;
          aspect-ratio: 9/16;
        }
        .device-notch {
          width: 100px; height: 28px;
          background: #0a0a0c;
          border-radius: 0 0 20px 20px;
          margin: 0 auto 8px;
          position: relative;
        }
        .device-notch::after {
          content: '';
          position: absolute;
          top: 8px; left: 50%;
          transform: translateX(-50%);
          width: 60px; height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
        }
        .device-home {
          width: 120px; height: 5px;
          background: rgba(255,255,255,0.25);
          border-radius: 3px;
          margin: 12px auto 4px;
        }
        .iframe-wrapper iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: white;
          border-radius: 24px;
        }
        .building-state, .empty-state, .error-state, .loading-state {
          position: absolute;
          inset: 0;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center; padding: 48px;
          background: var(--bg, #09090b);
          z-index: 10;
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

        /* Error State */
        .error-state {
          background: linear-gradient(180deg, #0f0a0a 0%, #0d0909 100%);
        }
        .error-glow {
          position: absolute;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%);
          filter: blur(40px);
        }
        .error-icon {
          position: relative;
          margin-bottom: 20px;
          animation: errorPulse 2s ease-in-out infinite;
        }
        @keyframes errorPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .error-state h3 {
          font-size: 20px; font-weight: 650;
          color: #ef4444;
          margin: 0 0 8px;
        }
        .error-message {
          font-family: 'SF Mono', 'Fira Code', Monaco, monospace;
          font-size: 13px;
          color: rgba(239,68,68,0.7);
          margin: 0 0 24px;
          max-width: 280px;
          line-height: 1.5;
        }
        .retry-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 24px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 12px;
          color: #ef4444;
          font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .retry-btn:active {
          background: rgba(239,68,68,0.25);
          transform: scale(0.96);
        }

        /* Loading State */
        .loading-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(139,92,246,0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-state span {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.5px;
        }

        /* Iframe loaded state */
        .iframe-wrapper {
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .iframe-wrapper.loaded {
          opacity: 1;
          transform: scale(1);
        }
        .preview-container { position: relative; }

        /* ═══════════════════════════════════════════════════════════════════════
           FULLSCREEN iPHONE PREVIEW - State of the Art True Fullscreen
           ═══════════════════════════════════════════════════════════════════════ */
        .fullscreen-mode {
          position: fixed;
          inset: 0;
          z-index: 9999;
        }
        .fullscreen-mode .preview-container {
          display: none;
        }

        .fullscreen-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.25s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Floating Minimize FAB */
        .minimize-fab {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 50%;
          color: rgba(255,255,255,0.9);
          cursor: pointer;
          z-index: 10001;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }

        .minimize-fab:active {
          transform: scale(0.88);
          background: rgba(255,255,255,0.2);
        }

        /* iPhone Device Frame - Maximized */
        .iphone-device {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          padding: 12px;
          animation: deviceFloat 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes deviceFloat {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Side Buttons */
        .iphone-button {
          position: absolute;
          background: linear-gradient(90deg, #2a2a30, #1a1a1e);
          border-radius: 2px;
          z-index: 1;
        }

        .iphone-button.power {
          right: -3px;
          top: 120px;
          width: 3px;
          height: 60px;
        }

        .iphone-button.silent {
          left: -3px;
          top: 100px;
          width: 3px;
          height: 28px;
        }

        .iphone-button.volume-up {
          left: -3px;
          top: 145px;
          width: 3px;
          height: 45px;
        }

        .iphone-button.volume-down {
          left: -3px;
          top: 200px;
          width: 3px;
          height: 45px;
        }

        /* iPhone Screen Container - Maximized for fullscreen */
        .iphone-screen {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: min(100vw - 24px, 430px);
          max-height: min(100vh - 24px, 932px);
          aspect-ratio: 9/19.5;
          background: #000;
          border-radius: 48px;
          padding: 0;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 0 0 4px #1a1a1e,
            0 0 0 5px rgba(255,255,255,0.04),
            inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        /* Dynamic Island */
        .dynamic-island {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 34px;
          background: #000;
          border-radius: 20px;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.1);
        }

        .island-camera {
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 30% 30%, #1a1a2e, #0a0a12);
          border-radius: 50%;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,100,120,0.3);
        }

        .island-speaker {
          width: 40px;
          height: 5px;
          background: linear-gradient(180deg, #1a1a1e, #0a0a0e);
          border-radius: 3px;
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.5);
        }

        /* Status Bar */
        .status-bar {
          position: absolute;
          top: 14px;
          left: 24px;
          right: 24px;
          height: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 50;
          color: #fff;
        }

        .status-left {
          width: 54px;
        }

        .status-time {
          font-size: 15px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          letter-spacing: 0.02em;
        }

        .status-right {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-signal {
          width: 18px;
          height: 12px;
        }

        .status-wifi {
          width: 16px;
          height: 12px;
        }

        .status-battery {
          display: flex;
          align-items: center;
          gap: 1px;
        }

        .battery-body {
          width: 24px;
          height: 12px;
          border: 1.5px solid rgba(255,255,255,0.9);
          border-radius: 3px;
          padding: 1.5px;
        }

        .battery-level {
          width: 100%;
          height: 100%;
          background: #32d74b;
          border-radius: 1px;
        }

        .battery-cap {
          width: 2px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          border-radius: 0 1px 1px 0;
        }

        /* App Content Area */
        .iphone-content {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          border-radius: 48px;
        }

        .iphone-content iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }

        .iphone-content .no-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%);
          color: rgba(255,255,255,0.35);
          font-size: 14px;
          font-weight: 500;
        }

        /* Home Indicator */
        .home-indicator {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 134px;
          height: 5px;
          background: rgba(255,255,255,0.35);
          border-radius: 100px;
          z-index: 100;
        }
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
  isLightTheme,
  // Action handlers
  onSave,
  isSaving,
  onOpenProjects,
  onDeploy,
  isDeploying,
  deployedUrl,
  onExport,
  hasFiles,
  // Theme
  themes,
  currentTheme,
  onThemeChange,
  // Modification Mode
  modificationPlan,
  forensicReport,
  isAnalyzingModification,
  isApplyingModification,
  modificationSteps,
  onApplyModification,
  onCancelModification,
  projectName,
  // File Upload
  uploadedFiles,
  isUploading,
  onAddFiles,
  onRemoveFile,
}: {
  messages: MobileBuilderLayoutProps['messages'];
  streamingSteps: MobileBuilderLayoutProps['streamingSteps'];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  isLightTheme?: boolean;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  onOpenProjects?: () => void;
  onDeploy?: () => Promise<void>;
  isDeploying?: boolean;
  deployedUrl?: string | null;
  onExport?: () => void;
  hasFiles?: boolean;
  themes?: Theme[];
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  // Modification Mode
  modificationPlan?: ModificationPlan | null;
  forensicReport?: ForensicReport | null;
  isAnalyzingModification?: boolean;
  isApplyingModification?: boolean;
  modificationSteps?: ProgressStep[];
  onApplyModification?: () => void;
  onCancelModification?: () => void;
  projectName?: string;
  // File Upload
  uploadedFiles?: FileAttachment[];
  isUploading?: boolean;
  onAddFiles?: (files: File[]) => Promise<void>;
  onRemoveFile?: (id: string) => void;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [showActions, setShowActions] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Auto-expand chat textarea as user types
  useEffect(() => {
    const textarea = chatInputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // File upload refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onAddFiles) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  }, [onAddFiles]);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up audio visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 32;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from(dataArray).slice(0, 12).map(v => v / 255);
        setAudioLevels(levels);
        animationRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        audioContext.close();
        stream.getTracks().forEach(t => t.stop());

        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          if (res.ok) {
            const { text } = await res.json();
            if (text?.trim()) {
              setInput(prev => prev + (prev ? ' ' : '') + text.trim());
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(20);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevels(new Array(12).fill(0));
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
    }
  }, [isRecording]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingSteps]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSendMessage(text);
  }, [input, isStreaming, onSendMessage]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      setIsRecording(false);
      setAudioLevels(new Array(20).fill(0));
    }
  }, [isRecording]);

  // Transcribing state
  const [isTranscribing, setIsTranscribing] = useState(false);

  return (
    <div className={`mobile-chat ${isLightTheme ? 'light' : ''}`}>
      <MobileHeader
        title="Alfred AI"
        subtitle={isStreaming ? 'Generating...' : 'Online'}
        isStreaming={isStreaming}
        isLightTheme={isLightTheme}
        rightAction={
          <button className="actions-btn" onClick={() => setShowActions(!showActions)}>
            {Icons.more}
          </button>
        }
      />

      {/* Action Sheet */}
      {showActions && (
        <div className="action-sheet-overlay" onClick={() => setShowActions(false)}>
          <div className="action-sheet" onClick={e => e.stopPropagation()}>
            <div className="action-sheet-handle" />
            <div className="action-sheet-header">
              <h3>Actions</h3>
              {deployedUrl && (
                <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="live-badge-small">
                  <span className="live-dot" />
                  LIVE
                </a>
              )}
            </div>
            <div className="action-grid">
              {onSave && (
                <button className="action-item" onClick={() => { onSave(); setShowActions(false); }} disabled={isSaving || !hasFiles}>
                  {isSaving ? <div className="mini-spinner" /> : Icons.save}
                  <span>Save</span>
                </button>
              )}
              {onOpenProjects && (
                <button className="action-item" onClick={() => { onOpenProjects(); setShowActions(false); }}>
                  {Icons.projects}
                  <span>Projects</span>
                </button>
              )}
              {onDeploy && (
                <button className="action-item primary" onClick={() => { onDeploy(); setShowActions(false); }} disabled={isDeploying || !hasFiles}>
                  {isDeploying ? <div className="mini-spinner" /> : Icons.deploy}
                  <span>Deploy</span>
                </button>
              )}
              {onExport && hasFiles && (
                <button className="action-item" onClick={() => { onExport(); setShowActions(false); }}>
                  {Icons.export}
                  <span>Export</span>
                </button>
              )}
            </div>
            {/* Theme Picker Section */}
            {themes && themes.length > 0 && (
              <>
                <div className="action-divider" />
                <div className="theme-section">
                  <span className="theme-label">Theme</span>
                  <div className="theme-grid">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        className={`theme-dot-btn ${currentTheme?.id === t.id ? 'active' : ''}`}
                        onClick={() => { onThemeChange?.(t); }}
                        style={{ background: t.bg }}
                        title={t.label}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="messages-container" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="welcome-state">
            <div className="welcome-icon">
              <div className="icon-glow" />
              {Icons.alfred}
            </div>
            <h3>{hasFiles ? 'What would you like to modify?' : 'What would you like to build?'}</h3>
            <p>{hasFiles ? 'Choose a quick action or describe your changes' : 'Tap a template or describe your vision'}</p>

            {/* Template/Modification Grid */}
            <div className="suggestion-grid">
              {hasFiles ? (
                <>
                  <button className="suggestion-card" onClick={() => onSendMessage('Change the color scheme to use darker tones with purple accents')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>{Icons.modColors}</div>
                    <span>Colors</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Update typography with Inter font and better spacing')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>{Icons.modFonts}</div>
                    <span>Fonts</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Add a navigation bar with smooth hover effects')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>{Icons.modNav}</div>
                    <span>Nav</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Style buttons with gradients and hover animations')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>{Icons.modButtons}</div>
                    <span>Buttons</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Improve the layout spacing and visual balance')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>{Icons.modLayout}</div>
                    <span>Layout</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Add smooth fade-in and transition animations')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>{Icons.modAnimate}</div>
                    <span>Animate</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Add a hero image to enhance the design')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' }}>{Icons.modImages}</div>
                    <span>Images</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Add dark mode toggle functionality')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>{Icons.modDark}</div>
                    <span>Dark</span>
                  </button>
                </>
              ) : (
                <>
                  <button className="suggestion-card" onClick={() => onSendMessage('Build an analytics dashboard with charts, KPI cards, and dark theme')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>{Icons.templateDashboard}</div>
                    <span>Dashboard</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Create a modern e-commerce storefront with product grid and cart')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>{Icons.templateEcommerce}</div>
                    <span>E-commerce</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Design a premium SaaS landing page with hero, pricing, and testimonials')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>{Icons.templateSaas}</div>
                    <span>SaaS Page</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Build a ChatGPT-style chat interface with message bubbles and dark theme')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>{Icons.templateAI}</div>
                    <span>AI Chat</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Create a stunning developer portfolio with project showcase')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' }}>{Icons.templatePortfolio}</div>
                    <span>Portfolio</span>
                  </button>
                  <button className="suggestion-card" onClick={() => onSendMessage('Build a real-time monitoring dashboard with live metrics and charts')}>
                    <div className="suggestion-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>{Icons.templateLiveData}</div>
                    <span>Live Data</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'Y' : Icons.alfred}
                </div>
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-sender">{msg.role === 'user' ? 'You' : 'Alfred'}</span>
                    <span className="message-time">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {/* Show file attachments */}
                  {msg.files && msg.files.length > 0 && (
                    <MessageAttachments
                      attachments={msg.files.map(file => ({
                        id: file.id,
                        type: file.category as 'image' | 'video' | 'document' | 'code',
                        name: file.name,
                        size: file.size,
                        url: file.url,
                        preview: file.preview,
                        duration: file.duration,
                      }))}
                      isUser={msg.role === 'user'}
                    />
                  )}
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
            ))}

            {/* Streaming Progress - Shows when streaming but no streaming message visible */}
            {isStreaming && streamingSteps.length > 0 && !messages.some(m => m.isStreaming) && (
              <div className="message alfred streaming-progress">
                <div className="message-avatar">
                  {Icons.alfred}
                </div>
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-sender">Alfred</span>
                    <span className="message-time">now</span>
                  </div>
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
                </div>
              </div>
            )}

            {/* Thinking Indicator - Shows when streaming but no steps yet */}
            {isStreaming && streamingSteps.length === 0 && !messages.some(m => m.isStreaming) && (
              <div className="message alfred thinking-indicator">
                <div className="message-avatar">
                  {Icons.alfred}
                </div>
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-sender">Alfred</span>
                    <span className="message-time">now</span>
                  </div>
                  <div className="thinking-content">
                    <div className="thinking-orb">
                      <div className="orb-core" />
                      <div className="orb-ring r1" />
                      <div className="orb-ring r2" />
                    </div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alfred Code - Forensic Investigation (State of the Art) */}
            {forensicReport && onApplyModification && onCancelModification && (
              <div className="modification-ui-container">
                <ForensicInvestigation
                  report={forensicReport}
                  onApply={onApplyModification}
                  onCancel={onCancelModification}
                  isApplying={isApplyingModification}
                />
              </div>
            )}

            {/* Fallback to simple preview if no forensic report but has plan */}
            {modificationPlan && !forensicReport && onApplyModification && onCancelModification && (
              <div className="modification-ui-container">
                <ModificationPreview
                  plan={modificationPlan}
                  onApply={onApplyModification}
                  onCancel={onCancelModification}
                  isApplying={isApplyingModification}
                />
              </div>
            )}

            {/* Modification Progress - Shows analyzing progress */}
            {isAnalyzingModification && modificationSteps && modificationSteps.length > 0 && (
              <div className="modification-ui-container">
                <ModificationProgress
                  steps={modificationSteps}
                  isActive={isAnalyzingModification}
                  projectName={projectName}
                />
              </div>
            )}
          </>
        )}
      </div>
      {/* Input Area - Desktop Identical */}
      <div className="chat-input-area">
        {/* Recording UI with Orb Visualizer */}
        {isRecording ? (
          <div className="recording-ui">
            <button className="recording-cancel" onClick={cancelRecording}>{Icons.stop}</button>
            <div className="recording-visualizer">
              <div className="orb" style={{ transform: `scale(${1 + (audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length) * 0.6})` }} />
              <div className="orb-ring r1" style={{ transform: `scale(${1.3 + (audioLevels[5] || 0) * 0.5})`, opacity: 0.15 + (audioLevels[5] || 0) * 0.25 }} />
              <div className="orb-ring r2" style={{ transform: `scale(${1.6 + (audioLevels[15] || 0) * 0.6})`, opacity: 0.08 + (audioLevels[15] || 0) * 0.15 }} />
            </div>
            <button className="recording-done" onClick={stopRecording}>{Icons.check}</button>
          </div>
        ) : isTranscribing ? (
          <div className="transcribing">
            <span>Processing</span>
            <div className="dots"><span /><span /><span /></div>
          </div>
        ) : (
          <>
            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.html,.css,.json,.js,.ts,.tsx,.jsx"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {/* File Preview Bar */}
            {uploadedFiles && uploadedFiles.length > 0 && (
              <div className="attachments-preview">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className={`attachment-chip ${file.category}`}>
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} className="attachment-thumb" />
                    ) : (
                      <span className="attachment-icon">
                        {file.category === 'document' && Icons.paperclip}
                        {file.category === 'code' && Icons.code}
                        {file.category === 'video' && Icons.video}
                      </span>
                    )}
                    <span className="attachment-name">{file.name}</span>
                    {file.status === 'uploading' && (
                      <div className="attachment-progress-bar">
                        <div className="attachment-progress-fill" style={{ width: `${file.progress || 0}%` }} />
                      </div>
                    )}
                    {file.status === 'ready' && <span className="attachment-ready">{Icons.check}</span>}
                    {file.status === 'error' && <span className="attachment-error">!</span>}
                    <button
                      className="attachment-remove"
                      onClick={() => onRemoveFile?.(file.id)}
                      aria-label="Remove file"
                    >
                      {Icons.x}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="input-row">
              {/* Upload Buttons - Desktop Identical */}
              <div className="upload-buttons">
                <button
                  className="btn-upload"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isStreaming || isUploading}
                  title="Add image"
                >
                  {Icons.image}
                </button>
                <button
                  className="btn-upload"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isStreaming || isUploading}
                  title="Add video"
                >
                  {Icons.video}
                </button>
                <button
                  className="btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming || isUploading}
                  title="Add file"
                >
                  {Icons.paperclip}
                </button>
              </div>
              <textarea
                ref={chatInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe what you want to build..."
                disabled={isStreaming}
                rows={1}
              />
              {input.trim() ? (
                <button className="btn-send" onClick={handleSend} disabled={isStreaming}>
                  {Icons.send}
                </button>
              ) : (
                <button className="btn-mic" onClick={startRecording} disabled={isStreaming}>
                  {Icons.mic}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .mobile-chat { display: flex; flex-direction: column; height: 100%; background: var(--bg, #09090b); }
        .messages-container { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px; padding-bottom: 200px; }

        /* Actions Button */
        .actions-btn {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          color: var(--text-secondary, rgba(255,255,255,0.6));
          cursor: pointer;
          transition: all 0.2s;
        }
        .actions-btn:active { background: var(--surface-hover, rgba(255,255,255,0.1)); transform: scale(0.95); }

        /* Action Sheet */
        .action-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .action-sheet {
          width: 100%;
          background: var(--bg, #18181b);
          border-radius: 24px 24px 0 0;
          padding: 12px 20px 32px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-chat.light .action-sheet {
          background: #ffffff;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .action-sheet-handle {
          width: 36px; height: 4px;
          background: var(--border, rgba(255,255,255,0.2));
          border-radius: 2px;
          margin: 0 auto 16px;
        }
        .action-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .action-sheet-header h3 {
          font-size: 18px;
          font-weight: 650;
          color: var(--text, rgba(255,255,255,0.95));
          margin: 0;
        }
        .live-badge-small {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          font-size: 9px;
          font-weight: 650;
          color: #22c55e;
          text-decoration: none;
        }
        .live-badge-small .live-dot {
          width: 5px; height: 5px;
          background: #22c55e;
          border-radius: 50%;
          animation: livePulse 2s infinite;
        }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 8px;
          background: var(--surface, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 16px;
          color: var(--text, rgba(255,255,255,0.9));
          font-size: 11px;
          font-weight: 550;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-item:disabled { opacity: 0.4; cursor: not-allowed; }
        .action-item:active:not(:disabled) { background: var(--surface-hover, rgba(255,255,255,0.1)); transform: scale(0.96); }
        .action-item.primary {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.15));
          border-color: rgba(139, 92, 246, 0.3);
          color: #a78bfa;
        }
        .mini-spinner {
          width: 18px; height: 18px;
          border: 2px solid var(--border, rgba(255,255,255,0.2));
          border-top-color: var(--text, white);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .action-divider {
          height: 1px;
          background: var(--border, rgba(255,255,255,0.08));
          margin: 20px 0;
        }
        .theme-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .theme-label {
          font-size: 14px;
          font-weight: 550;
          color: var(--text-secondary, rgba(255,255,255,0.6));
        }
        .theme-grid {
          display: flex;
          gap: 10px;
        }
        .theme-dot-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .theme-dot-btn.active {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
        }
        .theme-dot-btn:active { transform: scale(0.9); }
        .welcome-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: flex-start; min-height: 100%; text-align: center;
          padding: 32px 20px; padding-bottom: 200px;
          animation: welcomeFadeIn 0.4s ease-out;
        }
        @keyframes welcomeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .welcome-icon {
          position: relative; width: 72px; height: 72px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08));
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 20px; color: #8b5cf6; margin-bottom: 20px;
          animation: iconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        @keyframes iconPop {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .icon-glow {
          position: absolute; inset: -16px;
          background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%);
          filter: blur(16px);
        }
        .welcome-state h3 {
          font-size: 20px; font-weight: 650; color: var(--text, rgba(255,255,255,0.95));
          margin: 0 0 6px; letter-spacing: -0.02em;
          animation: textFadeIn 0.4s ease-out 0.15s both;
        }
        .welcome-state p {
          font-size: 14px; color: var(--text-muted, rgba(255,255,255,0.45));
          margin: 0 0 24px;
          animation: textFadeIn 0.4s ease-out 0.2s both;
        }
        @keyframes textFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Suggestion Grid - Beautiful Template Cards with Staggered Animation */
        .suggestion-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          width: 100%;
          max-width: 340px;
        }
        .suggestion-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 8px 14px;
          background: var(--surface, rgba(255,255,255,0.03));
          border: 1px solid var(--border, rgba(255,255,255,0.06));
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          animation: cardFadeIn 0.35s ease-out both;
        }
        .suggestion-card:nth-child(1) { animation-delay: 0.15s; }
        .suggestion-card:nth-child(2) { animation-delay: 0.2s; }
        .suggestion-card:nth-child(3) { animation-delay: 0.25s; }
        .suggestion-card:nth-child(4) { animation-delay: 0.3s; }
        .suggestion-card:nth-child(5) { animation-delay: 0.35s; }
        .suggestion-card:nth-child(6) { animation-delay: 0.4s; }
        .suggestion-card:nth-child(7) { animation-delay: 0.45s; }
        .suggestion-card:nth-child(8) { animation-delay: 0.5s; }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        .suggestion-card:active {
          transform: scale(0.96);
          background: var(--surface-hover, rgba(255,255,255,0.06));
        }
        .suggestion-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }
        .suggestion-card span {
          font-size: 11px;
          font-weight: 550;
          color: var(--text-secondary, rgba(255,255,255,0.7));
        }
        .message { display: flex; gap: 12px; margin-bottom: 20px; animation: msgFadeIn 0.3s ease; }
        @keyframes msgFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .message-avatar {
          width: 36px; height: 36px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 12px; font-size: 13px; font-weight: 650;
        }
        .message.user .message-avatar { background: var(--surface-hover, rgba(255,255,255,0.1)); color: var(--text-secondary, rgba(255,255,255,0.8)); }
        .message.alfred .message-avatar { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .message-body { flex: 1; min-width: 0; }
        .message-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
        .message-sender { font-size: 14px; font-weight: 600; color: var(--text, rgba(255,255,255,0.95)); }
        .message-time { font-size: 11px; color: var(--text-muted, rgba(255,255,255,0.35)); }
        .message-content { font-size: 15px; line-height: 1.6; color: var(--text-secondary, rgba(255,255,255,0.85)); }
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
        .step-name { font-size: 12px; color: var(--text-secondary, rgba(255,255,255,0.75)); font-family: 'SF Mono', Monaco, monospace; }
        .typing-dots { display: flex; gap: 5px; padding: 10px 0; }
        .typing-dots span {
          width: 8px; height: 8px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%; animation: bounce 1.4s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

        /* Thinking Indicator - Professional Loading State */
        .thinking-content {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.05));
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 12px;
        }
        .thinking-orb {
          position: relative;
          width: 36px;
          height: 36px;
        }
        .thinking-orb .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(139,92,246,0.5);
        }
        .thinking-orb .orb-ring {
          position: absolute;
          inset: 0;
          border: 1.5px solid #8b5cf6;
          border-radius: 50%;
          animation: thinkPulse 2s ease-in-out infinite;
        }
        .thinking-orb .orb-ring.r1 { animation-delay: 0s; }
        .thinking-orb .orb-ring.r2 { animation-delay: -1s; opacity: 0.5; }
        @keyframes thinkPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.2; }
        }
        .thinking-content span {
          font-size: 14px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
          animation: textPulse 1.5s ease-in-out infinite;
        }
        @keyframes textPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* Streaming Progress Animation */
        .streaming-progress, .thinking-indicator {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Modification UI Container - State of the Art Mobile */
        .modification-ui-container {
          margin: 16px 0;
          animation: fadeInScale 0.3s ease-out;
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .modification-ui-container > div {
          border-radius: 16px;
          overflow: hidden;
        }

        /* Desktop-Identical Chat Input Area */
        .chat-input-area {
          position: fixed; bottom: 84px; left: 0; right: 0;
          padding: 14px 16px;
          background: var(--surface, rgba(9,9,11,0.95));
          border-top: 1px solid var(--border, rgba(255,255,255,0.06));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .mobile-chat.light .chat-input-area { background: rgba(255,255,255,0.95); }

        .input-row {
          display: flex; align-items: flex-end; gap: 8px;
          background: var(--surface-hover, rgba(255,255,255,0.04));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 14px; padding: 10px 12px;
          transition: border-color 0.2s;
        }
        .input-row:focus-within { border-color: rgba(139,92,246,0.4); }
        .input-row textarea {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text, rgba(255,255,255,0.95));
          font-size: 16px; font-family: inherit;
          line-height: 1.5; resize: none;
          min-height: 24px; max-height: 120px;
          overflow-y: auto; word-wrap: break-word; white-space: pre-wrap;
        }
        .input-row textarea::placeholder { color: var(--text-muted, rgba(255,255,255,0.35)); }

        /* Upload Buttons - Desktop Style */
        .upload-buttons { display: flex; gap: 2px; margin-right: 4px; }
        .btn-upload {
          width: 28px; height: 28px;
          border: none; border-radius: 6px;
          background: transparent;
          color: var(--text-muted, rgba(255,255,255,0.4));
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease;
        }
        .btn-upload:active { background: var(--surface-hover, rgba(255,255,255,0.1)); color: var(--text-secondary, rgba(255,255,255,0.6)); }
        .btn-upload:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Attachments Preview */
        .attachments-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 12px;
          background: var(--surface, rgba(255,255,255,0.02));
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
        }
        .attachment-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--surface-elevated, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
        }
        .attachment-chip.image { border-color: rgba(59, 130, 246, 0.3); }
        .attachment-chip.video { border-color: rgba(168, 85, 247, 0.3); }
        .attachment-chip.document { border-color: rgba(245, 158, 11, 0.3); }
        .attachment-chip.code { border-color: rgba(34, 197, 94, 0.3); }
        .attachment-thumb {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          object-fit: cover;
        }
        .attachment-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, rgba(255,255,255,0.5));
        }
        .attachment-name {
          max-width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .attachment-remove {
          width: 18px;
          height: 18px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 50%;
          color: var(--text-muted, rgba(255,255,255,0.4));
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .attachment-remove:hover {
          background: var(--surface-hover, rgba(255,255,255,0.06));
          color: var(--text-secondary, rgba(255,255,255,0.6));
        }
        .attachment-progress-bar { width: 40px; height: 4px; background: rgba(139,92,246,0.2); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
        .attachment-progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa); border-radius: 2px; transition: width 0.3s ease-out; }
        .attachment-ready { width: 16px; height: 16px; border-radius: 50%; background: rgba(34,197,94,0.2); color: #22c55e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .attachment-ready svg { width: 10px; height: 10px; }
        .attachment-error { width: 16px; height: 16px; border-radius: 50%; background: rgba(239,68,68,0.2); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }

        /* Send & Mic Buttons - Desktop Style */
        .btn-mic, .btn-send {
          width: 32px; height: 32px;
          border-radius: 8px; border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .btn-mic { background: transparent; color: var(--icon, rgba(255,255,255,0.6)); }
        .btn-mic:active { color: var(--text, white); }
        .btn-send {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          box-shadow: 0 2px 8px rgba(139,92,246,0.3);
        }
        .btn-send:active:not(:disabled) { transform: scale(0.94); box-shadow: 0 4px 12px rgba(139,92,246,0.4); }
        .btn-send:disabled, .btn-mic:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Recording UI - Desktop Orb Style */
        .recording-ui { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
        .recording-cancel, .recording-done {
          width: 38px; height: 38px;
          border-radius: 50%; border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .recording-cancel { background: var(--surface-hover, rgba(255,255,255,0.1)); color: var(--text-muted, rgba(255,255,255,0.5)); }
        .recording-cancel:active { background: var(--surface, rgba(255,255,255,0.15)); }
        .recording-done { background: #8b5cf6; color: white; }
        .recording-done:active { transform: scale(1.05); }
        .recording-visualizer { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
        .orb { width: 16px; height: 16px; background: #8b5cf6; border-radius: 50%; transition: transform 0.03s linear; }
        .orb-ring { position: absolute; inset: 0; border: 1.5px solid #8b5cf6; border-radius: 50%; transition: all 0.04s linear; pointer-events: none; }
        .orb-ring.r1 { inset: 4px; }
        .orb-ring.r2 { inset: -2px; }
        .transcribing { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px 0; color: var(--text-secondary, rgba(255,255,255,0.6)); font-size: 14px; }
        .dots { display: flex; gap: 3px; }
        .dots span { width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: dot 1.3s infinite; }
        .dots span:nth-child(2) { animation-delay: 0.15s; }
        .dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes dot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; }
        }
        @keyframes voicePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE PROJECTS MODAL — Like Desktop Projects Sidebar
// ═══════════════════════════════════════════════════════════════════════════════

interface Project {
  id: string;
  name: string;
  fileCount: number;
  totalSize: number;
  updatedAt: string;
}

function MobileProjectsModal({
  isOpen,
  onClose,
  onLoadProject,
  currentProjectId,
  loadingProjectId,
  isLightTheme,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (projectId: string) => void;
  currentProjectId?: string | null;
  loadingProjectId?: string | null;
  isLightTheme?: boolean;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch('/api/builder/projects?limit=50')
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleDelete = useCallback(async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(projectId);
    try {
      await fetch(`/api/builder/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className={`projects-modal-overlay ${isLightTheme ? 'light' : ''}`} onClick={onClose}>
      <div className="projects-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h3>Your Projects</h3>
          <button className="close-btn" onClick={onClose}>{Icons.close}</button>
        </div>
        <div className="modal-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              {Icons.projects}
              <span>No saved projects yet</span>
              <p>Create a project and save it to see it here.</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map(project => {
                const isLoadingThis = loadingProjectId === project.id;
                const isPressed = pressedId === project.id;
                return (
                  <button
                    key={project.id}
                    className={`project-item ${currentProjectId === project.id ? 'active' : ''} ${isLoadingThis ? 'loading' : ''} ${isPressed ? 'pressed' : ''}`}
                    onClick={() => { if (!loadingProjectId) { onLoadProject(project.id); onClose(); } }}
                    onTouchStart={() => setPressedId(project.id)}
                    onTouchEnd={() => setPressedId(null)}
                    onMouseDown={() => setPressedId(project.id)}
                    onMouseUp={() => setPressedId(null)}
                    onMouseLeave={() => setPressedId(null)}
                    disabled={!!loadingProjectId}
                  >
                    <div className="project-icon">
                      {isLoadingThis ? <div className="icon-spinner" /> : Icons.layers}
                    </div>
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span className="project-meta">
                        {isLoadingThis
                          ? <span className="loading-text">Loading...</span>
                          : `${project.fileCount} files • ${formatSize(project.totalSize)} • ${formatDate(project.updatedAt)}`
                        }
                      </span>
                    </div>
                    {!isLoadingThis && (
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDelete(project.id, e)}
                        disabled={deletingId === project.id}
                      >
                        {deletingId === project.id ? <div className="mini-spinner" /> : Icons.trash}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .projects-modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          display: flex; align-items: flex-end;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .projects-modal {
          width: 100%;
          max-height: 80vh;
          background: var(--bg, #18181b);
          border-radius: 24px 24px 0 0;
          display: flex; flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .projects-modal-overlay.light .projects-modal {
          background: #ffffff;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .modal-handle {
          width: 36px; height: 4px;
          background: var(--border, rgba(255,255,255,0.2));
          border-radius: 2px;
          margin: 12px auto 0;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
        }
        .modal-header h3 {
          font-size: 18px; font-weight: 650;
          color: var(--text, rgba(255,255,255,0.95));
          margin: 0;
        }
        .close-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface, rgba(255,255,255,0.05));
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 8px;
          color: var(--text-secondary, rgba(255,255,255,0.6));
          cursor: pointer;
        }
        .modal-content {
          flex: 1; overflow-y: auto;
          padding: 16px 20px 32px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
        }
        .loading-state, .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px; text-align: center;
          color: var(--text-muted, rgba(255,255,255,0.4));
        }
        .spinner {
          width: 24px; height: 24px;
          border: 2px solid var(--border, rgba(255,255,255,0.1));
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-state { gap: 8px; }
        .empty-state p { font-size: 13px; margin: 0; color: var(--text-muted, rgba(255,255,255,0.3)); }
        .projects-list { display: flex; flex-direction: column; gap: 8px; }
        .project-item {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: var(--surface, rgba(255,255,255,0.03));
          border: 1px solid var(--border, rgba(255,255,255,0.06));
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.1s ease;
          width: 100%; text-align: left;
          transform: scale(1);
        }
        .project-item:active, .project-item.pressed {
          background: var(--surface-hover, rgba(255,255,255,0.06));
          transform: scale(0.97);
          opacity: 0.9;
        }
        .project-item.loading {
          background: rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.5);
          cursor: wait;
        }
        .project-item.active {
          background: rgba(139,92,246,0.1);
          border-color: rgba(139,92,246,0.3);
        }
        .icon-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(139,92,246,0.3);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .loading-text {
          color: #a78bfa;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .project-icon {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(139,92,246,0.15);
          border-radius: 10px;
          color: #8b5cf6;
          flex-shrink: 0;
        }
        .project-info { flex: 1; min-width: 0; }
        .project-name {
          display: block;
          font-size: 14px; font-weight: 550;
          color: var(--text, rgba(255,255,255,0.9));
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .project-meta {
          display: block;
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          margin-top: 2px;
        }
        .delete-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: none; border-radius: 8px;
          color: var(--text-muted, rgba(255,255,255,0.3));
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .delete-btn:active { background: rgba(239,68,68,0.1); color: #ef4444; }
        .mini-spinner {
          width: 14px; height: 14px;
          border: 2px solid var(--border, rgba(255,255,255,0.1));
          border-top-color: var(--text-secondary, rgba(255,255,255,0.5));
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
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
  // Theme
  themes,
  currentTheme,
  onThemeChange,
  isLightTheme,
  // Actions
  onSave,
  isSaving,
  currentProjectId,
  loadingProjectId,
  onOpenProjects,
  onDeploy,
  isDeploying,
  deployedUrl,
  onExport,
  onLoadProject,
  // Modification Mode
  modificationPlan,
  forensicReport,
  isAnalyzingModification,
  isApplyingModification,
  modificationSteps,
  onApplyModification,
  onCancelModification,
  // File Upload
  uploadedFiles,
  isUploading,
  onAddFiles,
  onRemoveFile,
}: MobileBuilderLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('chat');
  const [showProjectsModal, setShowProjectsModal] = useState(false);

  // Swipe gesture state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Tab order for swipe navigation
  const tabOrder: MobileTab[] = ['files', 'code', 'preview', 'chat'];

  // Computed theme vars for root element
  const themeVars = currentTheme ? {
    '--bg': currentTheme.bg,
    '--text': isLightTheme ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    '--text-secondary': isLightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
    '--text-muted': isLightTheme ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
    '--border': isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
    '--border-light': isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
    '--surface': isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
    '--surface-hover': isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    '--icon': isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
  } as React.CSSProperties : {};

  // Removed auto-switch to preview - let user control navigation

  const navigateToCode = useCallback(() => setActiveTab('code'), []);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and significant
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = tabOrder.indexOf(activeTab);

      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        setActiveTab(tabOrder[currentIndex - 1]);
        if ('vibrate' in navigator) navigator.vibrate(10);
      } else if (deltaX < 0 && currentIndex < tabOrder.length - 1) {
        // Swipe left - go to next tab
        setActiveTab(tabOrder[currentIndex + 1]);
        if ('vibrate' in navigator) navigator.vibrate(10);
      }
    }
  }, [activeTab, tabOrder]);

  return (
    <div
      className={`mobile-builder ${isLightTheme ? 'light' : ''}`}
      style={themeVars}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="tab-content">
        {activeTab === 'files' && (
          <MobileFileExplorer
            tree={fileTree}
            files={files}
            selectedPath={selectedFile?.path || null}
            projectName={projectName}
            onFileSelect={onFileSelect}
            onNavigateToCode={navigateToCode}
            isLightTheme={isLightTheme}
          />
        )}
        {activeTab === 'code' && (
          <MobileCodeEditor
            file={selectedFile}
            onChange={onFileChange}
            isStreaming={isStreaming}
            streamingCode={streamingCode}
            streamingFile={streamingFile}
            isLightTheme={isLightTheme}
          />
        )}
        {activeTab === 'preview' && (
          <MobilePreview
            preview={previewResult}
            isBuilding={isBuilding || isStreaming}
            onRefresh={onRebuild}
            isLightTheme={isLightTheme}
            deployedUrl={deployedUrl}
          />
        )}
        {activeTab === 'chat' && (
          <MobileChat
            messages={messages}
            streamingSteps={streamingSteps}
            isStreaming={isStreaming}
            onSendMessage={onSendMessage}
            isLightTheme={isLightTheme}
            onSave={onSave}
            isSaving={isSaving}
            onOpenProjects={() => setShowProjectsModal(true)}
            onDeploy={onDeploy}
            isDeploying={isDeploying}
            deployedUrl={deployedUrl}
            onExport={onExport}
            hasFiles={files.length > 0}
            themes={themes}
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            // Modification Mode
            modificationPlan={modificationPlan}
            forensicReport={forensicReport}
            isAnalyzingModification={isAnalyzingModification}
            isApplyingModification={isApplyingModification}
            modificationSteps={modificationSteps}
            onApplyModification={onApplyModification}
            onCancelModification={onCancelModification}
            projectName={projectName}
            // File Upload
            uploadedFiles={uploadedFiles}
            isUploading={isUploading}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
          />
        )}
      </div>
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fileCount={files.length}
        hasUnreadChat={false}
        isLightTheme={isLightTheme}
      />

      {/* Projects Modal */}
      <MobileProjectsModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        onLoadProject={onLoadProject || (() => {})}
        currentProjectId={currentProjectId}
        loadingProjectId={loadingProjectId}
        isLightTheme={isLightTheme}
      />

      <style jsx>{`
        .mobile-builder {
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh;
          background: var(--bg, #09090b);
          overflow: hidden;
          transition: background 0.3s ease;
        }
        .tab-content { flex: 1; min-height: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}
