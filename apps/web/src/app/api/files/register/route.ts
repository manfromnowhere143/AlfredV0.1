import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, files } from '@alfred/database';

// Register a file that was uploaded directly to Blob
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, name, type, size, conversationId } = await request.json();

    if (!url || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ext = name.split('.').pop()?.toLowerCase() || '';
    const category = type?.startsWith('image/') ? 'image' 
      : type?.startsWith('video/') ? 'video'
      : type === 'application/pdf' ? 'document'
      : 'code';

    const [fileRecord] = await db.insert(files).values({
      name: name,
      originalName: name,
      url,
      mimeType: type || 'application/octet-stream',
      category,
      extension: ext,
      size: size || 0,
      userId,
      conversationId: conversationId || undefined,
      status: 'ready',
    }).returning();

    console.log('[Register] File registered:', fileRecord.id, url);

    return NextResponse.json({
      id: fileRecord.id,
      name,
      url,
      type,
      category,
      size,
    });

  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json({ error: 'Failed to register file' }, { status: 500 });
  }
}
