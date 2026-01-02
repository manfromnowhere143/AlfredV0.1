/**
 * Deployment API Route - POST /api/deploy
 * 
 * Production-grade deployment with:
 * - SSE streaming for real-time progress
 * - Auto-fix with Claude Sonnet 4 (up to 3 attempts)
 * - Database persistence after successful deployment
 * - Artifact-to-project linking for edit/redeploy flow
 * - Proper error handling and cleanup
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { projects, artifacts } from '@alfred/database';
import { eq, and } from 'drizzle-orm';
import {
  deployArtifact,
  validateArtifact,
  type Artifact,
  type DeploymentRequest,
  type DomainConfig,
  type DeploymentProgressEvent,
  DeploymentError,
} from '@alfred/deploy';

// ============================================================================
// TYPES
// ============================================================================

interface DeployRequestBody {
  artifactId: string;
  artifactCode: string;
  artifactTitle: string;
  projectName: string;
  domainType: 'vercel' | 'custom';
  customDomain?: string;
  environmentVariables?: Record<string, string>;
}

// ============================================================================
// HELPERS
// ============================================================================

function getVercelToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN environment variable is not configured');
  return token;
}

function getVercelTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID;
}

/**
 * Auto-fix failed code using Claude Sonnet 4
 */
async function attemptAutoFix(
  originalCode: string,
  errorMessage: string,
  buildLogs: string[]
): Promise<string | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const logsContext = buildLogs.slice(-10).join('\n');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `Fix this React component that failed to deploy to Vercel.

ERROR: ${errorMessage}

BUILD LOGS (last 10 lines):
${logsContext}

ORIGINAL CODE:
\`\`\`jsx
${originalCode}
\`\`\`

Fix the code. Common issues: missing imports, TypeScript errors, invalid JSX, missing default export.
Return ONLY the fixed code in \`\`\`jsx blocks. No explanations.`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    const codeMatch = content.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/);
    return codeMatch?.[1]?.trim() || null;
  } catch (err) {
    console.error('[Deploy] Auto-fix error:', err);
    return null;
  }
}

/**
 * Save or update project in database after successful deployment
 * Also links the deployed artifact to the project for edit/redeploy flow
 */
