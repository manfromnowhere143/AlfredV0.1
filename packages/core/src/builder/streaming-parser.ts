/**
 * Multi-File Streaming Parser
 *
 * Parses streaming LLM output into multi-file projects.
 * Designed for real-time preview updates as files are generated.
 *
 * Protocol Format:
 * ```
 * <<<PROJECT_START>>>
 * name: My Project
 * framework: react
 * description: A beautiful React application
 * <<<PROJECT_START>>>
 *
 * <<<FILE: /src/App.tsx>>>
 * import React from 'react';
 * ...file content...
 * <<<END_FILE>>>
 *
 * <<<DEPENDENCY: react@18.2.0>>>
 * <<<DEPENDENCY: tailwindcss@3.4.0:dev>>>
 *
 * <<<PROJECT_END>>>
 * ```
 */

import {
  StreamingEvent,
  ProjectStartEvent,
  FileStartEvent,
  FileContentEvent,
  FileEndEvent,
  DependencyEvent,
  ProjectEndEvent,
  StreamingParserState,
  StreamingError,
  ProjectFramework,
  ProjectFileType,
  VirtualFile,
  detectLanguage,
} from './types';
import { VirtualFileSystem, createFileSystem } from './virtual-fs';

// ============================================================================
// PROTOCOL MARKERS
// ============================================================================

const MARKERS = {
  PROJECT_START: '<<<PROJECT_START>>>',
  PROJECT_END: '<<<PROJECT_END>>>',
  FILE_START: /<<<FILE:\s*([^\s>]+)(?:\s+(\w+))?\s*>>>/,
  FILE_END: '<<<END_FILE>>>',
  DEPENDENCY: /<<<DEPENDENCY:\s*([^@>]+)@([^:>]+)(?::dev)?\s*>>>/,
  ENTRY_POINT: /<<<ENTRY:\s*([^\s>]+)\s*>>>/,
} as const;

// ============================================================================
// STREAMING PARSER CLASS
// ============================================================================

export class MultiFileStreamingParser {
  private state: StreamingParserState;
  private buffer: string = '';
  private eventListeners: Set<(event: StreamingEvent) => void> = new Set();
  private fileSystem: VirtualFileSystem;

  constructor() {
    this.state = this.createInitialState();
    this.fileSystem = createFileSystem();
  }

  /**
   * Initialize parser state
   */
  private createInitialState(): StreamingParserState {
    return {
      completedFiles: [],
      dependencies: {},
      devDependencies: {},
      errors: [],
    };
  }

