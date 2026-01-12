/**
 * Virtual File System
 *
 * In-memory file system for Alfred Builder projects.
 * Designed for speed, immutability, and seamless preview integration.
 *
 * Features:
 * - O(1) file access by path
 * - Automatic language detection
 * - File tree generation for UI
 * - Change tracking for HMR
 * - Snapshot/restore for versioning
 */

import {
  VirtualFile,
  VirtualDirectory,
  FileTreeOperations,
  CreateFileOptions,
  FileError,
  FileStatus,
  ProjectFileType,
  detectLanguage,
} from './types';

// ============================================================================
// VIRTUAL FILE SYSTEM CLASS
// ============================================================================

export class VirtualFileSystem implements FileTreeOperations {
  private files: Map<string, VirtualFile> = new Map();
  private changeListeners: Set<(changes: FileChange[]) => void> = new Set();
  private pendingChanges: FileChange[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(initialFiles?: VirtualFile[] | Map<string, VirtualFile>) {
    if (initialFiles) {
      if (Array.isArray(initialFiles)) {
        initialFiles.forEach(file => this.files.set(file.path, file));
      } else {
        this.files = new Map(initialFiles);
      }
    }
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Create a new file
   */
  createFile(pathOrOptions: string | CreateFileOptions, content: string = ''): VirtualFile {
    const options: CreateFileOptions = typeof pathOrOptions === 'string'
      ? { path: pathOrOptions, content }
      : pathOrOptions;

    const path = this.normalizePath(options.path);
    const name = this.getFileName(path);
    const detection = detectLanguage(path);

    const file: VirtualFile = {
      id: this.generateId(),
      path,
      name,
      content: options.content || '',
      language: options.language || detection.language,
      fileType: options.fileType || detection.fileType,
      size: new Blob([options.content || '']).size,
      lineCount: (options.content || '').split('\n').length,
      status: 'pristine',
      isEntryPoint: options.isEntryPoint || false,
      previewEngine: options.previewEngine || detection.previewEngine,
      version: 1,
      generatedBy: options.generatedBy,
      generationPrompt: options.generationPrompt,
      updatedAt: new Date(),
    };

    this.files.set(path, file);
    this.recordChange({ type: 'create', path, file });
    return file;
  }

  /**
   * Update file content
   */
  updateFile(path: string, content: string): VirtualFile {
    const normalizedPath = this.normalizePath(path);
    const existing = this.files.get(normalizedPath);

    if (!existing) {
      // Auto-create if doesn't exist
      return this.createFile(normalizedPath, content);
    }

    const updated: VirtualFile = {
      ...existing,
      content,
      size: new Blob([content]).size,
      lineCount: content.split('\n').length,
      status: 'modified',
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    this.files.set(normalizedPath, updated);
    this.recordChange({ type: 'update', path: normalizedPath, file: updated });
    return updated;
  }

  /**
   * Patch file content (partial update)
   */
  patchFile(
    path: string,
    patch: Partial<Pick<VirtualFile, 'content' | 'status' | 'errors' | 'isEntryPoint' | 'previewEngine'>>
  ): VirtualFile | undefined {
    const normalizedPath = this.normalizePath(path);
    const existing = this.files.get(normalizedPath);

    if (!existing) return undefined;

    const updated: VirtualFile = {
      ...existing,
      ...patch,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    // Recalculate size and line count if content changed
    if (patch.content !== undefined) {
      updated.size = new Blob([patch.content]).size;
      updated.lineCount = patch.content.split('\n').length;
    }

    this.files.set(normalizedPath, updated);
    this.recordChange({ type: 'update', path: normalizedPath, file: updated });
    return updated;
  }

  /**
   * Delete a file
   */
  deleteFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const existed = this.files.has(normalizedPath);

    if (existed) {
      this.files.delete(normalizedPath);
      this.recordChange({ type: 'delete', path: normalizedPath });
    }

    return existed;
  }

  /**
   * Rename/move a file
   */
  moveFile(oldPath: string, newPath: string): VirtualFile {
    const normalizedOld = this.normalizePath(oldPath);
    const normalizedNew = this.normalizePath(newPath);
    const existing = this.files.get(normalizedOld);

    if (!existing) {
      throw new Error(`File not found: ${oldPath}`);
    }

    // Detect new language/type if extension changed
    const detection = detectLanguage(normalizedNew);
    const newName = this.getFileName(normalizedNew);

    const moved: VirtualFile = {
      ...existing,
      path: normalizedNew,
      name: newName,
      language: detection.language,
      fileType: detection.fileType,
      previewEngine: detection.previewEngine,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    this.files.delete(normalizedOld);
    this.files.set(normalizedNew, moved);
    this.recordChange({ type: 'delete', path: normalizedOld });
    this.recordChange({ type: 'create', path: normalizedNew, file: moved });

    return moved;
  }

  /**
   * Create a directory (virtual - just for tree organization)
   */
  createDirectory(_path: string): void {
    // Virtual FS doesn't need explicit directory creation
    // Directories are inferred from file paths
  }

  /**
   * Delete a directory (and all contents)
   */
  deleteDirectory(path: string): void {
    const normalizedPath = this.normalizePath(path);
    const toDelete: string[] = [];

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedPath + '/') || filePath === normalizedPath) {
        toDelete.push(filePath);
      }
    }

    toDelete.forEach(p => {
      this.files.delete(p);
      this.recordChange({ type: 'delete', path: p });
    });
  }

  /**
   * Get file by path
   */
  getFile(path: string): VirtualFile | undefined {
    return this.files.get(this.normalizePath(path));
  }

  /**
   * Get all files
   */
  getAllFiles(): VirtualFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * Get total size
   */
  getTotalSize(): number {
    let total = 0;
    for (const file of this.files.values()) {
      total += file.size;
    }
    return total;
  }

  /**
   * Check if path exists
   */
  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path));
  }

  // ==========================================================================
  // FILE TREE
  // ==========================================================================

  /**
   * Get file tree structure for UI
   */
  getTree(): VirtualDirectory {
    const root: VirtualDirectory = {
      path: '/',
      name: 'root',
      children: [],
    };

    // Sort files by path
    const sortedPaths = Array.from(this.files.keys()).sort();

    for (const filePath of sortedPaths) {
      const file = this.files.get(filePath)!;
      const parts = filePath.split('/').filter(Boolean);
      let current = root;

      // Navigate/create directory structure
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i]!; // Safe: we're iterating within bounds
        const dirPath = '/' + parts.slice(0, i + 1).join('/');

        const existingDir = current.children.find(
          (c): c is VirtualDirectory => 'children' in c && c.name === dirName
        );

        if (existingDir) {
          current = existingDir;
        } else {
          const newDir: VirtualDirectory = {
            path: dirPath,
            name: dirName,
            children: [],
            isExpanded: true,
          };
          current.children.push(newDir);
          current = newDir;
        }
      }

      // Add file to current directory
      current.children.push(file);
    }

    // Sort children: directories first, then files, alphabetically
    this.sortDirectory(root);

    return root;
  }

  /**
   * Recursively sort directory contents
   */
  private sortDirectory(dir: VirtualDirectory): void {
    dir.children.sort((a, b) => {
      const aIsDir = 'children' in a;
      const bIsDir = 'children' in b;

      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const child of dir.children) {
      if ('children' in child) {
        this.sortDirectory(child);
      }
    }
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * Search files by name or content
   */
  search(query: string): VirtualFile[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: VirtualFile[] = [];

    for (const file of this.files.values()) {
      // Search in path/name
      if (file.path.toLowerCase().includes(lowerQuery)) {
        results.push(file);
        continue;
      }

      // Search in content
      if (file.content.toLowerCase().includes(lowerQuery)) {
        results.push(file);
      }
    }

    return results;
  }

  /**
   * Find files by file type
   */
  findByType(fileType: ProjectFileType): VirtualFile[] {
    return Array.from(this.files.values()).filter(f => f.fileType === fileType);
  }

  /**
   * Find files by language
   */
  findByLanguage(language: string): VirtualFile[] {
    return Array.from(this.files.values()).filter(f => f.language === language);
  }

  /**
   * Find files with errors
   */
  findWithErrors(): VirtualFile[] {
    return Array.from(this.files.values()).filter(
      f => f.errors && f.errors.length > 0
    );
  }

  /**
   * Get entry point file
   */
  getEntryPoint(): VirtualFile | undefined {
    return Array.from(this.files.values()).find(f => f.isEntryPoint);
  }

  // ==========================================================================
  // ERROR MANAGEMENT
  // ==========================================================================

  /**
   * Set errors for a file
   */
  setErrors(path: string, errors: FileError[]): void {
    const file = this.getFile(path);
    if (file) {
      this.patchFile(path, {
        errors,
        status: errors.length > 0 ? 'error' : 'ready',
      });
    }
  }

  /**
   * Clear errors for a file
   */
  clearErrors(path: string): void {
    this.setErrors(path, []);
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    for (const file of this.files.values()) {
      if (file.errors && file.errors.length > 0) {
        this.clearErrors(file.path);
      }
    }
  }

  /**
   * Set status for a file
   */
  setStatus(path: string, status: FileStatus): void {
    this.patchFile(path, { status });
  }

  /**
   * Set all files to a status
   */
  setAllStatus(status: FileStatus): void {
    for (const file of this.files.values()) {
      this.patchFile(file.path, { status });
    }
  }

  // ==========================================================================
  // CHANGE TRACKING
  // ==========================================================================

  /**
   * Subscribe to file changes
   */
  onChange(listener: (changes: FileChange[]) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Record a change and debounce notifications
   */
  private recordChange(change: FileChange): void {
    this.pendingChanges.push(change);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const changes = [...this.pendingChanges];
      this.pendingChanges = [];
      this.notifyListeners(changes);
    }, 50);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(changes: FileChange[]): void {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        console.error('[VirtualFS] Change listener error:', error);
      }
    }
  }

  /**
   * Get changes since last snapshot
   */
  getModifiedFiles(): VirtualFile[] {
    return Array.from(this.files.values()).filter(f => f.status === 'modified');
  }

  // ==========================================================================
  // SNAPSHOT & RESTORE
  // ==========================================================================

  /**
   * Create a snapshot of current state
   */
  snapshot(): FileSystemSnapshot {
    return {
      files: Array.from(this.files.values()).map(f => ({ ...f })),
      timestamp: new Date(),
    };
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: FileSystemSnapshot): void {
    this.files.clear();
    for (const file of snapshot.files) {
      this.files.set(file.path, { ...file, status: 'pristine' });
    }
    this.recordChange({ type: 'restore' });
  }

  /**
   * Clone the file system
   */
  clone(): VirtualFileSystem {
    const cloned = new VirtualFileSystem();
    for (const [path, file] of this.files) {
      cloned.files.set(path, { ...file });
    }
    return cloned;
  }

  /**
   * Clear all files
   */
  clear(): void {
    this.files.clear();
    this.recordChange({ type: 'clear' });
  }

  // ==========================================================================
  // IMPORT/EXPORT
  // ==========================================================================

  /**
   * Export to plain object
   */
  toJSON(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [path, file] of this.files) {
      result[path] = file.content;
    }
    return result;
  }

  /**
   * Import from plain object
   */
  fromJSON(files: Record<string, string>, options?: { generatedBy?: 'llm' | 'user' | 'template' }): void {
    for (const [path, content] of Object.entries(files)) {
      this.createFile({
        path,
        content,
        generatedBy: options?.generatedBy,
      });
    }
  }

  /**
   * Export to file array (for database storage)
   */
  toArray(): VirtualFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Import from file array
   */
  fromArray(files: VirtualFile[]): void {
    this.clear();
    for (const file of files) {
      this.files.set(file.path, { ...file });
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Normalize path (ensure leading slash, no trailing slash)
   */
  private normalizePath(path: string): string {
    let normalized = path.replace(/\\/g, '/'); // Windows paths
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    if (normalized.endsWith('/') && normalized !== '/') {
      normalized = normalized.slice(0, -1);
    }
    // Remove double slashes
    normalized = normalized.replace(/\/+/g, '/');
    return normalized;
  }

  /**
   * Get file name from path
   */
  private getFileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface FileChange {
  type: 'create' | 'update' | 'delete' | 'restore' | 'clear';
  path?: string;
  file?: VirtualFile;
}

export interface FileSystemSnapshot {
  files: VirtualFile[];
  timestamp: Date;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new virtual file system
 */
export function createFileSystem(files?: VirtualFile[] | Map<string, VirtualFile>): VirtualFileSystem {
  return new VirtualFileSystem(files);
}

/**
 * Create file system from JSON object
 */
export function createFileSystemFromJSON(
  files: Record<string, string>,
  options?: { generatedBy?: 'llm' | 'user' | 'template' }
): VirtualFileSystem {
  const fs = new VirtualFileSystem();
  fs.fromJSON(files, options);
  return fs;
}

/**
 * Create file system with React template
 */
export function createReactFileSystem(componentName: string = 'App'): VirtualFileSystem {
  const fs = new VirtualFileSystem();

  fs.createFile({
    path: '/src/main.tsx',
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import ${componentName} from './${componentName}';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <${componentName} />
  </React.StrictMode>
);
`,
    isEntryPoint: true,
    generatedBy: 'template',
  });

  fs.createFile({
    path: `/src/${componentName}.tsx`,
    content: `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Hello, Alfred!</h1>
        <p className="text-lg opacity-80">Start building something amazing.</p>
      </div>
    </div>
  );
}
`,
    generatedBy: 'template',
  });

  fs.createFile({
    path: '/src/index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, -apple-system, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
`,
    generatedBy: 'template',
  });

  fs.createFile({
    path: '/index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alfred Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    generatedBy: 'template',
  });

  return fs;
}

/**
 * Create file system with Python template
 */
export function createPythonFileSystem(moduleName: string = 'main'): VirtualFileSystem {
  const fs = new VirtualFileSystem();

  fs.createFile({
    path: `/${moduleName}.py`,
    content: `"""
Alfred Python Project
"""

def main():
    print("Hello from Alfred!")

if __name__ == "__main__":
    main()
`,
    isEntryPoint: true,
    generatedBy: 'template',
  });

  fs.createFile({
    path: '/requirements.txt',
    content: `# Python dependencies
numpy
pandas
matplotlib
`,
    generatedBy: 'template',
  });

  return fs;
}
