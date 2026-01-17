/**
 * Preview Manager
 *
 * The central nervous system connecting:
 * Streaming Parser → VirtualFileSystem → ESBuild → Live Preview
 *
 * This is where the magic happens.
 */

import {
  VirtualFileSystem,
  createFileSystem,
  MultiFileStreamingParser,
  createStreamingParser,
  StreamingEvent,
  VirtualFile,
  PreviewResult,
  AlfredProject,
  ProjectFramework,
} from '@alfred/core';
import { getEsbuildAdapter, initializeEsbuild } from './esbuild-adapter';

// ============================================================================
// PREVIEW MANAGER
// ============================================================================

export interface ProjectMetadata {
  name: string;
  framework: ProjectFramework;
  description?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface PreviewManagerOptions {
  /** Auto-rebuild on file changes */
  autoRefresh?: boolean;

  /** Debounce time for rebuilds (ms) */
  debounceMs?: number;

  /** Callback when preview updates */
  onPreviewUpdate?: (result: PreviewResult) => void;

  /** Callback when file changes */
  onFileChange?: (file: VirtualFile) => void;

  /** Callback for console output */
  onConsole?: (entry: { type: string; args: unknown[] }) => void;

  /** Callback for streaming events */
  onStreamEvent?: (event: StreamingEvent) => void;
}

export class PreviewManager {
  private fileSystem: VirtualFileSystem;
  private parser: MultiFileStreamingParser;
  private options: Required<PreviewManagerOptions>;
  private rebuildTimer: NodeJS.Timeout | null = null;
  private lastPreviewResult: PreviewResult | null = null;
  private projectMeta: ProjectMetadata = {
    name: 'Untitled',
    framework: 'react',
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: {},
  };

