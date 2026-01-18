/**
 * /api/personas - List and Create personas
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, users, eq, desc } from '@alfred/database';
import * as schema from '@alfred/database';
import { PersonaRepository, PersonaService } from '@alfred/persona';
import { logger } from '@/lib/logger';

// Helper to get user from session token
async function getUserFromRequest(request: NextRequest) {
  const sessionToken = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    logger.debug('[Personas]', 'No session token found');
    return null;
  }

  // Look up session in database
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  if (!session?.userId) {
    logger.debug('[Personas]', 'No session found in DB');
    return null;
  }

  return session.userId;
}

// GET /api/personas - List all personas for user (FAST - only essential columns)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const userId = await getUserFromRequest(request);

    // SECURITY: Removed dev mode bypass that used hardcoded user ID
    // All requests must be authenticated

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FAST: Only select columns needed for listing (skip huge genome blob)
    const listStart = Date.now();
    const personas = await db
      .select({
        id: schema.personas.id,
        name: schema.personas.name,
        slug: schema.personas.slug,
        archetype: schema.personas.archetype,
        tagline: schema.personas.tagline,
        imageUrl: schema.personas.primaryImageUrl,
        modelUrl: schema.personas.modelUrl, // 3D GLB for LIVING avatar
        status: schema.personas.status,
        createdAt: schema.personas.createdAt,
        traits: schema.personas.traits,
        voiceId: schema.personas.voiceId,
      })
      .from(schema.personas)
      .where(eq(schema.personas.userId, userId))
      .orderBy(desc(schema.personas.createdAt))
      .limit(50);

    logger.debug('[Personas]', `GET completed in ${Date.now() - listStart}ms`, { count: personas.length });

    return NextResponse.json({ personas });
  } catch (error: unknown) {
    logger.error('[Personas]', 'Failed to list personas', error);
    return NextResponse.json({ error: 'Failed to list personas', details: String(error) }, { status: 500 });
  }
}

// POST /api/personas - Create new persona via full wizard pipeline
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 });
    }

    const body = await request.json();
    const { name, archetype, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);

    const result = await service.create(
      { userId, tier: 'pro' },
      { name, archetype, description: description || '' }
    );

    logger.debug('[Personas]', 'Persona created', { personaId: result.persona?.id });

    return NextResponse.json({
      persona: result.persona,
      wizardSessionId: result.wizardSessionId
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('[Personas]', 'Failed to create persona', error);

    return NextResponse.json({
      error: errorMessage || 'Failed to create persona',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}
