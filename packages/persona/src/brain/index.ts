/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BRAIN ENGINE MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Intelligence, memory, and emotion processing for personas.
 * Phase 4 implementation.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  Persona,
  PersonaMemory,
  EmotionState,
  ChatStreamEvent,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BrainProcessingOptions {
  maxTokens?: number;
  temperature?: number;
  includeMemories?: boolean;
  maxMemories?: number;
  /** Enable personality anchoring to prevent drift */
  enableAnchoring?: boolean;
  /** Reinforce identity every N messages */
  anchorInterval?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY ANCHORING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
//
// Prevents personality drift over long conversations by:
// 1. Storing immutable identity markers
// 2. Tracking consistency scores per message
// 3. Injecting reinforcement periodically
// 4. Detecting and correcting drift in real-time
//
// Inspired by OpenAI's system message reinforcement and
// Anthropic's character consistency research.
//
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Immutable identity anchor for a persona
 * These traits should NEVER change during conversation
 */
export interface PersonalityAnchor {
  /** Core identity statement (who they ARE) */
  coreIdentity: string;
  /** Phrases this persona would NEVER say */
  boundaryPhrases: string[];
  /** Characteristic phrases they frequently use */
  signaturePhrases: string[];
  /** Non-negotiable personality traits */
  immutableTraits: string[];
  /** Speaking patterns that define them */
  speechPatterns: {
    sentenceLength: 'short' | 'medium' | 'long' | 'varied';
    vocabulary: 'simple' | 'moderate' | 'sophisticated' | 'technical';
    emotionalExpression: 'reserved' | 'moderate' | 'expressive';
    humorStyle: 'none' | 'dry' | 'playful' | 'sarcastic';
  };
  /** Emotional baseline (their "resting" emotional state) */
  emotionalBaseline: EmotionState;
  /** Topics they always engage with enthusiastically */
  passionTopics: string[];
  /** Topics they avoid or deflect */
  avoidanceTopics: string[];
}

/**
 * Real-time consistency tracking
 */
export interface ConsistencyMetrics {
  /** Messages since last anchor reinforcement */
  messagesSinceAnchor: number;
  /** Overall consistency score (0-1) */
  consistencyScore: number;
  /** Detected drift indicators */
  driftIndicators: Array<{
    type: 'vocabulary' | 'emotion' | 'topic' | 'tone';
    severity: 'minor' | 'moderate' | 'severe';
    message: string;
    timestamp: string;
  }>;
  /** Successful corrections made */
  corrections: number;
  /** Last anchor reinforcement timestamp */
  lastAnchorReinforcement: string;
}

/**
 * Personality Anchor Manager
 * Maintains persona consistency throughout conversations
 */
export class PersonalityAnchorManager {
  private anchors: Map<string, PersonalityAnchor> = new Map();
  private metrics: Map<string, ConsistencyMetrics> = new Map();

  /**
   * Create anchor from persona definition
   */
  createAnchor(persona: Persona): PersonalityAnchor {
    const traits = persona.traits || [];
    const archetype = persona.archetype || 'sage';

    // Build signature phrases from traits and archetype
    const signaturePhrases = this.generateSignaturePhrases(persona);
    const boundaryPhrases = this.generateBoundaryPhrases(persona);

    const anchor: PersonalityAnchor = {
      coreIdentity: `You are ${persona.name}${persona.tagline ? `, ${persona.tagline}` : ''}. Your archetype is ${archetype}. ${persona.backstory?.slice(0, 200) || ''}`,
      boundaryPhrases,
      signaturePhrases,
      immutableTraits: traits.slice(0, 5), // Top 5 traits are immutable
      speechPatterns: this.inferSpeechPatterns(persona),
      emotionalBaseline: (persona.currentMood as EmotionState) || 'neutral',
      passionTopics: (persona.knowledgeDomains || []).map(d =>
        typeof d === 'string' ? d : d.domain
      ),
      avoidanceTopics: [], // Can be customized
    };

    this.anchors.set(persona.id, anchor);
    this.initializeMetrics(persona.id);

    return anchor;
  }

  /**
   * Get anchor for persona
   */
  getAnchor(personaId: string): PersonalityAnchor | undefined {
    return this.anchors.get(personaId);
  }

  /**
   * Build reinforcement injection for system prompt
   */
  buildAnchorReinforcement(personaId: string): string {
    const anchor = this.anchors.get(personaId);
    if (!anchor) return '';

    const metrics = this.metrics.get(personaId);
    if (metrics) {
      metrics.messagesSinceAnchor = 0;
      metrics.lastAnchorReinforcement = new Date().toISOString();
    }

    return `
[IDENTITY ANCHOR - REINFORCEMENT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORE IDENTITY: ${anchor.coreIdentity}

IMMUTABLE TRAITS: ${anchor.immutableTraits.join(', ')}

SPEECH PATTERNS:
- Sentence length: ${anchor.speechPatterns.sentenceLength}
- Vocabulary level: ${anchor.speechPatterns.vocabulary}
- Emotional expression: ${anchor.speechPatterns.emotionalExpression}
- Humor style: ${anchor.speechPatterns.humorStyle}

SIGNATURE PHRASES (use naturally):
${anchor.signaturePhrases.map(p => `• "${p}"`).join('\n')}

BOUNDARY PHRASES (NEVER use these):
${anchor.boundaryPhrases.map(p => `✗ "${p}"`).join('\n')}

EMOTIONAL BASELINE: ${anchor.emotionalBaseline}
Return to this baseline when conversation shifts topics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stay true to who you are. Let your personality shine authentically.
`;
  }

  /**
   * Check if reinforcement is needed
   */
  needsReinforcement(personaId: string, interval: number = 5): boolean {
    const metrics = this.metrics.get(personaId);
    if (!metrics) return true;

    return metrics.messagesSinceAnchor >= interval || metrics.consistencyScore < 0.7;
  }

  /**
   * Track message and update metrics
   */
  trackMessage(personaId: string, response: string): void {
    const metrics = this.metrics.get(personaId);
    if (!metrics) return;

    metrics.messagesSinceAnchor++;

    // Check for drift indicators
    const anchor = this.anchors.get(personaId);
    if (anchor) {
      const driftCheck = this.detectDrift(response, anchor);
      if (driftCheck.hasDrift) {
        metrics.driftIndicators.push(...driftCheck.indicators);
        metrics.consistencyScore = Math.max(0, metrics.consistencyScore - 0.1);
      } else {
        // Reward consistency
        metrics.consistencyScore = Math.min(1, metrics.consistencyScore + 0.02);
      }
    }
  }

  /**
   * Get current metrics for persona
   */
  getMetrics(personaId: string): ConsistencyMetrics | undefined {
    return this.metrics.get(personaId);
  }

  /**
   * Detect personality drift in response
   */
  private detectDrift(
    response: string,
    anchor: PersonalityAnchor
  ): { hasDrift: boolean; indicators: ConsistencyMetrics['driftIndicators'] } {
    const indicators: ConsistencyMetrics['driftIndicators'] = [];
    const lowerResponse = response.toLowerCase();

    // Check for boundary phrase violations
    for (const phrase of anchor.boundaryPhrases) {
      if (lowerResponse.includes(phrase.toLowerCase())) {
        indicators.push({
          type: 'vocabulary',
          severity: 'severe',
          message: `Used forbidden phrase: "${phrase}"`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check vocabulary consistency
    const wordCount = response.split(/\s+/).length;
    const avgWordLength = response.replace(/\s+/g, '').length / wordCount;

    if (anchor.speechPatterns.vocabulary === 'simple' && avgWordLength > 7) {
      indicators.push({
        type: 'vocabulary',
        severity: 'minor',
        message: 'Using overly complex vocabulary for simple-speech persona',
        timestamp: new Date().toISOString(),
      });
    }

    if (anchor.speechPatterns.vocabulary === 'sophisticated' && avgWordLength < 4.5) {
      indicators.push({
        type: 'vocabulary',
        severity: 'minor',
        message: 'Using overly simple vocabulary for sophisticated-speech persona',
        timestamp: new Date().toISOString(),
      });
    }

    // Check sentence length patterns
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0) / sentences.length;

    if (anchor.speechPatterns.sentenceLength === 'short' && avgSentenceLength > 15) {
      indicators.push({
        type: 'tone',
        severity: 'minor',
        message: 'Using longer sentences than character typically would',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      hasDrift: indicators.length > 0,
      indicators,
    };
  }

  /**
   * Generate signature phrases from persona
   */
  private generateSignaturePhrases(persona: Persona): string[] {
    const archetype = persona.archetype || 'sage';
    const archetypePhrases: Record<string, string[]> = {
      sage: ['Consider this...', 'In my experience...', 'The wisdom here is...'],
      hero: ['We can do this together.', 'I believe in you.', 'Let\'s face this head-on.'],
      creator: ['Imagine if we...', 'What if we tried...', 'I can see it taking shape...'],
      caregiver: ['I\'m here for you.', 'How can I help?', 'Take your time.'],
      ruler: ['Here\'s what we\'ll do.', 'I\'ve decided.', 'Follow my lead.'],
      jester: ['Here\'s a fun thought...', 'Why so serious?', 'Life\'s too short!'],
      rebel: ['Rules are meant to be broken.', 'Question everything.', 'I refuse to conform.'],
      lover: ['What a beautiful moment...', 'I feel connected to...', 'My heart says...'],
      explorer: ['Let\'s discover...', 'I wonder what\'s...', 'Adventure awaits!'],
      innocent: ['Everything will work out.', 'I believe in you!', 'What a wonderful...'],
      magician: ['Watch closely...', 'Everything is possible.', 'I shall transform...'],
      outlaw: ['I don\'t play by rules.', 'Freedom is taken.', 'My own path.'],
    };

    return archetypePhrases[archetype] || archetypePhrases.sage;
  }

  /**
   * Generate boundary phrases (things persona should NEVER say)
   */
  private generateBoundaryPhrases(persona: Persona): string[] {
    const archetype = persona.archetype || 'sage';

    // Generic AI phrases no persona should use
    const genericAIPhrases = [
      'As an AI',
      'I\'m just a language model',
      'I don\'t have feelings',
      'I cannot help with that',
    ];

    // Archetype-specific boundaries
    const archetypeBoundaries: Record<string, string[]> = {
      sage: ['I don\'t know anything about that', 'That\'s stupid'],
      hero: ['I give up', 'That\'s impossible', 'I\'m too scared'],
      creator: ['That\'s boring', 'Creativity is overrated'],
      caregiver: ['That\'s not my problem', 'Figure it out yourself'],
      ruler: ['I\'m not sure', 'Whatever you think', 'I don\'t care'],
      jester: ['This is very serious', 'No jokes allowed'],
      rebel: ['I always follow rules', 'Authority is always right'],
      lover: ['I feel nothing', 'Emotions are weakness'],
      explorer: ['I\'d rather stay here', 'That sounds boring'],
      innocent: ['People are terrible', 'Nothing good happens'],
      magician: ['Magic isn\'t real', 'That\'s impossible'],
      outlaw: ['I respect authority', 'Rules exist for good reason'],
    };

    return [...genericAIPhrases, ...(archetypeBoundaries[archetype] || [])];
  }

  /**
   * Infer speech patterns from persona
   */
  private inferSpeechPatterns(persona: Persona): PersonalityAnchor['speechPatterns'] {
    const traits = (persona.traits || []).join(' ').toLowerCase();
    const commStyle = persona.communicationStyle || 'moderate';

    return {
      sentenceLength:
        traits.includes('concise') || traits.includes('direct') ? 'short' :
        traits.includes('verbose') || traits.includes('detailed') ? 'long' : 'medium',
      vocabulary:
        traits.includes('intellectual') || traits.includes('sophisticated') ? 'sophisticated' :
        traits.includes('simple') || traits.includes('casual') ? 'simple' :
        traits.includes('technical') ? 'technical' : 'moderate',
      emotionalExpression:
        traits.includes('reserved') || traits.includes('stoic') ? 'reserved' :
        traits.includes('passionate') || traits.includes('expressive') ? 'expressive' : 'moderate',
      humorStyle:
        traits.includes('serious') ? 'none' :
        traits.includes('witty') || traits.includes('sarcastic') ? 'sarcastic' :
        traits.includes('playful') || traits.includes('fun') ? 'playful' : 'dry',
    };
  }

  /**
   * Initialize metrics for persona
   */
  private initializeMetrics(personaId: string): void {
    this.metrics.set(personaId, {
      messagesSinceAnchor: 0,
      consistencyScore: 1.0,
      driftIndicators: [],
      corrections: 0,
      lastAnchorReinforcement: new Date().toISOString(),
    });
  }
}

// Global anchor manager instance
export const personalityAnchorManager = new PersonalityAnchorManager();

export interface SystemPromptContext {
  persona: Persona;
  memories: PersonaMemory[];
  userEmotion?: EmotionState;
  sessionFacts?: string[];
}

export interface MemoryQuery {
  personaId: string;
  query: string;
  limit?: number;
  minImportance?: number;
}

export interface EmotionDetectionResult {
  emotion: EmotionState;
  confidence: number;
  intensity: number;
}

export interface BrainOutput {
  text: string;
  emotion: EmotionState;
  isComplete: boolean;
  action?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the system prompt for persona interactions
 */
export function buildPersonaSystemPrompt(context: SystemPromptContext): string {
  const { persona, memories, userEmotion, sessionFacts } = context;

  const sections: string[] = [];

  // Identity section
  sections.push(`# PERSONA IDENTITY
You are ${persona.name}${persona.archetype ? `, ${persona.archetype}` : ''}.
${persona.tagline ? `\n${persona.tagline}` : ''}
${persona.backstory ? `\n## BACKSTORY\n${persona.backstory}` : ''}`);

  // Traits section
  if (persona.traits && persona.traits.length > 0) {
    sections.push(`## CORE TRAITS
${persona.traits.map((t) => `- ${t}`).join('\n')}`);
  }

  // Personality section
  if (persona.temperament || persona.communicationStyle) {
    sections.push(`## PERSONALITY
${persona.temperament ? `- Temperament: ${persona.temperament}` : ''}
${persona.communicationStyle ? `- Communication Style: ${persona.communicationStyle}` : ''}`);
  }

  // Speaking style section
  if (persona.speakingStyle) {
    const style = persona.speakingStyle;
    sections.push(`## SPEAKING STYLE
${style.rules?.map((r) => `- ${r}`).join('\n') || ''}

${style.examples?.length ? `Example phrases:\n${style.examples.map((e) => `"${e}"`).join('\n')}` : ''}`);
  }

  // Knowledge domains
  if (persona.knowledgeDomains && persona.knowledgeDomains.length > 0) {
    sections.push(`## AREAS OF EXPERTISE
${persona.knowledgeDomains.map((k) => `- ${k.domain} (${k.level})`).join('\n')}`);
  }

  // Memories section
  if (memories.length > 0) {
    sections.push(`## RELEVANT MEMORIES
${memories.map((m) => `- ${m.content}`).join('\n')}`);
  }

  // Session facts
  if (sessionFacts && sessionFacts.length > 0) {
    sections.push(`## THIS SESSION
${sessionFacts.map((f) => `- ${f}`).join('\n')}`);
  }

  // Current state section
  sections.push(`## CURRENT STATE
- Your mood: ${persona.currentMood || 'neutral'}
${userEmotion ? `- User seems: ${userEmotion}` : ''}`);

  // Response guidelines
  sections.push(`## RESPONSE GUIDELINES
- Stay in character as ${persona.name} at all times
- Include emotion tags for voice/animation: [EMOTION:happy], [EMOTION:thoughtful], etc.
- Include action tags when appropriate: [ACTION:nods], [ACTION:smiles], etc.
- Be authentic to your personality and backstory
- Engage naturally with the user's emotional state`);

  return sections.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED EMOTION DETECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
//
// State-of-the-art emotion detection using:
// 1. LLM-based semantic analysis (primary)
// 2. Multi-dimensional emotion modeling (Plutchik + VAD)
// 3. Context-aware temporal tracking
// 4. Fast keyword fallback for low-latency scenarios
//
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended emotion detection result with multi-dimensional analysis
 */
export interface AdvancedEmotionResult extends EmotionDetectionResult {
  /** Secondary emotions detected */
  secondaryEmotions: Array<{ emotion: EmotionState; intensity: number }>;
  /** Valence-Arousal-Dominance coordinates */
  vad: {
    valence: number;    // -1 (negative) to 1 (positive)
    arousal: number;    // 0 (calm) to 1 (excited)
    dominance: number;  // 0 (submissive) to 1 (dominant)
  };
  /** Temporal emotion trend */
  trend: 'improving' | 'stable' | 'declining';
  /** Detected emotion triggers in text */
  triggers: string[];
  /** Analysis method used */
  method: 'llm' | 'hybrid' | 'fallback';
}

/**
 * Conversation context for emotion tracking
 */
export interface EmotionContext {
  /** Recent messages (last 5) */
  recentMessages: Array<{ role: 'user' | 'persona'; content: string; emotion?: EmotionState }>;
  /** Running emotional state */
  runningState: {
    dominantEmotion: EmotionState;
    emotionHistory: EmotionState[];
    stabilityScore: number;
  };
  /** User's typical emotional patterns */
  userPatterns?: {
    baseline: EmotionState;
    volatility: number;
    triggers: Record<string, EmotionState>;
  };
}

/**
 * LLM client interface for emotion detection
 */
export interface EmotionLLMClient {
  complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string>;
}

/**
 * Advanced Emotion Detector
 *
 * Uses LLM-based semantic analysis with keyword fallback
 * for state-of-the-art emotion understanding.
 */
export class AdvancedEmotionDetector {
  private llmClient?: EmotionLLMClient;
  private contextCache: Map<string, EmotionContext> = new Map();

  // Plutchik's wheel of emotions - mapped to our emotion states
  private readonly emotionWheel: Record<EmotionState, {
    opposite: EmotionState;
    adjacents: EmotionState[];
    vad: { valence: number; arousal: number; dominance: number };
  }> = {
    happy: { opposite: 'sad', adjacents: ['excited', 'calm'], vad: { valence: 0.8, arousal: 0.5, dominance: 0.6 } },
    sad: { opposite: 'happy', adjacents: ['concerned', 'thoughtful'], vad: { valence: -0.7, arousal: 0.2, dominance: 0.2 } },
    angry: { opposite: 'calm', adjacents: ['concerned', 'sad'], vad: { valence: -0.6, arousal: 0.9, dominance: 0.8 } },
    surprised: { opposite: 'neutral', adjacents: ['excited', 'curious'], vad: { valence: 0.2, arousal: 0.9, dominance: 0.3 } },
    thoughtful: { opposite: 'excited', adjacents: ['curious', 'calm'], vad: { valence: 0.3, arousal: 0.3, dominance: 0.5 } },
    excited: { opposite: 'thoughtful', adjacents: ['happy', 'surprised'], vad: { valence: 0.7, arousal: 0.9, dominance: 0.6 } },
    calm: { opposite: 'angry', adjacents: ['happy', 'thoughtful'], vad: { valence: 0.4, arousal: 0.1, dominance: 0.5 } },
    confident: { opposite: 'concerned', adjacents: ['happy', 'calm'], vad: { valence: 0.6, arousal: 0.4, dominance: 0.9 } },
    curious: { opposite: 'neutral', adjacents: ['excited', 'thoughtful'], vad: { valence: 0.5, arousal: 0.6, dominance: 0.4 } },
    concerned: { opposite: 'confident', adjacents: ['sad', 'thoughtful'], vad: { valence: -0.3, arousal: 0.5, dominance: 0.3 } },
    neutral: { opposite: 'surprised', adjacents: ['calm', 'thoughtful'], vad: { valence: 0, arousal: 0.3, dominance: 0.5 } },
  };

  // Sophisticated keyword patterns (regex-based for better matching)
  private readonly emotionPatterns: Record<EmotionState, RegExp[]> = {
    happy: [
      /\b(happy|joy(ful)?|delighted|pleased|glad|wonderful|fantastic|amazing|love(d|ly)?)\b/i,
      /\b(great|awesome|excellent|perfect|beautiful)\b/i,
      /😊|😃|😄|🥰|❤️|💕|🎉|✨/,
    ],
    sad: [
      /\b(sad|unhappy|depressed|down|disappointed|sorry|miss(ing)?|lonely)\b/i,
      /\b(terrible|awful|worst|heartbreak|grief|mourn)\b/i,
      /😢|😞|😔|💔|😿/,
    ],
    angry: [
      /\b(angry|furious|mad|frustrated|annoyed|irritated|pissed|outraged)\b/i,
      /\b(hate|despise|rage|livid|infuriated)\b/i,
      /😠|😡|🤬|💢/,
    ],
    surprised: [
      /\b(surprised|shocked|amazed|astonished|stunned|unexpected)\b/i,
      /\b(wow|whoa|omg|what\?!|really\?!)\b/i,
      /😮|😲|🤯|😱/,
    ],
    thoughtful: [
      /\b(think(ing)?|consider(ing)?|ponder(ing)?|reflect(ing)?|contemplate)\b/i,
      /\b(hmm+|interesting|fascinating|intriguing)\b/i,
      /🤔|💭|🧐/,
    ],
    excited: [
      /\b(excited|thrilled|pumped|stoked|eager|can't wait|hyped)\b/i,
      /\b(amazing|incredible|unbelievable|mind-blowing)\b/i,
      /🎉|🙌|🔥|⚡|🚀/,
    ],
    calm: [
      /\b(calm|peaceful|relaxed|serene|tranquil|content|at ease)\b/i,
      /\b(chill|mellow|zen|balanced)\b/i,
      /😌|🧘|☮️|🌿/,
    ],
    confident: [
      /\b(confident|sure|certain|definitely|absolutely|positive|convinced)\b/i,
      /\b(know|guarantee|promise|without doubt)\b/i,
      /💪|👍|✅|🎯/,
    ],
    curious: [
      /\b(curious|wonder(ing)?|interested|intrigued|want to know)\b/i,
      /\b(what if|how (come|do)|why (is|does)|tell me more)\b/i,
      /❓|🔍|👀/,
    ],
    concerned: [
      /\b(worried|concerned|anxious|nervous|uneasy|troubled|afraid)\b/i,
      /\b(fear|scared|dread|apprehensive)\b/i,
      /😟|😰|😨|🥺/,
    ],
    neutral: [],
  };

  constructor(llmClient?: EmotionLLMClient) {
    this.llmClient = llmClient;
  }

  /**
   * Set LLM client for advanced detection
   */
  setLLMClient(client: EmotionLLMClient): void {
    this.llmClient = client;
  }

  /**
   * Detect emotion with full context awareness
   */
  async detectAdvanced(
    text: string,
    sessionId?: string,
    options?: { useLLM?: boolean; conversationHistory?: string[] }
  ): Promise<AdvancedEmotionResult> {
    const useLLM = options?.useLLM !== false && this.llmClient;

    // Get or create context
    const context = sessionId ? this.getOrCreateContext(sessionId) : undefined;

    // Try LLM-based detection first (most accurate)
    if (useLLM) {
      try {
        const llmResult = await this.detectWithLLM(text, options?.conversationHistory || []);
        if (context) {
          this.updateContext(sessionId!, text, 'user', llmResult.emotion);
        }
        return {
          ...llmResult,
          trend: this.calculateTrend(context),
          method: 'llm',
        };
      } catch (error) {
        console.warn('[EmotionDetector] LLM detection failed, using hybrid fallback:', error);
      }
    }

    // Hybrid detection (patterns + context)
    const patternResult = this.detectWithPatterns(text);
    const contextualResult = this.applyContextualAdjustment(patternResult, context);

    if (context) {
      this.updateContext(sessionId!, text, 'user', contextualResult.emotion);
    }

    return {
      ...contextualResult,
      trend: this.calculateTrend(context),
      method: context ? 'hybrid' : 'fallback',
    };
  }

  /**
   * Simple synchronous detection (backwards compatible)
   */
  detect(text: string): EmotionDetectionResult {
    const result = this.detectWithPatterns(text);
    return {
      emotion: result.emotion,
      confidence: result.confidence,
      intensity: result.intensity,
    };
  }

  /**
   * LLM-based emotion detection with reasoning
   */
  private async detectWithLLM(
    text: string,
    conversationHistory: string[]
  ): Promise<AdvancedEmotionResult> {
    const contextStr = conversationHistory.length > 0
      ? `Recent conversation:\n${conversationHistory.slice(-5).join('\n')}\n\n`
      : '';

    const prompt = `Analyze the emotional content of this message with precision.

${contextStr}Current message to analyze:
"${text}"

Provide your analysis in this exact JSON format:
{
  "primary": {
    "emotion": "one of: happy, sad, angry, surprised, thoughtful, excited, calm, confident, curious, concerned, neutral",
    "confidence": 0.0 to 1.0,
    "intensity": 0.0 to 1.0
  },
  "secondary": [
    {"emotion": "emotion_name", "intensity": 0.0 to 1.0}
  ],
  "vad": {
    "valence": -1.0 to 1.0,
    "arousal": 0.0 to 1.0,
    "dominance": 0.0 to 1.0
  },
  "triggers": ["words or phrases that indicate the emotion"],
  "reasoning": "brief explanation"
}

Focus on:
1. Explicit emotional expressions
2. Implicit sentiment and tone
3. Context from conversation history
4. Cultural and linguistic nuances

Respond ONLY with the JSON, no other text.`;

    const response = await this.llmClient!.complete(prompt, { maxTokens: 500, temperature: 0.3 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        emotion: parsed.primary.emotion as EmotionState,
        confidence: parsed.primary.confidence,
        intensity: parsed.primary.intensity,
        secondaryEmotions: parsed.secondary || [],
        vad: parsed.vad || this.emotionWheel[parsed.primary.emotion as EmotionState]?.vad || { valence: 0, arousal: 0.3, dominance: 0.5 },
        triggers: parsed.triggers || [],
        trend: 'stable',
        method: 'llm',
      };
    } catch (parseError) {
      console.warn('[EmotionDetector] Failed to parse LLM response:', parseError);
      throw parseError;
    }
  }

  /**
   * Pattern-based emotion detection (fast fallback)
   */
  private detectWithPatterns(text: string): AdvancedEmotionResult {
    const scores: Record<EmotionState, { count: number; triggers: string[] }> = {
      happy: { count: 0, triggers: [] },
      sad: { count: 0, triggers: [] },
      angry: { count: 0, triggers: [] },
      surprised: { count: 0, triggers: [] },
      thoughtful: { count: 0, triggers: [] },
      excited: { count: 0, triggers: [] },
      calm: { count: 0, triggers: [] },
      confident: { count: 0, triggers: [] },
      curious: { count: 0, triggers: [] },
      concerned: { count: 0, triggers: [] },
      neutral: { count: 0.1, triggers: [] },
    };

    // Check each emotion's patterns
    for (const [emotion, patterns] of Object.entries(this.emotionPatterns)) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          scores[emotion as EmotionState].count += matches.length;
          scores[emotion as EmotionState].triggers.push(...matches);
        }
      }
    }

    // Find primary emotion
    let primaryEmotion: EmotionState = 'neutral';
    let maxScore = 0;
    let allTriggers: string[] = [];

    for (const [emotion, data] of Object.entries(scores)) {
      if (data.count > maxScore) {
        maxScore = data.count;
        primaryEmotion = emotion as EmotionState;
        allTriggers = data.triggers;
      }
    }

    // Find secondary emotions
    const secondaryEmotions: Array<{ emotion: EmotionState; intensity: number }> = [];
    const totalScore = Object.values(scores).reduce((acc, d) => acc + d.count, 0);

    for (const [emotion, data] of Object.entries(scores)) {
      if (emotion !== primaryEmotion && data.count > 0) {
        secondaryEmotions.push({
          emotion: emotion as EmotionState,
          intensity: data.count / (totalScore || 1),
        });
      }
    }

    // Sort secondary emotions by intensity
    secondaryEmotions.sort((a, b) => b.intensity - a.intensity);

    // Calculate confidence and intensity
    const confidence = totalScore > 0 ? Math.min(0.9, maxScore / totalScore + 0.2) : 0.5;
    const intensity = Math.min(1, maxScore / 3);

    // Get VAD from emotion wheel
    const vad = this.emotionWheel[primaryEmotion]?.vad || { valence: 0, arousal: 0.3, dominance: 0.5 };

    return {
      emotion: primaryEmotion,
      confidence,
      intensity,
      secondaryEmotions: secondaryEmotions.slice(0, 3),
      vad,
      triggers: [...new Set(allTriggers)],
      trend: 'stable',
      method: 'fallback',
    };
  }

  /**
   * Apply contextual adjustments based on conversation history
   */
  private applyContextualAdjustment(
    result: AdvancedEmotionResult,
    context?: EmotionContext
  ): AdvancedEmotionResult {
    if (!context || context.recentMessages.length < 2) {
      return result;
    }

    // Check for emotional continuity
    const recentEmotions = context.recentMessages
      .slice(-3)
      .filter(m => m.emotion)
      .map(m => m.emotion!);

    if (recentEmotions.length >= 2) {
      const lastEmotion = recentEmotions[recentEmotions.length - 1];

      // If current detection is neutral but context suggests otherwise
      if (result.emotion === 'neutral' && lastEmotion !== 'neutral') {
        const emotionData = this.emotionWheel[lastEmotion];
        if (emotionData && emotionData.adjacents.includes(result.emotion)) {
          // Emotion might be continuing from context
          result.confidence *= 0.8; // Lower confidence in neutral
        }
      }

      // Boost confidence if emotion matches recent trend
      if (result.emotion === lastEmotion) {
        result.confidence = Math.min(1, result.confidence * 1.2);
        result.intensity = Math.min(1, result.intensity * 1.1);
      }
    }

    return result;
  }

  /**
   * Calculate emotional trend from context
   */
  private calculateTrend(context?: EmotionContext): 'improving' | 'stable' | 'declining' {
    if (!context || context.recentMessages.length < 3) {
      return 'stable';
    }

    const recentEmotions = context.recentMessages
      .slice(-5)
      .filter(m => m.emotion)
      .map(m => this.emotionWheel[m.emotion!]?.vad.valence || 0);

    if (recentEmotions.length < 2) return 'stable';

    // Calculate trend from valence changes
    const recent = recentEmotions.slice(-3);
    const older = recentEmotions.slice(0, -3);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    const diff = recentAvg - olderAvg;

    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'declining';
    return 'stable';
  }

  /**
   * Get or create emotion context for session
   */
  private getOrCreateContext(sessionId: string): EmotionContext {
    if (!this.contextCache.has(sessionId)) {
      this.contextCache.set(sessionId, {
        recentMessages: [],
        runningState: {
          dominantEmotion: 'neutral',
          emotionHistory: [],
          stabilityScore: 1.0,
        },
      });
    }
    return this.contextCache.get(sessionId)!;
  }

  /**
   * Update context with new message
   */
  private updateContext(
    sessionId: string,
    content: string,
    role: 'user' | 'persona',
    emotion: EmotionState
  ): void {
    const context = this.contextCache.get(sessionId);
    if (!context) return;

    context.recentMessages.push({ role, content: content.slice(0, 200), emotion });

    // Keep only last 10 messages
    if (context.recentMessages.length > 10) {
      context.recentMessages = context.recentMessages.slice(-10);
    }

    // Update running state
    context.runningState.emotionHistory.push(emotion);
    if (context.runningState.emotionHistory.length > 20) {
      context.runningState.emotionHistory = context.runningState.emotionHistory.slice(-20);
    }

    // Calculate dominant emotion
    const emotionCounts = context.runningState.emotionHistory.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1;
      return acc;
    }, {} as Record<EmotionState, number>);

    let maxCount = 0;
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        context.runningState.dominantEmotion = emotion as EmotionState;
      }
    }

    // Calculate stability (how consistent emotions are)
    const uniqueEmotions = new Set(context.runningState.emotionHistory.slice(-5));
    context.runningState.stabilityScore = 1 - (uniqueEmotions.size - 1) / 4;
  }

  /**
   * Clear context for session
   */
  clearContext(sessionId: string): void {
    this.contextCache.delete(sessionId);
  }
}

// Legacy EmotionDetector for backwards compatibility
export class EmotionDetector {
  private advancedDetector: AdvancedEmotionDetector;

  constructor() {
    this.advancedDetector = new AdvancedEmotionDetector();
  }

  /**
   * Detect emotion from text (backwards compatible)
   */
  detect(text: string): EmotionDetectionResult {
    return this.advancedDetector.detect(text);
  }
}

// Export advanced detector instance
export const advancedEmotionDetector = new AdvancedEmotionDetector();

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memory manager for persona long-term memory
 */
export class MemoryManager {
  constructor(
    private readonly repository: any, // PersonaRepository
  ) {}

  /**
   * Recall relevant memories for a query
   */
  async recall(query: MemoryQuery): Promise<PersonaMemory[]> {
    // TODO: Implement semantic search with embeddings
    // For now, return top memories by importance
    return this.repository.listMemories(query.personaId, {
      limit: query.limit || 5,
      minImportance: query.minImportance || 0.3,
    });
  }

  /**
   * Store a new memory
   */
  async store(
    personaId: string,
    content: string,
    type: 'fact' | 'preference' | 'event' | 'relationship' | 'skill',
    options?: {
      importance?: number;
      sourceInteractionId?: string;
      embedding?: number[];
    },
  ): Promise<PersonaMemory> {
    return this.repository.createMemory({
      personaId,
      content,
      type,
      importance: options?.importance ?? 0.5,
      sourceInteractionId: options?.sourceInteractionId,
      embedding: options?.embedding,
    });
  }

  /**
   * Extract memories from conversation
   */
  async extractFromConversation(
    personaId: string,
    userMessage: string,
    personaResponse: string,
  ): Promise<PersonaMemory[]> {
    // TODO: Use LLM to extract important facts from conversation
    // For now, this is a placeholder
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main brain engine for persona intelligence
 */
export class BrainEngine {
  private emotionDetector: EmotionDetector;

  constructor(
    private readonly llmClient: any, // Anthropic client
    private readonly memoryManager: MemoryManager,
  ) {
    this.emotionDetector = new EmotionDetector();
  }

  /**
   * Process user input and generate persona response
   */
  async *processInput(
    persona: Persona,
    userMessage: string,
    options: BrainProcessingOptions = {},
  ): AsyncGenerator<BrainOutput> {
    // 1. Detect user emotion
    const userEmotion = this.emotionDetector.detect(userMessage);

    // 2. Recall relevant memories
    let memories: PersonaMemory[] = [];
    if (options.includeMemories !== false) {
      memories = await this.memoryManager.recall({
        personaId: persona.id,
        query: userMessage,
        limit: options.maxMemories || 5,
      });
    }

    // 3. Build system prompt
    const systemPrompt = buildPersonaSystemPrompt({
      persona,
      memories,
      userEmotion: userEmotion.emotion,
    });

    // 4. Call LLM (streaming)
    // TODO: Implement actual LLM call
    // For now, yield placeholder
    yield {
      text: `[Placeholder response from ${persona.name}]`,
      emotion: 'neutral',
      isComplete: true,
    };
  }
}