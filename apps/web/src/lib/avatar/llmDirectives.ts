/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LLM DIRECTIVES - Control avatar performance from AI responses
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Extracts animation directives from LLM output to drive avatar behavior.
 * The LLM outputs structured control signals alongside speech.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Emotion, Gesture, AvatarPerformance } from './store';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LLMDirective {
  speech: string;
  emotion: Emotion;
  energy: number;
  gesture: Gesture;
  beats?: Array<{ t: number; action: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT FOR LLM
// ═══════════════════════════════════════════════════════════════════════════════

export const AVATAR_CONTROL_SYSTEM_PROMPT = `
You are controlling a real-time animated avatar. For every response, you MUST output valid JSON with these fields:

{
  "speech": "What the avatar says (the actual response)",
  "emotion": "One of: neutral, happy, sad, angry, surprised, curious, focused, playful, concerned, confident",
  "energy": 0.0 to 1.0 (how intense the expression should be),
  "gesture": "One of: none, nod, shake, tilt_left, tilt_right, look_up, look_down, shrug, lean_in, lean_back",
  "beats": [optional array of timed actions like {"t": 0.5, "action": "blink"}, {"t": 1.2, "action": "nod"}]
}

Guidelines:
- Keep speech natural and conversational
- Match emotion to the content being spoken
- Use energy 0.3-0.7 for normal conversation, 0.8+ for excitement, 0.1-0.3 for subdued
- Use gestures sparingly for emphasis
- Add beats for natural behavior during longer responses

Example output:
{
  "speech": "That's a really interesting question! Let me think about that for a moment.",
  "emotion": "curious",
  "energy": 0.65,
  "gesture": "tilt_right",
  "beats": [{"t": 0.8, "action": "blink"}, {"t": 2.0, "action": "nod"}]
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse LLM response for directives (structured JSON output)
 */
export function parseLLMDirective(response: string): LLMDirective | null {
  try {
    // Try to parse as JSON directly
    const parsed = JSON.parse(response);
    return validateDirective(parsed);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateDirective(parsed);
      } catch {
        // Fall through to heuristic parsing
      }
    }
  }

  // Fallback: heuristic parsing from natural text
  return parseHeuristic(response);
}

/**
 * Validate and sanitize parsed directive
 */
function validateDirective(parsed: any): LLMDirective | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const validEmotions: Emotion[] = [
    'neutral', 'happy', 'sad', 'angry', 'surprised',
    'curious', 'focused', 'playful', 'concerned', 'confident'
  ];

  const validGestures: Gesture[] = [
    'none', 'nod', 'shake', 'tilt_left', 'tilt_right',
    'look_up', 'look_down', 'shrug', 'lean_in', 'lean_back'
  ];

  return {
    speech: typeof parsed.speech === 'string' ? parsed.speech : '',
    emotion: validEmotions.includes(parsed.emotion) ? parsed.emotion : 'neutral',
    energy: typeof parsed.energy === 'number'
      ? Math.max(0, Math.min(1, parsed.energy))
      : 0.5,
    gesture: validGestures.includes(parsed.gesture) ? parsed.gesture : 'none',
    beats: Array.isArray(parsed.beats) ? parsed.beats : [],
  };
}

/**
 * Heuristic parsing from natural text (fallback)
 */
function parseHeuristic(text: string): LLMDirective {
  // Extract emotion markers from text
  let emotion: Emotion = 'neutral';
  let energy = 0.5;
  let gesture: Gesture = 'none';

  // Clean text of tags
  let speech = text
    .replace(/\[EMOTION:\w+\]/gi, '')
    .replace(/\[ACTION:[^\]]+\]/gi, '')
    .replace(/\*[^*]+\*/g, '')
    .trim();

  // Detect emotion from tags
  const emotionMatch = text.match(/\[EMOTION:(\w+)\]/i);
  if (emotionMatch) {
    const detected = emotionMatch[1].toLowerCase();
    const emotionMap: Record<string, Emotion> = {
      happy: 'happy',
      joy: 'happy',
      excited: 'happy',
      sad: 'sad',
      melancholy: 'sad',
      angry: 'angry',
      frustrated: 'angry',
      surprised: 'surprised',
      curious: 'curious',
      thoughtful: 'focused',
      contemplative: 'focused',
      confident: 'confident',
      playful: 'playful',
      concerned: 'concerned',
      worried: 'concerned',
    };
    emotion = emotionMap[detected] || 'neutral';
  }

  // Detect emotion from content
  const lowerText = text.toLowerCase();
  if (!emotionMatch) {
    if (lowerText.includes('!') || lowerText.includes('amazing') || lowerText.includes('great')) {
      emotion = 'happy';
      energy = 0.7;
    } else if (lowerText.includes('sorry') || lowerText.includes('unfortunately')) {
      emotion = 'sad';
      energy = 0.4;
    } else if (lowerText.includes('?') && lowerText.includes('what') || lowerText.includes('how')) {
      emotion = 'curious';
      energy = 0.6;
    } else if (lowerText.includes('think') || lowerText.includes('consider')) {
      emotion = 'focused';
      energy = 0.5;
    }
  }

  // Detect gesture from action tags
  const actionMatch = text.match(/\[ACTION:([^\]]+)\]/i);
  if (actionMatch) {
    const action = actionMatch[1].toLowerCase();
    if (action.includes('nod')) gesture = 'nod';
    else if (action.includes('shake')) gesture = 'shake';
    else if (action.includes('tilt')) gesture = action.includes('left') ? 'tilt_left' : 'tilt_right';
    else if (action.includes('shrug')) gesture = 'shrug';
    else if (action.includes('lean')) gesture = action.includes('in') || action.includes('forward') ? 'lean_in' : 'lean_back';
  }

  return {
    speech,
    emotion,
    energy,
    gesture,
    beats: [],
  };
}

/**
 * Convert directive to AvatarPerformance for store
 */
export function directiveToPerformance(directive: LLMDirective): AvatarPerformance {
  return {
    emotion: directive.emotion,
    energy: directive.energy,
    gesture: directive.gesture,
    beats: directive.beats || [],
  };
}

/**
 * Clean speech text of all tags for TTS
 */
export function cleanSpeechForTTS(text: string): string {
  return text
    .replace(/\[EMOTION:\w+\]/gi, '')
    .replace(/\[ACTION:[^\]]+\]/gi, '')
    .replace(/\[PAUSE:[^\]]+\]/gi, '')
    .replace(/\[TONE:[^\]]+\]/gi, '')
    .replace(/\[GESTURE:[^\]]+\]/gi, '')
    .replace(/\*[^*]+\*/g, '')
    .replace(/_[^_]+_/g, '')
    .replace(/\([^)]{1,50}\)/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  parseLLMDirective,
  directiveToPerformance,
  cleanSpeechForTTS,
  AVATAR_CONTROL_SYSTEM_PROMPT,
};
