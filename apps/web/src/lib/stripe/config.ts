/**
 * STRIPE CONFIGURATION — Alfred Subscription Plans
 */

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceId: null,
    productId: 'prod_ThZoiqB3o5SX0R',
    features: [
      '10 messages per day',
      'Basic chat interface',
      'File uploads (5MB)',
      'Conversation history',
    ],
    limits: {
      messagesPerDay: 10,
      messagesPerMonth: 300,
      maxFileSize: 5 * 1024 * 1024,
      artifacts: false,
      architectureMode: false,
      deployMode: false,
      apiAccess: false,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    description: 'For serious builders',
    price: 20,
    priceId: 'price_1SkAfHFMelzilVsb67nNh9gT',
    productId: 'prod_ThZoK2NNOphyzt',
    features: [
      '50 messages per day',
      'Artifact generation',
      'Architecture mode',
      'File uploads (25MB)',
      'Priority support',
      'Advanced code generation',
    ],
    limits: {
      messagesPerDay: 50,
      messagesPerMonth: 1500,
      maxFileSize: 25 * 1024 * 1024,
      artifacts: true,
      architectureMode: true,
      deployMode: false,
      apiAccess: false,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Deploy to production',
    price: 50,
    priceId: 'price_1SkAfNFMelzilVsbihpvqyTe',
    productId: 'prod_ThZoWpcY4DXjd8',
    features: [
      'Unlimited messages',
      'Everything in Pro',
      'Deploy to production',
      'API access',
      'File uploads (100MB)',
      'White-glove support',
    ],
    limits: {
      messagesPerDay: -1,
      messagesPerMonth: -1,
      maxFileSize: 100 * 1024 * 1024,
      artifacts: true,
      architectureMode: true,
      deployMode: true,
      apiAccess: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = typeof PLANS[PlanId];

export function getPlanByPriceId(priceId: string): Plan | null {
  return Object.values(PLANS).find(plan => plan.priceId === priceId) || null;
}

export function getPlanById(planId: string): Plan | null {
  const key = planId.toUpperCase().replace('-', '_') as PlanId;
  return PLANS[key] || null;
}