/**
 * SEO Generate Schema API
 *
 * POST /api/seo/generate/schema - Detect and generate Schema.org markup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectAndGenerateSchema } from '@/lib/seo/generator/schema-org';
import type { DetectSchemaRequest, DetectSchemaResponse } from '@/lib/seo/types';

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<DetectSchemaResponse>> {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: DetectSchemaRequest & {
      pageTitle?: string;
      pageDescription?: string;
      url?: string;
      images?: string[];
    } = await request.json();

    const { htmlContent, pageType, pageTitle, pageDescription, url, images } = body;

    if (!htmlContent) {
      return NextResponse.json(
        { success: false, error: 'HTML content required' },
        { status: 400 }
      );
    }

    console.log('[SEO Generate Schema] Starting detection:', {
      contentLength: htmlContent.length,
      pageType,
      hasTitle: !!pageTitle,
    });

    const schema = await detectAndGenerateSchema({
      htmlContent,
      pageType,
      pageTitle,
      pageDescription,
      url,
      images,
    });

    console.log('[SEO Generate Schema] Detection complete:', {
      type: schema.type,
      confidence: schema.confidence,
    });

    return NextResponse.json({
      success: true,
      schema,
    });
  } catch (error) {
    console.error('[SEO Generate Schema] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Schema detection failed',
      },
      { status: 500 }
    );
  }
}
