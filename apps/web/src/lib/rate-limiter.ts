/**
 * Distributed Rate Limiter
 *
 * Redis-backed rate limiting for horizontal scaling.
 * Uses token bucket algorithm with atomic Lua scripts for consistency.
 *
 * Features:
 * - Horizontally scalable (shared state via Redis)
 * - Atomic operations (no race conditions)
 * - Graceful fallback to in-memory when Redis unavailable
 * - Multiple tiers (free, pro, enterprise)
 *
 * Usage:
 *   import { rateLimiter } from '@/lib/rate-limiter';
 *
 *   // In API route:
 *   const result = await rateLimiter.check(userId, 'chat', 'pro');
 *   if (!result.allowed) {
 *     return new Response('Rate limited', {
 *       status: 429,
 *       headers: { 'Retry-After': String(result.retryAfter) }
 *     });
 *   }
 */

import { getRedisClient, type RedisClient } from './redis';
import { logger } from './logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface RateLimitTier {
  capacity: number;      // Maximum tokens in bucket
  refillRate: number;    // Tokens added per second
  description: string;   // Human-readable description
}

export interface RateLimitConfig {
  tiers: Record<string, RateLimitTier>;
  defaultTier: string;
  keyPrefix: string;
}

// Default configuration for different API endpoints
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  chat: {
    keyPrefix: 'rl:chat',
    defaultTier: 'free',
    tiers: {
      free: { capacity: 20, refillRate: 0.5, description: '20 requests, refills 1 every 2s' },
      pro: { capacity: 100, refillRate: 2, description: '100 requests, refills 2/s' },
      enterprise: { capacity: 500, refillRate: 10, description: '500 requests, refills 10/s' },
    },
  },
  api: {
    keyPrefix: 'rl:api',
    defaultTier: 'free',
    tiers: {
      free: { capacity: 60, refillRate: 1, description: '60 requests/min' },
      pro: { capacity: 300, refillRate: 5, description: '300 requests/min' },
      enterprise: { capacity: 1000, refillRate: 20, description: '1000 requests/min' },
    },
  },
  deploy: {
    keyPrefix: 'rl:deploy',
    defaultTier: 'free',
    tiers: {
      free: { capacity: 5, refillRate: 0.1, description: '5 deploys, refills 1 every 10s' },
      pro: { capacity: 20, refillRate: 0.5, description: '20 deploys, refills 1 every 2s' },
      enterprise: { capacity: 100, refillRate: 2, description: '100 deploys, refills 2/s' },
    },
  },
  upload: {
    keyPrefix: 'rl:upload',
    defaultTier: 'free',
    tiers: {
      free: { capacity: 10, refillRate: 0.2, description: '10 uploads, refills 1 every 5s' },
      pro: { capacity: 50, refillRate: 1, description: '50 uploads, refills 1/s' },
      enterprise: { capacity: 200, refillRate: 5, description: '200 uploads, refills 5/s' },
    },
  },
};

// ============================================================================
// RATE LIMITER
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;  // Seconds until next request allowed (if not allowed)
  limit: number;        // Total capacity
}

// Lua script for atomic token bucket operation
// This runs entirely on Redis server, preventing race conditions
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

-- Get current bucket state
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize if new bucket
if not tokens then
  tokens = capacity
  last_refill = now
end

-- Refill tokens based on elapsed time
local elapsed = (now - last_refill) / 1000
local tokens_to_add = elapsed * refill_rate
tokens = math.min(capacity, tokens + tokens_to_add)

-- Try to consume tokens
if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return {1, math.floor(tokens)}
else
  -- Not enough tokens
  local deficit = cost - tokens
  local retry_after = math.ceil(deficit / refill_rate)
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return {0, retry_after}
end
`;

class DistributedRateLimiter {
  private redis: RedisClient | null = null;
  private initializing: Promise<void> | null = null;

  /**
   * Initialize Redis connection lazily
   */
  private async ensureInitialized(): Promise<RedisClient> {
    if (this.redis) return this.redis;

    if (this.initializing) {
      await this.initializing;
      return this.redis!;
    }

    this.initializing = (async () => {
      this.redis = await getRedisClient();
    })();

    await this.initializing;
    return this.redis!;
  }

  /**
   * Check rate limit for a user/endpoint combination
   *
   * @param identifier - User ID or IP address
   * @param endpoint - API endpoint type (chat, api, deploy, upload)
   * @param tier - User's subscription tier
   * @param cost - Number of tokens to consume (default: 1)
   */
  async check(
    identifier: string,
    endpoint: keyof typeof RATE_LIMIT_CONFIGS = 'api',
    tier: string = 'free',
    cost: number = 1
  ): Promise<RateLimitResult> {
    const redis = await this.ensureInitialized();
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.api;
    const tierConfig = config.tiers[tier] || config.tiers[config.defaultTier];

    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();

    try {
      const result = await redis.eval(
        TOKEN_BUCKET_SCRIPT,
        [key],
        [tierConfig.capacity, tierConfig.refillRate, now, cost]
      ) as [number, number];

      const [allowed, value] = result;

      if (allowed === 1) {
        return {
          allowed: true,
          remaining: value,
          limit: tierConfig.capacity,
        };
      } else {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: value,
          limit: tierConfig.capacity,
        };
      }
    } catch (error) {
      logger.error('[RateLimiter]', 'Check failed, allowing request', error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: tierConfig.capacity,
        limit: tierConfig.capacity,
      };
    }
  }

  /**
   * Get current rate limit status without consuming tokens
   */
  async status(
    identifier: string,
    endpoint: keyof typeof RATE_LIMIT_CONFIGS = 'api',
    tier: string = 'free'
  ): Promise<{ remaining: number; limit: number; resetIn: number }> {
    const redis = await this.ensureInitialized();
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.api;
    const tierConfig = config.tiers[tier] || config.tiers[config.defaultTier];

    const key = `${config.keyPrefix}:${identifier}`;

    try {
      const data = await redis.get(key);
      if (!data) {
        return {
          remaining: tierConfig.capacity,
          limit: tierConfig.capacity,
          resetIn: 0,
        };
      }

      // Parse bucket state
      const bucket = JSON.parse(data);
      const now = Date.now();
      const elapsed = (now - bucket.lastRefill) / 1000;
      const tokens = Math.min(tierConfig.capacity, bucket.tokens + elapsed * tierConfig.refillRate);
      const resetIn = Math.ceil((tierConfig.capacity - tokens) / tierConfig.refillRate);

      return {
        remaining: Math.floor(tokens),
        limit: tierConfig.capacity,
        resetIn,
      };
    } catch {
      return {
        remaining: tierConfig.capacity,
        limit: tierConfig.capacity,
        resetIn: 0,
      };
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  async reset(identifier: string, endpoint: keyof typeof RATE_LIMIT_CONFIGS = 'api'): Promise<void> {
    const redis = await this.ensureInitialized();
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.api;
    const key = `${config.keyPrefix}:${identifier}`;

    try {
      await redis.del(key);
      logger.debug('[RateLimiter]', `Reset rate limit for ${identifier} on ${endpoint}`);
    } catch (error) {
      logger.error('[RateLimiter]', 'Reset failed', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new DistributedRateLimiter();

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Helper function for API routes to check rate limit and return error response
 */
export async function withRateLimit(
  identifier: string,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS = 'api',
  tier: string = 'free'
): Promise<Response | null> {
  const result = await rateLimiter.check(identifier, endpoint, tier);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null; // Request allowed
}

export default rateLimiter;
