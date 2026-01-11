"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONA VIEWER - TWO MODES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * MODE 1: LIVE CHAT (default)
 * - Fast, realtime conversation
 * - Audio playback with static image
 * - < 3 seconds latency
 * - Endpoint: /api/personas/[id]/live-chat
 *
 * MODE 2: MAKE VIDEO
 * - Cinematic, lip-synced video
 * - Full RunPod rendering
 * - 60-90 seconds latency
 * - Endpoint: /api/personas/[id]/make-video
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useCallback } from "react";

interface PersonaViewerProps {
  personaId: string;
  personaName: string;
  personaImageUrl?: string;
  mode?: "chat" | "video"; // Default: chat
  onClose?: () => void;
}

type Status = "idle" | "thinking" | "generating-video" | "speaking";

export function PersonaViewer({
  personaId,
  personaName,
  personaImageUrl,
  mode = "chat",
  onClose,
}: PersonaViewerProps) {
  const [currentMode, setCurrentMode] = useState<"chat" | "video">(mode);
  const [status, setStatus] = useState<Status>("idle");
  const [input, setInput] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Send message - routes to correct endpoint based on mode
  const sendMessage = useCallback(async () => {
    if (!input.trim() || status !== "idle") return;

    const message = input.trim();
    setInput("");
    setError(null);
    setLatency(null);
    setCurrentText("");

    // Different flow for each mode
    if (currentMode === "chat") {
      await handleLiveChat(message);
    } else {
      await handleMakeVideo(message);
    }
  }, [input, status, currentMode, personaId]);

  // LIVE CHAT MODE - Fast, audio only
  const handleLiveChat = async (message: string) => {
    setStatus("thinking");
    const startTime = Date.now();

    try {
      console.log(`[PersonaViewer] LIVE CHAT: "${message}"`);

      const response = await fetch(`/api/personas/${personaId}/live-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Chat failed");
      }

      const data = await response.json();
      const totalLatency = Date.now() - startTime;

      console.log(`[PersonaViewer] Chat response in ${totalLatency}ms`);
      setCurrentText(data.text);
      setLatency(totalLatency);

      // Play audio
      if (data.audioUrl && audioRef.current) {
        setStatus("speaking");
        audioRef.current.src = data.audioUrl;
        try {
          await audioRef.current.play();
          console.log(`[PersonaViewer] Audio playing`);
        } catch (e) {
          console.error(`[PersonaViewer] Audio play failed:`, e);
          setStatus("idle");
        }
      } else {
        setStatus("idle");
      }

    } catch (err: any) {
      console.error(`[PersonaViewer] Chat error:`, err);
      setError(err.message);
      setStatus("idle");
    }
  };

  // MAKE VIDEO MODE - Slow, full video
  const handleMakeVideo = async (message: string) => {
    setStatus("generating-video");
    const startTime = Date.now();

    try {
      console.log(`[PersonaViewer] MAKE VIDEO: "${message}"`);

      const response = await fetch(`/api/personas/${personaId}/make-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          quality: "standard",
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Video generation failed");
      }

      const data = await response.json();
      const totalLatency = Date.now() - startTime;

      console.log(`[PersonaViewer] Video generated in ${totalLatency}ms`);
      setCurrentText(data.text);
      setLatency(totalLatency);

      // Play video
      if (data.videoUrl && videoRef.current) {
        setStatus("speaking");
        videoRef.current.src = data.videoUrl;
        videoRef.current.load();

        try {
          await videoRef.current.play();
          console.log(`[PersonaViewer] Video playing`);
        } catch (playError) {
          console.error(`[PersonaViewer] Video play failed:`, playError);
          // Fallback to audio
          if (data.audioUrl && audioRef.current) {
            audioRef.current.src = data.audioUrl;
            await audioRef.current.play();
          }
        }
      } else if (data.audioUrl && audioRef.current) {
        // Fallback to audio if no video
        setStatus("speaking");
        audioRef.current.src = data.audioUrl;
        await audioRef.current.play();
      } else {
        setStatus("idle");
      }

    } catch (err: any) {
      console.error(`[PersonaViewer] Video error:`, err);
      setError(err.message);
      setStatus("idle");
    }
  };

  // Handle media end
  const handleMediaEnded = useCallback(() => {
    setStatus("idle");
  }, []);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Status styling
  const statusColor =
    status === "speaking" ? "#22c55e" :
    status === "generating-video" ? "#f59e0b" :
    status === "thinking" ? "#8b5cf6" : "#71717a";

  const statusText =
    status === "speaking" ? "Speaking" :
    status === "generating-video" ? `Generating video... (${Math.round((latency || 0) / 1000)}s)` :
    status === "thinking" ? "Thinking..." : "Ready";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: "#000",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header with mode switcher */}
      <div style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        gap: 8,
        padding: 4,
        background: "rgba(0,0,0,0.7)",
        borderRadius: 24,
      }}>
        <button
          onClick={() => setCurrentMode("chat")}
          disabled={status !== "idle"}
          style={{
            padding: "8px 20px",
            background: currentMode === "chat" ? "#3b82f6" : "transparent",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            cursor: status === "idle" ? "pointer" : "not-allowed",
            opacity: status !== "idle" ? 0.5 : 1,
          }}
        >
          💬 Chat (Fast)
        </button>
        <button
          onClick={() => setCurrentMode("video")}
          disabled={status !== "idle"}
          style={{
            padding: "8px 20px",
            background: currentMode === "video" ? "#3b82f6" : "transparent",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            cursor: status === "idle" ? "pointer" : "not-allowed",
            opacity: status !== "idle" ? 0.5 : 1,
          }}
        >
          🎬 Video (Cinematic)
        </button>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 100,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ✕
        </button>
      )}

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Video element (only shown in video mode when speaking) */}
        <video
          ref={videoRef}
          onEnded={handleMediaEnded}
          onError={(e) => console.error("[PersonaViewer] Video error:", e)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: currentMode === "video" && status === "speaking" ? "block" : "none",
          }}
          playsInline
        />

        {/* Audio element (for chat mode) */}
        <audio
          ref={audioRef}
          onEnded={handleMediaEnded}
          style={{ display: "none" }}
        />

        {/* Static persona image (shown when not playing video) */}
        {!(currentMode === "video" && status === "speaking") && personaImageUrl && (
          <div style={{
            position: "relative",
            maxWidth: "80%",
            maxHeight: "80%",
          }}>
            <img
              src={personaImageUrl}
              alt={personaName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 16,
                opacity: status === "speaking" ? 0.9 : 1,
                filter: status === "speaking" ? "brightness(1.1)" : "none",
                transition: "all 0.3s ease",
              }}
            />
            {/* Speaking indicator overlay */}
            {status === "speaking" && currentMode === "chat" && (
              <div style={{
                position: "absolute",
                bottom: -20,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "4px 12px",
                background: "#22c55e",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
              }}>
                🔊 Speaking
              </div>
            )}
          </div>
        )}

        {/* Status indicator */}
        <div style={{
          position: "absolute",
          bottom: 120,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          background: "rgba(0,0,0,0.8)",
          borderRadius: 24,
          border: `2px solid ${statusColor}`,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: statusColor,
            animation: status !== "idle" ? "pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
            {statusText}
          </span>
          {latency && status === "idle" && (
            <span style={{ color: "#71717a", fontSize: 12, marginLeft: 8 }}>
              ({Math.round(latency / 1000)}s)
            </span>
          )}
        </div>

        {/* Current response text */}
        {currentText && (
          <div style={{
            position: "absolute",
            bottom: 180,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "80%",
            padding: "16px 24px",
            background: "rgba(0,0,0,0.9)",
            borderRadius: 16,
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <p style={{ color: "#fff", fontSize: 16, margin: 0, lineHeight: 1.6 }}>
              "{currentText}"
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "80%",
            padding: "12px 20px",
            background: "rgba(239, 68, 68, 0.95)",
            borderRadius: 12,
            border: "2px solid #dc2626",
          }}>
            <p style={{ color: "#fff", fontSize: 14, margin: 0, fontWeight: 500 }}>
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Mode explanation */}
        {status === "idle" && !currentText && (
          <div style={{
            position: "absolute",
            bottom: 180,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 20px",
            background: "rgba(0,0,0,0.6)",
            borderRadius: 12,
            textAlign: "center",
          }}>
            <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>
              {currentMode === "chat"
                ? "💬 Fast conversation mode - instant audio responses"
                : "🎬 Cinematic mode - full lip-synced video (60-90s)"}
            </p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: 24,
        background: "rgba(0,0,0,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          maxWidth: 800,
          margin: "0 auto",
        }}>
          {/* Persona name */}
          <div style={{
            marginBottom: 12,
            textAlign: "center",
          }}>
            <span style={{
              color: "#a1a1aa",
              fontSize: 14,
              fontWeight: 500,
            }}>
              {personaName}
            </span>
          </div>

          {/* Input row */}
          <div style={{
            display: "flex",
            gap: 12,
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentMode === "chat"
                ? `Chat with ${personaName}...`
                : `Create video with ${personaName}...`}
              disabled={status !== "idle"}
              style={{
                flex: 1,
                padding: "16px 20px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                color: "#fff",
                fontSize: 16,
                outline: "none",
                opacity: status !== "idle" ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || status !== "idle"}
              style={{
                padding: "16px 32px",
                background: status !== "idle" ? "rgba(59, 130, 246, 0.3)" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: status !== "idle" ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {currentMode === "chat" ? "Send" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* Pulsing animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default PersonaViewer;
