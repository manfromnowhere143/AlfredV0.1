export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanByPriceId } from '@/lib/stripe/config';
import { db, users, domainPurchases, projects, eq } from '@alfred/database';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ============================================================================
// VERCEL API HELPER
// ============================================================================

async function vercelRequest(
  endpoint: string,
  options: { method?: string; body?: any },
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

// ============================================================================
// DOMAIN PURCHASE HANDLER
// ============================================================================

async function handleDomainPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const domainPurchaseId = session.metadata?.domainPurchaseId;
  const domain = session.metadata?.domain;
  const vercelProjectId = session.metadata?.vercelProjectId;

  if (!domainPurchaseId || !domain) {
    console.error('[Webhook] Missing domain purchase metadata');
    return;
  }

  console.log(`[Webhook] Processing domain purchase: ${domain} (${domainPurchaseId})`);

  const vercelToken = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    console.error('[Webhook] VERCEL_TOKEN not configured');
    await db.update(domainPurchases)
      .set({
        status: 'failed',
        lastError: 'Vercel not configured',
        updatedAt: new Date(),
      })
      .where(eq(domainPurchases.id, domainPurchaseId));
    return;
  }

  // Update status to payment_completed
  await db.update(domainPurchases)
    .set({
      status: 'payment_completed',
      stripePaymentIntentId: session.payment_intent as string,
      stripePaidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(domainPurchases.id, domainPurchaseId));

  // Update status to purchasing
  await db.update(domainPurchases)
    .set({ status: 'purchasing', updatedAt: new Date() })
    .where(eq(domainPurchases.id, domainPurchaseId));

  try {
    // Get the purchase record for price
    const [purchase] = await db
      .select()
      .from(domainPurchases)
      .where(eq(domainPurchases.id, domainPurchaseId))
      .limit(1);

    if (!purchase) {
      throw new Error('Purchase record not found');
    }

    // Purchase domain from Vercel
    // Note: This requires Vercel account to have payment method configured
    // For domains purchased through Vercel API, they bill the Vercel account
    const purchaseRes = await vercelRequest(
      `/v1/registrar/domains/${encodeURIComponent(domain)}/buy`,
      {
        method: 'POST',
        body: {
          autoRenew: true,
          years: 1,
          expectedPrice: purchase.vercelPriceCents / 100, // Convert back to dollars
          // Note: contactInformation would be needed for actual ICANN registration
          // For now, Vercel uses account defaults
        },
      },
      vercelToken,
      teamId
    );

    if (!purchaseRes.ok) {
      const error = await purchaseRes.json().catch(() => ({}));
      console.error('[Webhook] Vercel purchase failed:', error);
      throw new Error(error.error?.message || 'Vercel purchase failed');
    }

    const purchaseData = await purchaseRes.json();
    console.log(`[Webhook] Domain purchased from Vercel: ${domain}`, purchaseData);

    // Update purchase record
    await db.update(domainPurchases)
      .set({
        status: 'completed',
        vercelOrderId: purchaseData.orderId || purchaseData.id,
        vercelPurchasedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(domainPurchases.id, domainPurchaseId));

    // Auto-link domain to project if vercelProjectId provided
    if (vercelProjectId) {
      console.log(`[Webhook] Linking ${domain} to project ${vercelProjectId}`);
      const linkRes = await vercelRequest(
        `/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          body: { name: domain },
        },
        vercelToken,
        teamId
      );

      if (linkRes.ok) {
        console.log(`[Webhook] Domain ${domain} linked to project successfully`);

        // Update Alfred project if we have projectId
        const projectId = session.metadata?.projectId;
        if (projectId) {
          await db.update(projects)
            .set({
              primaryDomain: domain,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, projectId));
        }
      } else {
        console.warn(`[Webhook] Failed to link domain to project:`, await linkRes.text());
      }
    }

    console.log(`[Webhook] Domain purchase completed: ${domain}`);
  } catch (error) {
    console.error('[Webhook] Domain purchase error:', error);
    await db.update(domainPurchases)
      .set({
        status: 'failed',
        lastError: (error as Error).message,
        retryCount: 1,
        updatedAt: new Date(),
      })
      .where(eq(domainPurchases.id, domainPurchaseId));
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a domain purchase
        if (session.metadata?.type === 'domain_purchase') {
          await handleDomainPurchase(session);
          break;
        }

        // Otherwise handle subscription checkout
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId && planId) {
          await db.update(users)
            .set({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              tier: planId as 'free' | 'pro' | 'enterprise',
            })
            .where(eq(users.id, userId));
          console.log(`[Webhook] User ${userId} subscribed to ${planId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanByPriceId(priceId);

        if (plan) {
          await db.update(users)
            .set({ 
              tier: plan.id as 'free' | 'pro' | 'enterprise', 
              stripeSubscriptionStatus: subscription.status 
            })
            .where(eq(users.stripeCustomerId, customerId));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await db.update(users)
          .set({ 
            tier: 'free', 
            stripeSubscriptionId: null, 
            stripeSubscriptionStatus: 'canceled' 
          })
          .where(eq(users.stripeCustomerId, customerId));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db.update(users)
          .set({ stripeSubscriptionStatus: 'past_due' })
          .where(eq(users.stripeCustomerId, customerId));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}