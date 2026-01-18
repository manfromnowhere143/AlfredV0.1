/**
 * SEO Config API
 *
 * GET /api/seo/config?projectId=xxx - Get SEO config
 * POST /api/seo/config - Create/Update SEO config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSeoConfig,
  upsertSeoConfig,
  deleteSeoConfig,
} from '@/lib/seo/services/seo-config-service';
import type { SEOConfigInput } from '@/lib/seo/types';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const config = await getSeoConfig(projectId);

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[SEO Config GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get config' },
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
    const { projectId, alfredProjectId, config } = body as {
      projectId: string;
      alfredProjectId?: string;
      config: SEOConfigInput;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const configId = await upsertSeoConfig(projectId, config, alfredProjectId);

    return NextResponse.json({
      success: true,
      configId,
    });
  } catch (error) {
    console.error('[SEO Config POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    await deleteSeoConfig(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SEO Config DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete config' },
      { status: 500 }
    );
  }
}
