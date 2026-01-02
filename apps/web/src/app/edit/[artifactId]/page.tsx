"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArtifactProvider, useArtifacts } from "@/components/Message";

interface ArtifactData {
  id: string;
  code: string;
  language: string;
  title: string;
  conversationId?: string;
  projectId?: string;
}

function ArtifactLoader({ artifactData, onClose }: { artifactData: ArtifactData; onClose: () => void }) {
  const { addArtifact, openGallery, artifacts, isGalleryOpen } = useArtifacts();
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    addArtifact({
      id: artifactData.id,
      code: artifactData.code,
      language: artifactData.language,
      title: artifactData.title,
    });
  }, [artifactData, addArtifact]);

  useEffect(() => {
    if (artifacts.length > 0 && !hasOpened) {
      const idx = artifacts.findIndex((a) => a.id === artifactData.id);
      openGallery(idx >= 0 ? idx : 0);
      setHasOpened(true);
    }
  }, [artifacts, artifactData.id, openGallery, hasOpened]);

  useEffect(() => {
    if (hasOpened && !isGalleryOpen) {
      onClose();
    }
  }, [isGalleryOpen, hasOpened, onClose]);

  return null;
}

export default function EditArtifactPage() {
  const router = useRouter();
  const params = useParams();
  const artifactId = params.artifactId as string;

  const [artifact, setArtifact] = useState<ArtifactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId) return;

    fetch(`/api/artifacts/${artifactId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Artifact not found");
        return res.json();
      })
      .then((response) => {
        if (!response.success || !response.data) {
          throw new Error("Artifact not found");
        }
        const data = response.data;
        setArtifact({
          id: data.id,
          code: data.code,
          language: data.language || "jsx",
          title: data.title || "Component",
          conversationId: data.conversationId,
          projectId: data.projectId,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch artifact:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [artifactId]);

  const handleBack = useCallback(() => {
    if (artifact?.projectId) {
      router.push(`/projects/${artifact.projectId}`);
    } else {
      router.push("/");
    }
  }, [router, artifact?.projectId]);

  if (loading) {
    return (
      <div className="edit-loading">
        <div className="loading-orb">
          <div className="orb-ring" />
          <div className="orb-core" />
        </div>
        <div className="loading-text">Loading artifact...</div>
        <style jsx>{`
          .edit-loading {
            min-height: 100vh;
            background: var(--bg-void, #000);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
          }
          .loading-orb {
            position: relative;
            width: 48px;
            height: 48px;
          }
          .orb-ring {
            position: absolute;
            inset: 0;
            border: 2px solid transparent;
            border-top-color: rgba(139, 92, 246, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .orb-core {
            position: absolute;
            inset: 8px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2));
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1); }
          }
          .loading-text {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.4);
          }
        `}</style>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="edit-error">
        <div className="error-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h2>Artifact not found</h2>
        <p>This artifact doesn't exist or has been deleted.</p>
        <button onClick={() => router.push("/")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Go Back
        </button>
        <style jsx>{`
          .edit-error {
            min-height: 100vh;
            background: var(--bg-void, #000);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 24px;
            text-align: center;
          }
          .error-icon {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ef4444;
          }
          h2 { font-size: 20px; font-weight: 600; color: #fff; margin: 0; }
          p { font-size: 14px; color: rgba(255, 255, 255, 0.5); margin: 0; }
          button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            margin-top: 8px;
            transition: all 0.2s;
          }
          button:hover { background: rgba(255, 255, 255, 0.1); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="edit-page">
      <ArtifactProvider conversationId={artifact.conversationId || null}>
        <ArtifactLoader artifactData={artifact} onClose={handleBack} />
      </ArtifactProvider>
      <style jsx>{`
        .edit-page {
          min-height: 100vh;
          background: var(--bg-void, #000);
        }
      `}</style>
    </div>
  );
}
