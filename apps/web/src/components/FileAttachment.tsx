'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FileAttachmentProps {
  name: string;
  type: string;
  size?: number;
  url?: string;
  preview?: string;
  duration?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getFileCategory = (type: string): 'image' | 'video' | 'document' | 'code' => {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf') return 'document';
  return 'code';
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTBOX COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function Lightbox({ 
  src, 
  alt, 
  onClose, 
  isVideo = false 
}: { 
  src: string; 
  alt: string; 
  onClose: () => void;
  isVideo?: boolean;
}) {
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
      
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={src} controls autoPlay className="lightbox-media" />
        ) : (
          <img src={src} alt={alt} className="lightbox-media" />
        )}
      </div>

      <style jsx>{`
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.2s ease;
        }
        
        .lightbox-close:hover {
          background: rgba(255,255,255,0.2);
        }
        
        .lightbox-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .lightbox-media {
          max-width: 100%;
          max-height: 90vh;
          border-radius: 8px;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE ATTACHMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FileAttachment({ 
  name, 
  type, 
  size, 
  url, 
  preview,
  duration,
}: FileAttachmentProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const category = getFileCategory(type);
  const displayUrl = url || preview;
  const canPreview = (category === 'image' || category === 'video') && displayUrl;

  // Image attachment - show thumbnail
  if (category === 'image' && displayUrl) {
    return (
      <>
        <div className="file-image" onClick={() => setShowLightbox(true)}>
          <img src={displayUrl} alt={name} />
          <div className="file-image-overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
        </div>
        
        {showLightbox && (
          <Lightbox src={displayUrl} alt={name} onClose={() => setShowLightbox(false)} />
        )}

        <style jsx>{`
          .file-image {
            position: relative;
            max-width: 280px;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          
          .file-image:hover {
            transform: scale(1.02);
          }
          
          .file-image img {
            width: 100%;
            height: auto;
            display: block;
          }
          
          .file-image-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            opacity: 0;
            transition: all 0.2s ease;
          }
          
          .file-image:hover .file-image-overlay {
            background: rgba(0,0,0,0.3);
            opacity: 1;
          }
        `}</style>
      </>
    );
  }

  // Video attachment - show thumbnail with play button
  if (category === 'video' && displayUrl) {
    return (
      <>
        <div className="file-video" onClick={() => setShowLightbox(true)}>
          {preview ? (
            <img src={preview} alt={name} className="video-thumb" />
          ) : (
            <div className="video-placeholder" />
          )}
          <div className="video-overlay">
            <div className="play-button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            {duration && <span className="video-duration">{formatDuration(duration)}</span>}
          </div>
          <div className="video-info">
            <span className="video-name">{name}</span>
            {size && <span className="video-size">{formatSize(size)}</span>}
          </div>
        </div>
        
        {showLightbox && (
          <Lightbox src={url || ''} alt={name} onClose={() => setShowLightbox(false)} isVideo />
        )}

        <style jsx>{`
          .file-video {
            position: relative;
            width: 280px;
            border-radius: 12px;
            overflow: hidden;
            background: #111;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          
          .file-video:hover {
            transform: scale(1.02);
          }
          
          .video-thumb, .video-placeholder {
            width: 100%;
            height: 160px;
            object-fit: cover;
          }
          
          .video-placeholder {
            background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
          }
          
          .video-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 160px;
            background: rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          .play-button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          
          .file-video:hover .play-button {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
          }
          
          .video-duration {
            font-size: 12px;
            font-weight: 500;
            color: white;
            background: rgba(0,0,0,0.6);
            padding: 4px 8px;
            border-radius: 4px;
          }
          
          .video-info {
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .video-name {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255,255,255,0.9);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .video-size {
            font-size: 11px;
            color: rgba(255,255,255,0.5);
          }
        `}</style>
      </>
    );
  }

  // Document/Code file - show card
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="file-card"
      onClick={(e) => !url && e.preventDefault()}
    >
      <div className="file-icon">
        {category === 'document' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 18 22 18 22 12" />
            <polyline points="8 6 2 6 2 12" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
        )}
      </div>
      
      <div className="file-info">
        <span className="file-name">{name}</span>
        <span className="file-meta">
          {type.split('/')[1]?.toUpperCase() || 'FILE'}
          {size && ` • ${formatSize(size)}`}
        </span>
      </div>
      
      {url && (
        <div className="file-download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
      )}

      <style jsx>{`
        .file-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          max-width: 320px;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        
        .file-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.15);
        }
        
        .file-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(201,185,154,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C9B99A;
          flex-shrink: 0;
        }
        
        .file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .file-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-meta {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
        }
        
        .file-download {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.6);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        
        .file-card:hover .file-download {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
      `}</style>
    </a>
  );
}