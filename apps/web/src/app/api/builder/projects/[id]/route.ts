/**
 * Builder Project by ID API
 *
 * Uses existing projects table (same as regular Alfred)
 * Files are stored in metadata JSON
 *
 * GET    - Get project with files
 * PUT    - Update project
 * DELETE - Delete project (soft)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, projects, eq, and, isNull } from '@alfred/database';

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
      .from(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const meta = project.metadata as any || {};
    const files = meta.files || [];

    console.log(`[Builder] Loaded project: ${id} (${files.length} files)`);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        framework: meta.framework || 'react',
        entryPoint: meta.entryPoint || '/src/main.tsx',
        dependencies: meta.dependencies || {},
        devDependencies: meta.devDependencies || {},
        fileCount: meta.fileCount || files.length,
        totalSize: meta.totalSize || 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      files: files.map((f: any, i: number) => ({
        id: `file-${i}`,
        path: f.path,
        name: f.name || f.path?.split('/').pop() || 'unknown',
        content: f.content || '',
        language: f.language || 'typescript',
        isEntryPoint: f.isEntryPoint || false,
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
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, framework, files, dependencies, devDependencies } = body;

    const existingMeta = existing.metadata as any || {};

    // Update project with new files in metadata
    const fileCount = files?.length || existingMeta.fileCount || 0;
    const totalSize = files?.reduce((sum: number, f: any) => sum + (f.content?.length || 0), 0) || existingMeta.totalSize || 0;

    await db
      .update(projects)
      .set({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        metadata: {
          ...existingMeta,
          framework: framework || existingMeta.framework || 'react',
          dependencies: dependencies || existingMeta.dependencies || {},
          devDependencies: devDependencies || existingMeta.devDependencies || {},
          fileCount,
          totalSize,
          files: files ? files.map((f: any) => ({
            path: f.path,
            name: f.name || f.path?.split('/').pop() || 'unknown',
            content: f.content || '',
            language: f.language || 'typescript',
            isEntryPoint: f.isEntryPoint || false,
          })) : existingMeta.files,
        },
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

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
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(projects.id, id),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ));

    console.log(`[Builder] Deleted project: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Builder] Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
