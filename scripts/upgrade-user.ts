/**
 * Upgrade user to enterprise tier
 * Run with: pnpm exec tsx scripts/upgrade-user.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const rootEnv = path.resolve(__dirname, '..', '.env');
const webEnv = path.resolve(__dirname, '..', 'apps', 'web', '.env.local');
dotenv.config({ path: rootEnv });
dotenv.config({ path: webEnv });

async function upgradeUser() {
  const sql = postgres(process.env.DATABASE_URL!);

  const email = 'cogitoergosum143@gmail.com';

  // Update user tier to enterprise
  const result = await sql`
    UPDATE users
    SET tier = 'enterprise', updated_at = NOW()
    WHERE email = ${email}
    RETURNING id, email, tier
  `;

  if (result.length > 0) {
    console.log('✅ Upgraded user to ENTERPRISE:', result[0]);
  } else {
    console.log('❌ User not found with email:', email);
  }

  await sql.end();
  process.exit(0);
}

upgradeUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
