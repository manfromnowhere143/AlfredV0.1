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

// Packages to load from CDN (externals) - State of the Art 2025
const CDN_PACKAGES = new Set([
  // Core React
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',

  // Animation & Motion
  'framer-motion',
  'motion',
  '@formkit/auto-animate',
  'gsap',

  // 3D Graphics (Three.js ecosystem)
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@react-three/postprocessing',
  '@react-three/rapier',
  'leva', // 3D controls

  // UI Component Libraries
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-slot',
  'lucide-react',
  '@heroicons/react',

  // Styling
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
  'tailwindcss-animate',

  // State Management
  'zustand',
  'jotai',
  '@tanstack/react-query',
  'swr',

  // Data Visualization
  'recharts',
  'd3',
  '@visx/group',
  '@visx/shape',

  // Diagrams & Charts
  'mermaid',
  'react-flow-renderer',
  '@xyflow/react',

  // Forms
  'react-hook-form',
  '@hookform/resolvers',
  'zod',

  // Date/Time
  'date-fns',
  'dayjs',

  // Utilities
  'lodash-es',
  'nanoid',
  'uuid',

  // Markdown & Content
  'react-markdown',
  'remark-gfm',
  'rehype-highlight',
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
    console.log('[ESBuild] initialize() called, current state:', { initialized: this.initialized, hasPromise: !!this.initPromise });

    if (this.initialized && this.esbuild) {
      console.log('[ESBuild] Already initialized, skipping');
      return;
    }

    if (this.initPromise) {
      console.log('[ESBuild] Waiting for existing init promise');
      return this.initPromise;
    }

    console.log('[ESBuild] Starting fresh initialization...');
    this.initPromise = this.doInitialize().catch((err) => {
      // Reset initPromise on failure so we can retry
      console.error('[ESBuild] Init failed, resetting for retry:', err);
      this.initPromise = null;
      this.initialized = false;
      throw err;
    });
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // MASTER TIMEOUT: Entire initialization must complete in 20s
    // This prevents the adapter from hanging forever
    const MASTER_TIMEOUT = 20000;
    const MODULE_IMPORT_TIMEOUT = 10000;
    const WASM_INIT_TIMEOUT = 15000;
    const WARMUP_TIMEOUT = 5000;

    const masterTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('ESBuild initialization timed out after 20s')), MASTER_TIMEOUT);
    });

    try {
      await Promise.race([
        this.doInitializeInternal(MODULE_IMPORT_TIMEOUT, WASM_INIT_TIMEOUT, WARMUP_TIMEOUT),
        masterTimeout,
      ]);
    } catch (error) {
      // CRITICAL: Reset initPromise on ANY failure so retries can work
      this.initPromise = null;
      console.error('[ESBuild] ❌ Initialization failed:', error);
      throw error;
    }
  }

  private async doInitializeInternal(
    moduleTimeout: number,
    wasmTimeout: number,
    warmupTimeout: number
  ): Promise<void> {
    try {
      console.log('[ESBuild] Starting initialization...');
      console.log('[ESBuild] 📦 Importing esbuild-wasm module...');

      // Dynamic import WITH timeout to avoid hanging forever
      const importStart = performance.now();
      let esbuildModule: ESBuild;
      try {
        const modulePromise = import('esbuild-wasm');
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Module import timed out')), moduleTimeout)
        );
        esbuildModule = await Promise.race([modulePromise, timeoutPromise]);
        console.log('[ESBuild] ✅ Module imported in', Math.round(performance.now() - importStart), 'ms');
        console.log('[ESBuild] Module keys:', Object.keys(esbuildModule).join(', '));
      } catch (importError) {
        console.error('[ESBuild] ❌ FAILED to import esbuild-wasm module:', importError);
        throw new Error(`Failed to import esbuild-wasm: ${importError instanceof Error ? importError.message : String(importError)}`);
      }

      this.esbuild = esbuildModule;

      console.log('[ESBuild] Module loaded, initializing WASM...');

      // Try multiple WASM sources - local first, then CDN fallbacks
      const wasmSources = [
        '/esbuild.wasm',  // Local file in /public - fastest
        'https://unpkg.com/esbuild-wasm@0.20.2/esbuild.wasm',
        'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.20.2/esbuild.wasm',
        'https://esm.sh/esbuild-wasm@0.20.2/esbuild.wasm',
      ];

      let lastError: Error | null = null;
      for (const wasmURL of wasmSources) {
        try {
          console.log('[ESBuild] Trying WASM URL:', wasmURL);
          console.log('[ESBuild] ⏳ Starting WASM initialization...');
          const wasmStart = performance.now();

          // WASM initialization with timeout
          const initWithTimeout = Promise.race([
            esbuildModule.initialize({ wasmURL }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout loading WASM from ${wasmURL}`)), wasmTimeout)
            )
          ]);

          await initWithTimeout;
          const wasmLoadTime = Math.round(performance.now() - wasmStart);
          console.log('[ESBuild] ✅ WASM loaded from:', wasmURL, 'in', wasmLoadTime, 'ms');

          // Quick verification that the module has the expected methods
          if (!esbuildModule.transform || typeof esbuildModule.transform !== 'function') {
            throw new Error('ESBuild module missing transform function after initialization');
          }
          console.log('[ESBuild] ✅ Module has transform function');

          // Warm-up transform WITH timeout - CRITICAL: if this times out, ESBuild is broken
          // The warm-up is our canary - if it hangs, real transforms will also hang
          console.log('[ESBuild] 🔥 Running warm-up transform...');
          const warmupStart = performance.now();
          try {
            const warmupPromise = esbuildModule.transform('const warmup = 1;', { loader: 'js' });
            const warmupTimeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('WARMUP_TIMEOUT')), warmupTimeout)
            );
            await Promise.race([warmupPromise, warmupTimeoutPromise]);
            console.log('[ESBuild] ✅ Warm-up complete in', Math.round(performance.now() - warmupStart), 'ms');
          } catch (warmupErr) {
            const errMsg = warmupErr instanceof Error ? warmupErr.message : String(warmupErr);

            // CRITICAL: If warm-up TIMES OUT, ESBuild transform is broken
            // Don't continue - throw so we can retry or use fallback
            if (errMsg === 'WARMUP_TIMEOUT' || errMsg.includes('timeout')) {
              console.error('[ESBuild] ❌ Warm-up transform timed out - ESBuild is not responding!');
              console.error('[ESBuild] ❌ This likely means WASM loaded but worker is stuck');
              throw new Error('ESBuild warm-up timed out - transform function is not responding');
            }

            // Other errors (syntax, etc.) - log but might be able to continue
            console.warn('[ESBuild] ⚠️ Warm-up failed (non-timeout):', errMsg);
            console.log('[ESBuild] Continuing despite warm-up error...');
          }

          this.initialized = true;
          console.log('[ESBuild] ✅ ESBuild fully initialized and ready!');
          return;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);

          // Check if already initialized (this is OK)
          if (errorMsg.includes('Already initialized') || errorMsg.includes('already been called')) {
            console.log('[ESBuild] ✅ Already initialized, skipping WASM load');
            this.initialized = true;
            return;
          }

          console.warn('[ESBuild] Failed to load from:', wasmURL, errorMsg);
          lastError = err instanceof Error ? err : new Error(String(err));
          // Small delay before trying next source
          await new Promise(r => setTimeout(r, 300));
        }
      }

      throw lastError || new Error('Failed to initialize ESBuild from any source');
    } catch (error) {
      console.error('[ESBuild] ❌ doInitializeInternal failed:', error);
      throw error;
    }
  }

  /**
   * Build and preview a project
   */
  async preview(project: AlfredProject, activeFile?: string): Promise<PreviewResult> {
    console.log('[ESBuild] 🚀 preview() called with', project.fileCount, 'files');
    const startTime = performance.now();

    try {
      console.log('[ESBuild] ⏳ Calling initialize()...');
      try {
        await this.initialize();
        console.log('[ESBuild] ✅ initialize() completed');
      } catch (initError) {
        console.error('[ESBuild] ❌ Initialization failed:', initError);
        // Reset state so retry is possible
        this.initialized = false;
        this.initPromise = null;
        return {
          success: false,
          errors: [{
            line: 0,
            column: 0,
            message: `ESBuild failed to initialize: ${initError instanceof Error ? initError.message : 'Unknown error'}. Try refreshing the page.`,
            severity: 'error',
            source: 'alfred',
          }],
          buildTime: performance.now() - startTime,
        };
      }

      if (!this.esbuild || !this.initialized) {
        return {
          success: false,
          errors: [{
            line: 0,
            column: 0,
            message: 'ESBuild not initialized. Try refreshing the page.',
            severity: 'error',
            source: 'alfred',
          }],
          buildTime: performance.now() - startTime,
        };
      }

      // EXTRA VERIFICATION: Check that transform function exists
      if (typeof this.esbuild.transform !== 'function') {
        console.error('[ESBuild] ❌ transform is not a function!');
        this.initialized = false;
        this.initPromise = null;
        return {
          success: false,
          errors: [{
            line: 0,
            column: 0,
            message: 'ESBuild module is corrupted. Try refreshing the page.',
            severity: 'error',
            source: 'alfred',
          }],
          buildTime: performance.now() - startTime,
        };
      }

      // FORENSIC: Log exactly what we received
      console.log('[FORENSIC ESBuild] project.files type:', typeof project.files);
      console.log('[FORENSIC ESBuild] project.files instanceof Map:', project.files instanceof Map);
      console.log('[FORENSIC ESBuild] project.fileCount:', project.fileCount);

      // Get files as array - with safety checks
      let files: VirtualFile[] = [];
      if (project.files instanceof Map) {
        files = Array.from(project.files.values());
      } else if (project.files && typeof project.files === 'object') {
        // Maybe it's a plain object?
        console.log('[FORENSIC ESBuild] ⚠️ project.files is not a Map, trying Object.values');
        files = Object.values(project.files as Record<string, VirtualFile>);
      }

      // Debug: Log file count
      console.log('[ESBuild] 📁 Building project with', files.length, 'files');
      if (files.length > 0) {
        console.log('[ESBuild] Files:', files.map(f => f.path).join(', '));
      } else {
        console.log('[FORENSIC ESBuild] ❌ NO FILES! project.files keys:', project.files ? Array.from((project.files as Map<string, any>).keys?.() || []) : 'N/A');
      }

      // Check if we have any files at all
      if (files.length === 0) {
        return {
          success: false,
          errors: [{
            line: 0,
            column: 0,
            message: 'No files to build. Add code to your project first.',
            severity: 'warning',
            source: 'alfred',
          }],
          buildTime: performance.now() - startTime,
        };
      }

      // Find entry point
      const entryPoint = activeFile || project.entryPoint || this.findEntryPoint(files);
      if (!entryPoint) {
        return this.createErrorResult('No entry point found. Add a main.tsx or index.tsx file.', startTime);
      }

      // Verify entry point exists in files
      const entryFileExists = files.some(f => f.path === entryPoint);
      if (!entryFileExists) {
        return this.createErrorResult(`Entry point not found: ${entryPoint}. Available files: ${files.map(f => f.path).join(', ')}`, startTime);
      }

      console.log('[ESBuild] 🎯 Entry point:', entryPoint);

      // Verify ESBuild is ready
      if (!this.esbuild || !this.esbuild.transform) {
        return this.createErrorResult('ESBuild not properly initialized. Please refresh the page.', startTime);
      }

      // Use transform API instead of build - more reliable, no plugins needed
      // Transform each file individually, then combine
      console.log('[ESBuild] 🔄 Transforming files with ESBuild...');
      console.log('[ESBuild] 🔧 ESBuild ready:', !!this.esbuild, '| Transform fn:', !!this.esbuild.transform);

      const transformedFiles: { path: string; code: string }[] = [];
      const transformErrors: FileError[] = [];

      // TOTAL transform timeout - all files must complete in 25s
      const TOTAL_TRANSFORM_TIMEOUT = 25000;
      const PER_FILE_TIMEOUT = 8000; // 8s per file max
      const transformStartTotal = performance.now();

      for (const file of files) {
        if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

        // Check total time elapsed
        const elapsed = performance.now() - transformStartTotal;
        if (elapsed > TOTAL_TRANSFORM_TIMEOUT) {
          console.error('[ESBuild] ⏱️ TOTAL transform timeout exceeded after', Math.round(elapsed), 'ms');
          transformErrors.push({
            line: 0,
            column: 0,
            message: `Build timeout: transforms took too long (${Math.round(elapsed)}ms). Try refreshing.`,
            severity: 'error' as const,
            source: 'esbuild',
          });
          break;
        }

        try {
          const transformStart = performance.now();
          console.log('[ESBuild] 📄 Transforming:', file.path, '| Size:', file.content.length, 'chars');

          // 8s timeout per file (reduced from 30s)
          const transformPromise = this.esbuild.transform(file.content, {
            loader: file.path.endsWith('.tsx') ? 'tsx' :
                    file.path.endsWith('.ts') ? 'ts' :
                    file.path.endsWith('.jsx') ? 'jsx' : 'js',
            jsx: 'automatic',
            jsxImportSource: 'react',
            target: 'es2020',
            format: 'esm',
          });

          const result = await Promise.race([
            transformPromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Transform timeout for ${file.path}`)), PER_FILE_TIMEOUT)
            )
          ]);

          // Process imports and exports for browser execution
          let code = result.code;

          // KEEP imports from npm packages (will be resolved via import map)
          // REMOVE imports from local files (already bundled inline)

          // Split code into lines for processing
          const lines = code.split('\n');
          const processedLines: string[] = [];

          for (const line of lines) {
            // Check if it's an import statement
            const importMatch = line.match(/^import\s+.*?from\s+['"]([^'"]+)['"]/);
            if (importMatch) {
              const importPath = importMatch[1];
              // Keep npm package imports (don't start with . or /)
              if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                processedLines.push(line); // Keep CDN imports
              }
              // Skip local imports (already inlined)
              continue;
            }

            // Skip side-effect only imports from local files
            const sideEffectImport = line.match(/^import\s+['"]([^'"]+)['"]/);
            if (sideEffectImport) {
              const importPath = sideEffectImport[1];
              if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
                processedLines.push(line); // Keep CDN side-effect imports
              }
              continue;
            }

            // Convert export default function
            if (line.match(/export\s+default\s+function\s+(\w+)/)) {
              processedLines.push(line.replace(/export\s+default\s+function\s+(\w+)/, 'const $1 = function $1'));
              continue;
            }

            // Convert export default (other)
            if (line.match(/export\s+default\s+/)) {
              processedLines.push(line.replace(/export\s+default\s+/, 'const _default = '));
              continue;
            }

            // Remove export { ... } statements
            if (line.match(/^export\s+\{[^}]*\};?\s*$/)) {
              continue;
            }

            // Convert export const/let/var/function/class
            if (line.match(/^export\s+(const|let|var|function|class)\s+/)) {
              processedLines.push(line.replace(/^export\s+(const|let|var|function|class)\s+/, '$1 '));
              continue;
            }

            processedLines.push(line);
          }

          code = processedLines.join('\n');

          transformedFiles.push({ path: file.path, code });
          console.log('[ESBuild] ✅ Transformed:', file.path, '| Output:', code.length, 'chars | Time:', Math.round(performance.now() - transformStart), 'ms');
        } catch (err) {
          console.error('[ESBuild] ❌ Transform error:', file.path, err);
          transformErrors.push({
            line: 0,
            column: 0,
            message: `${file.path}: ${err instanceof Error ? err.message : 'Transform failed'}`,
            severity: 'error' as const,
            source: 'esbuild',
          });
        }
      }

      if (transformErrors.length > 0) {
        console.warn('[ESBuild] ⚠️ Transform errors, falling back to Babel preview...');

        // FALLBACK: Use Babel-based preview when ESBuild fails
        // This provides SOME preview rather than nothing
        const fallbackHtml = this.generateFallbackPreview(files, project);

        return {
          success: true, // Mark as success so preview shows
          html: fallbackHtml,
          errors: [], // Clear errors since we recovered
          warnings: transformErrors.map(e => ({ ...e, severity: 'warning' as const })), // Downgrade to warnings
          buildTime: performance.now() - startTime,
          metadata: {
            fallbackMode: true,
            originalErrors: transformErrors,
          },
        };
      }

      // Extract CSS files
      const cssFiles = files.filter(f => f.path.endsWith('.css'));
      const cssCode = cssFiles.map(f => `/* ${f.path} */\n${f.content}`).join('\n\n');
      console.log('[ESBuild] 🎨 CSS files:', cssFiles.length, '| Total CSS size:', cssCode.length);

      // Combine transformed code
      // Order: utilities first, then components, then App, then entry point
      const orderedFiles = this.orderFiles(transformedFiles, entryPoint);
      const bundledCode = orderedFiles.map(f => `// ${f.path}\n${f.code}`).join('\n\n');

      console.log('[ESBuild] ✅ All files transformed! Total size:', bundledCode.length);

      const errors: FileError[] = [];
      const warnings: FileError[] = [];

      // Generate preview HTML
      const html = this.generatePreviewHTML(bundledCode, project, cssCode);

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

    console.log('[ESBuild:VFS] 📁 Created file map with', fileMap.size, 'entries');

    return {
      name: 'virtual-fs',
      setup: (build) => {
        console.log('[ESBuild:VFS] 🔧 Plugin setup called');

        // Resolve virtual files
        build.onResolve({ filter: /^[./]/ }, (args) => {
          console.log('[ESBuild:VFS] 🔍 Resolving:', args.path, 'from:', args.importer);
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
              console.log('[ESBuild:VFS] ✅ Resolved to:', fullPath);
              return { path: fullPath, namespace: 'virtual-fs' };
            }
          }

          // Try index files
          for (const ext of ['/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
            const indexPath = path + ext;
            if (fileMap.has(indexPath)) {
              console.log('[ESBuild:VFS] ✅ Resolved to index:', indexPath);
              return { path: indexPath, namespace: 'virtual-fs' };
            }
          }

          console.log('[ESBuild:VFS] ⚠️ Not found in VFS:', path);
          return { path, namespace: 'virtual-fs' };
        });

        // Load virtual files
        build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args) => {
          console.log('[ESBuild:VFS] 📄 Loading:', args.path);
          const file = fileMap.get(args.path) || fileMap.get(args.path.slice(1));

          if (!file) {
            console.log('[ESBuild:VFS] ❌ File not found:', args.path);
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

          console.log('[ESBuild:VFS] ✅ Loaded:', args.path, '| Size:', file.content.length, '| Loader:', loader);
          return {
            contents: file.content,
            loader,
          };
        });

        console.log('[ESBuild:VFS] ✅ Plugin setup complete');
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
        console.log('[ESBuild:CDN] 🔧 Plugin setup called');

        // Match bare imports (npm packages)
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          const packageName = args.path;
          console.log('[ESBuild:CDN] 📦 Resolving package:', packageName);

          // Skip if already a URL
          if (packageName.startsWith('http')) {
            console.log('[ESBuild:CDN] ↗️ External URL:', packageName);
            return { external: true };
          }

          // Mark as external, will be loaded from CDN at runtime
          console.log('[ESBuild:CDN] ✅ Marked external:', packageName);
          return {
            path: packageName,
            namespace: 'cdn',
            external: true,
          };
        });

        console.log('[ESBuild:CDN] ✅ Plugin setup complete');
      },
    };
  }

  // ==========================================================================
  // HTML GENERATION
  // ==========================================================================

  /**
   * Generate preview HTML with bundled code
   */
  private generatePreviewHTML(bundledCode: string, project: AlfredProject, cssCode: string = ''): string {
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

  <!-- Project CSS -->
  <style>
${cssCode}
  </style>

  <!-- Mermaid for Diagrams -->
  <script type="module">
    import mermaid from 'https://esm.sh/mermaid@10.7.0';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#8b5cf6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#6366f1',
        lineColor: '#6366f1',
        secondaryColor: '#1e1e2e',
        tertiaryColor: '#0d0d10',
        background: '#0d0d10',
        mainBkg: '#1e1e2e',
        textColor: '#e5e7eb',
        nodeBorder: '#6366f1',
        clusterBkg: '#1e1e2e',
        titleColor: '#fff',
        edgeLabelBackground: '#1e1e2e',
      },
      flowchart: { curve: 'basis', padding: 20 },
      sequence: { actorMargin: 50, mirrorActors: false },
    });
    window.mermaid = mermaid;
    // Re-render Mermaid after dynamic content loads
    window.renderMermaid = async () => {
      await mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
    };
  </script>

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

    // Common packages with stable versions — State of the Art 2025
    const commonPackages: Record<string, string> = {
      // Animation
      'framer-motion': '11.0.0',
      'motion': '11.0.0',
      'gsap': '3.12.5',
      '@formkit/auto-animate': '0.8.1',

      // 3D Graphics
      'three': '0.160.0',
      '@react-three/fiber': '8.15.12',
      '@react-three/drei': '9.92.7',
      '@react-three/postprocessing': '2.15.11',
      'leva': '0.9.35',

      // Icons
      'lucide-react': '0.303.0',
      '@heroicons/react': '2.1.1',

      // UI / Radix
      '@radix-ui/react-dialog': '1.0.5',
      '@radix-ui/react-dropdown-menu': '2.0.6',
      '@radix-ui/react-popover': '1.0.7',
      '@radix-ui/react-select': '2.0.0',
      '@radix-ui/react-tabs': '1.0.4',
      '@radix-ui/react-tooltip': '1.0.7',
      '@radix-ui/react-slot': '1.0.2',

      // Styling
      'clsx': '2.1.0',
      'tailwind-merge': '2.2.0',
      'class-variance-authority': '0.7.0',

      // State
      'zustand': '4.5.0',
      'jotai': '2.6.0',
      '@tanstack/react-query': '5.17.0',
      'swr': '2.2.4',

      // Data Viz
      'recharts': '2.12.0',
      'd3': '7.8.5',

      // Diagrams (Mermaid support!)
      'mermaid': '10.7.0',
      '@xyflow/react': '12.0.0',

      // Forms
      'react-hook-form': '7.49.3',
      'zod': '3.22.4',

      // Date
      'date-fns': '3.2.0',
      'dayjs': '1.11.10',

      // Utilities
      'lodash-es': '4.17.21',
      'nanoid': '5.0.4',
      'uuid': '9.0.1',

      // Markdown
      'react-markdown': '9.0.1',
      'remark-gfm': '4.0.0',
    };

    for (const [name, version] of Object.entries(commonPackages)) {
      if (!imports[name]) {
        imports[name] = `${ESM_CDN}/${name}@${version}`;
      }
    }

    return { imports };
  }

  /**
   * Generate fallback preview when ESBuild times out
   * Uses Babel standalone to compile JSX in the browser
   */
  private generateFallbackPreview(files: VirtualFile[], project: AlfredProject): string {
    // Find main component file (App.tsx or similar)
    const appFile = files.find(f =>
      f.path.includes('App.tsx') ||
      f.path.includes('App.jsx')
    );

    // Find all component files
    const componentFiles = files.filter(f =>
      (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) &&
      !f.path.includes('main.tsx') &&
      !f.path.includes('index.tsx')
    );

    // Build inline modules
    const inlineModules = componentFiles.map(f => {
      // Clean up the code - remove import/export statements for inline use
      let code = f.content;
      // Keep React import but make it global
      code = code.replace(/import\s+React.*from\s+['"]react['"]/g, '// React is global');
      code = code.replace(/import\s+\{[^}]+\}\s+from\s+['"]react['"]/g, '// React hooks are global');
      // Remove other imports for now
      code = code.replace(/import\s+.*from\s+['"][^'"]+['"]/g, '// import removed for fallback');
      // Convert export default to window assignment
      const exportMatch = code.match(/export\s+default\s+(\w+)/);
      if (exportMatch) {
        code = code.replace(/export\s+default\s+\w+/, '');
        code += `\nwindow.${exportMatch[1]} = ${exportMatch[1]};`;
      }
      return { path: f.path, code };
    });

    const appCode = appFile ? appFile.content : componentFiles[0]?.content || 'function App() { return <div>No App component found</div>; }';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name || 'Alfred Preview'} (Fallback Mode)</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- React from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

  <!-- Babel for JSX transformation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root {
      min-height: 100vh;
      width: 100%;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
    body {
      -webkit-font-smoothing: antialiased;
    }
    .fallback-banner {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(139, 92, 246, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
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
  </style>
</head>
<body>
  <div id="root"></div>
  <div class="fallback-banner">⚡ Fallback Preview Mode</div>

  <script type="text/babel" data-presets="react">
    // Make React hooks available globally
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React;

    // Simple lucide icon component
    const Icon = ({ name, size = 24, ...props }) => {
      const ref = React.useRef(null);
      React.useEffect(() => {
        if (ref.current && window.lucide) {
          ref.current.innerHTML = '';
          const icon = window.lucide.createElement(window.lucide.icons[name] || window.lucide.icons.circle);
          if (icon) ref.current.appendChild(icon);
        }
      }, [name]);
      return <span ref={ref} style={{ display: 'inline-flex', width: size, height: size }} {...props} />;
    };

    // Main App component
    ${this.stripImportsExports(appCode)}

    // Render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>

  <script>
    // Error handling
    window.onerror = (message, source, line, col, error) => {
      const overlay = document.createElement('div');
      overlay.className = 'alfred-error-overlay';
      overlay.innerHTML = '<div style="font-size:18px;font-weight:bold;margin-bottom:16px;">Runtime Error</div><div>' + message + '</div><div style="margin-top:16px;opacity:0.8;white-space:pre-wrap;">' + (error?.stack || '') + '</div>';
      document.body.appendChild(overlay);
    };
  </script>
</body>
</html>`;
  }

  /**
   * Strip import/export statements for inline JSX
   */
  private stripImportsExports(code: string): string {
    let result = code;
    // Remove import statements
    result = result.replace(/import\s+.*from\s+['"][^'"]+['"];?\n?/g, '');
    result = result.replace(/import\s+['"][^'"]+['"];?\n?/g, '');
    // Remove export default
    result = result.replace(/export\s+default\s+/g, '');
    // Remove named exports
    result = result.replace(/export\s+\{[^}]+\};?\n?/g, '');
    result = result.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
    return result;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Order files for execution: components before App, App before entry point
   */
  private orderFiles(files: { path: string; code: string }[], entryPoint: string): { path: string; code: string }[] {
    const isEntry = (p: string) => p === entryPoint || p.includes('main.') || p.includes('index.');
    const isApp = (p: string) => p.toLowerCase().includes('app.');
    const isUtil = (p: string) => p.includes('util') || p.includes('lib') || p.includes('helper') || p.includes('hook');

    // Sort: utils -> components -> App -> entry
    return [...files].sort((a, b) => {
      const aScore = isEntry(a.path) ? 4 : isApp(a.path) ? 3 : isUtil(a.path) ? 1 : 2;
      const bScore = isEntry(b.path) ? 4 : isApp(b.path) ? 3 : isUtil(b.path) ? 1 : 2;
      return aScore - bScore;
    });
  }

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
