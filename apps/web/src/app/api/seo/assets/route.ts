/**
 * SEO Assets API
 *
 * GET /api/seo/assets?projectId=xxx - Get all SEO assets
 * POST /api/seo/assets - Generate/save SEO assets (sitemap, robots.txt)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSeoAsset,
  getAllSeoAssets,
  saveSeoAsset,
  getSeoConfig,
} from '@/lib/seo/services/seo-config-service';
import { generateSitemap, generateSitemapFromFiles } from '@/lib/seo/generator/sitemap';
import { generateRobotsTxt, robotsPresets } from '@/lib/seo/generator/robots';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    const assetType = request.nextUrl.searchParams.get('type') as 'sitemap' | 'robots_txt' | 'schema_json' | null;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (assetType) {
      // Get specific asset
      const asset = await getSeoAsset(projectId, assetType);
      return NextResponse.json({
        success: true,
        asset,
      });
    }

    // Get all assets
    const assets = await getAllSeoAssets(projectId);
    return NextResponse.json({
      success: true,
      assets,
    });
  } catch (error) {
    console.error('[SEO Assets GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get assets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      assetType,
      deployUrl,
      files,
      customContent,
      preset,
    } = body as {
      projectId: string;
      assetType: 'sitemap' | 'robots_txt' | 'schema_json';
      deployUrl?: string;
      files?: Array<{ path: string }>;
      customContent?: string;
      preset?: 'allowAll' | 'disallowAll' | 'standard' | 'ecommerce' | 'blog';
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (!assetType) {
      return NextResponse.json({ error: 'Asset type required' }, { status: 400 });
    }

    let content: string;
    let metadata: Record<string, unknown> = {};

    if (customContent) {
      // Use custom content
      content = customContent;
      metadata = { customContent: true };
    } else if (assetType === 'sitemap') {
      // Generate sitemap
      if (files && files.length > 0 && deployUrl) {
        const sitemap = generateSitemapFromFiles(files, deployUrl);
        content = sitemap.content;
        metadata = { urlCount: sitemap.urlCount, lastmod: sitemap.lastmod };
      } else if (deployUrl) {
        const sitemap = generateSitemap({ baseUrl: deployUrl });
        content = sitemap.content;
        metadata = { urlCount: sitemap.urlCount, lastmod: sitemap.lastmod };
      } else {
        return NextResponse.json({ error: 'Deploy URL required for sitemap' }, { status: 400 });
      }
    } else if (assetType === 'robots_txt') {
      // Generate robots.txt
      const sitemapUrl = deployUrl ? `${deployUrl}/sitemap.xml` : undefined;

      if (preset && preset in robotsPresets) {
        const robotsTxt = robotsPresets[preset as keyof typeof robotsPresets](sitemapUrl);
        content = robotsTxt.content;
        metadata = { rules: robotsTxt.rules, preset };
      } else {
        // Get config to check for custom robots.txt content
        const config = await getSeoConfig(projectId);
        if (config?.robotsTxtContent) {
          content = config.robotsTxtContent;
          metadata = { custom: true };
        } else {
          const robotsTxt = robotsPresets.allowAll(sitemapUrl);
          content = robotsTxt.content;
          metadata = { rules: robotsTxt.rules, preset: 'allowAll' };
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }

    // Save asset
    await saveSeoAsset(projectId, assetType, content, {
      generatedBy: customContent ? 'user' : 'system',
      metadata,
    });

    return NextResponse.json({
      success: true,
      content,
      metadata,
    });
  } catch (error) {
    console.error('[SEO Assets POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate asset' },
      { status: 500 }
    );
  }
}
