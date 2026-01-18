/**
 * Redis Client
 *
 * Provides Redis connectivity for:
 * - Distributed rate limiting (horizontally scalable)
 * - Session caching (optional, for faster session lookups)
 * - General caching
 *
 * Configuration via environment variable:
 * - REDIS_URL: Redis connection string (e.g., redis://localhost:6379)
 *
 * Falls back gracefully when Redis is not configured (uses in-memory fallback).
 */

import { logger } from './logger';

// Redis-like interface for both real Redis and in-memory fallback
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  // For rate limiting with atomic operations
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
  isConnected(): boolean;
  quit(): Promise<void>;
}

// In-memory fallback when Redis is not available
class InMemoryRedis implements RedisClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private connected = true;

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    this.cleanup();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<void> {
    let expiresAt: number | undefined;
    if (options?.ex) {
      expiresAt = Date.now() + options.ex * 1000;
    } else if (options?.px) {
      expiresAt = Date.now() + options.px;
    }
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const currentValue = entry ? parseInt(entry.value, 10) || 0 : 0;
    const newValue = currentValue + 1;
    this.store.set(key, { value: String(newValue), expiresAt: entry?.expiresAt });
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    this.cleanup();
    return this.store.has(key);
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    // Simplified eval for rate limiting script
    // This handles the basic token bucket Lua script pattern
    const key = keys[0];
    const [capacity, refillRate, now, cost] = args.map(Number);

    const data = await this.get(key);
    let bucket = data ? JSON.parse(data) : { tokens: capacity, lastRefill: now };

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    // Try to consume
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      await this.set(key, JSON.stringify(bucket), { ex: 3600 });
      return [1, bucket.tokens]; // allowed, remaining
    }

    const deficit = cost - bucket.tokens;
    const retryAfter = Math.ceil(deficit / refillRate);
    await this.set(key, JSON.stringify(bucket), { ex: 3600 });
    return [0, retryAfter]; // not allowed, retry after seconds
  }

  isConnected(): boolean {
    return this.connected;
  }

  async quit(): Promise<void> {
    this.connected = false;
    this.store.clear();
  }
}

// Real Redis client using ioredis (when available)
let redisClient: RedisClient | null = null;
let connectionAttempted = false;

/**
 * Creates and returns a Redis client.
 * Falls back to in-memory implementation when Redis is not configured.
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('[Redis]', 'REDIS_URL not configured, using in-memory fallback (not suitable for multi-instance)');
    redisClient = new InMemoryRedis();
    return redisClient;
  }

  if (connectionAttempted) {
    // Already tried and failed, return fallback
    redisClient = new InMemoryRedis();
    return redisClient;
  }

  connectionAttempted = true;

  try {
    // Dynamic import to avoid bundling ioredis when not needed
    const Redis = (await import('ioredis')).default;

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    await client.connect();
    logger.info('[Redis]', 'Connected successfully');

    // Wrap ioredis client to match our interface
    redisClient = {
      async get(key: string) {
        return client.get(key);
      },
      async set(key: string, value: string, options?: { ex?: number; px?: number }) {
        if (options?.ex) {
          await client.setex(key, options.ex, value);
        } else if (options?.px) {
          await client.psetex(key, options.px, value);
        } else {
          await client.set(key, value);
        }
      },
      async incr(key: string) {
        return client.incr(key);
      },
      async expire(key: string, seconds: number) {
        await client.expire(key, seconds);
      },
      async del(key: string) {
        await client.del(key);
      },
      async exists(key: string) {
        return (await client.exists(key)) === 1;
      },
      async ttl(key: string) {
        return client.ttl(key);
      },
      async eval(script: string, keys: string[], args: (string | number)[]) {
        return client.eval(script, keys.length, ...keys, ...args);
      },
      isConnected() {
        return client.status === 'ready';
      },
      async quit() {
        await client.quit();
      },
    };

    return redisClient;
  } catch (error) {
    logger.error('[Redis]', 'Connection failed, using in-memory fallback', error);
    redisClient = new InMemoryRedis();
    return redisClient;
  }
}

/**
 * Check if Redis is properly configured and connected.
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

export default getRedisClient;
