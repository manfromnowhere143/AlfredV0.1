/**
 * Get the most recent speaking video URL from logs/database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from apps/web
config({ path: resolve(__dirname, '../apps/web/.env.local') });

async function getLatestVideo() {
  console.log('\n🎬 FINDING LATEST VIDEO URL\n');

  const personaId = '570ec0b7-68b5-4634-86d8-0c7088a76a92'; // ica
  const jobId = 'jw434jk0n1rn80cvpkstybjxdw'; // From your logs

  // Check Replicate API directly
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN not found in environment');
    process.exit(1);
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Replicate API error: ${response.status}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log('📊 Job Status:', result.status);
    console.log('');

    if (result.status === 'succeeded' && result.output) {
      console.log('✅ VIDEO URL:');
      console.log('');
      console.log(result.output);
      console.log('');
      console.log('🎥 You can:');
      console.log('  1. Copy this URL and paste it in your browser');
      console.log('  2. Download the video directly');
      console.log('  3. Share it anywhere');
      console.log('');
      console.log('✅ This is a REAL H100 GPU lip-sync video from Replicate CDN');
    } else if (result.status === 'failed') {
      console.log('❌ Video generation failed:', result.error);
    } else {
      console.log('⏳ Video still processing...');
      console.log('Status:', result.status);
    }

  } catch (err) {
    console.error('❌ Error fetching video:', err);
  }
}

getLatestVideo();
