import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages, eq } from '@alfred/database';

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user-id';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
