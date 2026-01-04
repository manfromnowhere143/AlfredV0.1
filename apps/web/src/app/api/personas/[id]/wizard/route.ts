/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA CREATION WIZARD API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art persona creation pipeline.
 * This is a thin HTTP wrapper around the battle-tested CreationWizard engine.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                              HTTP API LAYER                                  │
 * │                                                                              │
 * │   POST /api/personas/[id]/wizard                                            │
 * │   └── Thin wrapper around CreationWizard                                    │
 * │                                                                              │
 * │   ┌──────────────────────────────────────────────────────────────────────┐ │
 * │   │                      CREATION WIZARD ENGINE                           │ │
 * │   │   - Session management                                                │ │
 * │   │   - Step orchestration                                                │ │
 * │   │   - Cost tracking                                                     │ │
 * │   └──────────────────────────────────────────────────────────────────────┘ │
 * │                                    │                                        │
 * │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
 * │   │  LLM       │  │ Identity   │  │  Voice     │  │  Session   │          │
 * │   │  Client    │  │ Pipeline   │  │  Engine    │  │  Storage   │          │
 * │   │ (Claude)   │  │ (InstantID)│  │(ElevenLabs)│  │  (Redis)   │          │
 * │   └────────────┘  └────────────┘  └────────────┘  └────────────┘          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, sessions, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import Anthropic from "@anthropic-ai/sdk";

// Import the REAL engines from @alfred/persona
import {
  // Core services
  PersonaRepository,
  PersonaService,
  
  // Creation wizard
  CreationWizard,
  // @ts-ignore
  type WizardSession,
  type SparkInput,
  type VisualOptions,
  type VoiceOptions,
  type MindOptions,
  
  // Identity pipeline
  createIdentityLockPipeline,
  type IdentityLockPipeline,
  
  // Voice engine
  VoiceEngine,
} from "@alfred/persona";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get user ID from session cookie
 * Uses direct database query for reliability
 */
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) return null;

  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  return session?.userId || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION STORAGE (Redis-backed in production)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory session storage for development
 * TODO: Replace with Redis for production
 * 
 * ```typescript
 * // Production implementation:
 * const redis = new Redis(process.env.REDIS_URL);
 * const sessionStorage = {
 *   save: (s) => redis.set(`wizard:${s.id}`, JSON.stringify(s), 'EX', 86400),
 *   load: (id) => redis.get(`wizard:${id}`).then(s => s ? JSON.parse(s) : null),
 *   delete: (id) => redis.del(`wizard:${id}`),
 * };
 * ```
 */
const wizardSessions = new Map<string, WizardSession>();

