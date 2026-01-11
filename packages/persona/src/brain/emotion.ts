/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA BRAIN: EMOTION DETECTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Detects user emotions and manages persona emotional state.
 * Enables empathetic, contextually-aware responses.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EmotionState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionDetectionResult {
  /** Primary detected emotion */
  primary: EmotionState;
  /** Confidence score 0-1 */
  confidence: number;
  /** Secondary emotion if mixed */
  secondary?: EmotionState;
  /** Emotion intensity 0-1 */
  intensity: number;
  /** Detected sentiment polarity -1 to 1 */
  sentimentPolarity: number;
  /** Raw sentiment scores */
  sentimentScores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  /** Detected intent categories */
  intents: string[];
}

export interface EmotionalStateTransition {
  from: EmotionState;
  to: EmotionState;
  trigger: string;
  timestamp: Date;
}

export interface PersonaEmotionalState {
  current: EmotionState;
  intensity: number;
  mood: EmotionState; // Longer-term baseline
  history: EmotionalStateTransition[];
  stabilityScore: number; // How stable is the current emotion
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION KEYWORDS & PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_PATTERNS: Record<EmotionState, {
  keywords: string[];
  phrases: RegExp[];
  emojis: string[];
}> = {
  happy: {
    keywords: [
      'happy', 'glad', 'joyful', 'excited', 'thrilled', 'delighted', 'pleased',
      'wonderful', 'amazing', 'fantastic', 'great', 'awesome', 'love', 'loving',
      'yay', 'woohoo', 'celebrate', 'celebration', 'success', 'won', 'winning'
    ],
    phrases: [
      /can't wait/i,
      /so (happy|excited|thrilled)/i,
      /this is (great|amazing|wonderful)/i,
      /thank(s| you)/i,
      /made my day/i,
      /love (this|it|that)/i,
    ],
    emojis: ['😊', '😄', '🥰', '😍', '🎉', '🙌', '❤️', '💕', '✨', '🎊'],
  },
  sad: {
    keywords: [
      'sad', 'unhappy', 'depressed', 'down', 'blue', 'miserable', 'heartbroken',
      'crying', 'tears', 'disappointed', 'devastating', 'hopeless', 'lonely',
      'grief', 'grieving', 'loss', 'lost', 'miss', 'missing', 'gone'
    ],
    phrases: [
      /feel(ing)? (so )?(sad|down|blue|depressed)/i,
      /breaks my heart/i,
      /can't stop crying/i,
      /I (miss|lost)/i,
      /so (hard|difficult|tough)/i,
      /don't know what to do/i,
    ],
    emojis: ['😢', '😭', '💔', '😞', '😔', '🥺', '😿'],
  },
  angry: {
    keywords: [
      'angry', 'mad', 'furious', 'outraged', 'frustrated', 'annoyed', 'irritated',
      'pissed', 'upset', 'hate', 'hating', 'rage', 'raging', 'infuriating',
      'unacceptable', 'ridiculous', 'stupid', 'idiotic'
    ],
    phrases: [
      /so (angry|mad|frustrated)/i,
      /piss(es|ed) me off/i,
      /can't believe/i,
      /sick (of|and tired)/i,
      /fed up/i,
      /drives me (crazy|nuts|insane)/i,
      /what the (hell|heck|fuck)/i,
    ],
    emojis: ['😠', '😡', '🤬', '💢', '👿', '🔥'],
  },
  surprised: {
    keywords: [
      'surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'unexpected',
      'wow', 'whoa', 'omg', 'unbelievable', 'incredible', 'no way'
    ],
    phrases: [
      /can't believe/i,
      /didn't (see|expect)/i,
      /out of nowhere/i,
      /completely unexpected/i,
      /blew my mind/i,
      /what(\?|!)+/i,
      /really\?+/i,
    ],
    emojis: ['😮', '😲', '😱', '🤯', '😳', '🙀', '‼️'],
  },
  thoughtful: {
    keywords: [
      'thinking', 'wondering', 'considering', 'pondering', 'contemplating',
      'curious', 'interesting', 'intriguing', 'perhaps', 'maybe', 'might',
      'could', 'question', 'questioning', 'reflect', 'reflecting'
    ],
    phrases: [
      /I (wonder|think|believe)/i,
      /what if/i,
      /have you (ever )?considered/i,
      /it makes (me )?(think|wonder)/i,
      /I'm (not )?sure (if|whether)/i,
      /on one hand/i,
      /let me (think|consider)/i,
    ],
    emojis: ['🤔', '💭', '🧐', '💡', '📚'],
  },
  excited: {
    keywords: [
      'excited', 'thrilled', 'pumped', 'stoked', 'hyped', 'eager', 'enthusiastic',
      'can\'t wait', 'looking forward', 'anticipating', 'ready', 'let\'s go'
    ],
    phrases: [
      /can't wait/i,
      /so (excited|pumped|hyped|stoked)/i,
      /looking forward/i,
      /let's (do|go|start)/i,
      /bring it on/i,
      /here we go/i,
    ],
    emojis: ['🎉', '🚀', '⚡', '🔥', '💪', '✨', '🎊'],
  },
  calm: {
    keywords: [
      'calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'content', 'satisfied',
      'okay', 'alright', 'fine', 'good', 'balanced', 'centered'
    ],
    phrases: [
      /at peace/i,
      /feeling (calm|relaxed|good)/i,
      /no worries/i,
      /all (good|is well)/i,
      /taking it easy/i,
      /it's (fine|okay|alright)/i,
    ],
    emojis: ['😌', '🧘', '☮️', '🌿', '🍃', '😊'],
  },
  confident: {
    keywords: [
      'confident', 'sure', 'certain', 'convinced', 'know', 'definitely',
      'absolutely', 'without doubt', 'guaranteed', 'positive', 'assertive'
    ],
    phrases: [
      /I (know|am sure|am certain)/i,
      /no doubt/i,
      /definitely/i,
      /100 (percent|%)/i,
      /trust me/i,
      /I can (do|handle)/i,
    ],
    emojis: ['💪', '👊', '🎯', '✅', '💯'],
  },
  curious: {
    keywords: [
      'curious', 'interested', 'intrigued', 'wondering', 'want to know',
      'tell me', 'how', 'why', 'what', 'explain', 'learn', 'discover'
    ],
    phrases: [
      /I('m| am) curious/i,
      /want to (know|learn|understand)/i,
      /tell me (more|about)/i,
      /how (does|do|did|can|could)/i,
      /why (does|do|did|is|are)/i,
      /what (is|are|does|do|if)/i,
    ],
    emojis: ['🤔', '❓', '🔍', '👀', '📖'],
  },
  concerned: {
    keywords: [
      'worried', 'concerned', 'anxious', 'nervous', 'uneasy', 'afraid',
      'scared', 'fear', 'fearing', 'trouble', 'problem', 'issue', 'wrong'
    ],
    phrases: [
      /I('m| am) (worried|concerned|afraid)/i,
      /something('s| is) wrong/i,
      /what if/i,
      /I (hope|pray)/i,
      /scared (that|of)/i,
      /keep(s)? me up at night/i,
    ],
    emojis: ['😟', '😰', '😥', '🥺', '💭'],
  },
  neutral: {
    keywords: [],
    phrases: [],
    emojis: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class EmotionDetector {
  /**
   * Detect emotion from text
   */
  detect(text: string): EmotionDetectionResult {
    const scores: Record<EmotionState, number> = {
      neutral: 0.1, // Base score
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      thoughtful: 0,
      excited: 0,
      calm: 0,
      confident: 0,
      curious: 0,
      concerned: 0,
    };

    const lowercaseText = text.toLowerCase();
    const words = lowercaseText.split(/\s+/);

    // Check each emotion pattern
    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
      if (emotion === 'neutral') continue;

      // Keyword matching
      for (const keyword of patterns.keywords) {
        if (lowercaseText.includes(keyword)) {
          scores[emotion as EmotionState] += 0.15;
        }
      }

      // Phrase matching (stronger signal)
      for (const phrase of patterns.phrases) {
        if (phrase.test(text)) {
          scores[emotion as EmotionState] += 0.3;
        }
      }

      // Emoji matching (very strong signal)
      for (const emoji of patterns.emojis) {
        if (text.includes(emoji)) {
          scores[emotion as EmotionState] += 0.4;
        }
      }
    }

    // Check for intensifiers
    const intensifiers = ['very', 'so', 'really', 'extremely', 'incredibly', 'absolutely'];
    const hasIntensifier = intensifiers.some(i => lowercaseText.includes(i));
    if (hasIntensifier) {
      for (const emotion of Object.keys(scores) as EmotionState[]) {
        if (emotion !== 'neutral' && scores[emotion] > 0) {
          scores[emotion] *= 1.3;
        }
      }
    }

    // Check for negation (can flip meaning)
    const negationPatterns = [
      /not (happy|sad|angry|excited|worried)/i,
      /don't feel (good|great|bad)/i,
      /no longer/i,
    ];
    
    for (const pattern of negationPatterns) {
      if (pattern.test(text)) {
        // Reduce matched emotion, boost opposite
        // This is simplified; real NLP would be more nuanced
        for (const emotion of Object.keys(scores) as EmotionState[]) {
          if (scores[emotion] > 0.2) {
            scores[emotion] *= 0.5;
          }
        }
      }
    }

    // Calculate sentiment
    const sentimentScores = this.calculateSentiment(text);

    // Find primary and secondary emotions
    const sortedEmotions = (Object.entries(scores) as [EmotionState, number][])
      .sort((a, b) => b[1] - a[1]);

    const primary = sortedEmotions[0]?.[0] ?? "neutral";
    const primaryScore = sortedEmotions[0]?.[1] ?? 0;
    const secondary = (sortedEmotions[1]?.[1] ?? 0) > 0.2 ? sortedEmotions[1]?.[0] : undefined;

    // Normalize confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = Math.min(1, primaryScore / Math.max(totalScore, 1));

    // Calculate intensity
    const intensity = Math.min(1, primaryScore / 1.5);

    // Detect intents
    const intents = this.detectIntents(text);

    return {
      primary,
      confidence,
      secondary,
      intensity,
      sentimentPolarity: sentimentScores.positive - sentimentScores.negative,
      sentimentScores,
      intents,
    };
  }

  /**
   * Calculate basic sentiment scores
   */
  private calculateSentiment(text: string): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    const positiveWords = [
      'good', 'great', 'awesome', 'amazing', 'wonderful', 'excellent', 'fantastic',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'delighted', 'thankful', 'grateful',
      'beautiful', 'perfect', 'best', 'better', 'nice', 'helpful', 'kind'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike',
      'angry', 'sad', 'disappointed', 'frustrated', 'annoyed', 'upset',
      'wrong', 'problem', 'issue', 'fail', 'failed', 'broken', 'difficult'
    ];

    const lowercaseText = text.toLowerCase();
    const words = lowercaseText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount || 1;

    return {
      positive: positiveCount / total,
      negative: negativeCount / total,
      neutral: 1 - (positiveCount + negativeCount) / Math.max(words.length, 1),
    };
  }

  /**
   * Detect user intents from text
   */
  private detectIntents(text: string): string[] {
    const intents: string[] = [];
    const lowercaseText = text.toLowerCase();

    // Question detection
    if (/\?/.test(text) || /^(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does)/i.test(text)) {
      intents.push('question');
    }

    // Help seeking
    if (/help|assist|support|guide|explain|show me how/i.test(lowercaseText)) {
      intents.push('help_seeking');
    }

    // Venting/sharing
    if (/just (want|need) to (talk|vent|share)|need someone to listen/i.test(lowercaseText)) {
      intents.push('venting');
    }

    // Greeting
    if (/^(hi|hello|hey|good (morning|afternoon|evening)|greetings)/i.test(text)) {
      intents.push('greeting');
    }

    // Farewell
    if (/(bye|goodbye|see you|talk (to you )?later|gotta go|have to go)/i.test(lowercaseText)) {
      intents.push('farewell');
    }

    // Gratitude
    if (/thank(s| you)|appreciate|grateful/i.test(lowercaseText)) {
      intents.push('gratitude');
    }

    // Opinion seeking
    if (/what do you think|your opinion|do you (think|believe)|thoughts on/i.test(lowercaseText)) {
      intents.push('opinion_seeking');
    }

    // Recommendation seeking
    if (/recommend|suggest|should I|what should/i.test(lowercaseText)) {
      intents.push('recommendation');
    }

    // Confirmation
    if (/^(yes|yeah|yep|sure|okay|ok|correct|right|exactly)/i.test(text)) {
      intents.push('confirmation');
    }

    // Denial
    if (/^(no|nope|nah|not really|I don't think so)/i.test(text)) {
      intents.push('denial');
    }

    return intents;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA EMOTIONAL STATE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export class PersonaEmotionalStateManager {
  private state: PersonaEmotionalState;
  private detector: EmotionDetector;

  constructor(initialEmotion: EmotionState = 'neutral') {
    this.detector = new EmotionDetector();
    this.state = {
      current: initialEmotion,
      intensity: 0.5,
      mood: initialEmotion,
      history: [],
      stabilityScore: 0.8,
    };
  }

  /**
   * Get current emotional state
   */
  getState(): PersonaEmotionalState {
    return { ...this.state };
  }

  /**
   * Update emotional state based on user input
   */
  respondToUserEmotion(userText: string): EmotionState {
    const userEmotion = this.detector.detect(userText);

    // Persona's emotional response depends on their temperament
    // For now, use empathetic mirroring with some stability

    let newEmotion = this.state.current;
    let newIntensity = this.state.intensity;

    // If user shows strong emotion, persona responds
    if (userEmotion.confidence > 0.5 && userEmotion.intensity > 0.3) {
      // Map user emotions to persona responses
      const responseMap: Partial<Record<EmotionState, EmotionState>> = {
        happy: 'happy',
        sad: 'concerned',
        angry: 'calm',
        surprised: 'curious',
        excited: 'excited',
        curious: 'thoughtful',
        concerned: 'calm',
      };

      const responseEmotion = responseMap[userEmotion.primary];
      if (responseEmotion) {
        newEmotion = responseEmotion;
        newIntensity = userEmotion.intensity * 0.8; // Slightly dampened
      }
    }

    // Apply transition
    if (newEmotion !== this.state.current) {
      this.transition(newEmotion, `User showed ${userEmotion.primary}`);
    }

    return this.state.current;
  }

  /**
   * Transition to a new emotional state
   */
  transition(newEmotion: EmotionState, trigger: string): void {
    const transition: EmotionalStateTransition = {
      from: this.state.current,
      to: newEmotion,
      trigger,
      timestamp: new Date(),
    };

    this.state.history.push(transition);

    // Keep only last 10 transitions
    if (this.state.history.length > 10) {
      this.state.history = this.state.history.slice(-10);
    }

    // Update current state
    this.state.current = newEmotion;

    // Update stability based on frequency of changes
    const recentChanges = this.state.history.filter(
      h => Date.now() - h.timestamp.getTime() < 60000 // Last minute
    ).length;
    this.state.stabilityScore = Math.max(0.2, 1 - (recentChanges * 0.15));

    // Slowly update mood (long-term baseline)
    // This would typically use weighted averaging over longer period
  }

  /**
   * Decay intensity over time
   */
  decay(factor: number = 0.95): void {
    this.state.intensity *= factor;

    // If intensity is very low, drift toward neutral
    if (this.state.intensity < 0.2 && this.state.current !== 'neutral') {
      this.transition('neutral', 'Intensity decay');
    }
  }

  /**
   * Get appropriate emotional response for context
   */
  getResponseEmotion(context: {
    userEmotion: EmotionState;
    topic?: string;
    personaTemperament?: string;
  }): EmotionState {
    // This is a simplified model
    // Real implementation would consider persona's full emotional profile

    const { userEmotion, personaTemperament } = context;

    // Empathetic response patterns
    if (personaTemperament === 'empathetic') {
      return userEmotion; // Mirror user
    }

    if (personaTemperament === 'calm') {
      return 'calm'; // Stay calm regardless
    }

    if (personaTemperament === 'energetic') {
      return userEmotion === 'sad' ? 'concerned' : 'excited';
    }

    // Default: measured response
    return this.state.current;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createEmotionDetector(): EmotionDetector {
  return new EmotionDetector();
}

export function createEmotionalStateManager(
  initialEmotion?: EmotionState
): PersonaEmotionalStateManager {
  return new PersonaEmotionalStateManager(initialEmotion);
}
