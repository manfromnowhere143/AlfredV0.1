'use client';

/**
 * useBuilder Hook
 *
 * The bridge between React and the PreviewManager.
 * Provides all state and handlers needed for the Builder UI.
 *
 * Features:
 * - Reactive file tree updates
 * - Preview result state
 * - File selection tracking
 * - Console output collection
 * - LLM streaming integration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  VirtualFile,
  VirtualDirectory,
  PreviewResult,
  ConsoleEntry,
  StreamingEvent,
} from '@alfred/core';
import {
  PreviewManager,
  createPreviewManager,
} from '../lib/builder/preview-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface UseBuilderOptions {
  /** Auto-rebuild on file changes */
  autoRefresh?: boolean;

  /** Debounce time for rebuilds (ms) */
  debounceMs?: number;

  /** Initial project name */
  projectName?: string;

  /** Callback for streaming events */
  onStreamEvent?: (event: StreamingEvent) => void;
}

export interface UseBuilderResult {
  // State
  fileTree: VirtualDirectory | null;
  files: VirtualFile[];
  selectedFile: VirtualFile | null;
  previewResult: PreviewResult | null;
  consoleEntries: ConsoleEntry[];
  isBuilding: boolean;
  isInitialized: boolean;
  projectName: string;

  // Actions
  selectFile: (path: string) => void;
  updateFile: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  rebuild: () => Promise<PreviewResult>;
  reset: () => void;
  clearConsole: () => void;

  // LLM Integration
  processChunk: (chunk: string) => void;
  processComplete: (output: string) => void;
  syncFiles: () => void;

  // Manager access for advanced usage
  manager: PreviewManager | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBuilder(options: UseBuilderOptions = {}): UseBuilderResult {
  const {
    autoRefresh = true,
    debounceMs = 100,
    projectName: initialProjectName = 'Untitled',
    onStreamEvent,
  } = options;

  // Manager ref (stable across renders)
  const managerRef = useRef<PreviewManager | null>(null);

  // Store onStreamEvent in a ref to avoid dependency issues
  const onStreamEventRef = useRef(onStreamEvent);
  onStreamEventRef.current = onStreamEvent;

  // State
  const [fileTree, setFileTree] = useState<VirtualDirectory | null>(null);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [projectName, setProjectName] = useState(initialProjectName);

  // Initialize manager
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Create manager with callbacks
        const manager = createPreviewManager({
          autoRefresh,
          debounceMs,
          onPreviewUpdate: (result) => {
            if (mounted) {
              setPreviewResult(result);
              setIsBuilding(false);
            }
          },
          onFileChange: (file) => {
            if (mounted) {
              // Update files and tree
              const fs = manager.getFileSystem();
              const allFiles = fs.getAllFiles();
              console.log('[useBuilder] 📁 File changed:', file.path, '| Total files:', allFiles.length);
              setFiles(allFiles);
              setFileTree(fs.getTree());
            }
          },
          onConsole: (entry) => {
            if (mounted) {
              setConsoleEntries((prev) => [
                ...prev,
                { ...entry, timestamp: Date.now() } as ConsoleEntry,
              ]);
            }
          },
          onStreamEvent: (event) => {
            if (mounted) {
              console.log('[useBuilder] 🔔 Event:', event.type, (event as any).path || (event as any).projectName || '');

              // Update project name from stream
              if (event.type === 'project_start') {
                setProjectName((event as any).projectName);
              }

              // On project_end, force a final state sync
              if (event.type === 'project_end') {
                const fs = manager.getFileSystem();
                const allFiles = fs.getAllFiles();
                console.log('[useBuilder] 🏁 Project complete! Files:', allFiles.length);
                setFiles(allFiles);
                setFileTree(fs.getTree());
              }

              onStreamEventRef.current?.(event);
            }
          },
        });

        managerRef.current = manager;

        // Initialize ESBuild on OUR manager instance (not the singleton!)
        await manager.initialize();

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize builder:', error);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [autoRefresh, debounceMs]); // onStreamEvent accessed via ref to prevent recreation

  // Derive selected file from path
  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    return files.find((f) => f.path === selectedPath) || null;
  }, [selectedPath, files]);

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------

  const selectFile = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const updateFile = useCallback((path: string, content: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    setIsBuilding(true);
    manager.updateFile(path, content);
  }, []);

  const createFile = useCallback((path: string, content: string = '') => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.createFile(path, content);
    setSelectedPath(path);
  }, []);

  const deleteFile = useCallback((path: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.deleteFile(path);
    if (selectedPath === path) {
      setSelectedPath(null);
    }
  }, [selectedPath]);

  const rebuild = useCallback(async (): Promise<PreviewResult> => {
    const manager = managerRef.current;
    if (!manager) {
      return {
        success: false,
        errors: [{
          line: 0,
          column: 0,
          message: 'Builder not initialized',
          severity: 'error' as const,
        }],
      };
    }

    setIsBuilding(true);
    const result = await manager.rebuild();
    setIsBuilding(false);
    return result;
  }, []);

  const reset = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.reset();
    setFileTree(null);
    setFiles([]);
    setSelectedPath(null);
    setPreviewResult(null);
    setConsoleEntries([]);
    setProjectName(initialProjectName);
  }, [initialProjectName]);

  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  // -------------------------------------------------------------------------
  // LLM INTEGRATION
  // -------------------------------------------------------------------------

  const processChunk = useCallback((chunk: string) => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn('[useBuilder] ❌ Manager not initialized!');
      return;
    }

    setIsBuilding(true);

    // Debug: Log chunk preview for marker detection
    if (chunk.includes('<<<') || chunk.includes('>>>') || chunk.includes('<bolt')) {
      console.log('[useBuilder] 🔍 Chunk with markers:', JSON.stringify(chunk.slice(0, 100)));
    }

    manager.processChunk(chunk);

    // Debug: Check manager's file system after each chunk
    const fs = manager.getFileSystem();
    const currentFiles = fs.getAllFiles();
    if (currentFiles.length > 0) {
      console.log('[useBuilder] 📁 Manager has', currentFiles.length, 'files after chunk');
    }
  }, []);

  const processComplete = useCallback((output: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    setIsBuilding(true);
    manager.processComplete(output);
  }, []);

  /**
   * Force sync files from manager to React state
   * Call this after streaming completes to ensure UI updates
   */
  const syncFiles = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const fs = manager.getFileSystem();
    const allFiles = fs.getAllFiles();
    console.log('[useBuilder] 🔄 Forcing file sync, files:', allFiles.length);

    setFiles(allFiles);
    setFileTree(fs.getTree());

    if (allFiles.length > 0 && !selectedPath) {
      setSelectedPath(allFiles[0].path);
    }
  }, [selectedPath]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // State
    fileTree,
    files,
    selectedFile,
    previewResult,
    consoleEntries,
    isBuilding,
    isInitialized,
    projectName,

    // Actions
    selectFile,
    updateFile,
    createFile,
    deleteFile,
    rebuild,
    reset,
    clearConsole,

    // LLM Integration
    processChunk,
    processComplete,
    syncFiles,

    // Manager access
    manager: managerRef.current,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useBuilder;
