/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE ENGAGE STUDIO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The immersive live conversation interface. Features a cinematic split-view
 * with the animated persona on one side and the chat interface on the other.
 *
 * Features:
 * - Real-time 60fps animated avatar
 * - State-aware UI (idle, listening, thinking, speaking)
 * - Conversation history with styled messages
 * - Voice input and text input modes
 * - Emotion indicators and status display
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  animation,
  Button,
  Badge,
  Input,
  IconButton,
} from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type PersonaState = "idle" | "listening" | "thinking" | "speaking";
type EmotionState = "neutral" | "happy" | "sad" | "angry" | "surprised" | "excited" | "thoughtful" | "confident" | "curious" | "concerned" | "calm";

interface Message {
  id: string;
  role: "user" | "persona";
  content: string;
  timestamp: Date;
  emotion?: EmotionState;
}

interface Persona {
  id: string;
  name: string;
  tagline?: string;
  imageUrl?: string;
  archetype?: string;
}

interface EngageStudioProps {
  persona: Persona;
  onSendMessage?: (message: string) => Promise<string>;
  onBack?: () => void;
  AvatarComponent?: React.ComponentType<{
    imageUrl?: string;
    name: string;
    audioData?: Uint8Array;
    onReady?: () => void;
    onAudioEnd?: () => void;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  send: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  mic: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v4M8 23h8" strokeLinecap="round" />
    </svg>
  ),
  micOff: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <path d="M12 19v4M8 23h8" strokeLinecap="round" />
    </svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  expand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  keyboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const stateConfig: Record<PersonaState, { label: string; color: string; glow: string }> = {
  idle: { label: "Ready", color: colors.state.idle, glow: "transparent" },
  listening: { label: "Listening", color: colors.state.info, glow: colors.state.infoGlow },
  thinking: { label: "Thinking", color: colors.state.warning, glow: colors.state.warningGlow },
  speaking: { label: "Speaking", color: colors.state.success, glow: colors.state.successGlow },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGE STUDIO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function EngageStudio({ persona, onSendMessage, onBack, AvatarComponent }: EngageStudioProps) {
  const [state, setState] = useState<PersonaState>("idle");
  const [emotion, setEmotion] = useState<EmotionState>("neutral");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array | undefined>();
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || state !== "idle") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setState("thinking");

    try {
      // Simulate API call
      const response = await onSendMessage?.(userMessage.content);

      if (response) {
        setState("speaking");
        const personaMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "persona",
          content: response,
          timestamp: new Date(),
          emotion: "neutral",
        };
        setMessages((prev) => [...prev, personaMessage]);

        // Simulate speaking duration then return to idle
        setTimeout(() => {
          setState("idle");
        }, 3000);
      } else {
        setState("idle");
      }
    } catch (error) {
      setState("idle");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setState("thinking");
      // Would process recorded audio here
    } else {
      setIsRecording(true);
      setState("listening");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: isExpanded ? "column" : "row",
        background: colors.bg.deep,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* AVATAR PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        layout
        style={{
          flex: isExpanded ? "none" : 1,
          height: isExpanded ? "40vh" : "100%",
          minHeight: "300px",
          background: colors.bg.base,
          borderRight: isExpanded ? "none" : `1px solid ${colors.border.subtle}`,
          borderBottom: isExpanded ? `1px solid ${colors.border.subtle}` : "none",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: spacing[4],
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing[3] }}>
            <IconButton onClick={onBack}>{Icons.back}</IconButton>
            <div>
              <h2
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                {persona.name}
              </h2>
              <StatusIndicator state={state} />
            </div>
          </div>
          <div style={{ display: "flex", gap: spacing[2] }}>
            <IconButton onClick={() => setIsExpanded(!isExpanded)}>{Icons.expand}</IconButton>
            <IconButton>{Icons.settings}</IconButton>
          </div>
        </div>

        {/* Avatar Container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* State Glow Ring */}
          <motion.div
            animate={{
              boxShadow: `0 0 ${state === "idle" ? 0 : 60}px ${stateConfig[state].glow}`,
            }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              inset: spacing[8],
              borderRadius: radius.full,
              pointerEvents: "none",
            }}
          />

          {/* Avatar */}
          {AvatarComponent ? (
            <AvatarComponent
              imageUrl={persona.imageUrl}
              name={persona.name}
              audioData={audioData}
              onReady={() => console.log("Avatar ready")}
              onAudioEnd={() => {
                setState("idle");
                setAudioData(undefined);
              }}
            />
          ) : (
            <AvatarPlaceholder persona={persona} state={state} />
          )}

