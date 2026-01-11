"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   P E R S O N A   C H A T   —   S T A T E - O F - T H E - A R T
 *
 *   Real-time conversation with living, breathing AI companions.
 *   Features:
 *   - Always-alive avatar (continuous idle animations)
 *   - Real-time lip-sync from audio (no video generation)
 *   - Sub-second response start
 *   - Voice input with streaming transcription
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  useAvatarStore,
  useStreamingTTS,
  useGenerate3D,
  parseLLMDirective,
  directiveToPerformance,
  cleanSpeechForTTS,
} from "@/lib/avatar";

// Dynamic import for avatar components (SSR disabled)
const LiveAvatar3D = dynamic(() => import("./LiveAvatar3D"), { ssr: false });
const AvatarStage = dynamic(() => import("./AvatarStage"), { ssr: false });

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE RECORDING HOOK
// ═══════════════════════════════════════════════════════════════════════════════

function useVoiceRecording(onTranscript: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        audioContextRef.current?.close();
        setAudioLevel(0);

        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            const personaId = window.location.pathname.split('/').pop() || '';
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(`/api/personas/${personaId}/transcribe`, {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text && data.text.trim()) {
                onTranscript(data.text.trim());
              }
            }
          } catch (error) {
            console.error('Transcription error:', error);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, isTranscribing, audioLevel, startRecording, stopRecording };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  void: "#000000",
  surface: "#0a0a0a",
  elevated: "#111115",
  graphite: "#18181b",
  border: "rgba(255, 255, 255, 0.06)",
  borderLight: "rgba(255, 255, 255, 0.12)",
  white: "#ffffff",
  silver: "#71717a",
  mist: "#a1a1aa",
  blue: "#3b82f6",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  timestamp: Date;
}

