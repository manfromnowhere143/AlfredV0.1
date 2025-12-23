/**
 * Environment Configuration
 *
 * Type-safe environment variable access.
 * Validates required variables at startup.
 */

import type { ModelId } from './types';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

export interface LLMEnv {
  apiKey: string;
  model: ModelId;
  maxTokens: number;
}

export interface DatabaseEnv {
  url: string;
  maxConnections: number;
  ssl: boolean;
}

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// VALIDATORS
// ============================================================================

export function getLLMEnv(): LLMEnv {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. ' +
      'Copy .env.example to .env and add your API key.'
    );
  }

  return {
    apiKey,
    model: (process.env.ANTHROPIC_MODEL as ModelId) || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10),
  };
}

export function getDatabaseEnv(): DatabaseEnv {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is required. ' +
      'Copy .env.example to .env and configure your database.'
    );
  }

  return {
    url,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    ssl: process.env.DB_SSL === 'true',
  };
}

export function getAppEnv(): AppEnv {
  return {
    nodeEnv: (process.env.NODE_ENV as AppEnv['nodeEnv']) || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: (process.env.LOG_LEVEL as AppEnv['logLevel']) || 'info',
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required variables
  if (!process.env.ANTHROPIC_API_KEY) {
    errors.push('Missing ANTHROPIC_API_KEY');
  }

  if (!process.env.DATABASE_URL) {
    errors.push('Missing DATABASE_URL');
  }

  // Validate API key format
  if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    errors.push('ANTHROPIC_API_KEY should start with sk-ant-');
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgres')) {
    errors.push('DATABASE_URL should be a PostgreSQL connection string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// STARTUP CHECK
// ============================================================================

export function checkEnvOrExit(): void {
  const { valid, errors } = validateEnv();

  if (!valid) {
    console.error('Environment validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\nCopy .env.example to .env and fill in required values.');
    process.exit(1);
  }
}
