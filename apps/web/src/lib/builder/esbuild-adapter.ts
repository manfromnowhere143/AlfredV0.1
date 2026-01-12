/**
 * ESBuild-WASM Preview Adapter
 *
 * The ignition that makes React projects render.
 * Bundles from VirtualFileSystem, resolves npm via esm.sh,
 * outputs running React apps inside Alfred.
 *
 * This is what transforms files into magic.
 */

import type {
  PreviewEngineAdapter,
  PreviewResult,
  VirtualFile,
  AlfredProject,
  ConsoleEntry,
  FileError,
  ProjectFileType,
} from '@alfred/core';

// ESBuild types (will be loaded dynamically)
type ESBuild = typeof import('esbuild-wasm');
type BuildResult = import('esbuild-wasm').BuildResult;
type Plugin = import('esbuild-wasm').Plugin;

// ============================================================================
// CONFIGURATION
// ============================================================================

const ESM_CDN = 'https://esm.sh';

// Packages to load from CDN (externals)
const CDN_PACKAGES = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'framer-motion',
  'lucide-react',
  'recharts',
  'zustand',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
]);

// React version for CDN
const REACT_VERSION = '18.2.0';

// ============================================================================
// ESBUILD ADAPTER CLASS
// ============================================================================

export class EsbuildPreviewAdapter implements PreviewEngineAdapter {
  readonly id = 'esbuild' as const;
  readonly name = 'ESBuild React Bundler';
  readonly supportedFileTypes: ProjectFileType[] = ['component', 'page', 'script', 'style'];
  readonly supportedExtensions = ['.tsx', '.ts', '.jsx', '.js', '.css'];

  private esbuild: ESBuild | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private consoleBuffer: ConsoleEntry[] = [];

  /**
   * Initialize ESBuild WASM
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const esbuildModule = await import('esbuild-wasm');
      this.esbuild = esbuildModule;

      await esbuildModule.initialize({
        wasmURL: 'https://unpkg.com/esbuild-wasm@0.20.1/esbuild.wasm',
      });

      this.initialized = true;
      console.log('[ESBuild] Initialized successfully');
    } catch (error) {
      console.error('[ESBuild] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Build and preview a project
   */
  async preview(project: AlfredProject, activeFile?: string): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      await this.initialize();

      if (!this.esbuild) {
        throw new Error('ESBuild not initialized');
      }

      // Get files as array
      const files = Array.from(project.files.values());

      // Find entry point
      const entryPoint = activeFile || project.entryPoint || this.findEntryPoint(files);
      if (!entryPoint) {
        return this.createErrorResult('No entry point found', startTime);
      }

      // Create virtual filesystem plugin
      const virtualFsPlugin = this.createVirtualFsPlugin(files);
      const cdnPlugin = this.createCdnPlugin(project.dependencies || {});

