/**
 * Drizzle Kit Configuration
 *
 * Used for migrations, schema push, and studio.
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/alfred',
  },
  verbose: true,
  strict: true,
});
