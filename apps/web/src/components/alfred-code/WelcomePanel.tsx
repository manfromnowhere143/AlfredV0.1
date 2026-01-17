'use client';

/**
 * Welcome Panel Component - Compact State of the Art
 *
 * Premium context-aware welcome optimized for chat panel.
 * Compact, elegant, and fits perfectly in the conversation flow.
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
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS - Compact
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  ecommerce: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  ai: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  saas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  portfolio: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  realtime: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  palette: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
  font: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  button: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>,
  spacing: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 6H3"/><path d="M21 12H3"/><path d="M21 18H3"/></svg>,
  animation: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  image: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  dark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTIONS DATA
// ═══════════════════════════════════════════════════════════════════════════════

const newProjectSuggestions: Suggestion[] = [
  { icon: Icons.dashboard, label: 'Dashboard', prompt: 'Build an analytics dashboard with charts, KPI cards, and dark theme', color: '#6366f1' },
  { icon: Icons.ecommerce, label: 'E-commerce', prompt: 'Create a modern e-commerce storefront with product grid and cart', color: '#22c55e' },
  { icon: Icons.saas, label: 'SaaS Page', prompt: 'Design a premium SaaS landing page with hero, pricing, and testimonials', color: '#f59e0b' },
  { icon: Icons.ai, label: 'AI Chat', prompt: 'Build a ChatGPT-style chat interface with message bubbles and dark theme', color: '#ec4899' },
  { icon: Icons.portfolio, label: 'Portfolio', prompt: 'Create a stunning developer portfolio with project showcase', color: '#14b8a6' },
  { icon: Icons.realtime, label: 'Live Data', prompt: 'Build a real-time monitoring dashboard with live metrics', color: '#f43f5e' },
];

const quickModifications: Suggestion[] = [
  { icon: Icons.palette, label: 'Colors', prompt: 'Change the background to a dark gradient with purple tones', color: '#8b5cf6' },
  { icon: Icons.font, label: 'Fonts', prompt: 'Update typography with Inter font and better spacing', color: '#f59e0b' },
  { icon: Icons.link, label: 'Nav', prompt: 'Add navigation links with hover effects', color: '#0ea5e9' },
  { icon: Icons.button, label: 'Buttons', prompt: 'Style buttons with gradients and shadows', color: '#22c55e' },
  { icon: Icons.spacing, label: 'Layout', prompt: 'Improve spacing and visual balance', color: '#ec4899' },
  { icon: Icons.animation, label: 'Animate', prompt: 'Add smooth fade-in animations', color: '#f43f5e' },
  { icon: Icons.image, label: 'Images', prompt: 'Add a hero image to the main section', color: '#14b8a6' },
  { icon: Icons.dark, label: 'Dark', prompt: 'Add dark mode toggle', color: '#6366f1' },
];

function getModificationSuggestions(): Suggestion[] {
  return [...quickModifications].sort(() => Math.random() - 0.5).slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES - Compact for chat panel
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '24px 16px',
    textAlign: 'center' as const,
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    marginBottom: '20px',
  },
  orb: {
    position: 'relative' as const,
    width: '48px',
    height: '48px',
    marginBottom: '16px',
  },
  orbGradient: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
  },
  orbGlow: {
    position: 'absolute' as const,
    inset: '-8px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    filter: 'blur(16px)',
    opacity: 0.4,
  },
  title: {
    margin: '0 0 6px',
    fontSize: '15px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    maxWidth: '360px',
    width: '100%',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px 10px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  cardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  },
  icon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    color: 'white',
  },
  label: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.75)',
    margin: 0,
  },
  hint: {
    marginTop: '16px',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.25)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function WelcomePanel({ project, onSuggestionClick, isProcessing = false }: WelcomePanelProps) {
  const suggestions = useMemo(() => {
    return project ? getModificationSuggestions() : newProjectSuggestions;
  }, [project]);

  const title = project ? 'What would you like to modify?' : 'What would you like to build?';
  const subtitle = project ? `${project.name} · ${project.fileCount} files` : 'Describe your vision';

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <motion.div
          style={styles.orb}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            style={styles.orbGlow}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            style={styles.orbGradient}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
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
            style={{ ...styles.card, ...(isProcessing ? styles.cardDisabled : {}) }}
            onClick={() => !isProcessing && onSuggestionClick(suggestion.prompt)}
            disabled={isProcessing}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={!isProcessing ? {
              y: -3,
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: `0 8px 20px -6px ${suggestion.color}40`,
            } : undefined}
            whileTap={!isProcessing ? { scale: 0.97 } : undefined}
          >
            <div style={{ ...styles.icon, background: suggestion.color }}>
              {suggestion.icon}
            </div>
            <p style={styles.label}>{suggestion.label}</p>
          </motion.button>
        ))}
      </div>

      <p style={styles.hint}>Or type your own idea below...</p>
    </div>
  );
}

export default WelcomePanel;
