/**
 * Alfred Builder Types
 *
 * State-of-the-art type definitions for Alfred's multi-file project system.
 * Designed for universal file support, streaming generation, and live preview.
 *
 * Architecture Principles:
 * - Framework-agnostic file abstraction
 * - Streaming-first LLM protocol
 * - Universal preview engine routing
 * - Immutable snapshots for versioning
 */

// ============================================================================
// FRAMEWORK & FILE TYPE ENUMS
// ============================================================================

export type ProjectFramework =
  | 'react'
  | 'vue'
  | 'svelte'
  | 'nextjs'
  | 'python'
  | 'node'
  | 'agent'
  | 'workflow'
  | 'static'
  | 'custom';

export type ProjectFileType =
  | 'component'
  | 'page'
  | 'style'
  | 'config'
  | 'script'
  | 'python'
  | 'data'
  | 'asset'
  | 'test'
  | 'agent'
  | 'workflow'
  | 'documentation'
  | 'other';

export type PreviewEngine =
  | 'esbuild'
  | 'sandpack'
  | 'webcontainer'
  | 'pyodide'
  | 'reactflow'
  | 'mermaid'
  | 'markdown'
  | 'json'
  | 'iframe'
  | 'terminal'
  | 'none';

export type FileStatus =
  | 'pristine'
  | 'modified'
  | 'error'
  | 'warning'
  | 'building'
  | 'generating'
  | 'ready';

// ============================================================================
// FILE SYSTEM TYPES
// ============================================================================

/**
 * Virtual file representation
 * Core abstraction for all file operations
 */
export interface VirtualFile {
  /** Unique identifier */
  id: string;

  /** Full path from project root (e.g., '/src/components/Header.tsx') */
  path: string;

  /** File name only (e.g., 'Header.tsx') */
  name: string;

  /** File content as string */
  content: string;

  /** Programming language (tsx, py, json, etc.) */
  language: string;

  /** Semantic file type for routing */
  fileType: ProjectFileType;

  /** Content size in bytes */
  size: number;

  /** Line count */
  lineCount: number;

  /** Current build status */
  status: FileStatus;

  /** Syntax/type errors */
  errors?: FileError[];

  /** Is this the project entry point? */
  isEntryPoint?: boolean;

  /** Override preview engine for this file */
  previewEngine?: PreviewEngine;

  /** File version (incremented on changes) */
  version: number;

  /** Who created this file */
  generatedBy?: 'llm' | 'user' | 'template';

  /** Prompt used to generate (if LLM) */
  generationPrompt?: string;

  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * File error with location information
 */
export interface FileError {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string; // 'typescript' | 'eslint' | 'esbuild'
  code?: string; // Error code (e.g., 'TS2345')
}

/**
 * Import analysis for dependency graph
 */
export interface FileImport {
  /** Import source (e.g., './Button' or 'react') */
  source: string;

  /** Imported identifiers */
  specifiers: string[];

  /** Is this a relative import? */
  isRelative: boolean;

  /** Resolved path (for relative imports) */
  resolvedPath?: string;

  /** Import type */
  importType: 'named' | 'default' | 'namespace' | 'side-effect';
}

/**
 * Export analysis for module interface
 */
export interface FileExport {
  /** Exported identifier */
  name: string;

  /** Export type */
  exportType: 'named' | 'default' | 're-export';

  /** Is this a type-only export? */
  isTypeOnly?: boolean;
}

/**
 * Directory node in virtual file tree
 */
export interface VirtualDirectory {
  path: string;
  name: string;
  children: Array<VirtualFile | VirtualDirectory>;
  isExpanded?: boolean;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Multi-file project container
 */
export interface AlfredProject {
  /** Unique identifier */
  id: string;

  /** User who owns this project */
  userId: string;

  /** Linked conversation ID */
  conversationId?: string;

  /** Project name */
  name: string;

  /** Project description */
  description?: string;

  /** Framework type */
  framework: ProjectFramework;

  /** Entry point path */
  entryPoint: string;

  /** Default preview engine */
  previewEngine: PreviewEngine;

  /** Runtime dependencies */
  dependencies: Record<string, string>;

  /** Development dependencies */
  devDependencies: Record<string, string>;

  /** Build configuration */
  buildConfig: BuildConfig;

