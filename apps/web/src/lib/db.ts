/**
 * Database client for Alfred web app
 */

import { createDatabaseClient, type DatabaseClient } from '@alfred/database';

let dbClient: DatabaseClient | null = null;

export async function getDb(): Promise<DatabaseClient> {
  if (!dbClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    dbClient = await createDatabaseClient({ connectionString });
  }
  return dbClient;
}

export async function closeDb(): Promise<void> {
  if (dbClient) {
    await dbClient.close();
    dbClient = null;
  }
}
