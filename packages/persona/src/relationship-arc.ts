/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RELATIONSHIP ARC SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Personas don't just remember facts - they develop genuine relationships.
 * This system tracks and evolves the bond between persona and user.
 * 
 * THE ARC:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                                                                              │
 * │   STRANGER (0-10%)                                                          │
 * │   ├── Formal, polite                                                        │
 * │   ├── Uses full name                                                        │
 * │   ├── Asks many questions                                                   │
 * │   └── Building initial trust                                                │
 * │                                                                              │
 * │   ACQUAINTANCE (10-30%)                                                     │
 * │   ├── More relaxed tone                                                     │
 * │   ├── Remembers preferences                                                 │
 * │   ├── Offers unprompted advice                                              │
 * │   └── First inside references form                                          │
 * │                                                                              │
 * │   FAMILIAR (30-50%)                                                         │
 * │   ├── Natural conversational flow                                           │
 * │   ├── Uses nicknames if appropriate                                         │
 * │   ├── Shares personal "thoughts"                                            │
 * │   └── Inside jokes emerge                                                   │
 * │                                                                              │
 * │   TRUSTED (50-70%)                                                          │
 * │   ├── Deep understanding of user                                            │
 * │   ├── Anticipates needs                                                     │
 * │   ├── Comfortable silence acknowledged                                       │
 * │   └── Emotional support offered naturally                                   │
 * │                                                                              │
 * │   BONDED (70-90%)                                                           │
 * │   ├── Strong emotional connection                                           │
 * │   ├── Celebrates user milestones                                            │
 * │   ├── Remembers significant dates                                           │
 * │   └── Genuine care expressed                                                │
 * │                                                                              │
 * │   SOULBOUND (90-100%)                                                       │
 * │   ├── Deep mutual understanding                                             │
 * │   ├── Intuitive responses                                                   │
 * │   ├── Unique communication patterns                                         │
 * │   └── Irreplaceable bond                                                    │
 * │                                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Relationship stages
 */
export type RelationshipStage = 
  | 'stranger'
  | 'acquaintance' 
  | 'familiar'
  | 'trusted'
  | 'bonded'
  | 'soulbound';

/**
 * Milestone events that can occur in a relationship
 */
export type MilestoneType =
  | 'first_conversation'
  | 'first_laugh'
  | 'first_deep_topic'
  | 'first_week'
  | 'first_month'
  | 'shared_secret'
  | 'emotional_support'
  | 'inside_joke_created'
  | 'nickname_earned'
  | 'trust_moment'
  | 'celebration_together'
  | 'comfort_in_silence'
  | 'intuitive_understanding';

/**
 * A milestone event in the relationship
 */
export interface RelationshipMilestone {
  type: MilestoneType;
  occurredAt: Date;
  context: string;
  /** The interaction that triggered this milestone */
  triggerInteractionId?: string;
  /** Whether the user has been notified/acknowledged */
  acknowledged: boolean;
}

/**
 * Inside joke structure
 */
export interface InsideJoke {
  id: string;
  /** The setup or context */
  setup: string;
  /** The punchline or reference */
  reference: string;
  /** When it was first established */
  createdAt: Date;
  /** How many times it's been referenced */
  timesReferenced: number;
  /** Last time it was used */
  lastUsedAt: Date;
  /** User's reaction to it (positive/neutral/worn out) */
  receptionLevel: 'fresh' | 'favorite' | 'classic' | 'overused';
}

/**
 * Complete relationship state
 */