  /**
   * Subscribe to streaming events
   */
  onEvent(listener: (event: StreamingEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: StreamingEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[StreamingParser] Event listener error:', error);
      }
    }
  }

  /**
   * Process incoming chunk of LLM output
   */
  processChunk(chunk: string): void {
    this.buffer += chunk;
    this.parseBuffer();
  }

  /**
   * Parse the current buffer for complete tokens
   */
  private parseBuffer(): void {
    // Project Start
    if (this.buffer.includes(MARKERS.PROJECT_START) && !this.state.currentProject) {
      const startIdx = this.buffer.indexOf(MARKERS.PROJECT_START);
      const endIdx = this.buffer.indexOf(MARKERS.PROJECT_START, startIdx + MARKERS.PROJECT_START.length);

      if (endIdx > startIdx) {
        const projectMeta = this.buffer.slice(startIdx + MARKERS.PROJECT_START.length, endIdx).trim();
        this.parseProjectStart(projectMeta);
        this.buffer = this.buffer.slice(endIdx + MARKERS.PROJECT_START.length);
      }
    }

    // File Start
    const fileMatch = this.buffer.match(MARKERS.FILE_START);
    if (fileMatch && fileMatch.index !== undefined && fileMatch[1]) {
      // If we have a current file, something went wrong - close it
      if (this.state.currentFile) {
        this.closeCurrentFile();
      }

      const filePath = fileMatch[1];
      const fileType = fileMatch[2] as ProjectFileType | undefined;

      this.startFile(filePath, fileType);
      this.buffer = this.buffer.slice(fileMatch.index + fileMatch[0].length);
    }

    // File End
    if (this.buffer.includes(MARKERS.FILE_END) && this.state.currentFile) {
      const endIdx = this.buffer.indexOf(MARKERS.FILE_END);
      const content = this.buffer.slice(0, endIdx);

      this.state.currentFile.chunks.push(content);
      this.closeCurrentFile();
      this.buffer = this.buffer.slice(endIdx + MARKERS.FILE_END.length);
    }

    // Dependency
    let depMatch;
    while ((depMatch = this.buffer.match(MARKERS.DEPENDENCY)) !== null) {
      const name = depMatch[1];
      const version = depMatch[2];
      if (name && version) {
        const isDev = depMatch[0].includes(':dev');
        this.addDependency(name, version, isDev);
      }
      this.buffer = this.buffer.replace(depMatch[0], '');
    }

    // Entry Point
    const entryMatch = this.buffer.match(MARKERS.ENTRY_POINT);
    if (entryMatch) {
      const entryPath = entryMatch[1];
      if (this.state.currentProject) {
        this.state.currentProject.entryPoint = entryPath;
      }
      this.buffer = this.buffer.replace(entryMatch[0], '');
    }

    // Project End
    if (this.buffer.includes(MARKERS.PROJECT_END)) {
      if (this.state.currentFile) {
        this.closeCurrentFile();
      }
      this.finalizeProject();
      this.buffer = this.buffer.slice(this.buffer.indexOf(MARKERS.PROJECT_END) + MARKERS.PROJECT_END.length);
    }

    // If we have a current file and content before any marker, add it as a chunk
    if (this.state.currentFile && this.buffer.length > 0) {
      const nextMarkerIdx = this.findNextMarkerIndex();
      if (nextMarkerIdx === -1) {
        // No marker found, emit all content as chunk
        this.emitFileContent(this.buffer);
        this.state.currentFile.chunks.push(this.buffer);
        this.buffer = '';
      } else if (nextMarkerIdx > 0) {
        // Content before next marker
        const content = this.buffer.slice(0, nextMarkerIdx);
        this.emitFileContent(content);
        this.state.currentFile.chunks.push(content);
        this.buffer = this.buffer.slice(nextMarkerIdx);
      }
    }
  }

  /**
   * Find the index of the next marker in buffer
   */
  private findNextMarkerIndex(): number {
    const indices = [
      this.buffer.indexOf(MARKERS.FILE_END),
      this.buffer.indexOf('<<<FILE:'),
      this.buffer.indexOf('<<<DEPENDENCY:'),
      this.buffer.indexOf(MARKERS.PROJECT_END),
    ].filter(i => i >= 0);

    return indices.length > 0 ? Math.min(...indices) : -1;
  }

  /**
   * Parse project start metadata
   */
  private parseProjectStart(meta: string): void {
    const lines = meta.split('\n');
    const project: Partial<StreamingParserState['currentProject']> = {};

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();

        switch (key) {
          case 'name':
            project.name = value;
            break;
          case 'framework':
            project.framework = value as ProjectFramework;
            break;
          case 'description':
            project.description = value;
            break;
        }
      }
    }

    this.state.currentProject = {
      name: project.name || 'Untitled Project',
      framework: project.framework || 'react',
      description: project.description,
    };

    const event: ProjectStartEvent = {
      type: 'project_start',
      projectName: this.state.currentProject.name!,
      framework: this.state.currentProject.framework!,
      description: this.state.currentProject.description,
      timestamp: Date.now(),
    };

    this.emit(event);
  }

  /**
   * Start a new file
   */
  private startFile(path: string, fileType?: ProjectFileType): void {
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    const detection = detectLanguage(normalizedPath);

    this.state.currentFile = {
      path: normalizedPath,
      chunks: [],
      language: detection.language,
      fileType: fileType || detection.fileType,
    };

    const event: FileStartEvent = {
      type: 'file_start',
      path: normalizedPath,
      language: detection.language,
      fileType: fileType || detection.fileType,
      timestamp: Date.now(),
    };

    this.emit(event);
  }

  /**
   * Emit file content chunk
   */
  private emitFileContent(content: string): void {
    if (!this.state.currentFile || !content) return;

    const event: FileContentEvent = {
      type: 'file_content',
      path: this.state.currentFile.path,
      chunk: content,
      timestamp: Date.now(),
    };

    this.emit(event);
  }

  /**
   * Close current file
   */
  private closeCurrentFile(): void {
    if (!this.state.currentFile) return;

    const content = this.state.currentFile.chunks.join('').trim();
    const detection = detectLanguage(this.state.currentFile.path);

    const file: VirtualFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      path: this.state.currentFile.path,
      name: this.state.currentFile.path.split('/').pop() || '',
      content,
      language: this.state.currentFile.language,
      fileType: this.state.currentFile.fileType,
      size: new Blob([content]).size,
      lineCount: content.split('\n').length,
      status: 'ready',
      isEntryPoint: this.state.currentFile.isEntryPoint || false,
      previewEngine: detection.previewEngine,
      version: 1,
      generatedBy: 'llm',
      updatedAt: new Date(),
    };

    this.state.completedFiles.push(file);
    this.fileSystem.createFile({
      path: file.path,
      content: file.content,
      language: file.language,
      fileType: file.fileType,
      isEntryPoint: file.isEntryPoint,
      generatedBy: 'llm',
    });

    const event: FileEndEvent = {
      type: 'file_end',
      path: file.path,
      totalSize: file.size,
      timestamp: Date.now(),
    };

    this.emit(event);
    this.state.currentFile = undefined;
  }

  /**
   * Add a dependency
   */
  private addDependency(name: string, version: string, isDev: boolean): void {
    if (isDev) {
      this.state.devDependencies[name] = version;
    } else {
      this.state.dependencies[name] = version;
    }

    const event: DependencyEvent = {
      type: 'dependency',
      name,
      version,
      isDev,
      timestamp: Date.now(),
    };

    this.emit(event);
  }

  /**
   * Finalize the project
   */
  private finalizeProject(): void {
    const event: ProjectEndEvent = {
      type: 'project_end',
      fileCount: this.state.completedFiles.length,
      totalSize: this.state.completedFiles.reduce((sum, f) => sum + f.size, 0),
      timestamp: Date.now(),
    };

    this.emit(event);
  }

  /**
   * Get current parser state
   */
  getState(): StreamingParserState {
    return { ...this.state };
  }

  /**
   * Get the file system
   */
  getFileSystem(): VirtualFileSystem {
    return this.fileSystem;
  }

  /**
   * Get all completed files
   */
  getFiles(): VirtualFile[] {
    return [...this.state.completedFiles];
  }

  /**
   * Get dependencies
   */
  getDependencies(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
    return {
      dependencies: { ...this.state.dependencies },
      devDependencies: { ...this.state.devDependencies },
    };
  }

  /**
   * Check if parsing is complete
   */
  isComplete(): boolean {
    return this.state.completedFiles.length > 0 && !this.state.currentFile;
  }

  /**
   * Get any parsing errors
   */
  getErrors(): StreamingError[] {
    return [...this.state.errors];
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.state = this.createInitialState();
    this.buffer = '';
    this.fileSystem = createFileSystem();
  }
}

