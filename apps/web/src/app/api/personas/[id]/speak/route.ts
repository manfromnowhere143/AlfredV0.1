/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /api/personas/[id]/speak - Text-to-Speech for Persona
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STATE-OF-THE-ART: ElevenLabs TTS with emotion-aware voice modulation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from "next/server";
import { db, eq, sessions } from "@alfred/database";
import * as schema from "@alfred/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get user ID from session cookie (same method as wizard route)
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
// VOICE LIBRARY — State-of-the-art voice selection
// ═══════════════════════════════════════════════════════════════════════════════

// ElevenLabs premium voices with characteristics
const VOICE_LIBRARY = {
  // Male voices
  male: {
    deep: {
      id: "ErXwobaYiN019PkySvjV", // Antoni - deep, wise
      name: "Antoni",
      traits: ["wise", "commanding", "mysterious", "authoritative"],
    },
    warm: {
      id: "TxGEqnHWrfWFTfGW9XjX", // Josh - warm, friendly
      name: "Josh",
      traits: ["friendly", "calm", "trustworthy", "nurturing"],
    },
    intense: {
      id: "VR6AewLTigWG4xSOukaG", // Arnold - intense, powerful
      name: "Arnold",
      traits: ["powerful", "fierce", "rebellious", "bold"],
    },
    youthful: {
      id: "pNInz6obpgDQGcFmaJgB", // Adam - youthful, energetic
      name: "Adam",
      traits: ["playful", "energetic", "curious", "adventurous"],
    },
  },
  // Female voices
  female: {
    warm: {
      id: "EXAVITQu4vr4xnSDxMaL", // Bella - warm, gentle
      name: "Bella",
      traits: ["gentle", "nurturing", "empathetic", "calm"],
    },
    confident: {
      id: "21m00Tcm4TlvDq8ikWAM", // Rachel - confident, professional
      name: "Rachel",
      traits: ["confident", "professional", "commanding", "wise"],
    },
    energetic: {
      id: "MF3mGyEYCl7XYWbV9V6O", // Elli - bright, energetic
      name: "Elli",
      traits: ["playful", "energetic", "joyful", "innocent"],
    },
    sultry: {
      id: "AZnzlk1XvdvUeBnXmlld", // Domi - bold, intense
      name: "Domi",
      traits: ["passionate", "bold", "mysterious", "seductive"],
    },
  },
  // Ethereal/non-binary voices (for divine/mystical personas)
  ethereal: {
    divine: {
      id: "pFZP5JQG7iQjIQuC4Bku", // Lily - ethereal, otherworldly
      name: "Lily",
      traits: ["divine", "mystical", "ancient", "magical"],
    },
    androgynous: {
      id: "SOYHLrjzK2X1ezoPC6cr", // Harry - androgynous, mysterious
      name: "Harry",
      traits: ["mysterious", "wise", "timeless", "transformative"],
    },
  },
};

// Archetype to voice characteristic mapping
const ARCHETYPE_VOICE_MAP: Record<string, { gender: "male" | "female" | "ethereal"; style: string; traits: string[] }> = {
  sage: { gender: "male", style: "deep", traits: ["wise", "calm", "thoughtful"] },
  hero: { gender: "male", style: "intense", traits: ["bold", "commanding", "powerful"] },
  creator: { gender: "female", style: "confident", traits: ["creative", "visionary", "inspiring"] },
  caregiver: { gender: "female", style: "warm", traits: ["nurturing", "gentle", "empathetic"] },
  ruler: { gender: "male", style: "deep", traits: ["authoritative", "commanding", "powerful"] },
  jester: { gender: "male", style: "youthful", traits: ["playful", "energetic", "joyful"] },
  rebel: { gender: "male", style: "intense", traits: ["fierce", "rebellious", "bold"] },
  lover: { gender: "female", style: "sultry", traits: ["passionate", "romantic", "seductive"] },
  explorer: { gender: "male", style: "warm", traits: ["adventurous", "curious", "friendly"] },
  innocent: { gender: "female", style: "energetic", traits: ["innocent", "joyful", "hopeful"] },
  magician: { gender: "ethereal", style: "divine", traits: ["mystical", "transformative", "magical"] },
  outlaw: { gender: "male", style: "intense", traits: ["rebellious", "fierce", "independent"] },
};

