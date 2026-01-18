/**
 * ProjectCard - With Iframe Fallback
 * 
 * Features:
 * 1. Shows preview image from metadata
 * 2. Hero video support on hover
 * 3. IFRAME FALLBACK when no screenshot exists
 * 4. Auto-triggers screenshot capture for deployed sites
 * 5. Edit button opens artifact in preview mode
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Edit3, Play, Image as ImageIcon, RefreshCw, Loader2, Search } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    primary_domain?: string | null;
    primaryDomain?: string | null;
    last_deployment_status?: string | null;
    lastDeploymentStatus?: string | null;
    seoScore?: number | null;
    seoGrade?: string | null;
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
  onScreenshotCaptured?: (url: string) => void;
  showSeoScore?: boolean;
}

// SEO score badge helper function
function getSeoGradeColor(grade?: string | null): string {
  if (!grade) return '#6b7280';
  if (grade.startsWith('A')) return '#22c55e';
  if (grade === 'B') return '#84cc16';
  if (grade === 'C') return '#eab308';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

export function ProjectCard({ project, latestArtifact, onScreenshotCaptured, showSeoScore = true }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Normalize field names
  const domain = project.primary_domain || project.primaryDomain;
  const status = project.last_deployment_status || project.lastDeploymentStatus || "unknown";
  const deployed = status === "ready";
  const isBuilding = status === "building" || status === "pending";

  // Get media from metadata
  const heroVideo = project.metadata?.heroVideo;
  const previewImage = project.metadata?.previewImage;
  const hasPreview = previewImage?.url && !imageError;
  const hasVideo = heroVideo?.url;

  // Determine if we should show iframe fallback
  const showIframeFallback = deployed && domain && !hasPreview && !hasVideo;
  const siteUrl = domain ? `https://${domain}` : null;

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

  // Auto-capture screenshot when deployed but no preview exists
  useEffect(() => {
    if (deployed && domain && !hasPreview && !hasVideo && !isCapturing) {
      // Delay to allow deployment to fully propagate
      const timer = setTimeout(() => {
        captureScreenshot();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [deployed, domain, hasPreview, hasVideo]);

  // Capture screenshot function
  const captureScreenshot = useCallback(async () => {
    if (!domain || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://${domain}`,
          projectId: project.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.screenshotUrl) {
          // Update project metadata with screenshot
          await fetch(`/api/projects/${project.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...project.metadata,
                previewImage: { url: data.screenshotUrl },
              },
            }),
          });
          onScreenshotCaptured?.(data.screenshotUrl);
          // Force reload to show new image
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('[ProjectCard] Screenshot capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [domain, project.id, project.metadata, isCapturing, onScreenshotCaptured]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIframeError(false);
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIframeError(true);
    setIframeLoaded(false);
  };

  const statusClass =
    status === "ready"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "building"
      ? "bg-yellow-500/20 text-yellow-300"
      : status === "pending"
      ? "bg-blue-500/20 text-blue-300"
      : "bg-zinc-700/40 text-zinc-300";

  // Build edit URL
  const getEditUrl = () => {
    if (latestArtifact?.id) {
      return `/?artifact=${latestArtifact.id}&mode=preview`;
    }
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

        {/* IFRAME FALLBACK - Live preview when no screenshot */}
        {showIframeFallback && siteUrl && !iframeError && (
          <div className="absolute inset-0">
            {/* Loading state */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                  <span className="text-xs text-zinc-500">Loading preview...</span>
                </div>
              </div>
            )}
            
            {/* Scaled iframe */}
            <div className="absolute inset-0 overflow-hidden">
              <iframe
                ref={iframeRef}
                src={siteUrl}
                title={`Preview of ${project.name}`}
                className={`absolute top-0 left-0 border-0 transition-opacity duration-300 ${
                  iframeLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  width: '1280px',
                  height: '800px',
                  transform: 'scale(0.25)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
            
            {/* Capture screenshot button */}
            {iframeLoaded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  captureScreenshot();
                }}
                disabled={isCapturing}
                className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 transition opacity-0 group-hover:opacity-100"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Capture
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Building State */}
        {isBuilding && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              <span className="text-sm text-yellow-400">Deploying...</span>
            </div>
          </div>
        )}

        {/* Gradient Placeholder (final fallback) */}
        {!hasPreview && !hasVideo && !showIframeFallback && !isBuilding && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-400/20 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Iframe error fallback */}
        {showIframeFallback && iframeError && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <ImageIcon className="w-8 h-8 text-zinc-500" />
              <span className="text-xs text-zinc-400">Preview unavailable</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIframeError(false);
                  captureScreenshot();
                }}
                disabled={isCapturing}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {isCapturing ? 'Capturing...' : 'Retry'}
              </button>
            </div>
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

          <div className="flex items-center gap-2 shrink-0">
            {/* SEO Score Badge */}
            {showSeoScore && project.seoScore !== undefined && project.seoScore !== null && (
              <Link
                href={`/projects/${project.id}/seo`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition hover:opacity-80"
                style={{
                  backgroundColor: `${getSeoGradeColor(project.seoGrade)}20`,
                  color: getSeoGradeColor(project.seoGrade),
                }}
                onClick={(e) => e.stopPropagation()}
                title="View SEO Dashboard"
              >
                <Search className="w-3 h-3" />
                <span>{project.seoScore}</span>
                {project.seoGrade && (
                  <span className="opacity-70">({project.seoGrade})</span>
                )}
              </Link>
            )}

            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusClass}`}>
              {status}
            </span>
          </div>
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