"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * P E R S O N A F O R G E  v2
 * Refined Edition — Snappy • Bold • Clean
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  black: "#000",
  dark: "#0a0a0a",
  gray1: "#141414",
  gray2: "#1e1e1e",
  gray3: "#333",
  gray4: "#666",
  gray5: "#999",
  light: "#ccc",
  white: "#fff",
  border: "rgba(255,255,255,0.1)",
  borderHover: "rgba(255,255,255,0.2)",
  glass: "rgba(255,255,255,0.04)",
};

const FAST = { duration: 0.15, ease: [0.4, 0, 0.2, 1] } as const;
const SPRING = { type: "spring" as const, stiffness: 500, damping: 30 };

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Archetype = "sage" | "hero" | "creator" | "caregiver" | "ruler" | "jester" | "rebel" | "lover" | "explorer" | "innocent" | "magician" | "outlaw";
type ViewType = "gallery" | "create" | "studio" | "chat";
type StylePreset = "pixar_3d" | "hyper_realistic" | "anime_premium" | "fantasy_epic" | "arcane_stylized" | "corporate_professional";

interface Persona {
  id: string;
  name: string;
  description?: string;
  archetype: Archetype;
  traits: string[];
  imageUrl?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPES: Record<Archetype, { label: string; icon: string }> = {
  sage: { label: "Sage", icon: "◈" },
  hero: { label: "Hero", icon: "◆" },
  creator: { label: "Creator", icon: "✦" },
  caregiver: { label: "Caregiver", icon: "♥" },
  ruler: { label: "Ruler", icon: "♔" },
  jester: { label: "Jester", icon: "✧" },
  rebel: { label: "Rebel", icon: "⚡" },
  lover: { label: "Lover", icon: "❤" },
  explorer: { label: "Explorer", icon: "◎" },
  innocent: { label: "Innocent", icon: "○" },
  magician: { label: "Magician", icon: "★" },
  outlaw: { label: "Outlaw", icon: "✖" },
};

const STYLES: { id: StylePreset; label: string }[] = [
  { id: "pixar_3d", label: "Pixar 3D" },
  { id: "hyper_realistic", label: "Photorealistic" },
  { id: "anime_premium", label: "Anime" },
  { id: "fantasy_epic", label: "Fantasy" },
  { id: "arcane_stylized", label: "Arcane" },
  { id: "corporate_professional", label: "Professional" },
];

const VOICES = [
  { id: "v1", name: "Atlas", desc: "Deep & powerful" },
  { id: "v2", name: "Nova", desc: "Warm & smooth" },
  { id: "v3", name: "Echo", desc: "Calm & clear" },
  { id: "v4", name: "Bolt", desc: "Bold & dynamic" },
];

const TRAITS = ["Commanding", "Wise", "Elegant", "Mysterious", "Playful", "Calm", "Fierce", "Nurturing", "Creative", "Analytical", "Empathetic", "Bold"];

// ═══════════════════════════════════════════════════════════════════════════════
// BOLD SVG ICONS — Larger, cleaner, more impactful
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  ArrowLeft: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  X: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Plus: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Play: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
    </svg>
  ),
  Pause: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  Video: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 9l6-3v12l-6-3" />
    </svg>
  ),
  MessageCircle: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  Phone: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  Mic: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0014 0v-1M12 18v4M8 22h8" />
    </svg>
  ),
  Send: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),
  Sparkles: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  ),
  Download: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
  RefreshCw: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  Check: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Volume2: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  ),
  User: ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21v-2a7 7 0 0114 0v2" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// BASE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function IconBtn({ children, onClick, variant = "ghost", size = 40, disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "ghost" | "solid" | "outline"; size?: number; disabled?: boolean }) {
  const [h, setH] = useState(false);
  const base: CSSProperties = { width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.3 : 1, transition: "all 0.15s ease" };
  const styles: Record<string, CSSProperties> = {
    ghost: { ...base, background: h ? "rgba(255,255,255,0.1)" : "transparent", color: C.light },
    solid: { ...base, background: h ? C.light : C.white, color: C.black },
    outline: { ...base, background: h ? "rgba(255,255,255,0.08)" : "transparent", border: `1.5px solid ${h ? C.borderHover : C.border}`, color: C.light },
  };
  return <motion.button whileTap={{ scale: 0.92 }} transition={SPRING} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} disabled={disabled} style={styles[variant]}>{children}</motion.button>;
}

