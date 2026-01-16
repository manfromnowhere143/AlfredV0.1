/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE CREATE STUDIO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The persona creation wizard — a 6-act journey of bringing a digital being
 * to life. Each act reveals deeper layers of personalization.
 *
 * Acts:
 * 1. IDENTITY — Name, tagline, and archetype selection
 * 2. PERSONALITY — Fine-tune 30 personality facets
 * 3. VISUAL — Choose style and generate appearance
 * 4. VOICE — Select and preview voice options
 * 5. BACKSTORY — Define history, memories, and behaviors
 * 6. REVIEW — Final preview and launch
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  animation,
  Button,
  Card,
  Input,
  Textarea,
  Badge,
  Progress,
} from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type WizardAct = 1 | 2 | 3 | 4 | 5 | 6;

interface PersonaData {
  // Act 1: Identity
  name: string;
  tagline: string;
  archetype: string;

  // Act 2: Personality
  personality: Record<string, number>;

  // Act 3: Visual
  visualStyle: string;
  imagePrompt: string;
  imageUrl?: string;

  // Act 4: Voice
  voiceId: string;
  voiceName: string;

  // Act 5: Backstory
  backstory: string;
  coreMemories: string[];
  behaviors: string[];
  quirks: string[];

  // Act 6: Review
  isPublished: boolean;
}

