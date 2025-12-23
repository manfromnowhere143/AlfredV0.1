/**
 * Rate Limit Tests
 *
 * Verifies token bucket and rate limiting logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBucket,
  refillBucket,
  consumeTokens,
  createRateLimiter,
  checkRateLimit,
  getRemainingTokens,
  createSlidingWindow,
  checkSlidingWindow,
  createQuotaUsage,
  checkQuota,
  RATE_LIMIT_PRESETS,
  QUOTA_PRESETS,
} from './rate-limit';
import { AlfredError } from './errors';

// ============================================================================
// TOKEN BUCKET
// ============================================================================

describe('TokenBucket', () => {
  describe('createBucket', () => {
    it('creates bucket with specified capacity', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 1 });

      expect(bucket.capacity).toBe(10);
      expect(bucket.tokens).toBe(10);
      expect(bucket.refillRate).toBe(1);
    });

    it('uses custom initial tokens', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 1, initialTokens: 5 });

      expect(bucket.tokens).toBe(5);
    });
  });

  describe('refillBucket', () => {
    it('adds tokens based on elapsed time', async () => {
      const bucket = createBucket({ capacity: 10, refillRate: 10 }); // 10 tokens/sec
      const emptied = { ...bucket, tokens: 0, lastRefill: Date.now() - 500 }; // 500ms ago

      const refilled = refillBucket(emptied);

      expect(refilled.tokens).toBeGreaterThan(0);
      expect(refilled.tokens).toBeLessThanOrEqual(10);
    });

    it('does not exceed capacity', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 100 });
      const old = { ...bucket, lastRefill: Date.now() - 10000 }; // 10 seconds ago

      const refilled = refillBucket(old);

      expect(refilled.tokens).toBe(10);
    });
  });

  describe('consumeTokens', () => {
    it('allows when enough tokens', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 1 });
      const result = consumeTokens(bucket, 5);

      expect(result.allowed).toBe(true);
      expect(result.bucket.tokens).toBeLessThan(10);
    });

    it('denies when not enough tokens', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 1, initialTokens: 2 });
      const result = consumeTokens(bucket, 5);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('calculates correct retry time', () => {
      const bucket = createBucket({ capacity: 10, refillRate: 1, initialTokens: 0 });
      const result = consumeTokens(bucket, 3);

      // Need 3 tokens at 1/sec = ~3 seconds
      expect(result.retryAfter).toBe(3);
    });
  });
});

// ============================================================================
// RATE LIMITER
// ============================================================================

describe('RateLimiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter(RATE_LIMIT_PRESETS.standard);
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      expect(() => checkRateLimit(limiter, 'user1')).not.toThrow();
    });

    it('throws when limit exceeded', () => {
      // Exhaust the bucket (free tier: 10 requests)
      for (let i = 0; i < 10; i++) {
        checkRateLimit(limiter, 'user2');
      }

      expect(() => checkRateLimit(limiter, 'user2')).toThrow(AlfredError);
    });

    it('respects different tiers', () => {
      // Pro tier has higher capacity
      for (let i = 0; i < 20; i++) {
        expect(() => checkRateLimit(limiter, 'pro_user', 'pro')).not.toThrow();
      }
    });
  });

  describe('getRemainingTokens', () => {
    it('returns full capacity for new user', () => {
      const remaining = getRemainingTokens(limiter, 'new_user');

      expect(remaining).toBe(10); // free tier capacity
    });

    it('decreases after requests', () => {
      checkRateLimit(limiter, 'user3');
      checkRateLimit(limiter, 'user3');

      const remaining = getRemainingTokens(limiter, 'user3');

      expect(remaining).toBeLessThan(10);
    });
  });
});

// ============================================================================
// SLIDING WINDOW
// ============================================================================

describe('SlidingWindow', () => {
  describe('createSlidingWindow', () => {
    it('creates window with config', () => {
      const window = createSlidingWindow({ windowSize: 60000, maxRequests: 100 });

      expect(window.currentCount).toBe(0);
      expect(window.previousCount).toBe(0);
      expect(window.config.maxRequests).toBe(100);
    });
  });

  describe('checkSlidingWindow', () => {
    it('allows requests under limit', () => {
      let window = createSlidingWindow({ windowSize: 60000, maxRequests: 10 });

      const result = checkSlidingWindow(window);

      expect(result.allowed).toBe(true);
      expect(result.window.currentCount).toBe(1);
    });

    it('denies requests over limit', () => {
      let window = createSlidingWindow({ windowSize: 60000, maxRequests: 2 });

      // Use up the limit
      window = checkSlidingWindow(window).window;
      window = checkSlidingWindow(window).window;

      const result = checkSlidingWindow(window);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });
  });
});

// ============================================================================
// QUOTA
// ============================================================================

describe('Quota', () => {
  describe('createQuotaUsage', () => {
    it('initializes with zero usage', () => {
      const usage = createQuotaUsage();

      expect(usage.dailyUsed).toBe(0);
      expect(usage.monthlyUsed).toBe(0);
    });

    it('sets reset timestamps', () => {
      const usage = createQuotaUsage();
      const now = Date.now();

      expect(usage.dailyResetAt).toBeGreaterThan(now);
      expect(usage.monthlyResetAt).toBeGreaterThan(now);
    });
  });

  describe('checkQuota', () => {
    it('allows within quota', () => {
      const usage = createQuotaUsage();
      const config = QUOTA_PRESETS.free;

      const updated = checkQuota(usage, config, 1);

      expect(updated.dailyUsed).toBe(1);
      expect(updated.monthlyUsed).toBe(1);
    });

    it('throws when daily quota exceeded', () => {
      const usage = { ...createQuotaUsage(), dailyUsed: 100 };
      const config = QUOTA_PRESETS.free; // 100 daily

      expect(() => checkQuota(usage, config, 1)).toThrow(AlfredError);
    });

    it('throws when monthly quota exceeded', () => {
      const usage = { ...createQuotaUsage(), monthlyUsed: 1000 };
      const config = QUOTA_PRESETS.free; // 1000 monthly

      expect(() => checkQuota(usage, config, 1)).toThrow(AlfredError);
    });

    it('respects cost parameter', () => {
      const usage = createQuotaUsage();
      const config = QUOTA_PRESETS.free;

      const updated = checkQuota(usage, config, 10);

      expect(updated.dailyUsed).toBe(10);
      expect(updated.monthlyUsed).toBe(10);
    });
  });
});

// ============================================================================
// PRESETS
// ============================================================================

describe('presets', () => {
  it('defines standard rate limit tiers', () => {
    expect(RATE_LIMIT_PRESETS.standard.tiers.free).toBeDefined();
    expect(RATE_LIMIT_PRESETS.standard.tiers.pro).toBeDefined();
    expect(RATE_LIMIT_PRESETS.standard.tiers.enterprise).toBeDefined();
  });

  it('defines quota presets', () => {
    expect(QUOTA_PRESETS.free.daily).toBeLessThan(QUOTA_PRESETS.pro.daily);
    expect(QUOTA_PRESETS.pro.daily).toBeLessThan(QUOTA_PRESETS.enterprise.daily);
  });
});
