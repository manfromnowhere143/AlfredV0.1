import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, conversations, eq, desc } from '@alfred/database';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ data: [] });
    }

    const data = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API] GET /conversations error:', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, projectId, mode } = await request.json();

    const [newConv] = await db
      .insert(conversations)
      .values({
        title: title || 'New Chat',
        userId: session.user.id,
        projectId: projectId || null,
        mode: mode || 'build',
      })
      .returning();

    console.log(`[API] Created conversation: ${newConv.id}`);
    return NextResponse.json({ data: newConv });
  } catch (error) {
    console.error('[API] POST /conversations error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}