const sessionStorage = {
  async save(session: WizardSession): Promise<void> {
    wizardSessions.set(session.id, session);
    console.log(`[Session] Saved: ${session.id} (step: ${session.currentStep})`);
  },
  async load(sessionId: string): Promise<WizardSession | null> {
    const session = wizardSessions.get(sessionId) || null;
    if (session) {
      console.log(`[Session] Loaded: ${sessionId} (step: ${session.currentStep})`);
    }
    return session;
  },
  async delete(sessionId: string): Promise<void> {
    wizardSessions.delete(sessionId);
    console.log(`[Session] Deleted: ${sessionId}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LLM CLIENT (Anthropic Claude)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anthropic Claude client for AI-powered persona expansion
 * Uses Claude Sonnet for balanced speed/quality
 */
const llmClient = {
  async complete(prompt: string, options: { maxTokens?: number } = {}): Promise<string> {
    const client = new Anthropic();
    
    console.log(`[LLM] Requesting completion (${options.maxTokens || 1000} max tokens)`);
    const startTime = Date.now();
    
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: options.maxTokens || 1000,
      messages: [{ role: "user", content: prompt }],
    });
    
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`[LLM] Completed in ${Date.now() - startTime}ms (${text.length} chars)`);
    
    return text;
  },
  
  async *stream(prompt: string): AsyncGenerator<string> {
    const client = new Anthropic();
    
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset storage for generated images
 * Uses Supabase Storage in production
 */
const assetStorage = {
  async upload(buffer: Buffer, filename: string): Promise<string> {
    // TODO: Implement Supabase storage upload
    // For now, return the URL directly (images come from Replicate/RunPod)
    console.log(`[Storage] Would upload: ${filename}`);
    return filename;
  },
  getPublicUrl(key: string): string {
    return key; // Images already have public URLs from providers
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the Identity Lock Pipeline
 * Uses Replicate as primary provider (RunPod as fallback)
 */
function getIdentityPipeline(): IdentityLockPipeline {
  const replicateKey = process.env.REPLICATE_API_TOKEN;
  const runpodKey = process.env.RUNPOD_API_KEY;
  
  if (!replicateKey && !runpodKey) {
    throw new Error("No GPU provider API key configured (REPLICATE_API_TOKEN or RUNPOD_API_KEY)");
  }
  
  console.log(`[Pipeline] Initializing with ${replicateKey ? "Replicate" : "RunPod"}`);
  
  return createIdentityLockPipeline({
    replicateApiKey: replicateKey,
    runpodApiKey: runpodKey,
    storage: assetStorage,
  });
}

/**
 * Initialize the Voice Engine
 * Returns undefined if ElevenLabs not configured (voice optional)
 */
function getVoiceEngine(): VoiceEngine | undefined {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.log("[Voice] ElevenLabs not configured, voice disabled");
    return undefined;
  }
  
  console.log("[Voice] Initializing ElevenLabs engine");
  
  return new VoiceEngine({
    elevenLabsApiKey: apiKey,
    defaultModel: "eleven_turbo_v2",
  });
}

/**
 * Get or create the CreationWizard instance
 * Lazy initialization to avoid startup costs
 */
let _wizard: CreationWizard | null = null;

function getWizard(): CreationWizard {
  if (!_wizard) {
    console.log("[Wizard] Initializing CreationWizard engine...");
    
    _wizard = new CreationWizard({
      identityPipeline: getIdentityPipeline(),
      llmClient,
      voiceClient: getVoiceEngine() as any, // Voice client interface compatible
      sessionStorage,
    });
    
    console.log("[Wizard] Engine ready");
  }
  
  return _wizard;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/personas/[id]/wizard?sessionId=xxx
 * 
 * Retrieve current wizard session state
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await sessionStorage.load(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      session,
      // Include step-specific data for UI
      currentStepData: session.data[session.currentStep as keyof typeof session.data],
    });
  } catch (error) {
    console.error("[GET] Error:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}

/**
 * POST /api/personas/[id]/wizard
 * 
 * Process wizard actions. This is the main endpoint that drives the entire
 * persona creation flow.
 * 
 * Actions:
 * - start: Initialize new wizard session
 * - spark: Process initial concept with AI expansion
 * - generate-variations: Generate visual variations
 * - lock-identity: Lock chosen face with InstantID
 * - configure-voice: Set up voice with ElevenLabs
 * - skip-voice: Skip voice (text-only persona)
 * - configure-mind: Set personality and backstory
 * - finalize: Complete wizard and create genome
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  
  try {
    const { id: personaId } = await params;
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId, data } = body;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`[Wizard] Action: ${action}`);
    console.log(`[Wizard] PersonaId: ${personaId}`);
    console.log(`[Wizard] UserId: ${userId}`);
    console.log(`${"═".repeat(60)}`);

    const wizard = getWizard();
    let result: unknown;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // START - Initialize new wizard session
      // ─────────────────────────────────────────────────────────────────────
      case "start": {
        console.log("[Wizard] Starting new session...");
        
        const session = await wizard.startSession(userId, personaId);
        
        console.log(`[Wizard] Session created: ${session.id}`);
        result = session;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // SPARK - AI-powered concept expansion
      // ─────────────────────────────────────────────────────────────────────
      case "spark": {
        console.log("[Wizard] Processing spark...");
        console.log(`[Wizard] Name: ${data.name}`);
        console.log(`[Wizard] Description: ${data.description?.substring(0, 50)}...`);
        console.log(`[Wizard] Archetype: ${data.archetype}`);
        
        const sparkInput: SparkInput = {
          name: data.name,
          description: data.description,
          archetype: data.archetype,
          referenceImageUrl: data.referenceImageUrl,
          inspiration: data.inspiration,
        };
        
        const sparkData = await wizard.processSpark(sessionId, sparkInput);
        
        console.log(`[Wizard] Spark complete:`);
        console.log(`   Tagline: ${sparkData.tagline}`);
        console.log(`   Style: ${sparkData.suggestedVisualStyle}`);
        console.log(`   Traits: ${sparkData.suggestedTraits.join(", ")}`);
        
        result = sparkData;
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // GENERATE VARIATIONS - Real image generation
      // ─────────────────────────────────────────────────────────────────────
      case "generate-variations": {
        console.log("[Wizard] Generating visual variations...");
        console.log(`[Wizard] Style: ${data.stylePreset}`);
        console.log(`[Wizard] Count: ${data.count || 4}`);
        
        const visualOptions: VisualOptions = {
          stylePreset: data.stylePreset || "hyper_realistic",
          customPrompt: data.customPrompt,
          negativePrompt: data.negativePrompt,
          variations: data.count || 4,
        };
        
        const variations = await wizard.generateVisualVariations(sessionId, visualOptions);
        
        console.log(`[Wizard] Generated ${variations.length} variations`);
        variations.forEach((v, i) => {
          console.log(`   [${i}] ${v.imageUrl.substring(0, 50)}... (${v.generationTimeMs}ms, $${v.cost.toFixed(4)})`);
        });
        
        result = {
          variations: variations.map((v, i) => ({
            index: i,
            imageUrl: v.imageUrl,
            seed: v.seed,
            generationTimeMs: v.generationTimeMs,
            cost: v.cost,
          })),
          totalCost: variations.reduce((sum, v) => sum + v.cost, 0),
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // LOCK IDENTITY - InstantID face locking
      // ─────────────────────────────────────────────────────────────────────
      case "lock-identity": {
        console.log("[Wizard] Locking visual identity...");
        console.log(`[Wizard] Chosen index: ${data.chosenIndex}`);
        
        const visualDNA = await wizard.lockVisualIdentity(sessionId, data.chosenIndex);
        
        console.log(`[Wizard] Identity locked!`);
        console.log(`   Face embedding: ${visualDNA.faceEmbedding.vector.length} dimensions`);
        console.log(`   Confidence: ${visualDNA.faceEmbedding.confidence}`);
        console.log(`   Expressions: ${Object.keys(visualDNA.expressions).length} generated`);
        
        result = {
          success: true,
          visualDNA: {
            primaryImageUrl: visualDNA.faceEmbedding.sourceImageUrl,
            expressionCount: Object.keys(visualDNA.expressions).length,
            faceConfidence: visualDNA.faceEmbedding.confidence,
            locked: true,
            lockedAt: new Date().toISOString(),
          },
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // CONFIGURE VOICE - ElevenLabs voice setup
      // ─────────────────────────────────────────────────────────────────────
      case "configure-voice": {
        console.log("[Wizard] Configuring voice...");
        console.log(`[Wizard] Provider: ${data.provider || "elevenlabs"}`);
        console.log(`[Wizard] Mode: ${data.mode || "preset"}`);
        console.log(`[Wizard] PresetId: ${data.presetId}`);
        
        const voiceOptions: VoiceOptions = {
          provider: data.provider || "elevenlabs",
          mode: data.mode || "preset",
          presetId: data.presetId,
          cloneSamples: data.cloneSamples,
          characteristics: data.characteristics,
        };
        
        const voiceData = await wizard.configureVoice(sessionId, voiceOptions);
        
        console.log(`[Wizard] Voice configured: ${voiceData.voiceId}`);
        console.log(`   Cloned: ${voiceData.isCloned}`);
        console.log(`   Samples: ${voiceData.samples.length}`);
        
        result = {
          provider: voiceData.provider,
          voiceId: voiceData.voiceId,
          isCloned: voiceData.isCloned,
          samples: voiceData.samples,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // SKIP VOICE - Text-only persona
      // ─────────────────────────────────────────────────────────────────────
      case "skip-voice": {
        console.log("[Wizard] Skipping voice configuration...");
        
        await wizard.skipVoice(sessionId);
        
        result = { success: true, skipped: true };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // CONFIGURE MIND - Personality and backstory
      // ─────────────────────────────────────────────────────────────────────
      case "configure-mind": {
        console.log("[Wizard] Configuring mind...");
        console.log(`[Wizard] Traits: ${(data.traits || []).join(", ")}`);
        console.log(`[Wizard] Style: ${data.communicationStyle}`);
        console.log(`[Wizard] Domains: ${(data.knowledgeDomains || []).join(", ")}`);
        
        const mindOptions: MindOptions = {
          traits: data.traits || [],
          communicationStyle: data.communicationStyle || "friendly",
          knowledgeDomains: data.knowledgeDomains || [],
          backstory: data.backstory || "",
          boundaries: data.boundaries,
          customInstructions: data.customInstructions,
        };
        
        const mindData = await wizard.configureMind(sessionId, mindOptions);
        
        console.log(`[Wizard] Mind configured`);
        console.log(`   Personality: O=${mindData.personalityMatrix.openness.toFixed(2)} C=${mindData.personalityMatrix.conscientiousness.toFixed(2)} E=${mindData.personalityMatrix.extraversion.toFixed(2)}`);
        console.log(`   Backstory: ${mindData.backstory.substring(0, 100)}...`);
        
        result = {
          traits: mindData.traits,
          personalityMatrix: mindData.personalityMatrix,
          communicationStyle: mindData.communicationStyle,
          backstoryPreview: mindData.backstory.substring(0, 200) + "...",
          systemPromptLength: mindData.systemPrompt.length,
        };
        break;
      }

      // ─────────────────────────────────────────────────────────────────────
      // FINALIZE - Complete wizard and create genome
      // ─────────────────────────────────────────────────────────────────────
      case "finalize": {
        console.log("[Wizard] Finalizing persona...");
        
        const genome = await wizard.finalize(sessionId);
        
        console.log(`[Wizard] Genome created!`);
        console.log(`   Name: ${genome.metadata.name}`);
        console.log(`   Slug: ${genome.metadata.slug}`);
        console.log(`   Category: ${genome.metadata.category}`);
        console.log(`   Total cost: $${genome.metadata.totalGenerationCost?.toFixed(4)}`);
        console.log(`   Total time: ${genome.metadata.generationTimeMs}ms`);
        
        // Save to database
        const repository = new PersonaRepository(db as any, schema);
        const service = new PersonaService(repository);
        
        await service.update({ userId, tier: "pro" }, personaId, {
          name: genome.metadata.name,
          tagline: genome.metadata.tagline,
          traits: genome.mindDNA.traits,
          visualConfig: genome.visualDNA as any,
          voiceId: genome.voiceDNA?.voiceId,
          voiceProvider: genome.voiceDNA?.identity.provider as "elevenlabs" | "coqui" | undefined,
          status: "active",
        });
        
        // Store primary image as asset
        if (genome.metadata.avatarUrl) {
          await service.addAsset({ userId, tier: "pro" }, personaId, {
            type: "image",
            purpose: "primary_portrait",
            url: genome.metadata.avatarUrl,
          });
        }
        
        console.log("[Wizard] Persona saved to database");
        
        // Cleanup session
        await sessionStorage.delete(sessionId);
        
        result = {
          genome: {
            id: genome.metadata.id,
            name: genome.metadata.name,
            slug: genome.metadata.slug,
            tagline: genome.metadata.tagline,
            category: genome.metadata.category,
            avatarUrl: genome.metadata.avatarUrl,
            totalCost: genome.metadata.totalGenerationCost,
            generationTimeMs: genome.metadata.generationTimeMs,
          },
          status: "active",
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;
    console.log(`[Wizard] Action completed in ${duration}ms`);
    console.log(`${"═".repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      action,
      duration,
      data: result,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as Error;
    
    console.error(`[Wizard] ERROR after ${duration}ms:`, err.message);
    console.error(err.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Wizard step failed",
        duration,
      },
      { status: 500 }
    );
  }
}