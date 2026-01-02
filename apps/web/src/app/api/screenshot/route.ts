/**
 * Screenshot API - /api/screenshot
 * 
 * Captures screenshots of deployed sites using Browserless
 * and stores them in Vercel Blob for permanent URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@vercel/blob';

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
const BROWSERLESS_URL = 'https://production-sfo.browserless.io/screenshot';

interface ScreenshotRequest {
  url: string;
  projectId?: string;
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BROWSERLESS_API_KEY) {
      return NextResponse.json(
        { error: 'Screenshot service not configured' },
        { status: 503 }
      );
    }

    const body: ScreenshotRequest = await req.json();
    const { url, projectId, width = 1280, height = 800 } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    console.log('[Screenshot] Capturing:', url);

    // Call Browserless API
    const browserlessResponse = await fetch(`${BROWSERLESS_URL}?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        url,
        options: {
          type: 'png',
          fullPage: false,
          viewport: {
            width,
            height,
            deviceScaleFactor: 2, // Retina quality
          },
        },
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000,
        },
      }),
    });

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      console.error('[Screenshot] Browserless error:', errorText);
      return NextResponse.json(
        { error: 'Failed to capture screenshot' },
        { status: 500 }
      );
    }

    // Get the screenshot as a buffer
    const screenshotBuffer = await browserlessResponse.arrayBuffer();
    
    // Generate filename
    const timestamp = Date.now();
    const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50);
    const filename = `screenshots/${projectId || 'unknown'}/${sanitizedUrl}-${timestamp}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, screenshotBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log('[Screenshot] Saved to:', blob.url);

    return NextResponse.json({
      success: true,
      screenshotUrl: blob.url,
      width,
      height,
    });
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    return NextResponse.json(
      { error: 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Health check
  return NextResponse.json({
    service: 'screenshot',
    configured: !!BROWSERLESS_API_KEY,
  });
}