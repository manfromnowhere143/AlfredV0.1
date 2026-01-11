# PersonaForge Runbook

**Purpose:** Complete guide to running PersonaForge locally and deploying to production.

---

## 1. Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (or Supabase)

### Environment Setup

Create `apps/web/.env.local`:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (NextAuth)
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3005

# ElevenLabs (Required for voice)
ELEVENLABS_API_KEY=sk_...

# Replicate (For image/3D generation)
REPLICATE_API_TOKEN=r8_...

# RunPod (Optional - for video studio)
RUNPOD_API_KEY=...
RUNPOD_ENDPOINT_ID=...
RUNPOD_RENDER_ENDPOINT=...

# Cloudflare R2 (Optional - for artifact storage)
R2_ENDPOINT=https://...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=personaforge-studio
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Push database schema
cd packages/database
pnpm drizzle-kit push

# Run development server
cd ../..
pnpm dev
```

Open: http://localhost:3005

---

## 2. Testing Living Avatars

### Test Avatar Display

1. Navigate to http://localhost:3005/personas
2. Click on an existing persona (or create one)
3. You should see the avatar with:
   - Name at top
   - Glowing ring around avatar
   - State indicator at bottom (idle/listening/thinking/speaking)
   - Debug overlay (in development mode)

### Test Voice

1. Click on the avatar area to enable audio (iOS/Safari requirement)
2. Send a message in the chat
3. Watch for:
   - State changes: idle → thinking → speaking → idle
   - Audio playing
   - Avatar animation (scaling, rotation) synced to audio

### Debug Overlay Values

When debug mode is enabled, you'll see:
- **FPS**: Animation frame rate (should be 60)
- **State**: Current avatar state
- **Emotion**: Detected emotion from response
- **Amplitude**: Audio volume (0-1)
- **Audio**: Playing or stopped
- **Gesture**: User interaction received
- **WS**: WebSocket status (placeholder)

---

## 3. API Endpoints

### Realtime Session API

```bash
# Create a session
curl -X POST http://localhost:3005/api/session \
  -H "Content-Type: application/json" \
  -d '{"personaId": "your-persona-id"}'

# Response:
{
  "sessionId": "uuid",
  "wsUrl": "ws://localhost:3005/api/session/uuid/events",
  "personaConfig": { ... }
}

# Send a message
curl -X POST http://localhost:3005/api/session/{sessionId}/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Response:
{
  "response": "Hello! How are you?",
  "audio": "data:audio/mpeg;base64,...",
  "emotion": "happy",
  "duration": 2500,
  "emotionCurve": [...]
}
```

### Video Studio API

```bash
# Create a video job
curl -X POST http://localhost:3005/api/personas/{personaId}/video-studio \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Welcome to PersonaForge!",
    "style": "cinematic",
    "duration": 30
  }'

# Check job status
curl http://localhost:3005/api/personas/{personaId}/video-studio/{jobId}

# Get result
curl http://localhost:3005/api/personas/{personaId}/video-studio/{jobId}?result=true
```

---

## 4. Deploying to RunPod

### Build the Studio Pod

```bash
cd packages/runpod-studio

# Build Docker image
docker build -t personaforge-studio .

# Push to Docker Hub (or your registry)
docker tag personaforge-studio:latest your-registry/personaforge-studio:latest
docker push your-registry/personaforge-studio:latest
```

### Deploy to RunPod

1. Go to https://runpod.io/console/serverless
2. Create new endpoint
3. Configure:
   - **Docker Image**: `your-registry/personaforge-studio:latest`
   - **GPU**: L40S (48GB) recommended
   - **Volume**: Enable network volume (200GB+)
   - **Environment Variables**:
     ```
     ELEVENLABS_API_KEY=sk_...
     R2_ENDPOINT=https://...
     R2_ACCESS_KEY=...
     R2_SECRET_KEY=...
     R2_BUCKET=personaforge-studio
     ```

4. Note your endpoint ID for `RUNPOD_ENDPOINT_ID`

### Test RunPod Endpoint

```bash
curl -X POST https://api.runpod.ai/v2/{endpoint_id}/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "job_type": "lipsync_only",
      "image_url": "https://example.com/face.jpg",
      "audio_url": "https://example.com/speech.mp3"
    }
  }'
