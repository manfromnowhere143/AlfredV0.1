import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, users, eq } from '@alfred/database';
import { desc } from 'drizzle-orm';
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }
    const result = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt)).limit(50);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { title, projectId } = await req.json();
    const [conv] = await db.insert(conversations).values({ title: title || 'New Chat', userId, projectId: projectId || null }).returning();
    return NextResponse.json({ success: true, data: conv }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