function Btn({ children, onClick, variant = "primary", icon, disabled = false, full = false }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; icon?: React.ReactNode; disabled?: boolean; full?: boolean }) {
  const [h, setH] = useState(false);
  const base: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 500, border: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, transition: "all 0.15s ease", width: full ? "100%" : "auto" };
  const styles: Record<string, CSSProperties> = {
    primary: { ...base, background: h && !disabled ? C.light : C.white, color: C.black },
    secondary: { ...base, background: h ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${C.border}`, color: C.white },
    ghost: { ...base, background: h ? "rgba(255,255,255,0.08)" : "transparent", color: C.light },
  };
  return <motion.button whileTap={{ scale: 0.97 }} transition={SPRING} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} disabled={disabled} style={styles[variant]}>{icon}{children}</motion.button>;
}

function Spinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 40 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: 32, height: 32, border: `2px solid ${C.gray3}`, borderTopColor: C.white, borderRadius: "50%" }} />
      <span style={{ fontSize: 12, color: C.gray5, letterSpacing: 2, textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA CARD — Compact & Clean
// ═══════════════════════════════════════════════════════════════════════════════

function PersonaCard({ persona, onVideo, onChat }: { persona: Persona; onVideo: () => void; onChat: () => void }) {
  const [h, setH] = useState(false);
  const arch = ARCHETYPES[persona.archetype];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={SPRING}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: C.dark,
        border: `1px solid ${h ? C.borderHover : C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", aspectRatio: "1", background: `linear-gradient(135deg, ${C.gray1} 0%, ${C.gray2} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.glass, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 24 }}>{arch.icon}</span>
          <span style={{ fontSize: 28, fontWeight: 300, color: C.white }}>{persona.name[0]}</span>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8) 100%)" }} />
        
        {/* Badge */}
        <motion.div
          initial={false}
          animate={{ opacity: h ? 1 : 0, y: h ? 0 : 8 }}
          transition={FAST}
          style={{ position: "absolute", top: 12, right: 12, padding: "6px 12px", borderRadius: 99, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: `1px solid ${C.border}`, fontSize: 11, fontWeight: 500, color: C.light, letterSpacing: 0.5 }}
        >
          {arch.icon} {arch.label}
        </motion.div>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 500, color: C.white, margin: 0 }}>{persona.name}</h3>
        {persona.description && <p style={{ fontSize: 12, color: C.gray5, margin: "6px 0 0", lineHeight: 1.4 }}>{persona.description.length > 60 ? persona.description.slice(0, 60) + "..." : persona.description}</p>}
        
        {persona.traits.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {persona.traits.slice(0, 3).map(t => (
              <span key={t} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, color: C.gray5, background: C.glass, border: `1px solid ${C.border}` }}>{t}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="primary" icon={<Icons.Video size={16} />} onClick={() => { onVideo(); }}>Video</Btn>
          <IconBtn variant="outline" onClick={onChat}><Icons.MessageCircle size={18} /></IconBtn>
          <IconBtn variant="outline"><Icons.Phone size={18} /></IconBtn>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

function VideoStudio({ persona, onBack }: { persona: Persona; onBack: () => void }) {
  const [script, setScript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [video, setVideo] = useState(false);

  const generate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    await new Promise<void>(r => setTimeout(r, 2000));
    setVideo(true);
    setGenerating(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.black }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <IconBtn onClick={onBack}><Icons.ArrowLeft size={20} /></IconBtn>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 500, color: C.white }}>{persona.name[0]}</div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 500, color: C.white, margin: 0 }}>{persona.name}</h1>
            <p style={{ fontSize: 12, color: C.gray5, margin: 0 }}>Video Studio</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ display: "flex", height: "calc(100vh - 77px)" }}>
        {/* Script */}
        <div style={{ flex: 1, padding: 32, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.gray5 }}>Script</span>
            <span style={{ fontSize: 12, color: C.gray5 }}>{script.length}</span>
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Write what your persona should say..."
            style={{ flex: 1, padding: 20, borderRadius: 12, background: C.white, color: C.black, fontSize: 15, lineHeight: 1.7, border: "none", outline: "none", resize: "none", fontFamily: "inherit" }}
          />
          
          {/* Voice */}
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: C.glass, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Volume2 size={18} /></div>
              <div><p style={{ fontSize: 13, fontWeight: 500, color: C.white, margin: 0 }}>Voice</p><p style={{ fontSize: 11, color: C.gray5, margin: 0 }}>Atlas — Deep & powerful</p></div>
            </div>
            <Btn variant="secondary" icon={<Icons.Play size={12} />}>Preview</Btn>
          </div>

          <div style={{ marginTop: 20 }}>
            <Btn variant="primary" icon={<Icons.Sparkles size={16} />} onClick={generate} disabled={!script.trim() || generating} full>{generating ? "Generating..." : "Generate Video"}</Btn>
          </div>
        </div>

        {/* Preview */}
        <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.gray5 }}>Preview</span>
            {video && <span style={{ fontSize: 12, color: C.gray5 }}>0:15 • 1080p</span>}
          </div>
          
          <div style={{ flex: 1, borderRadius: 16, background: C.dark, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {generating ? <Spinner text="Creating video..." /> : video ? (
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 300, color: C.white }}>{persona.name[0]}</div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Icons.Video size={24} /></div>
                <p style={{ fontSize: 13, color: C.gray5 }}>Write a script to generate</p>
              </div>
            )}
          </div>

          {video && (
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <Btn variant="primary" icon={<Icons.Download size={16} />} full>Download</Btn>
              <Btn variant="secondary" icon={<Icons.RefreshCw size={16} />}>Redo</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

function CreateWizard({ onComplete, onCancel }: { onComplete: (p: Persona) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [visualStyle, setVisualStyle] = useState<StylePreset>("hyper_realistic");
  const [voice, setVoice] = useState<string | null>(null);
  const [traits, setTraits] = useState<string[]>([]);
  const [images, setImages] = useState<{ url: string; seed: number }[]>([]);
  const [selImg, setSelImg] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const canNext = [name && archetype, visualStyle, selImg !== null, voice, traits.length >= 2][step];

  const startWizard = async () => {
    setLoading(true); setError(null);
    try {
      const createRes = await fetch("/api/personas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, archetype, description: desc }) });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create persona");
      const newPersonaId = createData.persona.id; setPersonaId(newPersonaId);
      const startRes = await fetch(`/api/personas/${newPersonaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || "Failed to start wizard");
      setSessionId(startData.id);
      const sparkRes = await fetch(`/api/personas/${newPersonaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "spark", sessionId: startData.id, data: { name, description: desc, archetype } }) });
      if (!sparkRes.ok) throw new Error("Failed to process spark");
      setStep(1);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const generateImages = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/personas/${personaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate-variations", sessionId, data: { stylePreset: visualStyle, count: 4 } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate images");
      setImages(data.variations.map((v: any) => ({ url: v.imageUrl, seed: v.seed })));
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const lockIdentity = async () => {
    if (!personaId || !sessionId || selImg === null) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/personas/${personaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock-identity", sessionId, data: { chosenIndex: selImg } }) });
      if (!res.ok) throw new Error("Failed to lock identity");
      setStep(3);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const configureVoice = async () => {
    if (!personaId || !sessionId || !voice) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/personas/${personaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "configure-voice", sessionId, data: { presetId: voice, provider: "elevenlabs" } }) });
      if (!res.ok) throw new Error("Failed to configure voice");
      setStep(4);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const finalize = async () => {
    if (!personaId || !sessionId) return;
    setLoading(true); setError(null);
    try {
      const mindRes = await fetch(`/api/personas/${personaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "configure-mind", sessionId, data: { traits, communicationStyle: "friendly" } }) });
      if (!mindRes.ok) throw new Error("Failed to configure mind");
      const finalRes = await fetch(`/api/personas/${personaId}/wizard`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finalize", sessionId }) });
      if (!finalRes.ok) throw new Error("Failed to finalize");
      onComplete({ id: personaId, name, description: desc || undefined, archetype: archetype!, traits, imageUrl: images[selImg!]?.url });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const next = () => {
    if (step === 0) { startWizard(); return; }
    if (step === 1 && images.length === 0) { generateImages(); return; }
    if (step === 2) { lockIdentity(); return; }
    if (step === 3) { configureVoice(); return; }
    if (step === 4) { finalize(); return; }
  };

  const titles = ["Identity", "Style", "Appearance", "Voice", "Personality"];
  return (
    <div style={{ minHeight: "100vh", background: C.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={FAST}
        style={{ width: "100%", maxWidth: 480, background: C.dark, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconBtn onClick={step > 0 ? () => setStep(step - 1) : onCancel} size={36}>
              {step > 0 ? <Icons.ArrowLeft size={18} /> : <Icons.X size={18} />}
            </IconBtn>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 500, color: C.white, margin: 0 }}>{titles[step]}</h2>
              <p style={{ fontSize: 11, color: C.gray5, margin: 0 }}>Step {step + 1} of 5</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i <= step ? C.white : C.gray3 }} />)}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {error && <div style={{ padding: "12px 16px", marginBottom: 16, borderRadius: 8, background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff6b6b", fontSize: 13 }}>{error}</div>}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={FAST}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.gray5, marginBottom: 8 }}>Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Queen Medusa" style={{ width: "100%", padding: "14px 16px", borderRadius: 10, background: C.white, color: C.black, fontSize: 14, border: "none", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.gray5, marginBottom: 8 }}>Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                  <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your persona's background, personality, role..." rows={3} style={{ width: "100%", padding: "14px 16px", borderRadius: 10, background: C.white, color: C.black, fontSize: 14, border: "none", outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
                </div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.gray5, marginBottom: 8 }}>Archetype</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {(Object.keys(ARCHETYPES) as Archetype[]).map(k => (
                    <motion.button
                      key={k}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setArchetype(k)}
                      style={{ padding: "14px 8px", borderRadius: 10, background: archetype === k ? "rgba(255,255,255,0.15)" : C.glass, border: `1.5px solid ${archetype === k ? C.white : C.border}`, cursor: "pointer", transition: "all 0.15s ease" }}
                    >
                      <span style={{ display: "block", fontSize: 18, marginBottom: 4 }}>{ARCHETYPES[k].icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: archetype === k ? C.white : C.gray5 }}>{ARCHETYPES[k].label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={FAST}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {STYLES.map(s => (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setVisualStyle(s.id)}
                      style={{ padding: 20, borderRadius: 12, background: visualStyle === s.id ? "rgba(255,255,255,0.12)" : C.glass, border: `1.5px solid ${visualStyle === s.id ? C.white : C.border}`, cursor: "pointer", textAlign: "left", transition: "all 0.15s ease" }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.white }}>{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={FAST}>
                {loading ? <Spinner text="Generating..." /> : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 240, margin: "0 auto" }}>
                      {images.map((img, i) => (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelImg(i)}
                          style={{ position: "relative", aspectRatio: "1", borderRadius: 12, background: C.gray2, border: `2px solid ${selImg === i ? C.white : C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.15s ease" }}
                        >
                          {img.url ? <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : <span style={{ fontSize: 28, fontWeight: 300, color: C.gray5 }}>{name[0]}</span>}
                          {selImg === i && <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}><Icons.Check size={12} /></div>}
                        </motion.button>
                      ))}
                    </div>
                    <div style={{ textAlign: "center", marginTop: 16 }}>
                      <Btn variant="ghost" icon={<Icons.RefreshCw size={14} />} onClick={generateImages}>Regenerate</Btn>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={FAST}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {VOICES.map(v => (
                    <motion.button
                      key={v.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setVoice(v.id)}
                      style={{ padding: 16, borderRadius: 12, background: voice === v.id ? "rgba(255,255,255,0.12)" : C.glass, border: `1.5px solid ${voice === v.id ? C.white : C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s ease" }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: C.white, margin: 0 }}>{v.name}</p>
                        <p style={{ fontSize: 11, color: C.gray5, margin: 0 }}>{v.desc}</p>
                      </div>
                      <IconBtn variant="outline" size={32}><Icons.Play size={12} /></IconBtn>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={FAST}>
                <p style={{ fontSize: 12, color: C.gray5, textAlign: "center", marginBottom: 16 }}>Select 2–4 traits</p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  {TRAITS.map(t => {
                    const sel = traits.includes(t);
                    return (
                      <motion.button
                        key={t}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTraits(sel ? traits.filter(x => x !== t) : [...traits, t].slice(0, 4))}
                        style={{ padding: "10px 18px", borderRadius: 99, background: sel ? C.white : "transparent", color: sel ? C.black : C.light, border: `1.5px solid ${sel ? C.white : C.border}`, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease" }}
                      >
                        {t}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: "0 24px 24px" }}>
          <Btn variant="primary" onClick={next} disabled={!canNext || loading} full icon={step === 4 ? <Icons.Sparkles size={16} /> : undefined}>
            {step === 4 ? "Create Persona" : step === 1 && images.length === 0 ? "Generate Images" : "Continue"}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

function ChatView({ persona, onBack }: { persona: Persona; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const arch = ARCHETYPES[persona.archetype];

  useEffect(() => { setMessages([{ id: "1", role: "assistant", content: `Greetings. I am ${persona.name}. How may I assist you?` }]); }, [persona]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { id: Date.now().toString(), role: "user", content: input }]);
    setInput("");
    setTyping(true);
    await new Promise<void>(r => setTimeout(r, 1200));
    setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: "assistant", content: "I understand. Let me consider that thoughtfully." }]);
    setTyping(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.black, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
        <IconBtn onClick={onBack}><Icons.ArrowLeft size={20} /></IconBtn>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 500, color: C.white }}>{persona.name[0]}</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: C.white, margin: 0 }}>{persona.name}</h2>
          <p style={{ fontSize: 11, color: C.gray5, margin: 0, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />Online</p>
        </div>
        <IconBtn variant="outline"><Icons.Video size={18} /></IconBtn>
        <IconBtn variant="outline"><Icons.Phone size={18} /></IconBtn>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map(m => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={FAST} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, fontSize: 14 }}>{arch.icon}</div>}
              <div style={{ maxWidth: "75%", padding: "12px 18px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? C.white : C.gray2, color: m.role === "user" ? C.black : C.light }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{m.content}</p>
              </div>
            </motion.div>
          ))}
          {typing && (
            <div style={{ display: "flex" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.gray2, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, fontSize: 14 }}>{arch.icon}</div>
              <div style={{ padding: "12px 18px", borderRadius: "18px 18px 18px 4px", background: C.gray2, display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: C.gray5 }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <IconBtn variant="outline"><Icons.Mic size={18} /></IconBtn>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={`Message ${persona.name}...`}
            style={{ flex: 1, padding: "14px 20px", borderRadius: 99, background: C.white, color: C.black, fontSize: 14, border: "none", outline: "none" }}
          />
          <IconBtn variant={input.trim() ? "solid" : "outline"} onClick={send} disabled={!input.trim()}><Icons.Send size={18} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PersonaForgePage() {
  const [view, setView] = useState<ViewType>("gallery");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch personas from API on mount
  useEffect(() => {
    fetch("/api/personas")
      .then(res => res.json())
      .then(data => {
        if (data.personas) setPersonas(data.personas);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch personas:", err);
        setLoading(false);
      });
  }, []);
  const [selected, setSelected] = useState<Persona | null>(null);

  const onCreate = (p: Persona) => { setPersonas([p, ...personas]); setSelected(p); setView("studio"); };

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <AnimatePresence mode="wait">
        {view === "gallery" && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST}>
            {/* Header */}
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.black, zIndex: 100 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>PersonaForge</h1>
                <p style={{ fontSize: 12, color: C.gray5, margin: 0 }}>{personas.length} personas</p>
              </div>
              <Btn variant="primary" icon={<Icons.Plus size={18} />} onClick={() => setView("create")}>New</Btn>
            </header>

            {/* Grid */}
            <div style={{ padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
                {personas.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...FAST, delay: i * 0.05 }}>
                    <PersonaCard persona={p} onVideo={() => { setSelected(p); setView("studio"); }} onChat={() => { setSelected(p); setView("chat"); }} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {view === "create" && <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST}><CreateWizard onComplete={onCreate} onCancel={() => setView("gallery")} /></motion.div>}
        {view === "studio" && selected && <motion.div key="studio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST}><VideoStudio persona={selected} onBack={() => setView("gallery")} /></motion.div>}
        {view === "chat" && selected && <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST}><ChatView persona={selected} onBack={() => setView("gallery")} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}