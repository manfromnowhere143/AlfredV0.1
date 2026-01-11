/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/session - Realtime Session Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/session - Create a new realtime session
 *
 * Returns:
 * - sessionId: Unique session identifier
 * - wsUrl: WebSocket URL for events (placeholder - needs custom server)
 * - personaConfig: Persona configuration for the avatar
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db, sessions, eq } from "@alfred/database";
import * as schema from "@alfred/database";
import { activeSessions } from "./sessionStore";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
// POST /api/session - Create new realtime session
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);

    // DEV MODE: Allow without auth
    if (!userId && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json({ error: "personaId is required" }, { status: 400 });
    }

    // Get persona details
    const [persona] = await db
      .select({
        id: schema.personas.id,
        name: schema.personas.name,
        imageUrl: schema.personas.primaryImageUrl,
        voiceId: schema.personas.voiceId,
        archetype: schema.personas.archetype,
      })
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Create session
    const sessionId = uuidv4();

    activeSessions.set(sessionId, {
      personaId,
      personaName: persona.name,
      personaImageUrl: persona.imageUrl || undefined,
      voiceId: persona.voiceId || undefined,
      archetype: persona.archetype || undefined,
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    // Build WebSocket URL (placeholder - Next.js doesn't support WS natively)
    // In production, you'd use a separate WebSocket server (e.g., Socket.io, ws on custom server)
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3005";
    const wsProtocol = protocol === "https" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${host}/api/session/${sessionId}/events`;

    console.log(`[Session] Created session ${sessionId} for persona ${persona.name}`);

    return NextResponse.json({
      sessionId,
      wsUrl,
      personaConfig: {
        id: persona.id,
        name: persona.name,
        imageUrl: persona.imageUrl,
        voiceId: persona.voiceId,
        archetype: persona.archetype,
      },
      status: "active",
      note: "WebSocket endpoint is a placeholder. Use polling via /api/session/[id]/message for now.",
    });

  } catch (error) {
    console.error("[Session] Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/session - List active sessions (for debugging)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Only in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const sessionList = Array.from(activeSessions.entries()).map(([id, data]) => ({
    sessionId: id,
    personaName: data.personaName,
    createdAt: data.createdAt,
    lastActivity: data.lastActivity,
  }));

  return NextResponse.json({ sessions: sessionList });
}

