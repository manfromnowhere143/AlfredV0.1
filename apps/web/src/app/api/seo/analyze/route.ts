/**
 * SEO Analyze API
 *
 * GET /api/seo/analyze?projectId=xxx - Get SEO analysis for a project
 * POST /api/seo/analyze - Run SEO analysis on provided files
 *
 * Supports both:
 * - Alfred Pro Builder projects (files in projects.metadata.files)
 * - Alfred Regular artifacts (single code in artifacts.code)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeSEO, generateSEOSummary } from '@/lib/seo';
import { saveSeoReport } from '@/lib/seo/services/seo-config-service';
import { db, projects, artifacts, eq, desc } from '@alfred/database';
import type { AnalyzeRequest, AnalyzeResponse } from '@/lib/seo/types';

export const maxDuration = 60;

/**
 * GET - Analyze project by fetching files from project metadata or artifacts
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
    }

    // Fetch project
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    let files: Array<{ path: string; content: string }> = [];

    // First, check if this is an Alfred Pro Builder project (files in metadata)
    const metadata = project.metadata as any;
    if (metadata?.files && Array.isArray(metadata.files) && metadata.files.length > 0) {
      console.log('[SEO Analyze] Found files in project metadata:', metadata.files.length);
      files = metadata.files.map((f: any) => ({
        path: f.path?.startsWith('/') ? f.path : `/${f.path}`,
        content: f.content || '',
      }));
    }

    // If no files in metadata, check artifacts table (for Alfred Regular)
    if (files.length === 0) {
      const latestArtifact = await db.query.artifacts.findFirst({
        where: eq(artifacts.projectId, projectId),
        orderBy: [desc(artifacts.version)],
      });

      if (latestArtifact?.code) {
        console.log('[SEO Analyze] Found artifact code');
        // Single artifact - treat as index.html
        files = [{
          path: '/index.html',
          content: latestArtifact.code,
        }];
      }
    }

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        result: null,
        message: 'No files found. Save your project first.',
      });
    }

    // Get deploy URL
    const deployUrl = project.primaryDomain ? `https://${project.primaryDomain}` : undefined;

    // Run SEO analysis
    const result = await analyzeSEO(files, {
      projectName: project.name,
      deployUrl,
    });

    console.log('[SEO Analyze GET] Analysis complete:', {
      projectId,
      fileCount: files.length,
      score: result.score,
      grade: result.grade,
      issueCount: result.issues.length,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[SEO Analyze GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request
    const body: AnalyzeRequest = await request.json();
    const { files, projectName, deployUrl, seoConfig } = body;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!projectName) {
      return NextResponse.json(
        { success: false, error: 'Project name required' },
        { status: 400 }
      );
    }

    console.log('[SEO Analyze] Starting analysis:', {
      projectName,
      fileCount: files.length,
      hasConfig: !!seoConfig,
    });

    // Run analysis
    const result = await analyzeSEO(files, {
      projectName,
      deployUrl,
      seoConfig,
      focusKeywords: seoConfig?.focusKeywords,
    });

    // Generate summary for logging
    const summary = generateSEOSummary(result);
    console.log('[SEO Analyze] Analysis complete:', {
      score: summary.score,
      grade: summary.grade,
      issues: result.issues.length,
      critical: summary.criticalCount,
      autoFixable: summary.autoFixCount,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[SEO Analyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}
