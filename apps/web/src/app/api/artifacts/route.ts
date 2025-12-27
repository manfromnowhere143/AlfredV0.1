import { NextRequest, NextResponse } from 'next/server';
import { db, artifacts, projects, eq } from '@alfred/database';

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user-id';
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { title, code, language, projectId, conversationId } = await req.json();
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project || project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    const [artifact] = await db.insert(artifacts).values({ title, code, language: language || 'jsx', projectId, conversationId }).returning();
    await db.update(projects).set({ lastActiveAt: new Date() }).where(eq(projects.id, projectId));
    return NextResponse.json({ success: true, data: artifact }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
