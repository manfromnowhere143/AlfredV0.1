/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE GALLERY — STATE-OF-THE-ART
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Apple-level persona gallery. Mobile-first with premium card animations
 * and fluid interactions that would make Steve Jobs proud.
 *
 * Design Philosophy:
 * - Magazine-quality card layouts
 * - Smooth 60fps animations throughout
 * - Touch-optimized interactions
 * - Information hierarchy through visual weight
 * - Progressive disclosure of actions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { colors, spacing, typography, radius, animation } from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Persona {
  id: string;
  name: string;
  tagline?: string;
  imageUrl?: string;
  archetype?: string;
  createdAt?: string;
  lastInteraction?: string;
  totalConversations?: number;
}

interface GalleryViewProps {
  personas: Persona[];
  isLoading?: boolean;
  onPersonaClick: (persona: Persona) => void;
  onCreateClick: () => void;
  onEngageClick: (persona: Persona) => void;
  onEditClick: (persona: Persona) => void;
  onDeleteClick: (persona: Persona) => void;
}

type SortOption = "recent" | "name" | "conversations";

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHETYPE COLORS — Premium palette for each archetype
// ═══════════════════════════════════════════════════════════════════════════════

const archetypeColors: Record<string, { primary: string; glow: string }> = {
  sage: { primary: "#6366f1", glow: "rgba(99, 102, 241, 0.3)" },
  hero: { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" },
  creator: { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)" },
  caregiver: { primary: "#10b981", glow: "rgba(16, 185, 129, 0.3)" },
  ruler: { primary: "#8b5cf6", glow: "rgba(139, 92, 246, 0.3)" },
  jester: { primary: "#ec4899", glow: "rgba(236, 72, 153, 0.3)" },
  rebel: { primary: "#78716c", glow: "rgba(120, 113, 108, 0.3)" },
  lover: { primary: "#f43f5e", glow: "rgba(244, 63, 94, 0.3)" },
  explorer: { primary: "#06b6d4", glow: "rgba(6, 182, 212, 0.3)" },
  innocent: { primary: "#a3e635", glow: "rgba(163, 230, 53, 0.3)" },
  magician: { primary: "#a855f7", glow: "rgba(168, 85, 247, 0.3)" },
  outlaw: { primary: "#1f2937", glow: "rgba(31, 41, 55, 0.3)" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS — Premium SVG icons
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12c0 4.418-4.03 8-9 8-1.6 0-3.1-.36-4.4-1L3 21l1.5-3.6C3.5 16.1 3 14.1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinejoin="round" />
    </svg>
  ),
  edit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spark: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// GALLERY VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function GalleryView({
  personas,
  isLoading = false,
  onPersonaClick,
  onCreateClick,
  onEngageClick,
  onEditClick,
  onDeleteClick,
}: GalleryViewProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter and sort personas
  const filteredPersonas = useMemo(() => {
    let result = [...personas];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.tagline?.toLowerCase().includes(query) ||
          p.archetype?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "conversations":
        result.sort((a, b) => (b.totalConversations || 0) - (a.totalConversations || 0));
        break;
      case "recent":
      default:
        result.sort((a, b) => {
          const dateA = new Date(a.lastInteraction || a.createdAt || 0);
          const dateB = new Date(b.lastInteraction || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
    }

    return result;
  }, [personas, searchQuery, sortBy]);

  // Grid columns based on screen size
  const gridColumns = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <div
      style={{
        padding: isMobile ? spacing[4] : spacing[8],
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", ...animation.spring.smooth }}
        style={{
          marginBottom: spacing[8],
        }}
      >
        {/* Title Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: spacing[6],
            flexWrap: "wrap",
            gap: spacing[4],
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? typography.fontSize["2xl"] : typography.fontSize["3xl"],
                fontWeight: typography.fontWeight.bold,
                letterSpacing: "-0.02em",
                margin: 0,
                color: colors.text.primary,
              }}
            >
              Your Personas
            </h1>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: `${spacing[1]} 0 0`,
              }}
            >
              {personas.length} digital being{personas.length !== 1 ? "s" : ""} in your collection
            </p>
          </div>

          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing[2],
              padding: `${spacing[3]} ${spacing[5]}`,
              background: `linear-gradient(135deg, ${colors.gold[500]} 0%, ${colors.gold[600]} 100%)`,
              border: "none",
              borderRadius: radius.full,
              color: colors.bg.void,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: "pointer",
              boxShadow: `0 4px 20px ${colors.gold[900]}40`,
            }}
          >
            {Icons.plus}
            <span>Create New</span>
          </motion.button>
        </div>

        {/* Search & Filter Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[3],
            flexWrap: "wrap",
          }}
        >
          {/* Search Input */}
          <motion.div
            animate={{
              width: isSearchFocused ? (isMobile ? "100%" : 320) : (isMobile ? "100%" : 280),
              boxShadow: isSearchFocused ? `0 0 0 2px ${colors.gold[500]}40` : "none",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "relative",
              flex: isMobile ? "1 0 100%" : "0 0 auto",
              borderRadius: radius.full,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: spacing[4],
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.text.muted,
              }}
            >
              {Icons.search}
            </div>
            <input
              type="text"
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                width: "100%",
                padding: `${spacing[3]} ${spacing[4]} ${spacing[3]} ${spacing[12]}`,
                background: colors.bg.elevated,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: radius.full,
                color: colors.text.primary,
                fontSize: typography.fontSize.sm,
                outline: "none",
                transition: `all ${animation.duration.fast}`,
              }}
            />
          </motion.div>

          {/* Sort Pills */}
          <div
            style={{
              display: "flex",
              gap: spacing[1],
              background: colors.bg.elevated,
              padding: spacing[1],
              borderRadius: radius.full,
              border: `1px solid ${colors.border.subtle}`,
            }}
          >
            {(["recent", "name", "conversations"] as SortOption[]).map((option) => (
              <motion.button
                key={option}
                onClick={() => setSortBy(option)}
                whileHover={{ scale: sortBy === option ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  position: "relative",
                  padding: `${spacing[2]} ${spacing[3]}`,
                  background: "transparent",
                  border: "none",
                  borderRadius: radius.full,
                  color: sortBy === option ? colors.gold[400] : colors.text.muted,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {sortBy === option && (
                  <motion.div
                    layoutId="sort-pill"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: colors.gold.glow,
                      borderRadius: radius.full,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1 }}>{option}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LOADING STATE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            gap: spacing[6],
          }}
        >
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EMPTY STATE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!isLoading && filteredPersonas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", ...animation.spring.smooth }}
          style={{
            textAlign: "center",
            padding: spacing[16],
          }}
        >
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            style={{
              display: "inline-block",
              color: colors.gold[400],
              marginBottom: spacing[6],
            }}
          >
            {Icons.spark}
          </motion.div>
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}
          >
            {searchQuery ? "No personas found" : "No personas yet"}
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              marginBottom: spacing[6],
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {searchQuery
              ? "Try a different search term"
              : "Create your first digital being and bring it to life"}
          </p>
          {!searchQuery && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: spacing[2],
                padding: `${spacing[4]} ${spacing[6]}`,
                background: `linear-gradient(135deg, ${colors.gold[500]} 0%, ${colors.gold[600]} 100%)`,
                border: "none",
                borderRadius: radius.full,
                color: colors.bg.void,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                cursor: "pointer",
                boxShadow: `0 4px 20px ${colors.gold[900]}40`,
              }}
            >
              {Icons.plus}
              <span>Create Your First Persona</span>
            </motion.button>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PERSONA GRID */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!isLoading && filteredPersonas.length > 0 && (
        <motion.div
          layout
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            gap: spacing[6],
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredPersonas.map((persona, index) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                index={index}
                onEngage={() => onEngageClick(persona)}
                onEdit={() => onEditClick(persona)}
                onDelete={() => onDeleteClick(persona)}
                onClick={() => onPersonaClick(persona)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA CARD — Premium card with hover effects
// ═══════════════════════════════════════════════════════════════════════════════

interface PersonaCardProps {
  persona: Persona;
  index: number;
  onEngage: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function PersonaCard({ persona, index, onEngage, onEdit, onDelete, onClick }: PersonaCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const archetypeColor = archetypeColors[persona.archetype?.toLowerCase() || "sage"] || archetypeColors.sage;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        position: "relative",
        background: colors.bg.elevated,
        borderRadius: radius["2xl"],
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${isHovered ? archetypeColor.primary : colors.border.subtle}`,
        transition: `all ${animation.duration.normal}`,
        boxShadow: isHovered
          ? `0 20px 40px ${archetypeColor.glow}, 0 0 0 1px ${archetypeColor.primary}30`
          : `0 4px 12px ${colors.bg.void}40`,
      }}
    >
      {/* Image Section */}
      <div
        style={{
          position: "relative",
          aspectRatio: "4/3",
          background: colors.bg.base,
          overflow: "hidden",
        }}
      >
        {persona.imageUrl ? (
          <motion.img
            src={persona.imageUrl}
            alt={persona.name}
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${archetypeColor.primary}20 0%, ${colors.bg.base} 100%)`,
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: typography.fontWeight.bold,
                color: archetypeColor.primary,
                opacity: 0.5,
              }}
            >
              {persona.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${colors.bg.elevated} 0%, transparent 50%)`,
            pointerEvents: "none",
          }}
        />

        {/* Archetype Badge */}
        {persona.archetype && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            style={{
              position: "absolute",
              top: spacing[3],
              left: spacing[3],
              padding: `${spacing[1]} ${spacing[3]}`,
              background: `${archetypeColor.primary}20`,
              backdropFilter: "blur(8px)",
              borderRadius: radius.full,
              border: `1px solid ${archetypeColor.primary}40`,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: typography.fontWeight.semibold,
                color: archetypeColor.primary,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {persona.archetype}
            </span>
          </motion.div>
        )}
      </div>

      {/* Content Section */}
      <div style={{ padding: spacing[5] }}>
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[1],
            letterSpacing: "-0.01em",
          }}
        >
          {persona.name}
        </h3>

        {persona.tagline && (
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              lineHeight: 1.5,
              marginBottom: spacing[4],
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {persona.tagline}
          </p>
        )}

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[4],
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          {persona.totalConversations !== undefined && (
            <span style={{ display: "flex", alignItems: "center", gap: spacing[1] }}>
              {Icons.chat}
              {persona.totalConversations}
            </span>
          )}
          {persona.createdAt && (
            <span>
              Created {new Date(persona.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "absolute",
              bottom: spacing[4],
              right: spacing[4],
              display: "flex",
              gap: spacing[2],
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ActionButton icon={Icons.chat} onClick={onEngage} primary />
            <ActionButton icon={Icons.edit} onClick={onEdit} />
            <ActionButton icon={Icons.trash} onClick={onDelete} danger />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION BUTTON — Floating action buttons
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

function ActionButton({ icon, onClick, primary, danger }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: primary
          ? colors.gold[500]
          : danger
            ? `${colors.state.error}20`
            : colors.bg.overlay,
        border: "none",
        borderRadius: radius.full,
        color: primary ? colors.bg.void : danger ? colors.state.error : colors.text.primary,
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        boxShadow: primary ? `0 4px 12px ${colors.gold[900]}40` : "none",
      }}
    >
      {icon}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON CARD — Loading placeholder
// ═══════════════════════════════════════════════════════════════════════════════

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      style={{
        background: colors.bg.elevated,
        borderRadius: radius["2xl"],
        overflow: "hidden",
        border: `1px solid ${colors.border.subtle}`,
      }}
    >
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          aspectRatio: "4/3",
          background: colors.bg.base,
        }}
      />
      <div style={{ padding: spacing[5] }}>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            height: 24,
            width: "60%",
            background: colors.bg.base,
            borderRadius: radius.md,
            marginBottom: spacing[3],
          }}
        />
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          style={{
            height: 16,
            width: "80%",
            background: colors.bg.base,
            borderRadius: radius.md,
          }}
        />
      </div>
    </motion.div>
  );
}

export default GalleryView;
