export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@alfred/database';
import { users } from '@alfred/database';
import { eq, and, sql } from 'drizzle-orm';

const TIER_LIMITS = {
  free: { dailyTokens: 17_000, monthlyTokens: 500_000 },
  pro: { dailyTokens: 67_000, monthlyTokens: 2_000_000 },
  enterprise: { dailyTokens: -1, monthlyTokens: -1 },
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    const [user] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const tier = (user?.tier || 'free') as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    
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
    
    // Raw SQL for usage table
    const dailyResult = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens, COALESCE(SUM(request_count), 0) as requests, COALESCE(SUM(artifact_count), 0) as artifacts FROM usage WHERE user_id = ${userId} AND date = ${today}`
    );
    
    const monthlyResult = await db.execute(
      sql`SELECT COALESCE(SUM(output_tokens), 0) as tokens, COALESCE(SUM(request_count), 0) as requests, COALESCE(SUM(artifact_count), 0) as artifacts FROM usage WHERE user_id = ${userId} AND date >= ${monthStart}`
    );
    
    const dailyUsage = dailyResult.rows[0] || { tokens: 0, requests: 0, artifacts: 0 };
    const monthlyUsage = monthlyResult.rows[0] || { tokens: 0, requests: 0, artifacts: 0 };
    
    const dailyUsed = Number(dailyUsage.tokens || 0);
    const monthlyUsed = Number(monthlyUsage.tokens || 0);
    
    return NextResponse.json({
      tier,
      unlimited: false,
      daily: {
        used: dailyUsed,
        limit: limits.dailyTokens,
        remaining: Math.max(0, limits.dailyTokens - dailyUsed),
        percent: Math.round((dailyUsed / limits.dailyTokens) * 100),
        requests: Number(dailyUsage.requests || 0),
        artifacts: Number(dailyUsage.artifacts || 0),
      },
      monthly: {
        used: monthlyUsed,
        limit: limits.monthlyTokens,
        remaining: Math.max(0, limits.monthlyTokens - monthlyUsed),
        percent: Math.round((monthlyUsed / limits.monthlyTokens) * 100),
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
