// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD API - /api/files/upload
// State-of-the-art: stores ORIGINAL + generates OPTIMIZED for AI Vision
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db, files, eq } from '@alfred/database';
import sharp from 'sharp';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for videos
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50MB originals allowed

// AI Vision limits
const AI_MAX_SIZE = 4 * 1024 * 1024;      // 4MB for Claude Vision (safe margin)
const AI_MAX_DIMENSION = 1920;             // Max width/height for AI

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
// IMAGE OPTIMIZATION - Creates AI-friendly version
// ─────────────────────────────────────────────────────────────────────────────

async function optimizeImageForAI(buffer: Buffer, mimeType: string): Promise<{
  optimizedBuffer: Buffer;
  optimizedSize: number;
  wasOptimized: boolean;
}> {
  // If already small enough, no optimization needed
  if (buffer.length <= AI_MAX_SIZE) {
    return {
      optimizedBuffer: buffer,
      optimizedSize: buffer.length,
      wasOptimized: false,
    };
  }

  try {
    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    
    // Resize if too large
    const needsResize = (metadata.width && metadata.width > AI_MAX_DIMENSION) || 
                        (metadata.height && metadata.height > AI_MAX_DIMENSION);
    
    if (needsResize) {
      sharpInstance = sharpInstance.resize(AI_MAX_DIMENSION, AI_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Progressive compression until under limit
    let quality = 85;
    let optimizedBuffer = buffer;
    
    while (quality >= 20) {
      // Convert to JPEG for best compression (unless PNG with transparency)
      const hasAlpha = metadata.hasAlpha && mimeType === 'image/png';
      
      if (hasAlpha) {
        optimizedBuffer = await sharpInstance
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else {
        optimizedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }
      
      if (optimizedBuffer.length <= AI_MAX_SIZE) {
        break;
      }
      
      quality -= 10;
    }

    const originalMB = (buffer.length / 1024 / 1024).toFixed(2);
    const optimizedMB = (optimizedBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`[Upload] 🖼️ Optimized: ${originalMB}MB → ${optimizedMB}MB (quality: ${quality})`);

    return {
      optimizedBuffer,
      optimizedSize: optimizedBuffer.length,
      wasOptimized: true,
    };
  } catch (error) {
    console.error('[Upload] Optimization failed, using original:', error);
    return {
      optimizedBuffer: buffer,
      optimizedSize: buffer.length,
      wasOptimized: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST - Upload file with dual storage
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

    const category = MIME_TO_CATEGORY[file.type] || MIME_TO_CATEGORY[file.type.split(';')[0]];
    if (!category) {
      // Allow unknown types as documents
      console.log(`[Upload] Unknown type ${file.type}, treating as document`);
    }

    const maxSize = category === 'video' ? MAX_FILE_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max: ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 });
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
    const optimizedFilename = `${timestamp}-${randomId}-optimized-${safeName.replace(/\.[^.]+$/, '')}.jpg`;

    // Get buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save ORIGINAL to disk (full quality)
    const filepath = path.join(userDir, filename);
    await writeFile(filepath, buffer);
    const url = `/uploads/${userId}/${filename}`;

    // For images: create OPTIMIZED version for AI Vision
    let optimizedUrl: string | undefined;
    let optimizedBase64: string | undefined;
    let wasOptimized = false;

    if (category === 'image') {
      const { optimizedBuffer, wasOptimized: didOptimize } = await optimizeImageForAI(buffer, file.type);
      wasOptimized = didOptimize;
      
      if (didOptimize) {
        // Save optimized version
        const optimizedPath = path.join(userDir, optimizedFilename);
        await writeFile(optimizedPath, optimizedBuffer);
        optimizedUrl = `/uploads/${userId}/${optimizedFilename}`;
      }
      
      // Base64 of optimized version for immediate Claude Vision use
      optimizedBase64 = (didOptimize ? optimizedBuffer : buffer).toString('base64');
    }

    // For PDFs, still provide base64 (they're usually small)
    let base64: string | undefined;
    if (file.type === 'application/pdf' && buffer.length < AI_MAX_SIZE) {
      base64 = buffer.toString('base64');
    }

    // Save to database with both URLs
    const [fileRecord] = await db.insert(files).values({
      name: filename,
      originalName: file.name,
      url,                          // Original full-quality
      optimizedUrl,                 // AI-optimized version (if created)
      mimeType: file.type,
      category: category || 'document',
      extension: ext,
      size: file.size,
      userId,
      conversationId: conversationId || undefined,
      status: 'ready',
    }).returning();

    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`[Upload] ✅ ${file.name} (${sizeMB}MB) → ${url}${wasOptimized ? ' + optimized' : ''} (DB: ${fileRecord.id})`);

    return NextResponse.json({
      id: fileRecord.id,
      name: file.name,
      url,                          // Original for display
      optimizedUrl,                 // Optimized for AI (if exists)
      type: file.type,
      category: category || 'document',
      size: file.size,
      base64: optimizedBase64 || base64, // Optimized base64 for immediate use
      wasOptimized,
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - Fetch file as base64 (returns optimized version for AI)
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
    const forAI = searchParams.get('forAI') === 'true';

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    if (!fileUrl.includes(`/uploads/${userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let targetPath = path.join(process.cwd(), 'public', fileUrl);
    
    // If requesting for AI, try to find optimized version
    if (forAI) {
      const dir = path.dirname(targetPath);
      const basename = path.basename(targetPath);
      const optimizedName = basename.replace(/^(\d+-\w+-)/, '$1optimized-').replace(/\.[^.]+$/, '.jpg');
      const optimizedPath = path.join(dir, optimizedName);
      
      if (existsSync(optimizedPath)) {
        targetPath = optimizedPath;
      }
    }

    if (!existsSync(targetPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await readFile(targetPath);
    return NextResponse.json({ 
      base64: buffer.toString('base64'),
      size: buffer.length,
    });

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