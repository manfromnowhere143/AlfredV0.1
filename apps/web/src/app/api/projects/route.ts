import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, projects, eq, desc } from '@alfred/database';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: Input validation
// ═══════════════════════════════════════════════════════════════════════════════
const VALID_PROJECT_TYPES = ['web_app', 'dashboard', 'api', 'library', 'mobile', 'cli'] as const;
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

function sanitizeString(input: unknown, maxLength: number = 500): string | null {
  if (typeof input !== 'string') return null;
  // Remove control characters and trim
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength) || null;
}

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
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" } });
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, description, type } = body;

    // Validate required fields
    const sanitizedName = sanitizeString(name, MAX_NAME_LENGTH);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Validate optional fields
    const sanitizedDescription = sanitizeString(description, MAX_DESCRIPTION_LENGTH);
    const validType = VALID_PROJECT_TYPES.includes(type) ? type : 'web_app';

    const [newProj] = await db
      .insert(projects)
      .values({
        name: sanitizedName,
        description: sanitizedDescription,
        type: validType,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: newProj });
  } catch (error) {
    console.error('[API] POST /projects error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
