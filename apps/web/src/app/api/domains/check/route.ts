/**
 * Domain Availability Check API
 *
 * Checks if a domain is available for purchase via Vercel
 * Returns availability status and pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const maxDuration = 30;

interface DomainCheckResult {
  available: boolean;
  domain: string;
  price?: number;
  period?: number;
  error?: string;
}

async function vercelRequest(
  endpoint: string,
  method: string = 'GET',
  token: string,
  teamId?: string
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  return fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain')?.toLowerCase().trim();

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return NextResponse.json({ error: 'Vercel not configured' }, { status: 500 });
    }

    // Check domain availability using Vercel Registrar API v1
    // Endpoint: GET /v1/registrar/domains/{domain}/availability
    const statusRes = await vercelRequest(
      `/v1/registrar/domains/${encodeURIComponent(domain)}/availability`,
      'GET',
      vercelToken,
      teamId
    );

    if (!statusRes.ok) {
      const errorData = await statusRes.json().catch(() => ({}));
      console.error('[Domains] Availability check failed:', statusRes.status, errorData);
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to check domain availability',
        available: false,
        domain
      }, { status: 500 });
    }

    const statusData = await statusRes.json();
    const isAvailable = statusData.available === true;

    // If available, get pricing using Registrar API
    // Endpoint: GET /v1/registrar/domains/{domain}/price
    let price: number | undefined;
    let period: number | undefined;

    if (isAvailable) {
      const priceRes = await vercelRequest(
        `/v1/registrar/domains/${encodeURIComponent(domain)}/price`,
        'GET',
        vercelToken,
        teamId
      );

      if (priceRes.ok) {
        const priceData = await priceRes.json();
        // Vercel returns purchasePrice which can be a number or string
        if (priceData.purchasePrice !== undefined) {
          price = typeof priceData.purchasePrice === 'string'
            ? parseFloat(priceData.purchasePrice)
            : priceData.purchasePrice;
        } else if (priceData.registration?.price !== undefined) {
          price = priceData.registration.price;
        } else if (priceData.price !== undefined) {
          price = priceData.price;
        }
        period = priceData.years || priceData.registration?.period || priceData.period || 1;
      }
    }

    const result: DomainCheckResult = {
      available: isAvailable,
      domain,
      price,
      period,
    };

    console.log(`[Domains] Check: ${domain} - ${isAvailable ? 'Available' : 'Taken'}${price ? ` ($${price})` : ''}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Domains] Error checking domain:', error);
    return NextResponse.json({
      error: 'Failed to check domain',
      available: false
    }, { status: 500 });
  }
}
