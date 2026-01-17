/**
 * Builder Projects API
 *
 * Uses existing projects + artifacts tables (same as regular Alfred)
 * Stores multi-file projects in artifacts with type: 'builder-project'
 *
 * GET  - List user's builder projects
 * POST - Save a new builder project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, projects, artifacts, eq, desc, and, isNull } from '@alfred/database';

export const maxDuration = 30;

// ============================================================================
// GET - List Builder Projects
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch all user projects and filter for builder projects (isBuilder: true in metadata)
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        type: projects.type,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        metadata: projects.metadata,
      })
      .from(projects)
      .where(and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ))
      .orderBy(desc(projects.updatedAt))
      .limit(100); // Get more to filter

    // Filter for builder projects (has isBuilder flag or has files array)
    const builderProjects = userProjects.filter(p => {
      const meta = p.metadata as any;
      return meta?.isBuilder === true || Array.isArray(meta?.files);
    }).slice(0, limit);

    // Map to expected format
    const projectsList = builderProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      framework: (p.metadata as any)?.framework || 'react',
      fileCount: (p.metadata as any)?.fileCount || 0,
      totalSize: (p.metadata as any)?.totalSize || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    console.log(`[Builder] Listed ${projectsList.length} projects for user ${userId}`);

    return NextResponse.json({ projects: projectsList });
  } catch (error) {
    console.error('[Builder] Error listing projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

// ============================================================================
// POST - Save Project
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      framework = 'react',
      entryPoint,
      dependencies = {},
      devDependencies = {},
      files = [],
    } = body;

    console.log('[Builder:POST] Saving project:', { name, fileCount: files?.length, framework });

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    // Calculate totals
    const fileCount = files.length;
    const totalSize = files.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0);

    // Create project in existing projects table (type='web_app', isBuilder=true in metadata)
    const [project] = await db
      .insert(projects)
      .values({
        userId,
        name,
        description: description || '',
        type: 'web_app',
        metadata: {
          isBuilder: true,
          framework,
          entryPoint: entryPoint || files.find((f: any) => f.isEntryPoint)?.path || '/src/main.tsx',
          dependencies,
          devDependencies,
          fileCount,
          totalSize,
          files: files.map((f: any) => ({
            path: f.path,
            name: f.name || f.path.split('/').pop() || 'unknown',
            content: f.content || '',
            language: f.language || 'typescript',
            isEntryPoint: f.isEntryPoint || false,
          })),
        },
      })
      .returning();

    if (!project) {
      throw new Error('Project insert returned empty');
    }

    console.log(`[Builder] Saved project: ${project.id} (${fileCount} files, ${totalSize} bytes)`);

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        fileCount,
        totalSize,
      },
    });
  } catch (error) {
    console.error('[Builder] Error saving project:', error);
    const message = error instanceof Error ? error.message : 'Failed to save project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
