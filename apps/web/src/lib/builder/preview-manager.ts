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
    await initializeEsbuild();
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
   */
  async rebuild(): Promise<PreviewResult> {
    const adapter = getEsbuildAdapter();
    const project = this.createProject();

    console.log('[PreviewManager] 🔨 Rebuilding project:', project.name);
    console.log('[PreviewManager] 📁 Files in project:', project.fileCount);
    console.log('[PreviewManager] 🎯 Entry point:', project.entryPoint);

    if (project.fileCount > 0) {
      const filePaths = Array.from(project.files.keys());
      console.log('[PreviewManager] Files:', filePaths.join(', '));
    }

    const result = await adapter.preview(project);

    console.log('[PreviewManager] Build result:', result.success ? '✅ Success' : '❌ Failed');
    if (!result.success && result.errors?.length) {
      console.log('[PreviewManager] Errors:', result.errors.map(e => e.message).join('; '));
    }

    this.lastPreviewResult = result;
    this.options.onPreviewUpdate(result);

    return result;
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
    const files = this.fileSystem.getAllFiles();

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
      files: new Map(files.map(f => [f.path, f])),
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
      console.log('[PreviewManager] 🔔 Event received:', event.type);
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
          for (const file of this.fileSystem.getAllFiles()) {
            this.options.onFileChange(file);
          }

          // Final rebuild
          this.rebuild();
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
