import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages, sessions, eq } from '@alfred/database';

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.id)).limit(1);
    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.id)).orderBy(messages.createdAt);
    return NextResponse.json({ success: true, data: msgs });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.id)).limit(1);
    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const { role, content } = await req.json();
    const [msg] = await db.insert(messages).values({ role, content, conversationId: params.id }).returning();
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, params.id));
    return NextResponse.json({ success: true, data: msg }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
