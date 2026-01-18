// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TYPES - lib/types.ts
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// FILE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FileCategory = 'image' | 'video' | 'document' | 'code' | 'audio';

export type FileStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

export interface FileAttachment {
  id: string;
  name: string;
  originalName: string;
  type: string;           // MIME type
  category: FileCategory;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  duration?: number;      // For video/audio
  status: FileStatus;
  error?: string;
  
  // For local use before upload
  file?: File;
  preview?: string;       // Data URL for local preview
  base64?: string;        // For Claude API
  progress?: number;      // Upload progress 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'alfred' | 'system';
  content: string;
  files?: FileAttachment[];
  createdAt: Date;
}

export interface SendMessagePayload {
  message: string;
  conversationId?: string;
  files?: FileAttachment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResponse {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  type: string;
  category: FileCategory;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ChatStreamEvent {
  type: 'content' | 'done' | 'error';
  content?: string;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ClaudeMediaType = 
  | 'image/jpeg' 
  | 'image/png' 
  | 'image/gif' 
  | 'image/webp'
  | 'application/pdf';

export interface ClaudeImageBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: ClaudeMediaType;
    data?: string;  // base64 data
    url?: string;   // for URL source
  };
}

export interface ClaudeDocumentBlock {
  type: 'document';
  source: {
    type: 'base64';
    media_type: 'application/pdf';
    data: string;
  };
}

export interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

export type ClaudeContentBlock = ClaudeTextBlock | ClaudeImageBlock | ClaudeDocumentBlock;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const FILE_CATEGORIES: Record<string, FileCategory> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
  'application/pdf': 'document',
  'text/plain': 'code',
  'text/markdown': 'code',
  'text/csv': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'text/javascript': 'code',
  'application/json': 'code',
  'application/typescript': 'code',
};

export function getFileCategory(mimeType: string): FileCategory {
  return FILE_CATEGORIES[mimeType] || 'document';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Check if file type can be sent to Claude
export function isClaudeSupported(mimeType: string): boolean {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ].includes(mimeType);
}

// Max file sizes
export const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB general
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
export const MAX_FILES = 10;