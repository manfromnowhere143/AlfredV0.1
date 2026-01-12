/**
 * Universal Preview Engine
 *
 * State-of-the-art preview system for any file type.
 * Routes files to appropriate rendering engines.
 *
 * Supported Engines:
 * - ESBuild: React/TypeScript/JavaScript bundling
 * - Pyodide: Python execution
 * - ReactFlow: Agent/workflow visualization
 * - Mermaid: Diagram rendering
 * - Markdown: Documentation preview
 * - JSON: Data visualization
 * - Iframe: Simple HTML preview
 */

import {
  PreviewEngine,
  PreviewEngineAdapter,
  PreviewResult,
  PreviewConfig,
  BuildConfig,
  VirtualFile,
  ConsoleEntry,
  AlfredProject,
  detectLanguage,
} from './types';
import { VirtualFileSystem } from './virtual-fs';

// ============================================================================
// PREVIEW ENGINE REGISTRY
// ============================================================================

/**
 * Registry of available preview engines
 */
class PreviewEngineRegistry {
  private adapters: Map<PreviewEngine, PreviewEngineAdapter> = new Map();
  private initializationPromises: Map<PreviewEngine, Promise<void>> = new Map();

  /**
   * Register a preview engine adapter
   */
  register(adapter: PreviewEngineAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Get adapter by ID
   */
  get(id: PreviewEngine): PreviewEngineAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get adapter for file
   */
  getForFile(file: VirtualFile): PreviewEngineAdapter | undefined {
    // First, check file's explicit engine
    if (file.previewEngine && file.previewEngine !== 'none') {
      return this.adapters.get(file.previewEngine);
    }

    // Detect based on file type
    const detection = detectLanguage(file.path);
    if (detection.previewEngine !== 'none') {
      return this.adapters.get(detection.previewEngine);
    }

    return undefined;
  }

  /**
   * Initialize an adapter
   */
  async initialize(id: PreviewEngine): Promise<void> {
    const adapter = this.adapters.get(id);
    if (!adapter) return;

    // Check if already initializing
    const existing = this.initializationPromises.get(id);
    if (existing) return existing;

    // Start initialization
    const promise = adapter.initialize();
    this.initializationPromises.set(id, promise);
    await promise;
  }

  /**
   * Get all registered adapters
   */
  getAll(): PreviewEngineAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// Global registry instance
export const previewEngineRegistry = new PreviewEngineRegistry();

// ============================================================================
// UNIVERSAL PREVIEW ENGINE
// ============================================================================

/**
 * Main preview engine coordinator
 */
export class UniversalPreviewEngine {
  private registry: PreviewEngineRegistry;
  private config: PreviewConfig;
  private buildConfig: BuildConfig;
  private consoleBuffer: ConsoleEntry[] = [];
  private lastBuildTime: number = 0;

  constructor(
    config: PreviewConfig = {},
    buildConfig: BuildConfig = {},
    registry: PreviewEngineRegistry = previewEngineRegistry
  ) {
    this.registry = registry;
    this.config = {
      autoRefresh: true,
      consoleEnabled: true,
      networkEnabled: false,
      sandbox: ['allow-scripts', 'allow-same-origin'],
      ...config,
    };
    this.buildConfig = {
      target: 'esnext',
      jsx: 'react-jsx',
      minify: false,
      sourcemap: true,
      ...buildConfig,
    };
  }

  /**
   * Preview a project
   */
  async preview(
    fileSystem: VirtualFileSystem,
    options: PreviewOptions = {}
  ): Promise<PreviewResult> {
    const startTime = performance.now();
    const { activeFile, forceEngine } = options;

    try {
      // Find the appropriate engine
      let engine: PreviewEngineAdapter | undefined;

      if (forceEngine) {
        engine = this.registry.get(forceEngine);
      } else if (activeFile) {
        const file = fileSystem.getFile(activeFile);
        if (file) {
          engine = this.registry.getForFile(file);
        }
      }

      // Default to ESBuild for web projects
      if (!engine) {
        engine = this.registry.get('esbuild');
      }

      if (!engine) {
        return this.createErrorResult('No preview engine available');
      }

      // Initialize engine if needed
      await this.registry.initialize(engine.id);

      // Build the project
      const project = this.createProjectFromFileSystem(fileSystem, options);
      const result = await engine.preview(project, activeFile);

      this.lastBuildTime = performance.now() - startTime;

      return {
        ...result,
        buildTime: this.lastBuildTime,
        console: this.consoleBuffer,
      };
    } catch (error) {
      this.lastBuildTime = performance.now() - startTime;
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown preview error',
        this.lastBuildTime
      );
    }
  }

  /**
   * Update preview with changed files (HMR-like)
   */
  async update(
    _fileSystem: VirtualFileSystem,
    changedFiles: VirtualFile[]
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      // Find engine based on changed files
      let engine: PreviewEngineAdapter | undefined;
      for (const file of changedFiles) {
        engine = this.registry.getForFile(file);
        if (engine) break;
      }

      if (!engine) {
        engine = this.registry.get('esbuild');
      }

      if (!engine) {
        return this.createErrorResult('No preview engine available');
      }

      const result = await engine.update(changedFiles);
      this.lastBuildTime = performance.now() - startTime;

      return {
        ...result,
        buildTime: this.lastBuildTime,
      };
    } catch (error) {
      this.lastBuildTime = performance.now() - startTime;
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown update error',
        this.lastBuildTime
      );
    }
  }

  /**
   * Preview a single file
   */
  async previewFile(file: VirtualFile): Promise<PreviewResult> {
    const engine = this.registry.getForFile(file);

    if (!engine) {
      return this.createNoPreviewResult(file);
    }

    await this.registry.initialize(engine.id);

    // Create a minimal project with just this file
    const fs = new VirtualFileSystem([file]);
    const project = this.createProjectFromFileSystem(fs, { activeFile: file.path });

    return engine.preview(project, file.path);
  }

  /**
   * Create project from file system
   */
  private createProjectFromFileSystem(
    fileSystem: VirtualFileSystem,
    options: PreviewOptions
  ): AlfredProject {
    const files = fileSystem.getAllFiles();
    const entryPoint = files.find(f => f.isEntryPoint)?.path || '/src/main.tsx';

    return {
      id: options.projectId || 'preview',
      userId: options.userId || 'anonymous',
      name: options.projectName || 'Preview Project',
      framework: options.framework || 'react',
      entryPoint,
      previewEngine: options.forceEngine || 'esbuild',
      dependencies: options.dependencies || {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: options.devDependencies || {},
      buildConfig: this.buildConfig,
      previewConfig: this.config,
      files: new Map(files.map(f => [f.path, f])),
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, buildTime: number = 0): PreviewResult {
    return {
      success: false,
      errors: [{
        line: 0,
        column: 0,
        message,
        severity: 'error',
      }],
      buildTime,
    };
  }

  /**
   * Create no-preview result
   */
  private createNoPreviewResult(file: VirtualFile): PreviewResult {
    return {
      success: true,
      html: this.createNoPreviewHTML(file),
      buildTime: 0,
      metadata: { noPreview: true },
    };
  }

  /**
   * Create HTML for files without preview
   */
  private createNoPreviewHTML(file: VirtualFile): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.7;
    }
    h2 { margin-bottom: 8px; font-weight: 500; }
    p { opacity: 0.7; font-size: 14px; }
    .file-info {
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📄</div>
    <h2>No Preview Available</h2>
    <p>This file type doesn't support live preview.</p>
    <div class="file-info">
      <div>${file.path}</div>
      <div>${file.language} • ${file.fileType} • ${formatBytes(file.size)}</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Add console entry
   */
  addConsoleEntry(entry: ConsoleEntry): void {
    this.consoleBuffer.push(entry);
    // Keep last 1000 entries
    if (this.consoleBuffer.length > 1000) {
      this.consoleBuffer = this.consoleBuffer.slice(-1000);
    }
  }

  /**
   * Clear console
   */
  clearConsole(): void {
    this.consoleBuffer = [];
  }

  /**
   * Get console entries
   */
  getConsole(): ConsoleEntry[] {
    return [...this.consoleBuffer];
  }

  /**
   * Get last build time
   */
  getLastBuildTime(): number {
    return this.lastBuildTime;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PreviewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update build configuration
   */
  setBuildConfig(config: Partial<BuildConfig>): void {
    this.buildConfig = { ...this.buildConfig, ...config };
  }
}

// ============================================================================
// PREVIEW OPTIONS
// ============================================================================

export interface PreviewOptions {
  /** Currently active/focused file */
  activeFile?: string;

  /** Force a specific preview engine */
  forceEngine?: PreviewEngine;

  /** Project ID */
  projectId?: string;

  /** User ID */
  userId?: string;

  /** Project name */
  projectName?: string;

  /** Project framework */
  framework?: 'react' | 'vue' | 'svelte' | 'nextjs' | 'python' | 'node' | 'agent' | 'workflow' | 'static' | 'custom';

  /** Runtime dependencies */
  dependencies?: Record<string, string>;

  /** Dev dependencies */
  devDependencies?: Record<string, string>;
}

// ============================================================================
// BUILT-IN PREVIEW ADAPTERS
// ============================================================================

/**
 * Iframe preview adapter (simple HTML)
 */
export const iframePreviewAdapter: PreviewEngineAdapter = {
  id: 'iframe',
  name: 'HTML Iframe',
  supportedFileTypes: ['page'],
  supportedExtensions: ['.html', '.htm'],

  async initialize() {
    // No initialization needed
  },

  async preview(project, activeFile) {
    const file = activeFile
      ? project.files.get(activeFile)
      : project.files.get(project.entryPoint);

    if (!file) {
      return { success: false, errors: [{ line: 0, column: 0, message: 'File not found', severity: 'error' }] };
    }

    return {
      success: true,
      html: file.content,
    };
  },

  async update(files) {
    const file = files[0];
    if (!file) {
      return { success: false, errors: [{ line: 0, column: 0, message: 'No files to update', severity: 'error' }] };
    }
    return { success: true, html: file.content };
  },

  destroy() {
    // No cleanup needed
  },
};

/**
 * Markdown preview adapter
 */
export const markdownPreviewAdapter: PreviewEngineAdapter = {
  id: 'markdown',
  name: 'Markdown Preview',
  supportedFileTypes: ['documentation'],
  supportedExtensions: ['.md', '.mdx'],

  async initialize() {
    // Could load marked.js or similar
  },

  async preview(project, activeFile) {
    const file = activeFile
      ? project.files.get(activeFile)
      : Array.from(project.files.values()).find(f => f.language === 'markdown');

    if (!file) {
      return { success: false, errors: [{ line: 0, column: 0, message: 'No markdown file found', severity: 'error' }] };
    }

    // Simple markdown to HTML (production would use marked.js)
    const html = createMarkdownPreviewHTML(file.content);
    return { success: true, html };
  },

  async update(files) {
    const mdFile = files.find(f => f.language === 'markdown');
    if (!mdFile) {
      return { success: true, html: '' };
    }
    return { success: true, html: createMarkdownPreviewHTML(mdFile.content) };
  },

  destroy() {},
};

/**
 * JSON preview adapter
 */
export const jsonPreviewAdapter: PreviewEngineAdapter = {
  id: 'json',
  name: 'JSON Viewer',
  supportedFileTypes: ['data', 'config'],
  supportedExtensions: ['.json', '.yaml', '.yml'],

  async initialize() {},

  async preview(project, activeFile) {
    const file = activeFile
      ? project.files.get(activeFile)
      : Array.from(project.files.values()).find(f => f.language === 'json');

    if (!file) {
      return { success: false, errors: [{ line: 0, column: 0, message: 'No data file found', severity: 'error' }] };
    }

    const html = createJSONPreviewHTML(file.content, file.language);
    return { success: true, html };
  },

  async update(files) {
    const dataFile = files.find(f => ['json', 'yaml'].includes(f.language));
    if (!dataFile) {
      return { success: true, html: '' };
    }
    return { success: true, html: createJSONPreviewHTML(dataFile.content, dataFile.language) };
  },

  destroy() {},
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Create markdown preview HTML
 */
function createMarkdownPreviewHTML(content: string): string {
  // Simple markdown conversion (production would use marked.js)
  let html = content
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #1a1a1a; color: #e0e0e0; }
      h1 { border-bottom-color: #333; }
      code { background: #2d2d2d; }
    }
  </style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Create JSON preview HTML
 */
function createJSONPreviewHTML(content: string, _language: string): string {
  let formatted: string;
  try {
    const parsed = JSON.parse(content);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = content;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Fira Code', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      margin: 0;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .string { color: #ce9178; }
    .number { color: #b5cea8; }
    .boolean { color: #569cd6; }
    .null { color: #569cd6; }
    .key { color: #9cdcfe; }
  </style>
</head>
<body>
  <pre>${syntaxHighlightJSON(formatted)}</pre>
</body>
</html>`;
}

/**
 * Simple JSON syntax highlighting
 */
function syntaxHighlightJSON(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="null">$1</span>');
}

// ============================================================================
// FACTORY & INITIALIZATION
// ============================================================================

/**
 * Create a new universal preview engine
 */
export function createPreviewEngine(
  config?: PreviewConfig,
  buildConfig?: BuildConfig
): UniversalPreviewEngine {
  return new UniversalPreviewEngine(config, buildConfig);
}

/**
 * Initialize default preview adapters
 */
export function initializeDefaultAdapters(): void {
  previewEngineRegistry.register(iframePreviewAdapter);
  previewEngineRegistry.register(markdownPreviewAdapter);
  previewEngineRegistry.register(jsonPreviewAdapter);
}

// Auto-initialize on module load
initializeDefaultAdapters();
