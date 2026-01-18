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
  // INTERACTION STATES - Apple-Level Micro-Interactions
  // Every element must respond instantly and delightfully
  // ═══════════════════════════════════════════════════════════════════════════════

  export const INTERACTION_STATES = {
    hover: {
      transform: 'scale(1.02) translateY(-1px)',
      opacity: 0.95,
      transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer',
    },
    active: {
      transform: 'scale(0.97)',
      opacity: 0.85,
      transition: 'all 50ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
    disabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
      pointerEvents: 'none',
      filter: 'grayscale(20%)',
    },
    loading: {
      opacity: 0.7,
      cursor: 'wait',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    focus: {
      outline: 'none',
      ring: '2px',
      ringColor: 'rgba(59, 130, 246, 0.5)',
      ringOffset: '2px',
    },
    error: {
      borderColor: 'rgba(239, 68, 68, 0.5)',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    success: {
      borderColor: 'rgba(34, 197, 94, 0.5)',
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
    },
    tailwind: {
      hover: 'hover:scale-[1.02] hover:opacity-95 hover:-translate-y-0.5 transition-all duration-150 ease-out cursor-pointer',
      active: 'active:scale-[0.97] active:opacity-85 transition-all duration-50',
      disabled: 'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      loading: 'opacity-70 cursor-wait animate-pulse',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
      focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
      error: 'border-red-500/50 bg-red-500/5',
      success: 'border-green-500/50 bg-green-500/5',
      interactive: 'hover:scale-[1.02] hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.97] active:opacity-85 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 transition-all duration-150 ease-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      button: 'inline-flex items-center justify-center font-medium hover:scale-[1.02] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
      card: 'hover:shadow-lg hover:-translate-y-1 hover:border-white/20 active:translate-y-0 transition-all duration-200 ease-out',
      link: 'hover:opacity-80 underline-offset-4 hover:underline transition-all duration-150',
    },
  } as const;

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESPONSIVE SYSTEM - Mobile-First, Fluid, Perfect on Every Device
  // ═══════════════════════════════════════════════════════════════════════════════

  export const RESPONSIVE = {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    containers: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px',
      full: '100%',
      prose: '65ch',
    },
    fluidTypography: {
      hero: 'clamp(2.5rem, 8vw, 6rem)',
      display: 'clamp(2rem, 6vw, 4.5rem)',
      title: 'clamp(1.75rem, 4vw, 3rem)',
      heading: 'clamp(1.5rem, 3vw, 2.25rem)',
      subheading: 'clamp(1.25rem, 2vw, 1.5rem)',
      body: 'clamp(1rem, 1.5vw, 1.125rem)',
      small: 'clamp(0.875rem, 1vw, 1rem)',
      tiny: 'clamp(0.75rem, 0.8vw, 0.875rem)',
    },
    fluidSpacing: {
      section: 'clamp(3rem, 10vw, 8rem)',
      block: 'clamp(2rem, 6vw, 4rem)',
      element: 'clamp(1rem, 3vw, 2rem)',
      inline: 'clamp(0.5rem, 1.5vw, 1rem)',
    },
    patterns: {
      mobile: {
        layout: 'flex-col',
        padding: 'px-4 py-6',
        touchTarget: 'min-h-[44px] min-w-[44px]',
        fontSize: '16px',
        gap: 'gap-4',
      },
      tablet: {
        layout: 'md:flex-row md:flex-wrap',
        padding: 'md:px-6 md:py-8',
        columns: 'md:grid-cols-2',
        gap: 'md:gap-6',
      },
      desktop: {
        layout: 'lg:flex-row',
        padding: 'lg:px-8 lg:py-12',
        columns: 'lg:grid-cols-3 xl:grid-cols-4',
        gap: 'lg:gap-8',
        maxWidth: 'max-w-7xl mx-auto',
      },
    },
    components: {
      hero: {
        mobile: 'py-12 px-4 text-center',
        tablet: 'md:py-20 md:px-8',
        desktop: 'lg:py-32 lg:px-12 lg:text-left',
      },
      nav: {
        mobile: 'fixed bottom-0 inset-x-0 h-16 border-t bg-black/80 backdrop-blur-lg',
        desktop: 'lg:static lg:h-auto lg:border-0 lg:bg-transparent',
      },
      cardGrid: {
        base: 'grid gap-4',
        mobile: 'grid-cols-1',
        tablet: 'md:grid-cols-2 md:gap-6',
        desktop: 'lg:grid-cols-3 lg:gap-8',
      },
    },
  } as const;

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACCESSIBILITY - WCAG 2.1 AAA Compliance
  // ═══════════════════════════════════════════════════════════════════════════════

  export const ACCESSIBILITY = {
    contrast: {
      dark: {
        '#ffffff': { ratio: '21:1', level: 'AAA', use: 'Headings, body text' },
        '#e5e5e5': { ratio: '17.5:1', level: 'AAA', use: 'Body text' },
        '#a3a3a3': { ratio: '9.5:1', level: 'AAA', use: 'Secondary text' },
        '#737373': { ratio: '5.5:1', level: 'AA', use: 'Tertiary, large only' },
        '#525252': { ratio: '3.7:1', level: 'AA-large', use: 'Large text, icons' },
        '#404040': { ratio: '2.6:1', level: 'FAIL', use: 'Decorative only' },
      },
      light: {
        '#0a0a0a': { ratio: '21:1', level: 'AAA', use: 'Headings, body text' },
        '#171717': { ratio: '19:1', level: 'AAA', use: 'Body text' },
        '#525252': { ratio: '7:1', level: 'AAA', use: 'Secondary text' },
        '#737373': { ratio: '4.5:1', level: 'AA', use: 'Tertiary text' },
      },
    },
    focus: {
      ring: 'ring-2 ring-offset-2 ring-blue-500 outline-none',
      ringDark: 'ring-2 ring-offset-2 ring-offset-black ring-blue-400 outline-none',
      skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded',
    },
    keyboard: {
      tab: 'All interactive elements reachable via Tab',
      enter: 'Buttons/links activate on Enter',
      space: 'Buttons activate on Space, checkboxes toggle',
      escape: 'Modals/dropdowns close on Escape',
      arrows: 'Navigate within menus, tabs, sliders',
    },
    aria: {
      labels: 'All form inputs need aria-label or label',
      buttons: 'Icon-only buttons need aria-label',
      live: 'Dynamic content needs aria-live regions',
      expanded: 'Expandable elements need aria-expanded',
    },
    motion: {
      reduce: '@media (prefers-reduced-motion: reduce)',
      respectPreference: 'motion-reduce:transition-none motion-reduce:animate-none',
    },
    screenReader: {
      only: 'sr-only',
      notOnly: 'not-sr-only',
      focusable: 'sr-only focus:not-sr-only',
    },
  } as const;

  // ═══════════════════════════════════════════════════════════════════════════════
  // LAYOUT SYSTEM - Perfect Grid & Composition
  // ═══════════════════════════════════════════════════════════════════════════════

  export const LAYOUT = {
    grid: {
      base: 8,
      columns: {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        6: 'grid-cols-6',
        12: 'grid-cols-12',
        auto: 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
      },
      gap: {
        0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4',
        6: 'gap-6', 8: 'gap-8', 12: 'gap-12', 16: 'gap-16',
      },
    },
    spacing: {
      0: '0', px: '1px', 0.5: '2px', 1: '4px', 2: '8px', 3: '12px',
      4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px',
      12: '48px', 16: '64px', 20: '80px', 24: '96px',
    },
    patterns: {
      container: 'mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl',
      containerNarrow: 'mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl',
      containerWide: 'mx-auto px-8 max-w-[1600px]',
      flexCenter: 'flex items-center justify-center',
      flexBetween: 'flex items-center justify-between',
      flexCol: 'flex flex-col',
      flexColCenter: 'flex flex-col items-center justify-center',
      stack: 'flex flex-col gap-4',
      stackTight: 'flex flex-col gap-2',
      stackLoose: 'flex flex-col gap-8',
      row: 'flex items-center gap-4',
      rowTight: 'flex items-center gap-2',
      rowLoose: 'flex items-center gap-8',
      absoluteFill: 'absolute inset-0',
      absoluteCenter: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    },
    sections: {
      hero: 'py-16 sm:py-24 lg:py-32',
      section: 'py-12 sm:py-16 lg:py-24',
      sectionSm: 'py-8 sm:py-12 lg:py-16',
      sectionLg: 'py-20 sm:py-28 lg:py-40',
    },
    zIndex: {
      hide: -1, base: 0, raised: 1, dropdown: 10, sticky: 20,
      overlay: 30, modal: 40, popover: 50, tooltip: 60, toast: 70, max: 9999,
    },
  } as const;

  // ═══════════════════════════════════════════════════════════════════════════════
  // MOTION SYSTEM - Smooth, Purposeful Animation
  // ═══════════════════════════════════════════════════════════════════════════════

  export const MOTION = {
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      springBouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      springStiff: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      enterFast: 'cubic-bezier(0, 0, 0.2, 1)',
      exitFast: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    duration: {
      instant: '0ms', fastest: '50ms', faster: '100ms', fast: '150ms',
      normal: '200ms', slow: '300ms', slower: '400ms', slowest: '500ms',
      hover: '150ms', active: '50ms', enter: '200ms', exit: '150ms',
    },
    stagger: {
      fast: '30ms', normal: '50ms', slow: '80ms', verySlow: '120ms',
    },
    presets: {
      fadeIn: 'animate-in fade-in-0 duration-200',
      fadeOut: 'animate-out fade-out-0 duration-150',
      slideInFromTop: 'animate-in slide-in-from-top-4 fade-in-0 duration-300',
      slideInFromBottom: 'animate-in slide-in-from-bottom-4 fade-in-0 duration-300',
      scaleIn: 'animate-in zoom-in-95 fade-in-0 duration-200',
      scaleOut: 'animate-out zoom-out-95 fade-out-0 duration-150',
      popIn: 'animate-in zoom-in-90 fade-in-0 duration-200 ease-out',
    },
    micro: {
      buttonPress: 'active:scale-[0.97] transition-transform duration-50',
      cardHover: 'hover:-translate-y-1 hover:shadow-xl transition-all duration-300',
      iconSpin: 'hover:rotate-12 transition-transform duration-200',
      glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-shadow duration-300',
      pulse: 'animate-pulse',
      bounce: 'animate-bounce',
    },
    reducedMotion: {
      mediaQuery: '@media (prefers-reduced-motion: reduce)',
      class: 'motion-reduce:transition-none motion-reduce:animate-none',
    },
    keyframes: {
      shake: '@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); } 20%, 40%, 60%, 80% { transform: translateX(4px); } }',
      shimmer: '@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }',
      slideUp: '@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }',
      spin: '@keyframes spin { to { transform: rotate(360deg); } }',
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
    return `## Design System — Apple/Linear/Stripe Quality Standards

### Color Rules
- Background: Pure black (#000000) or near-black (#0a0a0a)
- Text hierarchy: White → #888888 → #666666 → #333333
- Semantic only: Green=positive, Red=negative, Orange=warning
- Accent: Gold (#C9B99A) sparingly for emphasis

### Typography Rules
- Fonts: Inter for UI, JetBrains Mono for data/numbers
- Fluid sizing: clamp() for responsive scaling
- Labels: ALWAYS uppercase, letter-spacing 0.1em, 8-11px
- Line height: 1.5-1.7 for body text

### Interaction States (MANDATORY)
- Hover: scale(1.02), translateY(-1px), opacity 0.95, 150ms transition
- Active: scale(0.97), opacity 0.85, 50ms transition
- Focus: ring-2 ring-blue-500/50 ring-offset-2 outline-none
- Disabled: opacity 0.4, cursor not-allowed, pointer-events none
- Loading: opacity 0.7, animate-pulse
- Error: border-red-500/50, bg-red-500/5
- Success: border-green-500/50, bg-green-500/5

### Responsive Design (Mobile-First)
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)
- Touch targets: min 44px × 44px (Apple HIG)
- Fluid typography: clamp(min, preferred, max)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

### Accessibility (WCAG AAA)
- Contrast: 4.5:1 minimum for text, 3:1 for large text
- Focus visible: Always show keyboard focus rings
- ARIA: Labels on all inputs, aria-label on icon buttons
- Motion: Respect prefers-reduced-motion

### Animation Rules
- Easing: cubic-bezier(0.16, 1, 0.3, 1) for spring, (0.4, 0, 0.2, 1) for smooth
- Duration: 50ms active, 150ms hover, 200ms enter, 150ms exit
- Stagger: 50ms between list items
- ALWAYS use motion-reduce:animate-none

### Layout Patterns
- Container: mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl
- Stack: flex flex-col gap-4
- Row: flex items-center gap-4
- Grid: grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3

### Z-Index Scale
- dropdown: 10, sticky: 20, overlay: 30, modal: 40, tooltip: 60, toast: 70

### What Alfred NEVER Does
- Missing hover/active/focus states
- Inaccessible color contrast
- Fixed pixel widths without responsive
- Animations that ignore reduced-motion
- Missing ARIA labels
- Cramped spacing or decoration without purpose`;
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
    interactionStates: typeof INTERACTION_STATES;
    responsive: typeof RESPONSIVE;
    accessibility: typeof ACCESSIBILITY;
    layout: typeof LAYOUT;
    motion: typeof MOTION;
  };