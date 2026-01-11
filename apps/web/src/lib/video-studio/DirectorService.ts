/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIRECTOR SERVICE - The Brain That Creates the Timeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes user's raw script and persona context → outputs DirectorJSON
 *
 * The LLM acts as a cinematic director, making decisions about:
 * - Script cadence and polish
 * - Emotional arcs
 * - SFX placement
 * - Music selection
 * - Camera moves
 * - Caption emphasis
 *
 * This is what transforms "just a video" into "Pixar would be proud"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  DirectorJSON,
  EmotionCurve,
  SFXEvent,
  MusicPlan,
  CameraPlan,
  CaptionPlan,
  DIRECTOR_SYSTEM_PROMPT,
} from "./DirectorTypes";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonaContext {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  temperament?: string;
  visualStyle?: string;
}

export interface DirectorRequest {
  rawScript: string;
  persona: PersonaContext;
  format: "tiktok_vertical" | "instagram_reel" | "youtube_short" | "youtube_standard";
  quality: "draft" | "standard" | "premium" | "cinematic";
  mood?: string;
  targetDuration?: number;  // seconds
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class DirectorService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model;
  }

  /**
   * Generate Director JSON from raw script
   */
  async generateDirectorJSON(request: DirectorRequest): Promise<DirectorJSON> {
    const { rawScript, persona, format, quality, mood, targetDuration } = request;

    // Estimate duration from word count (~150 words/minute)
    const wordCount = rawScript.split(/\s+/).length;
    const estimatedDuration = targetDuration || (wordCount / 150) * 60;

    // If no API key, return a heuristic-based director JSON
    if (!this.apiKey) {
      console.log("[Director] No API key, using heuristic generation");
      return this.generateHeuristicDirectorJSON(request, estimatedDuration);
    }

    // Build the prompt
    const userPrompt = this.buildUserPrompt(request, estimatedDuration);

    console.log("[Director] Generating Director JSON with LLM...");
    console.log(`[Director] Script: "${rawScript.substring(0, 100)}..."`);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[Director] LLM API error:", error);
        throw new Error(`Director LLM failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in LLM response");
      }

      // Parse the JSON response
      const directorJSON = this.parseDirectorJSON(content, request, estimatedDuration);

      console.log("[Director] Generated Director JSON successfully");
      return directorJSON;
    } catch (error) {
      console.error("[Director] Error generating with LLM:", error);
      // Fallback to heuristic
      return this.generateHeuristicDirectorJSON(request, estimatedDuration);
    }
  }

  /**
   * Build the user prompt for the LLM
   */
  private buildUserPrompt(request: DirectorRequest, estimatedDuration: number): string {
    const { rawScript, persona, format, quality, mood } = request;

    return `Create a Director JSON for this video:

**Persona:**
- Name: ${persona.name}
- Archetype: ${persona.archetype}
- Traits: ${persona.traits.join(", ")}
- Temperament: ${persona.temperament || "balanced"}

**Script:**
"${rawScript}"

**Requirements:**
- Format: ${format}
- Quality: ${quality}
- Mood hint: ${mood || "match persona archetype"}
- Estimated duration: ${estimatedDuration.toFixed(1)} seconds
- Word count: ${rawScript.split(/\s+/).length} words

**Output:**
Generate a complete DirectorJSON with:
1. polishedScript - rewrite for natural speech cadence
2. emotionCurve - keyframes for emotional journey (0-1 intensity)
3. sfxEvents - 2-5 sound effects at key moments
4. musicPlan - mood, genre, ducking settings
5. cameraPlan - subtle camera moves
6. captionPlan - style and 3-5 emphasis words

Return ONLY valid JSON, no markdown.`;
  }

  /**
   * Parse and validate the LLM response
   */
  private parseDirectorJSON(
    content: string,
    request: DirectorRequest,
    estimatedDuration: number
  ): DirectorJSON {
    // Clean the content (remove markdown if present)
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const parsed = JSON.parse(cleanContent);

      // Ensure required fields
      return {
        version: "1.0",
        personaId: request.persona.id,
        title: parsed.title || `${request.persona.name} Video`,
        rawScript: request.rawScript,
        polishedScript: parsed.polishedScript || request.rawScript,
        estimatedDuration,
        emotionCurve: this.validateEmotionCurve(parsed.emotionCurve),
        sfxEvents: this.validateSFXEvents(parsed.sfxEvents || []),
        musicPlan: this.validateMusicPlan(parsed.musicPlan),
        cameraPlan: this.validateCameraPlan(parsed.cameraPlan),
        captionPlan: this.validateCaptionPlan(parsed.captionPlan),
        format: request.format,
        quality: request.quality,
        fps: request.quality === "cinematic" ? 30 : 30,
        resolution: this.getResolution(request.format),
      };
    } catch (error) {
      console.error("[Director] Failed to parse LLM JSON:", error);
      throw error;
    }
  }

  /**
   * Generate Director JSON using heuristics (no LLM)
   */
  private generateHeuristicDirectorJSON(
    request: DirectorRequest,
    estimatedDuration: number
  ): DirectorJSON {
    const { rawScript, persona, format, quality, mood } = request;

    // Polish script (basic)
    const polishedScript = rawScript
      .replace(/([.!?])\s+/g, "$1... ") // Add pauses after sentences
      .replace(/,\s+/g, ", ") // Normalize commas
      .trim();

    // Generate emotion curve (simple arc)
    const emotionCurve: EmotionCurve = {
      defaultEmotion: this.getDefaultEmotion(persona.archetype),
      defaultIntensity: 0.5,
      keyframes: [
        { time: 0, emotion: "neutral", intensity: 0.4 },
        { time: estimatedDuration * 0.3, emotion: this.getDefaultEmotion(persona.archetype), intensity: 0.6 },
        { time: estimatedDuration * 0.7, emotion: this.getDefaultEmotion(persona.archetype), intensity: 0.9 },
        { time: estimatedDuration, emotion: "neutral", intensity: 0.5 },
      ],
    };

    // Generate SFX events
    const sfxEvents: SFXEvent[] = [
      { type: "whoosh", time: 0, volume: 0.25 },
      { type: "rise", time: estimatedDuration * 0.5, volume: 0.2 },
      { type: "impact", time: estimatedDuration * 0.7, volume: 0.3 },
    ];

    // Music plan
    const musicPlan: MusicPlan = {
      mood: (mood as any) || this.getMusicMood(persona.archetype),
      genre: this.getMusicGenre(persona.archetype),
      baseVolume: 0.15,
      duckToVolume: 0.05,
      duckAttackMs: 100,
      duckReleaseMs: 300,
    };

    // Camera plan
    const cameraPlan: CameraPlan = {
      baseAngle: "front",
      baseZoom: 1.0,
      keyframes: [
        { time: 0, move: "static", duration: estimatedDuration * 0.3 },
        { time: estimatedDuration * 0.5, move: "push_in", duration: estimatedDuration * 0.3, intensity: 0.1 },
        { time: estimatedDuration * 0.8, move: "static", duration: estimatedDuration * 0.2 },
      ],
    };

    // Caption plan with emphasis on longest words
    const words = rawScript.split(/\s+/);
    const emphasisWords = words
      .filter(w => w.length > 5)
      .slice(0, 4)
      .map(w => ({
        word: w.replace(/[.,!?]/g, ""),
        style: "bold" as const,
      }));

    const captionPlan: CaptionPlan = {
      style: "tiktok",
      animation: "pop",
      position: { x: 0.5, y: 0.75 },
      fontSize: "large",
      color: "#FFFFFF",
      strokeColor: "#000000",
      strokeWidth: 2,
      wordsPerGroup: 3,
      emphasisWords,
    };

    return {
      version: "1.0",
      personaId: persona.id,
      title: `${persona.name} Video`,
      rawScript,
      polishedScript,
      estimatedDuration,
      emotionCurve,
      sfxEvents,
      musicPlan,
      cameraPlan,
      captionPlan,
      format,
      quality,
      fps: 30,
      resolution: this.getResolution(format),
    };
  }

  /**
   * Validation helpers
   */
  private validateEmotionCurve(curve: any): EmotionCurve {
    if (!curve || !curve.keyframes) {
      return {
        defaultEmotion: "neutral",
        defaultIntensity: 0.5,
        keyframes: [],
      };
    }
    return curve;
  }

  private validateSFXEvents(events: any[]): SFXEvent[] {
    if (!Array.isArray(events)) return [];
    return events.filter(e => e.type && typeof e.time === "number");
  }

  private validateMusicPlan(plan: any): MusicPlan {
    return {
      mood: plan?.mood || "inspirational",
      genre: plan?.genre || "ambient",
      baseVolume: plan?.baseVolume || 0.15,
      duckToVolume: plan?.duckToVolume || 0.05,
      duckAttackMs: plan?.duckAttackMs || 100,
      duckReleaseMs: plan?.duckReleaseMs || 300,
    };
  }

  private validateCameraPlan(plan: any): CameraPlan {
    return {
      baseAngle: plan?.baseAngle || "front",
      baseZoom: plan?.baseZoom || 1.0,
      keyframes: plan?.keyframes || [],
    };
  }

  private validateCaptionPlan(plan: any): CaptionPlan {
    return {
      style: plan?.style || "tiktok",
      animation: plan?.animation || "pop",
      position: plan?.position || { x: 0.5, y: 0.75 },
      fontSize: plan?.fontSize || "large",
      color: plan?.color || "#FFFFFF",
      strokeColor: plan?.strokeColor || "#000000",
      strokeWidth: plan?.strokeWidth || 2,
      wordsPerGroup: plan?.wordsPerGroup || 3,
      emphasisWords: plan?.emphasisWords || [],
    };
  }

  private getResolution(format: string): { width: number; height: number } {
    const resolutions: Record<string, { width: number; height: number }> = {
      tiktok_vertical: { width: 1080, height: 1920 },
      instagram_reel: { width: 1080, height: 1920 },
      youtube_short: { width: 1080, height: 1920 },
      youtube_standard: { width: 1920, height: 1080 },
    };
    return resolutions[format] || resolutions.tiktok_vertical;
  }

  private getDefaultEmotion(archetype: string): string {
    const emotionMap: Record<string, string> = {
      sage: "thoughtful",
      hero: "confident",
      creator: "excited",
      caregiver: "warm",
      ruler: "commanding",
      jester: "playful",
      rebel: "intense",
      lover: "passionate",
      explorer: "curious",
      innocent: "joyful",
      magician: "mysterious",
    };
    return emotionMap[archetype?.toLowerCase()] || "neutral";
  }

  private getMusicMood(archetype: string): string {
    const moodMap: Record<string, string> = {
      sage: "peaceful",
      hero: "epic",
      creator: "inspirational",
      caregiver: "peaceful",
      ruler: "dramatic",
      jester: "happy",
      rebel: "energetic",
      lover: "dramatic",
      explorer: "inspirational",
      innocent: "happy",
      magician: "mysterious",
    };
    return moodMap[archetype?.toLowerCase()] || "inspirational";
  }

  private getMusicGenre(archetype: string): string {
    const genreMap: Record<string, string> = {
      sage: "ambient",
      hero: "orchestral",
      creator: "electronic",
      caregiver: "piano",
      ruler: "orchestral",
      jester: "electronic",
      rebel: "rock",
      lover: "piano",
      explorer: "cinematic",
      innocent: "acoustic",
      magician: "ambient",
    };
    return genreMap[archetype?.toLowerCase()] || "cinematic";
  }
}

// Export singleton
export const directorService = new DirectorService();
