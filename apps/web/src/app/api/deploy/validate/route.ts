/**
 * Deployment Validation API Route - POST /api/deploy/validate
 * Validates artifact code directly without database lookup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  validateArtifact,
  analyzeArtifact,
  isValidDomain,
  type Artifact,
} from '@alfred/deploy';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { artifactId, artifactCode, artifactTitle, projectName, customDomain } = body;

    // Create artifact from provided code (no DB lookup needed)
    const artifact: Artifact = {
      id: artifactId || 'preview',
      title: artifactTitle || 'Component',
      code: artifactCode || '',
      language: 'jsx',
      conversationId: '',
      version: 1,
      createdAt: new Date(),
    };

    if (!artifact.code) {
      return NextResponse.json({
        valid: false,
        errors: ['No artifact code provided'],
      });
    }

    // Run validation
    const validation = validateArtifact(artifact);

    // Analyze artifact
    let analysis = null;
    try {
      const parsed = analyzeArtifact(artifact);
      analysis = {
        type: parsed.type,
        componentName: parsed.componentName,
        dependencies: parsed.dependencies.map((d) => d.name),
        usesTailwind: parsed.usesTailwind,
        usesTypeScript: parsed.usesTypeScript,
        usesHooks: parsed.usesHooks,
      };
    } catch (e) {
      validation.errors.push(`Analysis failed: ${(e as Error).message}`);
    }

    // Validate project name
    const projectNameErrors: string[] = [];
    if (projectName) {
      if (projectName.length < 3) {
        projectNameErrors.push('Project name must be at least 3 characters');
      }
      if (projectName.length > 100) {
        projectNameErrors.push('Project name must be less than 100 characters');
      }
      if (!/^[a-zA-Z0-9-]+$/.test(projectName)) {
        projectNameErrors.push('Project name can only contain letters, numbers, and hyphens');
      }
    }

    // Validate custom domain
    const domainErrors: string[] = [];
    if (customDomain && !isValidDomain(customDomain)) {
      domainErrors.push('Invalid domain format');
    }

    const serviceConfigured = !!process.env.VERCEL_TOKEN;

    return NextResponse.json({
      valid: validation.valid && projectNameErrors.length === 0 && domainErrors.length === 0,
      artifact: { id: artifact.id, title: artifact.title, language: artifact.language },
      validation: { valid: validation.valid, errors: validation.errors, warnings: validation.warnings },
      analysis,
      projectName: {
        valid: projectNameErrors.length === 0,
        errors: projectNameErrors,
        suggested: projectName?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || artifact.title.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      },
      domain: customDomain ? { valid: domainErrors.length === 0, errors: domainErrors } : null,
      service: { configured: serviceConfigured },
    });
  } catch (error) {
    console.error('[Deploy/Validate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
