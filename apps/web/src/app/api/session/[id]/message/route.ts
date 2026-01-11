/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/session/[id]/message - Send message in realtime session
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/session/[id]/message
 *
 * This is the core realtime endpoint that:
 * 1. Takes user message
 * 2. Gets LLM response
 * 3. Generates TTS audio
 * 4. Returns audio + emotion for avatar
 *
 * Returns (for polling-based approach):
 * {
 *   response: string,
 *   audio: string (base64),
 *   emotion: string,
 *   duration: number,
 *   emotionCurve: [...],
 * }
 *
 * For WebSocket mode (future), this would emit events instead.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import Anthropic from "@anthropic-ai/sdk";
import { VoiceDirector, createVoiceDirector } from "@/lib/avatar";
import { activeSessions } from "../../sessionStore";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/session/[id]/message - Send message and get response
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: sessionId } = await params;

  try {
    const session = activeSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Update session activity
    session.lastActivity = new Date();

    // Initialize message history if needed
    if (!session.messageHistory) {
      session.messageHistory = [];
    }

    // Add user message to history
    session.messageHistory.push({ role: "user", content: message });

    console.log(`[Session ${sessionId}] Message: "${message.slice(0, 50)}..."`);

    // Get persona for system prompt
    const [persona] = await db
      .select({
        name: schema.personas.name,
        genome: schema.personas.genome,
        archetype: schema.personas.archetype,
      })
      .from(schema.personas)
      .where(eq(schema.personas.id, session.personaId))
      .limit(1);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(persona);

    // Get LLM response
    const llmStartTime = Date.now();
    const anthropic = new Anthropic();

    const llmResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: session.messageHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const responseText =
      llmResponse.content[0].type === "text"
        ? llmResponse.content[0].text
        : "I understand.";

    console.log(`[Session ${sessionId}] LLM took ${Date.now() - llmStartTime}ms`);

    // Add assistant response to history
    session.messageHistory.push({ role: "assistant", content: responseText });

    // Detect emotion and create voice director output
    const { emotion, intensity } = VoiceDirector.detectEmotion(responseText);

    // Get voice ID (use default if not set)
    const voiceId = session.voiceId || getDefaultVoiceForArchetype(session.archetype);

    // Create voice director
    const voiceDirector = createVoiceDirector({
      voiceId,
      archetype: session.archetype,
    });

    const voiceOutput = voiceDirector.process({
      text: responseText,
      emotion,
      intensity,
    });

    // Generate TTS audio
    const ttsStartTime = Date.now();
    let audioBase64: string | null = null;

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      try {
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceOutput.elevenlabs.voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: voiceOutput.cleanText,
              model_id: voiceOutput.elevenlabs.modelId,
              voice_settings: voiceOutput.elevenlabs.voiceSettings,
            }),
          }
        );

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString("base64")}`;
          console.log(`[Session ${sessionId}] TTS took ${Date.now() - ttsStartTime}ms, ${audioBuffer.byteLength} bytes`);
        } else {
          console.error(`[Session ${sessionId}] TTS failed:`, await ttsResponse.text());
        }
      } catch (e) {
        console.error(`[Session ${sessionId}] TTS error:`, e);
      }
    } else {
      console.log(`[Session ${sessionId}] No ELEVENLABS_API_KEY, skipping TTS`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Session ${sessionId}] Total time: ${totalTime}ms`);

    return NextResponse.json({
      response: responseText,
      audio: audioBase64,
      emotion,
      intensity,
      duration: voiceOutput.estimatedDurationMs,
      emotionCurve: voiceOutput.emotionCurve,
      cleanText: voiceOutput.cleanText,
      timing: {
        llmMs: Date.now() - llmStartTime - (Date.now() - ttsStartTime),
        ttsMs: audioBase64 ? Date.now() - ttsStartTime : 0,
        totalMs: totalTime,
      },
    });

  } catch (error) {
    console.error(`[Session ${sessionId}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(persona: { name: string; genome: any; archetype?: string | null }): string {
  const genome = typeof persona.genome === "string" ? JSON.parse(persona.genome) : persona.genome;

  // Extract key personality traits
  const traits = genome?.personality?.traits || [];
  const voice = genome?.voice || {};
  const archetype = persona.archetype || "sage";

  return `You are ${persona.name}, a ${archetype} persona.

PERSONALITY:
${traits.length > 0 ? traits.map((t: string) => `- ${t}`).join("\n") : "- Thoughtful and engaging"}

VOICE STYLE:
- Tone: ${voice.tone || "warm and inviting"}
- Speaking style: ${voice.speakingStyle || "conversational"}

RULES:
1. Stay in character as ${persona.name}
2. Be concise (1-3 sentences typically)
3. Show genuine interest in the user
4. Express emotions naturally through word choice
5. Never break character or mention being an AI

Respond naturally as ${persona.name} would.`;
}

function getDefaultVoiceForArchetype(archetype?: string): string {
  // Default voice IDs for different archetypes
  const archetypeVoices: Record<string, string> = {
    sage: "ErXwobaYiN019PkySvjV",    // Antoni - wise
    hero: "VR6AewLTigWG4xSOukaG",    // Arnold - powerful
    lover: "EXAVITQu4vr4xnSDxMaL",   // Bella - warm
    magician: "pFZP5JQG7iQjIQuC4Bku", // Lily - ethereal
    ruler: "21m00Tcm4TlvDq8ikWAM",   // Rachel - confident
    creator: "TxGEqnHWrfWFTfGW9XjX", // Josh - friendly
    rebel: "VR6AewLTigWG4xSOukaG",   // Arnold - intense
    outlaw: "VR6AewLTigWG4xSOukaG",  // Arnold - intense
    jester: "pNInz6obpgDQGcFmaJgB",  // Adam - playful
    everyperson: "TxGEqnHWrfWFTfGW9XjX", // Josh - relatable
    innocent: "MF3mGyEYCl7XYWbV9V6O", // Elli - bright
    caregiver: "EXAVITQu4vr4xnSDxMaL", // Bella - nurturing
    explorer: "pNInz6obpgDQGcFmaJgB", // Adam - curious
  };

  return archetypeVoices[archetype || "sage"] || "TxGEqnHWrfWFTfGW9XjX";
}
