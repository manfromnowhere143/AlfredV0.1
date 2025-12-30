'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHECK EMAIL PAGE — Beautiful Verification Waiting Screen
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Shown after user requests magic link. Apple-level polish.
 * Place at: apps/web/src/app/auth/check-email/page.tsx
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CheckEmailPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`check-email-container ${mounted ? 'visible' : ''}`}>
      <div className="card">
        {/* Animated Email Icon */}
        <div className="icon-wrapper">
          <div className="icon-bg" />
          <svg 
            className="icon" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 6l10 7 10-7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="title">Check your inbox</h1>

        {/* Description */}
        <p className="description">
          We sent you a magic link to sign in.<br />
          Click the link in your email to continue.
        </p>

        {/* Hint */}
        <p className="hint">
          Didn&apos;t receive it? Check your spam folder.
        </p>

        {/* Back Link */}
        <Link href="/" className="back-link">
          ← Back to sign in
        </Link>
      </div>

      <style jsx>{`
        .check-email-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--background, #fafafa);
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .check-email-container.visible {
          opacity: 1;
        }

        .card {
          width: 100%;
          max-width: 380px;
          background: var(--card-bg, #fff);
          border-radius: 20px;
          padding: 48px 40px;
          text-align: center;
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.04),
            0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .icon-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          margin-bottom: 24px;
        }

        .icon-bg {
          position: absolute;
          inset: 0;
          background: var(--icon-bg, #f5f5f7);
          border-radius: 16px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }

        .icon {
          position: relative;
          color: var(--text-primary, #1a1a1a);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .title {
          margin: 0 0 12px;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #1a1a1a);
          letter-spacing: -0.02em;
        }

        .description {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary, #6e6e73);
        }

        .hint {
          margin: 0 0 24px;
          font-size: 13px;
          color: var(--text-tertiary, #86868b);
        }

        .back-link {
          display: inline-block;
          font-size: 14px;
          font-weight: 500;
          color: var(--accent, #0066cc);
          text-decoration: none;
          transition: opacity 0.2s ease;
        }

        .back-link:hover {
          opacity: 0.7;
        }

        /* Dark mode support */
        :global([data-theme="dark"]) .check-email-container,
        :global([data-theme="obsidian-black"]) .check-email-container {
          --background: #000;
          --card-bg: #1a1a1a;
          --icon-bg: rgba(255, 255, 255, 0.06);
          --text-primary: #fff;
          --text-secondary: rgba(255, 255, 255, 0.6);
          --text-tertiary: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}