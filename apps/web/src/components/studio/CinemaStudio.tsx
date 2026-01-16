/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERSONAFORGE CINEMA STUDIO
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The video production pipeline interface. Create, manage, and export
 * high-quality videos featuring your personas.
 *
 * Features:
 * - Video creation with script input
 * - Generation queue with progress tracking
 * - Video library with preview and download
 * - Export options (quality, format, platform)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  animation,
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Progress,
  Skeleton,
} from "@/lib/design-system";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type VideoStatus = "queued" | "processing" | "rendering" | "completed" | "failed";

interface VideoJob {
  id: string;
  personaId: string;
  personaName: string;
  personaImage?: string;
  script: string;
  status: VideoStatus;
  progress: number;
  duration?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface Persona {
  id: string;
  name: string;
  imageUrl?: string;
}

interface CinemaStudioProps {
  personas: Persona[];
  videos: VideoJob[];
  isLoading?: boolean;
  onCreateVideo?: (personaId: string, script: string) => Promise<void>;
  onDeleteVideo?: (videoId: string) => void;
  onDownloadVideo?: (videoId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const Icons = {
  film: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </svg>
  ),
  play: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  download: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  ),
  sparkle: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.gold[400]} strokeWidth="1.5">
      <path d="M12 2L14.09 8.26L20 9.27L15.45 13.14L16.82 19.02L12 15.77L7.18 19.02L8.55 13.14L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const statusConfig: Record<VideoStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: "Queued", color: colors.text.muted, icon: Icons.clock },
  processing: { label: "Processing", color: colors.state.info, icon: Icons.clock },
  rendering: { label: "Rendering", color: colors.state.warning, icon: Icons.film },
  completed: { label: "Completed", color: colors.state.success, icon: Icons.check },
  failed: { label: "Failed", color: colors.state.error, icon: Icons.error },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CINEMA STUDIO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CinemaStudio({
  personas,
  videos,
  isLoading = false,
  onCreateVideo,
  onDeleteVideo,
  onDownloadVideo,
}: CinemaStudioProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [script, setScript] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "library">("queue");

  const queuedVideos = videos.filter((v) => v.status !== "completed" && v.status !== "failed");
  const completedVideos = videos.filter((v) => v.status === "completed" || v.status === "failed");

  const handleCreateVideo = async () => {
    if (!selectedPersonaId || !script.trim()) return;
    setIsCreating(true);
    try {
      await onCreateVideo?.(selectedPersonaId, script.trim());
      setShowCreateModal(false);
      setSelectedPersonaId("");
      setScript("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ padding: spacing[8] }}>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing[8],
          flexWrap: "wrap",
          gap: spacing[4],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
              letterSpacing: typography.letterSpacing.tight,
            }}
          >
            Cinema Studio
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.md,
              color: colors.text.secondary,
              margin: `${spacing[2]} 0 0 0`,
            }}
          >
            Create and manage persona videos with AI-powered generation
          </p>
        </div>
        <Button icon={Icons.plus} onClick={() => setShowCreateModal(true)}>
          Create Video
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TABS */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          gap: spacing[2],
          marginBottom: spacing[6],
          borderBottom: `1px solid ${colors.border.subtle}`,
          paddingBottom: spacing[4],
        }}
      >
        <TabButton
          label="Queue"
          count={queuedVideos.length}
          isActive={activeTab === "queue"}
          onClick={() => setActiveTab("queue")}
        />
        <TabButton
          label="Library"
          count={completedVideos.length}
          isActive={activeTab === "library"}
          onClick={() => setActiveTab("library")}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingState />
        ) : activeTab === "queue" ? (
          <QueueView
            videos={queuedVideos}
            onDelete={onDeleteVideo}
          />
        ) : (
          <LibraryView
            videos={completedVideos}
            onDelete={onDeleteVideo}
            onDownload={onDownloadVideo}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateVideoModal
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            script={script}
            isCreating={isCreating}
            onPersonaSelect={setSelectedPersonaId}
            onScriptChange={setScript}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        padding: `${spacing[3]} ${spacing[5]}`,
        background: isActive ? colors.gold.glow : "transparent",
        border: "none",
        borderRadius: radius.lg,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: spacing[2],
      }}
    >
      <span
        style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.medium,
          color: isActive ? colors.gold[400] : colors.text.secondary,
        }}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          style={{
            padding: `${spacing[0.5]} ${spacing[2]}`,
            background: isActive ? colors.gold[400] : colors.bg.hover,
            color: isActive ? colors.bg.void : colors.text.muted,
            borderRadius: radius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function QueueView({
  videos,
  onDelete,
}: {
  videos: VideoJob[];
  onDelete?: (id: string) => void;
}) {
  if (videos.length === 0) {
    return <EmptyState type="queue" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[4],
      }}
    >
      {videos.map((video) => (
        <QueueCard key={video.id} video={video} onDelete={onDelete} />
      ))}
    </motion.div>
  );
}

