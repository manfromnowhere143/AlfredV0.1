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
  
