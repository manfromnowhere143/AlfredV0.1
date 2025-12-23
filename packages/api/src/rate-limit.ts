/**
 * Rate Limiting
 *
 * Token bucket algorithm for request rate limiting.
 * Smooth, fair, and mathematically sound.
 */

import { rateLimitError, quotaExceededError } from './errors';

// ============================================================================
// TOKEN BUCKET
// ============================================================================

export interface TokenBucketConfig {
  capacity: number;        // Maximum tokens
  refillRate: number;      // Tokens per second
  initialTokens?: number;  // Starting tokens (defaults to capacity)
}

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

/**
 * Creates a new token bucket.
 */
export function createBucket(config: TokenBucketConfig): TokenBucket {
  return {
    tokens: config.initialTokens ?? config.capacity,
    lastRefill: Date.now(),
    capacity: config.capacity,
    refillRate: config.refillRate,
  };
}

/**
 * Refills the bucket based on elapsed time.
 * Returns updated bucket.
 */
export function refillBucket(bucket: TokenBucket): TokenBucket {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const tokensToAdd = elapsed * bucket.refillRate;
  const newTokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);

  return {
    ...bucket,
    tokens: newTokens,
    lastRefill: now,
  };
}

/**
 * Attempts to consume tokens from the bucket.
 * Returns { allowed, bucket, retryAfter }.
 */
export function consumeTokens(
  bucket: TokenBucket,
  count: number = 1
): { allowed: boolean; bucket: TokenBucket; retryAfter?: number } {
  const refilled = refillBucket(bucket);

  if (refilled.tokens >= count) {
    return {
      allowed: true,
      bucket: {
        ...refilled,
        tokens: refilled.tokens - count,
      },
    };
  }

  // Calculate time until enough tokens available
  const deficit = count - refilled.tokens;
  const retryAfter = Math.ceil(deficit / refilled.refillRate);

  return {
    allowed: false,
    bucket: refilled,
    retryAfter,
  };
}

// ============================================================================
// RATE LIMITER
// ============================================================================

export interface RateLimiterConfig {
  tiers: Record<string, TokenBucketConfig>;
  defaultTier: string;
}

export interface RateLimiter {
  config: RateLimiterConfig;
  buckets: Map<string, TokenBucket>;
}

/**
 * Creates a rate limiter with multiple tiers.
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return {
    config,
    buckets: new Map(),
  };
}

/**
 * Gets or creates a bucket for a key.
 */
function getBucket(
  limiter: RateLimiter,
  key: string,
  tier: string
): TokenBucket {
  const existing = limiter.buckets.get(key);
  if (existing) {
    return existing;
  }

  const tierConfig = limiter.config.tiers[tier] || limiter.config.tiers[limiter.config.defaultTier];
  const bucket = createBucket(tierConfig);
  limiter.buckets.set(key, bucket);
  return bucket;
}

/**
 * Checks rate limit for a key.
 * Throws if rate limited.
 */
export function checkRateLimit(
  limiter: RateLimiter,
  key: string,
  tier: string = limiter.config.defaultTier,
  cost: number = 1
): void {
  const bucket = getBucket(limiter, key, tier);
  const result = consumeTokens(bucket, cost);

  limiter.buckets.set(key, result.bucket);

  if (!result.allowed) {
    throw rateLimitError(result.retryAfter!);
  }
}

/**
 * Gets remaining tokens for a key.
 */
export function getRemainingTokens(
  limiter: RateLimiter,
  key: string
): number {
  const bucket = limiter.buckets.get(key);
  if (!bucket) {
    return limiter.config.tiers[limiter.config.defaultTier].capacity;
  }

  const refilled = refillBucket(bucket);
  return Math.floor(refilled.tokens);
}

// ============================================================================
// SLIDING WINDOW COUNTER
// ============================================================================

export interface SlidingWindowConfig {
  windowSize: number;  // Window size in milliseconds
  maxRequests: number; // Maximum requests per window
}

export interface SlidingWindow {
  currentCount: number;
  previousCount: number;
  windowStart: number;
  config: SlidingWindowConfig;
}

/**
 * Creates a sliding window counter.
 */