async function saveProjectToDatabase(
  userId: string,
  artifactId: string,
  artifactTitle: string,
  result: {
    vercelProjectId?: string;
    vercelDeploymentId?: string;
    url?: string;
    status: string;
  },
  projectName: string
): Promise<void> {
  try {
    const client = await getDb();
    
    // Extract domain from URL (remove https://)
    const primaryDomain = result.url?.replace(/^https?:\/\//, '') || null;
    
    // Check if project already exists for this user with same Vercel project
    const existingProjects = await client.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.vercelProjectId, result.vercelProjectId || '')
        )
      )
      .limit(1);

    let projectId: string;

    if (existingProjects.length > 0) {
      // Update existing project
      projectId = existingProjects[0].id;
      await client.db
        .update(projects)
        .set({
          name: artifactTitle,
          vercelProjectName: projectName,
          primaryDomain: primaryDomain,
          lastDeploymentId: result.vercelDeploymentId,
          lastDeploymentStatus: result.status,
          lastDeployedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
      
      console.log(`[Deploy] Updated existing project: ${projectId}`);
    } else {
      // Create new project
      const [newProject] = await client.db
        .insert(projects)
        .values({
          userId,
          name: artifactTitle,
          type: 'web_app',
          vercelProjectId: result.vercelProjectId || null,
          vercelProjectName: projectName,
          primaryDomain: primaryDomain,
          lastDeploymentId: result.vercelDeploymentId,
          lastDeploymentStatus: result.status,
          lastDeployedAt: new Date(),
        })
        .returning();
      
      projectId = newProject.id;
      console.log(`[Deploy] Created new project: ${projectId}`);
    }

    // 🔗 Link the artifact to this project (enables Edit & Redeploy)
    if (artifactId && artifactId !== 'preview') {
      await client.db
        .update(artifacts)
        .set({ projectId: projectId })
        .where(eq(artifacts.id, artifactId));
      
      console.log(`[Deploy] Linked artifact ${artifactId} to project ${projectId}`);
    }
  } catch (err) {
    // Log but don't fail the deployment - Vercel deployment already succeeded
    console.error('[Deploy] Failed to save project to database:', err);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const MAX_AUTO_FIX_ATTEMPTS = 3;

  try {
    // Auth check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: DeployRequestBody = await request.json();
    const {
      artifactId,
      artifactCode,
      artifactTitle,
      projectName,
      domainType,
      customDomain,
      environmentVariables,
    } = body;

    if (!artifactCode || !projectName) {
      return new Response(
        JSON.stringify({ error: 'artifactCode and projectName are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Vercel token
    let vercelToken: string;
    try {
      vercelToken = getVercelToken();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Deployment service not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Domain config
    const domain: DomainConfig = {
      type: domainType,
      domain: domainType === 'custom' ? customDomain || '' : '',
      verified: false,
    };

    // SSE Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let currentCode = artifactCode;
        let attempt = 0;
        let lastError: string | null = null;
        let lastLogs: string[] = [];

        const sendEvent = (
          event: DeploymentProgressEvent | { type: string; [key: string]: unknown }
        ) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        while (attempt < MAX_AUTO_FIX_ATTEMPTS) {
          attempt++;

          const artifact: Artifact = {
            id: artifactId || 'preview',
            title: artifactTitle || 'Component',
            code: currentCode,
            language: 'jsx',
            conversationId: '',
            version: 1,
            createdAt: new Date(),
          };

          // Validate
          const validation = validateArtifact(artifact);
          if (!validation.valid) {
            sendEvent({
              type: 'error',
              error: {
                message: `Validation failed: ${validation.errors.join(', ')}`,
                code: 'PARSE_ERROR',
              },
            });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // Build project name with retry suffix
          const deployProjectName =
            attempt === 1
              ? projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
              : `${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-v${attempt}`;

          const deployRequest: DeploymentRequest = {
            artifactId: artifactId || 'preview',
            userId,
            projectName: deployProjectName,
            domain,
            environmentVariables,
          };

          if (attempt > 1) {
            sendEvent({
              type: 'progress',
              deploymentId: `attempt-${attempt}`,
              status: 'transforming',
              message: `🔧 Auto-fix attempt ${attempt}/${MAX_AUTO_FIX_ATTEMPTS}...`,
              progress: 10,
              timestamp: new Date(),
            });
          }

          try {
            const result = await deployArtifact(artifact, deployRequest, {
              vercelToken,
              teamId: getVercelTeamId(),
              timeout: 300000,
              onProgress: (event) => sendEvent({ type: 'progress', ...event }),
            });

            if (result.status === 'ready' && result.url) {
              // ✅ SUCCESS - Save to database and link artifact!
              await saveProjectToDatabase(
                userId,
                artifactId,
                artifactTitle || projectName,
                {
                  vercelProjectId: result.vercelProjectId,
                  vercelDeploymentId: result.vercelDeploymentId,
                  url: result.url,
                  status: 'ready',
                },
                deployProjectName
              );

              sendEvent({ type: 'complete', result });
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            lastError = result.error || 'Unknown build error';
            lastLogs = result.buildLogs || [];
          } catch (err) {
            lastError =
              err instanceof DeploymentError
                ? err.message
                : (err as Error).message;
            lastLogs = [];
          }

          // Try auto-fix if not last attempt
          if (attempt < MAX_AUTO_FIX_ATTEMPTS) {
            sendEvent({
              type: 'progress',
              deploymentId: `autofix-${attempt}`,
              status: 'transforming',
              message: `⚡ Alfred is analyzing the error and fixing...`,
              progress: 5,
              timestamp: new Date(),
            });

            const fixedCode = await attemptAutoFix(
              currentCode,
              lastError || '',
              lastLogs
            );

            if (fixedCode && fixedCode !== currentCode) {
              currentCode = fixedCode;
              sendEvent({
                type: 'progress',
                deploymentId: `autofix-${attempt}`,
                status: 'transforming',
                message: `✅ Code fixed, retrying deployment...`,
                progress: 8,
                timestamp: new Date(),
              });
            } else {
              // Can't fix, break out
              break;
            }
          }
        }

        // All attempts failed
        sendEvent({
          type: 'error',
          error: {
            message: lastError || 'Deployment failed after multiple attempts',
            code: 'BUILD_ERROR',
            attempts: attempt,
          },
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[Deploy] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
