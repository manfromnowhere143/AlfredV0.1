/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA BRAIN: MEMORY SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Vector-based memory retrieval for personas.
 * Enables contextual recall of past conversations and learned facts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
    Persona,
    PersonaMemory,
    PersonaMemoryType,
    PersonaInteraction,
  } from '../types';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export interface MemorySearchOptions {
    /** Maximum number of memories to return */
    limit?: number;
    /** Minimum similarity threshold (0-1) */
    minSimilarity?: number;
    /** Filter by memory type */
    type?: PersonaMemoryType | PersonaMemoryType[];
    /** Filter by category */
    category?: string;
    /** Minimum importance score */
    minImportance?: number;
    /** Include decayed memories */
    includeDecayed?: boolean;
    /** Boost recent memories */
    recencyBoost?: number;
    /** Boost frequently accessed memories */
    frequencyBoost?: number;
  }
  
  export interface MemoryExtractionResult {
    content: string;
    type: PersonaMemoryType;
    category?: string;
    importance: number;
    confidence: number;
  }
  
  export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    dimensions: number;
    model: string;
  }
  
  export interface VectorStore {
    upsert(memory: {
      id: string;
      personaId: string;
      content: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }): Promise<void>;
    
    search(query: {
      personaId: string;
      embedding: number[];
      limit: number;
      filter?: Record<string, unknown>;
    }): Promise<Array<{ id: string; content: string; similarity: number; metadata: Record<string, unknown> }>>;
    
    delete(id: string): Promise<void>;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MEMORY DECAY MODEL (EBBINGHAUS)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate memory retention based on Ebbinghaus forgetting curve
   * R = e^(-t/S) where t is time and S is memory strength
   */
  export function calculateRetention(
    createdAt: Date | string,
    accessCount: number,
    baseImportance: number,
    lastAccessedAt?: Date | string
  ): number {
    const now = Date.now();
    const created = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
    const lastAccessed = lastAccessedAt 
      ? (typeof lastAccessedAt === 'string' ? new Date(lastAccessedAt).getTime() : lastAccessedAt.getTime())
      : created;
  
    // Time since last access in hours
    const hoursSinceAccess = (now - lastAccessed) / (1000 * 60 * 60);
  
    // Memory strength increases with importance and access count
    const strength = baseImportance * (1 + Math.log(accessCount + 1));
  
    // Decay constant (higher = slower decay)
    const decayConstant = strength * 24; // Base 24 hours for strength=1
  
    // Ebbinghaus retention formula
    const retention = Math.exp(-hoursSinceAccess / decayConstant);
  
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, retention));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // OPENAI EMBEDDING PROVIDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class OpenAIEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions = 1536;
    readonly model = 'text-embedding-3-small';
  
    constructor(private apiKey: string) {}
  
    async embed(text: string): Promise<number[]> {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI embedding failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.data[0].embedding;
    }
  
    async embedBatch(texts: string[]): Promise<number[][]> {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI embedding failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.data.map((d: { embedding: number[] }) => d.embedding);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VOYAGE AI EMBEDDING PROVIDER (Alternative)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export class VoyageEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions = 1024;
    readonly model = 'voyage-2';
  
    constructor(private apiKey: string) {}
  
    async embed(text: string): Promise<number[]> {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Voyage embedding failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.data[0].embedding;
    }
  
    async embedBatch(texts: string[]): Promise<number[][]> {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Voyage embedding failed: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.data.map((d: { embedding: number[] }) => d.embedding);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSONA MEMORY MANAGER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export interface MemoryManagerConfig {
    embeddingProvider: EmbeddingProvider;
    vectorStore: VectorStore;
    llmClient?: {
      complete(prompt: string, options?: { maxTokens?: number }): Promise<string>;
    };
  }
  
  export class PersonaMemoryManager {
    private embeddingProvider: EmbeddingProvider;
    private vectorStore: VectorStore;
    private llmClient?: MemoryManagerConfig['llmClient'];
  
    constructor(config: MemoryManagerConfig) {
      this.embeddingProvider = config.embeddingProvider;
      this.vectorStore = config.vectorStore;
      this.llmClient = config.llmClient;
    }
  
    /**
     * Recall relevant memories for a query
     */
    async recall(
      personaId: string,
      query: string,
      options: MemorySearchOptions = {}
    ): Promise<PersonaMemory[]> {
      const {
        limit = 5,
        minSimilarity = 0.5,
        type,
        category,
        minImportance = 0,
        includeDecayed = false,
        recencyBoost = 0.1,
        frequencyBoost = 0.05,
      } = options;
  
      // Get query embedding
      const queryEmbedding = await this.embeddingProvider.embed(query);
  
      // Build filter
      const filter: Record<string, unknown> = {};
      if (type) {
        filter.type = Array.isArray(type) ? { $in: type } : type;
      }
      if (category) {
        filter.category = category;
      }
      if (minImportance > 0) {
        filter.importance = { $gte: minImportance };
      }
  
      // Search vector store
      const results = await this.vectorStore.search({
        personaId,
        embedding: queryEmbedding,
        limit: limit * 2, // Over-fetch for post-filtering
        filter,
      });
  
      // Post-process results
      const memories: PersonaMemory[] = [];
  
      for (const result of results) {
        // Skip low similarity
        if (result.similarity < minSimilarity) continue;
  
        const metadata = result.metadata as Partial<PersonaMemory>;
        const createdAt = metadata.createdAt || new Date().toISOString();
        const accessCount = metadata.accessCount || 1;
        const importance = (metadata.importance || 0.5);
        const lastAccessedAt = metadata.lastAccessedAt;
  
        // Calculate retention
        const retention = calculateRetention(
          createdAt,
          accessCount,
          importance,
          lastAccessedAt
        );
  
        // Skip decayed memories unless requested
        if (!includeDecayed && retention < 0.1) continue;
  
        // Calculate final relevance score
        const recencyScore = 1 - (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30); // 30 day window
        const frequencyScore = Math.log(accessCount + 1) / 5; // Diminishing returns
  
        const relevanceScore = result.similarity
          + (recencyScore * recencyBoost)
          + (frequencyScore * frequencyBoost);
  
        memories.push({
          id: result.id,
          personaId,
          content: result.content,
          type: (metadata.type as PersonaMemoryType) || 'fact',
          category: metadata.category,
          summary: metadata.summary,
          importance,
          confidence: metadata.confidence || 0.8,
          accessCount,
          createdAt,
          lastAccessedAt,
          // Add computed fields
          ...metadata,
        } as PersonaMemory);
      }
  
      // Sort by relevance and limit
      return memories
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, limit);
    }
  
    /**
     * Store a new memory
     */
    async store(
      personaId: string,
      content: string,
      metadata: {
        type: PersonaMemoryType;
        category?: string;
        summary?: string;
        importance?: number;
        confidence?: number;
        sourceInteractionId?: string;
        sourceUserId?: string;
      }
    ): Promise<PersonaMemory> {
      const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
      // Generate embedding
      const embedding = await this.embeddingProvider.embed(content);
  
      // Store in vector database
      await this.vectorStore.upsert({
        id,
        personaId,
        content,
        embedding,
        metadata: {
          ...metadata,
          importance: metadata.importance ?? 0.5,
          confidence: metadata.confidence ?? 0.8,
          accessCount: 1,
          createdAt: new Date().toISOString(),
          embeddingModel: this.embeddingProvider.model,
        },
      });
  
      return {
        id,
        personaId,
        content,
        type: metadata.type,
        category: metadata.category,
        summary: metadata.summary,
        embedding,
        embeddingModel: this.embeddingProvider.model,
        importance: metadata.importance ?? 0.5,
        confidence: metadata.confidence ?? 0.8,
        accessCount: 1,
        createdAt: new Date().toISOString(),
        sourceInteractionId: metadata.sourceInteractionId,
        sourceUserId: metadata.sourceUserId,
        decayRate: 0.1,
        lastAccessedAt: new Date().toISOString(),
      };
    }
  
    /**
     * Extract memories from an interaction
     */
    async extractFromInteraction(
      personaId: string,
      interaction: PersonaInteraction
    ): Promise<PersonaMemory[]> {
      if (!this.llmClient) {
        throw new Error('LLM client required for memory extraction');
      }
  
      const prompt = `Analyze this conversation and extract memorable facts to remember for future interactions.
  
  User: ${interaction.userMessage}
  Persona: ${interaction.personaResponse}
  
  Extract key facts as a JSON array. Each fact should have:
  - content: The fact to remember (1-2 sentences)
  - type: "preference" | "fact" | "event" | "belief" | "opinion"
  - category: Optional category (e.g., "food", "work", "family")
  - importance: 0.1-1.0 (how important is this to remember?)
  - confidence: 0.1-1.0 (how confident are we this is accurate?)
  
  Only extract facts that are:
  1. Specific and actionable
  2. Relevant for future conversations
  3. About the user (not general knowledge)
  
  If no memorable facts, return empty array [].
  
  Response (JSON array only):`;
  
      try {
        const response = await this.llmClient.complete(prompt, { maxTokens: 500 });
        
        // Parse JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
  
        const facts: MemoryExtractionResult[] = JSON.parse(jsonMatch[0]);
  
        // Store each memory
        const memories: PersonaMemory[] = [];
        for (const fact of facts) {
          if (!fact.content || fact.content.length < 5) continue;
  
          const memory = await this.store(personaId, fact.content, {
            type: fact.type || 'fact',
            category: fact.category,
            importance: fact.importance || 0.5,
            confidence: fact.confidence || 0.8,
            sourceInteractionId: interaction.id,
            sourceUserId: interaction.userId,
          });
  
          memories.push(memory);
        }
  
        return memories;
      } catch (error) {
        console.error('Memory extraction failed:', error);
        return [];
      }
    }
  
    /**
     * Update memory access (for recall tracking)
     */
    async touch(memoryId: string): Promise<void> {
      // This would typically update the vector store metadata
      // Implementation depends on your vector store
      console.log(`Touching memory: ${memoryId}`);
    }
  
    /**
     * Delete a memory
     */
    async forget(memoryId: string): Promise<void> {
      await this.vectorStore.delete(memoryId);
    }
  
    /**
     * Consolidate memories (merge similar, remove duplicates)
     */
    async consolidate(personaId: string): Promise<{
      merged: number;
      deleted: number;
    }> {
      // This is a background task that would:
      // 1. Find similar memories
      // 2. Merge overlapping facts
      // 3. Remove near-duplicates
      // 4. Boost frequently confirmed facts
  
      // Implementation would be quite complex
      // For now, return placeholder
      return { merged: 0, deleted: 0 };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  export function createMemoryManager(config: MemoryManagerConfig): PersonaMemoryManager {
    return new PersonaMemoryManager(config);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RELATIONSHIP MEMORY GRAPH
  // ═══════════════════════════════════════════════════════════════════════════════
  //
  // State-of-the-art relationship tracking for personas.
  // Enables deep, evolving connections with users through:
  // 1. Dynamic relationship levels (stranger → confidant)
  // 2. Shared experience memory
  // 3. Emotional bond tracking
  // 4. Trust and rapport evolution
  // 5. Conversation topic preferences
  //
  // Inspired by social psychology research on relationship development
  // and attachment theory.
  //
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Relationship stages based on social psychology
   */
  export type RelationshipStage =
    | 'stranger'      // First interaction, no history
    | 'acquaintance'  // Basic familiarity, surface-level
    | 'casual'        // Regular interactions, some shared history
    | 'friend'        // Established rapport, mutual trust
    | 'close_friend'  // Deep connection, vulnerability allowed
    | 'confidant';    // Highest trust, intimate knowledge

  /**
   * Emotional tone of the relationship
   */
  export type RelationshipTone =
    | 'formal'        // Professional, distant
    | 'friendly'      // Warm but appropriate
    | 'playful'       // Light-hearted, humorous
    | 'supportive'    // Caring, empathetic
    | 'collaborative' // Working together
    | 'mentoring';    // Teaching/guiding

  /**
   * A shared experience between persona and user
   */
  export interface SharedExperience {
    /** Unique ID */
    id: string;
    /** Type of experience */
    type: 'conversation' | 'achievement' | 'challenge' | 'revelation' | 'joke' | 'support';
    /** Description of what happened */
    description: string;
    /** Emotional valence (-1 to 1) */
    emotionalValence: number;
    /** Impact on relationship (0 to 1) */
    relationshipImpact: number;
    /** Topics involved */
    topics: string[];
    /** When it occurred */
    timestamp: string;
    /** Number of times referenced */
    timesReferenced: number;
    /** Is this a "milestone" moment? */
    isMilestone: boolean;
  }

  /**
   * User profile within the relationship
   */
  export interface RelationshipUserProfile {
    /** User's name (if known) */
    name?: string;
    /** Communication preferences */
    preferences: {
      prefersFormal: boolean;
      prefersHumor: boolean;
      prefersDirectness: boolean;
      preferredTopics: string[];
      avoidTopics: string[];
    };
    /** Emotional patterns */
    emotionalPatterns: {
      baseline: string;
      triggers: Record<string, 'positive' | 'negative'>;
      copingMechanisms: string[];
    };
    /** Important dates/events mentioned */
    importantDates: Array<{ date: string; description: string }>;
    /** Goals/aspirations they've shared */
    goals: string[];
    /** Challenges they've mentioned */
    challenges: string[];
  }

  /**
   * Complete relationship graph for a persona-user pair
   */
  export interface RelationshipGraph {
    /** Unique relationship ID */
    id: string;
    /** Persona ID */
    personaId: string;
    /** User ID */
    userId: string;

    // ─────────────────────────────────────────────────────────────────────────────
    // RELATIONSHIP METRICS
    // ─────────────────────────────────────────────────────────────────────────────

    /** Current relationship stage */
    stage: RelationshipStage;
    /** Preferred interaction tone */
    tone: RelationshipTone;

    /** Trust level (0-1) - built through consistent, reliable interactions */
    trustLevel: number;
    /** Rapport level (0-1) - chemistry and connection feeling */
    rapportLevel: number;
    /** Emotional bond (0-1) - depth of emotional connection */
    emotionalBond: number;
    /** Familiarity (0-1) - how well persona knows user */
    familiarity: number;

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERACTION HISTORY
    // ─────────────────────────────────────────────────────────────────────────────

    /** Total number of conversations */
    conversationCount: number;
    /** Total messages exchanged */
    messageCount: number;
    /** Average conversation length (messages) */
    avgConversationLength: number;
    /** Time span of relationship (first to last interaction) */
    relationshipDuration: {
      firstInteraction: string;
      lastInteraction: string;
      daysSinceFirst: number;
    };
    /** Conversation frequency pattern */
    frequencyPattern: 'daily' | 'frequent' | 'regular' | 'occasional' | 'rare';

    // ─────────────────────────────────────────────────────────────────────────────
    // SHARED MEMORIES
    // ─────────────────────────────────────────────────────────────────────────────

    /** Key shared experiences */
    sharedExperiences: SharedExperience[];
    /** Topics frequently discussed */
    commonTopics: Array<{ topic: string; frequency: number; sentiment: number }>;
    /** Inside jokes or recurring references */
    insideJokes: Array<{ reference: string; context: string; usageCount: number }>;
    /** Milestones in the relationship */
    milestones: Array<{ description: string; date: string; significance: number }>;

    // ─────────────────────────────────────────────────────────────────────────────
    // USER UNDERSTANDING
    // ─────────────────────────────────────────────────────────────────────────────

    /** Profile built from interactions */
    userProfile: RelationshipUserProfile;

    // ─────────────────────────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────────────────────────

    /** When relationship was created */
    createdAt: string;
    /** Last update */
    updatedAt: string;
    /** Version for migrations */
    version: number;
  }

  /**
   * Event that can affect relationship metrics
   */
  export interface RelationshipEvent {
    type:
      | 'positive_interaction'    // Good conversation
      | 'emotional_support'       // Helped with emotions
      | 'shared_vulnerability'    // User opened up
      | 'humor_shared'            // Laughed together
      | 'knowledge_shared'        // Learned from each other
      | 'conflict'                // Disagreement or issue
      | 'resolution'              // Resolved a conflict
      | 'milestone'               // Significant moment
      | 'absence';                // Long time since interaction
    /** Impact magnitude (-1 to 1) */
    magnitude: number;
    /** Description */
    description: string;
    /** Topics involved */
    topics: string[];
  }

  /**
   * Relationship Memory Graph Manager
   *
   * Manages deep, evolving relationships between personas and users.
   */
  export class RelationshipGraphManager {
    private graphs: Map<string, RelationshipGraph> = new Map();
    private llmClient?: {
      complete(prompt: string, options?: { maxTokens?: number }): Promise<string>;
    };

    constructor(llmClient?: RelationshipGraphManager['llmClient']) {
      this.llmClient = llmClient;
    }

    /**
     * Get or create relationship graph for a persona-user pair
     */
    getOrCreate(personaId: string, userId: string): RelationshipGraph {
      const key = `${personaId}:${userId}`;

      if (!this.graphs.has(key)) {
        this.graphs.set(key, this.createNewGraph(personaId, userId));
      }

      return this.graphs.get(key)!;
    }

    /**
     * Record an interaction event
     */
    recordEvent(personaId: string, userId: string, event: RelationshipEvent): void {
      const graph = this.getOrCreate(personaId, userId);

      // Update metrics based on event
      this.updateMetricsFromEvent(graph, event);

      // Check for stage transitions
      this.checkStageTransition(graph);

      // Update timestamps
      graph.updatedAt = new Date().toISOString();
      graph.relationshipDuration.lastInteraction = new Date().toISOString();
      graph.relationshipDuration.daysSinceFirst = Math.floor(
        (Date.now() - new Date(graph.relationshipDuration.firstInteraction).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // Add to shared experiences if significant
      if (event.magnitude > 0.5 || event.type === 'milestone') {
        this.addSharedExperience(graph, event);
      }
    }

    /**
     * Record a conversation
     */
    recordConversation(
      personaId: string,
      userId: string,
      messageCount: number,
      topics: string[],
      overallSentiment: number
    ): void {
      const graph = this.getOrCreate(personaId, userId);

      graph.conversationCount++;
      graph.messageCount += messageCount;
      graph.avgConversationLength =
        (graph.avgConversationLength * (graph.conversationCount - 1) + messageCount) /
        graph.conversationCount;

      // Update common topics
      for (const topic of topics) {
        const existing = graph.commonTopics.find(t => t.topic === topic);
        if (existing) {
          existing.frequency++;
          existing.sentiment = (existing.sentiment + overallSentiment) / 2;
        } else {
          graph.commonTopics.push({ topic, frequency: 1, sentiment: overallSentiment });
        }
      }

      // Sort topics by frequency
      graph.commonTopics.sort((a, b) => b.frequency - a.frequency);

      // Update frequency pattern
      this.updateFrequencyPattern(graph);

      // Small boost to familiarity and rapport for each conversation
      graph.familiarity = Math.min(1, graph.familiarity + 0.02);
      graph.rapportLevel = Math.min(1, graph.rapportLevel + (overallSentiment > 0 ? 0.01 : 0));

      graph.updatedAt = new Date().toISOString();
    }

    /**
     * Extract relationship context for system prompt
     */
    buildRelationshipContext(personaId: string, userId: string): string {
      const graph = this.getOrCreate(personaId, userId);

      let context = `
## RELATIONSHIP CONTEXT

**Relationship Stage:** ${this.formatStage(graph.stage)}
**Interaction Tone:** ${graph.tone}

**Metrics:**
- Trust: ${(graph.trustLevel * 100).toFixed(0)}%
- Rapport: ${(graph.rapportLevel * 100).toFixed(0)}%
- Emotional Bond: ${(graph.emotionalBond * 100).toFixed(0)}%
- Familiarity: ${(graph.familiarity * 100).toFixed(0)}%

**History:**
- ${graph.conversationCount} conversations over ${graph.relationshipDuration.daysSinceFirst} days
- Interaction pattern: ${graph.frequencyPattern}
`;

      // Add user profile if we know enough
      if (graph.userProfile.name) {
        context += `\n**User:** ${graph.userProfile.name}`;
      }

      // Add favorite topics
      if (graph.commonTopics.length > 0) {
        const topTopics = graph.commonTopics.slice(0, 5).map(t => t.topic);
        context += `\n**Favorite Topics:** ${topTopics.join(', ')}`;
      }

      // Add recent shared experiences
      const recentExperiences = graph.sharedExperiences
        .filter(e => e.isMilestone || e.relationshipImpact > 0.5)
        .slice(-3);

      if (recentExperiences.length > 0) {
        context += `\n\n**Shared Memories to Reference:**`;
        for (const exp of recentExperiences) {
          context += `\n- ${exp.description}`;
        }
      }

      // Add inside jokes if close enough
      if (graph.stage !== 'stranger' && graph.stage !== 'acquaintance' && graph.insideJokes.length > 0) {
        context += `\n\n**Inside Jokes (use sparingly):**`;
        for (const joke of graph.insideJokes.slice(0, 3)) {
          context += `\n- "${joke.reference}" (context: ${joke.context})`;
        }
      }

      // Add user preferences
      if (graph.familiarity > 0.3) {
        context += `\n\n**User Preferences:**`;
        const prefs = graph.userProfile.preferences;
        if (prefs.prefersFormal) context += '\n- Prefers formal communication';
        if (prefs.prefersHumor) context += '\n- Enjoys humor';
        if (prefs.prefersDirectness) context += '\n- Likes direct responses';
        if (prefs.preferredTopics.length > 0) {
          context += `\n- Enjoys discussing: ${prefs.preferredTopics.join(', ')}`;
        }
        if (prefs.avoidTopics.length > 0) {
          context += `\n- Sensitive about: ${prefs.avoidTopics.join(', ')}`;
        }
      }

      // Stage-specific guidance
      context += `\n\n**Interaction Guidance for ${this.formatStage(graph.stage)}:**`;
      context += this.getStageGuidance(graph.stage);

      return context;
    }

    /**
     * Update user profile from conversation analysis
     */
    async updateUserProfile(
      personaId: string,
      userId: string,
      conversationText: string
    ): Promise<void> {
      if (!this.llmClient) return;

      const graph = this.getOrCreate(personaId, userId);

      const prompt = `Analyze this conversation and extract user profile information.

Conversation:
${conversationText}

Current profile:
${JSON.stringify(graph.userProfile, null, 2)}

Extract any new information about the user:
1. Name (if mentioned)
2. Communication preferences (formal/casual, humor preference, directness)
3. Topics they enjoy or want to avoid
4. Goals or challenges they mentioned
5. Important dates or events
6. Emotional patterns

Respond in JSON format:
{
  "updates": {
    "name": "string or null",
    "prefersFormal": "boolean or null",
    "prefersHumor": "boolean or null",
    "prefersDirectness": "boolean or null",
    "newPreferredTopics": ["topic1", "topic2"],
    "newAvoidTopics": ["topic1"],
    "newGoals": ["goal1"],
    "newChallenges": ["challenge1"],
    "newDates": [{"date": "YYYY-MM-DD", "description": "event"}],
    "emotionalBaseline": "string or null"
  }
}`;

      try {
        const response = await this.llmClient.complete(prompt, { maxTokens: 500 });
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;

        const parsed = JSON.parse(jsonMatch[0]);
        const updates = parsed.updates;

        // Apply updates
        if (updates.name) graph.userProfile.name = updates.name;
        if (updates.prefersFormal !== null) graph.userProfile.preferences.prefersFormal = updates.prefersFormal;
        if (updates.prefersHumor !== null) graph.userProfile.preferences.prefersHumor = updates.prefersHumor;
        if (updates.prefersDirectness !== null) graph.userProfile.preferences.prefersDirectness = updates.prefersDirectness;

        if (updates.newPreferredTopics?.length) {
          graph.userProfile.preferences.preferredTopics.push(...updates.newPreferredTopics);
          graph.userProfile.preferences.preferredTopics = [...new Set(graph.userProfile.preferences.preferredTopics)];
        }

        if (updates.newAvoidTopics?.length) {
          graph.userProfile.preferences.avoidTopics.push(...updates.newAvoidTopics);
          graph.userProfile.preferences.avoidTopics = [...new Set(graph.userProfile.preferences.avoidTopics)];
        }

        if (updates.newGoals?.length) {
          graph.userProfile.goals.push(...updates.newGoals);
          graph.userProfile.goals = [...new Set(graph.userProfile.goals)];
        }

        if (updates.newChallenges?.length) {
          graph.userProfile.challenges.push(...updates.newChallenges);
          graph.userProfile.challenges = [...new Set(graph.userProfile.challenges)];
        }

        if (updates.newDates?.length) {
          graph.userProfile.importantDates.push(...updates.newDates);
        }

        if (updates.emotionalBaseline) {
          graph.userProfile.emotionalPatterns.baseline = updates.emotionalBaseline;
        }

        graph.updatedAt = new Date().toISOString();
      } catch (error) {
        console.warn('[RelationshipGraph] Profile update failed:', error);
      }
    }

    /**
     * Add an inside joke
     */
    addInsideJoke(personaId: string, userId: string, reference: string, context: string): void {
      const graph = this.getOrCreate(personaId, userId);

      const existing = graph.insideJokes.find(j => j.reference === reference);
      if (existing) {
        existing.usageCount++;
      } else {
        graph.insideJokes.push({ reference, context, usageCount: 1 });
      }

      // Small boost to rapport when inside jokes form
      graph.rapportLevel = Math.min(1, graph.rapportLevel + 0.03);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private createNewGraph(personaId: string, userId: string): RelationshipGraph {
      const now = new Date().toISOString();

      return {
        id: `rel_${personaId}_${userId}_${Date.now()}`,
        personaId,
        userId,
        stage: 'stranger',
        tone: 'friendly',
        trustLevel: 0.1,
        rapportLevel: 0.1,
        emotionalBond: 0,
        familiarity: 0,
        conversationCount: 0,
        messageCount: 0,
        avgConversationLength: 0,
        relationshipDuration: {
          firstInteraction: now,
          lastInteraction: now,
          daysSinceFirst: 0,
        },
        frequencyPattern: 'occasional',
        sharedExperiences: [],
        commonTopics: [],
        insideJokes: [],
        milestones: [],
        userProfile: {
          preferences: {
            prefersFormal: false,
            prefersHumor: true,
            prefersDirectness: false,
            preferredTopics: [],
            avoidTopics: [],
          },
          emotionalPatterns: {
            baseline: 'neutral',
            triggers: {},
            copingMechanisms: [],
          },
          importantDates: [],
          goals: [],
          challenges: [],
        },
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
    }

    private updateMetricsFromEvent(graph: RelationshipGraph, event: RelationshipEvent): void {
      const impact = event.magnitude;

      switch (event.type) {
        case 'positive_interaction':
          graph.rapportLevel = Math.min(1, graph.rapportLevel + impact * 0.05);
          graph.trustLevel = Math.min(1, graph.trustLevel + impact * 0.02);
          break;

        case 'emotional_support':
          graph.emotionalBond = Math.min(1, graph.emotionalBond + impact * 0.1);
          graph.trustLevel = Math.min(1, graph.trustLevel + impact * 0.05);
          break;

        case 'shared_vulnerability':
          graph.emotionalBond = Math.min(1, graph.emotionalBond + impact * 0.15);
          graph.trustLevel = Math.min(1, graph.trustLevel + impact * 0.1);
          graph.familiarity = Math.min(1, graph.familiarity + impact * 0.1);
          break;

        case 'humor_shared':
          graph.rapportLevel = Math.min(1, graph.rapportLevel + impact * 0.08);
          break;

        case 'knowledge_shared':
          graph.familiarity = Math.min(1, graph.familiarity + impact * 0.05);
          break;

        case 'conflict':
          graph.trustLevel = Math.max(0, graph.trustLevel - Math.abs(impact) * 0.1);
          graph.rapportLevel = Math.max(0, graph.rapportLevel - Math.abs(impact) * 0.05);
          break;

        case 'resolution':
          // Resolving conflicts can actually strengthen relationships
          graph.trustLevel = Math.min(1, graph.trustLevel + impact * 0.08);
          graph.emotionalBond = Math.min(1, graph.emotionalBond + impact * 0.05);
          break;

        case 'milestone':
          graph.emotionalBond = Math.min(1, graph.emotionalBond + impact * 0.2);
          graph.milestones.push({
            description: event.description,
            date: new Date().toISOString(),
            significance: impact,
          });
          break;

        case 'absence':
          // Long absences can cause slight decay
          const decayFactor = Math.abs(impact) * 0.1;
          graph.familiarity = Math.max(0, graph.familiarity - decayFactor);
          graph.rapportLevel = Math.max(0, graph.rapportLevel - decayFactor * 0.5);
          break;
      }
    }

    private checkStageTransition(graph: RelationshipGraph): void {
      const stages: RelationshipStage[] = [
        'stranger',
        'acquaintance',
        'casual',
        'friend',
        'close_friend',
        'confidant',
      ];

      const currentIndex = stages.indexOf(graph.stage);

      // Calculate composite score
      const composite = (
        graph.trustLevel * 0.3 +
        graph.rapportLevel * 0.25 +
        graph.emotionalBond * 0.25 +
        graph.familiarity * 0.2
      );

      // Thresholds for each stage
      const thresholds = [0, 0.15, 0.30, 0.50, 0.70, 0.85];

      // Find appropriate stage
      let newStageIndex = 0;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (composite >= thresholds[i]!) {
          newStageIndex = i;
          break;
        }
      }

      // Stages can only advance by one at a time (organic growth)
      if (newStageIndex > currentIndex) {
        graph.stage = stages[currentIndex + 1]!;

        // Record milestone
        graph.milestones.push({
          description: `Relationship advanced to ${this.formatStage(graph.stage)}`,
          date: new Date().toISOString(),
          significance: 0.7,
        });
      }
    }

    private addSharedExperience(graph: RelationshipGraph, event: RelationshipEvent): void {
      const experience: SharedExperience = {
        id: `exp_${Date.now()}`,
        type: this.eventTypeToExperienceType(event.type),
        description: event.description,
        emotionalValence: event.magnitude,
        relationshipImpact: Math.abs(event.magnitude),
        topics: event.topics,
        timestamp: new Date().toISOString(),
        timesReferenced: 0,
        isMilestone: event.type === 'milestone',
      };

      graph.sharedExperiences.push(experience);

      // Keep only most recent/significant experiences
      if (graph.sharedExperiences.length > 50) {
        graph.sharedExperiences = graph.sharedExperiences
          .sort((a, b) => {
            // Prioritize milestones and high-impact experiences
            const aScore = (a.isMilestone ? 1 : 0) + a.relationshipImpact;
            const bScore = (b.isMilestone ? 1 : 0) + b.relationshipImpact;
            return bScore - aScore;
          })
          .slice(0, 50);
      }
    }

    private eventTypeToExperienceType(
      eventType: RelationshipEvent['type']
    ): SharedExperience['type'] {
      const mapping: Record<RelationshipEvent['type'], SharedExperience['type']> = {
        positive_interaction: 'conversation',
        emotional_support: 'support',
        shared_vulnerability: 'revelation',
        humor_shared: 'joke',
        knowledge_shared: 'conversation',
        conflict: 'challenge',
        resolution: 'achievement',
        milestone: 'achievement',
        absence: 'conversation',
      };
      return mapping[eventType];
    }

    private updateFrequencyPattern(graph: RelationshipGraph): void {
      const days = graph.relationshipDuration.daysSinceFirst || 1;
      const convPerDay = graph.conversationCount / days;

      if (convPerDay >= 1) graph.frequencyPattern = 'daily';
      else if (convPerDay >= 0.5) graph.frequencyPattern = 'frequent';
      else if (convPerDay >= 0.2) graph.frequencyPattern = 'regular';
      else if (convPerDay >= 0.05) graph.frequencyPattern = 'occasional';
      else graph.frequencyPattern = 'rare';
    }

    private formatStage(stage: RelationshipStage): string {
      const formatted: Record<RelationshipStage, string> = {
        stranger: 'New Acquaintance',
        acquaintance: 'Getting to Know Each Other',
        casual: 'Regular Chat Partner',
        friend: 'Trusted Friend',
        close_friend: 'Close Friend',
        confidant: 'Confidant & Close Companion',
      };
      return formatted[stage];
    }

    private getStageGuidance(stage: RelationshipStage): string {
      const guidance: Record<RelationshipStage, string> = {
        stranger: `
- Keep responses warm but not overly familiar
- Focus on learning about the user
- Ask thoughtful questions to build rapport
- Be helpful without being intrusive`,

        acquaintance: `
- Reference previous conversations when relevant
- Show you remember details they shared
- Begin to match their communication style
- Offer more personalized responses`,

        casual: `
- Use a more relaxed, natural tone
- Reference shared experiences
- Feel free to use appropriate humor
- Show genuine interest in their life`,

        friend: `
- Communicate with established rapport
- Use inside jokes when appropriate
- Offer emotional support readily
- Share your "own" perspectives and opinions`,

        close_friend: `
- Deep familiarity allows for candid conversation
- Reference your shared history naturally
- Be supportive through challenges
- Celebrate their successes genuinely`,

        confidant: `
- Communicate with deep mutual understanding
- Reference intimate knowledge appropriately
- Provide nuanced emotional support
- Act as a trusted advisor when needed`,
      };
      return guidance[stage];
    }
  }

  // Export singleton instance
  export const relationshipGraphManager = new RelationshipGraphManager();