  /** Preview configuration */
  previewConfig: PreviewConfig;

  /** All project files */
  files: Map<string, VirtualFile>;

  /** Template used to scaffold */
  templateId?: string;

  /** Total file count */
  fileCount: number;

  /** Total size in bytes */
  totalSize: number;

  /** Last successful build timestamp */
  lastBuildAt?: Date;

  /** Last build status */
  lastBuildStatus?: 'success' | 'error';

  /** Last build error message */
  lastBuildError?: string;

  /** Project version */
  version: number;

  /** Deployed URL */
  deployedUrl?: string;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  /** ECMAScript target */
  target?: 'es2020' | 'es2021' | 'es2022' | 'esnext';

  /** JSX transform */
  jsx?: 'react-jsx' | 'react-jsxdev' | 'preserve';

  /** Enable minification */
  minify?: boolean;

  /** Generate sourcemaps */
  sourcemap?: boolean;

  /** External packages (load from CDN) */
  externals?: string[];

  /** Import map overrides */
  importMap?: Record<string, string>;

  /** Bundle format */
  format?: 'esm' | 'iife' | 'cjs';

  /** Custom esbuild plugins */
  plugins?: string[];
}

/**
 * Preview configuration
 */
export interface PreviewConfig {
  /** Auto-refresh on file changes (HMR-like) */
  autoRefresh?: boolean;

  /** Show console output */
  consoleEnabled?: boolean;

  /** Enable network panel */
  networkEnabled?: boolean;

  /** Custom <head> content */
  customHead?: string;

  /** iframe sandbox permissions */
  sandbox?: string[];

  /** Theme for code displays */
  theme?: 'light' | 'dark' | 'auto';

  /** Custom CSS to inject */
  customCss?: string;
}

/**
 * Project snapshot for versioning
 */
export interface ProjectSnapshot {
  id: string;
  projectId: string;
  version: number;
  name?: string;
  description?: string;
  files: VirtualFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  buildConfig: BuildConfig;
  fileCount: number;
  totalSize: number;
  triggeredBy: 'user' | 'auto' | 'deploy' | 'llm';
  messageId?: string;
  createdAt: Date;
}

/**
 * Project template for scaffolding
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'web' | 'python' | 'agent' | 'data' | 'other';
  framework: ProjectFramework;
  previewEngine: PreviewEngine;
  files: VirtualFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  buildConfig?: BuildConfig;
  thumbnailUrl?: string;
  tags?: string[];
  usageCount: number;
  isFeatured: boolean;
}

// ============================================================================
// STREAMING PROTOCOL TYPES
// ============================================================================

/**
 * LLM streaming events for multi-file generation
 */
export type StreamingEvent =
  | ProjectStartEvent
  | FileStartEvent
  | FileContentEvent
  | FileEndEvent
  | FileErrorEvent
  | DependencyEvent
  | ProjectEndEvent;

export interface ProjectStartEvent {
  type: 'project_start';
  projectName: string;
  framework: ProjectFramework;
  description?: string;
  timestamp: number;
}

export interface FileStartEvent {
  type: 'file_start';
  path: string;
  language: string;
  fileType: ProjectFileType;
  isEntryPoint?: boolean;
  timestamp: number;
}

export interface FileContentEvent {
  type: 'file_content';
  path: string;
  chunk: string;
  timestamp: number;
}

export interface FileEndEvent {
  type: 'file_end';
  path: string;
  totalSize: number;
  timestamp: number;
}

export interface FileErrorEvent {
  type: 'file_error';
  path: string;
  error: string;
  timestamp: number;
}

export interface DependencyEvent {
  type: 'dependency';
  name: string;
  version: string;
  isDev: boolean;
  timestamp: number;
}

export interface ProjectEndEvent {
  type: 'project_end';
  fileCount: number;
  totalSize: number;
  timestamp: number;
}

/**
 * Parser state for streaming events
 */
export interface StreamingParserState {
  currentProject?: Partial<AlfredProject>;
  currentFile?: {
    path: string;
    chunks: string[];
    language: string;
    fileType: ProjectFileType;
    isEntryPoint?: boolean;
  };
  completedFiles: VirtualFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  errors: StreamingError[];
}

export interface StreamingError {
  type: 'parse_error' | 'validation_error' | 'timeout';
  message: string;
  path?: string;
  timestamp: number;
}

// ============================================================================
// PREVIEW ENGINE TYPES
// ============================================================================

/**
 * Preview engine interface
 */
export interface PreviewEngineAdapter {
  /** Engine identifier */
  id: PreviewEngine;

