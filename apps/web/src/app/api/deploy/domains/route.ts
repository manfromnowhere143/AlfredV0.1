/**
 * Domain Management API Route - /api/deploy/domains
 *
 * Manages custom domains for deployments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createVercelClient,
  isValidDomain,
  generateDNSRecords,
  checkDomainStatus,
  addAndVerifyDomain,
  verifyDomain,
} from '@alfred/deploy';

// ============================================================================
// HELPERS
// ============================================================================

function getVercelClient() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN not configured');
  }
  return createVercelClient({
    token,
    teamId: process.env.VERCEL_TEAM_ID,
  });
}

// ============================================================================
// POST - Add domain to project
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as { id?: string })?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, domain } = body;

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: 'projectId and domain are required' },
        { status: 400 }
      );
    }

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    const client = getVercelClient();
    const result = await addAndVerifyDomain(client, projectId, domain);

    return NextResponse.json({
      success: true,
      domain: result.domain,
      verified: result.verified,
      dnsRecords: result.dnsRecords,
    });

  } catch (error) {
    console.error('[Domains] Add error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Check domain status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as { id?: string })?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'domain parameter is required' },
        { status: 400 }
      );
    }

    // If no projectId, just validate format and return DNS records
    if (!projectId) {
      if (!isValidDomain(domain)) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid domain format',
        });
      }

      return NextResponse.json({
        valid: true,
        dnsRecords: generateDNSRecords(domain),
      });
    }

    // Check actual status on Vercel
    const client = getVercelClient();
    const status = await checkDomainStatus(client, projectId, domain);

    return NextResponse.json({
      domain,
      projectId,
      ...status,
    });

  } catch (error) {
    console.error('[Domains] Status check error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Verify domain
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as { id?: string })?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, domain } = body;

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: 'projectId and domain are required' },
        { status: 400 }
      );
    }

    const client = getVercelClient();
    const result = await verifyDomain(client, projectId, domain);

    return NextResponse.json({
      success: true,
      verified: result.verified,
      domain: result.domain,
    });

  } catch (error) {
    console.error('[Domains] Verify error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove domain
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as { id?: string })?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const domain = searchParams.get('domain');

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: 'projectId and domain parameters are required' },
        { status: 400 }
      );
    }

    const client = getVercelClient();
    await client.removeDomain(projectId, domain);

    return NextResponse.json({
      success: true,
      message: `Domain ${domain} removed from project`,
    });

  } catch (error) {
    console.error('[Domains] Remove error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}