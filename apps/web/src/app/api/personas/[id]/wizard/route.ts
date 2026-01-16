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
// SESSION STORAGE — Database-backed (survives server restarts!)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Database-backed session storage
 * CRITICAL: Survives hot reloads and server restarts
 * Uses personaWizardSessions table from @alfred/database
 */
const sessionStorage = {
  async save(session: WizardSession): Promise<void> {
    console.log(`[Session] Saving to database: ${session.id} (step: ${session.currentStep})`);

    // Map WizardSession to database columns
    const dbData = {
      id: session.id,
      personaId: session.personaId,
      userId: session.userId,
      currentStep: session.currentStep,
      stepsStatus: session.steps,
      sparkData: session.data.spark ? {
        name: session.data.spark.name,
        tagline: session.data.spark.tagline,
        description: session.data.spark.description,
        archetype: session.data.spark.archetype,
        suggestedTraits: session.data.spark.suggestedTraits,
        backstoryHook: session.data.spark.backstoryHook,
      } : null,
      visualData: session.data.visual ? {
        stylePreset: session.data.visual.stylePreset,
        variations: session.data.visual.variations,
        chosenIndex: session.data.visual.chosenIndex,
        visualDNA: session.data.visual.visualDNA,
      } : null,
      voiceData: session.data.voice ? {
        provider: session.data.voice.provider,
        voiceId: session.data.voice.voiceId,
        isCloned: session.data.voice.isCloned,
        samples: session.data.voice.samples,
      } : null,
      mindData: session.data.mind ? {
        traits: session.data.mind.traits,
        communicationStyle: session.data.mind.communicationStyle,
        // Convert knowledgeDomains to string[] for DB compatibility
        knowledgeDomains: session.data.mind.knowledgeDomains?.map((d: any) =>
          typeof d === 'string' ? d : d.domain
        ),
        backstory: session.data.mind.backstory,
        systemPrompt: session.data.mind.systemPrompt,
      } : null,
      totalCostUsd: session.metadata.totalCost,
      updatedAt: new Date(),
      expiresAt: new Date(session.metadata.expiresAt),
    };

    // Upsert - insert or update
    const existing = await db
      .select({ id: schema.personaWizardSessions.id })
      .from(schema.personaWizardSessions)
      .where(eq(schema.personaWizardSessions.id, session.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.personaWizardSessions)
        .set(dbData)
        .where(eq(schema.personaWizardSessions.id, session.id));
    } else {
      await db.insert(schema.personaWizardSessions).values({
        ...dbData,
        createdAt: new Date(),
      });
    }

    console.log(`[Session] ✅ Saved to database: ${session.id}`);
  },

  async load(sessionId: string): Promise<WizardSession | null> {
    console.log(`[Session] Loading from database: ${sessionId}`);

    const [row] = await db
      .select()
      .from(schema.personaWizardSessions)
      .where(eq(schema.personaWizardSessions.id, sessionId))
      .limit(1);

    if (!row) {
      console.log(`[Session] Not found in database: ${sessionId}`);
      return null;
    }

    // Check expiration
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      console.log(`[Session] Expired: ${sessionId}`);
      await this.delete(sessionId);
      return null;
    }

    // Reconstruct WizardSession from database row
    const session: WizardSession = {
      id: row.id,
      personaId: row.personaId || '',
      userId: row.userId,
      currentStep: row.currentStep as any,
      steps: (row.stepsStatus || {}) as any,
      data: {
        spark: row.sparkData as any,
        visual: row.visualData as any,
        voice: row.voiceData as any,
        mind: row.mindData as any,
        genome: undefined,
      },
      metadata: {
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        expiresAt: row.expiresAt?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
        totalCost: row.totalCostUsd || 0,
        totalTimeMs: 0,
      },
    };

    console.log(`[Session] ✅ Loaded from database: ${sessionId} (step: ${session.currentStep})`);
    return session;
  },

  async delete(sessionId: string): Promise<void> {
    console.log(`[Session] Deleting from database: ${sessionId}`);
    await db
      .delete(schema.personaWizardSessions)
      .where(eq(schema.personaWizardSessions.id, sessionId));
    console.log(`[Session] ✅ Deleted: ${sessionId}`);
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
    // Return the URL directly (images come from RunPod ComfyUI FLUX)
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
 *
 * GPU Provider: RunPod ONLY - No fallbacks
 * Uses ComfyUI with FLUX for state-of-the-art image generation.
 *
 * "Design is not just what it looks like. Design is how it works." — Steve Jobs
 */
function getIdentityPipeline(): IdentityLockPipeline {
  const runpodKey = process.env.RUNPOD_API_KEY;
  const runpodEndpoint = process.env.RUNPOD_ENDPOINT_ID;

  if (!runpodKey || !runpodEndpoint) {
    throw new Error("RunPod not configured (RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID required)");
  }

  console.log(`[Pipeline] Initializing with RunPod ComfyUI FLUX (${runpodEndpoint}) — State of the Art 2025`);

  return createIdentityLockPipeline({
    runpodApiKey: runpodKey,
    runpodEndpointId: runpodEndpoint,
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
          const urlPreview = v.imageUrl ? String(v.imageUrl).substring(0, 50) : '(no url)';
          console.log(`   [${i}] ${urlPreview}... (${v.generationTimeMs}ms, $${v.cost?.toFixed(4) || '0.0000'})`);
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

        // IMPORTANT: Save image to database NOW, don't wait for finalize
        // (finalize might fail if session is lost during hot reload)
        const imageUrl = visualDNA.faceEmbedding.sourceImageUrl;
        if (imageUrl) {
          console.log(`[Wizard] Saving primaryImageUrl to database: ${imageUrl.substring(0, 50)}...`);
          await db.update(schema.personas)
            .set({
              primaryImageUrl: imageUrl,
              expressionGrid: visualDNA.expressions as any,
              identityEmbedding: visualDNA.faceEmbedding.vector,
            })
            .where(eq(schema.personas.id, personaId));
          console.log(`[Wizard] Image saved to database!`);
        }

        result = {
          success: true,
          visualDNA: {
            primaryImageUrl: imageUrl,
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

        // Map genome data to the correct database columns
        // Note: Use only fields that properly map to DB columns
        await service.update({ userId, tier: "pro" }, personaId, {
          name: genome.metadata.name,
          tagline: genome.metadata.tagline,
          traits: genome.mindDNA?.traits || [],
          // Voice DNA
          voiceId: genome.voiceDNA?.voiceId || genome.voiceDNA?.identity?.voiceId,
          voiceProvider: genome.voiceDNA?.identity?.provider as "elevenlabs" | "coqui" | undefined,
          // Mind DNA - backstory is in identity object
          backstory: genome.mindDNA?.identity?.backstory,
          // Status
          status: "active",
        });

        // Also store the complete genome and visual data directly
        // These columns aren't in UpdatePersonaInput, so we update them directly
        await db.update(schema.personas)
          .set({
            // Complete genome for full reconstruction
            genome: {
              version: genome.metadata.version,
              visual: genome.visualDNA,
              voice: genome.voiceDNA,
              mind: genome.mindDNA,
              metadata: genome.metadata,
            },
            // Visual data
            visualStylePreset: genome.visualDNA?.stylePreset,
            primaryImageUrl: genome.metadata.avatarUrl,
            expressionGrid: genome.visualDNA?.expressions as any,
            identityEmbedding: genome.visualDNA?.faceEmbedding?.vector,
            referenceImages: genome.visualDNA?.faceEmbedding?.sourceImageUrl ? {
              primary: genome.visualDNA.faceEmbedding.sourceImageUrl,
            } : undefined,
            // Mind data
            systemPromptTemplate: genome.mindDNA?.systemPrompt,
            personalityMatrix: genome.mindDNA?.personality as any,
            speakingStyle: genome.voiceDNA?.speakingStyle as any,
            knowledgeDomains: genome.mindDNA?.knowledgeDomains as any,
            // Voice data
            voiceProfile: genome.voiceDNA?.characteristics as any,
            voiceIsCloned: genome.voiceDNA?.identity?.cloneSource ? true : false,
            // Activation
            activatedAt: new Date(),
          })
          .where(eq(schema.personas.id, personaId));
        
        // Store primary image as asset (optional - may fail if DB migration pending)
        if (genome.metadata.avatarUrl) {
          try {
            await service.addAsset({ userId, tier: "pro" }, personaId, {
              type: "image",
              subtype: "primary_portrait",
              url: genome.metadata.avatarUrl,
            });
            console.log("[Wizard] Primary image asset stored");
          } catch (assetError) {
            // Non-fatal: asset storage can fail if migration pending
            console.warn("[Wizard] Could not store asset (non-fatal):", (assetError as Error).message);
          }
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