  /** Human-readable name */
  name: string;

  /** File types this engine can preview */
  supportedFileTypes: ProjectFileType[];

  /** File extensions this engine handles */
  supportedExtensions: string[];

  /** Initialize the engine */
  initialize(): Promise<void>;

  /** Build and render preview */
  preview(project: AlfredProject, activeFile?: string): Promise<PreviewResult>;

  /** Update preview (for HMR) */
  update(files: VirtualFile[]): Promise<PreviewResult>;

  /** Destroy engine instance */
  destroy(): void;
}

/**
 * Preview result
 */
export interface PreviewResult {
  success: boolean;

  /** HTML content for iframe srcdoc */
  html?: string;

  /** Blob URL for iframe src */
  blobUrl?: string;

  /** Console output */
  console?: ConsoleEntry[];

  /** Build errors */
  errors?: FileError[];

  /** Build warnings */
  warnings?: FileError[];

  /** Build duration in ms */
  buildTime?: number;

  /** Preview-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Console entry for preview output
 */
export interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  args: unknown[];
  timestamp: number;
  stack?: string;
}

// ============================================================================
// FILE TREE OPERATIONS
// ============================================================================

/**
 * File tree operations for UI
 */
export interface FileTreeOperations {
  /** Create a new file */
  createFile(path: string, content?: string): VirtualFile;

  /** Update file content */
  updateFile(path: string, content: string): VirtualFile;

  /** Delete a file */
  deleteFile(path: string): boolean;

  /** Rename/move a file */
  moveFile(oldPath: string, newPath: string): VirtualFile;

  /** Create a directory */
  createDirectory(path: string): void;

  /** Delete a directory (recursive) */
  deleteDirectory(path: string): void;

  /** Get file by path */
  getFile(path: string): VirtualFile | undefined;

  /** Get all files */
  getAllFiles(): VirtualFile[];

  /** Get file tree structure */
  getTree(): VirtualDirectory;

