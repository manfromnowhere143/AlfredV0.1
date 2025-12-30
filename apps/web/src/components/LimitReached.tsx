'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LimitReachedProps {
  limitType: 'daily' | 'monthly';
  resetIn?: number;
  onDismiss?: () => void;
}

export default function LimitReached({ limitType, resetIn, onDismiss }: LimitReachedProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(resetIn || 0);
  
  useEffect(() => {
    if (!resetIn || limitType !== 'daily') return;
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetIn, limitType]);
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  
  return (
    <div className="limit-overlay">
      <div className="limit-card">
        <div className="limit-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="limit-title">
          {limitType === 'daily' ? 'Daily limit reached' : 'Monthly limit reached'}
        </h2>
        <p className="limit-message">
          {limitType === 'daily' ? (
            <>You've used your daily tokens.{countdown > 0 && <span className="reset-time"> Resets in <strong>{formatTime(countdown)}</strong></span>}</>
          ) : "You've used your monthly allocation."}
        </p>
        <div className="usage-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span>Pro users get 4x more tokens</span>
        </div>
        <div className="limit-actions">
          <button className="btn-primary" onClick={() => router.push('/pricing')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Upgrade to Pro
          </button>
          {onDismiss && <button className="btn-secondary" onClick={onDismiss}>Maybe later</button>}
        </div>
      </div>
      <style jsx>{`
        .limit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .limit-card { background: linear-gradient(145deg, rgba(20,20,20,0.98), rgba(10,10,10,0.99)); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px; max-width: 380px; width: 100%; text-align: center; animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .limit-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: rgba(255,255,255,0.05); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); }
        .limit-title { font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 8px; }
        .limit-message { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 20px; line-height: 1.5; }
        .reset-time { display: block; margin-top: 8px; color: rgba(255,255,255,0.8); }
        .reset-time strong { color: #fff; }
        .usage-hint { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(255,255,255,0.04); border-radius: 10px; margin-bottom: 24px; color: rgba(201,185,154,0.8); }
        .usage-hint span { font-size: 12px; color: rgba(255,255,255,0.7); }
        .limit-actions { display: flex; flex-direction: column; gap: 10px; }
        .btn-primary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 24px; background: #fff; border: none; border-radius: 12px; color: #000; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .btn-primary:hover { background: rgba(255,255,255,0.9); transform: translateY(-1px); }
        .btn-secondary { padding: 12px 24px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer; transition: all 0.2s ease; }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
      `}</style>
    </div>
  );
}
