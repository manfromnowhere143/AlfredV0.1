'use client';

/**
 * Welcome Panel Component - State of the Art
 *
 * Premium context-aware welcome experience with floating glass cards.
 * OpenAI/Anthropic engineer level: Precision, elegance, intentionality.
 *
 * Features:
 * - Glassmorphism with depth and floating appearance
 * - Premium typography with refined tracking/spacing
 * - Sophisticated micro-interactions
 * - Context-aware suggestions
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProjectInfo {
  name: string;
  fileCount: number;
  framework?: string;
  hasComponents?: boolean;
  hasStyles?: boolean;
  hasApi?: boolean;
}

interface WelcomePanelProps {
  project: ProjectInfo | null;
  onSuggestionClick: (text: string) => void;
  isProcessing?: boolean;
}

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  gradient: string;
  glow: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS - Refined, minimal, premium
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  // Project icons
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  ecommerce: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  ),
  ai: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  saas: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  portfolio: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  realtime: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),

  // Modification icons
  palette: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  font: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  link: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  button: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  spacing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 6H3" />
      <path d="M21 12H3" />
      <path d="M21 18H3" />
    </svg>
  ),
  image: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  animation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  dark: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  shadow: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 21h12a2 2 0 002-2V7" opacity="0.5" />
    </svg>
  ),
  border: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  ),
  responsive: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  header: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS DATA
// ═══════════════════════════════════════════════════════════════════════════════

const newProjectSuggestions: Suggestion[] = [
  {
    icon: Icons.dashboard,
    label: 'Analytics Dashboard',
    prompt: 'Build an analytics dashboard with real-time charts, KPI cards, and a dark theme. Include a sidebar navigation and responsive design.',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  {
    icon: Icons.ecommerce,
    label: 'E-commerce Store',
    prompt: 'Create a modern e-commerce storefront with product grid, cart functionality, and checkout flow. Use a clean, minimalist design.',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  {
    icon: Icons.saas,
    label: 'SaaS Landing',
    prompt: 'Design a premium SaaS landing page with hero section, feature highlights, pricing table, and testimonials. Make it feel like a billion-dollar startup.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  {
    icon: Icons.ai,
    label: 'AI Chat Interface',
    prompt: 'Build a ChatGPT-style AI chat interface with message bubbles, typing indicator, code syntax highlighting, and a sleek dark theme.',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    glow: 'rgba(236, 72, 153, 0.4)',
  },
  {
    icon: Icons.portfolio,
    label: 'Dev Portfolio',
    prompt: 'Create a stunning developer portfolio with animated hero, project showcase, skills section, and contact form. Apple-level design quality.',
    gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
    glow: 'rgba(20, 184, 166, 0.4)',
  },
  {
    icon: Icons.realtime,
    label: 'Live Dashboard',
    prompt: 'Build a real-time monitoring dashboard with live-updating metrics, status indicators, and notification system. Think Datadog or Grafana.',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
];

const quickModifications: Suggestion[] = [
  {
    icon: Icons.palette,
    label: 'Background',
    prompt: 'Change the background color to a dark gradient with subtle purple tones',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  {
    icon: Icons.font,
    label: 'Typography',
    prompt: 'Change the font to Inter for body text and a modern sans-serif for headings with better letter-spacing',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  {
    icon: Icons.link,
    label: 'Navigation',
    prompt: 'Add navigation links to the header with smooth hover effects',
    gradient: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
    glow: 'rgba(14, 165, 233, 0.4)',
  },
  {
    icon: Icons.button,
    label: 'Buttons',
    prompt: 'Make the buttons more modern with gradient backgrounds and subtle shadows',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  {
    icon: Icons.spacing,
    label: 'Spacing',
    prompt: 'Improve the spacing and padding throughout for better visual balance',
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    glow: 'rgba(236, 72, 153, 0.4)',
  },
  {
    icon: Icons.animation,
    label: 'Animate',
    prompt: 'Add smooth fade-in and slide-up animations when the page loads',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
  {
    icon: Icons.image,
    label: 'Hero Image',
    prompt: 'Add a hero image or background image to the main section',
    gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
    glow: 'rgba(20, 184, 166, 0.4)',
  },
  {
    icon: Icons.dark,
    label: 'Dark Mode',
    prompt: 'Add a dark mode toggle with smooth color transitions',
    gradient: 'linear-gradient(135deg, #374151, #1f2937)',
    glow: 'rgba(55, 65, 81, 0.4)',
  },
  {
    icon: Icons.shadow,
    label: 'Shadows',
    prompt: 'Add subtle box shadows to cards and buttons for depth',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  {
    icon: Icons.border,
    label: 'Corners',
    prompt: 'Make all corners more rounded for a softer, modern look',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  {
    icon: Icons.responsive,
    label: 'Mobile',
    prompt: 'Make it fully responsive for mobile devices',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    glow: 'rgba(236, 72, 153, 0.4)',
  },
  {
    icon: Icons.header,
    label: 'Header',
    prompt: 'Redesign the header with a sticky navigation and logo',
    gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    glow: 'rgba(14, 165, 233, 0.4)',
  },
];

function getModificationSuggestions(): Suggestion[] {
  const shuffled = [...quickModifications].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES - Premium glassmorphism with floating effect
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: '40px',
  },
  orb: {
    position: 'relative' as const,
    width: '72px',
    height: '72px',
    marginBottom: '24px',
  },
  orbGradient: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
  },
  orbGlow: {
    position: 'absolute' as const,
    inset: '-12px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    filter: 'blur(24px)',
    opacity: 0.5,
  },
  title: {
    margin: '0 0 10px',
    fontSize: '22px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    maxWidth: '360px',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: '0.01em',
    fontWeight: 400,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    maxWidth: '520px',
    width: '100%',
  },
  card: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '20px 14px 18px',
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    cursor: 'pointer',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  cardGlow: {
    position: 'absolute' as const,
    inset: 0,
    opacity: 0,
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none' as const,
  },
  cardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  },
  icon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    color: 'white',
    boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.3)',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center' as const,
    letterSpacing: '0.01em',
    lineHeight: 1.3,
    margin: 0,
  },
  hint: {
    marginTop: '32px',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: '0.02em',
    fontWeight: 400,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function WelcomePanel({
  project,
  onSuggestionClick,
  isProcessing = false,
}: WelcomePanelProps) {
  const suggestions = useMemo(() => {
    if (project) {
      return getModificationSuggestions();
    }
    return newProjectSuggestions;
  }, [project]);

  const title = project
    ? `What would you like to modify?`
    : 'What would you like to build?';

  const subtitle = project
    ? `${project.name} • ${project.fileCount} files`
    : 'Describe your vision and Alfred will bring it to life.';

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <motion.div
          style={styles.orb}
          animate={{
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            style={styles.orbGlow}
            animate={{
              opacity: [0.4, 0.6, 0.4],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            style={styles.orbGradient}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>

        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>

      {/* Suggestions Grid */}
      <div style={styles.grid}>
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.label}
            style={{
              ...styles.card,
              ...(isProcessing ? styles.cardDisabled : {}),
            }}
            onClick={() => !isProcessing && onSuggestionClick(suggestion.prompt)}
            disabled={isProcessing}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: index * 0.06,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={!isProcessing ? {
              y: -6,
              scale: 1.02,
              boxShadow: `0 20px 40px -10px ${suggestion.glow}, 0 0 0 1px rgba(255, 255, 255, 0.1)`,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))',
              borderColor: 'rgba(255, 255, 255, 0.15)',
            } : undefined}
            whileTap={!isProcessing ? { scale: 0.97 } : undefined}
          >
            {/* Ambient glow on hover */}
            <motion.div
              style={{
                ...styles.cardGlow,
                background: `radial-gradient(circle at 50% 0%, ${suggestion.glow} 0%, transparent 70%)`,
              }}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 0.3 }}
            />

            <motion.div
              style={{
                ...styles.icon,
                background: suggestion.gradient,
              }}
              whileHover={{
                boxShadow: `0 12px 28px -4px ${suggestion.glow}`,
              }}
            >
              {suggestion.icon}
            </motion.div>
            <p style={styles.label}>{suggestion.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Hint */}
      <p style={styles.hint}>
        Or type your own idea below...
      </p>
    </div>
  );
}

export default WelcomePanel;
