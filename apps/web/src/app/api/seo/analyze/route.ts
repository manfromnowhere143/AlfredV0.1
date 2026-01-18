/**
 * SEO Analyze API
 *
 * POST /api/seo/analyze - Run SEO analysis on files
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeSEO, generateSEOSummary } from '@/lib/seo';
import { saveSeoReport } from '@/lib/seo/services/seo-config-service';
import type { AnalyzeRequest, AnalyzeResponse } from '@/lib/seo/types';

export const maxDuration = 60;

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