function QueueCard({ video, onDelete }: { video: VideoJob; onDelete?: (id: string) => void }) {
  const status = statusConfig[video.status];

  return (
    <Card variant="default" padding={5}>
      <div style={{ display: "flex", alignItems: "center", gap: spacing[4] }}>
        {/* Persona Avatar */}
        <div
          style={{
            width: spacing[14],
            height: spacing[14],
            borderRadius: radius.lg,
            overflow: "hidden",
            background: colors.bg.base,
            flexShrink: 0,
          }}
        >
          {video.personaImage ? (
            <img
              src={video.personaImage}
              alt={video.personaName}
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
                fontSize: typography.fontSize.xl,
                color: colors.text.muted,
              }}
            >
              {video.personaName.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing[3], marginBottom: spacing[1] }}>
            <h3
              style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              {video.personaName}
            </h3>
            <Badge
              variant={
                video.status === "completed"
                  ? "success"
                  : video.status === "failed"
                    ? "error"
                    : video.status === "rendering"
                      ? "warning"
                      : "info"
              }
              dot
              pulse={video.status === "processing" || video.status === "rendering"}
            >
              {status.label}
            </Badge>
          </div>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {video.script.slice(0, 80)}...
          </p>

          {/* Progress Bar */}
          {(video.status === "processing" || video.status === "rendering") && (
            <div style={{ marginTop: spacing[3] }}>
              <Progress
                value={video.progress}
                variant={video.status === "rendering" ? "gold" : "info"}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDelete?.(video.id)}
          style={{
            width: spacing[10],
            height: spacing[10],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: radius.lg,
            color: colors.text.muted,
            cursor: "pointer",
          }}
        >
          {Icons.trash}
        </motion.button>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRARY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function LibraryView({
  videos,
  onDelete,
  onDownload,
}: {
  videos: VideoJob[];
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}) {
  if (videos.length === 0) {
    return <EmptyState type="library" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: spacing[6],
      }}
    >
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onDelete={onDelete} onDownload={onDownload} />
      ))}
    </motion.div>
  );
}

