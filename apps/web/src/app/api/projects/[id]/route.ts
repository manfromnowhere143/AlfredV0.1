import { NextRequest, NextResponse } from 'next/server';
import { db, projects, artifacts, eq, desc, sql } from '@alfred/database';

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user-id';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
    if (!project || project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const arts = await db.select().from(artifacts).where(eq(artifacts.projectId, params.id)).orderBy(desc(artifacts.updatedAt));
    return NextResponse.json({ success: true, data: { ...project, artifacts: arts } });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1);
    if (!project || project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    await db.delete(projects).where(eq(projects.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
