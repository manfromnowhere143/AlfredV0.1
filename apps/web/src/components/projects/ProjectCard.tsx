/**
 * ProjectCard - Fixed Version
 * 
 * Changes:
 * 1. Edit button now opens artifact in preview mode (not broken /edit route)
 * 2. Shows preview image from project metadata
 * 3. Hero video support on hover
 * 4. Proper loading states
 * 
 * Replace: apps/web/src/components/projects/ProjectCard.tsx
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Edit3, Play, Image as ImageIcon } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    primary_domain?: string | null;
    primaryDomain?: string | null; // Handle both snake_case and camelCase
    last_deployment_status?: string | null;
    lastDeploymentStatus?: string | null;
    metadata?: {
      heroVideo?: {
        url: string;
        thumbnailUrl?: string | null;
      };
      previewImage?: {
        url: string;
      };
    } | null;
  };
  latestArtifact?: {
    id: string;
    title: string;
    version: number;
  } | null;
}

export function ProjectCard({ project, latestArtifact }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Normalize field names (handle both snake_case from DB and camelCase)
  const domain = project.primary_domain || project.primaryDomain;
  const status = project.last_deployment_status || project.lastDeploymentStatus || "unknown";
  const deployed = status === "ready" || status === "building" || status === "pending";

  // Get media from metadata
  const heroVideo = project.metadata?.heroVideo;
  const previewImage = project.metadata?.previewImage;
  const hasPreview = previewImage?.url && !imageError;
  const hasVideo = heroVideo?.url;

  // Play video on hover
  useEffect(() => {
    if (!videoRef.current || !hasVideo) return;
    
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, hasVideo]);

  const statusClass =
    status === "ready"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "building"
      ? "bg-yellow-500/20 text-yellow-300"
      : "bg-zinc-700/40 text-zinc-300";

  // Build edit URL - opens artifact in preview mode
  const getEditUrl = () => {
    if (latestArtifact?.id) {
      // Open artifact in preview mode
      return `/?artifact=${latestArtifact.id}&mode=preview`;
    }
    // No artifact - go to main chat to create one
    return `/?project=${project.id}`;
  };

  return (
    <div 
      className="group relative rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm overflow-hidden hover:bg-zinc-900/70 transition shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Preview Area */}
      <div className="relative aspect-video bg-zinc-800 overflow-hidden">
        {/* Video (shown on hover if available) */}
        {hasVideo && (
          <video
            ref={videoRef}
            src={heroVideo.url}
            poster={heroVideo.thumbnailUrl || previewImage?.url}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Preview Image */}
        {hasPreview && (
          <img
            src={previewImage.url}
            alt={project.name}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
              hasVideo && isHovered ? "opacity-0" : "opacity-100"
            }`}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Gradient Placeholder (fallback) */}
        {!hasPreview && !hasVideo && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-400/20 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Video indicator */}
        {hasVideo && !isHovered && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1.5">
            <Play className="w-3 h-3 text-white" fill="white" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-3 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          {deployed && domain && (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              View Live
            </a>
          )}
          
          <Link
            href={getEditUrl()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
          >
            <Edit3 className="w-4 h-4" />
            {latestArtifact ? "Edit" : "Create"}
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold tracking-tight truncate">
              {project.name}
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              {domain || "Not deployed yet"}
            </p>
          </div>

          <span className={`shrink-0 px-2 py-1 rounded-lg text-xs font-medium ${statusClass}`}>
            {status}
          </span>
        </div>

        {project.description && (
          <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProjectCard;