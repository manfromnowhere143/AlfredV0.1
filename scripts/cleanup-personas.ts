/**
 * Cleanup personas without images
 * Run with: pnpm exec tsx scripts/cleanup-personas.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (and apps/web/.env.local as fallback)
const rootEnv = path.resolve(__dirname, '..', '.env');
const webEnv = path.resolve(__dirname, '..', 'apps', 'web', '.env.local');
console.log('Loading env from:', rootEnv);
dotenv.config({ path: rootEnv });
dotenv.config({ path: webEnv });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env.local');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATA') || k.includes('DB')));
    process.exit(1);
  }

  console.log('🧹 Cleaning up personas without images...\n');

  const sql = postgres(databaseUrl);

  try {
    // Find all personas without primaryImageUrl
    const personasWithoutImages = await sql`
      SELECT id, name, primary_image_url, created_at
      FROM personas
      WHERE primary_image_url IS NULL OR primary_image_url = ''
    `;

    console.log(`Found ${personasWithoutImages.length} personas without images:\n`);

    for (const persona of personasWithoutImages) {
      console.log(`  - ${persona.name} (${persona.id})`);
    }

    if (personasWithoutImages.length === 0) {
      console.log('✅ No personas without images found. Database is clean!');
      await sql.end();
      return;
    }

    // Delete them
    console.log('\n🗑️  Deleting...');

    for (const persona of personasWithoutImages) {
      await sql`DELETE FROM personas WHERE id = ${persona.id}`;
      console.log(`  ✅ Deleted: ${persona.name}`);
    }

    console.log(`\n✅ Cleaned up ${personasWithoutImages.length} personas without images!`);
  } finally {
    await sql.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
