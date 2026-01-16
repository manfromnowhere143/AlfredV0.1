/**
 * Multi-File Streaming Parser - STATE OF THE ART
 *
 * Parses streaming LLM output into multi-file projects.
 * Supports DUAL FORMAT: Both <<<MARKER>>> and <boltArtifact> protocols.
 *
 * This ensures compatibility regardless of which format the LLM uses.
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
// DUAL FORMAT MARKERS
// ============================================================================

const MARKERS = {
  // <<<MARKER>>> Protocol
  PROJECT_START: '<<<PROJECT_START>>>',
  PROJECT_END: '<<<PROJECT_END>>>',
  FILE_START: /<<<FILE:\s*([^\s>]+)(?:\s+([^>]+))?\s*>>>/,
  FILE_END: /<<<\s*END_FILE\s*>>>/i,
  FILE_END_STR: '<<<END_FILE>>>',
  DEPENDENCY: /<<<DEPENDENCY:\s*([^@>]+)@([^:>]+)(?::dev)?\s*>>>/,
  ENTRY_POINT: /<<<ENTRY:\s*([^\s>]+)\s*>>>/,
  PROJECT_START_INLINE: /<<<PROJECT_START>>>\s*(\S+)\s+(\S+)/,

  // <boltArtifact> Protocol (Bolt/Lovable style)
  BOLT_ARTIFACT_START: /<boltArtifact[^>]*id="([^"]*)"[^>]*title="([^"]*)"[^>]*>/,
  BOLT_ARTIFACT_END: /<\/boltArtifact>/,
  BOLT_FILE_START: /<boltAction[^>]*type="file"[^>]*filePath="([^"]*)"[^>]*>/,
  BOLT_FILE_END: /<\/boltAction>/,
} as const;

// ============================================================================
// STREAMING PARSER CLASS
// ============================================================================

export class MultiFileStreamingParser {
  private state: StreamingParserState;
  private buffer: string = '';
  private eventListeners: Set<(event: StreamingEvent) => void> = new Set();
  private fileSystem: VirtualFileSystem;
  private detectedFormat: 'marker' | 'bolt' | 'unknown' = 'unknown';

  constructor() {
    this.state = this.createInitialState();
    this.fileSystem = createFileSystem();
  }

  private createInitialState(): StreamingParserState {
    return {
      completedFiles: [],
      dependencies: {},
      devDependencies: {},
      errors: [],
    };
  }

  onEvent(listener: (event: StreamingEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(event: StreamingEvent): void {
    console.log('[Parser] 📤 Emitting event:', event.type, (event as any).path || (event as any).projectName || '');
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[StreamingParser] Event listener error:', error);
      }
    }
  }

  processChunk(chunk: string): void {
    this.buffer += chunk;

    // Debug: Log buffer info more aggressively
    const hasMarkers = this.buffer.includes('<<<FILE:') || this.buffer.includes('<<<PROJECT');
    if (hasMarkers || this.buffer.length % 1000 < chunk.length) {
      console.log('[Parser] 📊 Buffer size:', this.buffer.length, '| Format:', this.detectedFormat, '| Has markers:', hasMarkers);
    }

    // Auto-detect format on first significant content
    if (this.detectedFormat === 'unknown') {
      if (this.buffer.includes('<boltArtifact') || this.buffer.includes('<boltAction')) {
        this.detectedFormat = 'bolt';
        console.log('[Parser] 🔍 Detected BOLT format');
      } else if (this.buffer.includes('<<<PROJECT_START') || this.buffer.includes('<<<FILE:')) {
        this.detectedFormat = 'marker';
        console.log('[Parser] 🔍 Detected MARKER format');
      }

      // Debug: If we have a lot of buffer but no format detected, log it
      if (this.buffer.length > 200 && this.detectedFormat === 'unknown') {
        console.log('[Parser] ⚠️ Large buffer but no format detected. Preview:', this.buffer.slice(0, 150));
      }
    }

    // Parse buffer repeatedly until no more complete markers are found
    let lastBufferLength = -1;
    let iterations = 0;
    const maxIterations = 100; // Safety limit

    console.log('[Parser] 🔄 Starting parse loop, buffer length:', this.buffer.length);

    while (this.buffer.length !== lastBufferLength && iterations < maxIterations) {
      lastBufferLength = this.buffer.length;
      iterations++;

      if (this.detectedFormat === 'bolt') {
        this.parseBoltFormat();
      } else {
        this.parseMarkerFormat();
      }
    }

    console.log('[Parser] 🔄 Parse loop done. Iterations:', iterations, '| Completed files:', this.state.completedFiles.length);
  }

  // ==========================================================================
  // BOLT FORMAT PARSING (<boltArtifact>)
  // ==========================================================================

  private parseBoltFormat(): void {
    // Artifact Start
    if (!this.state.currentProject) {
      const artifactMatch = this.buffer.match(MARKERS.BOLT_ARTIFACT_START);
      if (artifactMatch) {
        const projectName = artifactMatch[2] || artifactMatch[1] || 'Project';
        this.state.currentProject = {
          name: projectName,
          framework: 'react',
          description: undefined,
        };

        const event: ProjectStartEvent = {
          type: 'project_start',
          projectName,
          framework: 'react',
          timestamp: Date.now(),
        };
        this.emit(event);

        // Remove the matched artifact start
        this.buffer = this.buffer.slice(artifactMatch.index! + artifactMatch[0].length);
      }
    }

    // File Start
    const fileMatch = this.buffer.match(MARKERS.BOLT_FILE_START);
    if (fileMatch && fileMatch.index !== undefined && fileMatch[1]) {
      // Close any open file first
      if (this.state.currentFile) {
        this.closeCurrentFile();
      }

      const filePath = fileMatch[1];
      const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
      const detection = detectLanguage(normalizedPath);

      this.state.currentFile = {
        path: normalizedPath,
        chunks: [],
        language: detection.language,
        fileType: detection.fileType,
        isEntryPoint: normalizedPath.includes('main.tsx') || normalizedPath.includes('index.tsx'),
      };

      const event: FileStartEvent = {
        type: 'file_start',
        path: normalizedPath,
        language: detection.language,
        fileType: detection.fileType,
        isEntryPoint: this.state.currentFile.isEntryPoint || false,
        timestamp: Date.now(),
      };
      this.emit(event);

      this.buffer = this.buffer.slice(fileMatch.index + fileMatch[0].length);
    }

    // File End
    if (this.state.currentFile) {
      const fileEndIdx = this.buffer.indexOf('</boltAction>');
      if (fileEndIdx !== -1) {
        const content = this.buffer.slice(0, fileEndIdx);
        // CRITICAL: Emit file_content so PreviewManager can sync its file system
        if (content.length > 0) {
          this.emitFileContent(content);
          this.state.currentFile.chunks.push(content);
        }
        this.closeCurrentFile();
        this.buffer = this.buffer.slice(fileEndIdx + '</boltAction>'.length);
      }
    }

    // Artifact End
    const artifactEndIdx = this.buffer.indexOf('</boltArtifact>');
    if (artifactEndIdx !== -1) {
      if (this.state.currentFile) {
        // Emit any remaining content before closing
        const remainingContent = this.buffer.slice(0, artifactEndIdx);
        if (remainingContent.length > 0) {
          this.emitFileContent(remainingContent);
          this.state.currentFile.chunks.push(remainingContent);
        }
        this.closeCurrentFile();
      }
      this.finalizeProject();
      this.buffer = this.buffer.slice(artifactEndIdx + '</boltArtifact>'.length);
    }

    // Buffer content for current file
    if (this.state.currentFile && this.buffer.length > 0) {
      const nextTagIdx = this.findNextBoltTag();
      if (nextTagIdx === -1) {
        // Check for partial tag
        const partialIdx = this.buffer.lastIndexOf('<');
        if (partialIdx > 0 && partialIdx > this.buffer.length - 50) {
          const content = this.buffer.slice(0, partialIdx);
          if (content.length > 0) {
            this.emitFileContent(content);
            this.state.currentFile.chunks.push(content);
          }
          this.buffer = this.buffer.slice(partialIdx);
        }
      } else if (nextTagIdx > 0) {
        const content = this.buffer.slice(0, nextTagIdx);
        this.emitFileContent(content);
        this.state.currentFile.chunks.push(content);
        this.buffer = this.buffer.slice(nextTagIdx);
      }
    }
  }

  private findNextBoltTag(): number {
    const indices = [
      this.buffer.indexOf('</boltAction>'),
      this.buffer.indexOf('<boltAction'),
      this.buffer.indexOf('</boltArtifact>'),
    ].filter(i => i >= 0);

    return indices.length > 0 ? Math.min(...indices) : -1;
  }

  // ==========================================================================
  // MARKER FORMAT PARSING (<<<MARKER>>>)
  // ==========================================================================

  private parseMarkerFormat(): void {
    // Project Start
    if (this.buffer.includes(MARKERS.PROJECT_START) && !this.state.currentProject) {
      const inlineMatch = this.buffer.match(MARKERS.PROJECT_START_INLINE);

      if (inlineMatch && inlineMatch[1] && inlineMatch[2]) {
        const projectName = inlineMatch[1];
        const framework = inlineMatch[2] as ProjectFramework;

        const afterMatch = this.buffer.slice(inlineMatch.index! + inlineMatch[0].length);
        const nextMarkerIdx = this.findNextMarkerIndexIn(afterMatch);
        const description = nextMarkerIdx > 0
          ? afterMatch.slice(0, nextMarkerIdx).trim().split('\n')[0]?.trim()
          : undefined;

        this.state.currentProject = {
          name: projectName,
          framework: framework,
          description: description && description.length > 0 ? description : undefined,
        };

        const event: ProjectStartEvent = {
          type: 'project_start',
          projectName,
          framework,
          description: this.state.currentProject.description,
          timestamp: Date.now(),
        };
        this.emit(event);

        const consumeIdx = inlineMatch.index! + inlineMatch[0].length + (description ? description.length + 1 : 0);
        this.buffer = this.buffer.slice(consumeIdx);
      } else {
        const startIdx = this.buffer.indexOf(MARKERS.PROJECT_START);
        const endIdx = this.buffer.indexOf(MARKERS.PROJECT_START, startIdx + MARKERS.PROJECT_START.length);

        if (endIdx > startIdx) {
          const projectMeta = this.buffer.slice(startIdx + MARKERS.PROJECT_START.length, endIdx).trim();
          this.parseProjectStart(projectMeta);
          this.buffer = this.buffer.slice(endIdx + MARKERS.PROJECT_START.length);
        }
      }
    }

    // Dependencies
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

    // File Start
    const fileMatch = this.buffer.match(MARKERS.FILE_START);
    if (fileMatch && fileMatch.index !== undefined && fileMatch[1]) {
      if (this.state.currentFile) {
        console.log('[Parser] ⚠️ Auto-closing file (no END_FILE):', this.state.currentFile.path);
        this.closeCurrentFile();
      }

      const filePath = fileMatch[1];
      const metadataStr = fileMatch[2]?.trim() || '';
      const metadataParts = metadataStr.split(/\s+/).filter(Boolean);

      const language = metadataParts[0];
      const fileType = metadataParts[1] as ProjectFileType | undefined;
      const isEntry = metadataParts.includes('entry');

      this.startFile(filePath, fileType, language, isEntry);
      this.buffer = this.buffer.slice(fileMatch.index + fileMatch[0].length);
    }

    // File End
    const fileEndMatch = this.buffer.match(MARKERS.FILE_END);
    if (fileEndMatch && this.state.currentFile) {
      const endIdx = fileEndMatch.index!;
      const content = this.buffer.slice(0, endIdx);

      console.log('[Parser] ✅ Closing file:', this.state.currentFile.path, '| Content:', content.length, 'chars');

      this.state.currentFile.chunks.push(content);
      this.closeCurrentFile();
      this.buffer = this.buffer.slice(endIdx + fileEndMatch[0].length);
    }

    // Project End
    if (this.buffer.includes(MARKERS.PROJECT_END)) {
      const projectEndIdx = this.buffer.indexOf(MARKERS.PROJECT_END);
      const fileStartIdx = this.buffer.search(/<<<FILE:/);

      if (fileStartIdx === -1 || fileStartIdx > projectEndIdx) {
        if (this.state.currentFile) {
          console.log('[Parser] ⚠️ Auto-closing file at PROJECT_END:', this.state.currentFile.path);
          this.closeCurrentFile();
        }
        console.log('[Parser] ✅ Project complete! Files:', this.state.completedFiles.length);
        this.finalizeProject();
        this.buffer = this.buffer.slice(projectEndIdx + MARKERS.PROJECT_END.length);
      }
    }

    // Buffer content for current file
    if (this.state.currentFile && this.buffer.length > 0) {
      const nextMarkerIdx = this.findNextMarkerIndex();

      if (nextMarkerIdx === -1) {
        const partialMarkerIdx = this.findPartialMarkerIndex();

        if (partialMarkerIdx >= 0 && partialMarkerIdx < this.buffer.length) {
          const content = this.buffer.slice(0, partialMarkerIdx);
          if (content.length > 0) {
            this.emitFileContent(content);
            this.state.currentFile.chunks.push(content);
          }
          this.buffer = this.buffer.slice(partialMarkerIdx);
        } else {
          this.emitFileContent(this.buffer);
          this.state.currentFile.chunks.push(this.buffer);
          this.buffer = '';
        }
      } else if (nextMarkerIdx > 0) {
        const content = this.buffer.slice(0, nextMarkerIdx);
        this.emitFileContent(content);
        this.state.currentFile.chunks.push(content);
        this.buffer = this.buffer.slice(nextMarkerIdx);
      }
    }
  }

  private findPartialMarkerIndex(): number {
    const markerStarts = ['<<<', '<<', '<'];

    for (const start of markerStarts) {
      const idx = this.buffer.lastIndexOf(start);
      if (idx >= 0 && idx >= this.buffer.length - 30) {
        const remainder = this.buffer.slice(idx);
        if (remainder.includes('<<<') && !remainder.includes('>>>')) {
          return idx;
        }
      }
    }
    return -1;
  }

  private findNextMarkerIndex(): number {
    return this.findNextMarkerIndexIn(this.buffer);
  }

  private findNextMarkerIndexIn(str: string): number {
    const fileEndMatch = str.match(MARKERS.FILE_END);
    const fileEndIdx = fileEndMatch?.index ?? -1;

    const indices = [
      fileEndIdx,
      str.indexOf('<<<FILE:'),
      str.indexOf('<<<DEPENDENCY:'),
      str.indexOf(MARKERS.PROJECT_END),
      str.indexOf('<<<ENTRY:'),
      str.search(/<<<\s*file:/i),
      str.search(/<<<\s*project_end\s*>>>/i),
    ].filter(i => i >= 0);

    return indices.length > 0 ? Math.min(...indices) : -1;
  }

  // ==========================================================================
  // SHARED METHODS
  // ==========================================================================

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

  private startFile(path: string, fileType?: ProjectFileType, language?: string, isEntry?: boolean): void {
    // Validate path - must start with / or be a valid relative path
    const cleanPath = path.trim();
    if (!cleanPath || cleanPath.length < 2 || !cleanPath.match(/^[\/.]?[a-zA-Z0-9_\-\/\.]+$/)) {
      console.warn('[Parser] ⚠️ Invalid file path, skipping:', path);
      return;
    }

    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    const detection = detectLanguage(normalizedPath);

    const finalLanguage = language || detection.language;
    const finalFileType = fileType || detection.fileType;

    this.state.currentFile = {
      path: normalizedPath,
      chunks: [],
      language: finalLanguage,
      fileType: finalFileType,
      isEntryPoint: isEntry || false,
    };

    console.log('[Parser] 📂 Starting file:', normalizedPath);

    const event: FileStartEvent = {
      type: 'file_start',
      path: normalizedPath,
      language: finalLanguage,
      fileType: finalFileType,
      isEntryPoint: isEntry || false,
      timestamp: Date.now(),
    };
    this.emit(event);
  }

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

  private closeCurrentFile(): void {
    if (!this.state.currentFile) return;

    // Join chunks and STRIP any streaming markers that might have leaked through
    const rawContent = this.state.currentFile.chunks.join('');
    const content = rawContent
      .replace(/<<<\s*END_FILE\s*>>>/gi, '')
      .replace(/<<<FILE:[^>]+>>>/gi, '')
      .replace(/<<<\s*PROJECT_START\s*>>>/gi, '')
      .replace(/<<<\s*PROJECT_END\s*>>>/gi, '')
      .replace(/<<<DEPENDENCY:[^>]+>>>/gi, '')
      .replace(/<<<ENTRY:[^>]+>>>/gi, '')
      .trim();

    console.log('[Parser] 🧹 Content cleaned:', rawContent.length, '->', content.length, 'bytes');
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

    console.log('[Parser] 📁 File completed:', file.path, '| Size:', file.size, '| Lines:', file.lineCount);

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

  private addDependency(name: string, version: string, isDev: boolean): void {
    // Validate dependency name and version
    const cleanName = name?.trim();
    const cleanVersion = version?.trim();

    if (!cleanName || !cleanVersion) {
      console.warn('[Parser] ⚠️ Invalid dependency, skipping:', name, version);
      return;
    }

    // Valid npm package name pattern
    if (!cleanName.match(/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i)) {
      console.warn('[Parser] ⚠️ Invalid package name, skipping:', cleanName);
      return;
    }

    // Valid version pattern (semver-like)
    if (!cleanVersion.match(/^[\^~>=<]?[0-9]/)) {
      console.warn('[Parser] ⚠️ Invalid version, skipping:', cleanVersion);
      return;
    }

    if (isDev) {
      this.state.devDependencies[cleanName] = cleanVersion;
    } else {
      this.state.dependencies[cleanName] = cleanVersion;
    }

    console.log('[Parser] 📦 Adding dependency:', cleanName, '@', cleanVersion);

    const event: DependencyEvent = {
      type: 'dependency',
      name: cleanName,
      version: cleanVersion,
      isDev,
      timestamp: Date.now(),
    };
    this.emit(event);
  }

  private finalizeProject(): void {
    const event: ProjectEndEvent = {
      type: 'project_end',
      fileCount: this.state.completedFiles.length,
      totalSize: this.state.completedFiles.reduce((sum, f) => sum + f.size, 0),
      timestamp: Date.now(),
    };
    this.emit(event);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  getState(): StreamingParserState {
    return { ...this.state };
  }

  getFileSystem(): VirtualFileSystem {
    return this.fileSystem;
  }

  getFiles(): VirtualFile[] {
    return [...this.state.completedFiles];
  }

  getDependencies(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
    return {
      dependencies: { ...this.state.dependencies },
      devDependencies: { ...this.state.devDependencies },
    };
  }

  isComplete(): boolean {
    return this.state.completedFiles.length > 0 && !this.state.currentFile;
  }

  getErrors(): StreamingError[] {
    return [...this.state.errors];
  }

  reset(): void {
    this.state = this.createInitialState();
    this.buffer = '';
    this.fileSystem = createFileSystem();
    this.detectedFormat = 'unknown';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createStreamingParser(): MultiFileStreamingParser {
  return new MultiFileStreamingParser();
}

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
