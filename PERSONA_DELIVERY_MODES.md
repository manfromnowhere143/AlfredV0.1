# Persona Delivery Modes - Complete System

## Overview

Your PersonaForge system now has **TWO DISTINCT DELIVERY MODES** that are properly separated:

---

## 🗣️ MODE 1: LIVE CHAT (Rudy/Woody Style)

### What It Is
- **Fast, realtime conversation**
- Audio-only playback
- Static image with visual feedback
- **< 3 seconds latency**

### Technical Pipeline
```
User Message
  ↓
LLM Response (Haiku for speed)
  ↓
ElevenLabs Voice (turbo_v2)
  ↓
Audio plays immediately
```

### Endpoint
```
POST /api/personas/[id]/live-chat
Body: { message: "Hello" }
Returns: { audioUrl, text, latencyMs }
```

### When To Use
- Real conversations
- Quick back-and-forth dialog
- Testing persona personality
- Production chat experiences

### UI Behavior
- Shows persona image
- "Speaking" indicator when audio plays
- Image brightens slightly during speech
- Fast, responsive feel

---

## 🎬 MODE 2: MAKE VIDEO (TikTok/Medusa Style)

### What It Is
- **Cinematic, lip-synced video**
- Full RunPod rendering
- High-quality output
- **60-90 seconds latency**

### Technical Pipeline
```
User Message
  ↓
LLM Response
  ↓
ElevenLabs Voice
  ↓
RunPod Lip-Sync Video (with POLLING)
  ↓
MP4 video plays
```

### Endpoint
```
POST /api/personas/[id]/make-video
Body: { message: "Hello", quality: "standard" }
Returns: { videoUrl, audioUrl, text, timing }
```

### RunPod Integration
- Uses `RunPodClient` with automatic job polling
- Calls `/run` to submit job
- Polls `/status/{jobId}` every 2 seconds
- Returns when `status === "COMPLETED"`
- 5-minute timeout with proper error handling

### When To Use
- Creating shareable content
- Cinematic presentations
- Social media posts
- High-quality demos

### UI Behavior
- Shows "Generating video... (Xs)" progress
- Plays full-screen video when complete
- Falls back to audio if video fails

---

## 🎯 UI Component: PersonaViewer

### Location
`apps/web/src/components/PersonaViewer.tsx`

### Features
- **Mode switcher** at top:
  - 💬 Chat (Fast)
  - 🎬 Video (Cinematic)
- **Full-screen display**
- **Status indicators**:
  - Thinking (purple)
  - Generating video (orange)
  - Speaking (green)
- **Latency tracking**
- **Error handling with fallbacks**

### Usage
```tsx
<PersonaViewer
  personaId="..."
  personaName="..."
  personaImageUrl="..."
  mode="chat"  // or "video"
  onClose={() => setView("home")}
/>
```

---

## 🔧 Technical Details

### RunPod Polling (Fixed)
Previously: Called `/runsync` and got `IN_QUEUE` status, but never polled for completion.

Now: Uses `RunPodClient.lipSync()` which:
1. Submits job
2. Polls status every 2 seconds
3. Returns when COMPLETED or FAILED
4. 5-minute timeout
5. Full error handling

### File Structure
```
apps/web/src/
├── app/api/personas/[id]/
│   ├── make-video/route.ts     # Cinematic mode
│   ├── live-chat/route.ts      # Fast mode
│   └── talk/route.ts           # (DEPRECATED - remove this)
├── components/
│   └── PersonaViewer.tsx       # Dual-mode UI
└── lib/video-studio/
    └── RunPodClient.ts         # RunPod integration with polling
```

### Environment Variables Required
```bash
RUNPOD_API_KEY=...
RUNPOD_VIDEO_ENDPOINT_ID=...
ELEVENLABS_API_KEY=...
ANTHROPIC_API_KEY=...
```

---

## 📊 Performance Metrics

### Live Chat Mode
- LLM: ~1-2 seconds (using Haiku)
- Voice: ~1-2 seconds
- **Total: < 3 seconds**

### Make Video Mode
- LLM: ~1-2 seconds
- Voice: ~1-2 seconds
- RunPod Queue: ~10-30 seconds (varies)
- RunPod Render: ~30-60 seconds
- **Total: 60-90 seconds**

---

## 🚀 How To Test

1. **Start the server** (already running):
   ```bash
   pnpm dev
   ```

2. **Open**: http://localhost:3005/personas

3. **Click on a persona**

4. **Try Chat Mode** (default):
   - Type: "Hello!"
   - Should respond in < 3 seconds
   - Audio plays with static image

5. **Switch to Video Mode**:
   - Click "🎬 Video (Cinematic)"
   - Type: "Tell me about yourself"
   - Wait ~60-90 seconds
   - Full lip-synced video plays

---

## 🐛 Debugging

### Check Logs
Both endpoints log extensively:
```
[LiveChat] ═════════════════════════════════════════════════════
[LiveChat] Starting realtime chat for: {personaId}
[LiveChat] Getting LLM response...
[LiveChat] LLM done in 1234ms: "Hello there!"
[LiveChat] Generating voice...
[LiveChat] Voice done in 567ms
[LiveChat] ✅ Complete in 1801ms
```

```
[MakeVideo] ═════════════════════════════════════════════════════
[MakeVideo] Starting cinematic video generation for: {personaId}
[MakeVideo] STEP 1/3: Getting LLM response...
[MakeVideo] STEP 2/3: Generating voice with ElevenLabs...
[MakeVideo] STEP 3/3: Generating lip-synced video with RunPod...
[RunPod] Job submitted: sync-xxxxx-xxxxx
[RunPod] Polling status... (attempt 1)
[RunPod] Status: IN_PROGRESS
[RunPod] Polling status... (attempt 10)
[RunPod] Status: COMPLETED
[MakeVideo] ✅ SUCCESS!
[MakeVideo] Video URL: https://...
```

### Common Issues

**"Video URL: NO"** (FIXED)
- Was: Not polling RunPod status
- Now: Uses RunPodClient with proper polling

**Audio doesn't play**
- Check browser autoplay policy
- Check ElevenLabs API key
- Check console for errors

**Video generation times out**
- Default timeout: 5 minutes
- Check RunPod worker availability: `GET https://api.runpod.ai/v2/{endpointId}/health`

---

## 🎯 What's Next

### For True Realtime (Optional)
If you want instant, streaming responses like Rudy:
1. Add WebSocket support
2. Stream audio chunks as they arrive from ElevenLabs
3. Use ReadableStream for progressive audio playback
4. Add viseme data for mouth movement

### For Better Video Quality
1. Tune RunPod quality settings
2. Add background music/ambience
3. Add captions
4. Use `VideoRenderInput` for full features

---

## ✅ Summary

You now have:
- ✅ **Live Chat**: Fast, audio-only conversation
- ✅ **Make Video**: Cinematic, lip-synced video
- ✅ **RunPod Polling**: Actually waits for video completion
- ✅ **Dual-Mode UI**: Clean switcher between modes
- ✅ **Proper Separation**: No more confusion between systems

The old `/talk` endpoint is deprecated. Remove it when ready.
