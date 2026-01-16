/**
 * Quick script to create the persona_wizard_sessions table
 */
import { db, sql } from './index';

async function createTable() {
  console.log('Creating persona_wizard_sessions table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS persona_wizard_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      current_step VARCHAR(50) NOT NULL DEFAULT 'spark',
      steps_status JSONB,
      spark_data JSONB,
      visual_data JSONB,
      voice_data JSONB,
      mind_data JSONB,
      motion_data JSONB,
      total_cost_usd REAL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `);

  console.log('Creating indexes...');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS persona_wizard_sessions_user_id_idx ON persona_wizard_sessions(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS persona_wizard_sessions_persona_id_idx ON persona_wizard_sessions(persona_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS persona_wizard_sessions_current_step_idx ON persona_wizard_sessions(current_step)`);

  console.log('✓ persona_wizard_sessions table created successfully!');
  process.exit(0);
}

createTable().catch((err) => {
  console.error('Failed to create table:', err);
  process.exit(1);
});
