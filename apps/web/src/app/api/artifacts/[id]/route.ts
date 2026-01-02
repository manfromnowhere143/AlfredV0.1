import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, artifacts, projects, eq } from '@alfred/database';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, params.id)).limit(1);
    if (!artifact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    
    // Check ownership via project if exists
    if (artifact.projectId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, artifact.projectId)).limit(1);
      if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    
    return NextResponse.json({ success: true, data: artifact });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, params.id)).limit(1);
    if (!artifact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    
    if (artifact.projectId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, artifact.projectId)).limit(1);
      if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    
    const { code, title } = await req.json();
    const [updated] = await db.update(artifacts).set({ code, title: title || artifact.title, version: artifact.version + 1, updatedAt: new Date() }).where(eq(artifacts.id, params.id)).returning();
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, params.id)).limit(1);
    if (!artifact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    
    if (artifact.projectId) {
      const [project] = await db.select().from(projects).where(eq(projects.id, artifact.projectId)).limit(1);
      if (!project || project.userId !== session.user.id) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
    }
    
    await db.delete(artifacts).where(eq(artifacts.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
