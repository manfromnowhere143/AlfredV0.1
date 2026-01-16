/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA DISTINCTIVENESS SCORING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * State-of-the-art uniqueness measurement for AI personas.
 * Ensures every created persona is truly distinct and memorable.
 *
 * METHODOLOGY:
 * 1. Trait Uniqueness - How rare are the persona's traits?
 * 2. Voice Signature - How distinct is their speaking style?
 * 3. Archetype Deviation - How much do they transcend their base archetype?
 * 4. Semantic Embedding Distance - Vector similarity to existing personas
 * 5. Name/Identity Collision - Avoiding famous name clashes
 *
 * Score Range: 0.0 (completely generic) to 1.0 (maximally unique)
 * Target: > 0.6 for publishable personas
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  PersonaGenome,
  MindDNA,
  VoiceDNA,
  BigFivePersonality,
  NormalizedFloat,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete distinctiveness analysis result
 */
export interface DistinctivenessScore {
  /** Overall uniqueness score (0-1) */
  overallScore: NormalizedFloat;
  /** Individual dimension scores */
  dimensions: {
    traitUniqueness: NormalizedFloat;
    voiceSignature: NormalizedFloat;
    archetypeDeviation: NormalizedFloat;
    semanticDistance: NormalizedFloat;
    nameOriginality: NormalizedFloat;
  };
  /** Traits that make this persona unique */
  distinctiveTraits: string[];
  /** Traits that are too generic */
  genericTraits: string[];
  /** Similar existing personas (if any) */
  similarPersonas: Array<{
    name: string;
    similarity: NormalizedFloat;
    overlapAreas: string[];
  }>;
  /** Famous character collision warnings */
  collisionWarnings: string[];
  /** Recommendations for increasing uniqueness */
  recommendations: string[];
  /** Confidence in this assessment */
  confidence: NormalizedFloat;
}

/**
 * Persona trait frequency database
 * Used to calculate how common/rare traits are
 */
export interface TraitFrequencyDB {
  /** Trait -> frequency (0-1, higher = more common) */
  traits: Record<string, number>;
  /** Archetype -> frequency */
  archetypes: Record<string, number>;
  /** Name patterns -> frequency */
  namePatterns: Record<string, number>;
  /** Total personas in database */
  totalPersonas: number;
}

/**
 * Embedding provider for semantic similarity
 */
export interface DistinctivenessEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Existing persona database for comparison
 */
