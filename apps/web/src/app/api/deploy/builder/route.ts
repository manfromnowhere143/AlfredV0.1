/**
 * Alfred Pro Builder - Direct Deployment API
 *
 * Deploys pre-structured multi-file projects directly to Vercel
 * WITHOUT going through project-generator transformation.
 *
 * This preserves the exact file tree from Alfred Pro Builder.
 */

export const maxDuration = 120;

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { projects } from '@alfred/database';
import { eq, and } from 'drizzle-orm';
import {
  analyzeSEO,
  applyAutoFixes,
  generateSitemapFromFiles,
  generateRobotsTxt,
  getAutoFixableIssues,
  enhanceHtml,
} from '@/lib/seo';
import type { SEOConfigInput, SEOAnalysisResult } from '@/lib/seo/types';

// ============================================================================
// TYPES
// ============================================================================

interface BuilderFile {
  path: string;
  content: string;
}

interface DeployRequestBody {
  files: BuilderFile[];
  projectName: string;
  artifactId?: string;
  artifactTitle?: string;
  customDomain?: string;
  seoConfig?: SEOConfigInput;
  runSeoAnalysis?: boolean;
  autoFixSeo?: boolean;
  /** Project ID to update after deployment (for SEO Dashboard accuracy) */
  projectId?: string;
}

interface VercelFile {
  file: string;
  data: string;
  encoding?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Placeholder for site URL - replaced after Vercel returns real URL
const SITE_URL_PLACEHOLDER = '__ALFRED_SITE_URL__';

// ============================================================================
// VERCEL API HELPERS
// ============================================================================

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN not configured');
  return token;
}

function getVercelTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID;
}

function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function vercelRequest(
  endpoint: string,
  options: RequestInit,
  token: string,
  teamId?: string
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  return fetch(url.toString(), {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Replace URL placeholders in files with the real deployed URL
 */
function replaceUrlPlaceholders(files: VercelFile[], realUrl: string): VercelFile[] {
  return files.map(file => {
    // Only process text files that might contain the placeholder
    if (file.file.endsWith('.xml') ||
        file.file.endsWith('.txt') ||
        file.file.endsWith('.html') ||
        file.file.endsWith('.json')) {
      if (file.data.includes(SITE_URL_PLACEHOLDER)) {
        return {
          ...file,
          data: file.data.replaceAll(SITE_URL_PLACEHOLDER, realUrl),
        };
      }
    }
    return file;
  });
}

/**
 * Silent redeploy - updates files without user-visible progress
 * Used to fix SEO URLs after we know the real deployment URL
 */
async function silentRedeploy(
  vercelProjectName: string,
  files: VercelFile[],
  vercelToken: string,
  teamId?: string
): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  try {
    console.log('[Builder Deploy] Starting silent redeploy to fix SEO URLs...');

    const deployRes = await vercelRequest('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: vercelProjectName,
        files,
        projectSettings: {
          framework: 'vite',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
        },
        target: 'production',
      }),
    }, vercelToken, teamId);

    if (!deployRes.ok) {
      const err = await deployRes.json();
      console.error('[Builder Deploy] Silent redeploy failed:', err);
      return { success: false, error: err.error?.message || 'Silent redeploy failed' };
    }

    const deployment = await deployRes.json();

    // Wait for deployment to complete (with shorter timeout for silent redeploy)
    const maxWait = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await vercelRequest(
        `/v13/deployments/${deployment.id}`,
        { method: 'GET' },
        vercelToken,
        teamId
      );

      if (!statusRes.ok) continue;

      const status = await statusRes.json();

      if (status.readyState === 'READY') {
        console.log('[Builder Deploy] Silent redeploy completed successfully');
        return { success: true, deploymentId: deployment.id };
      }

      if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
        console.error('[Builder Deploy] Silent redeploy build failed:', status.readyState);
        return { success: false, error: `Build ${status.readyState}` };
      }
    }

    console.error('[Builder Deploy] Silent redeploy timed out');
    return { success: false, error: 'Timeout' };
  } catch (err) {
    console.error('[Builder Deploy] Silent redeploy error:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get existing deployed URL from database by Vercel project ID
 * This is more reliable than matching by name since Vercel may add suffixes
 */
async function getExistingDeployedUrlByProjectId(
  userId: string,
  vercelProjectId: string
): Promise<string | null> {
  try {
    const client = await getDb();
    const existingProjects = await client.db
      .select()
      .from(projects)
      .where(and(
        eq(projects.userId, userId),
        eq(projects.vercelProjectId, vercelProjectId)
      ))
      .limit(1);

    if (existingProjects.length > 0 && existingProjects[0].primaryDomain) {
      const url = `https://${existingProjects[0].primaryDomain}`;
      console.log('[Builder Deploy] Found existing deployed URL by project ID:', url);
      return url;
    }

    return null;
  } catch (err) {
    console.error('[Builder Deploy] Error getting existing URL:', err);
    return null;
  }
}

// ============================================================================
// PROJECT FILE GENERATORS (only what's missing)
// ============================================================================

function generatePackageJson(projectName: string, files: BuilderFile[]): string {
  // Detect dependencies from file contents
  const allCode = files.map(f => f.content).join('\n');

  const deps: Record<string, string> = {
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
  };

  // Detect common dependencies
  if (allCode.includes('framer-motion')) deps['framer-motion'] = '^11.0.0';
  if (allCode.includes('lucide-react')) deps['lucide-react'] = '^0.263.1';
  if (allCode.includes('recharts')) deps['recharts'] = '^2.12.0';
  if (allCode.includes('@radix-ui')) deps['@radix-ui/react-slot'] = '^1.0.2';
  if (allCode.includes('class-variance-authority')) deps['class-variance-authority'] = '^0.7.0';
  if (allCode.includes('clsx')) deps['clsx'] = '^2.1.0';
  if (allCode.includes('tailwind-merge')) deps['tailwind-merge'] = '^2.2.0';
  if (allCode.includes('zustand')) deps['zustand'] = '^4.5.0';
  if (allCode.includes('axios')) deps['axios'] = '^1.6.0';
  if (allCode.includes('date-fns')) deps['date-fns'] = '^3.3.0';

  const hasTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const hasTailwind = allCode.includes('tailwind') || allCode.includes('className=');

  const devDeps: Record<string, string> = {
    'vite': '^5.0.0',
    '@vitejs/plugin-react': '^4.2.0',
  };

  if (hasTypeScript) {
    devDeps['typescript'] = '^5.3.0';
    devDeps['@types/react'] = '^18.3.0';
    devDeps['@types/react-dom'] = '^18.3.0';
  }

  if (hasTailwind) {
    devDeps['tailwindcss'] = '^3.4.0';
    devDeps['autoprefixer'] = '^10.4.17';
    devDeps['postcss'] = '^8.4.33';
  }

  return JSON.stringify({
    name: sanitizeProjectName(projectName),
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2);
}

function generateViteConfig(hasTypeScript: boolean): string {
  const ext = hasTypeScript ? 'ts' : 'js';
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
`;
}

function generateIndexHtml(projectName: string, hasTypeScript: boolean): string {
  const ext = hasTypeScript ? 'tsx' : 'jsx';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`;
}

function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}

function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2);
}