export function createSlidingWindow(config: SlidingWindowConfig): SlidingWindow {
  return {
    currentCount: 0,
    previousCount: 0,
    windowStart: Date.now(),
    config,
  };
}

/**
 * Updates window and checks if request is allowed.
 */
export function checkSlidingWindow(
  window: SlidingWindow
): { allowed: boolean; window: SlidingWindow; retryAfter?: number } {
  const now = Date.now();
  const windowSize = window.config.windowSize;
  const elapsed = now - window.windowStart;

  let updatedWindow: SlidingWindow;

  if (elapsed >= windowSize * 2) {
    // Both windows have passed, reset
    updatedWindow = {
      ...window,
      currentCount: 0,
      previousCount: 0,
      windowStart: now,
    };
  } else if (elapsed >= windowSize) {
    // Current window becomes previous
    updatedWindow = {
      ...window,
      previousCount: window.currentCount,
      currentCount: 0,
      windowStart: window.windowStart + windowSize,
    };
  } else {
    updatedWindow = window;
  }

  // Calculate weighted request count
  const currentElapsed = now - updatedWindow.windowStart;
  const previousWeight = 1 - (currentElapsed / windowSize);
  const weightedCount = updatedWindow.currentCount + (updatedWindow.previousCount * previousWeight);

  if (weightedCount >= window.config.maxRequests) {
    const retryAfter = Math.ceil((windowSize - currentElapsed) / 1000);
    return { allowed: false, window: updatedWindow, retryAfter };
  }

  return {
    allowed: true,
    window: {
      ...updatedWindow,
      currentCount: updatedWindow.currentCount + 1,
    },
  };
}

// ============================================================================
// QUOTA TRACKING
// ============================================================================

export interface QuotaConfig {
  daily: number;
  monthly: number;
}

export interface QuotaUsage {
  dailyUsed: number;
  monthlyUsed: number;
  dailyResetAt: number;
  monthlyResetAt: number;
}

/**
 * Creates initial quota usage.
 */
export function createQuotaUsage(): QuotaUsage {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);

  return {
    dailyUsed: 0,
    monthlyUsed: 0,
    dailyResetAt: tomorrow.getTime(),
    monthlyResetAt: nextMonth.getTime(),
  };
}

/**
 * Checks and updates quota.
 * Throws if quota exceeded.
 */
export function checkQuota(
  usage: QuotaUsage,
  config: QuotaConfig,
  cost: number = 1
): QuotaUsage {
  const now = Date.now();

  // Reset if needed
  let updated = { ...usage };

  if (now >= usage.dailyResetAt) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    updated.dailyUsed = 0;
    updated.dailyResetAt = tomorrow.getTime();
  }

  if (now >= usage.monthlyResetAt) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    updated.monthlyUsed = 0;
    updated.monthlyResetAt = nextMonth.getTime();
  }

  // Check limits
  if (updated.dailyUsed + cost > config.daily) {
    throw quotaExceededError(config.daily, 'day');
  }

  if (updated.monthlyUsed + cost > config.monthly) {
    throw quotaExceededError(config.monthly, 'month');
  }

  // Update usage
  return {
    ...updated,
    dailyUsed: updated.dailyUsed + cost,
    monthlyUsed: updated.monthlyUsed + cost,
  };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RATE_LIMIT_PRESETS: Record<string, RateLimiterConfig> = {
  standard: {
    defaultTier: 'free',
    tiers: {
      free: { capacity: 10, refillRate: 1 },      // 10 requests, 1/sec refill
      pro: { capacity: 50, refillRate: 5 },       // 50 requests, 5/sec refill
      enterprise: { capacity: 200, refillRate: 20 }, // 200 requests, 20/sec refill
    },
  },
  strict: {
    defaultTier: 'free',
    tiers: {
      free: { capacity: 5, refillRate: 0.5 },
      pro: { capacity: 20, refillRate: 2 },
      enterprise: { capacity: 100, refillRate: 10 },
    },
  },
};

export const QUOTA_PRESETS: Record<string, QuotaConfig> = {
  free: { daily: 100, monthly: 1000 },
  pro: { daily: 1000, monthly: 20000 },
  enterprise: { daily: 10000, monthly: 300000 },
};
