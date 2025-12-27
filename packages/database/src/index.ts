export * from './schema';
export * from './client';
export { eq, ne, gt, gte, lt, lte, and, or, desc, asc, sql } from 'drizzle-orm';

// Export db instance for direct use
import { getDefaultClient } from './client';
export const db = getDefaultClient().db;
