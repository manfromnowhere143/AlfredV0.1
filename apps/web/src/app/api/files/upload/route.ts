// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD API - /api/files/upload
// Saves to local storage + database for persistent file references
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db, files, eq } from '@alfred/database';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type FileCategory = 'image' | 'video' | 'document' | 'code' | 'audio';

const MIME_TO_CATEGORY: Record<string, FileCategory> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
  'application/pdf': 'document',
  'text/plain': 'code',
  'text/markdown': 'code',
  'text/csv': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'text/javascript': 'code',
  'application/json': 'code',
};

// ─────────────────────────────────────────────────────────────────────────────
// POST - Upload file
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const category = MIME_TO_CATEGORY[file.type];
    if (!category) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large. Max: ${maxSize / 1024 / 1024}MB` }, { status: 400 });
    }

    // Create user directory
    const userDir = path.join(UPLOAD_DIR, userId);
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const filename = `${timestamp}-${randomId}-${safeName}`;

    // Save to disk
    const filepath = path.join(userDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/${userId}/${filename}`;

    // Generate base64 for Claude
    let base64: string | undefined;
    if (category === 'image' || file.type === 'application/pdf') {
      base64 = buffer.toString('base64');
    }

    // Save to database
    const [fileRecord] = await db.insert(files).values({
      name: filename,
      originalName: file.name,
      url,
      mimeType: file.type,
      category,
      extension: ext,
      size: file.size,
      userId,
      conversationId: conversationId || undefined,
      status: 'ready',
    }).returning();

    console.log(`[Upload] ✅ ${file.name} → ${url} (DB: ${fileRecord.id})`);

    return NextResponse.json({
      id: fileRecord.id,
      name: file.name,
      url,
      type: file.type,
      category,
      size: file.size,
      base64,
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - Fetch file as base64
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    if (!fileUrl.includes(`/uploads/${userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filepath = path.join(process.cwd(), 'public', fileUrl);
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readFile(filepath);
    return NextResponse.json({ base64: buffer.toString('base64') });

  } catch (error) {
    console.error('[Upload] GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE - Remove file
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, fileId));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Upload] Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}