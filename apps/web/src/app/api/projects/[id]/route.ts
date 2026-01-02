import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, projects, artifacts, eq, desc } from '@alfred/database';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const arts = await db.select().from(artifacts).where(eq(artifacts.projectId, params.id)).orderBy(desc(artifacts.updatedAt));
    const latestArtifact = arts.length > 0 ? arts[0] : null;
    return NextResponse.json({ project, latestArtifact, artifacts: arts });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH - Update project (name, description, metadata for screenshots)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, metadata } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    // Merge metadata (don't replace entirely - preserve heroVideo when adding previewImage)
    if (metadata !== undefined) {
      const existingMetadata = (project.metadata as Record<string, unknown>) || {};
      updateData.metadata = {
        ...existingMetadata,
        ...metadata,
      };
    }

    // Update project
    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, params.id))
      .returning();

    console.log('[Projects API] Updated:', params.id, Object.keys(updateData));

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await db.delete(projects).where(eq(projects.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}