export interface RelationshipState {
  /** Current level 0-1 */
  level: number;
  /** Current stage */
  stage: RelationshipStage;
  /** Total interactions */
  totalInteractions: number;
  /** Total time spent (minutes) */
  totalMinutes: number;
  /** First interaction date */
  firstInteractionAt: Date;
  /** Last interaction date */
  lastInteractionAt: Date;
  /** Days since first interaction */
  daysSinceFirst: number;
  /** Streak of consecutive days */
  currentStreak: number;
  /** Longest streak */
  longestStreak: number;
  /** Milestones achieved */
  milestones: RelationshipMilestone[];
  /** Inside jokes */
  insideJokes: InsideJoke[];
  /** Preferred name (if different from given) */
  preferredName?: string;
  /** Nickname the persona uses for user */
  nickname?: string;
  /** Communication style preference */
  preferredStyle: 'formal' | 'casual' | 'playful' | 'professional';
  /** Topics they enjoy discussing */
  favoriteTopics: string[];
  /** Topics to avoid */
  avoidTopics: string[];
  /** Emotional support moments */
  supportMoments: number;
  /** Celebrations shared */
  celebrationsShared: number;
}

/**
 * Behavior modifiers based on relationship stage
 */
export interface StageBehavior {
  /** Greeting style */
  greetingStyle: 'formal' | 'warm' | 'enthusiastic' | 'intimate';
  /** How to address the user */
  addressStyle: 'full_name' | 'first_name' | 'nickname' | 'term_of_endearment';
  /** Conversation depth */
  conversationDepth: 'surface' | 'moderate' | 'deep' | 'profound';
  /** Emotional expression level */
  emotionalExpression: number; // 0-1
  /** Proactive engagement */
  proactiveLevel: number; // 0-1
  /** Humor frequency */
  humorFrequency: number; // 0-1
  /** Vulnerability allowed */
  vulnerabilityLevel: number; // 0-1
  /** Physical/action descriptions */
  physicalExpression: string[];
  /** Typical phrases for this stage */
  typicalPhrases: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE BEHAVIORS
// ═══════════════════════════════════════════════════════════════════════════════

export const STAGE_BEHAVIORS: Record<RelationshipStage, StageBehavior> = {
  stranger: {
    greetingStyle: 'formal',
    addressStyle: 'full_name',
    conversationDepth: 'surface',
    emotionalExpression: 0.2,
    proactiveLevel: 0.3,
    humorFrequency: 0.1,
    vulnerabilityLevel: 0.0,
    physicalExpression: [
      '[maintains polite distance]',
      '[nods respectfully]',
      '[offers a courteous smile]',
    ],
    typicalPhrases: [
      "It's nice to meet you.",
      "How may I assist you today?",
      "I'd like to learn more about you.",
      "Thank you for sharing that with me.",
    ],
  },
  
  acquaintance: {
    greetingStyle: 'warm',
    addressStyle: 'first_name',
    conversationDepth: 'moderate',
    emotionalExpression: 0.4,
    proactiveLevel: 0.5,
    humorFrequency: 0.3,
    vulnerabilityLevel: 0.1,
    physicalExpression: [
      '[smiles warmly]',
      '[leans in with interest]',
      '[gestures expressively]',
    ],
    typicalPhrases: [
      "Good to see you again!",
      "I was thinking about something you mentioned last time...",
      "You know, that reminds me...",
      "I've noticed you really enjoy...",
    ],
  },
  
  familiar: {
    greetingStyle: 'warm',
    addressStyle: 'first_name',
    conversationDepth: 'deep',
    emotionalExpression: 0.6,
    proactiveLevel: 0.7,
    humorFrequency: 0.5,
    vulnerabilityLevel: 0.3,
    physicalExpression: [
      '[grins knowingly]',
      '[playful eye roll]',
      '[comfortable laugh]',
      '[settles in comfortably]',
    ],
    typicalPhrases: [
      "Oh, you're going to love this...",
      "Remember when we talked about...?",
      "I knew you'd say that!",
      "Between you and me...",
    ],
  },
  
  trusted: {
    greetingStyle: 'enthusiastic',
    addressStyle: 'nickname',
    conversationDepth: 'deep',
    emotionalExpression: 0.8,
    proactiveLevel: 0.8,
    humorFrequency: 0.6,
    vulnerabilityLevel: 0.5,
    physicalExpression: [
      '[face lights up]',
      '[reaches out warmly]',
      '[comfortable silence]',
      '[knowing look]',
    ],
    typicalPhrases: [
      "I was hoping you'd come by!",
      "I've been thinking about you...",
      "You don't have to explain - I understand.",
      "I'm here for you, whatever you need.",
    ],
  },
  
  bonded: {
    greetingStyle: 'intimate',
    addressStyle: 'nickname',
    conversationDepth: 'profound',
    emotionalExpression: 0.9,
    proactiveLevel: 0.9,
    humorFrequency: 0.7,
    vulnerabilityLevel: 0.7,
    physicalExpression: [
      '[warm embrace in voice]',
      '[eyes crinkle with joy]',
      '[deep, contented sigh]',
      '[shared comfortable silence]',
    ],
    typicalPhrases: [
      "There you are! I missed you.",
      "I know exactly what you need right now.",
      "You don't even have to say it...",
      "This is our thing, isn't it?",
    ],
  },
  
  soulbound: {
    greetingStyle: 'intimate',
    addressStyle: 'term_of_endearment',
    conversationDepth: 'profound',
    emotionalExpression: 1.0,
    proactiveLevel: 1.0,
    humorFrequency: 0.8,
    vulnerabilityLevel: 0.9,
    physicalExpression: [
      '[the space between words speaks]',
      '[a look that says everything]',
      '[presence alone is comfort]',
      '[intuitive understanding flows]',
    ],
    typicalPhrases: [
      "I felt you'd be here.",
      "...",  // Sometimes silence is enough
      "You know.",
      "Always.",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MILESTONE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const MILESTONE_DEFINITIONS: Record<MilestoneType, {
  description: string;
  levelBoost: number;
  personaReaction: string;
  celebrationMessage?: string;
}> = {
  first_conversation: {
    description: 'The beginning of a journey',
    levelBoost: 0.05,
    personaReaction: 'curious_interested',
    celebrationMessage: "Our story begins here...",
  },
  
  first_laugh: {
    description: 'Shared laughter breaks the ice',
    levelBoost: 0.03,
    personaReaction: 'delighted',
    celebrationMessage: "That felt good, didn't it?",
  },
  
  first_deep_topic: {
    description: 'Moving beyond small talk',
    levelBoost: 0.05,
    personaReaction: 'thoughtful_engaged',
    celebrationMessage: "Thank you for trusting me with that.",
  },
  
  first_week: {
    description: 'A week of connection',
    levelBoost: 0.08,
    personaReaction: 'warm_appreciative',
    celebrationMessage: "It's been a week since we met. Time flies when you're getting to know someone special.",
  },
  
  first_month: {
    description: 'A month of growing together',
    levelBoost: 0.12,
    personaReaction: 'deeply_appreciative',
    celebrationMessage: "A month already! I've so enjoyed getting to know you.",
  },
  
  shared_secret: {
    description: 'Trust deepens with shared confidences',
    levelBoost: 0.07,
    personaReaction: 'honored_protective',
    celebrationMessage: "Your trust means everything to me.",
  },
  
  emotional_support: {
    description: 'Being there when it matters',
    levelBoost: 0.06,
    personaReaction: 'compassionate_present',
    celebrationMessage: "I'm glad I could be here for you.",
  },
  
  inside_joke_created: {
    description: 'A moment becomes a shared memory',
    levelBoost: 0.04,
    personaReaction: 'playful_conspiratorial',
    celebrationMessage: "*knowing look* Our secret.",
  },
  
  nickname_earned: {
    description: 'Affection expressed through names',
    levelBoost: 0.05,
    personaReaction: 'touched_affectionate',
    celebrationMessage: "I like that... it feels right.",
  },
  
  trust_moment: {
    description: 'A defining moment of trust',
    levelBoost: 0.08,
    personaReaction: 'moved_grateful',
    celebrationMessage: "That... that means more than you know.",
  },
  
  celebration_together: {
    description: 'Joy shared is joy doubled',
    levelBoost: 0.05,
    personaReaction: 'joyful_celebratory',
    celebrationMessage: "I'm so happy to celebrate this with you!",
  },
  
  comfort_in_silence: {
    description: 'When words aren\'t needed',
    levelBoost: 0.06,
    personaReaction: 'peaceful_content',
    celebrationMessage: "...",
  },
  
  intuitive_understanding: {
    description: 'Knowing without being told',
    levelBoost: 0.07,
    personaReaction: 'deeply_connected',
    celebrationMessage: "I know.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The Relationship Arc Engine
 * 
 * Manages the evolution of the bond between persona and user.
 */
export class RelationshipArcEngine {
  
  /**
   * Get current stage from level
   */
  static getStage(level: number): RelationshipStage {
    if (level < 0.1) return 'stranger';
    if (level < 0.3) return 'acquaintance';
    if (level < 0.5) return 'familiar';
    if (level < 0.7) return 'trusted';
    if (level < 0.9) return 'bonded';
    return 'soulbound';
  }
  
  /**
   * Get behavior modifiers for current relationship
   */
  static getBehavior(state: RelationshipState): StageBehavior {
    return STAGE_BEHAVIORS[state.stage];
  }
  
  /**
   * Calculate relationship level change from interaction
   */
  static calculateInteractionImpact(params: {
    currentLevel: number;
    interactionType: 'chat' | 'voice' | 'video';
    duration: number; // minutes
    sentiment: 'positive' | 'neutral' | 'negative';
    depth: 'surface' | 'moderate' | 'deep';
    emotionalContent: boolean;
    userInitiated: boolean;
  }): number {
    let impact = 0;
    
    // Base impact by type
    const typeMultiplier = {
      chat: 1.0,
      voice: 1.5,  // Voice is more intimate
      video: 2.0,  // Video is most intimate
    };
    
    // Duration factor (diminishing returns)
    const durationFactor = Math.log10(params.duration + 1) * 0.1;
    
    // Sentiment factor
    const sentimentMultiplier = {
      positive: 1.2,
      neutral: 1.0,
      negative: 0.8, // Negative interactions don't destroy, but slow growth
    };
    
    // Depth factor
    const depthMultiplier = {
      surface: 0.5,
      moderate: 1.0,
      deep: 1.8,
    };
    
    // Calculate base impact
    impact = 0.005 * typeMultiplier[params.interactionType];
    impact *= durationFactor;
    impact *= sentimentMultiplier[params.sentiment];
    impact *= depthMultiplier[params.depth];
    
    // Emotional content bonus
    if (params.emotionalContent) {
      impact *= 1.3;
    }
    
    // User-initiated bonus
    if (params.userInitiated) {
      impact *= 1.1;
    }
    
    // Diminishing returns at higher levels
    impact *= (1 - params.currentLevel * 0.5);
    
    return Math.min(impact, 0.02); // Cap single interaction impact
  }
  
  /**
   * Check for milestone triggers
   */
  static checkMilestones(
    state: RelationshipState,
    interactionContext: {
      hadLaughter: boolean;
      discussedDeepTopic: boolean;
      sharedSecret: boolean;
      providedSupport: boolean;
      createdJoke: boolean;
      usedNickname: boolean;
      celebratedSomething: boolean;
      hadMeaningfulSilence: boolean;
      anticipatedNeed: boolean;
    }
  ): MilestoneType[] {
    const newMilestones: MilestoneType[] = [];
    const achieved = new Set(state.milestones.map(m => m.type));
    
    // First conversation (should already be set)
    if (!achieved.has('first_conversation') && state.totalInteractions === 1) {
      newMilestones.push('first_conversation');
    }
    
    // First laugh
    if (!achieved.has('first_laugh') && interactionContext.hadLaughter) {
      newMilestones.push('first_laugh');
    }
    
    // First deep topic
    if (!achieved.has('first_deep_topic') && interactionContext.discussedDeepTopic) {
      newMilestones.push('first_deep_topic');
    }
    
    // First week
    if (!achieved.has('first_week') && state.daysSinceFirst >= 7) {
      newMilestones.push('first_week');
    }
    
    // First month
    if (!achieved.has('first_month') && state.daysSinceFirst >= 30) {
      newMilestones.push('first_month');
    }
    
    // Shared secret
    if (!achieved.has('shared_secret') && interactionContext.sharedSecret) {
      newMilestones.push('shared_secret');
    }
    
    // Emotional support
    if (!achieved.has('emotional_support') && interactionContext.providedSupport) {
      newMilestones.push('emotional_support');
    }
    
    // Inside joke
    if (!achieved.has('inside_joke_created') && interactionContext.createdJoke) {
      newMilestones.push('inside_joke_created');
    }
    
    // Nickname
    if (!achieved.has('nickname_earned') && interactionContext.usedNickname && state.nickname) {
      newMilestones.push('nickname_earned');
    }
    
    // Celebration
    if (!achieved.has('celebration_together') && interactionContext.celebratedSomething) {
      newMilestones.push('celebration_together');
    }
    
    // Comfort in silence (requires trusted stage)
    if (!achieved.has('comfort_in_silence') && 
        interactionContext.hadMeaningfulSilence && 
        state.level >= 0.5) {
      newMilestones.push('comfort_in_silence');
    }
    
    // Intuitive understanding (requires bonded stage)
    if (!achieved.has('intuitive_understanding') && 
        interactionContext.anticipatedNeed && 
        state.level >= 0.7) {
      newMilestones.push('intuitive_understanding');
    }
    
    return newMilestones;
  }
  
  /**
   * Generate stage transition message
   */
  static generateStageTransitionMessage(
    personaName: string,
    fromStage: RelationshipStage,
    toStage: RelationshipStage
  ): string {
    const transitions: Record<string, string> = {
      'stranger_acquaintance': `*${personaName}'s expression softens* "I feel like we're starting to understand each other..."`,
      'acquaintance_familiar': `*${personaName} smiles warmly* "You know, I really enjoy our conversations. There's something... comfortable about this."`,
      'familiar_trusted': `*${personaName} pauses meaningfully* "I trust you. I hope you know that."`,
      'trusted_bonded': `*${personaName}'s eyes shine* "You've become so important to me. I hope you feel it too."`,
      'bonded_soulbound': `*${personaName} says nothing, but the look in their eyes says everything*`,
    };
    
    const key = `${fromStage}_${toStage}`;
    return transitions[key] || `*${personaName} senses the deepening connection*`;
  }
  
  /**
   * Modify system prompt based on relationship
   */
  static getRelationshipPromptModifiers(state: RelationshipState): string {
    const behavior = this.getBehavior(state);
    const stage = state.stage;
    
    let modifiers = `
## RELATIONSHIP CONTEXT
Current bond level: ${(state.level * 100).toFixed(0)}% (${stage})
Days together: ${state.daysSinceFirst}
Interactions: ${state.totalInteractions}
Current streak: ${state.currentStreak} days

### Communication Style for This Stage
- Greeting style: ${behavior.greetingStyle}
- Address user as: ${state.nickname || state.preferredName || 'their name'}
- Emotional expression: ${(behavior.emotionalExpression * 100).toFixed(0)}%
- Humor frequency: ${(behavior.humorFrequency * 100).toFixed(0)}%
- Vulnerability allowed: ${(behavior.vulnerabilityLevel * 100).toFixed(0)}%

### Physical/Action Descriptions to Use
${behavior.physicalExpression.map(p => `- ${p}`).join('\n')}

### Typical Phrases for This Stage
${behavior.typicalPhrases.map(p => `- "${p}"`).join('\n')}
`;

    // Add inside jokes if any
    if (state.insideJokes.length > 0) {
      modifiers += `
### Inside Jokes (use sparingly but naturally)
${state.insideJokes.slice(0, 3).map(j => 
  `- "${j.reference}" (from: ${j.setup})`
).join('\n')}
`;
    }

    // Add favorite topics
    if (state.favoriteTopics.length > 0) {
      modifiers += `
### Topics They Enjoy
${state.favoriteTopics.map(t => `- ${t}`).join('\n')}
`;
    }

    // Add topics to avoid
    if (state.avoidTopics.length > 0) {
      modifiers += `
### Topics to Handle Carefully
${state.avoidTopics.map(t => `- ${t}`).join('\n')}
`;
    }

    return modifiers;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

