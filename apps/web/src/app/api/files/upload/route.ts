// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD API - Hybrid: Local (dev) + Vercel Blob (production)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db, files, eq } from '@alfred/database';
import sharp from 'sharp';
import { put } from '@vercel/blob';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.VERCEL === '1';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const AI_MAX_SIZE = 4 * 1024 * 1024;
const AI_MAX_DIMENSION = 1920;

type FileCategory = 'image' | 'video' | 'document' | 'code' | 'audio';

const MIME_TO_CATEGORY: Record<string, FileCategory> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/mov': 'video',
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
// IMAGE OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────────────

async function optimizeImageForAI(buffer: Buffer, mimeType: string): Promise<{
  optimizedBuffer: Buffer;
  optimizedSize: number;
  wasOptimized: boolean;
}> {
  if (buffer.length <= AI_MAX_SIZE) {
    return { optimizedBuffer: buffer, optimizedSize: buffer.length, wasOptimized: false };
  }

  try {
    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    
    const needsResize = (metadata.width && metadata.width > AI_MAX_DIMENSION) || 
                        (metadata.height && metadata.height > AI_MAX_DIMENSION);
    
    if (needsResize) {
      sharpInstance = sharpInstance.resize(AI_MAX_DIMENSION, AI_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let quality = 85;
    let optimizedBuffer = buffer;
    
    while (quality >= 20) {
      const hasAlpha = metadata.hasAlpha && mimeType === 'image/png';
      
      if (hasAlpha) {
        optimizedBuffer = await sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
      } else {
        optimizedBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
      }
      
      if (optimizedBuffer.length <= AI_MAX_SIZE) break;
      quality -= 10;
    }

    console.log(`[Upload] Optimized: ${(buffer.length / 1024 / 1024).toFixed(2)}MB -> ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    return { optimizedBuffer, optimizedSize: optimizedBuffer.length, wasOptimized: true };
  } catch (error) {
    console.error('[Upload] Optimization failed:', error);
    return { optimizedBuffer: buffer, optimizedSize: buffer.length, wasOptimized: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE - Local (dev) or Vercel Blob (production)
// ─────────────────────────────────────────────────────────────────────────────

async function saveToLocal(buffer: Buffer, userId: string, filename: string): Promise<string> {
  const userDir = path.join(UPLOAD_DIR, userId);
  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }
  const filepath = path.join(userDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/${userId}/${filename}`;
}

async function saveToBlob(buffer: Buffer, userId: string, filename: string, contentType: string): Promise<string> {
  const blob = await put(`uploads/${userId}/${filename}`, buffer, {
    access: 'public',
    contentType,
  });
  return blob.url;
}

async function saveFile(buffer: Buffer, userId: string, filename: string, contentType: string): Promise<string> {
  if (IS_PRODUCTION) {
    return saveToBlob(buffer, userId, filename, contentType);
  }
  return saveToLocal(buffer, userId, filename);
}

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

    const category = MIME_TO_CATEGORY[file.type] || MIME_TO_CATEGORY[file.type.split(';')[0]] || 'document';
    const maxSize = category === 'video' ? MAX_FILE_SIZE : MAX_IMAGE_SIZE;
    
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large. Max: ${maxSize / 1024 / 1024}MB` }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const filename = `${timestamp}-${randomId}-${safeName}`;
    const optimizedFilename = `${timestamp}-${randomId}-optimized.jpg`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save original
    const url = await saveFile(buffer, userId, filename, file.type);

    // For images: create optimized version
    let optimizedUrl: string | undefined;
    let optimizedBase64: string | undefined;
    let wasOptimized = false;

    if (category === 'image') {
      const { optimizedBuffer, wasOptimized: didOptimize } = await optimizeImageForAI(buffer, file.type);
      wasOptimized = didOptimize;
      
      if (didOptimize) {
        optimizedUrl = await saveFile(optimizedBuffer, userId, optimizedFilename, 'image/jpeg');
      }
      
      optimizedBase64 = (didOptimize ? optimizedBuffer : buffer).toString('base64');
    }

    // PDF base64
    let base64: string | undefined;
    if (file.type === 'application/pdf' && buffer.length < AI_MAX_SIZE) {
      base64 = buffer.toString('base64');
    }

    // Save to database
    const [fileRecord] = await db.insert(files).values({
      name: filename,
      originalName: file.name,
      url,
      optimizedUrl,
      mimeType: file.type,
      category,
      extension: ext,
      size: file.size,
      userId,
      conversationId: conversationId || undefined,
      status: 'ready',
    }).returning();

    console.log(`[Upload] ${IS_PRODUCTION ? 'BLOB' : 'LOCAL'}: ${file.name} -> ${url}`);

    return NextResponse.json({
      id: fileRecord.id,
      name: file.name,
      url,
      optimizedUrl,
      type: file.type,
      category,
      size: file.size,
      base64: optimizedBase64 || base64,
      wasOptimized,
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

    // For Blob URLs, fetch remotely
    if (fileUrl.startsWith('http')) {
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      return NextResponse.json({ base64: buffer.toString('base64'), size: buffer.length });
    }

    // For local files
    if (!fileUrl.includes(`/uploads/${userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetPath = path.join(process.cwd(), 'public', fileUrl);
    if (!existsSync(targetPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readFile(targetPath);
    return NextResponse.json({ base64: buffer.toString('base64'), size: buffer.length });

  } catch (error) {
    console.error('[Upload] GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
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
