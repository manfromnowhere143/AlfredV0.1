/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE STUDIO SHELL — STATE-OF-THE-ART
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Apple-level, Pixar-quality studio shell. Mobile-first design with premium
 * interactions that would make Steve Jobs proud.
 *
 * Design Philosophy:
 * - Mobile-first with iOS-style bottom navigation
 * - Premium glass morphism and depth
 * - Fluid gesture-based interactions
 * - Cinematic transitions that feel alive
 * - Information hierarchy through spatial relationships
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { colors, spacing, typography, radius, animation, zIndex } from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type StudioView = "gallery" | "create" | "engage" | "cinema" | "settings";

interface StudioShellProps {
  children: ReactNode;
  currentView?: StudioView;
  onViewChange?: (view: StudioView) => void;
  showSidebar?: boolean;
}

interface NavItem {
  id: StudioView;
  label: string;
  icon: ReactNode;
  activeIcon: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE-OF-THE-ART SVG ICONS — Custom crafted for premium feel
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  // Gallery - Elegant grid
  gallery: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2.5"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
      />
      <rect x="13" y="3" width="8" height="8" rx="2.5"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        opacity={active ? 0.7 : 1}
      />
      <rect x="3" y="13" width="8" height="8" rx="2.5"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        opacity={active ? 0.7 : 1}
      />
      <rect x="13" y="13" width="8" height="8" rx="2.5"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        opacity={active ? 0.5 : 1}
      />
    </svg>
  ),

  // Create - Elegant plus with spark
  create: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        opacity={active ? 0.2 : 1}
      />
      <path d="M12 8v8M8 12h8"
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {active && (
        <>
          <circle cx="18" cy="6" r="1.5" fill={colors.gold[300]} />
          <circle cx="6" cy="18" r="1" fill={colors.gold[500]} />
        </>
      )}
    </svg>
  ),

  // Engage - Chat bubble with life
  engage: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12c0 4.418-4.03 8-9 8-1.6 0-3.1-.36-4.4-1L3 21l1.5-3.6C3.5 16.1 3 14.1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={active ? 0.3 : 1}
      />
      <circle cx="8" cy="12" r="1.5" fill={active ? colors.gold[400] : "currentColor"} />
      <circle cx="12" cy="12" r="1.5" fill={active ? colors.gold[400] : "currentColor"} />
      <circle cx="16" cy="12" r="1.5" fill={active ? colors.gold[400] : "currentColor"} />
    </svg>
  ),

  // Cinema - Film strip with premium feel
  cinema: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        opacity={active ? 0.2 : 1}
      />
      <path d="M2 8h20M2 16h20" stroke={active ? colors.gold[400] : "currentColor"} strokeWidth="1.5" />
      <rect x="4" y="4" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="8" y="4" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="14" y="4" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="18" y="4" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="4" y="16" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="8" y="16" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="14" y="16" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      <rect x="18" y="16" width="2" height="4" fill={active ? colors.gold[400] : "currentColor"} opacity={active ? 1 : 0.5} />
      {/* Play button in center */}
      <path d="M10 10l5 2.5-5 2.5z" fill={active ? colors.gold[400] : "currentColor"} />
    </svg>
  ),

  // Settings - Elegant gear
  settings: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3"
        fill={active ? colors.gold[400] : "none"}
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
      />
      <path
        d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        stroke={active ? colors.gold[400] : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={active ? 0.8 : 0.6}
      />
    </svg>
  ),

  // Logo - PersonaForge mark
  logo: (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.gold[300]} />
          <stop offset="100%" stopColor={colors.gold[500]} />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="16" stroke="url(#logoGradient)" strokeWidth="2" fill="none" />
      <circle cx="18" cy="18" r="12" stroke="url(#logoGradient)" strokeWidth="1" fill="none" opacity="0.3" />
      <path
        d="M18 8v20M11 14h14M12 22h12"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="18" r="4" fill="url(#logoGradient)" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

const navItems: NavItem[] = [
  { id: "gallery", label: "Gallery", icon: Icons.gallery(false), activeIcon: Icons.gallery(true) },
  { id: "create", label: "Create", icon: Icons.create(false), activeIcon: Icons.create(true) },
  { id: "engage", label: "Engage", icon: Icons.engage(false), activeIcon: Icons.engage(true) },
  { id: "cinema", label: "Cinema", icon: Icons.cinema(false), activeIcon: Icons.cinema(true) },
  { id: "settings", label: "Settings", icon: Icons.settings(false), activeIcon: Icons.settings(true) },
];

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
// STUDIO SHELL COMPONENT — STATE-OF-THE-ART
// ═══════════════════════════════════════════════════════════════════════════════

