/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE SETTINGS STUDIO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Full persona configuration and management interface. Edit any aspect of
 * your persona's identity, personality, appearance, and behavior.
 *
 * Features:
 * - Tabbed interface for different settings categories
 * - Live preview of changes
 * - Export/Import persona configurations
 * - Danger zone for destructive actions
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
} from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SettingsTab = "identity" | "personality" | "voice" | "memory" | "behavior" | "danger";

interface PersonaSettings {
  id: string;
  name: string;
  tagline: string;
  archetype: string;
  visualStyle: string;
  imageUrl?: string;
  voiceId: string;
  voiceName: string;
  personality: Record<string, number>;
  backstory: string;
  coreMemories: string[];
  behaviors: string[];
  quirks: string[];
  systemPromptOverride?: string;
  responseStyle?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsStudioProps {
  persona: PersonaSettings;
  onSave?: (updates: Partial<PersonaSettings>) => Promise<void>;
  onDelete?: () => void;
  onExport?: () => void;
  onBack?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  save: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  brain: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04" />
    </svg>
  ),
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
    </svg>
  ),
  memory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 6V4M10 6V4M14 6V4M18 6V4M6 18v2M10 18v2M14 18v2M18 18v2" />
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  download: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TABS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "identity", label: "Identity", icon: Icons.user, description: "Name, tagline, archetype" },
  { id: "personality", label: "Personality", icon: Icons.brain, description: "Traits and character" },
  { id: "voice", label: "Voice", icon: Icons.mic, description: "Voice and speaking style" },
  { id: "memory", label: "Memory", icon: Icons.memory, description: "Memories and backstory" },
  { id: "behavior", label: "Behavior", icon: Icons.zap, description: "Actions and quirks" },
  { id: "danger", label: "Danger Zone", icon: Icons.warning, description: "Delete and export" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS STUDIO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SettingsStudio({ persona, onSave, onDelete, onExport, onBack }: SettingsStudioProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("identity");
  const [settings, setSettings] = useState<PersonaSettings>(persona);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = useCallback((updates: Partial<PersonaSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(settings);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: spacing[8] }}>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing[8],
          flexWrap: "wrap",
          gap: spacing[4],
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing[4] }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: spacing[10],
              height: spacing[10],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: colors.bg.elevated,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.lg,
              color: colors.text.secondary,
              cursor: "pointer",
            }}
          >
            {Icons.back}
          </motion.button>
          <div>
            <h1
              style={{
                fontSize: typography.fontSize["2xl"],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Settings: {settings.name}
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                margin: `${spacing[1]} 0 0 0`,
              }}
            >
              Configure every aspect of your persona
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: spacing[3] }}>
          {hasChanges && (
            <Badge variant="warning" dot pulse>
              Unsaved Changes
            </Badge>
          )}
          <Button icon={Icons.save} onClick={handleSave} loading={isSaving} disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: spacing[6],
        }}
      >
        {/* Sidebar Tabs */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[2],
          }}
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content Area */}
        <Card variant="elevated" padding={6}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", ...animation.spring.smooth }}
            >
              {activeTab === "identity" && <IdentityTab settings={settings} updateSettings={updateSettings} />}
              {activeTab === "personality" && <PersonalityTab settings={settings} updateSettings={updateSettings} />}
              {activeTab === "voice" && <VoiceTab settings={settings} updateSettings={updateSettings} />}
              {activeTab === "memory" && <MemoryTab settings={settings} updateSettings={updateSettings} />}
              {activeTab === "behavior" && <BehaviorTab settings={settings} updateSettings={updateSettings} />}
              {activeTab === "danger" && <DangerTab onDelete={onDelete} onExport={onExport} />}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof TABS)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const isDanger = tab.id === "danger";

  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        background: isActive ? (isDanger ? colors.state.errorMuted : colors.gold.glow) : "transparent",
        border: "none",
        borderRadius: radius.lg,
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
      }}
    >
      {isActive && (
        <motion.div
          layoutId="settings-active-tab"
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "60%",
            background: isDanger ? colors.state.error : colors.gold[400],
            borderRadius: radius.full,
          }}
        />
      )}
      <span style={{ color: isDanger ? colors.state.error : isActive ? colors.gold[400] : colors.text.muted }}>
        {tab.icon}
      </span>
      <div>
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: isDanger ? colors.state.error : isActive ? colors.gold[400] : colors.text.primary,
          }}
        >
          {tab.label}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          {tab.description}
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function IdentityTab({
  settings,
  updateSettings,
}: {
  settings: PersonaSettings;
  updateSettings: (updates: Partial<PersonaSettings>) => void;
}) {
  return (
    <div>
      <TabHeader title="Identity" description="Core identity attributes that define who your persona is." />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[5] }}>
        <FieldGroup label="Name">
          <Input
            value={settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
            placeholder="Persona name"
          />
        </FieldGroup>

        <FieldGroup label="Tagline">
          <Input
            value={settings.tagline}
            onChange={(e) => updateSettings({ tagline: e.target.value })}
            placeholder="A short phrase that captures their essence"
          />
        </FieldGroup>

        <FieldGroup label="Archetype">
          <select
            value={settings.archetype}
            onChange={(e) => updateSettings({ archetype: e.target.value })}
            style={{
              width: "100%",
              padding: `${spacing[3]} ${spacing[4]}`,
              background: colors.bg.base,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.lg,
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="sage">Sage</option>
            <option value="hero">Hero</option>
            <option value="creator">Creator</option>
            <option value="caregiver">Caregiver</option>
            <option value="ruler">Ruler</option>
            <option value="jester">Jester</option>
            <option value="rebel">Rebel</option>
            <option value="lover">Lover</option>
            <option value="explorer">Explorer</option>
            <option value="innocent">Innocent</option>
            <option value="magician">Magician</option>
            <option value="outlaw">Outlaw</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Visual Style">
          <select
            value={settings.visualStyle}
            onChange={(e) => updateSettings({ visualStyle: e.target.value })}
            style={{
              width: "100%",
              padding: `${spacing[3]} ${spacing[4]}`,
              background: colors.bg.base,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.lg,
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="photorealistic">Photorealistic</option>
            <option value="cinematic">Cinematic</option>
            <option value="anime">Anime</option>
            <option value="pixar">Pixar 3D</option>
            <option value="illustration">Illustration</option>
            <option value="painterly">Painterly</option>
            <option value="stylized">Stylized</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Published Status">
          <div style={{ display: "flex", alignItems: "center", gap: spacing[3] }}>
            <input
              type="checkbox"
              checked={settings.isPublished}
              onChange={(e) => updateSettings({ isPublished: e.target.checked })}
              style={{
                width: spacing[5],
                height: spacing[5],
                accentColor: colors.gold[400],
              }}
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Make this persona publicly discoverable
            </span>
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PersonalityTab({
  settings,
  updateSettings,
}: {
  settings: PersonaSettings;
  updateSettings: (updates: Partial<PersonaSettings>) => void;
}) {
  const updateTrait = (trait: string, value: number) => {
    updateSettings({
      personality: { ...settings.personality, [trait]: value },
    });
  };

  return (
    <div>
      <TabHeader
        title="Personality"
        description="Fine-tune the personality traits that shape how your persona thinks and behaves."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
        <TraitSlider
          name="Openness"
          description="Curiosity and creativity"
          value={settings.personality.openness || 50}
          onChange={(v) => updateTrait("openness", v)}
        />
        <TraitSlider
          name="Conscientiousness"
          description="Organization and reliability"
          value={settings.personality.conscientiousness || 50}
          onChange={(v) => updateTrait("conscientiousness", v)}
        />
        <TraitSlider
          name="Extraversion"
          description="Energy from social interaction"
          value={settings.personality.extraversion || 50}
          onChange={(v) => updateTrait("extraversion", v)}
        />
        <TraitSlider
          name="Agreeableness"
          description="Cooperation and trust"
          value={settings.personality.agreeableness || 50}
          onChange={(v) => updateTrait("agreeableness", v)}
        />
        <TraitSlider
          name="Emotional Stability"
          description="Resilience to stress"
          value={settings.personality.neuroticism || 50}
          onChange={(v) => updateTrait("neuroticism", v)}
        />
        <TraitSlider
          name="Humor"
          description="Tendency to be funny"
          value={settings.personality.humor || 50}
          onChange={(v) => updateTrait("humor", v)}
        />
        <TraitSlider
          name="Formality"
          description="Preference for structure"
          value={settings.personality.formality || 50}
          onChange={(v) => updateTrait("formality", v)}
        />
      </div>
    </div>
  );
}

function TraitSlider({
  name,
  description,
  value,
  onChange,
}: {
  name: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing[4] }}>
      <div style={{ width: "140px" }}>
        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
          {name}
        </div>
        <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{description}</div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ flex: 1, accentColor: colors.gold[400] }}
      />
      <span style={{ width: spacing[10], fontSize: typography.fontSize.sm, color: colors.gold[400], textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function VoiceTab({
  settings,
  updateSettings,
}: {
  settings: PersonaSettings;
  updateSettings: (updates: Partial<PersonaSettings>) => void;
}) {
  return (
    <div>
      <TabHeader title="Voice" description="Configure the voice and speaking style of your persona." />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[5] }}>
        <FieldGroup label="Voice Selection">
          <select
            value={settings.voiceId}
            onChange={(e) => updateSettings({ voiceId: e.target.value })}
            style={{
              width: "100%",
              padding: `${spacing[3]} ${spacing[4]}`,
              background: colors.bg.base,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.lg,
              color: colors.text.primary,
              fontSize: typography.fontSize.base,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="rachel">Rachel - Warm, friendly</option>
            <option value="drew">Drew - Confident, professional</option>
            <option value="clyde">Clyde - Deep, authoritative</option>
            <option value="sarah">Sarah - Soft, soothing</option>
            <option value="adam">Adam - Clear, narrative</option>
            <option value="antoni">Antoni - Casual, approachable</option>
            <option value="elli">Elli - Young, energetic</option>
            <option value="josh">Josh - Warm, conversational</option>
          </select>
        </FieldGroup>

        <FieldGroup label="Response Style">
          <Textarea
            value={settings.responseStyle || ""}
            onChange={(e) => updateSettings({ responseStyle: e.target.value })}
            placeholder="Describe how this persona should phrase their responses (e.g., 'Speaks in a formal, academic tone' or 'Uses casual slang and humor')"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MemoryTab({
  settings,
  updateSettings,
}: {
  settings: PersonaSettings;
  updateSettings: (updates: Partial<PersonaSettings>) => void;
}) {
  return (
    <div>
      <TabHeader title="Memory" description="Define the backstory and core memories that shape your persona." />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[5] }}>
        <FieldGroup label="Backstory">
          <Textarea
            value={settings.backstory}
            onChange={(e) => updateSettings({ backstory: e.target.value })}
            placeholder="Tell the story of who this persona is, where they come from, and what shaped them..."
            style={{ minHeight: spacing[40] }}
          />
        </FieldGroup>

        <FieldGroup label="Core Memories">
          <ListEditor
            items={settings.coreMemories}
            placeholder="Add a formative memory..."
            onChange={(items) => updateSettings({ coreMemories: items })}
          />
        </FieldGroup>

        <FieldGroup label="System Prompt Override">
          <Textarea
            value={settings.systemPromptOverride || ""}
            onChange={(e) => updateSettings({ systemPromptOverride: e.target.value })}
            placeholder="Advanced: Override the default system prompt (leave blank to use auto-generated)"
            style={{ minHeight: spacing[32], fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.sm }}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR TAB
// ═══════════════════════════════════════════════════════════════════════════════

function BehaviorTab({
  settings,
  updateSettings,
}: {
  settings: PersonaSettings;
  updateSettings: (updates: Partial<PersonaSettings>) => void;
}) {
  return (
    <div>
      <TabHeader title="Behavior" description="Define consistent behaviors and unique quirks." />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[5] }}>
        <FieldGroup label="Behaviors">
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing[2] }}>
            Consistent patterns in how they act and respond
          </p>
          <ListEditor
            items={settings.behaviors}
            placeholder="Add a behavior pattern..."
            onChange={(items) => updateSettings({ behaviors: items })}
          />
        </FieldGroup>

        <FieldGroup label="Quirks">
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing[2] }}>
            Unique traits that make them memorable and distinctive
          </p>
          <ListEditor
            items={settings.quirks}
            placeholder="Add a quirk..."
            onChange={(items) => updateSettings({ quirks: items })}
          />
        </FieldGroup>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DANGER TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DangerTab({ onDelete, onExport }: { onDelete?: () => void; onExport?: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div>
      <TabHeader title="Danger Zone" description="Destructive actions and data export." />

      <div style={{ display: "flex", flexDirection: "column", gap: spacing[6] }}>
        {/* Export */}
        <div
          style={{
            padding: spacing[5],
            background: colors.bg.base,
            borderRadius: radius.xl,
            border: `1px solid ${colors.border.default}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3
                style={{
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Export Persona
              </h3>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, margin: `${spacing[1]} 0 0 0` }}>
                Download a JSON file containing all persona configuration
              </p>
            </div>
            <Button variant="secondary" icon={Icons.download} onClick={onExport}>
              Export
            </Button>
          </div>
        </div>

        {/* Delete */}
        <div
          style={{
            padding: spacing[5],
            background: colors.state.errorMuted,
            borderRadius: radius.xl,
            border: `1px solid ${colors.state.error}30`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3
                style={{
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.state.error,
                  margin: 0,
                }}
              >
                Delete Persona
              </h3>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: `${spacing[1]} 0 0 0` }}>
                Permanently delete this persona and all associated data. This cannot be undone.
              </p>
            </div>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: spacing[2] }}>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button variant="danger" icon={Icons.trash} onClick={onDelete}>
                  Confirm Delete
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TabHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: spacing[6], paddingBottom: spacing[4], borderBottom: `1px solid ${colors.border.subtle}` }}>
      <h2
        style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: 0,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: `${spacing[1]} 0 0 0` }}>
        {description}
      </p>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
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
        {label}
      </label>
      {children}
    </div>
  );
}

function ListEditor({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[2], marginBottom: spacing[3] }}>
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing[2],
                padding: `${spacing[2]} ${spacing[3]}`,
                background: colors.bg.base,
                borderRadius: radius.lg,
                border: `1px solid ${colors.border.default}`,
              }}
            >
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{item}</span>
              <button
                onClick={() => removeItem(i)}
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
      )}
      <div style={{ display: "flex", gap: spacing[2] }}>
        <Input
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button variant="secondary" onClick={addItem} icon={Icons.plus}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default SettingsStudio;
