import { NextRequest, NextResponse } from 'next/server';
import { db, files, eq } from '@alfred/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid file ID format' }, { status: 400 });
    }

    const records = await db.select().from(files).where(eq(files.id, id)).limit(1);
    const fileRecord = records[0];

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If URL is external (Vercel Blob, S3, etc), redirect
    if (fileRecord.url.startsWith('http')) {
      return NextResponse.redirect(fileRecord.url);
    }

    // For local files (dev only)
    return NextResponse.json({ error: 'Local files not supported in production' }, { status: 404 });

  } catch (error) {
    console.error('[FileServe] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