```

---

## 5. Troubleshooting

### "Nothing shows" (Avatar not visible)

**Symptoms:**
- Empty space where avatar should be
- No animation

**Solutions:**
1. Check browser console for errors
2. Ensure image URL is valid (check network tab)
3. Look for WebGL context errors
4. Component should now use CSS fallback (AvatarStage)

### "Audio won't play on iOS/Safari"

**Symptoms:**
- Audio generated but not playing
- Console shows "play() failed"

**Solutions:**
1. User must tap/click before audio can play
2. Check for "Tap to enable audio" prompt
3. Ensure `gestureReceived` is true in debug overlay
4. Check audio element's `muted` property

### "WebSocket disconnect" (Placeholder)

**Current Status:**
- WebSocket endpoint is not yet implemented
- Using polling-based approach via `/api/session/[id]/message`

**Future:**
- Implement custom WebSocket server
- Use Socket.io or ws library
- Deploy separate WebSocket service

### "CORS errors for audio"

**Symptoms:**
- Audio URL blocked by CORS
- "No 'Access-Control-Allow-Origin'" error

**Solutions:**
1. For local: Audio is base64-encoded (no CORS issue)
2. For external URLs: Add CORS headers on audio server
3. Or proxy through your backend

### "LLM not responding"

**Check:**
1. `ANTHROPIC_API_KEY` is set
2. API key has credits
3. Check rate limits
4. Look for error in server logs

### "TTS not generating"

**Check:**
1. `ELEVENLABS_API_KEY` is set
2. API key is valid
3. Voice ID exists
4. Check ElevenLabs dashboard for usage/errors

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌───────────────┐    ┌────────────────┐       │
│  │ AvatarStage  │◄───│ useAvatarStore│◄───│ useStreamingTTS│       │
│  │ (CSS/Canvas) │    │   (Zustand)   │    │   (Audio)      │       │
│  └──────────────┘    └───────────────┘    └────────────────┘       │
│         ▲                    ▲                    ▲                 │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              │                                       │
│                    ┌─────────┴─────────┐                            │
│                    │   PersonaChat     │                            │
│                    └─────────┬─────────┘                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTP/Polling
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐     │
│  │ /api/session    │───►│ VoiceDirector│───►│ ElevenLabs TTS │     │
│  │ /[id]/message   │    └──────────────┘    └────────────────┘     │
│  └─────────────────┘           │                                    │
│          │                     ▼                                    │
│          │            ┌──────────────┐                              │
│          └───────────►│ Claude LLM   │                              │
│                       └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RUNPOD (GPU)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐       │
│  │ Image Generate│  │  Lip-Sync    │  │   Video Render     │       │
│  │ (FLUX/SD)     │  │ (LatentSync) │  │   (ffmpeg)         │       │
│  └───────────────┘  └──────────────┘  └────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Next Steps

### Tier 2 Features (Coming Soon)

1. **True WebSocket Support**
   - Real-time bidirectional communication
   - Sub-100ms event delivery

2. **Viseme Timeline Lip-Sync**
   - Phoneme-accurate mouth shapes
   - Pre-computed timing from TTS

3. **VRM Avatar Support**
   - Industry-standard humanoid format
   - Full facial blendshapes

4. **Multi-modal Input**
   - Image understanding
   - Document/URL context

### Tier 3 Features (Roadmap)

1. **Live Portrait Video**
   - Real-time talking head
   - Emotion-driven animation

2. **Memory & Relationships**
   - Persistent conversation memory
   - Relationship arc progression

3. **Scene/Environment**
   - Dynamic backgrounds
   - Mood-based ambiance

---

**Runbook Complete**