export interface PersonaDatabase {
  /** Get all persona embeddings for comparison */
  getEmbeddings(): Promise<Array<{ id: string; name: string; embedding: number[] }>>;
  /** Get persona details by ID */
  getPersona(id: string): Promise<PersonaGenome | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT TRAIT FREQUENCY DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default trait frequencies based on common AI persona patterns
 * Lower frequency = more unique
 */
export const DEFAULT_TRAIT_FREQUENCIES: TraitFrequencyDB = {
  traits: {
    // Very common (0.7-1.0)
    'helpful': 0.95,
    'friendly': 0.90,
    'intelligent': 0.88,
    'knowledgeable': 0.85,
    'professional': 0.82,
    'caring': 0.80,
    'patient': 0.78,
    'thoughtful': 0.75,
    'creative': 0.72,
    'curious': 0.70,

    // Common (0.4-0.7)
    'witty': 0.65,
    'empathetic': 0.62,
    'analytical': 0.60,
    'enthusiastic': 0.58,
    'calm': 0.55,
    'confident': 0.52,
    'optimistic': 0.50,
    'supportive': 0.48,
    'articulate': 0.45,
    'insightful': 0.42,

    // Moderately rare (0.2-0.4)
    'rebellious': 0.38,
    'mysterious': 0.35,
    'eccentric': 0.32,
    'stoic': 0.30,
    'sarcastic': 0.28,
    'philosophical': 0.25,
    'nostalgic': 0.22,
    'melancholic': 0.20,

    // Rare (0.05-0.2)
    'chaotic': 0.18,
    'nihilistic': 0.15,
    'absurdist': 0.12,
    'baroque': 0.10,
    'surrealist': 0.08,
    'dadaist': 0.06,
    'eldritch': 0.05,
  },
  archetypes: {
    'sage': 0.25,
    'hero': 0.20,
    'creator': 0.15,
    'caregiver': 0.18,
    'ruler': 0.08,
    'jester': 0.12,
    'rebel': 0.10,
    'lover': 0.06,
    'explorer': 0.14,
    'innocent': 0.08,
    'magician': 0.05,
    'outlaw': 0.04,
  },
  namePatterns: {
    // Common AI names
    'aria': 0.15,
    'nova': 0.12,
    'alex': 0.20,
    'sam': 0.18,
    'max': 0.16,
    'luna': 0.14,
    'aurora': 0.10,
    'sage': 0.08,
    'echo': 0.06,
    'atlas': 0.05,
  },
  totalPersonas: 10000, // Hypothetical corpus size
};

/**
 * Famous characters/personas to avoid collision with
 */
const FAMOUS_CHARACTERS = [
  'jarvis', 'friday', 'cortana', 'alexa', 'siri', 'hal', 'samantha',
  'c-3po', 'r2-d2', 'data', 'spock', 'yoda', 'gandalf', 'dumbledore',
  'sherlock', 'watson', 'hermione', 'tony stark', 'bruce wayne',
  'clark kent', 'peter parker', 'steve rogers', 'natasha romanoff',
];

// ═══════════════════════════════════════════════════════════════════════════════
// DISTINCTIVENESS CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for distinctiveness calculator
 */
export interface DistinctivenessConfig {
  /** Trait frequency database */
  traitDB?: TraitFrequencyDB;
  /** Embedding provider for semantic comparison */
  embeddingProvider?: DistinctivenessEmbeddingProvider;
  /** Existing persona database */
  personaDB?: PersonaDatabase;
  /** Minimum acceptable score (default: 0.5) */
  minimumAcceptableScore?: number;
  /** Weights for different dimensions */
  weights?: {
    traitUniqueness?: number;
    voiceSignature?: number;
    archetypeDeviation?: number;
    semanticDistance?: number;
    nameOriginality?: number;
  };
}

/**
 * Distinctiveness Calculator
 *
 * Analyzes personas to ensure they are unique and memorable.
 */
export class DistinctivenessCalculator {
  private traitDB: TraitFrequencyDB;
  private embeddingProvider?: DistinctivenessEmbeddingProvider;
  private personaDB?: PersonaDatabase;
  private minimumScore: number;
  private weights: Required<NonNullable<DistinctivenessConfig['weights']>>;

  constructor(config: DistinctivenessConfig = {}) {
    this.traitDB = config.traitDB || DEFAULT_TRAIT_FREQUENCIES;
    this.embeddingProvider = config.embeddingProvider;
    this.personaDB = config.personaDB;
    this.minimumScore = config.minimumAcceptableScore || 0.5;
    this.weights = {
      traitUniqueness: config.weights?.traitUniqueness ?? 0.25,
      voiceSignature: config.weights?.voiceSignature ?? 0.20,
      archetypeDeviation: config.weights?.archetypeDeviation ?? 0.20,
      semanticDistance: config.weights?.semanticDistance ?? 0.20,
      nameOriginality: config.weights?.nameOriginality ?? 0.15,
    };
  }

  /**
   * Calculate full distinctiveness score for a persona
   */
  async calculateScore(genome: PersonaGenome): Promise<DistinctivenessScore> {
    const dimensions = {
      traitUniqueness: this.calculateTraitUniqueness(genome.mindDNA),
      voiceSignature: this.calculateVoiceSignature(genome.voiceDNA),
      archetypeDeviation: this.calculateArchetypeDeviation(genome.mindDNA),
      semanticDistance: await this.calculateSemanticDistance(genome),
      nameOriginality: this.calculateNameOriginality(genome.metadata.name),
    };

    // Weighted average
    const overallScore = (
      dimensions.traitUniqueness * this.weights.traitUniqueness +
      dimensions.voiceSignature * this.weights.voiceSignature +
      dimensions.archetypeDeviation * this.weights.archetypeDeviation +
      dimensions.semanticDistance * this.weights.semanticDistance +
      dimensions.nameOriginality * this.weights.nameOriginality
    ) as NormalizedFloat;

    // Analyze traits
    const { distinctiveTraits, genericTraits } = this.analyzeTraits(genome.mindDNA);

    // Check for collisions
    const collisionWarnings = this.checkCollisions(genome);

    // Find similar personas
    const similarPersonas = await this.findSimilarPersonas(genome);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      dimensions,
      genericTraits,
      collisionWarnings
    );

