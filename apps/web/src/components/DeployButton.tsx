'use client';

import React, { useState } from 'react';
import { DeploymentCard } from './DeploymentCard';

interface DeployButtonProps {
  artifactId: string;
  artifactTitle: string;
  artifactCode: string;
  onDeployed?: (url: string) => void;
  variant?: 'header' | 'standalone';
}

export function DeployButton({ 
  artifactId, 
  artifactTitle, 
  artifactCode,
  onDeployed,
  variant = 'header'
}: DeployButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button 
        className={`deploy-btn ${variant}`}
        onClick={() => setShowModal(true)}
        title="Deploy to web"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        {variant === 'standalone' && <span>Deploy</span>}
      </button>

      {showModal && (
        <DeploymentCard
          artifactId={artifactId}
          artifactTitle={artifactTitle}
          artifactCode={artifactCode}
          onClose={() => setShowModal(false)}
          onDeployed={(url) => {
            onDeployed?.(url);
          }}
        />
      )}

      <style jsx>{`
        .deploy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          font-weight: 500;
        }

        .deploy-btn.header {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--btn-bg, rgba(0,0,0,0.04));
          border: 1px solid var(--border, rgba(0,0,0,0.08));
          color: var(--text-secondary, rgba(0,0,0,0.5));
        }
        .deploy-btn.header:hover {
          color: var(--text, rgba(0,0,0,0.85));
          background: var(--btn-bg-hover, rgba(0,0,0,0.08));
          border-color: var(--border-hover, rgba(0,0,0,0.15));
        }

        .deploy-btn.standalone {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.08);
        }
        .deploy-btn.standalone:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.12);
        }

        :global([data-theme="light"]) .deploy-btn.standalone {
          background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
          color: white;
        }
        :global([data-theme="dark"]) .deploy-btn.standalone {
          background: linear-gradient(135deg, #fff 0%, #e5e5e5 100%);
          color: black;
        }
      `}</style>
    </>
  );
}

export default DeployButton;