  constructor(options: PreviewManagerOptions = {}) {
    this.options = {
      autoRefresh: true,
      debounceMs: 100,
      onPreviewUpdate: () => {},
      onFileChange: () => {},
      onConsole: () => {},
      onStreamEvent: () => {},
      ...options,
    };

    this.fileSystem = createFileSystem();
    this.parser = createStreamingParser();

    // Wire up parser events
    this.setupParserEvents();

    // Wire up file system changes
    this.setupFileSystemEvents();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the preview manager (warm up ESBuild)
   */
  async initialize(): Promise<void> {
    console.log('[PreviewManager] 🚀 initialize() called, warming up ESBuild...');
    const startTime = performance.now();
    try {
      await initializeEsbuild();
      console.log('[PreviewManager] ✅ ESBuild initialized in', Math.round(performance.now() - startTime), 'ms');
    } catch (err) {
      console.error('[PreviewManager] ❌ ESBuild initialization failed:', err);
      throw err;
    }
  }

  // ==========================================================================
  // STREAMING INPUT
  // ==========================================================================

  /**
   * Process a chunk of LLM output
   * This is the entry point for streaming generation
   */
  processChunk(chunk: string): void {
    this.parser.processChunk(chunk);
  }

  /**
   * Process complete LLM output (non-streaming)
   */
  processComplete(output: string): void {
    this.parser.reset();
    this.parser.processChunk(output);
  }

  /**
   * Reset for new generation
   */
  reset(): void {
    this.parser.reset();
    this.fileSystem.clear();
    this.projectMeta = {
      name: 'Untitled',
      framework: 'react',
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: {},
    };
    this.lastPreviewResult = null;
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Get the virtual file system
   */
  getFileSystem(): VirtualFileSystem {
    return this.fileSystem;
  }

  /**
   * Get all files
   */
  getFiles(): VirtualFile[] {
    return this.fileSystem.getAllFiles();
  }

  /**
   * Get a specific file
   */
  getFile(path: string): VirtualFile | undefined {
    return this.fileSystem.getFile(path);
  }

  /**
   * Update a file (triggers rebuild if autoRefresh)
   */
  updateFile(path: string, content: string): VirtualFile {
    return this.fileSystem.updateFile(path, content);
  }

  /**
   * Create a new file
   */
  createFile(path: string, content: string = ''): VirtualFile {
    return this.fileSystem.createFile(path, content);
  }

  /**
   * Delete a file
   */
  deleteFile(path: string): boolean {
    return this.fileSystem.deleteFile(path);
  }

  // ==========================================================================
  // PREVIEW
  // ==========================================================================

  /**
   * Trigger a preview rebuild
   * @param providedFiles - Optional files to use directly (bypasses internal file lookup)
   */
  async rebuild(providedFiles?: VirtualFile[]): Promise<PreviewResult> {
    // CRITICAL FIX: If files are provided directly, use them to avoid race conditions
    // This ensures the files seen at sync time are the same used for building
    let filesToUse: VirtualFile[] = [];

    if (providedFiles && providedFiles.length > 0) {
      console.log('[PreviewManager] 🔒 Using PROVIDED files:', providedFiles.length);
      filesToUse = providedFiles;

      // Also sync to internal fileSystem for consistency
      for (const pf of providedFiles) {
        if (!this.fileSystem.getFile(pf.path)) {
          this.fileSystem.createFile({
            path: pf.path,
            content: pf.content,
            language: pf.language,
            fileType: pf.fileType,
            isEntryPoint: pf.isEntryPoint,
            generatedBy: pf.generatedBy || 'llm',
          });
        }
      }
    } else {
      // Fallback: Get files from multiple sources
      const parserFiles = this.parser.getFiles();
      const fsFiles = this.fileSystem.getAllFiles();

      console.log('[PreviewManager] 🔍 Pre-rebuild check: Parser files:', parserFiles.length, '| FileSystem files:', fsFiles.length);

      // Use whichever source has files
      if (fsFiles.length > 0) {
        filesToUse = fsFiles;
        console.log('[PreviewManager] Using fileSystem files');
      } else if (parserFiles.length > 0) {
        filesToUse = parserFiles;
        console.log('[PreviewManager] Using parser files (fileSystem was empty)');
        // Sync to fileSystem
        for (const pFile of parserFiles) {
          this.fileSystem.createFile({
            path: pFile.path,
            content: pFile.content,
            language: pFile.language,
            fileType: pFile.fileType,
            isEntryPoint: pFile.isEntryPoint,
            generatedBy: 'llm',
          });
        }
      }
    }

    console.log('[PreviewManager] 📁 Files to build:', filesToUse.length);

    if (filesToUse.length === 0) {
      console.error('[PreviewManager] ❌ NO FILES AVAILABLE FOR BUILD!');
      return {
        success: false,
        errors: [{
          line: 0,
          column: 0,
          message: 'No files to build. Files may not have synced correctly.',
          severity: 'error' as const,
          source: 'preview-manager',
        }],
      };
    }

    // Create project with the files we've gathered
    console.log('[PreviewManager] 🔧 Getting ESBuild adapter...');
    const adapter = getEsbuildAdapter();
    console.log('[PreviewManager] ✅ Got adapter, creating project...');
    const project = this.createProjectWithFiles(filesToUse);

    console.log('[PreviewManager] 🔨 Rebuilding project:', project.name);
    console.log('[PreviewManager] 📁 Files in project:', project.fileCount);
    console.log('[PreviewManager] 🎯 Entry point:', project.entryPoint);
    console.log('[PreviewManager] Files:', Array.from(project.files.keys()).join(', '));

    console.log('[PreviewManager] 🚀 Calling adapter.preview()...');
    const result = await adapter.preview(project);
    console.log('[PreviewManager] ✅ adapter.preview() returned');

    console.log('[PreviewManager] Build result:', result.success ? '✅ Success' : '❌ Failed');
    if (!result.success && result.errors?.length) {
      console.log('[PreviewManager] Errors:', result.errors.map(e => e.message).join('; '));
    }

    this.lastPreviewResult = result;
    this.options.onPreviewUpdate(result);

    return result;
  }

  /**
   * Create project with explicit files (avoids race conditions)
   */
  private createProjectWithFiles(files: VirtualFile[]): AlfredProject {
    const filesMap = new Map(files.map(f => [f.path, f]));

    return {
      id: 'preview-' + Date.now(),
      userId: 'anonymous',
      name: this.projectMeta.name,
      description: this.projectMeta.description,
      framework: this.projectMeta.framework,
      entryPoint: files.find(f => f.isEntryPoint)?.path || '/src/main.tsx',
      previewEngine: 'esbuild',
      dependencies: this.projectMeta.dependencies,
      devDependencies: this.projectMeta.devDependencies,
      buildConfig: {
        target: 'es2020',
        jsx: 'react-jsx',
        minify: false,
        sourcemap: true,
      },
      previewConfig: {
        autoRefresh: this.options.autoRefresh,
        consoleEnabled: true,
      },
      files: filesMap,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get the last preview result
   */
  getLastPreview(): PreviewResult | null {
    return this.lastPreviewResult;
  }

  /**
   * Create an AlfredProject from current state
   */
  private createProject(): AlfredProject {
    // FORENSIC: Get files from multiple sources to compare
    const fsFiles = this.fileSystem.getAllFiles();
    const parserFiles = this.parser.getFiles();
    const fsCount = this.fileSystem.getFileCount();

    console.log('[FORENSIC] createProject() called');
    console.log('[FORENSIC] fileSystem.getAllFiles():', fsFiles.length);
    console.log('[FORENSIC] fileSystem.getFileCount():', fsCount);
    console.log('[FORENSIC] parser.getFiles():', parserFiles.length);

    // CRITICAL FIX: If fileSystem is empty but parser has files, USE PARSER FILES DIRECTLY
    const files = fsFiles.length > 0 ? fsFiles : parserFiles;

    if (fsFiles.length === 0 && parserFiles.length > 0) {
      console.log('[FORENSIC] ⚠️ Using parser files directly because fileSystem is empty!');
      // Also sync to fileSystem for future use
      for (const pf of parserFiles) {
        this.fileSystem.createFile({
          path: pf.path,
          content: pf.content,
          language: pf.language,
          fileType: pf.fileType,
          isEntryPoint: pf.isEntryPoint,
          generatedBy: 'llm',
        });
      }
    }

    console.log('[FORENSIC] Final files count:', files.length);
    if (files.length > 0) {
      console.log('[FORENSIC] Files:', files.map(f => f.path).join(', '));
    }

    const filesMap = new Map(files.map(f => [f.path, f]));
    console.log('[FORENSIC] Map size:', filesMap.size);

    return {
      id: 'preview-' + Date.now(),
      userId: 'anonymous',
      name: this.projectMeta.name,
      description: this.projectMeta.description,
      framework: this.projectMeta.framework,
      entryPoint: files.find(f => f.isEntryPoint)?.path || '/src/main.tsx',
      previewEngine: 'esbuild',
      dependencies: this.projectMeta.dependencies,
      devDependencies: this.projectMeta.devDependencies,
      buildConfig: {
        target: 'es2020',
        jsx: 'react-jsx',
        minify: false,
        sourcemap: true,
      },
      previewConfig: {
        autoRefresh: this.options.autoRefresh,
        consoleEnabled: true,
      },
      files: filesMap,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ==========================================================================
  // EVENT WIRING
  // ==========================================================================

  /**
   * Setup parser event handlers
   */
  private setupParserEvents(): void {
    this.parser.onEvent((event) => {
      console.log('[PreviewManager] 🔔 Event received:', event.type, (event as any).path || (event as any).projectName || '');
      console.log('[PreviewManager] Current fileSystem files:', this.fileSystem.getFileCount());
      this.options.onStreamEvent(event);

      switch (event.type) {
        case 'project_start':
          this.projectMeta.name = event.projectName;
          this.projectMeta.framework = event.framework;
          this.projectMeta.description = event.description;
          break;

        case 'file_start':
          // File started, create placeholder
          this.fileSystem.createFile({
            path: event.path,
            content: '',
            language: event.language,
            fileType: event.fileType,
            isEntryPoint: event.isEntryPoint,
            generatedBy: 'llm',
          });
          break;

        case 'file_content':
          // Append content chunk
          const file = this.fileSystem.getFile(event.path);
          if (file) {
            this.fileSystem.updateFile(event.path, file.content + event.chunk);
          }
          break;

        case 'file_end':
          // File complete - sync from parser's completed files
          const parserFiles = this.parser.getFiles();
          const parsedFile = parserFiles.find(f => f.path === event.path);

          if (parsedFile) {
            // Update our file system with the complete content from parser
            const existingFile = this.fileSystem.getFile(event.path);
            if (existingFile) {
              this.fileSystem.updateFile(event.path, parsedFile.content);
            } else {
              this.fileSystem.createFile({
                path: parsedFile.path,
                content: parsedFile.content,
                language: parsedFile.language,
                fileType: parsedFile.fileType,
                isEntryPoint: parsedFile.isEntryPoint,
                generatedBy: 'llm',
              });
            }
            console.log('[PreviewManager] 📁 File synced:', event.path, '| Size:', parsedFile.content.length);
          }

          // Trigger update
          const completedFile = this.fileSystem.getFile(event.path);
          if (completedFile) {
            this.options.onFileChange(completedFile);
            this.scheduleRebuild();
          }
          break;

        case 'dependency':
          if (event.isDev) {
            this.projectMeta.devDependencies[event.name] = event.version;
          } else {
            this.projectMeta.dependencies[event.name] = event.version;
          }
          break;

        case 'project_end':
          // Final sync: ensure all files from parser are in our file system
          const allParserFiles = this.parser.getFiles();
          console.log('[PreviewManager] 🏁 Project complete! Syncing', allParserFiles.length, 'files');

          for (const pFile of allParserFiles) {
            const existing = this.fileSystem.getFile(pFile.path);
            if (!existing || existing.content !== pFile.content) {
              if (existing) {
                this.fileSystem.updateFile(pFile.path, pFile.content);
              } else {
                this.fileSystem.createFile({
                  path: pFile.path,
                  content: pFile.content,
                  language: pFile.language,
                  fileType: pFile.fileType,
                  isEntryPoint: pFile.isEntryPoint,
                  generatedBy: 'llm',
                });
              }
              console.log('[PreviewManager] ✅ Synced:', pFile.path);
            }
          }

          // Notify about all files
          const finalFiles = this.fileSystem.getAllFiles();
          console.log('[PreviewManager] 🏁 Final file count:', finalFiles.length);
          for (const file of finalFiles) {
            console.log('[PreviewManager] 📄 File:', file.path, '| Size:', file.content.length);
            this.options.onFileChange(file);
          }

          // NOTE: Do NOT call rebuild() here - let page.tsx handle it
          // This prevents race conditions with multiple rebuild() calls
          // The page.tsx will call builder.rebuild() after syncFiles()
          console.log('[PreviewManager] 🏁 Files synced, waiting for external rebuild trigger');
          break;
      }
    });
  }

  /**
   * Setup file system change handlers
   */
  private setupFileSystemEvents(): void {
    this.fileSystem.onChange((changes) => {
      // Notify about changes
      for (const change of changes) {
        if (change.file) {
          this.options.onFileChange(change.file);
        }
      }

      // Schedule rebuild if autoRefresh enabled
      if (this.options.autoRefresh) {
        this.scheduleRebuild();
      }
    });
  }

  /**
   * Schedule a debounced rebuild
   */
  private scheduleRebuild(): void {
    if (this.rebuildTimer) {
      clearTimeout(this.rebuildTimer);
    }

    this.rebuildTimer = setTimeout(() => {
      this.rebuild();
    }, this.options.debounceMs);
  }

  // ==========================================================================
  // PROJECT METADATA
  // ==========================================================================

  /**
   * Set project name
   */
  setProjectName(name: string): void {
    this.projectMeta.name = name;
  }

  /**
   * Set project framework
   */
  setProjectFramework(framework: ProjectFramework): void {
    this.projectMeta.framework = framework;
  }

  /**
   * Add a dependency
   */
  addDependency(name: string, version: string, isDev = false): void {
    if (isDev) {
      this.projectMeta.devDependencies[name] = version;
    } else {
      this.projectMeta.dependencies[name] = version;
    }
  }

  /**
   * Get project metadata
   */
  getProjectMeta() {
    return { ...this.projectMeta };
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export project for deployment
   */
  exportProject(): AlfredProject {
    return this.createProject();
  }

  /**
   * Export as JSON for saving
   */
  toJSON(): {
    files: Record<string, string>;
    meta: ProjectMetadata;
  } {
    return {
      files: this.fileSystem.toJSON(),
      meta: { ...this.projectMeta },
    };
  }

  /**
   * Import from JSON
   */
  fromJSON(data: { files: Record<string, string>; meta?: ProjectMetadata }): void {
    this.reset();
    this.fileSystem.fromJSON(data.files, { generatedBy: 'user' });
    if (data.meta) {
      this.projectMeta = { ...data.meta };
    }
    this.rebuild();
  }
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

let previewManagerInstance: PreviewManager | null = null;

/**
 * Get or create the preview manager singleton
 */
export function getPreviewManager(options?: PreviewManagerOptions): PreviewManager {
  if (!previewManagerInstance) {
    previewManagerInstance = new PreviewManager(options);
  }
  return previewManagerInstance;
}

/**
 * Create a new preview manager instance
 */
export function createPreviewManager(options?: PreviewManagerOptions): PreviewManager {
  return new PreviewManager(options);
}

/**
 * Initialize preview system (call early)
 */
export async function initializePreviewSystem(): Promise<PreviewManager> {
  const manager = getPreviewManager();
  await manager.initialize();
  return manager;
}