// ============================================================================
// STREAMING PROTOCOL BUILDER
// ============================================================================

/**
 * Build streaming protocol output from a virtual file system
 * Used for serializing projects back to LLM format
 */
export class StreamingProtocolBuilder {
  private output: string[] = [];

  /**
   * Start a project
   */
  startProject(name: string, framework: ProjectFramework, description?: string): this {
    this.output.push(MARKERS.PROJECT_START);
    this.output.push(`name: ${name}`);
    this.output.push(`framework: ${framework}`);
    if (description) {
      this.output.push(`description: ${description}`);
    }
    this.output.push(MARKERS.PROJECT_START);
    this.output.push('');
    return this;
  }

  /**
   * Add a file
   */
  addFile(path: string, content: string, fileType?: ProjectFileType): this {
    const marker = fileType
      ? `<<<FILE: ${path} ${fileType}>>>`
      : `<<<FILE: ${path}>>>`;
    this.output.push(marker);
    this.output.push(content);
    this.output.push(MARKERS.FILE_END);
    this.output.push('');
    return this;
  }

  /**
   * Add a dependency
   */
  addDependency(name: string, version: string, isDev: boolean = false): this {
    const marker = isDev
      ? `<<<DEPENDENCY: ${name}@${version}:dev>>>`
      : `<<<DEPENDENCY: ${name}@${version}>>>`;
    this.output.push(marker);
    return this;
  }

