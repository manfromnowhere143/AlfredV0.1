import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages, users, eq } from '@alfred/database';
import { getServerSession } from 'next-auth';

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const session = await getServerSession();
    const email = session?.user?.email;
    if (!email) return null;
    
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user?.id || null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromSession();
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.id)).limit(1);
    
    if (!conv) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    // Allow if user owns it OR if not logged in (for demo)
    if (userId && conv.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.id)).orderBy(messages.createdAt);
    return NextResponse.json({ success: true, data: { ...conv, messages: msgs } });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.id)).limit(1);
    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    await db.delete(conversations).where(eq(conversations.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