/**
 * Intelligently select a voice based on persona characteristics
 */
function selectVoiceForPersona(archetype: string, name: string): string {
  // Get archetype mapping
  const mapping = ARCHETYPE_VOICE_MAP[archetype?.toLowerCase()] || ARCHETYPE_VOICE_MAP.sage;

  // Check if name suggests a specific gender (basic heuristics)
  const femaleNamePatterns = /^(sarah|emma|sophia|isabella|mia|charlotte|amelia|harper|evelyn|abigail|emily|elizabeth|sofia|avery|ella|scarlett|grace|lily|aria|riley|zoey|nora|layla|aurora|camila|eleanor|lucy|stella|violet|savannah|aubrey|brooklyn|maya|willow|madeline|claire|elena|natalie|hael|medusa|athena|hera|aphrodite|persephone|demeter|artemis|selene|hecate|circe|calypso|pandora|psyche|aurora|luna|stella|nova|celeste|seraphina|evangeline|arabella|ophelia|cordelia|rosalind|miranda|portia|helena|hermione|galadriel|arwen|eowyn|leia|padme|rey|ahsoka|sabine|hera|kira|yennefer|ciri|triss)/i;
  const maleNamePatterns = /^(james|john|michael|william|david|richard|joseph|thomas|charles|christopher|daniel|matthew|anthony|mark|donald|steven|paul|andrew|joshua|kenneth|kevin|brian|george|timothy|ronald|edward|jason|jeffrey|ryan|jacob|gary|nicholas|eric|jonathan|stephen|larry|justin|scott|brandon|benjamin|samuel|raymond|gregory|frank|alexander|patrick|jack|dennis|jerry|tyler|aaron|jose|adam|nathan|henry|douglas|zachary|peter|kyle|noah|ethan|jeremy|walter|christian|keith|roger|terry|austin|sean|gerald|carl|dylan|harold|jordan|jesse|bryan|lawrence|arthur|gabriel|bruce|albert|willie|alan|eugene|russell|vincent|philip|bobby|johnny|bradley|harel|satan|lucifer|zeus|poseidon|hades|apollo|ares|hermes|dionysus|hephaestus|thor|odin|loki|freya|tyr|heimdall|baldur|fenrir|kratos|gandalf|aragorn|legolas|gimli|frodo|sam|merry|pippin|boromir|faramir|theoden|eomer|elrond|gollum|sauron|saruman|geralt|vesemir|dandelion|emhyr|eredin)/i;

  let suggestedGender = mapping.gender;

  if (femaleNamePatterns.test(name)) {
    suggestedGender = "female";
  } else if (maleNamePatterns.test(name)) {
    suggestedGender = "male";
  }

  // Select voice based on gender and style
  const voiceCategory = VOICE_LIBRARY[suggestedGender];
  if (!voiceCategory) {
    return VOICE_LIBRARY.male.deep.id; // Fallback
  }

  const voice = voiceCategory[mapping.style as keyof typeof voiceCategory];
  if (voice) {
    return voice.id;
  }

  // Fallback to first voice in category
  const firstKey = Object.keys(voiceCategory)[0] as keyof typeof voiceCategory;
  return voiceCategory[firstKey].id;
}

