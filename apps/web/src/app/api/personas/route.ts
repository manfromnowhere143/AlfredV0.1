/**
 * /api/personas - List and Create personas
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, users, eq } from '@alfred/database';
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

// GET /api/personas - List all personas for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);
    const result = await service.list(
      { userId, tier: 'pro' },
      {}
    );

    return NextResponse.json({ personas: result.items });
  } catch (error: unknown) {
    console.error('Failed to list personas:', error);
    return NextResponse.json({ error: 'Failed to list personas', details: String(error) }, { status: 500 });
  }
}

// POST /api/personas - Create new persona via full wizard pipeline
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, archetype, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);
    
    // This calls the FULL wizard pipeline - image gen, voice, brain setup
    const result = await service.create(
      { userId, tier: 'pro' },
      { name, archetype, description: description || '' }
    );

    return NextResponse.json({ 
      persona: result.persona, 
      wizardSessionId: result.wizardSessionId 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create persona:', error);
    return NextResponse.json({ error: 'Failed to create persona', details: String(error) }, { status: 500 });
  }
}
