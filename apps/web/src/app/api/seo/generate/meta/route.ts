/**
 * SEO Generate Meta API
 *
 * POST /api/seo/generate/meta - Generate optimized meta tags using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMetaTags } from '@/lib/seo/generator/meta-tags';
import type { GenerateMetaRequest, GenerateMetaResponse } from '@/lib/seo/types';

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<GenerateMetaResponse>> {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateMetaRequest = await request.json();
    const { content, pageType, focusKeywords, existingTitle, existingDescription } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content required' },
        { status: 400 }
      );
    }

    console.log('[SEO Generate Meta] Starting generation:', {
      contentLength: content.length,
      pageType,
      keywordCount: focusKeywords?.length || 0,
    });

    const meta = await generateMetaTags({
      content,
      pageType,
      focusKeywords,
      existingTitle,
      existingDescription,
    });

    console.log('[SEO Generate Meta] Generation complete:', {
      titleLength: meta.title.length,
      descriptionLength: meta.description.length,
      confidence: meta.confidence,
    });

    return NextResponse.json({
      success: true,
      meta,
    });
  } catch (error) {
    console.error('[SEO Generate Meta] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Meta generation failed',
      },
      { status: 500 }
    );
  }
}
