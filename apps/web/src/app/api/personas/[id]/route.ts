/**
 * /api/personas/[id] - Get, Update, Delete individual persona
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@alfred/database';
import * as schema from '@alfred/database';
import { PersonaRepository, PersonaService } from '@alfred/persona';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/personas/[id] - Get persona details
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);
    const persona = await service.getById(
      { userId: session.user.id, tier: 'pro' },
      id
    );

    return NextResponse.json({ persona });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'PERSONA_NOT_FOUND') {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    console.error('Failed to get persona:', error);
    return NextResponse.json({ error: 'Failed to get persona' }, { status: 500 });
  }
}

// PATCH /api/personas/[id] - Update persona
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);
    const persona = await service.update(
      { userId: session.user.id, tier: 'pro' },
      id,
      body
    );

    return NextResponse.json({ persona });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'PERSONA_NOT_FOUND') {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    console.error('Failed to update persona:', error);
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}

// DELETE /api/personas/[id] - Delete persona
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repository = new PersonaRepository(db as any, schema);
    const service = new PersonaService(repository);
    await service.delete(
      { userId: session.user.id, tier: 'pro' },
      id
    );

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'PERSONA_NOT_FOUND') {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    console.error('Failed to delete persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}
