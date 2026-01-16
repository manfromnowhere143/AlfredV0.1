"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIDEO GALLERY — See ALL Your REAL Generated Videos
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Every video PersonaForge generates is REAL.
 * This page proves it.
 *
 * Direct links to RunPod CDN. No tricks. No illusions.
 * Just H100 GPU-rendered talking head videos.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface VideoRecord {
  personaId: string;
  personaName: string;
  videoUrl: string;
  source: string;
  timestamp: string;
  type: "idle" | "speaking";
}

export default function VideoGalleryPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    try {
      // Fetch all personas
      const response = await fetch("/api/personas");
      const personas = await response.json();

      const videoRecords: VideoRecord[] = [];

      // Get idle videos for each persona (with timeout)
      const videoPromises = personas.map(async (persona: any) => {
        try {
          // Set a 10 second timeout per persona (don't wait 5 minutes!)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const idleResp = await fetch(`/api/personas/${persona.id}/idle-video`, {
            signal: controller.signal,
            headers: {
              "X-Quick-Check": "true" // Skip DB, only check memory cache
            }
          });
          clearTimeout(timeoutId);

          const idleData = await idleResp.json();

          if (idleData.status === "ready" && idleData.videoUrl) {
            return {
              personaId: persona.id,
              personaName: persona.name,
              videoUrl: idleData.videoUrl,
              source: idleData.source || "unknown",
              timestamp: new Date().toISOString(),
              type: "idle" as const,
            };
          }
        } catch (err) {
          // Timeout or error - skip this persona silently
          console.log(`Skipping ${persona.name}: no video ready yet`);
        }
        return null;
      });

      // Wait for all checks (max 10s each)
      const results = await Promise.all(videoPromises);

      // Filter out nulls
      const validVideos = results.filter((v): v is VideoRecord => v !== null);

      setVideos(validVideos);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #000000 0%, #0a0a0f 100%)",
        color: "#fff",
        padding: "60px 20px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 60, textAlign: "center" }}
        >
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              marginBottom: 16,
              background: "linear-gradient(135deg, #fff 0%, #888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🎬 Video Gallery
          </h1>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.6)" }}>
            Every video PersonaForge generates is REAL
          </p>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            H100 GPU-rendered. No CSS tricks. No illusions.
          </p>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.5)" }}>
            Loading videos...
          </div>
        )}

        {/* Video Grid */}
        {!isLoading && videos.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p style={{ fontSize: 18, marginBottom: 12 }}>No videos found yet</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
              Generate your first persona to see videos here
            </p>
          </div>
        )}

        {!isLoading && videos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
              gap: 30,
            }}
          >
            {videos.map((video, idx) => (
              <motion.div
                key={`${video.personaId}-${video.type}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                whileHover={{
                  scale: 1.02,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
                onClick={() => setSelectedVideo(video.videoUrl)}
              >
                {/* Video Player */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    background: "#000",
                    position: "relative",
                  }}
                >
                  <video
                    src={video.videoUrl}
                    controls
                    playsInline
                    loop
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                {/* Info */}
                <div style={{ padding: 20 }}>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "#fff",
                    }}
                  >
                    {video.personaName}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background:
                          video.type === "idle"
                            ? "rgba(59,130,246,0.2)"
                            : "rgba(34,197,94,0.2)",
                        color: video.type === "idle" ? "#60a5fa" : "#4ade80",
                        border: `1px solid ${
                          video.type === "idle" ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.3)"
                        }`,
                      }}
                    >
                      {video.type.toUpperCase()}
                    </span>

                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: "rgba(168,85,247,0.2)",
                        color: "#c084fc",
                        border: "1px solid rgba(168,85,247,0.3)",
                      }}
                    >
                      {video.source.toUpperCase()}
                    </span>
                  </div>

                  {/* Direct URL */}
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                        marginBottom: 6,
                      }}
                    >
                      Direct CDN URL:
                    </p>
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: "#60a5fa",
                        wordBreak: "break-all",
                        textDecoration: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {video.videoUrl}
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Fullscreen Modal */}
        {selectedVideo && (
          <div
            onClick={() => setSelectedVideo(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 40,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                background: "#000",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <video
                src={selectedVideo}
                controls
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