      // Bundle with ESBuild
      const result = await this.esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        target: 'es2020',
        jsx: 'automatic',
        jsxImportSource: 'react',
        minify: false,
        sourcemap: 'inline',
        plugins: [virtualFsPlugin, cdnPlugin],
        define: {
          'process.env.NODE_ENV': '"development"',
        },
        logLevel: 'silent',
      });

      // Extract bundled code
      const bundledCode = result.outputFiles?.[0]?.text || '';
      const errors = this.extractErrors(result);
      const warnings = this.extractWarnings(result);

      // Generate preview HTML
      const html = this.generatePreviewHTML(bundledCode, project);

      return {
        success: errors.length === 0,
        html,
        errors,
        warnings,
        console: [...this.consoleBuffer],
        buildTime: performance.now() - startTime,
        metadata: {
          bundleSize: bundledCode.length,
          entryPoint,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Build failed',
        startTime
      );
    }
  }

  /**
   * Update preview with changed files (HMR-like)
   */
  async update(files: VirtualFile[]): Promise<PreviewResult> {
    // For now, rebuild entire project
    // Future: implement true HMR with module replacement
    const project: AlfredProject = {
      id: 'update',
      userId: 'anonymous',
      name: 'Update',
      framework: 'react',
      entryPoint: files.find(f => f.isEntryPoint)?.path || '/src/main.tsx',
      previewEngine: 'esbuild',
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: {},
      buildConfig: {},
      previewConfig: {},
      files: new Map(files.map(f => [f.path, f])),
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.preview(project);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.consoleBuffer = [];
  }

  // ==========================================================================
  // ESBUILD PLUGINS
  // ==========================================================================

  /**
   * Virtual filesystem plugin for ESBuild
   * Resolves imports from our VirtualFile array
   */
  private createVirtualFsPlugin(files: VirtualFile[]): Plugin {
    const fileMap = new Map<string, VirtualFile>();

    // Build lookup map with multiple path variations
    for (const file of files) {
      fileMap.set(file.path, file);
      // Also store without leading slash
      if (file.path.startsWith('/')) {
        fileMap.set(file.path.slice(1), file);
      }
    }

    return {
      name: 'virtual-fs',
      setup: (build) => {
        // Resolve virtual files
        build.onResolve({ filter: /^[./]/ }, (args) => {
          let path = args.path;

          // Handle relative imports
          if (path.startsWith('./') || path.startsWith('../')) {
            const dir = args.importer.split('/').slice(0, -1).join('/');
            path = this.resolvePath(dir, path);
          }

          // Normalize path
          if (!path.startsWith('/')) {
            path = '/' + path;
          }

          // Try with extensions
          const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.css', '.json'];
          for (const ext of extensions) {
            const fullPath = path + ext;
            if (fileMap.has(fullPath)) {
              return { path: fullPath, namespace: 'virtual-fs' };
            }
          }

          // Try index files
          for (const ext of ['/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
            const indexPath = path + ext;
            if (fileMap.has(indexPath)) {
              return { path: indexPath, namespace: 'virtual-fs' };
            }
          }

          return { path, namespace: 'virtual-fs' };
        });

        // Load virtual files
        build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args) => {
          const file = fileMap.get(args.path) || fileMap.get(args.path.slice(1));

          if (!file) {
            return {
              errors: [{
                text: `File not found: ${args.path}`,
                location: null,
              }],
            };
          }

          // Determine loader based on extension
          const ext = args.path.split('.').pop()?.toLowerCase();
          let loader: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'json' | 'text' = 'tsx';

          switch (ext) {
            case 'ts': loader = 'ts'; break;
            case 'jsx': loader = 'jsx'; break;
            case 'js': loader = 'js'; break;
            case 'css': loader = 'css'; break;
            case 'json': loader = 'json'; break;
            case 'tsx':
            default: loader = 'tsx'; break;
          }

          return {
            contents: file.content,
            loader,
          };
        });
      },
    };
  }

  /**
   * CDN plugin for npm packages
   * Resolves bare imports to esm.sh
   */
  private createCdnPlugin(dependencies: Record<string, string>): Plugin {
    return {
      name: 'cdn-resolver',
      setup: (build) => {
        // Match bare imports (npm packages)
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          const packageName = args.path;

          // Skip if already a URL
          if (packageName.startsWith('http')) {
            return { external: true };
          }

          // Mark as external, will be loaded from CDN at runtime
          return {
            path: packageName,
            namespace: 'cdn',
            external: true,
          };
        });
      },
    };
  }

  // ==========================================================================
  // HTML GENERATION
  // ==========================================================================

  /**
   * Generate preview HTML with bundled code
   */
  private generatePreviewHTML(bundledCode: string, project: AlfredProject): string {
    const deps = project.dependencies || {};
    const importMap = this.generateImportMap(deps);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name || 'Alfred Preview'}</title>

  <!-- Import Map for CDN packages -->
  <script type="importmap">
