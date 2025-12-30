export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, PLANS, type PlanId } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Please sign in to subscribe' }, { status: 401 });
    }

    const { planId } = await request.json();
    
    if (!planId || !['PRO', 'PRO_MAX'].includes(planId.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const plan = PLANS[planId.toUpperCase() as PlanId];
    
    if (!plan.priceId) {
      return NextResponse.json({ error: 'This plan is not available for purchase' }, { status: 400 });
    }

    const customers = await stripe.customers.list({ email: session.user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true&plan=${plan.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: { userId: session.user.id, planId: plan.id },
      subscription_data: { metadata: { userId: session.user.id, planId: plan.id } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}