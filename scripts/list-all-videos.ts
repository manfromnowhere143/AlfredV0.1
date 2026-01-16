/**
 * List ALL video URLs from database and recent Replicate jobs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '@alfred/database';
import * as schema from '@alfred/database';

// Load env from apps/web
config({ path: resolve(__dirname, '../apps/web/.env.local') });

async function listAllVideos() {
  console.log('\n🎬 ALL VIDEOS IN DATABASE\n');
  console.log('═'.repeat(80));

  try {
    // Get all personas
    const personas = await db.select().from(schema.personas);

    console.log(`\nFound ${personas.length} personas\n`);

    let videoCount = 0;

    for (const persona of personas) {
      console.log(`\n📦 ${persona.name} (${persona.archetype})`);
      console.log(`   ID: ${persona.id}`);

      // Check for idle video URL
      const idleVideoUrl = (persona as any).idleVideoUrl;
      if (idleVideoUrl && idleVideoUrl.startsWith('http')) {
        videoCount++;
        console.log(`   🎥 IDLE VIDEO:`);
        console.log(`      ${idleVideoUrl}`);
      } else if (idleVideoUrl) {
        console.log(`   ⚠️  Idle video: base64 data (${idleVideoUrl.length} chars)`);
      } else {
        console.log(`   ❌ No idle video`);
      }

      // Check for primary image
      const imageUrl = (persona as any).primaryImageUrl;
      if (imageUrl && imageUrl.startsWith('http')) {
        console.log(`   🖼️  Image: ${imageUrl.slice(0, 60)}...`);
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log(`\n✅ Total videos with URLs: ${videoCount}\n`);

    // Now check recent Replicate jobs
    console.log('\n🔄 CHECKING RECENT REPLICATE JOBS...\n');
    console.log('═'.repeat(80));

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      console.log('⚠️  REPLICATE_API_TOKEN not found, skipping API check');
      process.exit(0);
    }

    try {
      // Get recent predictions
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      });

      if (!response.ok) {
        console.log('⚠️  Could not fetch Replicate jobs');
        process.exit(0);
      }

      const data = await response.json();
      const predictions = data.results || [];

      // Filter for succeeded SadTalker predictions (last 20)
      const videoJobs = predictions
        .filter((p: any) => p.status === 'succeeded' && p.output)
        .slice(0, 20);

      console.log(`\nFound ${videoJobs.length} recent successful video generations:\n`);

      for (const job of videoJobs) {
        const createdAt = new Date(job.created_at).toLocaleString();
        console.log(`📹 ${createdAt}`);
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Video: ${job.output}`);
        console.log('');
      }

      console.log('═'.repeat(80));
      console.log('\n💡 You can click any of these URLs to watch the videos!\n');

    } catch (err) {
      console.log('⚠️  Error checking Replicate:', err);
    }

  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }

  process.exit(0);
}

listAllVideos();
