# PersonaForge Studio Pod

RunPod serverless endpoint for Pixar-grade video generation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERSONAFORGE STUDIO POD                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ /lipsync    │  │ /video      │  │ /persona                    │ │
│  │  _only      │  │  _render    │  │  _build                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
│         │                │                      │                   │
│         ▼                ▼                      ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SHARED GPU PIPELINE                        │  │
│  │  • LatentSync (lip-sync)                                     │  │
│  │  • GFPGAN (face restore)                                     │  │
│  │  • Real-ESRGAN (upscale)                                     │  │
│  │  • ffmpeg (audio/video mixing)                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              NETWORK VOLUME (Persistent)                      │  │
│  │  /workspace/models     - Model weights (no re-download)      │  │
│  │  /workspace/personas   - Base takes per persona              │  │
│  │  /workspace/cache      - HF/Torch cache                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CLOUDFLARE R2 (Output Storage)                   │  │
│  │  • Final videos                                               │  │
│  │  • Thumbnails                                                 │  │
│  │  • Audio exports                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Network Volume

```bash
# Via RunPod UI:
# 1. Go to Storage > Network Volumes
# 2. Create volume: personaforge-studio-vol
# 3. Size: 200GB (minimum)
# 4. Region: Same as your pods
```

### 2. Deploy Pod (First Time Setup)

```bash
# Build Docker image
docker build -t personaforge-studio .

# Push to Docker Hub or RunPod registry
docker tag personaforge-studio:latest YOUR_REGISTRY/personaforge-studio:latest
docker push YOUR_REGISTRY/personaforge-studio:latest
```

### 3. Create Serverless Endpoint

In RunPod Dashboard:
1. Go to **Serverless** > **New Endpoint**
2. Configure:
   - **Name**: `personaforge-studio`
   - **Docker Image**: `YOUR_REGISTRY/personaforge-studio:latest`
   - **GPU**: L40S (48GB) or A40 (48GB)
   - **Network Volume**: `personaforge-studio-vol` mounted at `/workspace`
   - **Min Workers**: 1 (for warm start)
   - **Max Workers**: 10

3. Environment Variables:
   ```
   ELEVENLABS_API_KEY=your_key
   R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
   R2_ACCESS_KEY=your_key
   R2_SECRET_KEY=your_secret
   R2_BUCKET=personaforge-studio
   ```

### 4. Download Models (One Time)

SSH into a running pod and run:

```bash
python download_models.py --all
```

This downloads models to the network volume (persists across restarts).

## API Reference

### Job Type: `lipsync_only`

Fastest path - just lip-sync a still image to audio.

**Input:**
```json
{
  "input": {
    "job_type": "lipsync_only",
    "job_id": "unique_id",
    "image": "https://... or base64",
    "audio": "https://... or base64",
    "quality": "standard"  // fast | standard | high
  }
}
```

**Output:**
```json
{
  "success": true,
  "output": {
    "video": "https://r2.dev/videos/xxx/lipsync.mp4"
  },
  "metadata": {
    "quality": "standard",
    "job_id": "unique_id"
  },
  "duration_ms": 15234
}
```

### Job Type: `video_render`

Full Pixar-grade render with audio mixing and captions.

**Input:**
```json
{
  "input": {
    "job_type": "video_render",
    "job_id": "unique_id",
    "image": "https://... or base64",
    "audio": "https://... (voice audio)",
    "music_url": "https://... (background music)",
    "ambience_url": "https://... (ambient track)",
    "sfx_tracks": [
      {"url": "https://...", "start_time": 2.5, "volume": 0.5}
    ],
    "captions": [
      {"text": "Hello world", "start": 0.0, "end": 1.5}
    ],
    "caption_style": {
      "font_size": 48,
      "color": "white",
      "stroke_color": "black",
      "stroke_width": 2,
      "position_y": 0.75
    },
    "format": {
      "width": 1080,
      "height": 1920,
      "fps": 30
    },
    "quality": "premium",
    "ducking_config": {
      "base_volume": 0.15,
      "attack_ms": 50,
      "release_ms": 300
    }
  }
}
```

**Output:**
```json
{
  "success": true,
  "output": {
    "video": "https://r2.dev/videos/xxx/final.mp4",
    "thumbnail": "https://r2.dev/videos/xxx/thumbnail.jpg"
  },
  "metadata": {
    "job_id": "unique_id",
    "quality": "premium",
    "duration": 12.5,
    "format": {"width": 1080, "height": 1920, "fps": 30}
  },
  "duration_ms": 45000
}
```

### Job Type: `persona_build`

Generate base takes for a persona (run once per persona).

**Input:**
```json
{
  "input": {
    "job_type": "persona_build",
    "persona_id": "persona_123",
    "primary_image": "https://... or base64",
    "archetype": "hero",
    "takes_to_generate": [
      {"emotion": "neutral", "angle": "front", "intensity": 0.5},
      {"emotion": "neutral", "angle": "three_quarter", "intensity": 0.5},
      {"emotion": "happy", "angle": "three_quarter", "intensity": 0.7},
      {"emotion": "intense", "angle": "closeup", "intensity": 0.9}
    ]
  }
}
```

**Output:**
```json
{
  "success": true,
  "output": {},
  "metadata": {
    "persona_id": "persona_123",
    "archetype": "hero",
    "base_takes": [
      {
        "id": "persona_123_take_0",
        "emotion": "neutral",
        "angle": "front",
        "intensity": 0.5,
        "video_url": "https://r2.dev/personas/persona_123/takes/take_0.mp4",
        "duration": 5
      }
    ]
  },
  "duration_ms": 120000
}
```

## Quality Presets

| Quality | CRF | Preset | Use Case |
|---------|-----|--------|----------|
| `draft` | 28 | ultrafast | Quick preview |
| `standard` | 23 | medium | Social media |
| `premium` | 18 | slow | High quality |
| `cinematic` | 15 | veryslow | Professional |

## Performance

| Job Type | Draft | Standard | Premium |
|----------|-------|----------|---------|
| lipsync_only | ~5s | ~10s | ~20s |
| video_render | ~15s | ~30s | ~60s |
| persona_build | ~60s | ~120s | ~180s |

*Times on L40S with warm start. Cold start adds 30-60s.*

## Pricing Estimate (RunPod)

| GPU | $/hr | Typical Job Cost |
|-----|------|------------------|
| A40 (48GB) | $0.79 | ~$0.01-0.02 |
| L40S (48GB) | $0.99 | ~$0.01-0.02 |
| H100 (80GB) | $2.49 | ~$0.02-0.04 |

Keep 1 warm worker = ~$600/month (A40) for instant response.
