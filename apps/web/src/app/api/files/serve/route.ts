import { NextRequest, NextResponse } from 'next/server';
import { db, files, eq } from '@alfred/database';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const records = await db.select().from(files).where(eq(files.id, id)).limit(1);
    const fileRecord = records[0];

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const filepath = path.join(process.cwd(), 'public', fileRecord.url);
    
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const buffer = await readFile(filepath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[FileServe] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
