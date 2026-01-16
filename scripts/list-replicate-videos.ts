/**
 * List ALL recent videos from Replicate (no database needed)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from apps/web
config({ path: resolve(__dirname, '../apps/web/.env.local') });

async function listReplicateVideos() {
  console.log('\n🎬 ALL RECENT VIDEOS FROM REPLICATE\n');
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

    // Filter for succeeded video predictions
    const videoJobs = predictions.filter((p: any) =>
      p.status === 'succeeded' &&
      p.output &&
      typeof p.output === 'string' &&
      p.output.includes('replicate.delivery')
    );

    console.log(`\n✅ Found ${videoJobs.length} successful video generations\n`);

    if (videoJobs.length === 0) {
      console.log('No videos found. Try generating some first!\n');
      process.exit(0);
    }

    // Group by date
    const today = new Date().toDateString();
    const todayVideos = [];
    const olderVideos = [];

    for (const job of videoJobs) {
      const createdDate = new Date(job.created_at);
      if (createdDate.toDateString() === today) {
        todayVideos.push(job);
      } else {
        olderVideos.push(job);
      }
    }

    // Show today's videos
    if (todayVideos.length > 0) {
      console.log(`📅 TODAY (${todayVideos.length} videos):\n`);

      for (const job of todayVideos) {
        const createdAt = new Date(job.created_at);
        const time = createdAt.toLocaleTimeString();

        console.log(`🎥 ${time}`);
        console.log(`   ${job.output}`);
        console.log('');
      }

      console.log('─'.repeat(80) + '\n');
    }

    // Show older videos
    if (olderVideos.length > 0) {
      console.log(`📅 OLDER (${olderVideos.length} videos):\n`);

      for (const job of olderVideos) {
        const createdAt = new Date(job.created_at);
        const dateTime = createdAt.toLocaleString();

        console.log(`🎥 ${dateTime}`);
        console.log(`   ${job.output}`);
        console.log('');
      }
    }

    console.log('═'.repeat(80));
    console.log('\n💡 CLICK ANY URL TO WATCH!\n');
    console.log('These are REAL H100 GPU lip-sync videos hosted on Replicate CDN.\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

listReplicateVideos();