export function StudioShell({
  children,
  currentView = "gallery",
  onViewChange,
  showSidebar = true,
}: StudioShellProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleViewChange = (view: StudioView) => {
    onViewChange?.(view);
  };

  // Spring-animated scroll position for parallax effects
  const scrollY = useMotionValue(0);
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
  const headerBlur = useTransform(scrollY, [0, 100], [8, 16]);

  return (
    <div
      style={{
        minHeight: "100dvh", // Dynamic viewport height for mobile (fallback to 100vh)
        background: `linear-gradient(180deg, ${colors.bg.void} 0%, ${colors.bg.deep} 100%)`,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PREMIUM HEADER — Desktop & Tablet */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <motion.header
          style={{
            height: 72,
            background: `rgba(12, 10, 9, 0.85)`,
            backdropFilter: `blur(${headerBlur}px)`,
            WebkitBackdropFilter: `blur(${headerBlur}px)`,
            borderBottom: `1px solid ${colors.border.subtle}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${spacing[8]}`,
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky,
            opacity: headerOpacity,
          }}
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", ...animation.spring.smooth, delay: 0.1 }}
        >
          {/* Logo & Brand */}
          <motion.div
            style={{ display: "flex", alignItems: "center", gap: spacing[4] }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.9 }}
            >
              {Icons.logo}
            </motion.div>
            <div>
              <h1
                style={{
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  letterSpacing: "-0.02em",
                  color: colors.text.primary,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                PersonaForge
              </h1>
              <p
                style={{
                  fontSize: 10,
                  color: colors.gold[400],
                  margin: 0,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Studio
              </p>
            </div>
          </motion.div>

          {/* Desktop Navigation — Pill Style */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing[1],
              background: colors.bg.elevated,
              padding: spacing[1],
              borderRadius: radius.full,
              border: `1px solid ${colors.border.subtle}`,
            }}
          >
            {navItems.map((item, index) => (
              <DesktopNavItem
                key={item.id}
                item={item}
                isActive={currentView === item.id}
                onClick={() => handleViewChange(item.id)}
                index={index}
              />
            ))}
          </nav>

          {/* Right side - User avatar placeholder */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              background: `linear-gradient(135deg, ${colors.gold[600]} 0%, ${colors.gold[400]} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: `0 4px 12px ${colors.gold[900]}40`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.bg.void} strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
            </svg>
          </motion.div>
        </motion.header>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MOBILE HEADER — Minimal Top Bar */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <motion.header
          style={{
            height: 56,
            background: `rgba(12, 10, 9, 0.9)`,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `0 ${spacing[4]}`,
            position: "sticky",
            top: 0,
            zIndex: zIndex.sticky,
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", ...animation.spring.smooth }}
        >
          {/* Current View Title */}
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              letterSpacing: "-0.01em",
            }}
          >
            {navItems.find(n => n.id === currentView)?.label}
          </motion.div>
        </motion.header>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          paddingBottom: isMobile ? 88 : 0, // Space for bottom nav
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            style={{
              minHeight: "100%",
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MOBILE BOTTOM NAVIGATION — iOS-Style Tab Bar */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", ...animation.spring.smooth, delay: 0.2 }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 84,
            paddingBottom: 20, // Safe area for notch phones
            background: `rgba(12, 10, 9, 0.95)`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: `1px solid ${colors.border.subtle}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-around",
            paddingTop: spacing[2],
            zIndex: zIndex.fixed,
          }}
        >
          {navItems.map((item) => (
            <MobileNavItem
              key={item.id}
              item={item}
              isActive={currentView === item.id}
              onClick={() => handleViewChange(item.id)}
            />
          ))}
        </motion.nav>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* AMBIENT EFFECTS — Premium visual polish */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isLoaded && (
        <>
          {/* Top gradient glow */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              height: "30%",
              background: `radial-gradient(ellipse at center, ${colors.gold[900]}15 0%, transparent 70%)`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* Bottom vignette */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "20%",
              background: `linear-gradient(to top, ${colors.bg.void} 0%, transparent 100%)`,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESKTOP NAV ITEM — Pill Navigation
// ═══════════════════════════════════════════════════════════════════════════════

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  index?: number;
}

function DesktopNavItem({ item, isActive, onClick, index = 0 }: NavItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: isActive ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: spacing[2],
        padding: `${spacing[2]} ${spacing[4]}`,
        background: "transparent",
        border: "none",
        borderRadius: radius.full,
        color: isActive ? colors.gold[400] : colors.text.secondary,
        cursor: "pointer",
        transition: `color ${animation.duration.fast}`,
        overflow: "hidden",
      }}
    >
      {/* Active background pill */}
      {isActive && (
        <motion.div
          layoutId="desktop-nav-pill"
          style={{
            position: "absolute",
            inset: 0,
            background: colors.gold.glow,
            borderRadius: radius.full,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <span style={{ position: "relative", zIndex: 1 }}>
        {isActive ? item.activeIcon : item.icon}
      </span>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: typography.fontSize.sm,
          fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
        }}
      >
        {item.label}
      </span>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE NAV ITEM — iOS Tab Bar Style
// ═══════════════════════════════════════════════════════════════════════════════

function MobileNavItem({ item, isActive, onClick }: NavItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing[1],
        padding: spacing[2],
        background: "transparent",
        border: "none",
        color: isActive ? colors.gold[400] : colors.text.muted,
        cursor: "pointer",
        minWidth: 64,
        position: "relative",
      }}
    >
      {/* Active indicator dot */}
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          style={{
            position: "absolute",
            top: -4,
            width: 4,
            height: 4,
            borderRadius: radius.full,
            background: colors.gold[400],
            boxShadow: `0 0 8px ${colors.gold[400]}`,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -2 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {isActive ? item.activeIcon : item.icon}
      </motion.div>

      <span
        style={{
          fontSize: 10,
          fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
          letterSpacing: "0.01em",
        }}
      >
        {item.label}
      </span>
    </motion.button>
  );
}

export default StudioShell;
