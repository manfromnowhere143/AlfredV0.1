/**
 * Domain Checkout API - State of the Art
 *
 * Creates Stripe Checkout session for domain purchase.
 * After payment, webhook triggers Vercel API purchase.
 *
 * Flow:
 * 1. Check domain availability & price from Vercel
 * 2. Create pending domain_purchase record
 * 3. Create Stripe Checkout session
 * 4. Return checkout URL to redirect user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, domainPurchases, users, eq } from '@alfred/database';
import { stripe } from '@/lib/stripe/config';

export const maxDuration = 30;

interface CheckoutRequest {
  domain: string;
  projectId?: string;        // Link domain to this project after purchase
  vercelProjectId?: string;  // Vercel project ID for auto-linking
  source?: 'builder' | 'dashboard';
}

async function vercelRequest(
  endpoint: string,
  token: string,
  teamId?: string
): Promise<Response> {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  return fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CheckoutRequest = await request.json();
    const { domain, projectId, vercelProjectId, source = 'builder' } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Validate domain format
    const domainLower = domain.toLowerCase().trim();
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domainLower)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return NextResponse.json({ error: 'Vercel not configured' }, { status: 500 });
    }

    // Step 1: Check domain availability
    console.log(`[Domain Checkout] Checking availability for: ${domainLower}`);
    const availabilityRes = await vercelRequest(
      `/v1/registrar/domains/${encodeURIComponent(domainLower)}/availability`,
      vercelToken,
      teamId
    );

    if (!availabilityRes.ok) {
      const error = await availabilityRes.json().catch(() => ({}));
      console.error('[Domain Checkout] Availability check failed:', error);
      return NextResponse.json({ error: 'Failed to check domain availability' }, { status: 500 });
    }

    const availability = await availabilityRes.json();
    if (!availability.available) {
      return NextResponse.json({ error: 'Domain is not available for purchase' }, { status: 400 });
    }

    // Step 2: Get pricing
    console.log(`[Domain Checkout] Getting price for: ${domainLower}`);
    const priceRes = await vercelRequest(
      `/v1/registrar/domains/${encodeURIComponent(domainLower)}/price`,
      vercelToken,
      teamId
    );

    if (!priceRes.ok) {
      const error = await priceRes.json().catch(() => ({}));
      console.error('[Domain Checkout] Price check failed:', error);
      return NextResponse.json({ error: 'Failed to get domain price' }, { status: 500 });
    }

    const priceData = await priceRes.json();
    console.log('[Domain Checkout] Price API response:', JSON.stringify(priceData, null, 2));

    // Vercel returns purchasePrice which can be a number or string
    // Also try legacy formats for backwards compatibility
    let vercelPrice: number | null = null;

    if (priceData.purchasePrice !== undefined) {
      // New Vercel API format: purchasePrice can be number or string
      vercelPrice = typeof priceData.purchasePrice === 'string'
        ? parseFloat(priceData.purchasePrice)
        : priceData.purchasePrice;
    } else if (priceData.registration?.price !== undefined) {
      // Legacy format with registration object
      vercelPrice = priceData.registration.price;
    } else if (priceData.price !== undefined) {
      // Simple price field
      vercelPrice = priceData.price;
    }

    if (vercelPrice === null || isNaN(vercelPrice) || vercelPrice <= 0) {
      console.error('[Domain Checkout] Could not find price in response:', priceData);
      return NextResponse.json({
        error: 'Could not determine domain price',
        debug: priceData
      }, { status: 500 });
    }

    console.log(`[Domain Checkout] Found price: $${vercelPrice}`);

    // Convert to cents (Vercel returns dollars)
    const vercelPriceCents = Math.round(vercelPrice * 100);
    const alfredFeeCents = 0; // No markup for now - at-cost pricing
    const totalPriceCents = vercelPriceCents + alfredFeeCents;

    // Extract TLD
    const tld = '.' + domainLower.split('.').slice(1).join('.');

    // Step 3: Get or create Stripe customer
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { alfredUserId: userId },
      });
      stripeCustomerId = customer.id;

      // Save customer ID
      await db.update(users)
        .set({ stripeCustomerId })
        .where(eq(users.id, userId));
    }

    // Step 4: Create pending domain purchase record
    const [purchase] = await db.insert(domainPurchases)
      .values({
        userId,
        domain: domainLower,
        tld,
        vercelPriceCents,
        alfredFeeCents,
        totalPriceCents,
        years: 1,
        status: 'pending_payment',
        projectId: projectId || null,
        vercelProjectId: vercelProjectId || null,
        autoRenew: true,
        metadata: { source },
      })
      .returning();

    console.log(`[Domain Checkout] Created purchase record: ${purchase.id}`);

    // Step 5: Create Stripe Checkout session
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Domain: ${domainLower}`,
              description: `1 year registration for ${domainLower}`,
              metadata: {
                type: 'domain_purchase',
                domain: domainLower,
              },
            },
            unit_amount: totalPriceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'domain_purchase',
        domainPurchaseId: purchase.id,
        domain: domainLower,
        userId,
        projectId: projectId || '',
        vercelProjectId: vercelProjectId || '',
      },
      success_url: `${baseUrl}/builder?domain_purchased=${domainLower}&purchase_id=${purchase.id}`,
      cancel_url: `${baseUrl}/builder?domain_cancelled=${domainLower}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    // Update purchase with Stripe session ID
    await db.update(domainPurchases)
      .set({ stripeCheckoutSessionId: checkoutSession.id })
      .where(eq(domainPurchases.id, purchase.id));

    console.log(`[Domain Checkout] Created Stripe session: ${checkoutSession.id}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      purchaseId: purchase.id,
      domain: domainLower,
      price: {
        vercel: vercelPriceCents / 100,
        fee: alfredFeeCents / 100,
        total: totalPriceCents / 100,
        currency: 'USD',
      },
    });
  } catch (error) {
    console.error('[Domain Checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
