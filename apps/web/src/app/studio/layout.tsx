/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE STUDIO LAYOUT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PersonaForge Studio",
  description: "Create, engage with, and manage your digital personas",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
