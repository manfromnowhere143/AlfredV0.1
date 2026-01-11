/**
 * /api/personas - List and Create personas
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, users, eq, desc } from '@alfred/database';
import * as schema from '@alfred/database';
import { PersonaRepository, PersonaService } from '@alfred/persona';

// Helper to get user from session token
async function getUserFromRequest(request: NextRequest) {
  const sessionToken = request.cookies.get('next-auth.session-token')?.value 
    || request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  if (!sessionToken) {
    console.log('No session token found');
    return null;
  }
  
  console.log('Session token:', sessionToken.substring(0, 20) + '...');
  
  // Look up session in database
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);
  
  if (!session?.userId) {
    console.log('No session found in DB');
    return null;
  }
  
  console.log('Found user ID:', session.userId);
  return session.userId;
}

// GET /api/personas - List all personas for user (FAST - only essential columns)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('[GET /api/personas] Starting fast query...');
    let userId = await getUserFromRequest(request);

    // DEV MODE: If no auth, get the first user for development
    if (!userId && process.env.NODE_ENV === 'development') {
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      userId = firstUser?.id || null;
      console.log('[GET /api/personas] DEV MODE - using first user:', userId);
    }

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

    console.log(`[GET /api/personas] Fast query took ${Date.now() - listStart}ms, found ${personas.length} personas`);

    // Log first persona imageUrl for debugging
    if (personas.length > 0) {
      console.log(`[GET /api/personas] First: ${personas[0].name}, imageUrl: ${personas[0].imageUrl?.substring(0, 50) || 'NONE'}...`);
    }

    return NextResponse.json({ personas });
  } catch (error: unknown) {
    console.error('Failed to list personas:', error);
    return NextResponse.json({ error: 'Failed to list personas', details: String(error) }, { status: 500 });
  }
}

// POST /api/personas - Create new persona via full wizard pipeline
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/personas] Starting persona creation...');

    const userId = await getUserFromRequest(request);
    console.log('[POST /api/personas] User ID:', userId);

    if (!userId) {
      console.log('[POST /api/personas] No user ID - unauthorized');
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 });
    }

    const body = await request.json();
    const { name, archetype, description } = body;
    console.log('[POST /api/personas] Request body:', { name, archetype, description: description?.substring(0, 50) });

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    console.log('[POST /api/personas] Creating repository and service...');
    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);

    console.log('[POST /api/personas] Calling service.create...');
    const result = await service.create(
      { userId, tier: 'pro' },
      { name, archetype, description: description || '' }
    );

    console.log('[POST /api/personas] Success! Persona created:', result.persona?.id);

    return NextResponse.json({
      persona: result.persona,
      wizardSessionId: result.wizardSessionId
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[POST /api/personas] FAILED:', errorMessage);
    console.error('[POST /api/personas] Stack:', errorStack);

    return NextResponse.json({
      error: errorMessage || 'Failed to create persona',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}