  /** Search files by name/content */
  search(query: string): VirtualFile[];
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Language detection result
 */
export interface LanguageDetection {
  language: string;
  fileType: ProjectFileType;
  previewEngine: PreviewEngine;
  confidence: number;
}

/**
 * Language detection based on file extension
 */
export const LANGUAGE_MAP: Record<string, LanguageDetection> = {
  // JavaScript/TypeScript
  '.ts': { language: 'typescript', fileType: 'script', previewEngine: 'esbuild', confidence: 1 },
  '.tsx': { language: 'tsx', fileType: 'component', previewEngine: 'esbuild', confidence: 1 },
  '.js': { language: 'javascript', fileType: 'script', previewEngine: 'esbuild', confidence: 1 },
  '.jsx': { language: 'jsx', fileType: 'component', previewEngine: 'esbuild', confidence: 1 },
  '.mjs': { language: 'javascript', fileType: 'script', previewEngine: 'esbuild', confidence: 1 },

  // Python
  '.py': { language: 'python', fileType: 'python', previewEngine: 'pyodide', confidence: 1 },
  '.pyw': { language: 'python', fileType: 'python', previewEngine: 'pyodide', confidence: 1 },
  '.ipynb': { language: 'jupyter', fileType: 'python', previewEngine: 'pyodide', confidence: 1 },

  // Web
  '.html': { language: 'html', fileType: 'page', previewEngine: 'iframe', confidence: 1 },
  '.htm': { language: 'html', fileType: 'page', previewEngine: 'iframe', confidence: 1 },
  '.css': { language: 'css', fileType: 'style', previewEngine: 'esbuild', confidence: 1 },
  '.scss': { language: 'scss', fileType: 'style', previewEngine: 'esbuild', confidence: 1 },
  '.sass': { language: 'sass', fileType: 'style', previewEngine: 'esbuild', confidence: 1 },
  '.less': { language: 'less', fileType: 'style', previewEngine: 'esbuild', confidence: 1 },

  // Data
  '.json': { language: 'json', fileType: 'data', previewEngine: 'json', confidence: 1 },
  '.yaml': { language: 'yaml', fileType: 'data', previewEngine: 'json', confidence: 1 },
  '.yml': { language: 'yaml', fileType: 'data', previewEngine: 'json', confidence: 1 },
  '.toml': { language: 'toml', fileType: 'config', previewEngine: 'json', confidence: 1 },
  '.csv': { language: 'csv', fileType: 'data', previewEngine: 'json', confidence: 1 },

  // Documentation
  '.md': { language: 'markdown', fileType: 'documentation', previewEngine: 'markdown', confidence: 1 },
  '.mdx': { language: 'mdx', fileType: 'documentation', previewEngine: 'markdown', confidence: 1 },

  // Config
  '.env': { language: 'dotenv', fileType: 'config', previewEngine: 'none', confidence: 1 },
  '.gitignore': { language: 'gitignore', fileType: 'config', previewEngine: 'none', confidence: 1 },
  '.eslintrc': { language: 'json', fileType: 'config', previewEngine: 'json', confidence: 0.8 },
  '.prettierrc': { language: 'json', fileType: 'config', previewEngine: 'json', confidence: 0.8 },

  // Agent/Workflow
  '.agent': { language: 'yaml', fileType: 'agent', previewEngine: 'reactflow', confidence: 1 },
  '.workflow': { language: 'yaml', fileType: 'workflow', previewEngine: 'reactflow', confidence: 1 },
  '.mermaid': { language: 'mermaid', fileType: 'workflow', previewEngine: 'mermaid', confidence: 1 },

  // Test
  '.test.ts': { language: 'typescript', fileType: 'test', previewEngine: 'terminal', confidence: 1 },
  '.test.tsx': { language: 'tsx', fileType: 'test', previewEngine: 'terminal', confidence: 1 },
  '.spec.ts': { language: 'typescript', fileType: 'test', previewEngine: 'terminal', confidence: 1 },
  '.spec.tsx': { language: 'tsx', fileType: 'test', previewEngine: 'terminal', confidence: 1 },

  // Images (no preview in code context)
  '.png': { language: 'binary', fileType: 'asset', previewEngine: 'none', confidence: 1 },
  '.jpg': { language: 'binary', fileType: 'asset', previewEngine: 'none', confidence: 1 },
  '.jpeg': { language: 'binary', fileType: 'asset', previewEngine: 'none', confidence: 1 },
  '.gif': { language: 'binary', fileType: 'asset', previewEngine: 'none', confidence: 1 },
  '.svg': { language: 'svg', fileType: 'asset', previewEngine: 'iframe', confidence: 1 },
  '.ico': { language: 'binary', fileType: 'asset', previewEngine: 'none', confidence: 1 },
};

/**
 * Detect language and file type from path
 */
export function detectLanguage(path: string): LanguageDetection {
  const fileName = path.split('/').pop() || '';
  const parts = fileName.split('.');
  const lastPart = parts[parts.length - 1];
  const ext = fileName.includes('.') && lastPart
    ? '.' + lastPart.toLowerCase()
    : '';

  // Check for special test file patterns
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    const baseExt = lastPart ? '.' + lastPart.toLowerCase() : '';
    const testPrefix = fileName.includes('.test.') ? '.test' : '.spec';
    return LANGUAGE_MAP[`${testPrefix}${baseExt}`]
      || LANGUAGE_MAP[baseExt]
      || { language: 'text', fileType: 'other', previewEngine: 'none', confidence: 0.5 };
  }

  return LANGUAGE_MAP[ext]
    || { language: 'text', fileType: 'other', previewEngine: 'none', confidence: 0.5 };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Create new file options
 */
export interface CreateFileOptions {
  path: string;
  content?: string;
  language?: string;
  fileType?: ProjectFileType;
  isEntryPoint?: boolean;
  previewEngine?: PreviewEngine;
  generatedBy?: 'llm' | 'user' | 'template';
  generationPrompt?: string;
}

/**
 * Project creation options
 */
export interface CreateProjectOptions {
  name: string;
  description?: string;
  framework?: ProjectFramework;
  templateId?: string;
  userId: string;
  conversationId?: string;
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  output?: string;
  errors?: FileError[];
  warnings?: FileError[];
  buildTime: number;
  outputSize?: number;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
  buildLogs?: string[];
}