interface PersonaChatProps {
  personaId: string;
  personaName: string;
  personaImageUrl?: string;
  personaModelUrl?: string; // 3D model URL if available
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONA CHAT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PersonaChat({
  personaId,
  personaName,
  personaImageUrl,
  personaModelUrl,
  onClose,
}: PersonaChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [modelUrl, setModelUrl] = useState<string | undefined>(personaModelUrl);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingVoiceRef = useRef(false);
  const processMessageRef = useRef<(text: string) => void>(() => {});

  // Avatar state
  const setState = useAvatarStore((s) => s.setState);
  const setEmotion = useAvatarStore((s) => s.setEmotion);
  const setPerformance = useAvatarStore((s) => s.setPerformance);
  const avatarState = useAvatarStore((s) => s.state);

  // Streaming TTS
  const { speakNonStreaming, stop: stopSpeaking, isPlaying } = useStreamingTTS();

  // 3D Generation
  const { isGenerating: isGenerating3D, progress: generate3DProgress, error: generate3DError, generate: generate3D } = useGenerate3D();

  // Handle 3D generation
  const handleGenerate3D = useCallback(async () => {
    const result = await generate3D(personaId);
    if (result.success && result.modelUrl) {
      setModelUrl(result.modelUrl);
    }
  }, [personaId, generate3D]);

  // Voice recording
  const handleTranscript = useCallback((text: string) => {
    if (isProcessingVoiceRef.current || isLoading) return;
    isProcessingVoiceRef.current = true;
    setInput(text);
    setTimeout(() => {
      setInput("");
      processMessageRef.current(text.trim());
      setTimeout(() => {
        isProcessingVoiceRef.current = false;
      }, 500);
    }, 200);
  }, [isLoading]);

  const { isRecording, isTranscribing, audioLevel, startRecording, stopRecording } =
    useVoiceRecording(handleTranscript);

  // Update avatar state based on recording
  useEffect(() => {
    if (isRecording) {
      setState('listening');
    } else if (!isPlaying && !isLoading) {
      setState('idle');
    }
  }, [isRecording, isPlaying, isLoading, setState]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Process message
  const processMessage = useCallback(async (messageText: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setState('thinking');
    setEmotion('focused');

    try {
      // Get chat response
      const chatResponse = await fetch(`/api/personas/${personaId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (!chatResponse.ok) throw new Error("Chat failed");

      // Read streaming response
      const reader = chatResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let detectedEmotion = "neutral";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  fullResponse += data.text;
                } else if (data.type === "done") {
                  detectedEmotion = data.emotion || "neutral";
                }
              } catch {}
            }
          }
        }
      }

      // Parse LLM directive
      const directive = parseLLMDirective(fullResponse);
      const cleanedResponse = directive
        ? directive.speech
        : cleanSpeechForTTS(fullResponse);

      // Apply performance
      if (directive) {
        setPerformance(directiveToPerformance(directive));
      } else {
        setEmotion(detectedEmotion as any);
      }

      // Add message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: cleanedResponse,
        emotion: directive?.emotion || detectedEmotion,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Generate and play speech
      if (voiceEnabled && cleanedResponse) {
        setState('speaking');
        await speakNonStreaming(personaId, cleanedResponse, directive?.emotion || detectedEmotion);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setEmotion('concerned');
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble responding. Please try again.",
        emotion: "concerned",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (!isPlaying) setState('idle');
    }
  }, [personaId, voiceEnabled, setState, setEmotion, setPerformance, speakNonStreaming, isPlaying]);

  // Keep ref in sync
  useEffect(() => {
    processMessageRef.current = processMessage;
  }, [processMessage]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const messageText = input.trim();
    setInput("");
    await processMessage(messageText);
  }, [input, isLoading, processMessage]);

  // Handle mic click
  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (!isLoading && !isPlaying && !isTranscribing) {
      startRecording();
    }
  }, [isRecording, isLoading, isPlaying, isTranscribing, startRecording, stopRecording]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get status text
  const statusText = isRecording
    ? "Listening..."
    : isTranscribing
    ? "Transcribing..."
    : avatarState === "thinking"
    ? "Thinking..."
    : avatarState === "speaking"
    ? "Speaking..."
    : "Online";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: "rgba(0, 0, 0, 0.95)",
      backdropFilter: "blur(20px)",
      display: "flex",
    }}>
      {/* Left side - 3D Avatar */}
      <div style={{
        position: "relative",
        width: "50%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        borderRight: `1px solid ${colors.border}`,
      }}>
        <div style={{ width: "100%", height: "100%", maxWidth: 600, maxHeight: 600 }}>
          {/* Living, breathing persona avatar */}
          <AvatarStage
            imageUrl={personaImageUrl}
            modelUrl={modelUrl}
            name={personaName}
            onReady={() => console.log('[PersonaChat] Avatar ready')}
            onError={(e) => console.error('[PersonaChat] Avatar error:', e)}
          />
        </div>

        {/* Controls */}
        <div style={{
          position: "absolute",
          bottom: 32,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}>
          {/* Voice toggle */}
          <motion.button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              background: voiceEnabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
              color: voiceEnabled ? colors.white : colors.silver,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {voiceEnabled ? "Voice On" : "Voice Off"}
          </motion.button>

          {/* Generate 3D button (only show if no 3D model) */}
          {!modelUrl && (
            <motion.button
              onClick={handleGenerate3D}
              disabled={isGenerating3D}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: isGenerating3D ? "not-allowed" : "pointer",
                background: isGenerating3D
                  ? "rgba(139, 92, 246, 0.3)"
                  : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                color: colors.white,
                opacity: isGenerating3D ? 0.7 : 1,
                minWidth: 120,
              }}
              whileHover={!isGenerating3D ? { scale: 1.05 } : {}}
              whileTap={!isGenerating3D ? { scale: 0.95 } : {}}
            >
              {isGenerating3D ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <motion.div
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  {generate3DProgress}%
                </span>
              ) : (
                "Generate 3D"
              )}
            </motion.button>
          )}
        </div>

        {/* 3D Generation error */}
        {generate3DError && (
          <div style={{
            position: "absolute",
            bottom: 80,
            padding: "8px 16px",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            color: "#ef4444",
            fontSize: 12,
          }}>
            {generate3DError}
          </div>
        )}
      </div>

      {/* Right side - Chat */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: colors.white }}>
              {personaName}
            </h2>
            <p style={{
              margin: 0,
              fontSize: 14,
              color: isRecording ? "#ef4444" : avatarState === "speaking" ? "#22c55e" : colors.silver,
            }}>
              {statusText}
            </p>
          </div>
          {onClose && (
            <motion.button
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                border: "none",
                color: colors.silver,
                cursor: "pointer",
                display: "flex",
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 16,
                }}
              >
                <div style={{
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? colors.blue : "rgba(255,255,255,0.1)",
                  color: msg.role === "user" ? colors.white : "rgba(255,255,255,0.9)",
                }}>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg.content}</p>
                  {msg.emotion && msg.role === "assistant" && (
                    <span style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "capitalize",
                    }}>
                      {msg.emotion}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", marginBottom: 16 }}>
              <div style={{
                background: "rgba(255,255,255,0.1)",
                padding: "12px 16px",
                borderRadius: "16px 16px 16px 4px",
                display: "flex",
                gap: 4,
              }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    style={{ width: 8, height: 8, background: "rgba(255,255,255,0.5)", borderRadius: "50%" }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
          {/* Recording indicator */}
          <AnimatePresence>
            {(isRecording || isTranscribing) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 12,
                  padding: "12px 16px",
                  background: isRecording ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                  borderRadius: 12,
                  border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
                }}
              >
                {isRecording ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          style={{ width: 4, background: "#ef4444", borderRadius: 2 }}
                          animate={{ height: Math.max(8, audioLevel * 32 * (0.5 + Math.random() * 0.5)) }}
                          transition={{ duration: 0.1 }}
                        />
                      ))}
                    </div>
                    <span style={{ color: "#ef4444", fontSize: 14, fontWeight: 500 }}>Listening...</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      style={{ width: 16, height: 16, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span style={{ color: "#3b82f6", fontSize: 14, fontWeight: 500 }}>Transcribing...</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Mic button */}
            <motion.button
              onClick={handleMicClick}
              disabled={isLoading || isPlaying || isTranscribing}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                cursor: isLoading || isPlaying || isTranscribing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isRecording ? "rgba(239, 68, 68, 0.8)" : "rgba(255,255,255,0.1)",
                opacity: isLoading || isPlaying || isTranscribing ? 0.5 : 1,
              }}
              whileHover={!isLoading && !isPlaying && !isTranscribing ? { scale: 1.1 } : {}}
              whileTap={!isLoading && !isPlaying && !isTranscribing ? { scale: 0.9 } : {}}
            >
              {isRecording ? (
                <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                </svg>
              ) : (
                <svg width="24" height="24" fill="none" stroke="#fff" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </motion.button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${personaName}...`}
              disabled={isLoading || isPlaying || isRecording || isTranscribing}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                color: colors.white,
                fontSize: 15,
                outline: "none",
                opacity: isLoading || isPlaying || isRecording || isTranscribing ? 0.5 : 1,
              }}
            />

            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isPlaying}
              style={{
                padding: "12px 24px",
                background: colors.blue,
                color: colors.white,
                border: "none",
                borderRadius: 12,
                fontWeight: 500,
                cursor: !input.trim() || isLoading || isPlaying ? "not-allowed" : "pointer",
                opacity: !input.trim() || isLoading || isPlaying ? 0.5 : 1,
              }}
              whileHover={input.trim() && !isLoading && !isPlaying ? { scale: 1.05 } : {}}
              whileTap={input.trim() && !isLoading && !isPlaying ? { scale: 0.95 } : {}}
            >
              Send
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonaChat;
