'use client';

/**
 * Welcome Panel Component
 *
 * State-of-the-art context-aware welcome experience.
 * - New users see inspiring project examples
 * - Users with loaded projects see modification suggestions
 *
 * Steve Jobs level: Anticipate what users need before they ask.
 * Sam Altman level: AI that understands context and adapts.
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
  /** Currently loaded project info (null if no project) */
  project: ProjectInfo | null;
  /** Callback when a suggestion is clicked */
  onSuggestionClick: (text: string) => void;
  /** Whether Alfred is currently processing */
  isProcessing?: boolean;
}

interface Suggestion {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  gradient: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS - Premium, purposeful
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  // New project icons
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  ecommerce: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  ),
  social: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      <path d="M2 8c0-2.2.7-4.3 2-6" />
      <path d="M22 8a10 10 0 00-2-6" />
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  saas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  crypto: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  portfolio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  realtime: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),

  // Modification icons
  palette: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  font: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  button: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  spacing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 6H3" />
      <path d="M21 12H3" />
      <path d="M21 18H3" />
    </svg>
  ),
  image: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  shadow: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 21h12a2 2 0 002-2V7" opacity="0.5" />
    </svg>
  ),
  border: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  ),
  header: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  ),
  layout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  component: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  animation: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  api: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  ),
  responsive: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  dark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  performance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
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
  },
  {
    icon: Icons.ecommerce,
    label: 'E-commerce Store',
    prompt: 'Create a modern e-commerce storefront with product grid, cart functionality, and checkout flow. Use a clean, minimalist design.',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
  },
  {
    icon: Icons.saas,
    label: 'SaaS Landing Page',
    prompt: 'Design a premium SaaS landing page with hero section, feature highlights, pricing table, and testimonials. Make it feel like a billion-dollar startup.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    icon: Icons.ai,
    label: 'AI Chat Interface',
    prompt: 'Build a ChatGPT-style AI chat interface with message bubbles, typing indicator, code syntax highlighting, and a sleek dark theme.',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  },
  {
    icon: Icons.portfolio,
    label: 'Developer Portfolio',
    prompt: 'Create a stunning developer portfolio with animated hero, project showcase, skills section, and contact form. Apple-level design quality.',
    gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  },
  {
    icon: Icons.realtime,
    label: 'Real-time Dashboard',
    prompt: 'Build a real-time monitoring dashboard with live-updating metrics, status indicators, and notification system. Think Datadog or Grafana.',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
  },
];

// Quick action modifications - specific, actionable, common tasks
const quickModifications: Suggestion[] = [
  {
    icon: Icons.palette,
    label: 'Background Color',
    prompt: 'Change the background color to a dark gradient with subtle purple tones',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  },
  {
    icon: Icons.font,
    label: 'Change Font',
    prompt: 'Change the font to Inter for body text and a modern sans-serif for headings',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  },
  {
    icon: Icons.link,
    label: 'Add Links',
    prompt: 'Add navigation links to the header with hover effects',
    gradient: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
  },
  {
    icon: Icons.button,
    label: 'Style Buttons',
    prompt: 'Make the buttons more modern with gradient backgrounds and subtle shadows',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
  },
  {
    icon: Icons.spacing,
    label: 'Fix Spacing',
    prompt: 'Improve the spacing and padding throughout for better visual balance',
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  },
  {
    icon: Icons.animation,
    label: 'Add Animation',
    prompt: 'Add smooth fade-in animations when the page loads',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
  },
  {
    icon: Icons.image,
    label: 'Add Image',
    prompt: 'Add a hero image or background image to the main section',
    gradient: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  },
  {
    icon: Icons.dark,
    label: 'Dark Mode',
    prompt: 'Add a dark mode toggle with smooth color transitions',
    gradient: 'linear-gradient(135deg, #374151, #1f2937)',
  },
  {
    icon: Icons.shadow,
    label: 'Add Shadows',
    prompt: 'Add subtle box shadows to cards and buttons for depth',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    icon: Icons.border,
    label: 'Round Corners',
    prompt: 'Make all corners more rounded for a softer, modern look',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
  {
    icon: Icons.responsive,
    label: 'Mobile View',
    prompt: 'Make it fully responsive for mobile devices',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
  },
  {
    icon: Icons.header,
    label: 'Update Header',
    prompt: 'Redesign the header with a sticky navigation and logo',
    gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  },
];

function getModificationSuggestions(project: ProjectInfo): Suggestion[] {
  // Return 8 random quick modifications for variety
  const shuffled = [...quickModifications].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

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
      return getModificationSuggestions(project);
    }
    return newProjectSuggestions;
  }, [project]);

  const title = project
    ? `What would you like to modify in ${project.name}?`
    : 'What would you like to build?';

  const subtitle = project
    ? `${project.fileCount} files • ${project.framework || 'React'}`
    : 'Describe your vision and Alfred will bring it to life.';

  return (
    <div className="welcome-panel">
      {/* Header */}
      <div className="welcome-header">
        <motion.div
          className="welcome-orb"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="orb-gradient" />
          <div className="orb-glow" />
        </motion.div>

        <h2 className="welcome-title">{title}</h2>
        <p className="welcome-subtitle">{subtitle}</p>
      </div>

      {/* Suggestions */}
      <div className="suggestions-grid">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.label}
            className="suggestion-card"
            onClick={() => !isProcessing && onSuggestionClick(suggestion.prompt)}
            disabled={isProcessing}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="suggestion-icon"
              style={{ background: suggestion.gradient }}
            >
              {suggestion.icon}
            </div>
            <span className="suggestion-label">{suggestion.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Custom prompt hint */}
      <p className="custom-hint">
        Or type your own idea below...
      </p>

      <style jsx>{`
        .welcome-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          text-align: center;
        }

        .welcome-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .welcome-orb {
          position: relative;
          width: 64px;
          height: 64px;
          margin-bottom: 20px;
        }

        .orb-gradient {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          animation: rotate 8s linear infinite;
        }

        .orb-glow {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          filter: blur(20px);
          opacity: 0.4;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .welcome-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.3;
          max-width: 320px;
        }

        .welcome-subtitle {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          max-width: 440px;
          width: 100%;
        }

        @media (max-width: 480px) {
          .suggestions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .suggestions-grid.modifications {
          grid-template-columns: repeat(4, 1fr);
        }

        .suggestion-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-card:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .suggestion-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .suggestion-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .suggestion-label {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          line-height: 1.3;
        }

        .custom-hint {
          margin-top: 24px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default WelcomePanel;