  /**
   * Set entry point
   */
  setEntryPoint(path: string): this {
    this.output.push(`<<<ENTRY: ${path}>>>`);
    return this;
  }

  /**
   * End the project
   */
  endProject(): this {
    this.output.push('');
    this.output.push(MARKERS.PROJECT_END);
    return this;
  }

  /**
   * Build the final output string
   */
  build(): string {
    return this.output.join('\n');
  }

  /**
   * Build from a file system
   */
  static fromFileSystem(
    fs: VirtualFileSystem,
    name: string,
    framework: ProjectFramework,
    dependencies?: Record<string, string>,
    devDependencies?: Record<string, string>,
    description?: string
  ): string {
    const builder = new StreamingProtocolBuilder();
    builder.startProject(name, framework, description);

    // Add dependencies
    if (dependencies) {
      for (const [dep, version] of Object.entries(dependencies)) {
        builder.addDependency(dep, version, false);
      }
    }
    if (devDependencies) {
      for (const [dep, version] of Object.entries(devDependencies)) {
        builder.addDependency(dep, version, true);
      }
    }

    // Add files
    const files = fs.getAllFiles();
    const entryPoint = files.find(f => f.isEntryPoint);

    if (entryPoint) {
      builder.setEntryPoint(entryPoint.path);
    }

    for (const file of files) {
      builder.addFile(file.path, file.content, file.fileType);
    }

    builder.endProject();
    return builder.build();
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new streaming parser
 */
export function createStreamingParser(): MultiFileStreamingParser {
  return new MultiFileStreamingParser();
}

/**
 * Parse complete LLM output (non-streaming)
 */
export function parseMultiFileOutput(output: string): {
  fileSystem: VirtualFileSystem;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  errors: StreamingError[];
} {
  const parser = createStreamingParser();
  parser.processChunk(output);

  return {
    fileSystem: parser.getFileSystem(),
    dependencies: parser.getDependencies().dependencies,
    devDependencies: parser.getDependencies().devDependencies,
    errors: parser.getErrors(),
  };
}

/**
 * Generate LLM prompt for multi-file project generation
 */
export function generateMultiFilePrompt(requirements: string, framework: ProjectFramework = 'react'): string {
  return `You are a world-class software engineer. Generate a complete multi-file project based on the following requirements.

## Requirements
${requirements}

## Output Format
Use this exact format for your response:

<<<PROJECT_START>>>
name: [Project Name]
framework: ${framework}
description: [Brief description]
<<<PROJECT_START>>>

<<<DEPENDENCY: package-name@version>>>
<<<DEPENDENCY: dev-package@version:dev>>>

<<<ENTRY: /src/main.tsx>>>

<<<FILE: /src/main.tsx>>>
[File content here]
<<<END_FILE>>>

<<<FILE: /src/App.tsx>>>
[File content here]
<<<END_FILE>>>

<<<PROJECT_END>>>

## Guidelines
1. Create a complete, working project structure
2. Include all necessary files (components, styles, configs)
3. Use modern best practices
4. Include proper TypeScript types where applicable
5. Add helpful comments for complex logic
6. Make the code clean and maintainable

Generate the complete project now:`;
}
