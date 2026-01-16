/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE DESIGN SYSTEM — Design Tokens
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Design is not just what it looks like and feels like.
 *  Design is how it works." — Steve Jobs
 *
 * This file defines the atomic design tokens for the entire PersonaForge Studio.
 * Every color, spacing, typography, and animation value flows from here.
 *
 * Principles:
 * 1. Consistency — Same intent, same token
 * 2. Constraint — Limited palette, maximum impact
 * 3. Clarity — Self-documenting names
 * 4. Composability — Tokens combine to create patterns
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM — Dark-first with champagne gold accents
// ═══════════════════════════════════════════════════════════════════════════════

export const colors = {
  // Background layers (darkest to lightest)
  bg: {
    void: "#000000",        // True black — deepest layer
    deep: "#050508",        // Near black — page background
    base: "#0a0a0f",        // Base surface
    elevated: "#111118",    // Elevated surfaces (cards)
    overlay: "#18181f",     // Overlay backgrounds
    hover: "#1f1f28",       // Hover states
    active: "#282832",      // Active/pressed states
  },

  // Text hierarchy
  text: {
    primary: "#ffffff",           // Primary text — full white
    secondary: "rgba(255,255,255,0.72)",  // Secondary — 72% opacity
    tertiary: "rgba(255,255,255,0.48)",   // Tertiary — 48% opacity
    muted: "rgba(255,255,255,0.32)",      // Muted — 32% opacity
    disabled: "rgba(255,255,255,0.16)",   // Disabled — 16% opacity
  },

  // Border system
  border: {
    subtle: "rgba(255,255,255,0.06)",    // Subtle dividers
    default: "rgba(255,255,255,0.10)",   // Default borders
    strong: "rgba(255,255,255,0.16)",    // Strong borders
    focus: "rgba(255,255,255,0.24)",     // Focus rings
  },

  // Brand — Champagne Gold
  gold: {
    50: "#fffef5",
    100: "#fffae6",
    200: "#fff3c4",
    300: "#ffe999",
    400: "#fcd34d",   // Primary gold
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    glow: "rgba(252,211,77,0.20)",       // Glow effect
    glowStrong: "rgba(252,211,77,0.40)", // Strong glow
  },

  // Semantic — State colors
  state: {
    // Success / Speaking
    success: "#22c55e",
    successMuted: "rgba(34,197,94,0.16)",
    successGlow: "rgba(34,197,94,0.32)",

    // Info / Listening
    info: "#3b82f6",
    infoMuted: "rgba(59,130,246,0.16)",
    infoGlow: "rgba(59,130,246,0.32)",

    // Warning / Thinking
    warning: "#a855f7",
    warningMuted: "rgba(168,85,247,0.16)",
    warningGlow: "rgba(168,85,247,0.32)",

    // Error
    error: "#ef4444",
    errorMuted: "rgba(239,68,68,0.16)",
    errorGlow: "rgba(239,68,68,0.32)",

    // Idle
    idle: "#6b7280",
    idleMuted: "rgba(107,114,128,0.16)",
  },

  // Archetype accent colors
  archetype: {
    sage: { primary: "#8b5cf6", glow: "rgba(139,92,246,0.24)" },
    hero: { primary: "#ef4444", glow: "rgba(239,68,68,0.24)" },
    creator: { primary: "#f59e0b", glow: "rgba(245,158,11,0.24)" },
    caregiver: { primary: "#10b981", glow: "rgba(16,185,129,0.24)" },
    ruler: { primary: "#fcd34d", glow: "rgba(252,211,77,0.24)" },
    jester: { primary: "#ec4899", glow: "rgba(236,72,153,0.24)" },
    rebel: { primary: "#dc2626", glow: "rgba(220,38,38,0.24)" },
    lover: { primary: "#f472b6", glow: "rgba(244,114,182,0.24)" },
    explorer: { primary: "#06b6d4", glow: "rgba(6,182,212,0.24)" },
    innocent: { primary: "#fcd34d", glow: "rgba(252,211,77,0.24)" },
    magician: { primary: "#6366f1", glow: "rgba(99,102,241,0.24)" },
    outlaw: { primary: "#4a90d9", glow: "rgba(74,144,217,0.24)" },
  },

  // Glass effects
  glass: {
    light: "rgba(255,255,255,0.03)",
    medium: "rgba(255,255,255,0.06)",
    strong: "rgba(255,255,255,0.10)",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY — Refined scale with optical sizing
// ═══════════════════════════════════════════════════════════════════════════════

export const typography = {
  // Font families
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    display: '"Cal Sans", "Inter", -apple-system, sans-serif',
  },

  // Font sizes — Modular scale (1.25 ratio)
  fontSize: {
    xs: "11px",      // Captions, labels
    sm: "13px",      // Secondary text
    base: "15px",    // Body text
    md: "17px",      // Emphasized body
    lg: "20px",      // Small headings
    xl: "24px",      // Section headings
    "2xl": "32px",   // Page headings
    "3xl": "40px",   // Hero headings
    "4xl": "56px",   // Display headings
    "5xl": "72px",   // Giant display
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,      // Headings
    snug: 1.25,      // Subheadings
    normal: 1.5,     // Body
    relaxed: 1.625,  // Comfortable reading
  },

  // Letter spacing
  letterSpacing: {
    tighter: "-0.02em",
    tight: "-0.01em",
    normal: "0",
    wide: "0.01em",
    wider: "0.02em",
    widest: "0.04em",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING — 4px base unit system
// ═══════════════════════════════════════════════════════════════════════════════

export const spacing = {
  0: "0px",
  px: "1px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  11: "44px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
  28: "112px",
  32: "128px",
  36: "144px",
  40: "160px",
  44: "176px",
  48: "192px",
  52: "208px",
  56: "224px",
  60: "240px",
  64: "256px",
  72: "288px",
  80: "320px",
  96: "384px",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RADIUS — Border radius scale
// ═══════════════════════════════════════════════════════════════════════════════

export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOWS — Layered elevation system
// ═══════════════════════════════════════════════════════════════════════════════

export const shadows = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.4)",
  md: "0 4px 8px rgba(0,0,0,0.4)",
  lg: "0 8px 16px rgba(0,0,0,0.4)",
  xl: "0 16px 32px rgba(0,0,0,0.5)",
  "2xl": "0 24px 48px rgba(0,0,0,0.6)",
  inner: "inset 0 2px 4px rgba(0,0,0,0.3)",

  // Glow shadows
  glow: {
    gold: "0 0 20px rgba(252,211,77,0.3)",
    goldStrong: "0 0 40px rgba(252,211,77,0.5)",
    success: "0 0 20px rgba(34,197,94,0.3)",
    info: "0 0 20px rgba(59,130,246,0.3)",
    warning: "0 0 20px rgba(168,85,247,0.3)",
    error: "0 0 20px rgba(239,68,68,0.3)",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION — Timing and easing
// ═══════════════════════════════════════════════════════════════════════════════

export const animation = {
  // Durations
  duration: {
    instant: "0ms",
    fast: "100ms",
    normal: "200ms",
    slow: "300ms",
    slower: "500ms",
    slowest: "1000ms",
  },

  // Easing curves
  easing: {
    linear: "linear",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",

    // Custom curves
    smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    snap: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    bounce: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
    expo: "cubic-bezier(0.16, 1, 0.3, 1)",
  },

  // Spring presets for Framer Motion
  spring: {
    gentle: { stiffness: 120, damping: 14, mass: 1 },
    smooth: { stiffness: 170, damping: 26, mass: 1 },
    snappy: { stiffness: 400, damping: 30, mass: 1 },
    bouncy: { stiffness: 300, damping: 10, mass: 1 },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Z-INDEX — Layering system
// ═══════════════════════════════════════════════════════════════════════════════

export const zIndex = {
  behind: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  overlay: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BREAKPOINTS — Responsive design
// ═══════════════════════════════════════════════════════════════════════════════

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE TOKENS — Pre-composed patterns
// ═══════════════════════════════════════════════════════════════════════════════

export const patterns = {
  // Card patterns
  card: {
    default: {
      background: colors.bg.elevated,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius["2xl"],
      shadow: shadows.md,
    },
    hover: {
      background: colors.bg.hover,
      border: `1px solid ${colors.border.strong}`,
      shadow: shadows.lg,
    },
    active: {
      background: colors.bg.active,
      border: `1px solid ${colors.gold[400]}`,
      shadow: shadows.glow.gold,
    },
  },

  // Button patterns
  button: {
    primary: {
      background: colors.gold[400],
      color: colors.bg.void,
      hoverBackground: colors.gold[300],
      activeBackground: colors.gold[500],
    },
    secondary: {
      background: colors.bg.elevated,
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
      hoverBackground: colors.bg.hover,
      hoverBorder: `1px solid ${colors.border.strong}`,
    },
    ghost: {
      background: "transparent",
      color: colors.text.secondary,
      hoverBackground: colors.bg.hover,
      hoverColor: colors.text.primary,
    },
  },

  // Input patterns
  input: {
    default: {
      background: colors.bg.base,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.lg,
      color: colors.text.primary,
      placeholder: colors.text.muted,
    },
    focus: {
      border: `1px solid ${colors.gold[400]}`,
      shadow: shadows.glow.gold,
    },
    error: {
      border: `1px solid ${colors.state.error}`,
      shadow: shadows.glow.error,
    },
  },

  // Glass morphism
  glass: {
    light: {
      background: colors.glass.light,
      backdropFilter: "blur(8px)",
      border: `1px solid ${colors.border.subtle}`,
    },
    medium: {
      background: colors.glass.medium,
      backdropFilter: "blur(12px)",
      border: `1px solid ${colors.border.default}`,
    },
    strong: {
      background: colors.glass.strong,
      backdropFilter: "blur(20px)",
      border: `1px solid ${colors.border.strong}`,
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type ShadowToken = keyof typeof shadows;
export type BreakpointToken = keyof typeof breakpoints;
export type ArchetypeToken = keyof typeof colors.archetype;
