// ═══════════════════════════════════════════════════════════════════════════════
// USE FILE UPLOAD HOOK - hooks/useFileUpload.ts
// Reusable hook for file upload with progress tracking
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { upload } from '@vercel/blob/client';
import { FileAttachment, getFileCategory, getFileExtension, MAX_FILE_SIZE } from '@/lib/types';

// Files over 4MB use direct Vercel Blob upload (bypasses API body limit)
const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  conversationId?: string | null;
  onUploadComplete?: (file: FileAttachment) => void;
  onUploadError?: (file: FileAttachment, error: string) => void;
}

interface UseFileUploadReturn {
  files: FileAttachment[];
  isUploading: boolean;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getReadyFiles: () => FileAttachment[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const toDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve((reader.result as string).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const getVideoThumbnail = (file: File): Promise<{ preview: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve({ preview: canvas.toDataURL('image/jpeg', 0.7), duration: video.duration });
      } else {
        reject(new Error('Canvas failed'));
      }
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => { 
      URL.revokeObjectURL(video.src); 
      reject(new Error('Video load failed')); 
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxFiles = 10,
    maxSize = MAX_FILE_SIZE,
    conversationId,
    onUploadComplete,
    onUploadError,
  } = options;

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Add Files
  // ─────────────────────────────────────────────────────────────────────────────
  const addFiles = useCallback(async (newFiles: File[]) => {
    const slots = maxFiles - files.length;
    if (slots <= 0) return;

    const batch = newFiles.slice(0, slots);
    setIsUploading(true);

    for (const file of batch) {
      const id = uid();
      const category = getFileCategory(file.type);
      const extension = getFileExtension(file.name);

      // Create initial entry
      const entry: FileAttachment = {
        id,
        name: file.name,
        originalName: file.name,
        type: file.type,
        category,
        size: file.size,
        file,
        status: 'pending',
        progress: 0,
      };

      // Validate size
      if (file.size > maxSize) {
        entry.status = 'error';
        entry.error = `File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
        setFiles(prev => [...prev, entry]);
        onUploadError?.(entry, entry.error);
        continue;
      }

      // Generate preview
      try {
        if (category === 'image') {
          entry.preview = await toDataURL(file);
        } else if (category === 'video') {
          const { preview, duration } = await getVideoThumbnail(file);
          entry.preview = preview;
          entry.duration = duration;
        }
      } catch {
        // Preview failed, continue without
      }

      // Add to state
      setFiles(prev => [...prev, entry]);

      // Start upload
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'uploading', progress: 30 } : f
      ));

      try {
        const IS_LARGE_FILE = file.size > LARGE_FILE_THRESHOLD;
        let uploadResult: { id: string; url: string; base64?: string; width?: number; height?: number } | null = null;

        if (IS_LARGE_FILE) {
          // ═══════════════════════════════════════════════════════════════════════
          // Large files: Direct upload to Vercel Blob (bypasses API body limit)
          // ═══════════════════════════════════════════════════════════════════════
          try {
            // Add timestamp to prevent duplicate filename errors
            const uniqueName = Date.now() + '-' + file.name;
            const blob = await upload(uniqueName, file, {
              access: 'public',
              handleUploadUrl: '/api/files/token',
            });

            console.log('[useFileUpload] Blob success:', blob.url);

            // Update progress
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, progress: 70 } : f
            ));

            // Register file in database
            const registerRes = await fetch('/api/files/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: blob.url,
                name: file.name,
                type: file.type,
                size: file.size,
                conversationId,
              }),
            });

            console.log('[useFileUpload] Register response:', registerRes.status);
            if (registerRes.ok) {
              uploadResult = await registerRes.json();
              console.log('[useFileUpload] Register success:', uploadResult);
            } else {
              console.error('[useFileUpload] Register failed:', await registerRes.text());
            }
          } catch (blobErr) {
            console.error('[useFileUpload] Blob upload failed:', blobErr);
            // Mark as error for large files that fail
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, status: 'error', error: 'Upload failed', progress: 0 } : f
            ));
            onUploadError?.(entry, 'Upload failed');
            continue; // Skip to next file
          }
        } else {
          // ═══════════════════════════════════════════════════════════════════════
          // Small files: Upload through API (faster, includes optimization)
          // ═══════════════════════════════════════════════════════════════════════
          const form = new FormData();
          form.append('file', file);
          if (conversationId) form.append('conversationId', conversationId);

          const res = await fetch('/api/files/upload', { method: 'POST', body: form });

          if (res.ok) {
            uploadResult = await res.json();
          }
        }

        if (uploadResult) {
          setFiles(prev => prev.map(f =>
            f.id === id ? {
              ...f,
              id: uploadResult!.id, // Update with server ID
              url: uploadResult!.url,
              status: 'ready',
              progress: 100,
              width: uploadResult!.width,
              height: uploadResult!.height,
            } : f
          ));

          const updatedFile = files.find(f => f.id === id);
          if (updatedFile) onUploadComplete?.({ ...updatedFile, ...uploadResult, status: 'ready' });

        } else {
          // Fallback to base64 (skip for videos - too large)
          if (category === 'video') {
            // Videos don't need base64, mark as ready without it
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, status: 'ready', progress: 100 } : f
            ));
          } else {
            const base64 = await toBase64(file);
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, base64, status: 'ready', progress: 100 } : f
            ));
          }
        }
      } catch (err) {
        console.error('[useFileUpload] Upload error:', err);
        // Fallback to base64 (skip for videos - too large and not needed for AI)
        if (category === 'video') {
          // Mark video as error since we can't use it without URL
          setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'error', error: 'Video upload failed', progress: 0 } : f
          ));
          onUploadError?.(entry, 'Video upload failed');
        } else {
          try {
            const base64 = await toBase64(file);
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, base64, status: 'ready', progress: 100 } : f
            ));
          } catch {
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, status: 'error', error: 'Upload failed' } : f
            ));
            onUploadError?.(entry, 'Upload failed');
          }
        }
      }
    }

    setIsUploading(false);
  }, [files.length, maxFiles, maxSize, conversationId, onUploadComplete, onUploadError]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Remove File
  // ─────────────────────────────────────────────────────────────────────────────
  const removeFile = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    
    // Delete from server if uploaded
    if (file?.url) {
      fetch(`/api/files/upload?id=${id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    setFiles(prev => prev.filter(f => f.id !== id));
  }, [files]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Clear All Files
  // ─────────────────────────────────────────────────────────────────────────────
  const clearFiles = useCallback(() => {
    // Delete all uploaded files from server
    files.forEach(file => {
      if (file.url) {
        fetch(`/api/files/upload?id=${file.id}`, { method: 'DELETE' }).catch(() => {});
      }
    });
    
    setFiles([]);
  }, [files]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Get Ready Files
  // ─────────────────────────────────────────────────────────────────────────────
  const getReadyFiles = useCallback(() => {
    return files.filter(f => f.status === 'ready');
  }, [files]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    getReadyFiles,
  };
}

export default useFileUpload;