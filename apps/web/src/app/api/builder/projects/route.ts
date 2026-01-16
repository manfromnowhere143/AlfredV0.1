/**
 * Builder Projects API
 *
 * GET  - List user's projects
 * POST - Save a new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, alfredProjects, alfredProjectFiles, eq, desc, and, isNull, sql } from '@alfred/database';

export const maxDuration = 30;

// ============================================================================
// GET - List Projects
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

    // Fetch projects with file count
    const projects = await db
      .select({
        id: alfredProjects.id,
        name: alfredProjects.name,
        description: alfredProjects.description,
        framework: alfredProjects.framework,
        fileCount: alfredProjects.fileCount,
        totalSize: alfredProjects.totalSize,
        createdAt: alfredProjects.createdAt,
        updatedAt: alfredProjects.updatedAt,
        metadata: alfredProjects.metadata,
      })
      .from(alfredProjects)
      .where(and(eq(alfredProjects.userId, userId), isNull(alfredProjects.deletedAt)))
      .orderBy(desc(alfredProjects.updatedAt))
      .limit(limit);

    console.log(`[Builder] Listed ${projects.length} projects for user ${userId}`);

    return NextResponse.json({ projects });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    // Calculate totals
    const fileCount = files.length;
    const totalSize = files.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0);

    // Create project
    const [project] = await db
      .insert(alfredProjects)
      .values({
        userId,
        name,
        description,
        framework,
        entryPoint: entryPoint || files.find((f: any) => f.isEntryPoint)?.path || '/src/main.tsx',
        dependencies,
        devDependencies,
        fileCount,
        totalSize,
        lastBuildStatus: 'success',
        metadata: {
          llmModel: 'claude-sonnet-4',
          tags: [],
          isPublic: false,
        },
      })
      .returning();

    if (!project) {
      throw new Error('Failed to create project');
    }

    // Insert files
    const fileRecords = files.map((file: any) => ({
      alfredProjectId: project.id,
      path: file.path,
      name: file.name || file.path.split('/').pop() || 'unknown',
      content: file.content || '',
      language: file.language || 'typescript',
      fileType: file.fileType || 'component',
      size: file.content?.length || 0,
      lineCount: (file.content || '').split('\n').length,
      isEntryPoint: file.isEntryPoint || false,
      generatedBy: file.generatedBy || 'llm',
    }));

    if (fileRecords.length > 0) {
      await db.insert(alfredProjectFiles).values(fileRecords);
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
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}
