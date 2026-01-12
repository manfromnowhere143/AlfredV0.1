/**
 * HEALTH CHECK ENDPOINT
 * /api/health
 *
 * Returns system health status for monitoring and load balancers.
 * Checks: Database, LLM circuit breaker, orchestrator state
 */

import { NextResponse } from 'next/server';
import { db } from '@alfred/database';
import { sql } from 'drizzle-orm';
import { getOrchestratorHealth } from '@/lib/chat-orchestrator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    orchestrator: ComponentHealth;
    llm: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = performance.now();

  // 1. Check database
  const dbHealth = await checkDatabase();

  // 2. Check orchestrator and circuit breaker
  const orchestratorHealth = getOrchestratorHealth();

  // 3. Aggregate status
  const checks = {
    database: dbHealth,
    orchestrator: {
      status: orchestratorHealth.status === 'healthy' ? 'up' as const :
              orchestratorHealth.status === 'degraded' ? 'degraded' as const : 'down' as const,
      details: {
        circuitBreakerState: orchestratorHealth.circuitBreaker.state,
        failures: orchestratorHealth.circuitBreaker.failures,
      },
    },
    llm: {
      status: orchestratorHealth.circuitBreaker.state === 'open' ? 'down' as const :
              orchestratorHealth.circuitBreaker.state === 'half-open' ? 'degraded' as const : 'up' as const,
      details: {
        circuitState: orchestratorHealth.circuitBreaker.state,
      },
    },
  };

  // Determine overall status
  let overallStatus: HealthStatus['status'] = 'healthy';

  if (checks.database.status === 'down' || checks.llm.status === 'down') {
    overallStatus = 'unhealthy';
  } else if (checks.database.status === 'degraded' || checks.llm.status === 'degraded' || checks.orchestrator.status === 'degraded') {
    overallStatus = 'degraded';
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  };

  // Return 200 for healthy/degraded, 503 for unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Check-Duration': `${(performance.now() - startTime).toFixed(0)}ms`,
    },
  });
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = performance.now();

  try {
    // Simple connectivity check
    await db.execute(sql`SELECT 1`);

    return {
      status: 'up',
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    console.error('[Health] Database check failed:', error);

    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - start),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
