# PersonaForge Gap Analysis Report

**Generated:** 2026-01-10
**Purpose:** Identify what exists, what's missing, and what needs implementation for truly LIVING personas.

---

## 1. Repository Structure Overview

### Relevant File Tree

```
apps/web/
├── src/
│   ├── app/api/personas/
│   │   ├── [id]/
│   │   │   ├── speak/route.ts        # ElevenLabs TTS endpoint
│   │   │   ├── chat/route.ts         # LLM chat endpoint
│   │   │   ├── wizard/route.ts       # Persona creation wizard
│   │   │   ├── generate-3d/route.ts  # 3D model generation (TRELLIS)
│   │   │   ├── animate/route.ts      # SadTalker lip-sync video
│   │   │   ├── transcribe/route.ts   # Speech-to-text
│   │   │   └── video-studio/         # Video job endpoints
│   │   │       ├── route.ts          # Create/list jobs
│   │   │       └── [jobId]/route.ts  # Job status/result
│   │   └── route.ts                  # List/create personas
│   │
│   ├── components/
│   │   ├── LiveAvatar3D.tsx          # Three.js avatar renderer (EXISTS but unstable)
│   │   ├── LivePersona.tsx           # Persona wrapper component
│   │   ├── PersonaChat.tsx           # Chat interface with avatar
│   │   └── CreationJourney.tsx       # Creation flow UI
│   │
│   └── lib/
│       ├── avatar/
│       │   ├── store.ts              # Zustand state machine (EXISTS)
│       │   ├── useLipSync.ts         # Audio amplitude lip-sync (EXISTS)
│       │   ├── useStreamingTTS.ts    # ElevenLabs audio playback (EXISTS)
│       │   ├── useGenerate3D.ts      # 3D generation hook
│       │   └── llmDirectives.ts      # LLM emotion parsing
│       │
│       └── video-studio/
│           ├── VideoStudioService.ts   # Full pipeline orchestrator
│           ├── ElevenLabsService.ts    # TTS service
│           ├── LipSyncService.ts       # Lip-sync generation
│           ├── RenderService.ts        # ffmpeg composition
│           ├── RunPodClient.ts         # RunPod API client
│           ├── DirectorService.ts      # Shot planning with LLM
│           ├── MusicDirector.ts        # Audio mixing
│           └── PipelineOrchestrator.ts # Job pipeline

packages/
├── persona/
│   ├── src/
│   │   ├── voice/
│   │   │   ├── elevenlabs.ts         # ElevenLabs client
│   │   │   ├── presets.ts            # Voice presets per archetype
│   │   │   ├── ssml.ts               # SSML generation
│   │   │   └── index.ts
│   │   ├── visual/
│   │   │   ├── live-portrait.ts      # LivePortrait integration
│   │   │   ├── animate-diff.ts       # AnimateDiff integration
│   │   │   └── presets.ts            # Visual presets
│   │   ├── brain/
│   │   │   └── system-prompt.ts      # Persona system prompts
│   │   ├── genome/
│   │   │   └── identity-lock.ts      # Face consistency (FLUX PuLID)
│   │   └── realtime/
│   │       └── index.ts              # STUB - needs implementation
│   │
└── runpod-studio/
    ├── handler.py                    # RunPod serverless handler
    ├── Dockerfile                    # Container definition
    ├── download_models.py            # Model download script
    └── requirements.txt              # Python dependencies
```

---

## 2. Keyword Search Results

| Keyword | Found | Location |
|---------|-------|----------|
| `VRM` | NO | - |
| `three` | YES | LiveAvatar3D.tsx, uses @react-three/fiber |
| `canvas` | YES | LiveAvatar3D.tsx (via R3F Canvas) |
| `webgl` | YES | LiveAvatar3D.tsx (WebGL context handling) |
| `Live2D` | NO | - |
| `blendshape` | YES | LiveAvatar3D.tsx (morphTargetDictionary) |
| `viseme` | YES | useLipSync.ts, store.ts (amplitude-based) |
| `phoneme` | YES | useLipSync.ts (frequency-based estimation) |
| `websocket` | NO | **MISSING** - No real-time session |
| `socket` | NO | - |
| `webrtc` | NO | - |
| `stream` | YES | useStreamingTTS.ts (audio streaming) |
| `audioContext` | YES | useLipSync.ts, useStreamingTTS.ts |
| `ElevenLabs` | YES | speak/route.ts, ElevenLabsService.ts |
| `runpod` | YES | wizard/route.ts, RunPodClient.ts |
| `job queue` | NO | **MISSING** - No persistent queue |
| `bullmq` | NO | - |
| `redis` | NO | - |
| `worker` | NO | - |
| `ffmpeg` | YES | RenderService.ts (command builder) |

