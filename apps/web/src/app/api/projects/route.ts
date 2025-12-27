import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db, projects, eq, desc } from '@alfred/database';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ data: [] });
    }

    const data = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API] GET /projects error:', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, type } = await request.json();

    const [newProj] = await db
      .insert(projects)
      .values({
        name,
        description: description || null,
        type: type || 'web_app',
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: newProj });
  } catch (error) {
    console.error('[API] POST /projects error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}