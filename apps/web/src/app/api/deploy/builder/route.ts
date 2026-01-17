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
}

interface VercelFile {
  file: string;
  data: string;
  encoding?: string;
}

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
    const { files, projectName, artifactId, artifactTitle } = body;

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
    const hasTailwind = allCode.includes('tailwind') || allCode.includes('@tailwind');

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

    console.log('[Builder Deploy] Deploying files:', vercelFiles.map(f => f.file));

    // SSE Stream for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          sendEvent({ type: 'progress', status: 'uploading', message: 'Preparing deployment...', progress: 10 });

          // Create or get project
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

          // Create deployment
          sendEvent({ type: 'progress', status: 'building', message: 'Uploading files...', progress: 30 });

          const deployRes = await vercelRequest('/v13/deployments', {
            method: 'POST',
            body: JSON.stringify({
              name: vercelProjectName,
              files: vercelFiles,
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
              const url = `https://${status.alias?.[0] || status.url}`;

              // Save to database
              try {
                const client = await getDb();
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
                      vercelProjectName,
                      primaryDomain: `${vercelProjectName}.vercel.app`,
                      lastDeploymentId: deploymentId,
                      lastDeploymentStatus: 'ready',
                      lastDeployedAt: new Date(),
                      updatedAt: new Date(),
                    })
                    .where(eq(projects.id, existingProjects[0].id));
                } else {
                  await client.db.insert(projects).values({
                    userId,
                    name: artifactTitle || projectName,
                    type: 'web_app',
                    vercelProjectId,
                    vercelProjectName,
                    primaryDomain: `${vercelProjectName}.vercel.app`,
                    lastDeploymentId: deploymentId,
                    lastDeploymentStatus: 'ready',
                    lastDeployedAt: new Date(),
                  });
                }
              } catch (dbErr) {
                console.error('[Builder Deploy] DB error:', dbErr);
              }

              sendEvent({
                type: 'complete',
                result: {
                  status: 'ready',
                  url,
                  vercelProjectId,
                  vercelDeploymentId: deploymentId,
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
