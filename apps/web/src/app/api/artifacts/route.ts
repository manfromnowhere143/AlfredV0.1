import { NextRequest, NextResponse } from 'next/server';
import { db, artifacts, projects, sessions, eq } from '@alfred/database';

async function getUserId(req: NextRequest): Promise<string | null> {
  const sessionToken = req.cookies.get('next-auth.session-token')?.value
    || req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  return session?.userId || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { title, code, language, projectId, conversationId } = await req.json();
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project || project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    const [artifact] = await db.insert(artifacts).values({ title, code, language: language || 'jsx', projectId, conversationId }).returning();
    await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
    return NextResponse.json({ success: true, data: artifact }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