interface CreateStudioProps {
  onComplete?: (data: PersonaData) => void;
  onCancel?: () => void;
  initialData?: Partial<PersonaData>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPES = [
  { id: "sage", name: "Sage", emoji: "🧙", description: "Wise, knowledgeable, seeks truth", color: "#8b5cf6" },
  { id: "hero", name: "Hero", emoji: "⚔️", description: "Brave, determined, rises to challenges", color: "#ef4444" },
  { id: "creator", name: "Creator", emoji: "🎨", description: "Innovative, artistic, builds new things", color: "#f59e0b" },
  { id: "caregiver", name: "Caregiver", emoji: "💚", description: "Nurturing, protective, helps others", color: "#10b981" },
  { id: "ruler", name: "Ruler", emoji: "👑", description: "Authoritative, organized, leads with vision", color: "#fcd34d" },
  { id: "jester", name: "Jester", emoji: "🃏", description: "Playful, humorous, brings joy", color: "#ec4899" },
  { id: "rebel", name: "Rebel", emoji: "🔥", description: "Revolutionary, bold, challenges norms", color: "#dc2626" },
  { id: "lover", name: "Lover", emoji: "💖", description: "Passionate, devoted, seeks connection", color: "#f472b6" },
  { id: "explorer", name: "Explorer", emoji: "🧭", description: "Curious, adventurous, seeks freedom", color: "#06b6d4" },
  { id: "innocent", name: "Innocent", emoji: "✨", description: "Pure, optimistic, sees the good", color: "#fcd34d" },
  { id: "magician", name: "Magician", emoji: "🌟", description: "Transformative, visionary, makes dreams real", color: "#6366f1" },
  { id: "outlaw", name: "Outlaw", emoji: "🗡️", description: "Disruptive, liberating, breaks rules", color: "#4a90d9" },
];

const VISUAL_STYLES = [
  { id: "photorealistic", name: "Photorealistic", description: "Ultra-realistic human appearance" },
  { id: "cinematic", name: "Cinematic", description: "Hollywood movie quality" },
  { id: "anime", name: "Anime", description: "Japanese animation style" },
  { id: "pixar", name: "Pixar 3D", description: "Pixar-quality 3D rendering" },
  { id: "illustration", name: "Illustration", description: "Digital art illustration" },
  { id: "painterly", name: "Painterly", description: "Classical painting aesthetic" },
  { id: "stylized", name: "Stylized", description: "Unique artistic interpretation" },
];

const PERSONALITY_FACETS = [
  { id: "openness", name: "Openness", description: "Curiosity and willingness to try new things", category: "mind" },
  { id: "conscientiousness", name: "Conscientiousness", description: "Organization and dependability", category: "mind" },
  { id: "extraversion", name: "Extraversion", description: "Energy from social interaction", category: "social" },
  { id: "agreeableness", name: "Agreeableness", description: "Cooperation and trust in others", category: "social" },
  { id: "neuroticism", name: "Emotional Stability", description: "Resilience to stress and negativity", category: "emotional" },
  { id: "humor", name: "Humor", description: "Tendency to find and create humor", category: "social" },
  { id: "assertiveness", name: "Assertiveness", description: "Confidence in expressing opinions", category: "social" },
  { id: "empathy", name: "Empathy", description: "Ability to understand others' feelings", category: "emotional" },
  { id: "creativity", name: "Creativity", description: "Innovative and original thinking", category: "mind" },
  { id: "patience", name: "Patience", description: "Calm and persistent temperament", category: "emotional" },
  { id: "curiosity", name: "Curiosity", description: "Desire to learn and explore", category: "mind" },
  { id: "optimism", name: "Optimism", description: "Positive outlook on life", category: "emotional" },
  { id: "formality", name: "Formality", description: "Preference for structure and protocol", category: "social" },
  { id: "playfulness", name: "Playfulness", description: "Lighthearted and fun-loving nature", category: "social" },
  { id: "directness", name: "Directness", description: "Straightforward communication style", category: "social" },
];

const VOICE_OPTIONS = [
  { id: "rachel", name: "Rachel", gender: "female", style: "warm", description: "Warm, friendly American voice" },
  { id: "drew", name: "Drew", gender: "male", style: "confident", description: "Confident, professional male voice" },
  { id: "clyde", name: "Clyde", gender: "male", style: "deep", description: "Deep, authoritative voice" },
  { id: "sarah", name: "Sarah", gender: "female", style: "soft", description: "Soft, soothing female voice" },
  { id: "adam", name: "Adam", gender: "male", style: "narrator", description: "Clear, narrative style" },
  { id: "antoni", name: "Antoni", gender: "male", style: "casual", description: "Casual, approachable male" },
  { id: "elli", name: "Elli", gender: "female", style: "young", description: "Young, energetic female" },
  { id: "josh", name: "Josh", gender: "male", style: "warm", description: "Warm, conversational male" },
];

const ACT_INFO = [
  { num: 1, title: "Identity", subtitle: "Who is your persona?" },
  { num: 2, title: "Personality", subtitle: "How do they think and feel?" },
  { num: 3, title: "Visual", subtitle: "What do they look like?" },
  { num: 4, title: "Voice", subtitle: "How do they sound?" },
  { num: 5, title: "Backstory", subtitle: "What's their history?" },
  { num: 6, title: "Review", subtitle: "Ready to launch?" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  arrowLeft: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrowRight: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.09 8.26L20 9.27L15.45 13.14L16.82 19.02L12 15.77L7.18 19.02L8.55 13.14L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════════════════════════════════════

const getDefaultPersonaData = (): PersonaData => ({
  name: "",
  tagline: "",
  archetype: "",
  personality: PERSONALITY_FACETS.reduce((acc, facet) => ({ ...acc, [facet.id]: 50 }), {}),
  visualStyle: "",
  imagePrompt: "",
  imageUrl: undefined,
  voiceId: "",
  voiceName: "",
  backstory: "",
  coreMemories: [],
  behaviors: [],
  quirks: [],
  isPublished: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE STUDIO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CreateStudio({ onComplete, onCancel, initialData }: CreateStudioProps) {
  const [currentAct, setCurrentAct] = useState<WizardAct>(1);
  const [data, setData] = useState<PersonaData>(() => ({
    ...getDefaultPersonaData(),
    ...initialData,
  }));
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const updateData = useCallback((updates: Partial<PersonaData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback(() => {
    switch (currentAct) {
      case 1:
        return data.name.trim().length > 0 && data.archetype.length > 0;
      case 2:
        return true; // Personality has defaults
      case 3:
        return data.visualStyle.length > 0;
      case 4:
        return data.voiceId.length > 0;
      case 5:
        return true; // Backstory is optional
      case 6:
        return true;
      default:
        return false;
    }
  }, [currentAct, data]);

  const handleNext = () => {
    if (currentAct < 6 && canProceed()) {
      setCurrentAct((prev) => (prev + 1) as WizardAct);
    }
  };

  const handleBack = () => {
    if (currentAct > 1) {
      setCurrentAct((prev) => (prev - 1) as WizardAct);
    }
  };

  const handleComplete = async () => {
    setIsCreating(true);
    try {
      await onComplete?.(data);
    } finally {
      setIsCreating(false);
    }
  };

  const progress = (currentAct / 6) * 100;

  return (
    <div
      style={{
        minHeight: "100%",
        padding: spacing[8],
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: spacing[8] }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: spacing[6] }}>
          <Progress value={progress} variant="gold" size="sm" />
        </div>

        {/* Act Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: spacing[2],
            overflowX: "auto",
            paddingBottom: spacing[2],
          }}
        >
          {ACT_INFO.map((act) => (
            <ActIndicator
              key={act.num}
              act={act}
              currentAct={currentAct}
              onClick={() => act.num < currentAct && setCurrentAct(act.num as WizardAct)}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAct}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", ...animation.spring.smooth }}
          >
            {currentAct === 1 && <Act1Identity data={data} updateData={updateData} />}
            {currentAct === 2 && <Act2Personality data={data} updateData={updateData} />}
            {currentAct === 3 && (
              <Act3Visual
                data={data}
                updateData={updateData}
                isGenerating={isGeneratingImage}
                onGenerate={() => setIsGeneratingImage(true)}
              />
            )}
            {currentAct === 4 && <Act4Voice data={data} updateData={updateData} />}
            {currentAct === 5 && <Act5Backstory data={data} updateData={updateData} />}
            {currentAct === 6 && <Act6Review data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: spacing[4],
          marginTop: spacing[8],
          paddingTop: spacing[6],
          borderTop: `1px solid ${colors.border.subtle}`,
        }}
      >
        <Button variant="ghost" onClick={currentAct === 1 ? onCancel : handleBack} icon={Icons.arrowLeft}>
          {currentAct === 1 ? "Cancel" : "Back"}
        </Button>

        {currentAct < 6 ? (
          <Button onClick={handleNext} disabled={!canProceed()} icon={Icons.arrowRight} iconPosition="right">
            Continue
          </Button>
        ) : (
          <Button onClick={handleComplete} loading={isCreating} icon={Icons.sparkle}>
            Create Persona
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

function ActIndicator({
  act,
  currentAct,
  onClick,
}: {
  act: (typeof ACT_INFO)[0];
  currentAct: WizardAct;
  onClick: () => void;
}) {
  const isActive = act.num === currentAct;
  const isComplete = act.num < currentAct;
  const isFuture = act.num > currentAct;

  return (
    <motion.button
      whileHover={isComplete ? { scale: 1.02 } : undefined}
      whileTap={isComplete ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={!isComplete}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        padding: `${spacing[2]} ${spacing[4]}`,
        background: isActive ? colors.gold.glow : "transparent",
        border: "none",
        borderRadius: radius.lg,
        cursor: isComplete ? "pointer" : "default",
        opacity: isFuture ? 0.4 : 1,
        minWidth: "fit-content",
      }}
    >
      <div
        style={{
          width: spacing[8],
          height: spacing[8],
          borderRadius: radius.full,
          background: isComplete ? colors.gold[400] : isActive ? colors.gold.glow : colors.bg.hover,
          border: isActive ? `2px solid ${colors.gold[400]}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isComplete ? colors.bg.void : isActive ? colors.gold[400] : colors.text.muted,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {isComplete ? Icons.check : act.num}
      </div>
      <div style={{ textAlign: "left" }}>
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: isActive ? colors.gold[400] : isComplete ? colors.text.primary : colors.text.muted,
          }}
        >
          {act.title}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            display: "none",
          }}
          className="act-subtitle"
        >
          {act.subtitle}
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 1: IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

function Act1Identity({
  data,
  updateData,
}: {
  data: PersonaData;
  updateData: (updates: Partial<PersonaData>) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Identity"
        subtitle="Define who your persona is at their core. Choose a name, a defining tagline, and an archetype that shapes their worldview."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[6] }}>
        {/* Name Input */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[2],
            }}
          >
            Name
          </label>
          <Input
            placeholder="What shall we call your persona?"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            size="lg"
          />
        </div>

        {/* Tagline Input */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[2],
            }}
          >
            Tagline
          </label>
          <Input
            placeholder="A short phrase that captures their essence..."
            value={data.tagline}
            onChange={(e) => updateData({ tagline: e.target.value })}
          />
        </div>

        {/* Archetype Selection */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[3],
            }}
          >
            Archetype — Choose the core personality pattern
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: spacing[3],
            }}
          >
            {ARCHETYPES.map((archetype) => (
              <ArchetypeCard
                key={archetype.id}
                archetype={archetype}
                isSelected={data.archetype === archetype.id}
                onClick={() => updateData({ archetype: archetype.id })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchetypeCard({
  archetype,
  isSelected,
  onClick,
}: {
  archetype: (typeof ARCHETYPES)[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        padding: spacing[4],
        background: isSelected ? `${archetype.color}20` : colors.bg.elevated,
        border: `2px solid ${isSelected ? archetype.color : colors.border.default}`,
        borderRadius: radius.xl,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: isSelected ? `0 0 20px ${archetype.color}40` : "none",
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize["2xl"],
          marginBottom: spacing[2],
        }}
      >
        {archetype.emoji}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: isSelected ? archetype.color : colors.text.primary,
          marginBottom: spacing[1],
        }}
      >
        {archetype.name}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          lineHeight: typography.lineHeight.normal,
        }}
      >
        {archetype.description}
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 2: PERSONALITY
// ═══════════════════════════════════════════════════════════════════════════════

function Act2Personality({
  data,
  updateData,
}: {
  data: PersonaData;
  updateData: (updates: Partial<PersonaData>) => void;
}) {
  const categories = [
    { id: "mind", label: "Mind" },
    { id: "social", label: "Social" },
    { id: "emotional", label: "Emotional" },
  ];

  return (
    <div>
      <SectionHeader
        title="Personality"
        subtitle="Fine-tune the personality traits that will shape how your persona thinks, feels, and interacts. Each slider adjusts a different facet of their character."
      />

      {categories.map((category) => (
        <div key={category.id} style={{ marginBottom: spacing[8] }}>
          <h3
            style={{
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[4],
              textTransform: "uppercase",
              letterSpacing: typography.letterSpacing.wider,
            }}
          >
            {category.label}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
            {PERSONALITY_FACETS.filter((f) => f.category === category.id).map((facet) => (
              <PersonalitySlider
                key={facet.id}
                facet={facet}
                value={data.personality[facet.id] || 50}
                onChange={(value) =>
                  updateData({
                    personality: { ...data.personality, [facet.id]: value },
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonalitySlider({
  facet,
  value,
  onChange,
}: {
  facet: (typeof PERSONALITY_FACETS)[0];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[4],
      }}
    >
      <div style={{ flex: 1, minWidth: "120px" }}>
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
          }}
        >
          {facet.name}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          {facet.description}
        </div>
      </div>
      <div style={{ flex: 2, display: "flex", alignItems: "center", gap: spacing[3] }}>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            flex: 1,
            height: spacing[2],
            appearance: "none",
            background: colors.bg.hover,
            borderRadius: radius.full,
            outline: "none",
            cursor: "pointer",
          }}
        />
        <span
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.gold[400],
            minWidth: "36px",
            textAlign: "right",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 3: VISUAL
// ═══════════════════════════════════════════════════════════════════════════════

function Act3Visual({
  data,
  updateData,
  isGenerating,
  onGenerate,
}: {
  data: PersonaData;
  updateData: (updates: Partial<PersonaData>) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Visual Identity"
        subtitle="Choose an artistic style and describe the visual appearance of your persona. We'll generate a unique portrait that brings them to life."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[6] }}>
        {/* Visual Style Selection */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[3],
            }}
          >
            Visual Style
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: spacing[3],
            }}
          >
            {VISUAL_STYLES.map((style) => (
              <motion.button
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateData({ visualStyle: style.id })}
                style={{
                  padding: spacing[4],
                  background: data.visualStyle === style.id ? colors.gold.glow : colors.bg.elevated,
                  border: `2px solid ${data.visualStyle === style.id ? colors.gold[400] : colors.border.default}`,
                  borderRadius: radius.lg,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: data.visualStyle === style.id ? colors.gold[400] : colors.text.primary,
                    marginBottom: spacing[1],
                  }}
                >
                  {style.name}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                  }}
                >
                  {style.description}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Image Prompt */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[2],
            }}
          >
            Describe their appearance
          </label>
          <Textarea
            placeholder="Describe how your persona looks... (age, features, expression, attire, etc.)"
            value={data.imagePrompt}
            onChange={(e) => updateData({ imagePrompt: e.target.value })}
          />
        </div>

        {/* Generated Image Preview */}
        <div
          style={{
            display: "flex",
            gap: spacing[6],
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flex: 1,
              aspectRatio: "1",
              background: colors.bg.elevated,
              borderRadius: radius["2xl"],
              border: `1px solid ${colors.border.default}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {data.imageUrl ? (
              <img
                src={data.imageUrl}
                alt="Generated persona"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: spacing[8] }}>
                <div
                  style={{
                    fontSize: typography.fontSize["3xl"],
                    marginBottom: spacing[3],
                  }}
                >
                  🎨
                </div>
                <p
                  style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.muted,
                  }}
                >
                  {isGenerating ? "Generating..." : "Generate a portrait"}
                </p>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
            <Button
              onClick={onGenerate}
              disabled={!data.visualStyle || isGenerating}
              loading={isGenerating}
              icon={Icons.sparkle}
            >
              Generate
            </Button>
            {data.imageUrl && (
              <Button variant="secondary" onClick={onGenerate} icon={Icons.refresh}>
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 4: VOICE
// ═══════════════════════════════════════════════════════════════════════════════

function Act4Voice({
  data,
  updateData,
}: {
  data: PersonaData;
  updateData: (updates: Partial<PersonaData>) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Voice"
        subtitle="Select a voice that matches your persona's character. Preview each option to find the perfect sound."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: spacing[4],
        }}
      >
        {VOICE_OPTIONS.map((voice) => (
          <motion.button
            key={voice.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => updateData({ voiceId: voice.id, voiceName: voice.name })}
            style={{
              padding: spacing[5],
              background: data.voiceId === voice.id ? colors.gold.glow : colors.bg.elevated,
              border: `2px solid ${data.voiceId === voice.id ? colors.gold[400] : colors.border.default}`,
              borderRadius: radius.xl,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: spacing[4],
            }}
          >
            {/* Play Button */}
            <div
              style={{
                width: spacing[12],
                height: spacing[12],
                borderRadius: radius.full,
                background: data.voiceId === voice.id ? colors.gold[400] : colors.bg.hover,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: data.voiceId === voice.id ? colors.bg.void : colors.text.muted,
                flexShrink: 0,
              }}
            >
              {Icons.play}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing[2], marginBottom: spacing[1] }}>
                <span
                  style={{
                    fontSize: typography.fontSize.md,
                    fontWeight: typography.fontWeight.semibold,
                    color: data.voiceId === voice.id ? colors.gold[400] : colors.text.primary,
                  }}
                >
                  {voice.name}
                </span>
                <Badge variant={voice.gender === "female" ? "info" : "default"}>{voice.gender}</Badge>
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.muted,
                }}
              >
                {voice.description}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 5: BACKSTORY
// ═══════════════════════════════════════════════════════════════════════════════

function Act5Backstory({
  data,
  updateData,
}: {
  data: PersonaData;
  updateData: (updates: Partial<PersonaData>) => void;
}) {
  const [newMemory, setNewMemory] = useState("");
  const [newBehavior, setNewBehavior] = useState("");
  const [newQuirk, setNewQuirk] = useState("");

  const addItem = (type: "coreMemories" | "behaviors" | "quirks", value: string, setValue: (v: string) => void) => {
    if (value.trim()) {
      updateData({ [type]: [...data[type], value.trim()] });
      setValue("");
    }
  };

  const removeItem = (type: "coreMemories" | "behaviors" | "quirks", index: number) => {
    updateData({ [type]: data[type].filter((_, i) => i !== index) });
  };

  return (
    <div>
      <SectionHeader
        title="Backstory"
        subtitle="Give your persona depth with a background story, formative memories, consistent behaviors, and unique quirks."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[6] }}>
        {/* Backstory Text */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.secondary,
              marginBottom: spacing[2],
            }}
          >
            Background Story
          </label>
          <Textarea
            placeholder="Tell us about your persona's history, where they come from, and what shaped them..."
            value={data.backstory}
            onChange={(e) => updateData({ backstory: e.target.value })}
            style={{ minHeight: spacing[32] }}
          />
        </div>

        {/* Core Memories */}
        <ListEditor
          label="Core Memories"
          description="Formative experiences that shape their responses"
          items={data.coreMemories}
          placeholder="Add a core memory..."
          value={newMemory}
          onChange={setNewMemory}
          onAdd={() => addItem("coreMemories", newMemory, setNewMemory)}
          onRemove={(i) => removeItem("coreMemories", i)}
        />

        {/* Behaviors */}
        <ListEditor
          label="Behaviors"
          description="Consistent patterns in how they act"
          items={data.behaviors}
          placeholder="Add a behavior..."
          value={newBehavior}
          onChange={setNewBehavior}
          onAdd={() => addItem("behaviors", newBehavior, setNewBehavior)}
          onRemove={(i) => removeItem("behaviors", i)}
        />

        {/* Quirks */}
        <ListEditor
          label="Quirks"
          description="Unique traits that make them memorable"
          items={data.quirks}
          placeholder="Add a quirk..."
          value={newQuirk}
          onChange={setNewQuirk}
          onAdd={() => addItem("quirks", newQuirk, setNewQuirk)}
          onRemove={(i) => removeItem("quirks", i)}
        />
      </div>
    </div>
  );
}

function ListEditor({
  label,
  description,
  items,
  placeholder,
  value,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  description: string;
  items: string[];
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.secondary,
          marginBottom: spacing[1],
        }}
      >
        {label}
      </label>
      <p
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginBottom: spacing[3],
        }}
      >
        {description}
      </p>

      {/* Items */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[2], marginBottom: spacing[3] }}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing[2],
              padding: `${spacing[2]} ${spacing[3]}`,
              background: colors.bg.elevated,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border.default}`,
            }}
          >
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{item}</span>
            <button
              onClick={() => onRemove(i)}
              style={{
                background: "none",
                border: "none",
                color: colors.text.muted,
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              {Icons.x}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add Input */}
      <div style={{ display: "flex", gap: spacing[2] }}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          size="sm"
        />
        <Button variant="secondary" size="sm" onClick={onAdd} icon={Icons.plus}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACT 6: REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function Act6Review({ data }: { data: PersonaData }) {
  const archetype = ARCHETYPES.find((a) => a.id === data.archetype);
  const visualStyle = VISUAL_STYLES.find((v) => v.id === data.visualStyle);
  const voice = VOICE_OPTIONS.find((v) => v.id === data.voiceId);

  return (
    <div>
      <SectionHeader
        title="Review & Launch"
        subtitle="Review your persona's configuration before bringing them to life. Everything looks good? Hit Create!"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: spacing[6],
        }}
      >
        {/* Persona Preview Card */}
        <Card variant="elevated" padding={0}>
          <div
            style={{
              aspectRatio: "4/3",
              background: colors.bg.base,
              borderRadius: `${radius["2xl"]} ${radius["2xl"]} 0 0`,
              overflow: "hidden",
            }}
          >
            {data.imageUrl ? (
              <img src={data.imageUrl} alt={data.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: typography.fontSize["5xl"],
                  color: colors.text.muted,
                }}
              >
                {data.name.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div style={{ padding: spacing[5] }}>
            <h2
              style={{
                fontSize: typography.fontSize["2xl"],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              {data.name || "Unnamed Persona"}
            </h2>
            <p
              style={{
                fontSize: typography.fontSize.md,
                color: colors.text.secondary,
                margin: `${spacing[1]} 0 0 0`,
              }}
            >
              {data.tagline || "No tagline set"}
            </p>
            {archetype && (
              <div style={{ marginTop: spacing[4] }}>
                <Badge variant="gold">
                  {archetype.emoji} {archetype.name}
                </Badge>
              </div>
            )}
          </div>
        </Card>

        {/* Configuration Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
          <ReviewSection
            title="Visual Style"
            value={visualStyle?.name || "Not selected"}
            icon="🎨"
          />
          <ReviewSection
            title="Voice"
            value={voice?.name || "Not selected"}
            icon="🎤"
          />
          <ReviewSection
            title="Personality Traits"
            value={`${Object.values(data.personality).filter((v) => v !== 50).length} customized`}
            icon="🧠"
          />
          <ReviewSection
            title="Core Memories"
            value={`${data.coreMemories.length} defined`}
            icon="💭"
          />
          <ReviewSection
            title="Behaviors"
            value={`${data.behaviors.length} defined`}
            icon="⚡"
          />
          <ReviewSection
            title="Quirks"
            value={`${data.quirks.length} defined`}
            icon="✨"
          />
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[4],
        padding: spacing[4],
        background: colors.bg.elevated,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border.default}`,
      }}
    >
      <span style={{ fontSize: typography.fontSize.xl }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            textTransform: "uppercase",
            letterSpacing: typography.letterSpacing.wider,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: spacing[8] }}>
      <h2
        style={{
          fontSize: typography.fontSize["2xl"],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: 0,
          marginBottom: spacing[2],
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          margin: 0,
          maxWidth: "600px",
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

export default CreateStudio;