---

## 3. What EXISTS (Working)

### 3.1 Backend

- **ElevenLabs TTS** (`/api/personas/[id]/speak`)
  - Generates audio from text
  - Returns base64 audio
  - Emotion-aware voice settings
  - 12 archetype-based voice mappings

- **LLM Chat** (`/api/personas/[id]/chat`)
  - Claude Sonnet 4 integration
  - Streaming responses
  - Emotion detection

- **3D Model Generation** (`/api/personas/[id]/generate-3d`)
  - TRELLIS model via Replicate
  - Generates GLB files
  - Saves to database

- **Video Studio Pipeline** (`/api/personas/[id]/video-studio`)
  - Job creation endpoint
  - Status polling
  - LLM-based shot planning
  - ffmpeg command generation (not yet executed)

- **RunPod Integration**
  - API client exists
  - Handler for serverless inference
  - Image generation endpoint ready

### 3.2 Frontend

- **Avatar Store** (Zustand)
  - States: idle, listening, thinking, speaking
  - Emotions: happy, sad, curious, etc.
  - Audio amplitude tracking
  - Viseme weight tracking

- **Lip Sync Hook** (`useLipSync.ts`)
  - Audio frequency analysis
  - Amplitude-based viseme estimation
  - Real-time analysis loop

- **Streaming TTS Hook** (`useStreamingTTS.ts`)
  - Audio element creation
  - Lip sync connection
  - State management

- **LiveAvatar3D Component**
  - Three.js canvas renderer
  - GLB model loading
  - CSS fallback (stable)
  - State-based animations

---

## 4. What is MISSING (Gaps)

### 4.1 Critical Gaps (Blocking "Alive" Persona)

| Gap | Description | Priority |
|-----|-------------|----------|
| **WebSocket Session** | No real-time event streaming. Current implementation uses polling/REST. | P0 |
| **Realtime Gateway API** | No session concept. Each request is stateless. | P0 |
| **Audio Playback Reliability** | Audio plays but lip-sync connection is fragile. WebGL crashes. | P0 |
| **VRM/Ready Avatar Format** | Using TRELLIS GLB which lacks morph targets for proper lip-sync. | P1 |
| **iOS Autoplay Compliance** | No user gesture gating for audio start. | P1 |
| **Debug Overlay** | No visibility into ws status, fps, audio playing, avatar loaded. | P2 |

### 4.2 Realtime Mode Gaps

| Component | Status | Notes |
|-----------|--------|-------|
| Session start endpoint | MISSING | Need `/api/session/start` |
| WebSocket endpoint | MISSING | Need `/api/session/:id/events` |
| Event types (speech.audio, speech.visemes, state.emotion) | MISSING | Need event protocol |
| VoiceDirector | PARTIAL | ElevenLabs works but no emotion curve output |
| Presence animations (blink, gaze, breathing) | PARTIAL | Breathing exists, blink needs work |
| CORS headers for audio | PARTIAL | Works locally, may fail in prod |

### 4.3 Offline Mode Gaps

| Component | Status | Notes |
|-----------|--------|-------|
| Video job creation | EXISTS | `/api/personas/[id]/video-studio` |
| Job status polling | EXISTS | `/api/personas/[id]/video-studio/[jobId]` |
| Shot plan generation | EXISTS | DirectorService.ts |
| Audio narration | EXISTS | ElevenLabsService.ts |
| Lip-sync video | PARTIAL | SadTalker via Replicate, not RunPod |
| Caption overlay | STUB | Structure exists, not implemented |
| ffmpeg execution | STUB | Commands built, not executed |
| Artifact storage | PARTIAL | URLs returned but no R2 upload |

---

## 5. Root Cause of "Persona Not Showing"

After audit, the issue is identified:

1. **WebGL Context Loss**
   - LiveAvatar3D causes WebGL context crashes
   - Multiple Canvas instances created/destroyed rapidly
   - CSS fallback now default but still not reliably animated

