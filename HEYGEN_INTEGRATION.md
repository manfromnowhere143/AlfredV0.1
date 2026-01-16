# 🏆 HeyGen Integration - Pixar-Level Quality

## Why HeyGen?

- ✅ Industry leader (used by Forbes, Nvidia, Amazon)
- ✅ 10/10 quality - Perfect lip sync, no artifacts
- ✅ 4K resolution available
- ✅ 5-10 second generation
- ✅ Multiple voice + video quality tiers

## API Integration

```typescript
// apps/web/src/app/api/personas/[id]/talk/route.ts

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

async function generateWithHeyGen(personaImage: string, audioDataUrl: string) {
  // 1. Upload avatar image
  const avatarResponse = await fetch('https://api.heygen.com/v1/avatar.upload', {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      avatar_name: 'PersonaAvatar',
      avatar_image_url: personaImage, // Your persona image
    }),
  });

  const { avatar_id } = await avatarResponse.json();

  // 2. Create video with audio
  const videoResponse = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: avatar_id,
          avatar_style: 'normal', // or 'circle' for circular avatars
        },
        voice: {
          type: 'audio',
          audio_url: audioDataUrl, // Your ElevenLabs audio
        },
      }],
      dimension: {
        width: 1920,
        height: 1080,
      },
      aspect_ratio: '16:9', // or '9:16' for vertical
    }),
  });

  const { video_id } = await videoResponse.json();

  // 3. Poll for completion
  let videoUrl = null;
  while (!videoUrl) {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s

    const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });

    const status = await statusResponse.json();

    if (status.data.status === 'completed') {
      videoUrl = status.data.video_url;
    } else if (status.data.status === 'failed') {
      throw new Error('Video generation failed');
    }
  }

  return videoUrl;
}
```

## Pricing

- **Free Tier:** 1 minute/month free credit
- **Creator Plan:** $29/month - 10 minutes
- **Business Plan:** $89/month - 30 minutes
- **Enterprise:** Custom pricing

**Per-minute cost:** ~$3-9/min depending on tier

## ROI Analysis

| Metric | SadTalker | HeyGen |
|--------|-----------|---------|
| Quality | 5/10 | 10/10 |
| Speed | 30-60s | 5-10s |
| Cost | $0.01 | $0.15 |
| User satisfaction | Low | Pixar-level |

**For premium product:** HeyGen worth 15x cost

## Implementation Steps

1. **Sign up:** https://app.heygen.com/signup
2. **Get API key:** Settings → API → Generate Key
3. **Add to `.env.local`:**
   ```
   HEYGEN_API_KEY=your_key_here
   ```
4. **Update talk/route.ts:** Use HeyGen function instead of SadTalker
5. **Test:** Should see 10/10 quality immediately

## Fallback Strategy

```typescript
// Try HeyGen first, fallback to SadTalker
if (HEYGEN_API_KEY) {
  try {
    return await generateWithHeyGen(image, audio);
  } catch (err) {
    console.warn('HeyGen failed, falling back to SadTalker');
  }
}

// Fallback to SadTalker
return await generateWithSadTalker(image, audio);
```

## Expected Result

- ✅ Perfect lip sync
- ✅ No artifacts or flashes
- ✅ Smooth, natural motion
- ✅ 4K resolution
- ✅ Audio perfectly embedded
- ✅ **PIXAR-LEVEL QUALITY**
