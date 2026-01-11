/**
 * Stripe Configuration Tests
 *
 * Tests for plan lookups and configuration.
 * Note: These tests mock the Stripe client to avoid needing API keys.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock the Stripe constructor before importing config
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {},
      subscriptions: {},
    })),
  };
});

// Now import after mocking
import { PLANS, getPlanByPriceId, getPlanById } from './config';

describe('PLANS', () => {
  it('has three plans', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
    expect(PLANS.FREE).toBeDefined();
    expect(PLANS.PRO).toBeDefined();
    expect(PLANS.ENTERPRISE).toBeDefined();
  });

  it('FREE plan has correct limits', () => {
    expect(PLANS.FREE.price).toBe(0);
    expect(PLANS.FREE.limits.messagesPerDay).toBe(10);
    expect(PLANS.FREE.limits.artifacts).toBe(false);
    expect(PLANS.FREE.limits.deployMode).toBe(false);
  });

  it('PRO plan has correct limits', () => {
    expect(PLANS.PRO.price).toBe(20);
    expect(PLANS.PRO.limits.messagesPerDay).toBe(50);
    expect(PLANS.PRO.limits.artifacts).toBe(true);
    expect(PLANS.PRO.limits.architectureMode).toBe(true);
    expect(PLANS.PRO.limits.deployMode).toBe(false);
  });

  it('ENTERPRISE plan has unlimited messages', () => {
    expect(PLANS.ENTERPRISE.price).toBe(50);
    expect(PLANS.ENTERPRISE.limits.messagesPerDay).toBe(-1);
    expect(PLANS.ENTERPRISE.limits.messagesPerMonth).toBe(-1);
    expect(PLANS.ENTERPRISE.limits.deployMode).toBe(true);
    expect(PLANS.ENTERPRISE.limits.apiAccess).toBe(true);
  });

  it('all plans have required fields', () => {
    Object.values(PLANS).forEach(plan => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.description).toBeDefined();
      expect(typeof plan.price).toBe('number');
      expect(plan.features).toBeInstanceOf(Array);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.limits).toBeDefined();
    });
  });
});

describe('getPlanByPriceId', () => {
  it('returns PRO plan for PRO priceId', () => {
    const plan = getPlanByPriceId('price_1SkAfHFMelzilVsb67nNh9gT');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('pro');
  });

  it('returns ENTERPRISE plan for ENTERPRISE priceId', () => {
    const plan = getPlanByPriceId('price_1SkAfNFMelzilVsbihpvqyTe');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('enterprise');
  });

  it('returns null for unknown priceId', () => {
    const plan = getPlanByPriceId('price_unknown');
    expect(plan).toBeNull();
  });

  it('returns null for FREE plan (no priceId)', () => {
    expect(PLANS.FREE.priceId).toBeNull();
  });
});

describe('getPlanById', () => {
  it('returns FREE plan for "free"', () => {
    const plan = getPlanById('free');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('free');
  });

  it('returns PRO plan for "pro"', () => {
    const plan = getPlanById('pro');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('pro');
  });

  it('returns ENTERPRISE plan for "enterprise"', () => {
    const plan = getPlanById('enterprise');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('enterprise');
  });

  it('handles case insensitivity', () => {
    expect(getPlanById('FREE')?.id).toBe('free');
    expect(getPlanById('Pro')?.id).toBe('pro');
    expect(getPlanById('ENTERPRISE')?.id).toBe('enterprise');
  });

  it('returns null for unknown planId', () => {
    const plan = getPlanById('unknown');
    expect(plan).toBeNull();
  });
});

describe('Plan Feature Consistency', () => {
  it('each higher tier includes features of lower tiers', () => {
    // PRO should have more than FREE
    expect(PLANS.PRO.limits.messagesPerDay).toBeGreaterThan(
      PLANS.FREE.limits.messagesPerDay
    );

    // ENTERPRISE should have unlimited or more than PRO
    expect(
      PLANS.ENTERPRISE.limits.messagesPerDay === -1 ||
      PLANS.ENTERPRISE.limits.messagesPerDay >= PLANS.PRO.limits.messagesPerDay
    ).toBe(true);
  });

  it('file size limits increase with tier', () => {
    expect(PLANS.PRO.limits.maxFileSize).toBeGreaterThan(
      PLANS.FREE.limits.maxFileSize
    );
    expect(PLANS.ENTERPRISE.limits.maxFileSize).toBeGreaterThan(
      PLANS.PRO.limits.maxFileSize
    );
  });

  it('deploy mode only available in ENTERPRISE', () => {
    expect(PLANS.FREE.limits.deployMode).toBe(false);
    expect(PLANS.PRO.limits.deployMode).toBe(false);
    expect(PLANS.ENTERPRISE.limits.deployMode).toBe(true);
  });
});
