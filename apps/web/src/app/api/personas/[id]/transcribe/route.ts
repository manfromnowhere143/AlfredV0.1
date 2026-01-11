/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA TRANSCRIPTION API
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Speech-to-Text endpoint using OpenAI Whisper.
 * Accepts audio from the user's microphone and returns transcribed text.
 *
 * Performance Target: <500ms for 5-second audio clips
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db, sessions, eq } from "@alfred/database";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
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
// API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/personas/[id]/transcribe
 *
 * Transcribe audio to text using OpenAI Whisper.
 *
 * Request: multipart/form-data with 'audio' file
 * Response: { text: string, duration: number, language: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();

  try {
    // Authenticate
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: personaId } = await params;

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper)
    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum 25MB." },
        { status: 400 }
      );
    }

    console.log(`[Transcribe] Processing audio for persona ${personaId}`);
    console.log(`[Transcribe] File: ${audioFile.name}, Size: ${audioFile.size} bytes, Type: ${audioFile.type}`);

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      language: "en", // Can be made dynamic based on persona config
    });

    const duration = Date.now() - startTime;

    console.log(`[Transcribe] Complete in ${duration}ms`);
    console.log(`[Transcribe] Text: "${transcription.text.substring(0, 100)}..."`);

    return NextResponse.json({
      success: true,
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      processingTime: duration,
    });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as Error;

    console.error(`[Transcribe] ERROR after ${duration}ms:`, err.message);

    // Handle specific OpenAI errors
    if (err.message?.includes("Invalid file format")) {
      return NextResponse.json(
        { error: "Invalid audio format. Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Transcription failed", details: err.message },
      { status: 500 }
    );
  }
}