function generateTsConfigNode(): string {
  return JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
    },
    include: ['vite.config.ts'],
  }, null, 2);
}

function generateMainEntry(hasTypeScript: boolean, hasCss: boolean, appPath: string): string {
  const ext = hasTypeScript ? 'tsx' : 'jsx';
  const cssImport = hasCss ? `import './index.css';\n` : '';

  // Normalize app import path (remove extension, handle src/ prefix)
  let appImport = appPath;
  if (appImport.startsWith('src/')) {
    appImport = './' + appImport.slice(4);
  } else if (!appImport.startsWith('./') && !appImport.startsWith('/')) {
    appImport = './' + appImport;
  }
  // Remove extension for import
  appImport = appImport.replace(/\.(tsx?|jsx?)$/, '');

  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '${appImport}';
${cssImport}
const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
`;
}

function generateIndexCss(hasTailwind: boolean): string {
  if (hasTailwind) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  min-height: 100vh;
}
`;
  }

  return `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const body: DeployRequestBody = await request.json();
    const { files, projectName, artifactId, artifactTitle, customDomain, seoConfig, runSeoAnalysis = true, autoFixSeo = true, projectId: savedProjectId } = body;

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!projectName) {
      return new Response(JSON.stringify({ error: 'Project name required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const vercelToken = getVercelToken();
    const teamId = getVercelTeamId();
    const cleanProjectName = sanitizeProjectName(projectName);

    console.log('[Builder Deploy] Starting direct deployment:', {
      projectName: cleanProjectName,
      fileCount: files.length,
      files: files.map(f => f.path),
    });

    // Detect project characteristics
    const hasTypeScript = files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
    const allCode = files.map(f => f.content).join('\n');

    // Improved Tailwind detection - check for:
    // 1. Explicit tailwind mentions
    // 2. Common Tailwind utility class patterns in className attributes
    const hasTailwindExplicit = allCode.includes('tailwind') || allCode.includes('@tailwind');
    const hasTailwindClasses = /className=["'][^"']*\b(flex|grid|hidden|block|inline|absolute|relative|fixed|sticky|top-|right-|bottom-|left-|z-|w-|h-|min-|max-|p-|px-|py-|pt-|pr-|pb-|pl-|m-|mx-|my-|mt-|mr-|mb-|ml-|gap-|space-|text-|font-|leading-|tracking-|bg-|border|rounded|shadow|opacity-|transition|duration-|ease-|animate-|hover:|focus:|active:|disabled:|sm:|md:|lg:|xl:|2xl:)\b/.test(allCode);
    const hasTailwind = hasTailwindExplicit || hasTailwindClasses;

    console.log('[Builder Deploy] Tailwind detection:', { hasTailwindExplicit, hasTailwindClasses, hasTailwind });

    // Prepare files for Vercel - start with user's files
    const vercelFiles: VercelFile[] = files.map(f => ({
      file: f.path.startsWith('/') ? f.path.slice(1) : f.path,
      data: f.content,
      encoding: 'utf-8',
    }));

    // Add required config files if not present
    const hasPackageJson = files.some(f => f.path.includes('package.json'));
    const hasViteConfig = files.some(f => f.path.includes('vite.config'));
    const hasIndexHtml = files.some(f => f.path === 'index.html' || f.path === '/index.html');
    const hasTailwindConfig = files.some(f => f.path.includes('tailwind.config'));
    const hasPostcssConfig = files.some(f => f.path.includes('postcss.config'));
    const hasTsConfig = files.some(f => f.path === 'tsconfig.json' || f.path === '/tsconfig.json');

    if (!hasPackageJson) {
      vercelFiles.push({
        file: 'package.json',
        data: generatePackageJson(cleanProjectName, files),
        encoding: 'utf-8',
      });
    }

    if (!hasViteConfig) {
      const ext = hasTypeScript ? 'ts' : 'js';
      vercelFiles.push({
        file: `vite.config.${ext}`,
        data: generateViteConfig(hasTypeScript),
        encoding: 'utf-8',
      });
    }

    if (!hasIndexHtml) {
      vercelFiles.push({
        file: 'index.html',
        data: generateIndexHtml(artifactTitle || projectName, hasTypeScript),
        encoding: 'utf-8',
      });
    }

    if (hasTailwind && !hasTailwindConfig) {
      vercelFiles.push({
        file: 'tailwind.config.js',
        data: generateTailwindConfig(),
        encoding: 'utf-8',
      });
    }

    if (hasTailwind && !hasPostcssConfig) {
      vercelFiles.push({
        file: 'postcss.config.js',
        data: generatePostcssConfig(),
        encoding: 'utf-8',
      });
    }

    if (hasTypeScript && !hasTsConfig) {
      vercelFiles.push({
        file: 'tsconfig.json',
        data: generateTsConfig(),
        encoding: 'utf-8',
      });
      vercelFiles.push({
        file: 'tsconfig.node.json',
        data: generateTsConfigNode(),
        encoding: 'utf-8',
      });
    }

    // Check for main entry file and CSS
    const hasMainEntry = files.some(f =>
      f.path === 'src/main.tsx' || f.path === 'src/main.jsx' ||
      f.path === '/src/main.tsx' || f.path === '/src/main.jsx'
    );
    const hasCssFile = files.some(f =>
      f.path.includes('index.css') || f.path.includes('global.css') ||
      f.path.includes('style.css') || f.path.includes('styles.css')
    );
    const hasAppFile = files.find(f =>
      f.path.includes('App.tsx') || f.path.includes('App.jsx') ||
      f.path.includes('app.tsx') || f.path.includes('app.jsx')
    );

    // Generate main entry file if missing
    if (!hasMainEntry && hasAppFile) {
      const ext = hasTypeScript ? 'tsx' : 'jsx';
      const appPath = hasAppFile.path.startsWith('/') ? hasAppFile.path.slice(1) : hasAppFile.path;

      vercelFiles.push({
        file: `src/main.${ext}`,
        data: generateMainEntry(hasTypeScript, true, appPath),
        encoding: 'utf-8',
      });
      console.log('[Builder Deploy] Generated main entry file: src/main.' + ext);
    }

    // Generate index.css if missing (for proper styling)
    if (!hasCssFile) {
      vercelFiles.push({
        file: 'src/index.css',
        data: generateIndexCss(hasTailwind),
        encoding: 'utf-8',
      });
      console.log('[Builder Deploy] Generated index.css with ' + (hasTailwind ? 'Tailwind' : 'basic') + ' styles');
    }

    // Ensure existing main entry file imports CSS
    if (hasMainEntry) {
      const mainEntryIndex = vercelFiles.findIndex(f =>
        f.file === 'src/main.tsx' || f.file === 'src/main.jsx'
      );
      if (mainEntryIndex !== -1) {
        const mainContent = vercelFiles[mainEntryIndex].data;
        // Check if CSS import is missing
        if (!mainContent.includes("import './index.css'") &&
            !mainContent.includes('import "./index.css"') &&
            !mainContent.includes("import './global.css'") &&
            !mainContent.includes("import './styles.css'")) {
          // Inject CSS import at the top after React imports
          const lines = mainContent.split('\n');
          let insertIndex = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('import') && (lines[i].includes('react') || lines[i].includes('React'))) {
              insertIndex = i + 1;
            }
          }
          lines.splice(insertIndex, 0, "import './index.css';");
          vercelFiles[mainEntryIndex] = {
            ...vercelFiles[mainEntryIndex],
            data: lines.join('\n'),
          };
          console.log('[Builder Deploy] Injected CSS import into existing main entry file');
        }
      }
    }

    // CRITICAL: If Tailwind classes are used but CSS doesn't have @tailwind directives, inject them
    if (hasTailwind && !hasTailwindExplicit) {
      const cssFileIndex = vercelFiles.findIndex(f =>
        f.file === 'src/index.css' || f.file === 'src/global.css' ||
        f.file === 'src/styles.css' || f.file === 'src/style.css'
      );

      if (cssFileIndex !== -1) {
        const cssContent = vercelFiles[cssFileIndex].data;
        // Check if @tailwind directives are missing
        if (!cssContent.includes('@tailwind')) {
          // Prepend Tailwind directives to existing CSS
          const tailwindDirectives = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;
          vercelFiles[cssFileIndex] = {
            ...vercelFiles[cssFileIndex],
            data: tailwindDirectives + cssContent,
          };
          console.log('[Builder Deploy] Injected @tailwind directives into existing CSS file');
        }
      }
    }

    console.log('[Builder Deploy] Final file list:');
    vercelFiles.forEach(f => {
      const preview = f.data.slice(0, 100).replace(/\n/g, '\\n');
      console.log(`  - ${f.file} (${f.data.length} bytes): ${preview}...`);
    });

    // Verify critical files exist
    const criticalFiles = ['package.json', 'index.html', 'src/main.tsx', 'src/main.jsx', 'src/index.css'];
    const presentCritical = criticalFiles.filter(cf => vercelFiles.some(vf => vf.file === cf || vf.file === cf.replace('.tsx', '.jsx')));
    console.log('[Builder Deploy] Critical files present:', presentCritical);

    // SSE Stream for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        // Mutable copy of vercelFiles for SEO modifications
        let deployFiles = [...vercelFiles];

        try {
          sendEvent({ type: 'progress', status: 'analyzing', message: 'Preparing deployment...', progress: 5 });

          // ============================================================
          // SEO ANALYSIS & OPTIMIZATION
          // ============================================================
          let seoAnalysis: SEOAnalysisResult | null = null;

          if (runSeoAnalysis) {
            sendEvent({ type: 'progress', status: 'analyzing', message: 'Running SEO analysis...', progress: 8 });

            try {
              // Convert vercel files to the format expected by analyzeSEO
              const filesForAnalysis = deployFiles.map(f => ({
                path: f.file.startsWith('/') ? f.file : `/${f.file}`,
                content: f.data,
              }));

              // Run SEO analysis
              seoAnalysis = await analyzeSEO(filesForAnalysis, {
                projectName: artifactTitle || projectName,
                deployUrl: customDomain ? `https://${customDomain}` : undefined,
                seoConfig,
              });

              // Send SEO analysis results
              sendEvent({
                type: 'seo_analysis',
                score: seoAnalysis.score,
                grade: seoAnalysis.grade,
                passedChecks: seoAnalysis.passedChecks,
                totalChecks: seoAnalysis.totalChecks,
                criticalCount: seoAnalysis.criticalCount,
                warningCount: seoAnalysis.warningCount,
                infoCount: seoAnalysis.infoCount,
                autoFixableCount: getAutoFixableIssues(seoAnalysis).length,
                categoryScores: seoAnalysis.categoryScores,
              });

              console.log('[Builder Deploy] SEO Analysis complete:', {
                score: seoAnalysis.score,
                grade: seoAnalysis.grade,
                issues: seoAnalysis.issues.length,
              });

              // Apply auto-fixes if enabled
              if (autoFixSeo && seoAnalysis.issues.length > 0) {
                const autoFixableIssues = getAutoFixableIssues(seoAnalysis);
                if (autoFixableIssues.length > 0) {
                  sendEvent({ type: 'progress', status: 'optimizing', message: `Applying ${autoFixableIssues.length} SEO fixes...`, progress: 12 });

                  let totalApplied = 0;

                  // Apply fixes to each HTML file
                  for (let i = 0; i < deployFiles.length; i++) {
                    const file = deployFiles[i];
                    if (file.file.endsWith('.html') || file.file.endsWith('.htm')) {
                      // Get fixes for this file
                      const fileFixes = autoFixableIssues
                        .filter(issue => {
                          if (!issue.autoFix) return false;
                          const fixPath = issue.autoFix.filePath.replace(/^\//, '');
                          return fixPath === file.file || fixPath === `/${file.file}`;
                        })
                        .map(issue => issue.autoFix!)
                        .filter(Boolean);

                      if (fileFixes.length > 0) {
                        const result = applyAutoFixes(file.data, fileFixes);
                        deployFiles[i] = {
                          ...file,
                          data: result.html,
                        };
                        totalApplied += result.applied;
                      }
                    }
                  }

                  console.log('[Builder Deploy] Applied', totalApplied, 'SEO auto-fixes');
                }
              }
            } catch (seoErr) {
              console.error('[Builder Deploy] SEO analysis error:', seoErr);
              // Continue with deployment even if SEO fails
            }
          }

          // ============================================================
          // CREATE/GET VERCEL PROJECT FIRST
          // We need the actual project ID to look up existing deployed URL
          // ============================================================
          sendEvent({ type: 'progress', status: 'uploading', message: 'Preparing deployment...', progress: 18 });

          let vercelProjectId: string;
          let vercelProjectName: string;

          // Try to get existing project
          const getRes = await vercelRequest(`/v9/projects/${cleanProjectName}`, { method: 'GET' }, vercelToken, teamId);

          if (getRes.ok) {
            const existing = await getRes.json();
            vercelProjectId = existing.id;
            vercelProjectName = existing.name;
            sendEvent({ type: 'progress', status: 'uploading', message: `Using existing project: ${vercelProjectName}`, progress: 20 });
          } else {
            // Create new project
            sendEvent({ type: 'progress', status: 'uploading', message: 'Creating Vercel project...', progress: 15 });

            const createRes = await vercelRequest('/v10/projects', {
              method: 'POST',
              body: JSON.stringify({
                name: cleanProjectName,
                framework: 'vite',
                buildCommand: 'npm run build',
                outputDirectory: 'dist',
                installCommand: 'npm install',
              }),
            }, vercelToken, teamId);

            if (!createRes.ok) {
              const err = await createRes.json();
              throw new Error(`Failed to create project: ${err.error?.message || JSON.stringify(err)}`);
            }

            const newProject = await createRes.json();
            vercelProjectId = newProject.id;
            vercelProjectName = newProject.name;
            sendEvent({ type: 'progress', status: 'uploading', message: `Created project: ${vercelProjectName}`, progress: 25 });
          }

          // ============================================================
          // SEO URL DETERMINATION
          // Now that we have the actual Vercel project ID, we can look up
          // the correct existing URL from the database
          // ============================================================
          let usedPlaceholder = false;
          let siteUrl: string;

          if (customDomain) {
            // Custom domain is known upfront
            siteUrl = `https://${customDomain}`;
            console.log('[Builder Deploy] Using custom domain for SEO URLs:', siteUrl);
          } else {
            // Check if we have a previously deployed URL for this project by project ID
            const existingUrl = await getExistingDeployedUrlByProjectId(userId, vercelProjectId);
            if (existingUrl) {
              siteUrl = existingUrl;
              console.log('[Builder Deploy] Using existing deployed URL for SEO:', siteUrl);
            } else {
              // First-time deploy - we know the actual project name from Vercel
              // Use the actual URL format: https://{vercelProjectName}.vercel.app
              siteUrl = `https://${vercelProjectName}.vercel.app`;
              console.log('[Builder Deploy] First deploy - using project URL for SEO:', siteUrl);
            }
          }

          // Generate sitemap if configured
          if (seoConfig?.includeSitemap !== false) {
            const hasSitemap = deployFiles.some(f => f.file === 'sitemap.xml' || f.file === 'public/sitemap.xml');
            if (!hasSitemap) {
              sendEvent({ type: 'progress', status: 'optimizing', message: 'Generating state-of-the-art sitemap...', progress: 14 });

              // Prepare files for sitemap (only paths needed)
              const sitemapFiles = deployFiles.map(f => ({
                path: f.file.startsWith('/') ? f.file : `/${f.file}`,
              }));

              // Generate state-of-the-art sitemap
              // NOTE: Only HTML files become sitemap URLs (not .tsx/.jsx source files)
              const sitemapResult = generateSitemapFromFiles(sitemapFiles, siteUrl, {
                includeImages: true,
                smartPriority: true,
              });

              deployFiles.push({
                file: 'public/sitemap.xml',
                data: sitemapResult.content,
                encoding: 'utf-8',
              });

              // Log detailed SEO stats
              console.log(`[Builder Deploy] Generated sitemap.xml:`);
              console.log(`  - URLs: ${sitemapResult.urlCount}`);
              console.log(`  - URL type: ${usedPlaceholder ? 'placeholder (will redeploy)' : 'real URL'}`);
            }
          }

          // Generate robots.txt if configured
          if (seoConfig?.includeRobotsTxt !== false) {
            const hasRobots = deployFiles.some(f => f.file === 'robots.txt' || f.file === 'public/robots.txt');
            if (!hasRobots) {
              sendEvent({ type: 'progress', status: 'optimizing', message: 'Generating state-of-the-art robots.txt...', progress: 15 });

              // Generate state-of-the-art robots.txt with all features
              const robotsResult = generateRobotsTxt({
                sitemapUrl: `${siteUrl}/sitemap.xml`,
                siteUrl: siteUrl,
                allowAll: true,
                hostDirective: true,
                allowGoogleAds: true,
                blockAICrawlers: false, // Allow AI crawlers by default
              });

              deployFiles.push({
                file: 'public/robots.txt',
                data: robotsResult.content,
                encoding: 'utf-8',
              });

              console.log(`[Builder Deploy] Generated robots.txt with ${robotsResult.rules.length} rules`);
            }
          }

          // ============================================================
          // ENHANCE INDEX.HTML WITH FULL SEO META TAGS
          // This injects: title, description, canonical, viewport,
          // Open Graph, Twitter Card, and Schema.org JSON-LD
          // ============================================================
          const indexHtmlIndex = deployFiles.findIndex(f => f.file === 'index.html');
          if (indexHtmlIndex !== -1) {
            sendEvent({ type: 'progress', status: 'optimizing', message: 'Injecting SEO meta tags...', progress: 16 });

            const currentIndexHtml = deployFiles[indexHtmlIndex].data;

            // Build SEO config with defaults from project name
            const fullSeoConfig: SEOConfigInput = {
              siteTitle: seoConfig?.siteTitle || artifactTitle || projectName,
              siteDescription: seoConfig?.siteDescription || `${artifactTitle || projectName} - Built with Alfred`,
              canonicalUrl: seoConfig?.canonicalUrl || siteUrl,
              ogTitle: seoConfig?.ogTitle || seoConfig?.siteTitle || artifactTitle || projectName,
              ogDescription: seoConfig?.ogDescription || seoConfig?.siteDescription || `${artifactTitle || projectName} - Built with Alfred`,
              ogType: seoConfig?.ogType || 'website',
              ogSiteName: seoConfig?.ogSiteName || artifactTitle || projectName,
              ogImage: seoConfig?.ogImage,
              twitterCard: seoConfig?.twitterCard || 'summary_large_image',
              twitterSite: seoConfig?.twitterSite,
              twitterCreator: seoConfig?.twitterCreator,
              faviconUrl: seoConfig?.faviconUrl,
              appleTouchIconUrl: seoConfig?.appleTouchIconUrl,
              language: seoConfig?.language || 'en',
              locale: seoConfig?.locale || 'en_US',
              allowIndexing: seoConfig?.allowIndexing !== false,
              allowFollowing: seoConfig?.allowFollowing !== false,
              autoGenerateSchema: seoConfig?.autoGenerateSchema !== false,
              ...seoConfig,
            };

            // Use the html-enhancer to inject ALL SEO meta tags
            const enhanceResult = enhanceHtml({
              html: currentIndexHtml,
              config: fullSeoConfig,
              projectName: artifactTitle || projectName,
              deployUrl: siteUrl,
            });

            // Update the file with enhanced HTML
            deployFiles[indexHtmlIndex] = {
              ...deployFiles[indexHtmlIndex],
              data: enhanceResult.html,
            };

            console.log('[Builder Deploy] Enhanced index.html with SEO:', enhanceResult.changes);
          }

          // ============================================================
          // END SEO PROCESSING - PROCEED TO DEPLOYMENT
          // ============================================================

          // Create deployment
          sendEvent({ type: 'progress', status: 'building', message: 'Uploading files...', progress: 30 });

          console.log('[Builder Deploy] Final file count:', deployFiles.length, 'files');

          const deployRes = await vercelRequest('/v13/deployments', {
            method: 'POST',
            body: JSON.stringify({
              name: vercelProjectName,
              files: deployFiles,
              projectSettings: {
                framework: 'vite',
                buildCommand: 'npm run build',
                outputDirectory: 'dist',
                installCommand: 'npm install',
              },
              target: 'production',
            }),
          }, vercelToken, teamId);

          if (!deployRes.ok) {
            const err = await deployRes.json();
            throw new Error(`Deployment failed: ${err.error?.message || JSON.stringify(err)}`);
          }

          const deployment = await deployRes.json();
          sendEvent({ type: 'progress', status: 'building', message: 'Building...', progress: 50 });

          // Poll for deployment status
          const deploymentId = deployment.id;
          const maxWait = 300000; // 5 minutes
          const startTime = Date.now();

          while (Date.now() - startTime < maxWait) {
            await new Promise(r => setTimeout(r, 3000));

            const statusRes = await vercelRequest(`/v13/deployments/${deploymentId}`, { method: 'GET' }, vercelToken, teamId);
            if (!statusRes.ok) continue;

            const status = await statusRes.json();
            const readyState = status.readyState;

            if (readyState === 'READY') {
              let url = `https://${status.alias?.[0] || status.url}`;
              let domainConfigured = false;

              // Configure custom domain if provided
              if (customDomain) {
                sendEvent({ type: 'progress', status: 'deploying', message: 'Configuring custom domain...', progress: 90 });
                try {
                  const domainRes = await vercelRequest(`/v10/projects/${vercelProjectId}/domains`, {
                    method: 'POST',
                    body: JSON.stringify({ name: customDomain }),
                  }, vercelToken, teamId);

                  if (domainRes.ok) {
                    const domainData = await domainRes.json();
                    domainConfigured = true;
                    if (domainData.verified) {
                      url = `https://${customDomain}`;
                      sendEvent({ type: 'progress', status: 'deploying', message: 'Custom domain verified!', progress: 95 });
                    } else {
                      sendEvent({ type: 'progress', status: 'deploying', message: 'Domain added - DNS verification pending', progress: 95 });
                    }
                  } else {
                    console.error('[Builder Deploy] Domain config failed:', await domainRes.text());
                  }
                } catch (domainErr) {
                  console.error('[Builder Deploy] Domain error:', domainErr);
                }
              }

              // Save to database
              const realUrl = `https://${vercelProjectName}.vercel.app`;
              let dbProjectId: string | undefined = savedProjectId;

              try {
                const client = await getDb();

                // Build enhanced files array for saving back to DB
                const enhancedFilesForDB = deployFiles
                  .filter(f => !f.file.startsWith('node_modules/') &&
                               !f.file.endsWith('.lock') &&
                               f.file !== 'package-lock.json')
                  .map(f => ({
                    path: f.file.startsWith('/') ? f.file : `/${f.file}`,
                    name: f.file.split('/').pop() || f.file,
                    content: f.data,
                    language: f.file.endsWith('.tsx') ? 'tsx' :
                             f.file.endsWith('.ts') ? 'typescript' :
                             f.file.endsWith('.jsx') ? 'jsx' :
                             f.file.endsWith('.js') ? 'javascript' :
                             f.file.endsWith('.html') ? 'html' :
                             f.file.endsWith('.css') ? 'css' :
                             f.file.endsWith('.json') ? 'json' : 'text',
                    isEntryPoint: f.file === 'index.html' || f.file === 'src/main.tsx',
                  }));

                // Debug: Log what we're about to save
                console.log('[Builder Deploy] Saving enhanced files to DB:', enhancedFilesForDB.length, 'files');
                const indexHtmlForDB = enhancedFilesForDB.find(f => f.path.includes('index.html'));
                if (indexHtmlForDB) {
                  console.log('[Builder Deploy] index.html to save (first 500 chars):');
                  console.log(indexHtmlForDB.content.slice(0, 500));
                  console.log('[Builder Deploy] Has DOCTYPE:', indexHtmlForDB.content.includes('<!DOCTYPE'));
                  console.log('[Builder Deploy] Has viewport:', indexHtmlForDB.content.includes('viewport'));
                }
                console.log('[Builder Deploy] savedProjectId:', savedProjectId);

                // If we have a saved project ID from the builder, update that record directly
                // NOTE: We don't update the 'name' field here because:
                // 1. The name was already set when the user saved the project
                // 2. Updating it could violate the unique (user_id, name) constraint
                if (savedProjectId) {
                  console.log('[Builder Deploy] Updating existing project by savedProjectId:', savedProjectId);
                  await client.db
                    .update(projects)
                    .set({
                      // Don't update name - it could conflict with existing project names
                      vercelProjectId,
                      vercelProjectName,
                      primaryDomain: `${vercelProjectName}.vercel.app`,
                      lastDeploymentId: deploymentId,
                      lastDeploymentStatus: 'ready',
                      lastDeployedAt: new Date(),
                      updatedAt: new Date(),
                      metadata: {
                        artifactId: artifactId || undefined,
                        lastDeployedUrl: realUrl,
                        files: enhancedFilesForDB,
                        fileCount: enhancedFilesForDB.length,
                        totalSize: enhancedFilesForDB.reduce((sum, f) => sum + (f.content?.length || 0), 0),
                        isBuilder: true,
                      },
                    })
                    .where(eq(projects.id, savedProjectId));
                  dbProjectId = savedProjectId;
                } else {
                  // Fall back to finding by vercelProjectId
                  const existingProjects = await client.db
                    .select()
                    .from(projects)
                    .where(and(eq(projects.userId, userId), eq(projects.vercelProjectId, vercelProjectId)))
                    .limit(1);

                  if (existingProjects.length > 0) {
                    await client.db
                      .update(projects)
                      .set({
                        name: artifactTitle || projectName,
                        vercelProjectId,
                        vercelProjectName,
                        primaryDomain: `${vercelProjectName}.vercel.app`,
                        lastDeploymentId: deploymentId,
                        lastDeploymentStatus: 'ready',
                        lastDeployedAt: new Date(),
                        updatedAt: new Date(),
                        metadata: {
                          ...((existingProjects[0].metadata as Record<string, unknown>) || {}),
                          artifactId: artifactId || undefined,
                          lastDeployedUrl: realUrl,
                          files: enhancedFilesForDB,
                          fileCount: enhancedFilesForDB.length,
                          totalSize: enhancedFilesForDB.reduce((sum, f) => sum + (f.content?.length || 0), 0),
                          isBuilder: true,
                        },
                      })
                      .where(eq(projects.id, existingProjects[0].id));
                    dbProjectId = existingProjects[0].id;
                  } else {
                    // Insert new project and get the ID
                    const insertResult = await client.db.insert(projects).values({
                      userId,
                      name: artifactTitle || projectName,
                      type: 'web_app',
                      vercelProjectId,
                      vercelProjectName,
                      primaryDomain: `${vercelProjectName}.vercel.app`,
                      lastDeploymentId: deploymentId,
                      lastDeploymentStatus: 'ready',
                      lastDeployedAt: new Date(),
                      metadata: {
                        artifactId: artifactId || undefined,
                        lastDeployedUrl: realUrl,
                        files: enhancedFilesForDB,
                        fileCount: enhancedFilesForDB.length,
                        totalSize: enhancedFilesForDB.reduce((sum, f) => sum + (f.content?.length || 0), 0),
                        isBuilder: true,
                      },
                    }).returning({ id: projects.id });

                    if (insertResult.length > 0) {
                      dbProjectId = insertResult[0].id;
                    }
                  }
                }

                console.log('[Builder Deploy] Database project ID:', dbProjectId);
              } catch (dbErr) {
                console.error('[Builder Deploy] DB error:', dbErr);
              }

              // ============================================================
              // SILENT REDEPLOY FOR SEO URL FIXUP
              // If we used placeholder URLs, now fix them with real URL
              // ============================================================
              if (usedPlaceholder) {
                console.log('[Builder Deploy] Triggering silent redeploy to fix SEO URLs...');

                // Replace placeholders with real URL
                const fixedFiles = replaceUrlPlaceholders(deployFiles, realUrl);

                // Check if any files were actually modified
                const filesModified = fixedFiles.some((f, i) => f.data !== deployFiles[i].data);

                if (filesModified) {
                  // Trigger silent redeploy in background (don't wait for it)
                  silentRedeploy(vercelProjectName, fixedFiles, vercelToken, teamId)
                    .then(result => {
                      if (result.success) {
                        console.log('[Builder Deploy] Silent redeploy completed - SEO URLs fixed');
                      } else {
                        console.error('[Builder Deploy] Silent redeploy failed:', result.error);
                      }
                    })
                    .catch(err => {
                      console.error('[Builder Deploy] Silent redeploy error:', err);
                    });

                  // Note: We don't wait for silent redeploy to complete
                  // The user sees the first deployment immediately
                  // SEO URLs will be correct within ~1-2 minutes
                  console.log('[Builder Deploy] Silent redeploy triggered in background');
                } else {
                  console.log('[Builder Deploy] No files contained placeholder - skipping silent redeploy');
                }
              }

              sendEvent({
                type: 'complete',
                result: {
                  status: 'ready',
                  url,
                  vercelProjectId,
                  vercelDeploymentId: deploymentId,
                  // Return DB project ID so builder can update currentProjectId
                  projectId: dbProjectId,
                  seo: seoAnalysis ? {
                    score: seoAnalysis.score,
                    grade: seoAnalysis.grade,
                    passedChecks: seoAnalysis.passedChecks,
                    totalChecks: seoAnalysis.totalChecks,
                  } : undefined,
                },
              });
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            if (readyState === 'ERROR' || readyState === 'CANCELED') {
              throw new Error(`Build ${readyState.toLowerCase()}: Check Vercel dashboard for details`);
            }

            const progressMap: Record<string, number> = {
              QUEUED: 55,
              INITIALIZING: 60,
              BUILDING: 75,
            };
            sendEvent({
              type: 'progress',
              status: 'building',
              message: `Build status: ${readyState}`,
              progress: progressMap[readyState] || 70,
            });
          }

          throw new Error('Deployment timed out');
        } catch (err) {
          sendEvent({
            type: 'error',
            error: { message: err instanceof Error ? err.message : 'Deployment failed' },
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[Builder Deploy] Fatal error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
