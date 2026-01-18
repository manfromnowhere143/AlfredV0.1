import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Blob Token] Request received');

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  console.log('[Blob Token] Session check:', { hasSession: !!session, hasUserId: !!userId });

  if (!userId) {
    console.log('[Blob Token] Unauthorized - no userId');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;
  console.log('[Blob Token] Body type:', body.type);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[Blob Token] Generating token for:', pathname);
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mpeg',
            'application/pdf', 'application/octet-stream'
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          tokenPayload: JSON.stringify({ userId }),
        };
      },
    });

    console.log('[Blob Token] Success');
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[Blob Token] Error:', error);
    return NextResponse.json({ error: 'Failed to generate upload token', details: String(error) }, { status: 500 });
  }
}
