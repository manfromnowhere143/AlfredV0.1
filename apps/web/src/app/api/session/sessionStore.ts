/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shared Session Store
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In-memory session storage shared across all session API routes.
 * In production, replace with Redis for cross-process session access.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface SessionData {
  personaId: string;
  personaName: string;
  personaImageUrl?: string;
  voiceId?: string;
  archetype?: string;
  createdAt: Date;
  lastActivity: Date;
  messageHistory?: Array<{ role: string; content: string }>;
}

// Shared session store - single instance across all imports
export const activeSessions = new Map<string, SessionData>();

// Session cleanup - remove sessions older than 1 hour
export function cleanupStaleSessions() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, session] of activeSessions.entries()) {
    if (session.lastActivity.getTime() < oneHourAgo) {
      console.log(`[SessionStore] Cleaning up stale session ${id}`);
      activeSessions.delete(id);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStaleSessions, 10 * 60 * 1000);
}
