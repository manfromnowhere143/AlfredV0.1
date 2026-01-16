/**
 * Database Client
 *
 * PostgreSQL connection using Drizzle ORM.
 * Connection pooling, error handling, health checks.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  ssl?: boolean | 'require' | 'prefer';
}

export interface DatabaseClient {
  db: ReturnType<typeof drizzle>;
  sql: ReturnType<typeof postgres>;
  close: () => Promise<void>;
  healthCheck: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: Partial<DatabaseConfig> = {
  maxConnections: 50, // Increased from 10 to handle concurrent video checks
  idleTimeout: 20,
  connectTimeout: 10,
  ssl: 'prefer',
};

// ============================================================================
// CLIENT CREATION
// ============================================================================

/**
 * Creates a database client with connection pooling.
 */
export function createDatabaseClient(config: DatabaseConfig): DatabaseClient {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Create postgres.js connection
  const sql = postgres(mergedConfig.connectionString, {
    max: mergedConfig.maxConnections,
    idle_timeout: mergedConfig.idleTimeout,
    connect_timeout: mergedConfig.connectTimeout,
    ssl: mergedConfig.ssl,
    onnotice: () => {}, // Suppress notices
  });

  // Create Drizzle instance with schema
  const db = drizzle(sql, { schema });

  // Close function
  async function close(): Promise<void> {
    await sql.end();
  }

  // Health check
  async function healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await sql`SELECT 1`;
      return {
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return { db, sql, close, healthCheck };
}

// ============================================================================
// CONNECTION FROM ENVIRONMENT
// ============================================================================

/**
 * Creates a database client from environment variables.
 * 
 * Expected env vars:
 * - DATABASE_URL: Full connection string
 * OR
 * - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */
export function createDatabaseClientFromEnv(): DatabaseClient {
  const connectionString = getConnectionStringFromEnv();

  return createDatabaseClient({
    connectionString,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || String(DEFAULT_CONFIG.maxConnections || 50), 10),
    ssl: process.env.DB_SSL === 'true' ? 'require' : 'prefer',
  });
}

function getConnectionStringFromEnv(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const name = process.env.DB_NAME || 'alfred';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';

  return `postgres://${user}:${password}@${host}:${port}/${name}`;
}

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

export type Transaction = Parameters<Parameters<ReturnType<typeof drizzle>['transaction']>[0]>[0];

/**
 * Executes a function within a transaction.
 * Automatically rolls back on error.
 */
export async function withTransaction<T>(
  client: DatabaseClient,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return client.db.transaction(fn);
}

// ============================================================================
// SINGLETON (for convenience)
// ============================================================================

let defaultClient: DatabaseClient | null = null;

/**
 * Gets or creates the default database client.
 */
export function getDefaultClient(): DatabaseClient {
  if (!defaultClient) {
    defaultClient = createDatabaseClientFromEnv();
  }
  return defaultClient;
}

/**
 * Closes the default client.
 */
export async function closeDefaultClient(): Promise<void> {
  if (defaultClient) {
    await defaultClient.close();
    defaultClient = null;
  }
}

// ============================================================================
// MIGRATIONS HELPER
// ============================================================================

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  error?: string;
}

/**
 * Note: Migrations are handled by drizzle-kit CLI.
 * This is just a placeholder for programmatic migrations if needed.
 */
export async function checkMigrationStatus(client: DatabaseClient): Promise<{
  pending: boolean;
  message: string;
}> {
  try {
    // Check if schema exists by querying a known table
    await client.sql`SELECT 1 FROM users LIMIT 1`;
    return { pending: false, message: 'Schema is up to date' };
  } catch (error) {
    return { pending: true, message: 'Schema needs migration' };
  }
}
