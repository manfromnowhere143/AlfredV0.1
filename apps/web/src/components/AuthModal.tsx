'use client';

import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (method: 'apple' | 'google' | 'email' | 'sso', email?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH MODAL — Perplexity Style, Slides from Bottom
// ═══════════════════════════════════════════════════════════════════════════════

export default function AuthModal({ isOpen, onClose, onSignIn }: AuthModalProps) {
  const [view, setView] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('main');
        setEmail('');
      }, 300);
    }
  }, [isOpen]);

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    await onSignIn('email', email);
    setIsLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`auth-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`auth-modal ${isOpen ? 'open' : ''}`}>
        {/* Close Button */}
        <button className="auth-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content */}
        <div className="auth-content">
          {view === 'main' ? (
            <>
              {/* Flower of Life Sacred Geometry Logo */}
              <div className="auth-logo">
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                  {/* Outer circle */}
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                  
                  {/* Center circle */}
                  <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1.2" opacity="0.9"/>
                  
                  {/* Six surrounding circles (Flower of Life pattern) */}
                  <circle cx="50" cy="35" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  <circle cx="62.99" cy="42.5" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  <circle cx="62.99" cy="57.5" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  <circle cx="50" cy="65" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  <circle cx="37.01" cy="57.5" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  <circle cx="37.01" cy="42.5" r="15" stroke="currentColor" strokeWidth="1" opacity="0.7"/>
                  
                  {/* Second ring of circles */}
                  <circle cx="50" cy="20" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="75.98" cy="35" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="75.98" cy="65" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="50" cy="80" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="24.02" cy="65" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  <circle cx="24.02" cy="35" r="15" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
                  
                  {/* Center dot */}
                  <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.9"/>
                </svg>
              </div>

              <h1 className="auth-title">Alfred</h1>
              <p className="auth-subtitle">Create an account for free</p>

              {/* Auth Buttons */}
              <div className="auth-buttons">
                <button 
                  className="auth-btn auth-btn-apple"
                  onClick={() => onSignIn('apple')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>Continue with Apple</span>
                </button>

                <button 
                  className="auth-btn auth-btn-google"
                  onClick={() => onSignIn('google')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button 
                  className="auth-btn auth-btn-email"
                  onClick={() => setView('email')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M2 6l10 7 10-7" />
                  </svg>
                  <span>Sign in with email</span>
                </button>

                <button 
                  className="auth-btn-sso"
                  onClick={() => onSignIn('sso')}
                >
                  Single sign-on (SSO)
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Email View */}
              <button className="auth-back" onClick={() => setView('main')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Back</span>
              </button>

              <h2 className="auth-title-sm">Sign in with email</h2>
              <p className="auth-subtitle">Enter your email to receive a magic link</p>

              <div className="auth-email-form">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                  autoFocus
                />
                <button 
                  className="auth-submit"
                  onClick={handleEmailSubmit}
                  disabled={!email.trim() || isLoading}
                >
                  {isLoading ? 'Sending...' : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <a href="/privacy" className="auth-link">Privacy policy</a>
          <a href="/terms" className="auth-link">Terms of service</a>
        </div>
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* BACKDROP                                                                        */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        
        .auth-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* MODAL — Slides from Bottom                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-modal {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 90vh;
          background: #ffffff;
          border-radius: 24px 24px 0 0;
          z-index: 201;
          transform: translateY(100%);
          pointer-events: none;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .auth-modal.open {
          transform: translateY(0);
        }
        
        /* Desktop: center modal */
        @media (min-width: 640px) {
          .auth-modal {
            bottom: auto;
            top: 50%;
            left: 50%;
            right: auto;
            width: 100%;
            max-width: 420px;
            max-height: 85vh;
            border-radius: 24px;
            transform: translate(-50%, -50%) scale(0.95);
            pointer-events: none;
            opacity: 0;
          }
          
          .auth-modal.open {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CLOSE BUTTON                                                                    */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f0f0f0;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: all 0.15s ease;
          z-index: 10;
        }
        
        .auth-close:hover {
          background: #e5e5e5;
          color: #333;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* CONTENT                                                                         */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-content {
          padding: 48px 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .auth-logo {
          color: #1a9a8a;
          margin-bottom: 16px;
        }
        
        .auth-title {
          font-size: 32px;
          font-weight: 500;
          color: #1a1a1a;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        
        .auth-title-sm {
          font-size: 24px;
          font-weight: 500;
          color: #1a1a1a;
          margin: 24px 0 8px;
          letter-spacing: -0.01em;
        }
        
        .auth-subtitle {
          font-size: 15px;
          color: #666;
          margin: 0 0 32px;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* BUTTONS                                                                         */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-buttons {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .auth-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .auth-btn-apple {
          background: #000000;
          color: #ffffff;
        }
        
        .auth-btn-apple:hover {
          background: #1a1a1a;
        }
        
        .auth-btn-google {
          background: #f5f5f5;
          color: #1a1a1a;
        }
        
        .auth-btn-google:hover {
          background: #ebebeb;
        }
        
        .auth-btn-email {
          background: #f5f5f5;
          color: #1a1a1a;
        }
        
        .auth-btn-email:hover {
          background: #ebebeb;
        }
        
        .auth-btn-sso {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          color: #1a9a8a;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }
        
        .auth-btn-sso:hover {
          opacity: 0.8;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* BACK BUTTON                                                                     */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-back {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 0;
          background: transparent;
          border: none;
          color: #666;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        
        .auth-back:hover {
          color: #1a1a1a;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* EMAIL FORM                                                                      */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-email-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 24px;
        }
        
        .auth-input {
          width: 100%;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          background: #ffffff;
          font-size: 15px;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        .auth-input:focus {
          border-color: #1a9a8a;
          box-shadow: 0 0 0 3px rgba(26, 154, 138, 0.1);
        }
        
        .auth-input::placeholder {
          color: #999;
        }
        
        .auth-submit {
          width: 100%;
          padding: 16px 24px;
          border-radius: 12px;
          background: #1a9a8a;
          border: none;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .auth-submit:hover:not(:disabled) {
          background: #168a7c;
        }
        
        .auth-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        /* FOOTER                                                                          */
        /* ═══════════════════════════════════════════════════════════════════════════════ */
        
        .auth-footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 32px 32px;
          border-top: 1px solid #f0f0f0;
        }
        
        .auth-link {
          font-size: 13px;
          color: #666;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        
        .auth-link:hover {
          color: #1a1a1a;
        }
      `}</style>
    </>
  );
}