function VideoCard({
  video,
  onDelete,
  onDownload,
}: {
  video: VideoJob;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isFailed = video.status === "failed";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        background: colors.bg.elevated,
        borderRadius: radius["2xl"],
        overflow: "hidden",
        border: `1px solid ${isFailed ? colors.state.error : colors.border.default}`,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: colors.bg.base,
        }}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.personaName}
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
              color: colors.text.muted,
            }}
          >
            {Icons.film}
          </div>
        )}

        {/* Overlay on hover */}
        <AnimatePresence>
          {isHovered && !isFailed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: spacing[14],
                  height: spacing[14],
                  borderRadius: radius.full,
                  background: colors.gold[400],
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.bg.void,
                  cursor: "pointer",
                }}
              >
                {Icons.play}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration badge */}
        {video.duration && !isFailed && (
          <div
            style={{
              position: "absolute",
              bottom: spacing[2],
              right: spacing[2],
              padding: `${spacing[1]} ${spacing[2]}`,
              background: "rgba(0,0,0,0.75)",
              borderRadius: radius.md,
              fontSize: typography.fontSize.xs,
              color: colors.text.primary,
            }}
          >
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Failed overlay */}
        {isFailed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `${colors.state.error}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: spacing[2],
            }}
          >
            <div style={{ color: colors.state.error }}>{Icons.error}</div>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.state.error }}>
              Generation Failed
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: spacing[4] }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[1],
              }}
            >
              {video.personaName}
            </h3>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.muted,
                margin: 0,
              }}
            >
              {formatDate(video.createdAt)}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: spacing[1] }}>
            {!isFailed && (
              <motion.button
                whileHover={{ scale: 1.1, background: colors.bg.hover }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDownload?.(video.id)}
                style={{
                  width: spacing[9],
                  height: spacing[9],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: radius.md,
                  color: colors.text.muted,
                  cursor: "pointer",
                }}
              >
                {Icons.download}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1, background: colors.state.errorMuted }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete?.(video.id)}
              style={{
                width: spacing[9],
                height: spacing[9],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                borderRadius: radius.md,
                color: colors.text.muted,
                cursor: "pointer",
              }}
            >
              {Icons.trash}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE VIDEO MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function CreateVideoModal({
  personas,
  selectedPersonaId,
  script,
  isCreating,
  onPersonaSelect,
  onScriptChange,
  onClose,
  onCreate,
}: {
  personas: Persona[];
  selectedPersonaId: string;
  script: string;
  isCreating: boolean;
  onPersonaSelect: (id: string) => void;
  onScriptChange: (script: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[6],
        zIndex: 500,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "600px",
          background: colors.bg.elevated,
          borderRadius: radius["2xl"],
          border: `1px solid ${colors.border.default}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: spacing[6],
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Create New Video
          </h2>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              margin: `${spacing[1]} 0 0 0`,
            }}
          >
            Select a persona and write a script for your video
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: spacing[6], display: "flex", flexDirection: "column", gap: spacing[5] }}>
          {/* Persona Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Select Persona
            </label>
            <div style={{ display: "flex", gap: spacing[3], flexWrap: "wrap" }}>
              {personas.map((persona) => (
                <motion.button
                  key={persona.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPersonaSelect(persona.id)}
                  style={{
                    width: spacing[16],
                    padding: spacing[2],
                    background: selectedPersonaId === persona.id ? colors.gold.glow : colors.bg.base,
                    border: `2px solid ${selectedPersonaId === persona.id ? colors.gold[400] : colors.border.default}`,
                    borderRadius: radius.xl,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: spacing[2],
                  }}
                >
                  <div
                    style={{
                      width: spacing[12],
                      height: spacing[12],
                      borderRadius: radius.full,
                      overflow: "hidden",
                      background: colors.bg.hover,
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
                          fontSize: typography.fontSize.lg,
                          color: colors.text.muted,
                        }}
                      >
                        {persona.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: selectedPersonaId === persona.id ? colors.gold[400] : colors.text.secondary,
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {persona.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Script Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Script
            </label>
            <Textarea
              placeholder="Write what you want your persona to say..."
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              style={{ minHeight: spacing[32] }}
            />
            <p
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.muted,
                marginTop: spacing[2],
              }}
            >
              {script.length} characters - Recommended: 50-500 characters for best results
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: spacing[6],
            borderTop: `1px solid ${colors.border.subtle}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: spacing[3],
          }}
        >
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={!selectedPersonaId || !script.trim()}
            loading={isCreating}
            icon={Icons.sparkle}
          >
            Generate Video
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyState({ type }: { type: "queue" | "library" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[16],
        textAlign: "center",
      }}
    >
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ marginBottom: spacing[6] }}
      >
        {Icons.sparkle}
      </motion.div>
      <h2
        style={{
          fontSize: typography.fontSize["2xl"],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          margin: 0,
          marginBottom: spacing[2],
        }}
      >
        {type === "queue" ? "No videos in queue" : "No videos yet"}
      </h2>
      <p
        style={{
          fontSize: typography.fontSize.md,
          color: colors.text.secondary,
          margin: 0,
          maxWidth: "400px",
        }}
      >
        {type === "queue"
          ? "Create a new video to start generating"
          : "Your completed videos will appear here"}
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[4],
            padding: spacing[5],
            background: colors.bg.elevated,
            borderRadius: radius["2xl"],
          }}
        >
          <Skeleton width={spacing[14]} height={spacing[14]} borderRadius={radius.lg} />
          <div style={{ flex: 1 }}>
            <Skeleton width="40%" height={spacing[5]} style={{ marginBottom: spacing[2] }} />
            <Skeleton width="70%" height={spacing[4]} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default CinemaStudio;
