import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, conversations, eq, desc } from '@alfred/database';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: Input validation
// ═══════════════════════════════════════════════════════════════════════════════
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_MODES = ['build', 'teach', 'review'] as const;
const MAX_TITLE_LENGTH = 200;

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
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" } });
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { title, projectId, mode } = body;

    // Validate and sanitize inputs
    const sanitizedTitle = sanitizeString(title, MAX_TITLE_LENGTH) || 'New Chat';

    // Validate projectId if provided
    if (projectId !== undefined && projectId !== null) {
      if (typeof projectId !== 'string' || !UUID_REGEX.test(projectId)) {
        return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
      }
    }

    // Validate mode
    const validMode = VALID_MODES.includes(mode) ? mode : 'build';

    const [newConv] = await db
      .insert(conversations)
      .values({
        title: sanitizedTitle,
        userId: session.user.id,
        projectId: projectId || null,
        mode: validMode,
      })
      .returning();

    console.log(`[API] Created conversation: ${newConv.id}`);
    return NextResponse.json({ data: newConv });
  } catch (error) {
    console.error('[API] POST /conversations error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}