${JSON.stringify(importMap, null, 2)}
  </script>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Custom Tailwind Config -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
          },
        },
      },
    };
  </script>

  <!-- Base Styles -->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root {
      min-height: 100vh;
      width: 100%;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Error overlay */
    .alfred-error-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      color: #ff6b6b;
      padding: 20px;
      font-family: 'Fira Code', monospace;
      font-size: 14px;
      overflow: auto;
      z-index: 99999;
    }
    .alfred-error-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #ff6b6b;
    }
    .alfred-error-stack {
      white-space: pre-wrap;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Console Capture -->
  <script>
    (function() {
      const originalConsole = { ...console };
      const sendToParent = (type, args) => {
        try {
          window.parent.postMessage({
            type: 'console',
            payload: { type, args: args.map(a => {
              try { return JSON.parse(JSON.stringify(a)); }
              catch { return String(a); }
            }) }
          }, '*');
        } catch (e) {}
      };
      ['log', 'warn', 'error', 'info'].forEach(type => {
        console[type] = (...args) => {
          originalConsole[type](...args);
          sendToParent(type, args);
        };
      });

      // Global error handler
      window.onerror = (message, source, line, col, error) => {
        sendToParent('error', [message, { source, line, col, stack: error?.stack }]);
        showErrorOverlay(message, error?.stack);
      };

      window.onunhandledrejection = (event) => {
        sendToParent('error', ['Unhandled Promise Rejection:', event.reason]);
        showErrorOverlay('Unhandled Promise Rejection', event.reason?.stack || String(event.reason));
      };

      function showErrorOverlay(message, stack) {
        const overlay = document.createElement('div');
        overlay.className = 'alfred-error-overlay';
        overlay.innerHTML = \`
          <div class="alfred-error-title">Runtime Error</div>
          <div>\${message}</div>
          <div class="alfred-error-stack">\${stack || ''}</div>
        \`;
        document.body.appendChild(overlay);
      }
    })();
  </script>

  <!-- Application Bundle -->
  <script type="module">
    try {
${bundledCode}
    } catch (error) {
      console.error('Bundle execution error:', error);
      const overlay = document.createElement('div');
      overlay.className = 'alfred-error-overlay';
      overlay.innerHTML = \`
        <div class="alfred-error-title">Bundle Error</div>
        <div>\${error.message}</div>
        <div class="alfred-error-stack">\${error.stack || ''}</div>
      \`;
      document.body.appendChild(overlay);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Generate import map for CDN packages
   */
  private generateImportMap(dependencies: Record<string, string>): { imports: Record<string, string> } {
    const imports: Record<string, string> = {
      // Core React
      'react': `${ESM_CDN}/react@${REACT_VERSION}`,
      'react-dom': `${ESM_CDN}/react-dom@${REACT_VERSION}`,
      'react-dom/client': `${ESM_CDN}/react-dom@${REACT_VERSION}/client`,
      'react/jsx-runtime': `${ESM_CDN}/react@${REACT_VERSION}/jsx-runtime`,
      'react/jsx-dev-runtime': `${ESM_CDN}/react@${REACT_VERSION}/jsx-dev-runtime`,
    };

    // Add project dependencies
    for (const [name, version] of Object.entries(dependencies)) {
      if (name === 'react' || name === 'react-dom') continue;

      const cleanVersion = version.replace(/[\^~]/, '');
      imports[name] = `${ESM_CDN}/${name}@${cleanVersion}`;
    }

    // Common packages with stable versions
    const commonPackages: Record<string, string> = {
      'framer-motion': '11.0.0',
      'lucide-react': '0.263.1',
      'recharts': '2.12.0',
      'zustand': '4.5.0',
      'clsx': '2.1.0',
      'tailwind-merge': '2.2.0',
      'class-variance-authority': '0.7.0',
      'three': '0.149.0',
      '@react-three/fiber': '8.15.0',
      '@react-three/drei': '9.88.0',
    };

    for (const [name, version] of Object.entries(commonPackages)) {
      if (!imports[name]) {
        imports[name] = `${ESM_CDN}/${name}@${version}`;
      }
    }

    return { imports };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Find entry point from files
   */
  private findEntryPoint(files: VirtualFile[]): string | undefined {
    // Priority: explicit entry point
    const explicit = files.find(f => f.isEntryPoint);
    if (explicit) return explicit.path;

    // Common entry points
    const entryPoints = [
      '/src/main.tsx',
      '/src/main.ts',
      '/src/index.tsx',
      '/src/index.ts',
      '/main.tsx',
      '/main.ts',
      '/index.tsx',
      '/index.ts',
      '/src/App.tsx',
      '/App.tsx',
    ];

    for (const entry of entryPoints) {
      if (files.some(f => f.path === entry)) {
        return entry;
      }
    }

    // First TSX/JSX file
    const component = files.find(f =>
      f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
    );
    return component?.path;
  }

  /**
   * Resolve relative path
   */
  private resolvePath(base: string, relative: string): string {
    const baseParts = base.split('/').filter(Boolean);
    const relativeParts = relative.split('/').filter(Boolean);

    for (const part of relativeParts) {
      if (part === '..') {
        baseParts.pop();
      } else if (part !== '.') {
        baseParts.push(part);
      }
    }

    return '/' + baseParts.join('/');
  }

  /**
   * Extract errors from build result
   */
  private extractErrors(result: BuildResult): FileError[] {
    return (result.errors || []).map(err => ({
      line: err.location?.line || 0,
      column: err.location?.column || 0,
      message: err.text,
      severity: 'error' as const,
      source: 'esbuild',
    }));
  }

  /**
   * Extract warnings from build result
   */
  private extractWarnings(result: BuildResult): FileError[] {
    return (result.warnings || []).map(warn => ({
      line: warn.location?.line || 0,
      column: warn.location?.column || 0,
      message: warn.text,
      severity: 'warning' as const,
      source: 'esbuild',
    }));
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, startTime: number): PreviewResult {
    return {
      success: false,
      errors: [{
        line: 0,
        column: 0,
        message,
        severity: 'error',
        source: 'esbuild',
      }],
      buildTime: performance.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let esbuildAdapterInstance: EsbuildPreviewAdapter | null = null;

/**
 * Get or create the ESBuild adapter singleton
 */
export function getEsbuildAdapter(): EsbuildPreviewAdapter {
  if (!esbuildAdapterInstance) {
    esbuildAdapterInstance = new EsbuildPreviewAdapter();
  }
  return esbuildAdapterInstance;
}

/**
 * Initialize ESBuild adapter (call early for faster first build)
 */
export async function initializeEsbuild(): Promise<void> {
  const adapter = getEsbuildAdapter();
  await adapter.initialize();
}
