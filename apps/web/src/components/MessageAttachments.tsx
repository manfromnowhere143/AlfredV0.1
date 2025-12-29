'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'code';
  name: string;
  size: number;
  url?: string;
  preview?: string;
  duration?: number;
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  isUser?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + secs.toString().padStart(2, '0');
}

function getMediaUrl(attachment: Attachment): string {
  if (attachment.url?.startsWith('http')) return attachment.url;
  if (attachment.preview) return attachment.preview;
  if (attachment.url?.startsWith('/uploads')) return attachment.url;
  if (attachment.id) return '/api/files/serve?id=' + attachment.id;
  return attachment.url || '';
}

function Lightbox({ attachment, onClose, onPrev, onNext, hasPrev, hasNext }: { 
  attachment: Attachment; 
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 350);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, hasPrev, hasNext, onPrev, onNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => { setIsLoaded(false); }, [attachment.id]);

  const mediaUrl = getMediaUrl(attachment);
  const isVideo = attachment.type === 'video';

  return (
    <div className="lightbox-root">
      <div className={'lightbox-backdrop ' + (isClosing ? 'closing' : '')} onClick={handleClose} />
      <div className={'lightbox-container ' + (isClosing ? 'closing' : '')}>
        <div className="lightbox-header">
          <div className="lightbox-info">
            <span className="lightbox-name">{attachment.name}</span>
            <span className="lightbox-meta">{formatFileSize(attachment.size)}</span>
          </div>
          <button className="lightbox-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {hasPrev && onPrev && (
          <button className="lightbox-nav lightbox-nav-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        {hasNext && onNext && (
          <button className="lightbox-nav lightbox-nav-next" onClick={(e) => { e.stopPropagation(); onNext(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <div className="lightbox-media">
          {!isLoaded && <div className="lightbox-loader"><div className="lightbox-spinner" /></div>}
          {isVideo ? (
            <video src={mediaUrl} controls autoPlay playsInline onLoadedData={() => setIsLoaded(true)} className={'lightbox-video ' + (isLoaded ? 'loaded' : '')} />
          ) : (
            <img src={mediaUrl} alt={attachment.name} onLoad={() => setIsLoaded(true)} className={'lightbox-image ' + (isLoaded ? 'loaded' : '')} draggable={false} />
          )}
        </div>
      </div>
      <style jsx>{`
        .lightbox-root { position: fixed; inset: 0; z-index: 10000; }
        .lightbox-backdrop { 
          position: absolute; inset: 0; 
          background: rgba(0,0,0,0.92); 
          backdrop-filter: blur(24px); 
          -webkit-backdrop-filter: blur(24px);
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .lightbox-backdrop.closing { animation: fadeOut 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .lightbox-container { 
          position: absolute; inset: 0; 
          display: flex; flex-direction: column; 
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .lightbox-container.closing { animation: scaleOut 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .lightbox-header { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 16px 20px; 
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent); 
          position: absolute; top: 0; left: 0; right: 0; z-index: 10; 
        }
        .lightbox-info { display: flex; flex-direction: column; gap: 2px; }
        .lightbox-name { font-size: 14px; font-weight: 500; color: #fff; font-family: 'Inter', system-ui, sans-serif; }
        .lightbox-meta { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'SF Mono', monospace; }
        .lightbox-close { 
          width: 40px; height: 40px; border-radius: 50%; 
          background: rgba(255,255,255,0.1); border: none; cursor: pointer; 
          display: flex; align-items: center; justify-content: center; color: #fff; 
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .lightbox-close:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .lightbox-nav { 
          position: absolute; top: 50%; transform: translateY(-50%); 
          width: 48px; height: 48px; border-radius: 50%; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.1); 
          cursor: pointer; display: flex; align-items: center; justify-content: center; 
          color: #fff; z-index: 10; 
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); 
          backdrop-filter: blur(10px); 
        }
        .lightbox-nav:hover { background: rgba(255,255,255,0.2); transform: translateY(-50%) scale(1.05); }
        .lightbox-nav-prev { left: 20px; }
        .lightbox-nav-next { right: 20px; }
        .lightbox-media { flex: 1; display: flex; align-items: center; justify-content: center; padding: 80px 80px 40px; }
        .lightbox-loader { position: absolute; display: flex; align-items: center; justify-content: center; }
        .lightbox-spinner { width: 28px; height: 28px; border: 2px solid rgba(255,255,255,0.1); border-top-color: rgba(255,255,255,0.8); border-radius: 50%; animation: spin 0.7s linear infinite; }
        .lightbox-image, .lightbox-video { 
          max-width: min(90vw, 900px); max-height: min(85vh, 700px); 
          object-fit: contain; border-radius: 8px; 
          opacity: 0; transform: scale(0.97); 
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .lightbox-image.loaded, .lightbox-video.loaded { opacity: 1; transform: scale(1); }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes scaleIn { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes scaleOut { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.97); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .lightbox-media { padding: 60px 16px 24px; }
          .lightbox-nav { width: 40px; height: 40px; }
          .lightbox-nav-prev { left: 12px; }
          .lightbox-nav-next { right: 12px; }
        }
      `}</style>
    </div>
  );
}

function AttachmentThumbnail({ attachment, onClick, index }: { attachment: Attachment; onClick: () => void; index: number; }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const mediaUrl = getMediaUrl(attachment);
  const isVideo = attachment.type === 'video';

  return (
    <button className="thumb-container" onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ animationDelay: index * 40 + 'ms' }}>
      <div className="thumb-media">
        {!isLoaded && !hasError && <div className="thumb-skeleton"><div className="thumb-shimmer" /></div>}
        {hasError ? (
          <div className="thumb-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : isVideo ? (
          <>
            <video src={mediaUrl} onLoadedData={() => setIsLoaded(true)} onError={() => setHasError(true)} muted playsInline className={'thumb-video ' + (isLoaded ? 'loaded' : '')} />
            <div className="thumb-play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg></div>
            {attachment.duration && <span className="thumb-duration">{formatDuration(attachment.duration)}</span>}
          </>
        ) : (
          <img src={mediaUrl} alt={attachment.name} onLoad={() => setIsLoaded(true)} onError={() => setHasError(true)} className={'thumb-image ' + (isLoaded ? 'loaded' : '')} draggable={false} />
        )}
        <div className={'thumb-overlay ' + (isHovered ? 'visible' : '')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <style jsx>{`
        .thumb-container {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 0;
          flex-shrink: 0;
          animation: thumbIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .thumb-container:hover { 
          transform: scale(1.04); 
          border-color: rgba(255,255,255,0.12); 
          box-shadow: 0 8px 24px rgba(0,0,0,0.25); 
        }
        .thumb-container:active { transform: scale(0.98); }
        .thumb-media { position: relative; width: 100%; height: 100%; }
        .thumb-skeleton { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%); overflow: hidden; }
        .thumb-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent); animation: shimmer 1.5s infinite; }
        .thumb-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.25); }
        .thumb-image, .thumb-video { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.35s ease; }
        .thumb-image.loaded, .thumb-video.loaded { opacity: 1; }
        .thumb-play { 
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
          width: 28px; height: 28px; border-radius: 50%; 
          background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); 
          display: flex; align-items: center; justify-content: center; 
          color: #fff; border: 1px solid rgba(255,255,255,0.15); 
          transition: all 0.2s ease; 
        }
        .thumb-container:hover .thumb-play { transform: translate(-50%, -50%) scale(1.08); background: rgba(0,0,0,0.7); }
        .thumb-duration { position: absolute; bottom: 4px; right: 4px; padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,0.7); font-size: 9px; font-weight: 500; color: #fff; font-family: 'SF Mono', monospace; }
        .thumb-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #fff; opacity: 0; transition: opacity 0.2s ease; }
        .thumb-overlay.visible { opacity: 1; }
        @keyframes thumbIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @media (max-width: 768px) {
          .thumb-container { width: 64px; height: 64px; border-radius: 8px; }
          .thumb-play { width: 24px; height: 24px; }
          .thumb-play svg { width: 12px; height: 12px; }
        }
      `}</style>
    </button>
  );
}

export default function MessageAttachments({ attachments, isUser = false }: MessageAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  if (!attachments || attachments.length === 0) return null;

  const mediaAttachments = attachments.filter(a => a.type === 'image' || a.type === 'video');
  if (mediaAttachments.length === 0) return null;

  return (
    <>
      <div className={'attachments-grid ' + (isUser ? 'user' : 'alfred')}>
        {mediaAttachments.map((attachment, index) => (
          <AttachmentThumbnail key={attachment.id} attachment={attachment} onClick={() => setLightboxIndex(index)} index={index} />
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          attachment={mediaAttachments[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => lightboxIndex > 0 && setLightboxIndex(lightboxIndex - 1)}
          onNext={() => lightboxIndex < mediaAttachments.length - 1 && setLightboxIndex(lightboxIndex + 1)}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < mediaAttachments.length - 1}
        />
      )}
      <style jsx>{`
        .attachments-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .attachments-grid.user { justify-content: flex-end; }
        .attachments-grid.alfred { justify-content: flex-start; }
        @media (max-width: 768px) { .attachments-grid { gap: 6px; } }
      `}</style>
    </>
  );
}