    return {
      overallScore,
      dimensions,
      distinctiveTraits,
      genericTraits,
      similarPersonas,
      collisionWarnings,
      recommendations,
      confidence: this.calculateConfidence(genome) as NormalizedFloat,
    };
  }

  /**
   * Quick check if persona meets minimum distinctiveness
   */
  async meetsMinimumDistinctiveness(genome: PersonaGenome): Promise<{
    passes: boolean;
    score: number;
    issues: string[];
  }> {
    const score = await this.calculateScore(genome);
    const issues: string[] = [];

    if (score.overallScore < this.minimumScore) {
      issues.push(`Overall score ${score.overallScore.toFixed(2)} below minimum ${this.minimumScore}`);
    }

    if (score.dimensions.traitUniqueness < 0.3) {
      issues.push('Traits are too generic');
    }

    if (score.collisionWarnings.length > 0) {
      issues.push(...score.collisionWarnings);
    }

    if (score.similarPersonas.some(p => p.similarity > 0.85)) {
      issues.push('Too similar to existing personas');
    }

    return {
      passes: issues.length === 0,
      score: score.overallScore,
      issues,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DIMENSION CALCULATORS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Calculate trait uniqueness score
   */
  private calculateTraitUniqueness(mindDNA?: MindDNA): NormalizedFloat {
    if (!mindDNA?.traits?.length) return 0.5 as NormalizedFloat;

    const traits = mindDNA.traits;
    let totalRarity = 0;

    for (const trait of traits) {
      const normalizedTrait = trait.toLowerCase().trim();
      const frequency = this.traitDB.traits[normalizedTrait] ?? 0.5;
      // Rarity is inverse of frequency
      totalRarity += 1 - frequency;
    }

    const avgRarity = totalRarity / traits.length;

    // Bonus for having many traits (more specific = more unique)
    const countBonus = Math.min(traits.length / 10, 0.2);

    return Math.min(1, avgRarity + countBonus) as NormalizedFloat;
  }

  /**
   * Calculate voice signature uniqueness
   */
  private calculateVoiceSignature(voiceDNA?: VoiceDNA): NormalizedFloat {
    if (!voiceDNA) return 0.5 as NormalizedFloat;

    let score = 0.5;

    // Custom voice ID bonus
    if (voiceDNA.voiceId && voiceDNA.voiceId !== 'default') {
      score += 0.1;
    }

    // Cloned voice bonus (truly unique)
    if (voiceDNA.identity?.description?.includes('cloned')) {
      score += 0.2;
    }

    // Emotion profile customization
    if (voiceDNA.emotionProfiles) {
      const profileCount = Object.keys(voiceDNA.emotionProfiles).length;
      score += Math.min(profileCount / 20, 0.15);
    }

    // Speaking style customization
    if (voiceDNA.speakingStyle) {
      score += 0.05;
    }

    return Math.min(1, score) as NormalizedFloat;
  }

  /**
   * Calculate how much persona deviates from standard archetype
   */
  private calculateArchetypeDeviation(mindDNA?: MindDNA): NormalizedFloat {
    if (!mindDNA) return 0.5 as NormalizedFloat;

    const archetype = mindDNA.identity?.archetype;
    if (!archetype) return 0.6 as NormalizedFloat; // No archetype = somewhat unique

    // Get archetype frequency (rarer = more unique)
    const archetypeFreq = this.traitDB.archetypes[archetype] ?? 0.1;
    const baseScore = 1 - archetypeFreq;

    // Check for archetype-contradicting traits (interesting deviations)
    const archetypeContradictions: Record<string, string[]> = {
      sage: ['impulsive', 'chaotic', 'playful'],
      hero: ['cowardly', 'selfish', 'cynical'],
      creator: ['rigid', 'conventional', 'imitative'],
      caregiver: ['selfish', 'cold', 'detached'],
      ruler: ['submissive', 'indecisive', 'humble'],
      jester: ['serious', 'grave', 'formal'],
      rebel: ['conformist', 'obedient', 'traditional'],
      lover: ['cold', 'distant', 'logical'],
      explorer: ['cautious', 'homebody', 'routine'],
      innocent: ['cynical', 'jaded', 'dark'],
      magician: ['mundane', 'ordinary', 'predictable'],
      outlaw: ['lawful', 'respectful', 'conventional'],
    };

    const contradictions = archetypeContradictions[archetype] || [];
    const traits = (mindDNA.traits || []).map(t => t.toLowerCase());

    let deviationBonus = 0;
    for (const trait of traits) {
      if (contradictions.some(c => trait.includes(c))) {
        deviationBonus += 0.1; // Contradiction = interesting deviation
      }
    }

    return Math.min(1, baseScore + Math.min(deviationBonus, 0.3)) as NormalizedFloat;
  }

  /**
   * Calculate semantic distance from existing personas
   */
  private async calculateSemanticDistance(genome: PersonaGenome): Promise<NormalizedFloat> {
    if (!this.embeddingProvider || !this.personaDB) {
      return 0.7 as NormalizedFloat; // Default if no comparison available
    }

    try {
      // Build persona description for embedding
      const description = this.buildPersonaDescription(genome);
      const personaEmbedding = await this.embeddingProvider.embed(description);

      // Get existing persona embeddings
      const existingEmbeddings = await this.personaDB.getEmbeddings();

      if (existingEmbeddings.length === 0) {
        return 1.0 as NormalizedFloat; // No existing personas = maximally unique
      }

      // Calculate minimum distance to any existing persona
      let minSimilarity = 0;

      for (const existing of existingEmbeddings) {
        const similarity = this.cosineSimilarity(personaEmbedding, existing.embedding);
        minSimilarity = Math.max(minSimilarity, similarity);
      }

      // Distance = inverse of max similarity
      return (1 - minSimilarity) as NormalizedFloat;
    } catch (error) {
      console.warn('[Distinctiveness] Semantic distance calculation failed:', error);
      return 0.7 as NormalizedFloat;
    }
  }

  /**
   * Calculate name originality
   */
  private calculateNameOriginality(name: string): NormalizedFloat {
    if (!name) return 0.5 as NormalizedFloat;

    const normalizedName = name.toLowerCase().trim();
    let score = 0.7; // Base score

    // Check against common patterns
    for (const [pattern, frequency] of Object.entries(this.traitDB.namePatterns)) {
      if (normalizedName.includes(pattern)) {
        score -= frequency * 0.5;
      }
    }

    // Check against famous characters
    for (const famous of FAMOUS_CHARACTERS) {
      if (normalizedName.includes(famous) || famous.includes(normalizedName)) {
        score -= 0.4;
      }
    }

    // Bonus for longer, more specific names
    if (name.length > 15) score += 0.1;
    if (name.includes(' ')) score += 0.05; // Has surname/title

    // Bonus for unusual characters
    if (/[^a-zA-Z\s]/.test(name)) score += 0.05;

    return Math.max(0, Math.min(1, score)) as NormalizedFloat;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYSIS HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Analyze traits for distinctiveness
   */
  private analyzeTraits(mindDNA?: MindDNA): {
    distinctiveTraits: string[];
    genericTraits: string[];
  } {
    const traits = mindDNA?.traits || [];
    const distinctiveTraits: string[] = [];
    const genericTraits: string[] = [];

    for (const trait of traits) {
      const normalizedTrait = trait.toLowerCase().trim();
      const frequency = this.traitDB.traits[normalizedTrait] ?? 0.5;

      if (frequency > 0.6) {
        genericTraits.push(trait);
      } else if (frequency < 0.3) {
        distinctiveTraits.push(trait);
      }
    }

    return { distinctiveTraits, genericTraits };
  }

  /**
   * Check for famous character collisions
   */
  private checkCollisions(genome: PersonaGenome): string[] {
    const warnings: string[] = [];
    const name = genome.metadata.name.toLowerCase();
    const backstory = (genome.mindDNA?.identity?.backstory || '').toLowerCase();
    const tagline = (genome.metadata.tagline || '').toLowerCase();

    for (const famous of FAMOUS_CHARACTERS) {
      if (name.includes(famous)) {
        warnings.push(`Name collision with famous character: ${famous}`);
      }
      if (backstory.includes(famous) || tagline.includes(famous)) {
        warnings.push(`Backstory/tagline references famous character: ${famous}`);
      }
    }

    // Check for common AI assistant patterns
    const aiPatterns = ['your personal assistant', 'here to help you', 'at your service'];
    for (const pattern of aiPatterns) {
      if (tagline.includes(pattern) || backstory.includes(pattern)) {
        warnings.push(`Uses generic AI assistant phrasing: "${pattern}"`);
      }
    }

    return warnings;
  }

  /**
   * Find similar existing personas
   */
  private async findSimilarPersonas(genome: PersonaGenome): Promise<
    DistinctivenessScore['similarPersonas']
  > {
    if (!this.embeddingProvider || !this.personaDB) {
      return [];
    }

    try {
      const description = this.buildPersonaDescription(genome);
      const personaEmbedding = await this.embeddingProvider.embed(description);
      const existingEmbeddings = await this.personaDB.getEmbeddings();

      const similar: DistinctivenessScore['similarPersonas'] = [];

      for (const existing of existingEmbeddings) {
        const similarity = this.cosineSimilarity(personaEmbedding, existing.embedding);

        if (similarity > 0.7) {
          similar.push({
            name: existing.name,
            similarity: similarity as NormalizedFloat,
            overlapAreas: ['personality', 'traits'], // Could be more specific
          });
        }
      }

      return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    } catch {
      return [];
    }
  }

  /**
   * Generate recommendations for improving uniqueness
   */
  private generateRecommendations(
    dimensions: DistinctivenessScore['dimensions'],
    genericTraits: string[],
    collisionWarnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (dimensions.traitUniqueness < 0.4) {
      recommendations.push('Replace generic traits with more specific, unusual ones');
      if (genericTraits.length > 0) {
        recommendations.push(`Consider replacing: ${genericTraits.slice(0, 3).join(', ')}`);
      }
    }

    if (dimensions.voiceSignature < 0.4) {
      recommendations.push('Customize voice with unique speaking patterns or clone a distinctive voice');
    }

    if (dimensions.archetypeDeviation < 0.4) {
      recommendations.push('Add traits that subvert or complicate the base archetype');
    }

    if (dimensions.semanticDistance < 0.4) {
      recommendations.push('The persona is too similar to existing characters - add unique backstory elements');
    }

    if (dimensions.nameOriginality < 0.4) {
      recommendations.push('Choose a more distinctive name that avoids common AI naming patterns');
    }

    if (collisionWarnings.length > 0) {
      recommendations.push('Avoid references to famous characters to maintain originality');
    }

    if (recommendations.length === 0) {
      recommendations.push('Persona has good distinctiveness! Consider adding specific quirks or contradictions for extra depth.');
    }

    return recommendations;
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(genome: PersonaGenome): number {
    let confidence = 0.5;

    // More data = higher confidence
    if (genome.mindDNA?.traits?.length && genome.mindDNA.traits.length > 3) confidence += 0.1;
    if (genome.mindDNA?.identity?.backstory) confidence += 0.1;
    if (genome.voiceDNA) confidence += 0.1;
    if (genome.metadata.tagline) confidence += 0.1;
    if (this.personaDB) confidence += 0.1; // Have comparison data

    return Math.min(1, confidence);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Build text description of persona for embedding
   */
  private buildPersonaDescription(genome: PersonaGenome): string {
    const parts: string[] = [];

    parts.push(`Name: ${genome.metadata.name}`);

    if (genome.metadata.tagline) {
      parts.push(`Tagline: ${genome.metadata.tagline}`);
    }

    if (genome.mindDNA?.identity?.archetype) {
      parts.push(`Archetype: ${genome.mindDNA.identity.archetype}`);
    }

    if (genome.mindDNA?.traits?.length) {
      parts.push(`Traits: ${genome.mindDNA.traits.join(', ')}`);
    }

    if (genome.mindDNA?.identity?.backstory) {
      parts.push(`Backstory: ${genome.mindDNA.identity.backstory.slice(0, 500)}`);
    }

    if (genome.mindDNA?.personality) {
      const p = genome.mindDNA.personality;
      parts.push(`Personality: O:${p.openness} C:${p.conscientiousness} E:${p.extraversion} A:${p.agreeableness} N:${p.neuroticism}`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a distinctiveness calculator with default configuration
 */
export function createDistinctivenessCalculator(
  config?: DistinctivenessConfig
): DistinctivenessCalculator {
  return new DistinctivenessCalculator(config);
}

// Export singleton instance for simple usage
export const distinctivenessCalculator = new DistinctivenessCalculator();