2. **Audio Not Playing**
   - Audio element created but `play()` may fail without user gesture
   - No error handling for autoplay restrictions
   - Lip sync connection only happens after audio loads

3. **State Not Updating**
   - Avatar store state changes but component not re-rendering
   - No debug visibility into actual state values
   - audioAmplitude may be 0 even when audio plays

4. **No Continuous Presence**
   - Animation only happens in response to chat
   - No idle animation loop running when not speaking
   - Breathing/blinking too subtle or not connected

---

## 6. Implementation Plan

### Phase 1: Stabilize Realtime Mode (This Session)

1. **Create AvatarStage Component** (New)
   - Robust CSS+Canvas hybrid
   - Always-on animation loop
   - Visible state indicator
   - Debug overlay

2. **Create Realtime Session API**
   - POST `/api/session/start` → sessionId, avatarUrl
   - POST `/api/session/:id/message` → triggers LLM → TTS → events
   - WS `/api/session/:id/events` → event stream

3. **Create VoiceDirector Module**
   - Takes persona + intent
   - Outputs ElevenLabs params + emotion curve
   - Returns audio + timing data

4. **Fix Audio Playback**
   - User gesture gating
   - Proper error handling
   - CORS headers

### Phase 2: Complete Offline Mode

5. **Video Job Pipeline**
   - Execute ffmpeg commands
   - Upload to R2 storage
   - Return download URLs

6. **Lip-Sync Integration**
   - Connect RunPod LatentSync
   - Generate proper lip-sync video

---

## 7. Environment Variables Required

```bash
# ElevenLabs (Voice)
ELEVENLABS_API_KEY=sk_...

# RunPod (GPU Inference)
RUNPOD_API_KEY=...
RUNPOD_ENDPOINT_ID=...
RUNPOD_RENDER_ENDPOINT=...

# Replicate (Fallback)
REPLICATE_API_TOKEN=r8_...

# Cloudflare R2 (Storage)
R2_ENDPOINT=https://...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=personaforge-studio

# Database
DATABASE_URL=postgresql://...
```

---

## 8. Next Steps

1. [ ] Create stable AvatarStage component with debug overlay
2. [ ] Implement WebSocket session endpoint
3. [ ] Connect audio to avatar state reliably
4. [ ] Add user gesture gating for iOS
5. [ ] Test end-to-end: click persona → avatar shows → speaks → animates
6. [ ] Deploy RunPod handler and test video pipeline

---

## 9. Implementation Completed This Session

### New Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/components/AvatarStage.tsx` | Reliable CSS-based avatar with debug overlay |
| `apps/web/src/lib/avatar/VoiceDirector.ts` | Emotion-aware TTS orchestration |
| `apps/web/src/app/api/session/route.ts` | Session creation endpoint |
| `apps/web/src/app/api/session/[id]/message/route.ts` | Message handling with LLM + TTS |
| `GAP_REPORT.md` | This document |
| `RUNBOOK.md` | Deployment and troubleshooting guide |

### Files Modified

| File | Changes |
|------|---------|
| `apps/web/src/components/PersonaChat.tsx` | Now uses AvatarStage instead of LiveAvatar3D |
| `apps/web/src/lib/avatar/index.ts` | Exports VoiceDirector |

### What's Now Working

1. **AvatarStage Component**
   - CSS-based animations (no WebGL crashes)
   - Continuous breathing animation
   - Audio-reactive scaling and rotation
   - State-based expressions (idle/listening/thinking/speaking)
   - Emotion-based position offsets
   - Debug overlay with FPS, state, amplitude
   - User gesture gating for iOS

2. **VoiceDirector Module**
   - Emotion detection from text
   - ElevenLabs parameter generation
   - Emotion curve for avatar timing
   - Text cleaning for TTS

3. **Session API**
   - `/api/session` - Create realtime session
   - `/api/session/[id]/message` - Send message, get audio response
   - Full LLM + TTS pipeline

### What Remains for Tier 2

1. **WebSocket Implementation**
   - Next.js doesn't support native WebSocket
   - Need custom server or Socket.io
   - Currently using polling via `/api/session/[id]/message`

2. **Viseme Timeline**
   - Current: Amplitude-based lip-sync
   - Future: Phoneme-accurate from TTS timing

3. **VRM Avatar Support**
   - Current: 2D image with CSS animation
   - Future: Full 3D humanoid with blendshapes

---

**Report Complete**

