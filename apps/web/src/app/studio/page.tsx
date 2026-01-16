/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE STUDIO — Main Page
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The unified studio experience for PersonaForge. This page integrates all
 * studios into a single, cohesive application.
 *
 * Studios:
 * - Gallery: Browse and manage your personas
 * - Create: Forge new digital beings
 * - Engage: Live conversation with personas
 * - Cinema: Video production pipeline
 * - Settings: Full persona configuration
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  StudioShell,
  GalleryView,
  CreateStudio,
  EngageStudio,
  CinemaStudio,
  SettingsStudio,
  type StudioView,
} from "@/components/studio";
import { LiveAvatar3DStaged } from "@/components/LiveAvatar3DStaged";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Persona {
  id: string;
  name: string;
  tagline?: string;
  imageUrl?: string;
  archetype?: string;
  visualStyle?: string;
  voiceId?: string;
  voiceName?: string;
  personality?: Record<string, number>;
  backstory?: string;
  coreMemories?: string[];
  behaviors?: string[];
  quirks?: string[];
  systemPromptOverride?: string;
  responseStyle?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastInteraction?: string;
  totalConversations?: number;
}

interface VideoJob {
  id: string;
  personaId: string;
  personaName: string;
  personaImage?: string;
  script: string;
  status: "queued" | "processing" | "rendering" | "completed" | "failed";
  progress: number;
  duration?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function StudioPage() {
  // Navigation state
  const [currentView, setCurrentView] = useState<StudioView>("gallery");

  // Data state
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected persona for engage/settings
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchPersonas = useCallback(async () => {
    try {
      const response = await fetch("/api/personas");
      if (response.ok) {
        const data = await response.json();
        setPersonas(data.personas || []);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Gallery handlers
  const handlePersonaClick = (persona: Persona) => {
    setSelectedPersona(persona as Persona);
    setCurrentView("engage");
  };

  const handleEngageClick = (persona: Persona) => {
    setSelectedPersona(persona as Persona);
    setCurrentView("engage");
  };

  const handleEditClick = (persona: Persona) => {
    setSelectedPersona(persona as Persona);
    setCurrentView("settings");
  };

  const handleDeleteClick = async (persona: Persona) => {
    if (!confirm(`Are you sure you want to delete ${persona.name}?`)) return;
    try {
      await fetch(`/api/personas/${persona.id}`, { method: "DELETE" });
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id));
    } catch (error) {
      console.error("Failed to delete persona:", error);
    }
  };

  // Create handlers
  const handleCreateComplete = async (data: unknown) => {
    try {
      const response = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const newPersona = await response.json();
        setPersonas((prev) => [newPersona, ...prev]);
        setCurrentView("gallery");
      }
    } catch (error) {
      console.error("Failed to create persona:", error);
    }
  };

  // Engage handlers
  const handleSendMessage = async (message: string): Promise<string> => {
    if (!selectedPersona) return "";
    try {
      const response = await fetch(`/api/personas/${selectedPersona.id}/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.response || data.text || "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
    return "";
  };

  // Settings handlers
  const handleSaveSettings = async (updates: Partial<Persona>) => {
    if (!selectedPersona) return;
    try {
      const response = await fetch(`/api/personas/${selectedPersona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updated = await response.json();
        setPersonas((prev) => prev.map((p) => (p.id === selectedPersona.id ? { ...p, ...updated } : p)));
        setSelectedPersona((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleDeleteFromSettings = async () => {
    if (!selectedPersona) return;
    await handleDeleteClick(selectedPersona);
    setSelectedPersona(null);
    setCurrentView("gallery");
  };

  const handleExportPersona = () => {
    if (!selectedPersona) return;
    const blob = new Blob([JSON.stringify(selectedPersona, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPersona.name.toLowerCase().replace(/\s+/g, "-")}-persona.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cinema handlers - Real RunPod video generation
  const handleCreateVideo = async (personaId: string, script: string) => {
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) return;

    // Create optimistic video entry
    const tempId = `temp_${Date.now()}`;
    const newVideo: VideoJob = {
      id: tempId,
      personaId,
      personaName: persona.name,
      personaImage: persona.imageUrl,
      script,
      status: "queued",
      progress: 0,
      createdAt: new Date(),
    };
    setVideos((prev) => [newVideo, ...prev]);

    try {
      // Call real API to generate video
      console.log(`[Cinema] Submitting video job for ${persona.name}...`);
      const response = await fetch(`/api/personas/${personaId}/make-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          quality: "standard",
          async: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Cinema] Job created: ${data.jobId}`);

      // Update video with real jobId
      setVideos((prev) =>
        prev.map((v) =>
          v.id === tempId
            ? { ...v, id: data.jobId, status: "processing", progress: 10 }
            : v
        )
      );

      // Start polling for job status
      pollVideoJob(personaId, data.jobId);
    } catch (error) {
      console.error(`[Cinema] Error creating video:`, error);
      // Mark as failed
      setVideos((prev) =>
        prev.map((v) =>
          v.id === tempId
            ? { ...v, status: "failed", error: String(error) }
            : v
        )
      );
    }
  };

  // Poll RunPod for video job status
  const pollVideoJob = async (personaId: string, jobId: string) => {
    const POLL_INTERVAL = 3000; // 3 seconds
    const MAX_POLLS = 120; // 6 minutes max
    let pollCount = 0;

    const poll = async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
        console.error(`[Cinema] Job ${jobId} timed out`);
        setVideos((prev) =>
          prev.map((v) =>
            v.id === jobId
              ? { ...v, status: "failed", error: "Video generation timed out" }
              : v
          )
        );
        return;
      }

      try {
        const response = await fetch(`/api/personas/${personaId}/make-video/${jobId}`);
        const data = await response.json();

        console.log(`[Cinema] Job ${jobId} status: ${data.status}`);

        if (data.status === "COMPLETED") {
          // Success - update with video URL
          setVideos((prev) =>
            prev.map((v) =>
              v.id === jobId
                ? {
                    ...v,
                    status: "completed",
                    progress: 100,
                    videoUrl: data.videoUrl,
                    thumbnailUrl: data.thumbnail,
                    completedAt: new Date(),
                  }
                : v
            )
          );
          console.log(`[Cinema] Video ready: ${data.videoUrl?.slice(0, 60)}...`);
          return;
        }

        if (data.status === "FAILED") {
          setVideos((prev) =>
            prev.map((v) =>
              v.id === jobId
                ? { ...v, status: "failed", error: data.error }
                : v
            )
          );
          return;
        }

        // Still processing - update progress and continue polling
        const progress = data.status === "IN_PROGRESS" ? 50 : 20;
        setVideos((prev) =>
          prev.map((v) =>
            v.id === jobId
              ? { ...v, status: "rendering", progress }
              : v
          )
        );

        // Continue polling
        setTimeout(poll, POLL_INTERVAL);
      } catch (error) {
        console.error(`[Cinema] Poll error:`, error);
        setTimeout(poll, POLL_INTERVAL); // Retry on network error
      }
    };

    // Start polling
    setTimeout(poll, POLL_INTERVAL);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  const handleDownloadVideo = (videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (video?.videoUrl) {
      window.open(video.videoUrl, "_blank");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER CONTENT
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderContent = () => {
    switch (currentView) {
      case "gallery":
        return (
          <GalleryView
            personas={personas}
            isLoading={isLoading}
            onPersonaClick={handlePersonaClick}
            onCreateClick={() => setCurrentView("create")}
            onEngageClick={handleEngageClick}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
          />
        );

      case "create":
        return (
          <CreateStudio
            onComplete={handleCreateComplete}
            onCancel={() => setCurrentView("gallery")}
          />
        );

      case "engage":
        if (!selectedPersona) {
          return (
            <div style={{ padding: "64px", textAlign: "center" }}>
              <p>Please select a persona from the gallery first.</p>
              <button onClick={() => setCurrentView("gallery")}>Go to Gallery</button>
            </div>
          );
        }
        return (
          <EngageStudio
            persona={selectedPersona}
            onSendMessage={handleSendMessage}
            onBack={() => {
              setSelectedPersona(null);
              setCurrentView("gallery");
            }}
            AvatarComponent={LiveAvatar3DStaged}
          />
        );

      case "cinema":
        return (
          <CinemaStudio
            personas={personas}
            videos={videos}
            isLoading={isLoading}
            onCreateVideo={handleCreateVideo}
            onDeleteVideo={handleDeleteVideo}
            onDownloadVideo={handleDownloadVideo}
          />
        );

      case "settings":
        if (!selectedPersona) {
          return (
            <div style={{ padding: "64px", textAlign: "center" }}>
              <p>Please select a persona from the gallery first.</p>
              <button onClick={() => setCurrentView("gallery")}>Go to Gallery</button>
            </div>
          );
        }
        return (
          <SettingsStudio
            persona={{
              ...selectedPersona,
              personality: selectedPersona.personality || {},
              backstory: selectedPersona.backstory || "",
              coreMemories: selectedPersona.coreMemories || [],
              behaviors: selectedPersona.behaviors || [],
              quirks: selectedPersona.quirks || [],
              isPublished: selectedPersona.isPublished || false,
              createdAt: new Date(selectedPersona.createdAt || Date.now()),
              updatedAt: new Date(selectedPersona.updatedAt || Date.now()),
            }}
            onSave={handleSaveSettings}
            onDelete={handleDeleteFromSettings}
            onExport={handleExportPersona}
            onBack={() => {
              setSelectedPersona(null);
              setCurrentView("gallery");
            }}
          />
        );

      default:
        return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <StudioShell
      currentView={currentView}
      onViewChange={(view) => {
        // Don't allow direct navigation to engage/settings without a persona
        if ((view === "engage" || view === "settings") && !selectedPersona) {
          setCurrentView("gallery");
          return;
        }
        setCurrentView(view);
      }}
      showSidebar={currentView !== "engage"}
    >
      {renderContent()}
    </StudioShell>
  );
}
