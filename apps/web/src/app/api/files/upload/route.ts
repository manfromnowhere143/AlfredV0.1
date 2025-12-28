// ═══════════════════════════════════════════════════════════════════════════════
// FILE UPLOAD API - app/api/files/upload/route.ts
// Local storage for development - upgrade to R2 for production
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime',
  // Documents
  'application/pdf',
  // Code/Text
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css',
  'application/json', 'text/javascript',
]);

const FILE_CATEGORIES: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'text/plain': 'code',
  'text/markdown': 'code',
  'text/csv': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'text/javascript': 'code',
  'application/json': 'code',
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

function getFileCategory(mimeType: string): string {
  return FILE_CATEGORIES[mimeType] || 'document';
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Upload File
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Auth Check
    // ─────────────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // ─────────────────────────────────────────────────────────────────────────
    // Parse Form Data
    // ─────────────────────────────────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[Upload] Starting: ${file.name} (${file.size} bytes)`);

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ 
        error: `File type not allowed: ${file.type}` 
      }, { status: 400 });
    }

    const category = getFileCategory(file.type);
    const maxSize = category === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Generate unique filename
    // ─────────────────────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 8);
    const safeName = sanitizeFilename(file.name);
    const uniqueName = `${timestamp}-${randomId}-${safeName}`;
    const fileId = `${timestamp}-${randomId}`;

    // ─────────────────────────────────────────────────────────────────────────
    // Save to local public/uploads folder
    // ─────────────────────────────────────────────────────────────────────────
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, uniqueName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);
    
    const url = `/uploads/${userId}/${uniqueName}`;
    console.log(`[Upload] Success: ${url}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Return Response
    // ─────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      id: fileId,
      name: file.name,
      url: url,
      type: file.type,
      category: category,
      size: file.size,
    });

  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Remove File
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    
    if (!fileUrl) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    // Delete local file
    if (fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', fileUrl);
      try {
        await unlink(filePath);
        console.log(`[Delete] Removed: ${filePath}`);
      } catch (e) {
        console.error('[Delete] Failed:', e);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Delete] Error:', error);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}