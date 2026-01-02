import { NextRequest, NextResponse } from 'next/server';
import { db, artifacts, projects, eq, desc, and, sql } from '@alfred/database';
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
    
    // Get ALL artifacts for this conversation, ordered by version desc
    const allArtifacts = await db.select().from(artifacts)
      .where(eq(artifacts.conversationId, conversationId))
      .orderBy(desc(artifacts.version));
    
    if (allArtifacts.length === 0) {
      return NextResponse.json({ artifact: null, artifacts: [] });
    }
    
    // Group by artifactId and get latest version of each
    const latestByArtifactId = new Map<string, typeof allArtifacts[0]>();
    for (const art of allArtifacts) {
      const artifactId = (art.metadata as any)?.artifactId;
      if (artifactId && !latestByArtifactId.has(artifactId)) {
        latestByArtifactId.set(artifactId, art);
      }
    }
    
    const uniqueArtifacts = Array.from(latestByArtifactId.entries()).map(([artifactId, art]) => ({
      id: art.id,
      artifactId,
      code: art.code,
      language: art.language,
      title: art.title,
      version: art.version,
      metadata: art.metadata
    }));
    
    console.log('[GET] Found', uniqueArtifacts.length, 'unique artifacts for conversation');
    
    // Return both formats for backward compatibility
    const latest = allArtifacts[0];
    const latestArtifactId = (latest.metadata as any)?.artifactId || null;
    
    return NextResponse.json({ 
      // Old format (single artifact)
      artifact: { 
        id: latest.id, 
        code: latest.code, 
        language: latest.language, 
        title: latest.title, 
        version: latest.version, 
        metadata: latest.metadata 
      },
      // New format (all unique artifacts)
      artifacts: uniqueArtifacts
    });
  } catch (error) {
    console.error('[GET] Error:', error);
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
    
    // Get or create default project
    const existingProjects = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.name, 'Artifacts'))).limit(1);
    let projectId: string;
    if (existingProjects.length > 0) { 
      projectId = existingProjects[0].id; 
    } else { 
      const [p] = await db.insert(projects).values({ userId, name: 'Artifacts', description: 'Auto-generated' }).returning(); 
      projectId = p.id; 
    }
    
    // Get existing versions for THIS specific artifactId
    const existing = await db.select().from(artifacts)
      .where(eq(artifacts.conversationId, conversationId))
      .orderBy(desc(artifacts.version));
    
    // Find max version for this specific artifactId
    let maxVersionForArtifact = 0;
    for (const art of existing) {
      if ((art.metadata as any)?.artifactId === artifactId) {
        maxVersionForArtifact = Math.max(maxVersionForArtifact, art.version);
      }
    }
    
    const newVersion = maxVersionForArtifact + 1;
    const [artifact] = await db.insert(artifacts).values({ 
      projectId, 
      conversationId, 
      code, 
      language, 
      title, 
      version: newVersion, 
      metadata: { artifactId } 
    }).returning();
    
    console.log('[POST] Saved v' + newVersion, 'artifactId:', artifactId);
    return NextResponse.json({ success: true, artifact: { id: artifact.id, version: artifact.version } });
  } catch (error) {
    console.error('[POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
