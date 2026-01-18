/**
 * Check Project API
 *
 * GET /api/deploy/check-project?artifactId=xxx
 * Returns existing project deployment info if previously deployed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { projects, sql } from '@alfred/database';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artifactId = request.nextUrl.searchParams.get('artifactId');

    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId required' }, { status: 400 });
    }

    const client = await getDb();

    // Query for projects where metadata contains this artifactId
    const existingProjects = await client.db
      .select({
        id: projects.id,
        name: projects.name,
        vercelProjectName: projects.vercelProjectName,
        primaryDomain: projects.primaryDomain,
        lastDeployedAt: projects.lastDeployedAt,
        metadata: projects.metadata,
      })
      .from(projects)
      .where(
        sql`${projects.userId} = ${session.user.id} AND ${projects.metadata}->>'artifactId' = ${artifactId}`
      )
      .limit(1);

    if (existingProjects.length > 0) {
      const project = existingProjects[0];
      return NextResponse.json({
        found: true,
        projectName: project.vercelProjectName || project.name,
        deployedUrl: project.primaryDomain
          ? `https://${project.primaryDomain}`
          : (project.metadata as Record<string, unknown>)?.lastDeployedUrl || null,
        lastDeployedAt: project.lastDeployedAt,
      });
    }

    return NextResponse.json({
      found: false,
    });
  } catch (error) {
    console.error('[Check Project] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check project' },
      { status: 500 }
    );
  }
}
