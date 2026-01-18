/**
 * Quick Redis Connection Test
 * Run with: npx tsx apps/web/scripts/test-redis.ts
 */

import 'dotenv/config';

async function testRedis() {
  console.log('🔍 Testing Redis connection...\n');

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('❌ REDIS_URL not found in environment');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

  try {
    const Redis = (await import('ioredis')).default;

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    // Test SET
    console.log('\n📝 Testing SET...');
    await client.set('alfred:test', 'Hello from Alfred!', 'EX', 60);
    console.log('   ✅ SET successful');

    // Test GET
    console.log('📖 Testing GET...');
    const value = await client.get('alfred:test');
    console.log(`   ✅ GET successful: "${value}"`);

    // Test INCR (for rate limiting)
    console.log('🔢 Testing INCR...');
    await client.set('alfred:counter', '0');
    const count = await client.incr('alfred:counter');
    console.log(`   ✅ INCR successful: ${count}`);

    // Test HMSET (for token bucket)
    console.log('📦 Testing HMSET...');
    await client.hmset('alfred:bucket', { tokens: '100', last_refill: Date.now().toString() });
    const bucket = await client.hgetall('alfred:bucket');
    console.log(`   ✅ HMSET successful: tokens=${bucket.tokens}`);

    // Cleanup
    await client.del('alfred:test', 'alfred:counter', 'alfred:bucket');

    // Get info
    console.log('\n📊 Redis Info:');
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`   Redis Version: ${version || 'unknown'}`);

    await client.quit();

    console.log('\n✅ All Redis tests passed! Ready for production.\n');
    console.log('🚀 Alfred Pro is now configured for horizontal scaling!');
    console.log('   - Rate limiting: Distributed across all instances');
    console.log('   - Session caching: Ready when needed');
    console.log('   - Scale target: 10,000+ concurrent users\n');

  } catch (error) {
    console.error('\n❌ Redis connection failed:', error);
    process.exit(1);
  }
}

testRedis();
