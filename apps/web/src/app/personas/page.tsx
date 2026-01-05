"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 *   P E R S O N A F O R G E   —   I M M E R S I V E
 * 
 *   A Steve Jobs level creation experience.
 *   Full-screen. Flowing. Breathtaking.
 *   
 *   Design Philosophy:
 *   • The screen IS the canvas
 *   • Typography as the hero
 *   • Negative space speaks
 *   • Every pixel intentional
 *   • Black. White. Nothing else.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import dynamic from "next/dynamic";

const AwakeningScene = dynamic(() => import("./AwakeningScene"), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO MODE — Set to true to bypass API calls (no credits needed)
// ═══════════════════════════════════════════════════════════════════════════════

const DEMO_MODE = true; // Set to false when you have API credits

// Demo data for testing
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
];

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Monochrome Elegance
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  // Blacks
  void: "#000000",
  ink: "#0a0a0a",
  coal: "#111111",
  graphite: "#1a1a1a",
  
  // Grays
  steel: "#2a2a2a",
  silver: "#888888",
  mist: "#aaaaaa",
  
  // Whites
  pearl: "#e0e0e0",
  snow: "#f5f5f5",
  white: "#ffffff",
  
  // Functional
  glass: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.15)",
};

// Refined easing curves
const ease = {
  smooth: [0.4, 0, 0.2, 1] as const,
  out: [0, 0, 0.2, 1] as const,
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Archetype = 
  | "sage" | "hero" | "creator" | "caregiver" | "ruler" | "jester" 
  | "rebel" | "lover" | "explorer" | "innocent" | "magician" | "outlaw";

type View = "home" | "create" | "awakening" | "persona" | "video";

interface Persona {
  id: string;
  name: string;
  description?: string;
  archetype: Archetype;
  traits: string[];
  imageUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPES: Record<Archetype, { name: string; essence: string }> = {
  sage: { name: "Sage", essence: "Wisdom" },
  hero: { name: "Hero", essence: "Courage" },
  creator: { name: "Creator", essence: "Vision" },
  caregiver: { name: "Caregiver", essence: "Compassion" },
  ruler: { name: "Ruler", essence: "Power" },
  jester: { name: "Jester", essence: "Joy" },
  rebel: { name: "Rebel", essence: "Freedom" },
  lover: { name: "Lover", essence: "Passion" },
  explorer: { name: "Explorer", essence: "Discovery" },
  innocent: { name: "Innocent", essence: "Hope" },
  magician: { name: "Magician", essence: "Transformation" },
  outlaw: { name: "Outlaw", essence: "Liberation" },
};

const STYLES = [
  { id: "hyper_realistic", name: "Photorealistic" },
  { id: "pixar_3d", name: "Pixar 3D" },
  { id: "anime_premium", name: "Anime" },
  { id: "fantasy_epic", name: "Fantasy" },
  { id: "arcane_stylized", name: "Arcane" },
  { id: "corporate_professional", name: "Professional" },
];

const TRAITS = [
  "Commanding", "Wise", "Elegant", "Mysterious", 
  "Playful", "Calm", "Fierce", "Nurturing",
  "Creative", "Analytical", "Empathetic", "Bold",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 8,
            background: i <= current ? c.white : c.steel,
          }}
          transition={{ duration: 0.3, ease: ease.smooth }}
          style={{
            height: 8,
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}

function FloatingLabel({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            fontSize: 12,
            fontWeight: 500,
            color: c.mist,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME VIEW — Minimal, impactful
// ═══════════════════════════════════════════════════════════════════════════════

function HomeView({ 
  personas, 
  loading,
  onNew, 
  onSelect,
  onVideo,
  onChat,
}: { 
  personas: Persona[];
  loading: boolean;
  onNew: () => void;
  onSelect: (p: Persona) => void;
  onVideo: (p: Persona) => void;
  onChat: (p: Persona) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: c.void,
      }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ color: c.white, fontSize: 14, letterSpacing: 4 }}
        >
          LOADING
        </motion.div>
      </div>
    );
  }

  // Empty state - dramatic full screen
  if (personas.length === 0) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: c.void,
        padding: 40,
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: ease.out }}
          style={{
            fontSize: "clamp(48px, 12vw, 120px)",
            fontWeight: 200,
            color: c.white,
            letterSpacing: -2,
            textAlign: "center",
            margin: 0,
          }}
        >
          PersonaForge
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            fontSize: 16,
            color: c.silver,
            marginTop: 24,
            marginBottom: 60,
            letterSpacing: 1,
          }}
        >
          Create AI characters that feel alive
        </motion.p>
        
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          style={{
            background: c.white,
            color: c.void,
            border: "none",
            padding: "18px 48px",
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 99,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Begin
        </motion.button>
      </div>
    );
  }

  // Gallery - clean grid
  return (
    <div style={{ minHeight: "100vh", background: c.void }}>
      {/* Header */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 40px",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(20px)",
        zIndex: 100,
      }}>
        <h1 style={{
          fontSize: 18,
          fontWeight: 500,
          color: c.white,
          margin: 0,
          letterSpacing: 1,
        }}>
          PersonaForge
        </h1>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          style={{
            background: c.white,
            color: c.void,
            border: "none",
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 99,
            cursor: "pointer",
          }}
        >
          New Persona
        </motion.button>
      </header>

      {/* Grid */}
      <div style={{
        padding: "120px 40px 60px",
        maxWidth: 1400,
        margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 24,
        }}>
          {personas.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(p)}
              style={{
                background: c.ink,
                borderRadius: 20,
                overflow: "hidden",
                cursor: "pointer",
                border: `1px solid ${hoveredId === p.id ? c.borderLight : c.border}`,
                transition: "border-color 0.3s ease",
              }}
            >
              {/* Avatar */}
              <div style={{
                aspectRatio: "1",
                background: c.graphite,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}>
                {p.imageUrl ? (
                  <img 
                    src={p.imageUrl} 
                    alt={p.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: 72,
                    fontWeight: 200,
                    color: c.steel,
                  }}>
                    {p.name[0]}
                  </span>
                )}
                
                {/* Hover overlay */}
                <motion.div
                  initial={false}
                  animate={{ opacity: hoveredId === p.id ? 1 : 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{
                    color: c.white,
                    fontSize: 14,
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}>
                    Engage
                  </span>
                </motion.div>
              </div>
              
              {/* Info */}
              <div style={{ padding: 24 }}>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: c.white,
                  margin: 0,
                }}>
                  {p.name}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: c.silver,
                  margin: "8px 0 0",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}>
                  {ARCHETYPES[p.archetype]?.name || p.archetype}
                </p>
                
                {/* Action buttons */}
                <div style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: `1px solid ${c.border}`,
                }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); onVideo(p); }}
                    style={{
                      flex: 1,
                      background: c.white,
                      color: c.void,
                      border: "none",
                      borderRadius: 99,
                      padding: "12px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="14" height="14" rx="2" />
                      <path d="M16 9l6-3v12l-6-3" />
                    </svg>
                    Video
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => { e.stopPropagation(); onChat(p); }}
                    style={{
                      width: 44,
                      height: 44,
                      background: c.graphite,
                      color: c.white,
                      border: `1px solid ${c.border}`,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE FLOW — Full-screen immersive experience
// ═══════════════════════════════════════════════════════════════════════════════

function CreateFlow({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (p: Persona) => void; 
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [style, setStyle] = useState("hyper_realistic");
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [traits, setTraits] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API state
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on step change
  useEffect(() => {
    if (step === 0) inputRef.current?.focus();
    if (step === 1) textareaRef.current?.focus();
  }, [step]);

  const canProceed = [
    name.length >= 2 && archetype !== null,  // Step 0: Name + Archetype
    true,                                      // Step 1: Style (always has default)
    selectedImage !== null,                    // Step 2: Image selection
    traits.length >= 2,                        // Step 3: Traits
  ][step];

  // Step handlers
  const handleStep0Complete = async () => {
    if (!name || !archetype) return;
    setLoading(true);
    setError(null);
    
    // Ensure description is not empty (backend requires it)
    const finalDescription = description.trim() || `A ${ARCHETYPES[archetype].name.toLowerCase()} persona named ${name}`;
    
    if (DEMO_MODE) {
      // Skip API calls in demo mode
      setPersonaId("demo-" + Date.now());
      setSessionId("demo-session-" + Date.now());
      setLoading(false);
      setStep(1);
      return;
    }
    
    try {
      // Create persona
      const createRes = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, archetype, description: finalDescription }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);
      
      setPersonaId(createData.persona.id);
      
      // Start wizard
      const startRes = await fetch(`/api/personas/${createData.persona.id}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error);
      
      setSessionId(startData.data.id);
      
      // Spark
      await fetch(`/api/personas/${createData.persona.id}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "spark", 
          sessionId: startData.data.id, 
          data: { name, description: finalDescription, archetype } 
        }),
      });
      
      setStep(1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true);
    setError(null);
    
    if (DEMO_MODE) {
      // Use demo images
      await new Promise(r => setTimeout(r, 1500)); // Simulate loading
      setImages(DEMO_IMAGES);
      setStep(2);
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "generate-variations", 
          sessionId, 
          data: { stylePreset: style, count: 4 } 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setImages(data.data.variations.map((v: { imageUrl: string }) => v.imageUrl));
      setStep(2);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLockImage = async () => {
    if (!personaId || !sessionId || selectedImage === null) return;
    setLoading(true);
    
    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 500));
      setStep(3);
      setLoading(false);
      return;
    }
    
    try {
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "lock-identity", 
          sessionId, 
          data: { chosenIndex: selectedImage } 
        }),
      });
      setStep(3);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to lock";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true);
    
    const finalDescription = description.trim() || `A ${ARCHETYPES[archetype!].name.toLowerCase()} persona named ${name}`;
    
    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 800));
      onComplete({
        id: personaId,
        name,
        description: finalDescription,
        archetype: archetype!,
        traits,
        imageUrl: images[selectedImage!],
      });
      setLoading(false);
      return;
    }
    
    try {
      // Configure mind
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "configure-mind", 
          sessionId, 
          data: { traits, communicationStyle: "friendly" } 
        }),
      });
      
      // Finalize
      await fetch(`/api/personas/${personaId}/wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", sessionId }),
      });
      
      onComplete({
        id: personaId,
        name,
        description: finalDescription,
        archetype: archetype!,
        traits,
        imageUrl: images[selectedImage!],
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to finalize";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const proceed = () => {
    if (step === 0) handleStep0Complete();
    else if (step === 1) handleGenerateImages();
    else if (step === 2) handleLockImage();
    else if (step === 3) handleFinalize();
  };

  const goBack = () => {
    if (step === 0) onCancel();
    else setStep(step - 1);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top bar - minimal */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 40px",
        flexShrink: 0,
      }}>
        <motion.button
          whileHover={{ opacity: 0.7 }}
          onClick={goBack}
          style={{
            background: "none",
            border: "none",
            color: c.silver,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {step === 0 ? "Cancel" : "Back"}
        </motion.button>
        
        <ProgressDots current={step} total={4} />
        
        <div style={{ width: 80 }} /> {/* Spacer for balance */}
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "absolute",
              top: 80,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,60,60,0.1)",
              border: "1px solid rgba(255,60,60,0.3)",
              borderRadius: 12,
              padding: "12px 24px",
              color: "#ff6060",
              fontSize: 14,
              zIndex: 100,
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area - full screen */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 40px 120px",
        overflow: "auto",
      }}>
        <AnimatePresence mode="wait">
          {/* STEP 0: Identity */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 60px",
                textAlign: "center",
              }}>
                Who are you creating?
              </h2>
              
              {/* Name input */}
              <div style={{ width: "100%", marginBottom: 40, position: "relative" }}>
                <FloatingLabel visible={name.length > 0}>Name</FloatingLabel>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${c.steel}`,
                    padding: "16px 0",
                    fontSize: 24,
                    fontWeight: 300,
                    color: c.white,
                    outline: "none",
                    transition: "border-color 0.3s ease",
                  }}
                  onFocus={(e) => e.target.style.borderColor = c.white}
                  onBlur={(e) => e.target.style.borderColor = c.steel}
                />
              </div>
              
              {/* Description (optional) */}
              <div style={{ width: "100%", marginBottom: 48, position: "relative" }}>
                <FloatingLabel visible={description.length > 0}>Description</FloatingLabel>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe their personality (optional)"
                  rows={2}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${c.steel}`,
                    padding: "16px 0",
                    fontSize: 18,
                    fontWeight: 300,
                    color: c.white,
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
              </div>
              
              {/* Archetype selection */}
              <p style={{
                fontSize: 14,
                color: c.silver,
                marginBottom: 24,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}>
                Choose an archetype
              </p>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                width: "100%",
              }}>
                {(Object.keys(ARCHETYPES) as Archetype[]).map((key) => {
                  const selected = archetype === key;
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setArchetype(key)}
                      style={{
                        background: selected ? c.white : "transparent",
                        color: selected ? c.void : c.pearl,
                        border: `1px solid ${selected ? c.white : c.steel}`,
                        borderRadius: 12,
                        padding: "16px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {ARCHETYPES[key].name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 1: Style */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 60px",
                textAlign: "center",
              }}>
                Choose a visual style
              </h2>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                width: "100%",
              }}>
                {STYLES.map((s) => {
                  const selected = style === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStyle(s.id)}
                      style={{
                        background: selected ? c.white : c.graphite,
                        color: selected ? c.void : c.white,
                        border: `1px solid ${selected ? c.white : c.border}`,
                        borderRadius: 16,
                        padding: "32px 24px",
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {s.name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Image Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 16px",
                textAlign: "center",
              }}>
                {name}
              </h2>
              
              <p style={{
                fontSize: 16,
                color: c.silver,
                marginBottom: 48,
              }}>
                Select an appearance
              </p>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
                width: "100%",
                maxWidth: 400,
              }}>
                {images.map((url, i) => {
                  const selected = selectedImage === i;
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedImage(i)}
                      style={{
                        aspectRatio: "1",
                        background: c.graphite,
                        border: `3px solid ${selected ? c.white : "transparent"}`,
                        borderRadius: 20,
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        position: "relative",
                      }}
                    >
                      {url ? (
                        <img 
                          src={url} 
                          alt={`Option ${i + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: c.steel,
                          fontSize: 48,
                          fontWeight: 200,
                        }}>
                          {name[0]}
                        </div>
                      )}
                      
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: c.white,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.void} strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              <motion.button
                whileHover={{ opacity: 0.7 }}
                onClick={handleGenerateImages}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: c.silver,
                  fontSize: 14,
                  marginTop: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Regenerate
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: Personality */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: ease.out }}
              style={{
                width: "100%",
                maxWidth: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <h2 style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 300,
                color: c.white,
                margin: "0 0 16px",
                textAlign: "center",
              }}>
                Define {name}&apos;s personality
              </h2>
              
              <p style={{
                fontSize: 16,
                color: c.silver,
                marginBottom: 48,
              }}>
                Select 2-4 traits
              </p>
              
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
              }}>
                {TRAITS.map((trait) => {
                  const selected = traits.includes(trait);
                  return (
                    <motion.button
                      key={trait}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (selected) {
                          setTraits(traits.filter(t => t !== trait));
                        } else if (traits.length < 4) {
                          setTraits([...traits, trait]);
                        }
                      }}
                      style={{
                        background: selected ? c.white : "transparent",
                        color: selected ? c.void : c.pearl,
                        border: `1px solid ${selected ? c.white : c.steel}`,
                        borderRadius: 99,
                        padding: "12px 24px",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {trait}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "24px 40px 40px",
        display: "flex",
        justifyContent: "center",
        background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
      }}>
        <motion.button
          whileHover={{ scale: canProceed && !loading ? 1.02 : 1 }}
          whileTap={{ scale: canProceed && !loading ? 0.98 : 1 }}
          onClick={proceed}
          disabled={!canProceed || loading}
          style={{
            background: canProceed ? c.white : c.steel,
            color: canProceed ? c.void : c.silver,
            border: "none",
            padding: "18px 60px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 99,
            cursor: canProceed && !loading ? "pointer" : "default",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.3s ease",
          }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block", width: 16, height: 16 }}
              >
                ◐
              </motion.span>
              Processing...
            </span>
          ) : step === 3 ? "Awaken" : "Continue"}
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA VIEW — Engage with your creation
// ═══════════════════════════════════════════════════════════════════════════════

function PersonaView({ 
  persona, 
  onBack 
}: { 
  persona: Persona; 
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Hello. I am ${persona.name}. How may I assist you?`
    }]);
  }, [persona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMessage }]);
    setTyping(true);
    
    try {
      const res = await fetch(`/api/personas/${persona.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages(m => [...m, { 
        role: "assistant", 
        content: data.response || "I understand. Let me think about that." 
      }]);
    } catch {
      setMessages(m => [...m, { 
        role: "assistant", 
        content: "I apologize, I'm having trouble responding." 
      }]);
    }
    
    setTyping(false);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 24px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <motion.button
          whileHover={{ opacity: 0.7 }}
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: c.silver,
            padding: 8,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>
        
        {/* Avatar */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: c.graphite,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {persona.imageUrl ? (
            <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, color: c.steel }}>{persona.name[0]}</span>
          )}
        </div>
        
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: c.white }}>
            {persona.name}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: c.silver }}>
            {ARCHETYPES[persona.archetype]?.name}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: 24,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 16,
              }}
            >
              <div style={{
                maxWidth: "75%",
                padding: "14px 20px",
                borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                background: m.role === "user" ? c.white : c.graphite,
                color: m.role === "user" ? c.void : c.white,
              }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{m.content}</p>
              </div>
            </motion.div>
          ))}
          
          {typing && (
            <div style={{ display: "flex", marginBottom: 16 }}>
              <div style={{
                padding: "14px 20px",
                borderRadius: "20px 20px 20px 4px",
                background: c.graphite,
                display: "flex",
                gap: 6,
              }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.silver,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 24px 32px",
        borderTop: `1px solid ${c.border}`,
      }}>
        <div style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          gap: 12,
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${persona.name}...`}
            style={{
              flex: 1,
              background: c.graphite,
              border: `1px solid ${c.border}`,
              borderRadius: 99,
              padding: "14px 24px",
              fontSize: 15,
              color: c.white,
              outline: "none",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={send}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? c.white : c.graphite,
              border: "none",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() ? "pointer" : "default",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={input.trim() ? c.void : c.steel}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STUDIO — Create videos with your persona
// ═══════════════════════════════════════════════════════════════════════════════

function VideoStudio({ 
  persona, 
  onBack 
}: { 
  persona: Persona; 
  onBack: () => void;
}) {
  const [script, setScript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  const generate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    
    // Simulate video generation
    await new Promise(r => setTimeout(r, 3000));
    
    setVideoReady(true);
    setGenerating(false);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: c.void,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 24px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <motion.button
          whileHover={{ opacity: 0.7 }}
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: c.silver,
            padding: 8,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </motion.button>
        
        <div style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: c.graphite,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {persona.imageUrl ? (
            <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 18, color: c.steel }}>{persona.name[0]}</span>
          )}
        </div>
        
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: c.white }}>
            Video Studio
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: c.silver }}>
            {persona.name}
          </p>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        background: c.border,
      }}>
        {/* Script panel */}
        <div style={{
          background: c.void,
          padding: 32,
          display: "flex",
          flexDirection: "column",
        }}>
          <label style={{
            fontSize: 12,
            fontWeight: 500,
            color: c.silver,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Script
          </label>
          
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write what you want your persona to say..."
            style={{
              flex: 1,
              background: c.graphite,
              border: `1px solid ${c.border}`,
              borderRadius: 16,
              padding: 24,
              fontSize: 16,
              lineHeight: 1.7,
              color: c.white,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generate}
              disabled={!script.trim() || generating}
              style={{
                flex: 1,
                background: script.trim() && !generating ? c.white : c.steel,
                color: script.trim() && !generating ? c.void : c.silver,
                border: "none",
                borderRadius: 99,
                padding: "16px 32px",
                fontSize: 15,
                fontWeight: 600,
                cursor: script.trim() && !generating ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ◐
                  </motion.span>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                  </svg>
                  Generate Video
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Preview panel */}
        <div style={{
          background: c.ink,
          padding: 32,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: c.silver,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              Preview
            </label>
            {videoReady && (
              <span style={{ fontSize: 12, color: c.silver }}>
                0:15 • 1080p
              </span>
            )}
          </div>
          
          {/* Video preview area */}
          <div style={{
            flex: 1,
            background: c.graphite,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            {generating ? (
              <div style={{ textAlign: "center" }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ fontSize: 32, marginBottom: 16 }}
                >
                  ◐
                </motion.div>
                <p style={{ color: c.silver, fontSize: 14 }}>Creating your video...</p>
              </div>
            ) : videoReady ? (
              <>
                {/* Video preview with persona */}
                <div style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: c.steel,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {persona.imageUrl ? (
                    <img src={persona.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 72, fontWeight: 200, color: c.mist }}>
                      {persona.name[0]}
                    </span>
                  )}
                </div>
                
                {/* Play button overlay */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPlaying(!playing)}
                  style={{
                    position: "absolute",
                    bottom: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: c.white,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {playing ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={c.void}>
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={c.void}>
                      <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
                    </svg>
                  )}
                </motion.button>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c.steel} strokeWidth="1.5">
                  <rect x="2" y="5" width="14" height="14" rx="2" />
                  <path d="M16 9l6-3v12l-6-3" />
                </svg>
                <p style={{ color: c.silver, fontSize: 14, marginTop: 16 }}>
                  Write a script to generate a video
                </p>
              </div>
            )}
          </div>
          
          {/* Download button */}
          {videoReady && (
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  background: c.white,
                  color: c.void,
                  border: "none",
                  borderRadius: 99,
                  padding: "16px 32px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setVideoReady(false); setScript(""); }}
                style={{
                  background: c.graphite,
                  color: c.white,
                  border: `1px solid ${c.border}`,
                  borderRadius: 99,
                  padding: "16px 24px",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                New
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function PersonaForgePage() {
  const [view, setView] = useState<View>("home");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Persona | null>(null);
  const [newPersona, setNewPersona] = useState<Persona | null>(null);

  useEffect(() => {
    fetch("/api/personas")
      .then(res => res.json())
      .then(data => {
        if (data.personas) setPersonas(data.personas);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = (p: Persona) => {
    setNewPersona(p);
    setView("awakening");
  };

  const handleAwakeningComplete = () => {
    if (newPersona) {
      setPersonas([newPersona, ...personas]);
      setSelected(newPersona);
      setNewPersona(null);
    }
    setView("home");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: c.void,
      color: c.white,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <AnimatePresence mode="wait">
        {view === "awakening" && newPersona && (
          <AwakeningScene
            key="awakening"
            persona={newPersona}
            onComplete={handleAwakeningComplete}
            onSkip={handleAwakeningComplete}
          />
        )}
        
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomeView
              personas={personas}
              loading={loading}
              onNew={() => setView("create")}
              onSelect={(p) => { setSelected(p); setView("persona"); }}
              onVideo={(p) => { setSelected(p); setView("video"); }}
              onChat={(p) => { setSelected(p); setView("persona"); }}
            />
          </motion.div>
        )}
        
        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CreateFlow
              onComplete={handleCreate}
              onCancel={() => setView("home")}
            />
          </motion.div>
        )}
        
        {view === "video" && selected && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VideoStudio
              persona={selected}
              onBack={() => setView("home")}
            />
          </motion.div>
        )}
        
        {view === "persona" && selected && (
          <motion.div
            key="persona"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PersonaView
              persona={selected}
              onBack={() => setView("home")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}