          {/* Emotion Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "absolute",
              bottom: spacing[6],
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <EmotionBadge emotion={emotion} />
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CHAT PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: "300px",
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: spacing[6],
            display: "flex",
            flexDirection: "column",
            gap: spacing[4],
          }}
        >
          {messages.length === 0 ? (
            <EmptyChat personaName={persona.name} />
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} personaName={persona.name} />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: spacing[4],
            borderTop: `1px solid ${colors.border.subtle}`,
            background: colors.bg.base,
          }}
        >
          {/* State Indicator Bar */}
          <AnimatePresence>
            {state !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  marginBottom: spacing[3],
                }}
              >
                <StateBar state={state} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Controls */}
          <div style={{ display: "flex", gap: spacing[3], alignItems: "center" }}>
            <IconButton
              onClick={toggleVoiceMode}
              style={{
                background: isVoiceMode ? colors.gold.glow : undefined,
                color: isVoiceMode ? colors.gold[400] : undefined,
              }}
            >
              {isVoiceMode ? Icons.keyboard : Icons.mic}
            </IconButton>

            {isVoiceMode ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={toggleRecording}
                style={{
                  flex: 1,
                  height: spacing[12],
                  borderRadius: radius.xl,
                  border: "none",
                  background: isRecording ? colors.state.error : colors.gold[400],
                  color: isRecording ? colors.text.primary : colors.bg.void,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing[2],
                }}
              >
                {isRecording ? (
                  <>
                    <PulsingDot />
                    Stop Recording
                  </>
                ) : (
                  <>
                    {Icons.mic}
                    Hold to Speak
                  </>
                )}
              </motion.button>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <Input
                    ref={inputRef}
                    placeholder={`Message ${persona.name}...`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={state !== "idle"}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || state !== "idle"}
                  icon={Icons.send}
                >
                  Send
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatusIndicator({ state }: { state: PersonaState }) {
  const config = stateConfig[state];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
      <motion.div
        animate={{
          scale: state === "idle" ? 1 : [1, 1.2, 1],
          opacity: state === "idle" ? 0.6 : 1,
        }}
        transition={{
          repeat: state === "idle" ? 0 : Infinity,
          duration: 1.5,
        }}
        style={{
          width: "8px",
          height: "8px",
          borderRadius: radius.full,
          background: config.color,
        }}
      />
      <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
        {config.label}
      </span>
    </div>
  );
}

function EmotionBadge({ emotion }: { emotion: EmotionState }) {
  const emotionEmojis: Record<EmotionState, string> = {
    neutral: "😐",
    happy: "😊",
    sad: "😢",
    angry: "😠",
    surprised: "😲",
    excited: "🤩",
    thoughtful: "🤔",
    confident: "😎",
    curious: "🧐",
    concerned: "😟",
    calm: "😌",
  };

  return (
    <motion.div
      key={emotion}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        padding: `${spacing[2]} ${spacing[4]}`,
        background: colors.bg.overlay,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.full,
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        gap: spacing[2],
      }}
    >
      <span>{emotionEmojis[emotion]}</span>
      <span
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          textTransform: "capitalize",
        }}
      >
        {emotion}
      </span>
    </motion.div>
  );
}

function AvatarPlaceholder({ persona, state }: { persona: Persona; state: PersonaState }) {
  return (
    <motion.div
      animate={{
        scale: state === "speaking" ? [1, 1.02, 1] : 1,
      }}
      transition={{
        repeat: state === "speaking" ? Infinity : 0,
        duration: 0.5,
      }}
      style={{
        width: "280px",
        height: "280px",
        borderRadius: radius.full,
        overflow: "hidden",
        border: `3px solid ${stateConfig[state].color}`,
        boxShadow: `0 0 30px ${stateConfig[state].glow}`,
      }}
    >
      {persona.imageUrl ? (
        <img
          src={persona.imageUrl}
          alt={persona.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: colors.bg.elevated,
            fontSize: typography.fontSize["5xl"],
            color: colors.text.muted,
          }}
        >
          {persona.name.charAt(0)}
        </div>
      )}
    </motion.div>
  );
}

function ChatMessage({ message, personaName }: { message: Message; personaName: string }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: spacing[1],
      }}
    >
      <span
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginLeft: isUser ? 0 : spacing[3],
          marginRight: isUser ? spacing[3] : 0,
        }}
      >
        {isUser ? "You" : personaName}
      </span>
      <div
        style={{
          maxWidth: "80%",
          padding: `${spacing[3]} ${spacing[4]}`,
          background: isUser ? colors.gold[400] : colors.bg.elevated,
          color: isUser ? colors.bg.void : colors.text.primary,
          borderRadius: radius.xl,
          borderTopRightRadius: isUser ? radius.sm : radius.xl,
          borderTopLeftRadius: isUser ? radius.xl : radius.sm,
          fontSize: typography.fontSize.base,
          lineHeight: typography.lineHeight.relaxed,
        }}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function EmptyChat({ personaName }: { personaName: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: spacing[8],
      }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        style={{ fontSize: "48px", marginBottom: spacing[4] }}
      >
        💬
      </motion.div>
      <h3
        style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          margin: 0,
          marginBottom: spacing[2],
        }}
      >
        Start a Conversation
      </h3>
      <p
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        Say hello to {personaName} and begin your dialogue
      </p>
    </div>
  );
}

function StateBar({ state }: { state: PersonaState }) {
  const config = stateConfig[state];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        padding: `${spacing[2]} ${spacing[3]}`,
        background: `${config.color}15`,
        borderRadius: radius.lg,
        border: `1px solid ${config.color}30`,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
        style={{
          width: "8px",
          height: "8px",
          borderRadius: radius.full,
          background: config.color,
        }}
      />
      <span style={{ fontSize: typography.fontSize.sm, color: config.color }}>{config.label}...</span>
      {state === "thinking" && <ThinkingDots />}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
          style={{
            width: "4px",
            height: "4px",
            borderRadius: radius.full,
            background: colors.state.warning,
          }}
        />
      ))}
    </div>
  );
}

function PulsingDot() {
  return (
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
      transition={{ repeat: Infinity, duration: 1 }}
      style={{
        width: "8px",
        height: "8px",
        borderRadius: radius.full,
        background: colors.text.primary,
      }}
    />
  );
}

export default EngageStudio;
