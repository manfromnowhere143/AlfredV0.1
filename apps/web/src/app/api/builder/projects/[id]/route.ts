/**
 * Builder Project by ID API
 *
 * GET    - Get project with files
 * PUT    - Update project
 * DELETE - Delete project (soft)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, alfredProjects, alfredProjectFiles, eq, and, isNull } from '@alfred/database';

export const maxDuration = 30;

// ============================================================================
// GET - Get Project with Files
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const [project] = await db
      .select()
      .from(alfredProjects)
      .where(and(
        eq(alfredProjects.id, id),
        eq(alfredProjects.userId, userId),
        isNull(alfredProjects.deletedAt)
      ))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get files
    const files = await db
      .select()
      .from(alfredProjectFiles)
      .where(and(
        eq(alfredProjectFiles.alfredProjectId, id),
        isNull(alfredProjectFiles.deletedAt)
      ));

    console.log(`[Builder] Loaded project: ${id} (${files.length} files)`);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        framework: project.framework,
        entryPoint: project.entryPoint,
        dependencies: project.dependencies,
        devDependencies: project.devDependencies,
        fileCount: project.fileCount,
        totalSize: project.totalSize,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      files: files.map(f => ({
        id: f.id,
        path: f.path,
        name: f.name,
        content: f.content,
        language: f.language,
        fileType: f.fileType,
        size: f.size,
        lineCount: f.lineCount,
        isEntryPoint: f.isEntryPoint,
        generatedBy: f.generatedBy,
      })),
    });
  } catch (error) {
    console.error('[Builder] Error getting project:', error);
    return NextResponse.json({ error: 'Failed to get project' }, { status: 500 });
  }
}

// ============================================================================
// PUT - Update Project
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const [existing] = await db
      .select({ id: alfredProjects.id })
      .from(alfredProjects)
      .where(and(
        eq(alfredProjects.id, id),
        eq(alfredProjects.userId, userId),
        isNull(alfredProjects.deletedAt)
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, files } = body;

    // Update project metadata
    await db
      .update(alfredProjects)
      .set({
        name: name || undefined,
        description: description || undefined,
        fileCount: files?.length,
        totalSize: files?.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0),
        updatedAt: new Date(),
      })
      .where(eq(alfredProjects.id, id));

    // If files provided, replace all files
    if (files && files.length > 0) {
      // Soft delete existing files
      await db
        .update(alfredProjectFiles)
        .set({ deletedAt: new Date() })
        .where(eq(alfredProjectFiles.alfredProjectId, id));

      // Insert new files
      const fileRecords = files.map((file: any) => ({
        alfredProjectId: id,
        path: file.path,
        name: file.name || file.path.split('/').pop() || 'unknown',
        content: file.content || '',
        language: file.language || 'typescript',
        fileType: file.fileType || 'component',
        size: file.content?.length || 0,
        lineCount: (file.content || '').split('\n').length,
        isEntryPoint: file.isEntryPoint || false,
        generatedBy: file.generatedBy || 'user',
      }));

      await db.insert(alfredProjectFiles).values(fileRecords);
    }

    console.log(`[Builder] Updated project: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Builder] Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Soft Delete Project
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and soft delete
    const result = await db
      .update(alfredProjects)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(alfredProjects.id, id),
        eq(alfredProjects.userId, userId),
        isNull(alfredProjects.deletedAt)
      ));

    console.log(`[Builder] Deleted project: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Builder] Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
