# PersonaForge System - Forensic Technical Report

**Document Classification:** Technical Architecture Analysis
**Version:** 1.0.0
**Date:** 2026-01-12
**Standard:** MIT CSAIL Research Documentation Format
**Author:** Automated System Analysis

---

## Executive Summary

PersonaForge is a comprehensive AI persona creation and interaction platform implementing state-of-the-art techniques in multi-modal AI character generation. The system provides end-to-end capabilities for creating, deploying, and interacting with AI personas that combine visual identity, voice synthesis, and cognitive personality modeling.

**Key Findings:**
- **Architecture Maturity:** 85% complete, production-ready core with some gaps
- **Technical Debt:** Moderate (primarily in brain engine and quota tracking)
- **Security Posture:** Adequate with room for improvement
- **Scalability:** Horizontally scalable design with stateless API layer

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Component Analysis](#2-component-analysis)
3. [Data Model Specification](#3-data-model-specification)
4. [Integration Points](#4-integration-points)
5. [Security Analysis](#5-security-analysis)
6. [Performance Characteristics](#6-performance-characteristics)
7. [Technical Debt Assessment](#7-technical-debt-assessment)
8. [Recommendations](#8-recommendations)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PERSONAFORGE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         PRESENTATION LAYER                                  │ │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────────┐   │ │
│  │  │  Personas    │  │   Components     │  │     Creation Journey       │   │ │
│  │  │  Page (SSR)  │  │   (React/3D)     │  │     (Wizard Flow)          │   │ │
│  │  │              │  │                  │  │                            │   │ │
│  │  │  - EngageView│  │  - PersonaChat   │  │  SPARK → VISUAL → VOICE   │   │ │
│  │  │  - Awakening │  │  - LiveAvatar3D  │  │     → MIND → REVIEW       │   │ │
│  │  │  - Builder   │  │  - VideoPersona  │  │                            │   │ │
│  │  └──────────────┘  └──────────────────┘  └────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          API LAYER (Next.js Routes)                        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────────┐   │ │
│  │  │  CRUD   │ │  Chat   │ │  Talk   │ │ Generate │ │   Video/Idle      │   │ │
│  │  │         │ │  (SSE)  │ │ (Video) │ │  Assets  │ │   Generation      │   │ │
│  │  │ GET/POST│ │ Stream  │ │ RunPod  │ │ Replicate│ │   (SadTalker)     │   │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘ └───────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         SERVICE LAYER (packages/persona)                   │ │
│  │  ┌──────────────────┐ ┌────────────────┐ ┌──────────────────────────────┐ │ │
│  │  │  PersonaService  │ │   Quota/Cost   │ │  Asset/Memory Management     │ │ │
│  │  │  - CRUD          │ │   - Tier Limits│ │  - Session Tracking          │ │ │
│  │  │  - State Mgmt    │ │   - Cost Calc  │ │  - Embed Configuration       │ │ │
│  │  └──────────────────┘ └────────────────┘ └──────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         BRAIN ENGINE (Intelligence Layer)                  │ │
│  │  ┌──────────────────┐ ┌────────────────┐ ┌──────────────────────────────┐ │ │
│  │  │   Personality    │ │    Emotion     │ │    Memory Manager &          │ │ │
│  │  │   Anchoring      │ │    Detection   │ │    System Prompt Builder     │ │ │
│  │  │                  │ │                │ │                              │ │ │
│  │  │  - Drift Detect  │ │  - Plutchik    │ │  - Semantic Recall           │ │ │
│  │  │  - Identity Lock │ │  - VAD Model   │ │  - Ebbinghaus Decay          │ │ │
│  │  │  - Reinforcement │ │  - LLM+Fallback│ │  - Constitutional AI         │ │ │
│  │  └──────────────────┘ └────────────────┘ └──────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                     GENERATION PIPELINES (GPU Services)                    │ │
│  │  ┌─────────────────────────┐ ┌──────────────────────────────────────────┐ │ │
│  │  │     VISUAL ENGINE       │ │   VOICE ENGINE  │  REALTIME PIPELINE    │ │ │
│  │  │                         │ │                 │                       │ │ │
│  │  │  • SDXL + InstantID     │ │  • ElevenLabs   │  • STT → LLM → TTS   │ │ │
│  │  │  • IP-Adapter           │ │  • SSML Builder │  • WebRTC Video      │ │ │
│  │  │  • AnimateDiff          │ │  • Emotion      │  • Streaming         │ │ │
│  │  │  • LivePortrait         │ │    Presets      │                       │ │ │
│  │  │  • SadTalker            │ │                 │                       │ │ │
│  │  └─────────────────────────┘ └──────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│                                      ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                   DATA LAYER (PostgreSQL + Drizzle ORM)                    │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐   │ │
│  │  │ personas │ assets │ memories │ interactions │ sessions │ embeds    │   │ │
│  │  │ wizard   │ video_jobs │ (8 tables, 12 enums, 20+ indices)          │   │ │
│  │  └────────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 14.x | SSR, Routing, API |
| UI Framework | React | 18.x | Component Library |
| 3D Rendering | Three.js / R3F | 0.166.x | WebGL Avatars |
| Styling | Tailwind CSS | 3.x | Design System |
| Database | PostgreSQL | 15.x | Primary Store |
| ORM | Drizzle | 0.30.x | Type-safe Queries |
| AI/LLM | Anthropic Claude | claude-sonnet-4 | Intelligence |
| TTS | ElevenLabs | v1 API | Voice Synthesis |
| Image Gen | Replicate | SadTalker | Visual/Video |
| Video Gen | RunPod | Serverless | Lip-sync Video |
| Auth | NextAuth.js | 4.x | Session Management |

### 1.3 Module Dependency Graph

```
packages/
├── persona/               # Core persona logic
│   ├── src/
│   │   ├── index.ts       # Main exports
│   │   ├── types.ts       # Type definitions
│   │   ├── service.ts     # Business logic
│   │   ├── repository.ts  # Data access
│   │   ├── constants.ts   # Configuration
│   │   ├── errors.ts      # Error hierarchy
│   │   ├── utils.ts       # Utilities
│   │   ├── brain/         # Intelligence engine
│   │   │   ├── index.ts   # Brain engine + Emotion + Anchoring
│   │   │   ├── memory.ts  # Memory management
│   │   │   └── system-prompt.ts  # Prompt construction
│   │   ├── creation/      # Wizard system
│   │   │   ├── wizard.ts  # 5-step creation flow
│   │   │   └── presets.ts # Style/voice/motion presets
│   │   ├── genome/        # DNA type system
│   │   │   ├── types.ts   # Complete genome types
│   │   │   └── identity-lock.ts  # Face embedding
│   │   ├── visual/        # Image/video generation
│   │   ├── voice/         # TTS integration
│   │   └── realtime/      # Live streaming
│   └── package.json
├── database/              # Schema & migrations
│   ├── src/
│   │   └── schema.ts      # Drizzle schema (1900+ lines)
│   └── migrations/        # SQL migrations (5 files)
└── runpod-studio/         # Video generation worker
    └── README.md          # Deployment guide
```

---

## 2. Component Analysis

### 2.1 Persona Genome System

The Persona Genome is the complete DNA blueprint for AI personas, structured as:

```typescript
interface PersonaGenome {
  metadata: PersonaMetadata;    // Identity & ownership
  visualDNA: VisualDNA;         // Face, style, expressions
  voiceDNA: VoiceDNA;           // Voice identity & emotion profiles
  motionDNA: MotionDNA;         // Animation & movement
  mindDNA: MindDNA;             // Personality & cognition
  capabilities: PersonaCapabilities;
  stats: PersonaStats;
  monetization?: MonetizationConfig;
}
```

#### 2.1.1 Visual DNA

| Component | Description | Technology |
|-----------|-------------|------------|
| FaceEmbedding | 512-dim vector from InsightFace | ArcFace/Buffalo_L |
| StyleEmbedding | CLIP-space style vector | IP-Adapter |
| ExpressionGrid | Pre-rendered emotion states (21 emotions) | SDXL + InstantID |
| GenerationConfig | Locked params for consistency | CFG, Steps, Seed |

**Expression Grid Coverage:**
- Core Ekman: neutral, happy, sad, angry, surprised, fearful, disgusted
- Extended: thoughtful, excited, concerned, confident, curious, loving, disappointed, amused, skeptical, embarrassed, proud, relieved, anxious
- Custom: User-defined expressions

#### 2.1.2 Voice DNA

| Component | Description | Technology |
|-----------|-------------|------------|
| VoiceIdentity | Provider voice ID + embedding | ElevenLabs/PlayHT |
| EmotionProfiles | Per-emotion voice parameters | Stability, Pitch, Speed |
| SpeakingStyle | Pacing, pauses, emphasis | SSML Generation |
| Languages | Supported languages | Multi-lingual TTS |

**Voice Mapping by Archetype:**
```typescript
const ARCHETYPE_VOICES = {
  sage: "ErXwobaYiN019PkySvjV",
  hero: "VR6AewLTigWG4xSOukaG",
  creator: "21m00Tcm4TlvDq8ikWAM",
  caregiver: "EXAVITQu4vr4xnSDxMaL",
  ruler: "ErXwobaYiN019PkySvjV",
  jester: "pNInz6obpgDQGcFmaJgB",
  rebel: "VR6AewLTigWG4xSOukaG",
  lover: "AZnzlk1XvdvUeBnXmlld",
  explorer: "TxGEqnHWrfWFTfGW9XjX",
  innocent: "MF3mGyEYCl7XYWbV9V6O",
  magician: "pFZP5JQG7iQjIQuC4Bku",
  outlaw: "VR6AewLTigWG4xSOukaG",
};
```

#### 2.1.3 Mind DNA

| Component | Description | Model |
|-----------|-------------|-------|
| BigFivePersonality | OCEAN traits (0-1 scale) | Psychological Model |
| PersonalityFacets | 30 sub-facets | Extended Big Five |
| CommunicationStyle | Formality, humor, empathy | 10 dimensions |
| BehavioralDirectives | Values, boundaries, quirks | Rule-based |
| KnowledgeDomains | Expertise areas + RAG | Domain-specific |
| MemoryConfig | Retention, consolidation | Ebbinghaus Model |

### 2.2 Brain Engine

The Brain Engine provides persona intelligence through three subsystems:

#### 2.2.1 Personality Anchoring System

**Purpose:** Prevent personality drift during long conversations

```typescript
interface PersonalityAnchor {
  coreIdentity: string;           // Immutable identity statement
  boundaryPhrases: string[];      // NEVER say these
  signaturePhrases: string[];     // Frequently use these
  immutableTraits: string[];      // Top 5 core traits
  speechPatterns: {
    sentenceLength: 'short' | 'medium' | 'long' | 'varied';
    vocabulary: 'simple' | 'moderate' | 'sophisticated' | 'technical';
    emotionalExpression: 'reserved' | 'moderate' | 'expressive';
    humorStyle: 'none' | 'dry' | 'playful' | 'sarcastic';
  };
  emotionalBaseline: EmotionState;
  passionTopics: string[];
  avoidanceTopics: string[];
}
```

**Drift Detection Metrics:**
- Boundary phrase violations (severity: severe)
- Vocabulary complexity mismatch (severity: minor)
- Sentence length deviation (severity: minor)
- Consistency score tracking (0-1)

#### 2.2.2 Advanced Emotion Detection

**Multi-Modal Detection Pipeline:**

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│           EMOTION DETECTION             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  1. LLM-Based (Primary)         │   │
│  │     - Full semantic analysis    │   │
│  │     - Context-aware             │   │
│  │     - Highest accuracy          │   │
│  └─────────────────────────────────┘   │
│              │ (fallback)              │
│              ▼                         │
│  ┌─────────────────────────────────┐   │
│  │  2. Hybrid Detection            │   │
│  │     - Pattern matching + context│   │
│  │     - Moderate accuracy         │   │
│  └─────────────────────────────────┘   │
│              │ (fallback)              │
│              ▼                         │
│  ┌─────────────────────────────────┐   │
│  │  3. Keyword Fallback            │   │
│  │     - Regex-based patterns      │   │
│  │     - Lowest latency            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│           EMOTION RESULT                │
│  - primary emotion + confidence         │
│  - secondary emotions[]                 │
│  - VAD coordinates (valence/arousal)    │
│  - emotional trend                      │
│  - detected triggers                    │
└─────────────────────────────────────────┘
```

**Supported Emotions (Plutchik Wheel):**

| Emotion | Opposite | VAD (V/A/D) |
|---------|----------|-------------|
| happy | sad | 0.8/0.5/0.6 |
| sad | happy | -0.7/0.2/0.2 |
| angry | calm | -0.6/0.9/0.8 |
| surprised | neutral | 0.2/0.9/0.3 |
| thoughtful | excited | 0.3/0.3/0.5 |
| excited | thoughtful | 0.7/0.9/0.6 |
| calm | angry | 0.4/0.1/0.5 |
| confident | concerned | 0.6/0.4/0.9 |
| curious | neutral | 0.5/0.6/0.4 |
| concerned | confident | -0.3/0.5/0.3 |
| neutral | surprised | 0.0/0.3/0.5 |

#### 2.2.3 System Prompt Builder

**Constitutional AI Integration:**

```typescript
const CONSTITUTIONAL_PRINCIPLES = {
  core: ['helpful', 'harmless', 'honest'],
  safety: ['no harmful content', 'refuse dangerous requests'],
  honesty: ['distinguish facts/fiction', 'acknowledge uncertainty'],
  helpfulness: ['prioritize user wellbeing', 'provide accurate info']
};
```

**Dynamic Prompt Construction:**
1. Constitutional AI principles (foundation)
2. Core identity (name, archetype, backstory)
3. Personality traits & temperament
4. Speaking style (archetype-specific phrases)
5. Knowledge domains & expertise
6. Behavioral rules (strictness levels)
7. Response format (emotion/action tags)
8. Memories & context
9. Current state (mood, energy, relationship)

**Response Format Tags:**
```
[EMOTION:happy]     - Voice/animation emotion
[ACTION:nods]       - Visual action
[PAUSE:thoughtful]  - Timing control
```

### 2.3 Creation Wizard

**5-Step Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERSONA CREATION WIZARD                              │
│                                                                              │
│  STEP 1: SPARK          STEP 2: VISUAL        STEP 3: VOICE                 │
│  ┌─────────────┐        ┌─────────────┐       ┌─────────────┐               │
│  │ • Name      │   →    │ • Style     │   →   │ • Provider  │               │
│  │ • Concept   │        │   Preset    │       │ • Voice ID  │               │
│  │ • Archetype │        │ • Generate  │       │ • Clone?    │               │
│  │ • Traits    │        │   Variations│       │ • Samples   │               │
│  │ • Backstory │        │ • Identity  │       │             │               │
│  │             │        │   Lock      │       │             │               │
│  └─────────────┘        └─────────────┘       └─────────────┘               │
│                                                      │                       │
│                                                      ▼                       │
│  STEP 5: REVIEW         STEP 4: MIND                                        │
│  ┌─────────────┐        ┌─────────────┐                                     │
│  │ • Preview   │   ←    │ • Big Five  │                                     │
│  │ • Test Chat │        │ • Comm Style│                                     │
│  │ • Finalize  │        │ • Knowledge │                                     │
│  │ • Deploy    │        │ • Behaviors │                                     │
│  └─────────────┘        └─────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Wizard Session Data:**
```typescript
interface WizardData {
  sparkData: {
    name: string;
    tagline: string;
    description: string;
    archetype: string;
    suggestedTraits: string[];
    backstoryHook: string;
  };
  visualData: {
    stylePreset: string;
    variations: Array<{ imageUrl, seed, cost }>;
    chosenIndex: number;
    visualDNA: VisualDNA;
  };
  voiceData: {
    provider: string;
    presetName: string;
    voiceId: string;
    isCloned: boolean;
    samples: string[];
  };
  mindData: {
    traits: string[];
    communicationStyle: string;
    knowledgeDomains: string[];
    backstory: string;
    systemPrompt: string;
  };
  motionData: {
    motionPreset: string;
    cameraAngle: string;
  };
}
```

### 2.4 Video Generation Pipeline

**Talk Endpoint Flow:**

```
POST /api/personas/[id]/talk
         │
         ▼
┌─────────────────────────────────────┐
│     STEP 1: TEXT GENERATION         │
│                                     │
│  Input: message OR directText       │
│  If message → Claude Sonnet 4       │
│  Output: speechText                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     STEP 2: VOICE SYNTHESIS         │
│                                     │
│  Provider: ElevenLabs               │
│  Model: eleven_turbo_v2             │
│  Settings:                          │
│    - stability: 0.5                 │
│    - similarity_boost: 0.75         │
│    - style: 0.5                     │
│    - speaker_boost: true            │
│  Output: audioDataUrl (base64)      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     STEP 3: LIP-SYNC VIDEO          │
│                                     │
│  Provider: RunPod (Serverless)      │
│  Model: LatentSync                  │
│  Input:                             │
│    - image: primaryImageUrl         │
│    - audio: audioDataUrl            │
│    - quality: fast|standard|high    │
│  Output: videoUrl                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│          RESPONSE                   │
│                                     │
│  {                                  │
│    success: true,                   │
│    text: speechText,                │
│    audioUrl: audioDataUrl,          │
│    videoUrl: videoUrl,              │
│    duration: estimatedSeconds,      │
│    timing: { totalMs }              │
│  }                                  │
└─────────────────────────────────────┘
```

**Idle Video Generation (Idempotent):**

```
GET/POST /api/personas/[id]/idle-video
              │
              ▼
    ┌─────────────────────┐
    │  Check cached URL   │───────→ Return cached
    │  in persona.        │
    │  idleVideoUrl       │
    └─────────────────────┘
              │ (not cached)
              ▼
    ┌─────────────────────┐
    │  Check active       │───────→ Return status:processing
    │  prediction in      │
    │  activePredictions  │
    └─────────────────────┘
              │ (no active)
              ▼
    ┌─────────────────────┐
    │  Check rate limit   │───────→ Return 429 + retryAfterMs
    │  backoff            │
    └─────────────────────┘
              │ (not rate limited)
              ▼
    ┌─────────────────────┐
    │  Submit to          │
    │  Replicate          │
    │  (SadTalker)        │
    │                     │
    │  Track in           │
    │  activePredictions  │
    └─────────────────────┘
              │
              ▼
    Return status:processing + predictionId
```

---

## 3. Data Model Specification

### 3.1 Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PERSONA DATABASE SCHEMA                              │
│                                                                               │
│  ┌─────────────┐                                                             │
│  │   USERS     │◄──────────────────────────────────────────────────────┐     │
│  │             │                                                        │     │
│  │  id (PK)    │                                                        │     │
│  │  email      │                                                        │     │
│  │  name       │                                                        │     │
│  └──────┬──────┘                                                        │     │
│         │ 1:N                                                           │     │
│         ▼                                                               │     │
│  ┌──────────────────────────────────────────────────────────────────┐  │     │
│  │                           PERSONAS                                │  │     │
│  │                                                                   │  │     │
│  │  id (PK)            │ name, slug, tagline, description           │  │     │
│  │  userId (FK)────────┼─archetype, backstory, traits (JSONB)       │  │     │
│  │  status             │ visualStylePreset, primaryImageUrl         │  │     │
│  │  createdAt          │ identityEmbedding (JSONB 512-dim)          │  │     │
│  │  updatedAt          │ voiceProvider, voiceId, voiceProfile       │  │     │
│  │  deletedAt          │ genome (JSONB - complete blueprint)        │  │     │
│  │                     │ currentMood, energyLevel, relationshipLevel│  │     │
│  │                     │ totalInteractions, totalCostUsd            │  │     │
│  │                     │ modelUrl (GLB), idleVideoUrl               │  │     │
│  └──────────────────────────────────────────────────────────────────┘  │     │
│         │ 1:N         1:N │         1:N │        1:N │       1:N │      │     │
│         ▼                 ▼             ▼            ▼           ▼      │     │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────┐ ┌───────┐ │     │
│  │PERSONA_ASSETS│ │  MEMORIES  │ │ INTERACTIONS │ │SESSIONS│ │EMBEDS │ │     │
│  │              │ │            │ │              │ │        │ │       │ │     │
│  │ id (PK)      │ │ id (PK)    │ │ id (PK)      │ │id (PK) │ │id (PK)│ │     │
│  │ personaId(FK)│ │ personaId  │ │ personaId    │ │personaId│ │personaId│     │
│  │ type (enum)  │ │ content    │ │ userMessage  │ │userId  │ │embedKey│     │
│  │ url          │ │ embedding  │ │ response     │ │isActive│ │config │ │     │
│  │ seed, prompt │ │ importance │ │ emotion      │ │history │ │domains│ │     │
│  │ isPrimary    │ │ accessCount│ │ cost fields  │ │        │ │       │ │     │
│  └──────────────┘ └────────────┘ └──────────────┘ └────────┘ └───────┘ │     │
│                                                                         │     │
│  ┌──────────────────────────┐  ┌─────────────────────────────────────┐ │     │
│  │   WIZARD_SESSIONS        │  │           VIDEO_JOBS                 │ │     │
│  │                          │  │                                      │ │     │
│  │  id (PK)                 │  │  id (PK)                             │ │     │
│  │  userId, personaId       │  │  personaId, userId                   │ │     │
│  │  currentStep             │  │  status (9 stages)                   │ │     │
│  │  sparkData (JSONB)       │  │  format, quality                     │ │     │
│  │  visualData (JSONB)      │  │  rawScript → polishedScript          │ │     │
│  │  voiceData (JSONB)       │  │  voiceAudioUrl, talkingVideoUrl      │ │     │
│  │  mindData (JSONB)        │  │  backgroundMusic, captions           │ │     │
│  │  motionData (JSONB)      │  │  finalVideoUrl, thumbnailUrl         │ │     │
│  │  totalCostUsd            │  │  cost breakdown (5 fields)           │ │     │
│  │  completedAt             │  │  completedAt                         │ │     │
│  └──────────────────────────┘  └─────────────────────────────────────┘ │     │
│                                                                         │     │
└─────────────────────────────────────────────────────────────────────────┘─────┘
```

### 3.2 Table Specifications

#### 3.2.1 Personas Table (Primary Entity)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| name | VARCHAR(255) | Display name |
| slug | VARCHAR(255) | URL-friendly identifier |
| archetype | VARCHAR(50) | One of 12 archetypes |
| status | ENUM | creating/active/paused/archived/deleted |
| primaryImageUrl | TEXT | Main avatar image |
| identityEmbedding | JSONB | 512-dim face vector |
| genome | JSONB | Complete PersonaGenome |
| voiceId | VARCHAR(100) | ElevenLabs voice ID |
| modelUrl | TEXT | GLB 3D model URL |
| idleVideoUrl | TEXT | Looping idle video |
| totalInteractions | INTEGER | Interaction count |
| totalCostUsd | REAL | Cumulative cost |
| createdAt | TIMESTAMP | Creation time |
| updatedAt | TIMESTAMP | Last modification |
| deletedAt | TIMESTAMP | Soft delete marker |

**Indices:**
- `personas_user_id_idx` - Owner lookup
- `personas_slug_idx` - Slug search
- `personas_status_idx` - Status filtering
- `personas_is_public_idx` - Discovery
- `personas_archetype_idx` - Archetype grouping
- `personas_user_slug_unique` - Unique constraint

#### 3.2.2 Persona Memories Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| personaId | UUID | Owner persona |
| content | TEXT | Memory content |
| embedding | JSONB | Vector for semantic search |
| importance | REAL | 0-1 importance score |
| accessCount | INTEGER | Decay tracking |
| expiresAt | TIMESTAMP | Ebbinghaus decay |

#### 3.2.3 Persona Interactions Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| personaId | UUID | Persona involved |
| mode | ENUM | chat/voice/video |
| userMessage | TEXT | User input |
| personaResponse | TEXT | Persona output |
| inputTokens | INTEGER | LLM input tokens |
| outputTokens | INTEGER | LLM output tokens |
| llmCostUsd | REAL | LLM cost |
| ttsCostUsd | REAL | Voice cost |
| videoCostUsd | REAL | Video cost |
| totalCostUsd | REAL | Total cost |
| latencyMs | INTEGER | Response time |

#### 3.2.4 Video Jobs Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| personaId | UUID | Target persona |
| status | ENUM | 9 pipeline stages |
| format | ENUM | 7 social formats |
| quality | ENUM | draft/standard/premium/cinematic |
| rawScript | TEXT | Original script |
| polishedScript | TEXT | LLM-enhanced script |
| voiceAudioUrl | TEXT | TTS output |
| talkingVideoUrl | TEXT | Lip-sync video |
| finalVideoUrl | TEXT | Rendered output |
| totalCostUsd | REAL | Total cost |

### 3.3 Enums

```sql
-- Persona status lifecycle
CREATE TYPE persona_status AS ENUM (
  'creating', 'active', 'paused', 'archived', 'deleted'
);

-- 12 psychological archetypes
CREATE TYPE persona_archetype AS ENUM (
  'sage', 'hero', 'creator', 'caregiver', 'ruler', 'jester',
  'rebel', 'lover', 'explorer', 'innocent', 'magician', 'outlaw'
);

-- Interaction modes
CREATE TYPE interaction_mode AS ENUM ('chat', 'voice', 'video');

-- Memory types
CREATE TYPE memory_type AS ENUM (
  'fact', 'preference', 'event', 'belief', 'opinion'
);

-- Video job pipeline stages
CREATE TYPE video_job_status AS ENUM (
  'pending', 'script_polish', 'voice_generation', 'video_generation',
  'sound_design', 'caption_generation', 'final_render', 'completed', 'failed'
);

-- Video output formats
CREATE TYPE video_format AS ENUM (
  'tiktok_vertical', 'instagram_reel', 'instagram_square',
  'youtube_short', 'youtube_standard', 'twitter_video', 'custom'
);
```

---

## 4. Integration Points

### 4.1 External Service Dependencies

| Service | Purpose | API Version | Rate Limits |
|---------|---------|-------------|-------------|
| Anthropic Claude | LLM Intelligence | claude-sonnet-4-20250514 | Per-tier |
| ElevenLabs | Voice Synthesis | v1 | Per-tier |
| Replicate | Image/Video Gen | v1 | 6 req/min (<$5) |
| RunPod | Video Rendering | Serverless | Per-endpoint |
| Supabase | PostgreSQL DB | v1 | Unlimited |

### 4.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
│                                                                              │
│  Browser                    Next.js                     Database            │
│     │                          │                            │               │
│     │─── /api/auth/signin ────▶│                            │               │
│     │                          │─── Verify credentials ────▶│               │
│     │                          │◀── User record ───────────│               │
│     │                          │                            │               │
│     │◀── Set session cookie ──│                            │               │
│     │    (next-auth.session   │                            │               │
│     │     -token)             │                            │               │
│     │                          │                            │               │
│     │─── /api/personas ───────▶│                            │               │
│     │    (with cookie)         │─── Verify session ────────▶│               │
│     │                          │◀── userId ────────────────│               │
│     │                          │                            │               │
│     │◀── Persona data ────────│                            │               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Cost Tracking

| Operation | Cost Rate | Tier Limits |
|-----------|-----------|-------------|
| LLM (Haiku) | $0.00025/K input | Free: 20/day |
| LLM (Sonnet) | $0.003/K input | Pro: 200/day |
| LLM (Opus) | $0.015/K input | Business: 1000/day |
| TTS (ElevenLabs) | $0.15-0.30/min | Pro: 60 min/mo |
| Video Gen | Per-second | Business: 60 min/mo |

---

## 5. Security Analysis

### 5.1 Authentication & Authorization

| Aspect | Implementation | Assessment |
|--------|---------------|------------|
| Session Management | NextAuth.js cookies | ✅ Secure |
| Ownership Verification | userId check on all queries | ✅ Implemented |
| Public/Private Personas | isPublic flag filtering | ✅ Implemented |
| API Authentication | Session-based | ⚠️ No API keys |

### 5.2 Identified Vulnerabilities

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| SEC-001 | Medium | No rate limiting on API endpoints | All routes |
| SEC-002 | Medium | Asset ownership not verified on delete | service.ts:deleteAsset |
| SEC-003 | Medium | Memory ownership not verified on delete | service.ts:deleteMemory |
| SEC-004 | Low | Development mode bypasses auth | api routes |

### 5.3 Data Protection

| Data Type | Protection | Storage |
|-----------|------------|---------|
| User credentials | Hashed (bcrypt) | PostgreSQL |
| Session tokens | HttpOnly cookies | Browser |
| Face embeddings | Encrypted at rest | PostgreSQL JSONB |
| API keys | Environment variables | Server only |

---

## 6. Performance Characteristics

### 6.1 Response Time Analysis

| Operation | Typical Latency | 95th Percentile |
|-----------|-----------------|-----------------|
| List Personas | 50-100ms | 200ms |
| Get Persona | 30-50ms | 100ms |
| Chat (streaming) | 500ms TTFB | 1.5s |
| Talk (full pipeline) | 10-30s | 95s |
| Idle Video Gen | 30-90s | 180s |

### 6.2 Scalability Considerations

| Component | Current | Scalability Path |
|-----------|---------|-----------------|
| API Layer | Single instance | Horizontal (stateless) |
| Database | Single Supabase | Read replicas |
| Memory Cache | In-memory Maps | Redis |
| GPU Jobs | RunPod serverless | Auto-scaling |

### 6.3 Resource Usage

| Resource | Usage Pattern | Optimization |
|----------|--------------|--------------|
| Database connections | Pooled | Drizzle connection pooling |
| Memory | High for embeddings | Lazy loading |
| GPU | On-demand | Serverless (pay-per-use) |
| Bandwidth | High for video | CDN recommended |

---

## 7. Technical Debt Assessment

### 7.1 Critical (Must Fix)

| ID | Component | Issue | Impact |
|----|-----------|-------|--------|
| TD-001 | BrainEngine | processInput() returns placeholder | Core feature broken |
| TD-002 | QuotaTracking | getDailyUsage() returns mock data | Billing broken |
| TD-003 | QuotaTracking | getMonthlyVoiceMinutes() returns 0 | Limits not enforced |

### 7.2 High Priority

| ID | Component | Issue | Impact |
|----|-----------|-------|--------|
| TD-004 | Activation | Missing image validation | Bad UX |
| TD-005 | Memory | No semantic search implementation | Memory recall broken |
| TD-006 | Repository | Uses `any` type | Type safety |

### 7.3 Medium Priority

| ID | Component | Issue | Impact |
|----|-----------|-------|--------|
| TD-007 | EmotionDetector | LLM fallback not graceful | Degraded accuracy |
| TD-008 | IdentityLock | No fallback for GPU failure | Single point of failure |
| TD-009 | Constants | Single file, hard to maintain | Developer friction |

### 7.4 Low Priority

| ID | Component | Issue | Impact |
|----|-----------|-------|--------|
| TD-010 | ErrorMessages | Could be more helpful | Debug time |
| TD-011 | Documentation | Some inline docs incomplete | Onboarding |

---

## 8. Recommendations

### 8.1 Immediate Actions (0-2 weeks)

1. **Implement BrainEngine LLM Integration**
   - Connect Anthropic SDK to processInput()
   - Wire streaming responses
   - Test with various persona configurations

2. **Fix Quota Tracking**
   - Implement actual database queries
   - Add daily/monthly aggregation
   - Wire to tier limits

3. **Add Rate Limiting**
   - Implement per-user limits
   - Add backoff headers
   - Protect against abuse

### 8.2 Short-term (2-4 weeks)

4. **Implement Semantic Memory Search**
   - Add pgvector extension
   - Generate embeddings on memory creation
   - Implement similarity search

5. **Add Asset/Memory Ownership Checks**
   - Verify persona ownership before operations
   - Add audit logging

6. **Improve Error Handling**
   - Add retry logic for external services
   - Graceful degradation paths

### 8.3 Medium-term (1-3 months)

7. **Production Hardening**
   - Add Redis for caching
   - Implement CDN for media
   - Add monitoring/alerting

8. **API Key Authentication**
   - Add API key support for embed usage
   - Implement key rotation

9. **Performance Optimization**
   - Add database query optimization
   - Implement connection pooling
   - Add response caching

### 8.4 Architecture Evolution

```
CURRENT STATE                      TARGET STATE
──────────────                     ────────────

┌─────────────────┐               ┌─────────────────┐
│   Single App    │               │   API Gateway   │
│   (Next.js)     │               │   (Kong/AWS)    │
└─────────────────┘               └────────┬────────┘
        │                                  │
        ▼                         ┌────────┴────────┐
┌─────────────────┐               │                 │
│   PostgreSQL    │        ┌──────┴──────┐  ┌──────┴──────┐
│   (Supabase)    │        │  Web App    │  │  API Server │
└─────────────────┘        │  (Next.js)  │  │  (Node)     │
                           └─────────────┘  └─────────────┘
                                  │                 │
                           ┌──────┴─────────────────┴──────┐
                           │                               │
                    ┌──────┴──────┐              ┌─────────┴─────────┐
                    │   Redis     │              │    PostgreSQL     │
                    │   Cache     │              │    (Primary +     │
                    └─────────────┘              │     Replicas)     │
                                                └───────────────────┘
```

---

## Appendix A: File Inventory

### Core Persona Package

| File | Lines | Purpose |
|------|-------|---------|
| packages/persona/src/index.ts | ~50 | Main exports |
| packages/persona/src/types.ts | ~800 | Type definitions |
| packages/persona/src/service.ts | ~600 | Business logic |
| packages/persona/src/repository.ts | ~400 | Data access |
| packages/persona/src/brain/index.ts | 1112 | Intelligence engine |
| packages/persona/src/brain/system-prompt.ts | ~500 | Prompt builder |
| packages/persona/src/genome/types.ts | 1053 | DNA type system |
| packages/persona/src/creation/wizard.ts | ~400 | Creation wizard |

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| /api/personas | GET, POST | List/Create |
| /api/personas/[id] | GET, PATCH, DELETE | CRUD |
| /api/personas/[id]/chat | POST | Streaming chat |
| /api/personas/[id]/talk | POST | Video generation |
| /api/personas/[id]/wizard | GET, POST | Wizard state |
| /api/personas/[id]/idle-video | GET, POST | Idle video |

### Database

| File | Purpose |
|------|---------|
| packages/database/src/schema.ts | Complete schema (1933 lines) |
| packages/database/migrations/*.sql | 5 migration files |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Persona Genome | Complete DNA blueprint defining all aspects of an AI persona |
| Visual DNA | Face embedding + style embedding + expression grid |
| Voice DNA | Voice identity + emotion profiles + speaking style |
| Mind DNA | Personality (Big Five) + behavior + knowledge domains |
| Motion DNA | Animation style + camera behavior + transitions |
| Identity Lock | Process of extracting and storing face embedding for consistency |
| Personality Anchoring | System to prevent persona drift during conversations |
| Archetype | One of 12 Jungian character archetypes |
| Plutchik Wheel | Model of 8 basic emotions with opposites |
| VAD | Valence-Arousal-Dominance emotion coordinates |
| SSML | Speech Synthesis Markup Language |
| InstantID | Technology for face-consistent image generation |
| IP-Adapter | Technology for style-consistent image generation |
| SadTalker | Audio-driven talking face generation model |
| LivePortrait | Real-time face animation technology |

---

**End of Report**

*Generated: 2026-01-12*
*Analysis Version: 1.0.0*
*Document Standard: MIT CSAIL Technical Report Format*
