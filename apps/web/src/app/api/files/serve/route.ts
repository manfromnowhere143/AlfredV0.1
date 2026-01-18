export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db, files, eq } from '@alfred/database';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: Allowed external host patterns for redirects
// Vercel Blob URLs have random subdomains: xyz123.blob.vercel-storage.com
// ═══════════════════════════════════════════════════════════════════════════════
function isExternalUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    // Allow any subdomain of vercel-storage.com
    return hostname.endsWith('.vercel-storage.com') || hostname === 'vercel-storage.com';
  } catch {
    return false;
  }
}

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

    // If URL is external (Vercel Blob, S3, etc), validate and redirect
    if (fileRecord.url.startsWith('http')) {
      // SECURITY: Only redirect to whitelisted hosts
      if (!isExternalUrlAllowed(fileRecord.url)) {
        console.error('[FileServe] SECURITY: Blocked redirect to non-whitelisted host:', fileRecord.url);
        return NextResponse.json({ error: 'Invalid file URL' }, { status: 403 });
      }
      return NextResponse.redirect(fileRecord.url);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECURITY: Path traversal protection for local files
    // ═══════════════════════════════════════════════════════════════════════════
    const publicDir = path.resolve(process.cwd(), 'public');

    // Normalize the URL path and remove any leading slashes
    const sanitizedUrl = fileRecord.url.replace(/^\/+/, '').replace(/\.\./g, '');
    const filepath = path.resolve(publicDir, sanitizedUrl);

    // CRITICAL: Verify resolved path is within public directory
    if (!filepath.startsWith(publicDir + path.sep) && filepath !== publicDir) {
      console.error('[FileServe] SECURITY: Path traversal attempt blocked:', fileRecord.url);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const buffer = await readFile(filepath);

    // SECURITY: Strict CORS origin validation in production
    // Using exact hostname comparison instead of .includes() to prevent bypass
    const origin = request.headers.get('origin');
    let allowedOrigin = '*';

    if (process.env.NODE_ENV === 'production') {
      allowedOrigin = 'null'; // Default to blocking cross-origin requests

      if (origin && process.env.NEXTAUTH_URL) {
        try {
          const originUrl = new URL(origin);
          const appUrl = new URL(process.env.NEXTAUTH_URL);
          // Strict hostname comparison - must match exactly
          if (originUrl.hostname === appUrl.hostname) {
            allowedOrigin = origin;
          }
        } catch {
          // Invalid URLs - keep allowedOrigin as 'null'
        }
      }
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': allowedOrigin,
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('[FileServe] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
