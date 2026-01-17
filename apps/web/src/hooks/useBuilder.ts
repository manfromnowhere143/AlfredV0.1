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
  syncFiles: (fullOutput?: string) => VirtualFile[];

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
  const rebuildInProgressRef = useRef(false);

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
              const tree = fs.getTree();
              console.log('[useBuilder] 📁 File changed:', file.path, '| Total files:', allFiles.length);
              console.log('[useBuilder] 📁 Setting files state with', allFiles.length, 'files');
              // CRITICAL: Force new array reference to trigger re-render
              setFiles([...allFiles]);
              setFileTree(tree);
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
                const tree = fs.getTree();
                console.log('[useBuilder] 🏁 Project complete! Files:', allFiles.length);
                console.log('[useBuilder] 🏁 Setting files state with', allFiles.length, 'files');
                // CRITICAL: Force new array reference to trigger re-render
                setFiles([...allFiles]);
                setFileTree(tree);
                // Also force isBuilding false after project_end
                setIsBuilding(false);
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
  // CRITICAL: ALWAYS read from manager first - React state can be stale
  // This ensures file content is always up-to-date
  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;

    const manager = managerRef.current;

    // ALWAYS try manager first - it's the source of truth
    if (manager) {
      const fromManager = manager.getFile(selectedPath);
      if (fromManager) {
        console.log('[useBuilder] 📄 Selected file from manager:', selectedPath, '| Content length:', fromManager.content?.length || 0);
        return fromManager;
      }
    }

    // Fallback to React state (might be stale but better than nothing)
    const fromState = files.find((f) => f.path === selectedPath);
    if (fromState) {
      console.log('[useBuilder] 📄 Selected file from state (fallback):', selectedPath);
      return fromState;
    }

    console.log('[useBuilder] ⚠️ Selected file not found:', selectedPath, '| Files in state:', files.length, '| Manager files:', manager?.getFiles()?.length || 0);
    return null;
  }, [selectedPath, files]);

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------

  const selectFile = useCallback((path: string) => {
    console.log('[useBuilder] 📂 Selecting file:', path);

    // CRITICAL: Force sync files from manager BEFORE setting selected path
    // This ensures the file exists in React state when useMemo runs
    const manager = managerRef.current;
    if (manager) {
      const allFiles = manager.getFiles();
      const tree = manager.getFileSystem().getTree();

      // Check if files need syncing
      if (allFiles.length !== files.length) {
        console.log('[useBuilder] 🔄 Syncing files before selection. Manager:', allFiles.length, '| State:', files.length);
        setFiles([...allFiles]);
        setFileTree(tree);
      }
    }

    setSelectedPath(path);
  }, [files.length]);

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

  const rebuild = useCallback(async (providedFiles?: VirtualFile[]): Promise<PreviewResult> => {
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

    // Prevent concurrent rebuilds - this prevents race conditions
    if (rebuildInProgressRef.current) {
      console.log('[useBuilder] ⏳ Rebuild already in progress, skipping duplicate call');
      // Return current result or wait for existing rebuild
      return previewResult || {
        success: false,
        errors: [{
          line: 0,
          column: 0,
          message: 'Rebuild in progress',
          severity: 'warning' as const,
        }],
      };
    }

    rebuildInProgressRef.current = true;
    console.log('[useBuilder] 🔨 rebuild() starting, setting isBuilding=true');
    console.log('[useBuilder] 🔨 Files provided:', providedFiles?.length || 'none (will use internal)');
    setIsBuilding(true);

    // Add timeout to prevent hanging forever
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Build timeout after 30s')), 30000);
    });

    try {
      const result = await Promise.race([
        manager.rebuild(providedFiles),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof manager.rebuild>>;

      console.log('[useBuilder] ✅ rebuild() completed, success:', result?.success, 'HTML length:', result?.html?.length || 0);
      // Explicitly set preview result here as well (in addition to onPreviewUpdate callback)
      if (result) {
        setPreviewResult(result);
      }
      return result;
    } catch (error) {
      console.error('[useBuilder] ❌ Rebuild failed:', error);
      return {
        success: false,
        errors: [{
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : 'Build failed',
          severity: 'error' as const,
        }],
      };
    } finally {
      // Always reset isBuilding, even if rebuild throws
      rebuildInProgressRef.current = false;
      console.log('[useBuilder] 🏁 rebuild() finally block, setting isBuilding=false');
      setIsBuilding(false);
    }
  }, [previewResult]);

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
    setIsBuilding(false);  // Ensure isBuilding is reset
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

    // Note: Don't set isBuilding here - that's for the actual ESBuild phase
    // Chunk processing is just parsing, not building

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

    // Note: Don't set isBuilding here - that's for the actual ESBuild phase
    manager.processComplete(output);
  }, []);

  /**
   * Force sync files from manager to React state
   * Call this after streaming completes to ensure UI updates
   * Returns the synced files array for immediate use (bypasses React async)
   *
   * @param fullOutput - Optional: full LLM output for fallback parsing if streaming failed
   */
  const syncFiles = useCallback((fullOutput?: string): VirtualFile[] => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn('[useBuilder] ❌ Cannot sync - manager not initialized');
      return [];
    }

    let fs = manager.getFileSystem();
    let allFiles = fs.getAllFiles();
    console.log('[useBuilder] 🔄 Initial sync, files:', allFiles.length);

    // FALLBACK: If no files and we have the full output, reprocess it completely
    if (allFiles.length === 0 && fullOutput && fullOutput.includes('<<<FILE:')) {
      console.log('[useBuilder] ⚠️ Streaming parser produced 0 files, using fallback...');
      console.log('[useBuilder] 📊 Output has', (fullOutput.match(/<<<FILE:/g) || []).length, 'file markers');

      // Reset and reprocess the complete output
      manager.reset();
      manager.processComplete(fullOutput);

      // Get files again after reprocessing
      fs = manager.getFileSystem();
      allFiles = fs.getAllFiles();
      console.log('[useBuilder] 🔄 After fallback reprocess, files:', allFiles.length);
    }

    // Log file paths for debugging
    if (allFiles.length > 0) {
      console.log('[useBuilder] 📂 Files:', allFiles.map(f => f.path).join(', '));
    }

    setFiles(allFiles);
    setFileTree(fs.getTree());

    if (allFiles.length > 0 && !selectedPath) {
      setSelectedPath(allFiles[0].path);
    }

    // Note: Don't set isBuilding here - rebuild() manages its own state
    // Return files for immediate use (React state update is async)
    return allFiles;
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
