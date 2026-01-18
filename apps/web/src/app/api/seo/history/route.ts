/**
 * SEO History API
 *
 * GET /api/seo/history - Get SEO report history for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSeoReportHistory } from '@/lib/seo/services/seo-config-service';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID required' },
        { status: 400 }
      );
    }

    // Fetch history
    const reports = await getSeoReportHistory(projectId, limit);

    // Transform to match expected format
    const formattedReports = reports.map((report) => ({
      id: report.id,
      score: report.overallScore,
      grade: report.grade,
      criticalCount: report.criticalCount,
      warningCount: report.warningCount,
      infoCount: 0, // Not stored separately in history query
      passedCount: 0,
      createdAt: report.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      reports: formattedReports,
    });
  } catch (error) {
    console.error('[SEO History] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch history',
      },
      { status: 500 }
    );
  }
}
