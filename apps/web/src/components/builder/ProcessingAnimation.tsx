'use client';

/**
 * ProcessingAnimation - State of the Art Preview Loading
 *
 * Shows elegant processing states that make users feel confident.
 * NEVER shows ugly error messages during builds.
 */

import React from 'react';

interface ProcessingAnimationProps {
  status?: string;
  subtitle?: string;
  progress?: number; // 0-100
}

export function ProcessingAnimation({
  status = "Preparing your preview...",
  subtitle,
  progress
}: ProcessingAnimationProps) {
  return (
    <div className="processing-animation">
      {/* Animated cube with orbiting particles */}
      <div className="cube-container">
        <div className="cube">
          <div className="cube-face" />
        </div>

        {/* Orbiting particles */}
        <div className="particle p1" />
        <div className="particle p2" />
        <div className="particle p3" />
        <div className="particle p4" />

        {/* Center icon */}
        <div className="cube-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Status text */}
      <p className="status-text">{status}</p>

      {subtitle && (
        <p className="subtitle-text">{subtitle}</p>
      )}

      {/* Progress bar */}
      <div className="progress-container">
        {progress !== undefined ? (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <div className="progress-bar">
            <div className="progress-indeterminate" />
          </div>
        )}
      </div>

      <style jsx>{`
        .processing-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%);
          padding: 40px;
        }

        .cube-container {
          position: relative;
          width: 96px;
          height: 96px;
          margin-bottom: 32px;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .cube {
          position: absolute;
          inset: 0;
          animation: rotate 8s linear infinite;
          transform-style: preserve-3d;
        }

        @keyframes rotate {
          from { transform: rotateY(0deg) rotateX(10deg); }
          to { transform: rotateY(360deg) rotateX(10deg); }
        }

        .cube-face {
          position: absolute;
          inset: 8px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15));
          border-radius: 16px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          backdrop-filter: blur(8px);
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, #a78bfa, #818cf8);
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.6);
        }

        .p1 { animation: orbit1 4s ease-in-out infinite; }
        .p2 { animation: orbit2 4s ease-in-out infinite 1s; }
        .p3 { animation: orbit3 4s ease-in-out infinite 2s; }
        .p4 { animation: orbit4 4s ease-in-out infinite 3s; }

        @keyframes orbit1 {
          0%, 100% { top: 0; left: 50%; transform: translate(-50%, -50%); }
          25% { top: 50%; left: 100%; }
          50% { top: 100%; left: 50%; }
          75% { top: 50%; left: 0; }
        }

        @keyframes orbit2 {
          0%, 100% { top: 50%; left: 100%; transform: translate(-50%, -50%); }
          25% { top: 100%; left: 50%; }
          50% { top: 50%; left: 0; }
          75% { top: 0; left: 50%; }
        }

        @keyframes orbit3 {
          0%, 100% { top: 100%; left: 50%; transform: translate(-50%, -50%); }
          25% { top: 50%; left: 0; }
          50% { top: 0; left: 50%; }
          75% { top: 50%; left: 100%; }
        }

        @keyframes orbit4 {
          0%, 100% { top: 50%; left: 0; transform: translate(-50%, -50%); }
          25% { top: 0; left: 50%; }
          50% { top: 50%; left: 100%; }
          75% { top: 100%; left: 50%; }
        }

        .cube-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(167, 139, 250, 0.8);
        }

        .status-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .subtitle-text {
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
          margin-bottom: 24px;
        }

        .progress-container {
          width: 200px;
        }

        .progress-bar {
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #6366f1);
          border-radius: 2px;
          transition: width 0.5s ease-out;
        }

        .progress-indeterminate {
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, transparent, #8b5cf6, #6366f1, transparent);
          border-radius: 2px;
          animation: slide 1.5s ease-in-out infinite;
        }

        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

export default ProcessingAnimation;
