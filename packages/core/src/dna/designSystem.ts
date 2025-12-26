/**
 * ALFRED DESIGN SYSTEM
 * 
 * Your taste, encoded as law.
 * Every UI Alfred creates must conform to this system.
 * 
 * This is not a suggestion — it's a constitution.
 * 
 * Derived from: Rently Deck, Portfolio Work Page, Trade69 Dashboard
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM
// Monochromatic foundation with semantic accents
// ═══════════════════════════════════════════════════════════════════════════════

export const COLORS = {
    /**
     * Core palette — void black with warm white
     */
    core: {
      black: '#000000',
      void: '#050506',
      surface: '#0a0a0a',
      surfaceLight: '#0f0f0f',
      elevated: '#111115',
      border: '#1a1a1a',
      borderLight: '#333333',
    },
  
    /**
     * Text hierarchy — never random grays
     */
    text: {
      primary: '#ffffff',
      secondary: '#888888',
      muted: '#666666',
      subtle: '#333333',
      // Warm white variant for certain contexts
      warmWhite: '#FAFAF8',
      warmMuted: 'rgba(250, 250, 249, 0.65)',
    },
  
    /**
     * Semantic colors — only for meaning
     */
    semantic: {
      positive: '#00ff00',
      negative: '#ff0000',
      warning: '#ffaa00',
      info: '#78a0ff',
      // Muted variants for backgrounds
      positiveMuted: 'rgba(0, 255, 0, 0.1)',
      negativeMuted: 'rgba(255, 0, 0, 0.1)',
      warningMuted: 'rgba(255, 170, 0, 0.1)',
    },
  
    /**
     * Accent colors — use sparingly
     */
    accent: {
      gold: '#C9B99A',
      goldMuted: 'rgba(201, 185, 154, 0.12)',
      goldGlow: 'rgba(201, 185, 154, 0.25)',
      blue: 'rgba(100, 200, 255, 0.15)',
      blueGlow: 'rgba(100, 200, 255, 0.35)',
    },
  
    /**
     * Opacity scale for overlays and glass effects
     */
    opacity: {
      glass: 'rgba(255, 255, 255, 0.04)',
      glassStrong: 'rgba(255, 255, 255, 0.08)',
      overlay: 'rgba(0, 0, 0, 0.6)',
      overlayStrong: 'rgba(0, 0, 0, 0.85)',
    },
  
    /**
     * Glow effects — white breathing
     */
    glow: {
      white: 'rgba(255, 255, 255, 0.12)',
      whiteStrong: 'rgba(255, 255, 255, 0.22)',
      accent: 'rgba(201, 185, 154, 0.25)',
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY
  // Inter for UI, JetBrains Mono for data
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const TYPOGRAPHY = {
    /**
     * Font families
     */
    fonts: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'SF Mono', Monaco, 'Fira Code', monospace",
      display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  
    /**
     * Font weights — named for intent
     */
    weights: {
      thin: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
      black: 900,
    },
  
    /**
     * Type scale — mobile first
     */
    scale: {
      // Display sizes
      hero: { mobile: '44px', desktop: '96px', weight: 300, letterSpacing: '-0.03em' },
      title: { mobile: '28px', desktop: '54px', weight: 300, letterSpacing: '-0.02em' },
      heading: { mobile: '24px', desktop: '36px', weight: 300, letterSpacing: '-0.01em' },
      subheading: { mobile: '18px', desktop: '24px', weight: 400, letterSpacing: '-0.01em' },
      
      // Body sizes
      body: { mobile: '14px', desktop: '16px', weight: 400, letterSpacing: '0' },
      small: { mobile: '12px', desktop: '14px', weight: 400, letterSpacing: '0' },
      
      // UI sizes
      label: { mobile: '9px', desktop: '10px', weight: 700, letterSpacing: '0.1em' },
      micro: { mobile: '8px', desktop: '9px', weight: 800, letterSpacing: '0.12em' },
      
      // Data sizes (mono)
      dataLarge: { mobile: '20px', desktop: '28px', weight: 700, letterSpacing: '0' },
      dataMedium: { mobile: '14px', desktop: '16px', weight: 600, letterSpacing: '0' },
      dataSmall: { mobile: '11px', desktop: '12px', weight: 600, letterSpacing: '0' },
    },
  
    /**
     * Label rules — ALWAYS uppercase with spacing
     */
    labels: {
      transform: 'uppercase',
      letterSpacing: '0.1em',
      fontWeight: 700,
      fontSize: '10px',
      color: '#666666',
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SPACING
  // Consistent scale, generous breathing
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const SPACING = {
    /**
     * Base unit: 4px
     */
    unit: 4,
  
    /**
     * Named scale
     */
    scale: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      xxl: '32px',
      xxxl: '48px',
      huge: '64px',
    },
  
    /**
     * Component-specific
     */
    card: {
      padding: { mobile: '14px 16px', desktop: '18px 24px' },
      gap: { mobile: '10px', desktop: '14px' },
    },
  
    grid: {
      gap: { mobile: '10px', desktop: '16px' },
      rowGap: { mobile: '12px', desktop: '20px' },
    },
  
    section: {
      margin: { mobile: '24px', desktop: '44px' },
      padding: { mobile: '20px', desktop: '28px' },
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // BORDERS & RADII
  // Subtle, purposeful
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const BORDERS = {
    /**
     * Border widths
     */
    width: {
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },
  
    /**
     * Border colors
     */
    color: {
      default: '#1a1a1a',
      light: '#333333',
      subtle: 'rgba(255, 255, 255, 0.04)',
      accent: 'rgba(201, 185, 154, 0.3)',
    },
  
    /**
     * Semantic left-border (status indicator)
     */
    status: {
      positive: '3px solid #00ff00',
      negative: '3px solid #ff0000',
      warning: '3px solid #ffaa00',
      info: '3px solid #78a0ff',
      accent: '3px solid #C9B99A',
    },
  
    /**
     * Border radii
     */
    radius: {
      none: '0',
      sm: '3px',
      md: '6px',
      lg: '12px',
      xl: '16px',
      xxl: '24px',
      full: '9999px',
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SHADOWS
  // Layered, never flat
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const SHADOWS = {
    /**
     * Elevation levels
     */
    elevation: {
      none: 'none',
      sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
      md: '0 4px 16px rgba(0, 0, 0, 0.4)',
      lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
      xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
    },
  
    /**
     * Glow effects
     */
    glow: {
      white: '0 0 30px rgba(255, 255, 255, 0.12)',
      whiteStrong: '0 0 50px rgba(255, 255, 255, 0.22)',
      accent: '0 0 40px rgba(201, 185, 154, 0.25)',
    },
  
    /**
     * Card shadow — layered for depth
     */
    card: `
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 8px 32px rgba(0, 0, 0, 0.4)
    `,
  
    /**
     * Interactive element — with glow
     */
    interactive: `
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 0 25px rgba(255, 255, 255, 0.12),
      0 4px 12px rgba(0, 0, 0, 0.3),
      0 8px 25px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      inset 0 -1px 1px rgba(0, 0, 0, 0.2)
    `,
  
    /**
     * Hover state — elevated with stronger glow
     */
    hover: `
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 0 50px rgba(255, 255, 255, 0.22),
      0 8px 20px rgba(0, 0, 0, 0.4),
      0 16px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 2px rgba(255, 255, 255, 0.25)
    `,
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ANIMATIONS
  // Subtle, physics-based
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const ANIMATIONS = {
    /**
     * Timing functions
     */
    easing: {
      default: 'ease',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      exit: 'cubic-bezier(0.32, 0.72, 0, 1)',
      bounce: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
    },
  
    /**
     * Durations
     */
    duration: {
      instant: '0.1s',
      fast: '0.15s',
      normal: '0.2s',
      slow: '0.35s',
      slower: '0.5s',
    },
  
    /**
     * Common transitions
     */
    transitions: {
      default: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fast: 'all 0.15s ease',
      color: 'color 0.3s ease',
      transform: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      opacity: 'opacity 0.25s ease',
    },
  
    /**
     * Hover transforms
     */
    hover: {
      lift: 'translateY(-2px)',
      liftMore: 'translateY(-4px)',
      scale: 'scale(1.02)',
      scaleMore: 'scale(1.05)',
    },
  
    /**
     * Keyframes (as strings for injection)
     */
    keyframes: {
      breathe: `
        @keyframes breathe {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `,
      fadeIn: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
      pulse: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `,
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPONENT PATTERNS
  // How specific UI elements should be built
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const COMPONENTS = {
    /**
     * Card pattern
     */
    card: {
      background: COLORS.core.surface,
      border: `1px solid ${COLORS.core.border}`,
      borderRadius: BORDERS.radius.md,
      padding: SPACING.card.padding.desktop,
      transition: ANIMATIONS.transitions.default,
      hover: {
        borderColor: COLORS.core.borderLight,
        background: COLORS.core.surfaceLight,
        transform: ANIMATIONS.hover.lift,
        boxShadow: '0 4px 12px rgba(255,255,255,0.03)',
      },
    },
  
    /**
     * Button pattern
     */
    button: {
      primary: {
        background: 'transparent',
        border: `1px solid ${COLORS.text.primary}`,
        color: COLORS.text.primary,
        padding: '6px 14px',
        borderRadius: BORDERS.radius.sm,
        fontSize: '9px',
        fontWeight: TYPOGRAPHY.weights.black,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        hover: {
          background: COLORS.text.primary,
          color: COLORS.core.black,
        },
      },
      accent: {
        background: `linear-gradient(135deg, ${COLORS.accent.gold}, #A89878)`,
        border: 'none',
        color: COLORS.core.black,
        padding: '10px 16px',
        borderRadius: BORDERS.radius.lg,
        fontWeight: TYPOGRAPHY.weights.semibold,
      },
    },
  
    /**
     * Badge pattern
     */
    badge: {
      padding: '4px 10px',
      borderRadius: BORDERS.radius.sm,
      fontSize: '8px',
      fontWeight: TYPOGRAPHY.weights.black,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      variants: {
        positive: { background: COLORS.semantic.positive, color: COLORS.core.black },
        negative: { background: COLORS.semantic.negative, color: COLORS.text.primary },
        warning: { background: COLORS.semantic.warning, color: COLORS.core.black },
        neutral: { background: COLORS.text.muted, color: COLORS.text.primary },
        accent: { background: COLORS.accent.goldMuted, color: COLORS.accent.gold },
      },
    },
  
    /**
     * Input pattern
     */
    input: {
      background: COLORS.core.surfaceLight,
      border: `1px solid ${COLORS.core.border}`,
      borderRadius: BORDERS.radius.md,
      padding: '10px 14px',
      color: COLORS.text.primary,
      fontSize: '12px',
      focus: {
        borderColor: COLORS.core.borderLight,
        boxShadow: `0 0 0 2px ${COLORS.accent.blue}`,
      },
    },
  
    /**
     * Metric/stat display
     */
    metric: {
      container: {
        background: COLORS.core.surface,
        border: `1px solid ${COLORS.core.border}`,
        padding: '14px 16px',
        borderRadius: BORDERS.radius.md,
      },
      label: {
        ...TYPOGRAPHY.labels,
        marginBottom: '4px',
      },
      value: {
        fontFamily: TYPOGRAPHY.fonts.mono,
        fontSize: '24px',
        fontWeight: TYPOGRAPHY.weights.heavy,
        color: COLORS.text.primary,
      },
    },
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ANTI-PATTERNS
  // What Alfred must NEVER do
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const ANTI_PATTERNS = {
    /**
     * Colors Alfred must never use
     */
    forbiddenColors: [
      'Random grays not in the system',
      'Bright saturated colors (except semantic)',
      'Default Tailwind blue/indigo/purple',
      'Bootstrap colors',
      'Material Design palette',
    ],
  
    /**
     * Typography mistakes
     */
    forbiddenTypography: [
      'Comic Sans, Papyrus, or decorative fonts',
      'Font weights below 200 or above 900',
      'Random letter-spacing values',
      'Lowercase labels for UI elements',
      'Inconsistent font families',
    ],
  
    /**
     * Layout mistakes
     */
    forbiddenLayout: [
      'Cramped spacing — elements must breathe',
      'Inconsistent padding/margins',
      'Centered text in long paragraphs',
      'More than 3 columns on mobile',
      'Fixed pixel widths without responsiveness',
    ],
  
    /**
     * Animation mistakes
     */
    forbiddenAnimations: [
      'Bouncy animations (unless explicitly requested)',
      'Slow animations (> 500ms for micro-interactions)',
      'Animations that block interaction',
      'Gratuitous animation for no purpose',
      'Jarring or sudden movements',
    ],
  
    /**
     * General mistakes
     */
    forbiddenGeneral: [
      'Default browser styles',
      'Unstyled form elements',
      'Missing hover/focus states',
      'Low contrast text',
      'Decoration without purpose',
    ],
  } as const;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPILE DESIGN SYSTEM TO PROMPT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export function compileDesignSystem(): string {
    return `## Design System
  
  ### Color Rules
  
  **Background**: Pure black (#000000) or near-black (#0a0a0a)
  **Text**: White → #888888 → #666666 → #333333 (strict hierarchy)
  **Semantic only**: Green=positive, Red=negative, Orange=warning
  **Accent**: Gold (#C9B99A) used sparingly for emphasis
  
  ### Typography Rules
  
  **Fonts**: Inter for UI, JetBrains Mono for data/numbers
  **Weights**: Light (300) for display, Heavy (700-900) for labels
  **Labels**: ALWAYS uppercase, letter-spacing 0.1em, 8-11px
  **Data**: Monospace font, aligned grids
  
  ### Component Rules
  
  **Cards**: Dark surface, subtle border, hover elevation
  **Buttons**: Transparent + white border → invert on hover
  **Badges**: Uppercase, tight, semantic colors only
  **Borders**: 3px left-border for status indication
  
  ### Spacing Rules
  
  **Base unit**: 4px
  **Cards**: Generous padding (14-24px)
  **Grids**: Consistent gaps (10-16px)
  **Elements must breathe**: When in doubt, add space
  
  ### Animation Rules
  
  **Easing**: cubic-bezier(0.4, 0, 0.2, 1) for smooth, spring for interactive
  **Duration**: 150-200ms for micro-interactions
  **Hover**: translateY(-2px) + subtle shadow increase
  **Never**: Bouncy, slow, or gratuitous animation
  
  ### What Alfred NEVER Does
  
  - Uses random grays or bright colors
  - Cramped spacing
  - Lowercase labels
  - Default browser styles
  - Decoration without purpose`;
  }
  
  export type DesignSystem = {
    colors: typeof COLORS;
    typography: typeof TYPOGRAPHY;
    spacing: typeof SPACING;
    borders: typeof BORDERS;
    shadows: typeof SHADOWS;
    animations: typeof ANIMATIONS;
    components: typeof COMPONENTS;
    antiPatterns: typeof ANTI_PATTERNS;
  };