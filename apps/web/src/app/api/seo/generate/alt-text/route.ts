/**
 * SEO Generate Alt Text API
 *
 * POST /api/seo/generate/alt-text - Generate optimized alt text using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAltText, batchGenerateAltText } from '@/lib/seo/generator/alt-text';
import type { GenerateAltTextRequest, GenerateAltTextResponse } from '@/lib/seo/types';

export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<GenerateAltTextResponse | { success: boolean; results?: unknown[]; error?: string }>> {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Support batch generation
    if (Array.isArray(body.images)) {
      const { images, keywords } = body as {
        images: Array<{ src: string; context: string; surroundingText?: string }>;
        keywords?: string[];
      };

      console.log('[SEO Generate Alt Text] Batch generation:', {
        imageCount: images.length,
      });

      const results = await batchGenerateAltText(images, keywords);

      return NextResponse.json({
        success: true,
        results,
      });
    }

    // Single image generation
    const { imageContext, surroundingText, keywords, imageSrc } = body as GenerateAltTextRequest & { imageSrc?: string };

    if (!imageContext) {
      return NextResponse.json(
        { success: false, error: 'Image context required' },
        { status: 400 }
      );
    }

    console.log('[SEO Generate Alt Text] Starting generation:', {
      imageSrc: imageSrc?.slice(0, 50),
      hasContext: !!imageContext,
    });

    const altText = await generateAltText({
      imageContext,
      surroundingText,
      keywords,
      imageSrc: imageSrc || 'unknown',
    });

    console.log('[SEO Generate Alt Text] Generation complete:', {
      altTextLength: altText.altText.length,
      confidence: altText.confidence,
    });

    return NextResponse.json({
      success: true,
      altText,
    });
  } catch (error) {
    console.error('[SEO Generate Alt Text] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Alt text generation failed',
      },
      { status: 500 }
    );
  }
}
