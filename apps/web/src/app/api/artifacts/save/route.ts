import { NextRequest, NextResponse } from 'next/server';
import { db, artifacts, projects, eq, desc, and } from '@alfred/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    const result = await db.delete(artifacts).where(eq(artifacts.conversationId, conversationId)).returning();
    return NextResponse.json({ success: true, deleted: result.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    const result = await db.select().from(artifacts).where(eq(artifacts.conversationId, conversationId)).orderBy(desc(artifacts.version)).limit(1);
    if (result.length > 0) {
      const artifactId = (result[0].metadata as any)?.artifactId || null;
      console.log('[GET] Found v' + result[0].version, 'artifactId:', artifactId);
      return NextResponse.json({ artifact: { id: result[0].id, code: result[0].code, language: result[0].language, title: result[0].title, version: result[0].version, metadata: result[0].metadata } });
    }
    return NextResponse.json({ artifact: null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { conversationId, artifactId, code, language = 'jsx', title = 'Artifact' } = body;
    console.log('[POST] artifactId:', artifactId, 'code length:', code?.length);
    if (!conversationId || !code) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    const existingProjects = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.name, 'Artifacts'))).limit(1);
    let projectId: string;
    if (existingProjects.length > 0) { projectId = existingProjects[0].id; } 
    else { const [p] = await db.insert(projects).values({ userId, name: 'Artifacts', description: 'Auto-generated' }).returning(); projectId = p.id; }
    const existing = await db.select().from(artifacts).where(eq(artifacts.conversationId, conversationId)).orderBy(desc(artifacts.version)).limit(1);
    const newVersion = existing.length > 0 ? existing[0].version + 1 : 1;
    const [artifact] = await db.insert(artifacts).values({ projectId, conversationId, code, language, title, version: newVersion, metadata: { artifactId } }).returning();
    console.log('[POST] Saved v' + newVersion, 'artifactId:', artifactId);
    return NextResponse.json({ success: true, artifact: { id: artifact.id, version: artifact.version } });
  } catch (error) {
    console.error('[POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}