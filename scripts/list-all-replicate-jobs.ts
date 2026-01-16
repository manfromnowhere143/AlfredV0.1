/**
 * List ALL Replicate jobs (including processing, failed, etc)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from apps/web
config({ path: resolve(__dirname, '../apps/web/.env.local') });

async function listAllJobs() {
  console.log('\n🎬 ALL REPLICATE JOBS (Last 50)\n');
  console.log('═'.repeat(80));

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN not found');
    process.exit(1);
  }

  try {
    // Get recent predictions
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Replicate API error: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    const predictions = data.results || [];

    console.log(`\nTotal jobs: ${predictions.length}\n`);

    // Group by status
    const byStatus: Record<string, any[]> = {};

    for (const job of predictions) {
      const status = job.status;
      if (!byStatus[status]) {
        byStatus[status] = [];
      }
      byStatus[status].push(job);
    }

    // Show succeeded first
    if (byStatus.succeeded && byStatus.succeeded.length > 0) {
      console.log(`\n✅ SUCCEEDED (${byStatus.succeeded.length}):\n`);

      for (const job of byStatus.succeeded) {
        const createdAt = new Date(job.created_at).toLocaleString();
        const hasOutput = job.output && typeof job.output === 'string';

        console.log(`📹 ${createdAt}`);
        console.log(`   ID: ${job.id}`);

        if (hasOutput) {
          if (job.output.includes('replicate.delivery')) {
            console.log(`   ✅ VIDEO: ${job.output}`);
          } else if (job.output.startsWith('http')) {
            console.log(`   🖼️  IMAGE: ${job.output.slice(0, 80)}...`);
          } else {
            console.log(`   📦 Output: ${typeof job.output} (${String(job.output).length} chars)`);
          }
        } else {
          console.log(`   ⚠️  No output`);
        }

        console.log('');
      }
    }

    // Show processing
    if (byStatus.processing && byStatus.processing.length > 0) {
      console.log(`\n⏳ PROCESSING (${byStatus.processing.length}):\n`);

      for (const job of byStatus.processing) {
        const createdAt = new Date(job.created_at).toLocaleString();
        const elapsed = Date.now() - new Date(job.created_at).getTime();
        const seconds = Math.floor(elapsed / 1000);

        console.log(`🔄 ${createdAt} (${seconds}s ago)`);
        console.log(`   ID: ${job.id}`);
        console.log('');
      }
    }

    // Show starting
    if (byStatus.starting && byStatus.starting.length > 0) {
      console.log(`\n🚀 STARTING (${byStatus.starting.length}):\n`);

      for (const job of byStatus.starting) {
        const createdAt = new Date(job.created_at).toLocaleString();
        console.log(`   ${createdAt} - ${job.id}`);
      }
      console.log('');
    }

    // Show failed
    if (byStatus.failed && byStatus.failed.length > 0) {
      console.log(`\n❌ FAILED (${byStatus.failed.length}):\n`);

      for (const job of byStatus.failed) {
        const createdAt = new Date(job.created_at).toLocaleString();
        console.log(`💥 ${createdAt}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   Error: ${job.error || 'Unknown error'}`);
        console.log('');
      }
    }

    // Show canceled
    if (byStatus.canceled && byStatus.canceled.length > 0) {
      console.log(`\n🚫 CANCELED (${byStatus.canceled.length}):\n`);

      for (const job of byStatus.canceled) {
        const createdAt = new Date(job.created_at).toLocaleString();
        console.log(`   ${createdAt} - ${job.id}`);
      }
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('\n📊 SUMMARY:\n');

    for (const [status, jobs] of Object.entries(byStatus)) {
      console.log(`   ${status}: ${jobs.length}`);
    }

    console.log('\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

listAllJobs();
