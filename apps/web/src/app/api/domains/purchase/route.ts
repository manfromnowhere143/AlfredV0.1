/**
 * Domain Purchase API
 *
 * Purchases a domain via Vercel and optionally links it to a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;

interface PurchaseRequest {
  domain: string;
  projectId?: string; // Vercel project ID to link to
}

async function vercelRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
  },
  token: string,
  teamId?: string
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  return fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PurchaseRequest = await request.json();
    const { domain, projectId } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domain.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return NextResponse.json({ error: 'Vercel not configured' }, { status: 500 });
    }

    console.log(`[Domains] Purchasing: ${domain} for user ${userId}`);

    // Step 1: Purchase the domain
    const purchaseRes = await vercelRequest(
      '/v6/domains/buy',
      {
        method: 'POST',
        body: {
          name: domain.toLowerCase(),
          // Expected payment method to be pre-configured in Vercel
        },
      },
      vercelToken,
      teamId
    );

    if (!purchaseRes.ok) {
      const errorData = await purchaseRes.json().catch(() => ({}));
      console.error('[Domains] Purchase failed:', purchaseRes.status, errorData);

      // Parse error for user-friendly message
      let errorMessage = 'Failed to purchase domain';
      if (errorData.error?.code === 'domain_not_available') {
        errorMessage = 'Domain is no longer available';
      } else if (errorData.error?.code === 'payment_required') {
        errorMessage = 'Payment method required - configure in Vercel dashboard';
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const purchaseData = await purchaseRes.json();
    console.log(`[Domains] Purchased successfully: ${domain}`);

    // Step 2: Link to project if specified
    if (projectId) {
      const linkRes = await vercelRequest(
        `/v10/projects/${projectId}/domains`,
        {
          method: 'POST',
          body: { name: domain.toLowerCase() },
        },
        vercelToken,
        teamId
      );

      if (linkRes.ok) {
        console.log(`[Domains] Linked ${domain} to project ${projectId}`);
      } else {
        console.warn(`[Domains] Failed to link domain to project:`, await linkRes.text());
      }
    }

    return NextResponse.json({
      success: true,
      domain: purchaseData.name || domain,
      message: 'Domain purchased successfully!',
      linkedToProject: !!projectId,
    });
  } catch (error) {
    console.error('[Domains] Error purchasing domain:', error);
    return NextResponse.json({ error: 'Failed to purchase domain' }, { status: 500 });
  }
}
