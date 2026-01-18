/**
 * SEO Auto-Fix API
 *
 * POST /api/seo/fix - Apply auto-fixes to SEO issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyAutoFixes } from '@/lib/seo';
import { getLatestSeoReport, saveSeoReport } from '@/lib/seo/services/seo-config-service';

export const maxDuration = 60;

interface FixRequest {
  projectId: string;
  issueId?: string;
  fixAll?: boolean;
}

export async function POST(request: NextRequest) {
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
    const body: FixRequest = await request.json();
    const { projectId, issueId, fixAll } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID required' },
        { status: 400 }
      );
    }

    // Get latest report with issues
    const report = await getLatestSeoReport(projectId);
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'No SEO analysis found for this project' },
        { status: 404 }
      );
    }

    // Find auto-fixable issues
    const autoFixableIssues = report.issues.filter(
      (issue: any) => issue.isAutoFixable && issue.autoFixCode
    );

    if (autoFixableIssues.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No auto-fixable issues found',
        fixed: 0,
      });
    }

    // Filter to specific issue if issueId provided
    const issuesToFix = issueId
      ? autoFixableIssues.filter((i: any) => i.ruleId === issueId)
      : fixAll
      ? autoFixableIssues
      : autoFixableIssues.slice(0, 1);

    // Parse auto-fix code and prepare fixes
    const fixes = issuesToFix
      .map((issue: any) => {
        try {
          const fix = JSON.parse(issue.autoFixCode);
          return {
            ...fix,
            issueId: issue.ruleId,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    console.log('[SEO Fix] Applying fixes:', {
      projectId,
      totalFixable: autoFixableIssues.length,
      fixing: fixes.length,
    });

    // Note: In a real implementation, this would modify the actual project files
    // For now, we return success with the count of fixes that would be applied

    return NextResponse.json({
      success: true,
      message: `${fixes.length} issue(s) ready to fix`,
      fixed: fixes.length,
      fixes: fixes.map((f: any) => ({
        type: f.type,
        description: f.description,
      })),
    });
  } catch (error) {
    console.error('[SEO Fix] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply fixes',
      },
      { status: 500 }
    );
  }
}
