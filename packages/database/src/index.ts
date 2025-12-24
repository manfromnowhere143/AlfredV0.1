/**
 * @alfred/database
 *
 * PostgreSQL database layer.
 * Schema, migrations, queries.
 *
 * Uses Drizzle ORM for type-safe SQL.
 * Uses pgvector for embedding similarity search.
 */

export const VERSION = '0.1.0';

export * from './schema';
export * from './client';
export * from './queries';
export * from './types';
export { sql } from 'drizzle-orm';
