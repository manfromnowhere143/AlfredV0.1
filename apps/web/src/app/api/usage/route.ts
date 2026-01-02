export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@alfred/database';
import { users } from '@alfred/database';
import { eq, sql } from 'drizzle-orm';

/**
 * Tier Limits - Based on 50% margin model
 * 
 * Claude Sonnet 4 pricing: ~$15 per 1M output tokens
 * So 1K tokens ≈ $0.015
 * 
 * Pricing strategy:
 * - 50% goes to Claude API costs
 * - 50% is our margin for platform/infrastructure
 * 
 * Free:       ~$2 worth of tokens (introductory)
 * Pro ($20):  $10 to Claude = ~667K tokens/month
 * Business ($50): $25 to Claude = ~1.67M tokens/month (hidden from UI for now)
 * Enterprise ($200): Unlimited (custom)
 */
const TIER_LIMITS = {
  free: { 
    dailyTokens: 4_500,      // ~$2/month worth, spread across 30 days
    monthlyTokens: 135_000 
  },
  pro: { 
    dailyTokens: 22_000,     // $20/month plan, $10 to Claude
    monthlyTokens: 660_000 
  },
  business: { 
    dailyTokens: 55_000,     // $50/month plan, $25 to Claude (5x pro daily)
    monthlyTokens: 1_650_000 // Hidden from UI for now
  },
  enterprise: { 
    dailyTokens: -1,         // Unlimited
    monthlyTokens: -1 
  },
};

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [user] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const tier = (user?.tier || 'free') as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    
    // Unlimited tier (enterprise)
    if (limits.dailyTokens < 0) {
      return NextResponse.json({
        tier,
        unlimited: true,
        daily: { used: 0, limit: -1, remaining: -1, percent: 0 },
        monthly: { used: 0, limit: -1, remaining: -1, percent: 0 },
        resetInSeconds: 0,
      });
    }
    
    const today = getTodayString();
    const monthStart = getMonthStart();
    
    // Query daily usage
    const dailyResult: any = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens, COALESCE(SUM(request_count), 0) as requests, COALESCE(SUM(artifact_count), 0) as artifacts FROM usage WHERE user_id = ${userId} AND date = ${today}`
    );
    
    // Query monthly usage
    const monthlyResult: any = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens, COALESCE(SUM(request_count), 0) as requests, COALESCE(SUM(artifact_count), 0) as artifacts FROM usage WHERE user_id = ${userId} AND date >= ${monthStart}`
    );
    
    // Handle both .rows and direct array formats (different DB drivers)
    const dailyUsage = dailyResult.rows?.[0] || dailyResult[0] || { tokens: 0, requests: 0, artifacts: 0 };
    const monthlyUsage = monthlyResult.rows?.[0] || monthlyResult[0] || { tokens: 0, requests: 0, artifacts: 0 };
    
    const dailyUsed = Number(dailyUsage.tokens || 0);
    const monthlyUsed = Number(monthlyUsage.tokens || 0);
    
    // Check if limit exceeded
    const dailyExceeded = dailyUsed >= limits.dailyTokens;
    const monthlyExceeded = monthlyUsed >= limits.monthlyTokens;
    
    return NextResponse.json({
      tier,
      unlimited: false,
      limitExceeded: dailyExceeded || monthlyExceeded,
      daily: {
        used: dailyUsed,
        limit: limits.dailyTokens,
        remaining: Math.max(0, limits.dailyTokens - dailyUsed),
        percent: Math.min(100, Math.round((dailyUsed / limits.dailyTokens) * 100)),
        exceeded: dailyExceeded,
        requests: Number(dailyUsage.requests || 0),
        artifacts: Number(dailyUsage.artifacts || 0),
      },
      monthly: {
        used: monthlyUsed,
        limit: limits.monthlyTokens,
        remaining: Math.max(0, limits.monthlyTokens - monthlyUsed),
        percent: Math.min(100, Math.round((monthlyUsed / limits.monthlyTokens) * 100)),
        exceeded: monthlyExceeded,
        requests: Number(monthlyUsage.requests || 0),
        artifacts: Number(monthlyUsage.artifacts || 0),
      },
      resetInSeconds: getSecondsUntilMidnight(),
    });
    
  } catch (error: any) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}