// ElevenLabs voice settings per emotion
const EMOTION_VOICE_SETTINGS: Record<string, { stability: number; similarity_boost: number; style?: number }> = {
  neutral: { stability: 0.5, similarity_boost: 0.75 },
  happy: { stability: 0.3, similarity_boost: 0.8, style: 0.7 },
  sad: { stability: 0.7, similarity_boost: 0.6, style: 0.3 },
  angry: { stability: 0.2, similarity_boost: 0.9, style: 0.8 },
  surprised: { stability: 0.25, similarity_boost: 0.85, style: 0.6 },
  thoughtful: { stability: 0.6, similarity_boost: 0.7, style: 0.4 },
  excited: { stability: 0.2, similarity_boost: 0.85, style: 0.9 },
  calm: { stability: 0.8, similarity_boost: 0.6, style: 0.2 },
  confident: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
  curious: { stability: 0.4, similarity_boost: 0.75, style: 0.5 },
  concerned: { stability: 0.55, similarity_boost: 0.7, style: 0.4 },
  amused: { stability: 0.35, similarity_boost: 0.8, style: 0.65 },
};

// POST /api/personas/[id]/speak - Generate speech
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: personaId } = await params;
    const userId = await getUserFromRequest(request);

    // DEV MODE: Allow without auth for easier testing
    if (!userId && process.env.NODE_ENV !== "development") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { text, emotion = "neutral", voiceId } = body;

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch persona to get voice settings
    const [persona] = await db
      .select()
      .from(schema.personas)
      .where(eq(schema.personas.id, personaId))
      .limit(1);

    if (!persona) {
      return new Response(JSON.stringify({ error: "Persona not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify ownership (skip in dev mode without auth)
    if (userId && persona.userId !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get voice ID - intelligent selection based on persona characteristics
    let targetVoiceId = voiceId || persona.voiceId;

    // If no voice configured, intelligently select based on archetype and name
    if (!targetVoiceId) {
      targetVoiceId = selectVoiceForPersona(persona.archetype || "sage", persona.name);
      console.log(`[Speak] Auto-selected voice for ${persona.name} (${persona.archetype}): ${targetVoiceId}`);
    }

    // Get ElevenLabs API key
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      console.log("[Speak] ElevenLabs not configured, returning text only");
      return new Response(
        JSON.stringify({
          text,
          emotion,
          audio: null,
          message: "Voice not configured",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Speak] Generating speech for "${persona.name}"`);
    console.log(`[Speak] Voice: ${targetVoiceId}, Emotion: ${emotion}`);
    console.log(`[Speak] Text: "${text.substring(0, 50)}..."`);

    // Get emotion-based voice settings
    const voiceSettings = EMOTION_VOICE_SETTINGS[emotion] || EMOTION_VOICE_SETTINGS.neutral;

    // Clean text - remove ALL tags and action markers for natural speech
    const cleanText = text
      // Remove [TAG:content] style markers (handles multi-word content)
      .replace(/\[EMOTION:[^\]]+\]/gi, "")
      .replace(/\[ACTION:[^\]]+\]/gi, "")
      .replace(/\[PAUSE:[^\]]+\]/gi, "")
      .replace(/\[TONE:[^\]]+\]/gi, "")
      .replace(/\[GESTURE:[^\]]+\]/gi, "")
      // Remove *asterisk actions* and _underscore actions_
      .replace(/\*[^*]+\*/g, "")
      .replace(/_[^_]+_/g, "")
      // Remove stage directions in parentheses (brief ones)
      .replace(/\([^)]{1,50}\)/g, "")
      // Clean up multiple spaces and newlines
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Call ElevenLabs TTS
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style || 0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error("[Speak] ElevenLabs error:", error);
      return new Response(
        JSON.stringify({
          text,
          emotion,
          audio: null,
          error: "Speech synthesis failed",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert audio to base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    console.log(`[Speak] Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(
      JSON.stringify({
        text: cleanText,
        emotion,
        audio: `data:audio/mpeg;base64,${audioBase64}`,
        voiceId: targetVoiceId,
        duration: estimateAudioDuration(cleanText),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Speak] Error:", error);
    return new Response(JSON.stringify({ error: "Speech failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Estimate audio duration based on text length (~150 words per minute)
function estimateAudioDuration(text: string): number {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60; // seconds
}
