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
}

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
// EMOTION DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple emotion detection from text
 */
export class EmotionDetector {
  private emotionKeywords: Record<EmotionState, string[]> = {
    happy: ['happy', 'great', 'wonderful', 'excited', 'love', 'amazing', 'fantastic', '😊', '😃', '❤️'],
    sad: ['sad', 'unhappy', 'depressed', 'down', 'disappointed', 'sorry', '😢', '😞'],
    angry: ['angry', 'frustrated', 'annoyed', 'mad', 'furious', 'irritated', '😠', '😡'],
    surprised: ['surprised', 'shocked', 'wow', 'unexpected', 'amazing', '😮', '😲'],
    thoughtful: ['think', 'consider', 'wonder', 'curious', 'interesting', 'hmm', '🤔'],
    excited: ['excited', 'thrilled', 'can\'t wait', 'awesome', 'pumped', '🎉', '🙌'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'content'],
    confident: ['sure', 'certain', 'confident', 'definitely', 'absolutely'],
    curious: ['curious', 'wondering', 'what if', 'how', 'why', '?'],
    concerned: ['worried', 'concerned', 'anxious', 'nervous', 'uneasy'],
    neutral: [],
  };

  /**
   * Detect emotion from text
   */
  detect(text: string): EmotionDetectionResult {
    const lowerText = text.toLowerCase();
    const scores: Record<EmotionState, number> = {
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
      neutral: 0.1, // Base score for neutral
    };

    // Count keyword matches
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          scores[emotion as EmotionState] += 1;
        }
      }
    }

    // Find highest scoring emotion
    let maxEmotion: EmotionState = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as EmotionState;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

    return {
      emotion: maxEmotion,
      confidence,
      intensity: Math.min(maxScore / 3, 1), // Normalize intensity 0-1
    };
  }
}

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