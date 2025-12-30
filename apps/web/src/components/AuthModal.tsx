'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTH MODAL — Apple Design Excellence
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Premium authentication experience with:
 * - Smooth container height morphing
 * - Staggered content animations
 * - Spring-based easing curves
 * - Micro-interactions on every element
 * 
 * @version 7.0.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AuthMethod = 'apple' | 'google' | 'email' | 'sso';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (method: AuthMethod, email?: string) => Promise<void> | void;
}

type View = 'main' | 'email' | 'success' | 'coming-soon';
type Loading = 'idle' | 'google' | 'apple' | 'email' | 'sso';

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const IconApple = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 6l10 7 10-7"/>
  </svg>
);

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
  </svg>
);

const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSpinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="spinner">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.15"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const IconLock = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <circle cx="12" cy="16" r="1" fill="currentColor"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

const Logo = () => (
  <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.5" opacity="0.08"/>
    <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="0.75" opacity="0.7"/>
    <circle cx="50" cy="35" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="62.99" cy="42.5" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="62.99" cy="57.5" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="50" cy="65" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="37.01" cy="57.5" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="37.01" cy="42.5" r="15" stroke="currentColor" strokeWidth="0.5" opacity="0.35"/>
    <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.7"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AuthModal({ isOpen, onClose, onSignIn }: AuthModalProps) {
  const [view, setView] = useState<View>('main');
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState<Loading>('idle');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState(false);
  const [comingSoon, setComingSoon] = useState<'apple' | 'sso'>('apple');
  const [mounted, setMounted] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Navigate with animation
  const navigateTo = useCallback((newView: View) => {
    if (animating || newView === view) return;
    setAnimating(true);
    setContentReady(false);
    
    // Brief delay, then switch view
    setTimeout(() => {
      setView(newView);
      // Content ready after view switch
      setTimeout(() => {
        setContentReady(true);
        setAnimating(false);
      }, 50);
    }, 150);
  }, [view, animating]);

  useEffect(() => { setMounted(true); }, []);

  // Initial content ready
  useEffect(() => {
    if (isOpen && !contentReady) {
      const t = setTimeout(() => setContentReady(true), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setView('main');
        setEmail('');
        setEmailError('');
        setTouched(false);
        setLoading('idle');
        setContentReady(false);
        setAnimating(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Focus input
  useEffect(() => {
    if (view === 'email' && contentReady) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [view, contentReady]);

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const validate = useCallback((v: string) => {
    if (!v.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email';
    return '';
  }, []);

  const isValid = email.trim() && !validate(email);

  const handleGoogle = async () => {
    setLoading('google');
    try { await onSignIn('google'); }
    catch (e) { console.error(e); }
    finally { setLoading('idle'); }
  };

  const handleApple = () => {
    setComingSoon('apple');
    navigateTo('coming-soon');
  };

  const handleSSO = () => {
    setComingSoon('sso');
    navigateTo('coming-soon');
  };

  const handleEmailSubmit = async () => {
    const err = validate(email);
    if (err) {
      setEmailError(err);
      setTouched(true);
      return;
    }
    setLoading('email');
    try {
      await onSignIn('email', email.trim());
      navigateTo('success');
    } catch (e) {
      console.error(e);
      setEmailError('Something went wrong');
    } finally {
      setLoading('idle');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`overlay ${isOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        
        <button className="close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>

        {/* Content Container - Morphs height smoothly */}
        <div className="content" ref={contentRef}>
          <div className={`inner ${contentReady ? 'ready' : ''}`}>
            
            {/* ════════════════════════════════════════════════════════════════
                MAIN VIEW
                ════════════════════════════════════════════════════════════════ */}
            {view === 'main' && (
              <div className="view">
                <div className="stagger-1"><div className="logo"><Logo /></div></div>
                <div className="stagger-2"><h1 className="title">Alfred</h1></div>
                <div className="stagger-3"><p className="desc">Sign in to continue</p></div>
                
                <div className="btns">
                  <div className="stagger-4">
                    <button className="btn btn-dark" onClick={handleApple} disabled={loading !== 'idle'}>
                      {loading === 'apple' ? <IconSpinner /> : <IconApple />}
                      <span>Continue with Apple</span>
                      <span className="badge">Soon</span>
                    </button>
                  </div>

                  <div className="stagger-5">
                    <button className="btn btn-light" onClick={handleGoogle} disabled={loading !== 'idle'}>
                      {loading === 'google' ? <IconSpinner /> : <IconGoogle />}
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  <div className="stagger-6">
                    <button className="btn btn-light" onClick={() => navigateTo('email')} disabled={loading !== 'idle'}>
                      <IconEmail />
                      <span>Sign in with email</span>
                    </button>
                  </div>

                  <div className="stagger-7">
                    <button className="link" onClick={handleSSO} disabled={loading !== 'idle'}>
                      Single sign-on (SSO)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                EMAIL VIEW
                ════════════════════════════════════════════════════════════════ */}
            {view === 'email' && (
              <div className="view">
                <div className="stagger-1">
                  <button className="back" onClick={() => navigateTo('main')}>
                    <IconBack />
                    <span>Back</span>
                  </button>
                </div>

                <div className="stagger-2"><h2 className="title-sm">Sign in with email</h2></div>
                <div className="stagger-3"><p className="desc">We'll send you a magic link</p></div>

                <div className="form">
                  <div className="stagger-4">
                    <div className="field">
                      <input
                        ref={inputRef}
                        type="email"
                        className={`input ${touched && emailError ? 'has-error' : ''}`}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (touched) setEmailError(validate(e.target.value));
                        }}
                        onBlur={() => {
                          setTouched(true);
                          setEmailError(validate(email));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                        disabled={loading === 'email'}
                        autoComplete="email"
                        autoCapitalize="off"
                      />
                      {touched && emailError && <p className="error">{emailError}</p>}
                    </div>
                  </div>

                  <div className="stagger-5">
                    <button className="btn btn-dark" onClick={handleEmailSubmit} disabled={loading === 'email' || !isValid}>
                      {loading === 'email' ? <><IconSpinner /><span>Sending...</span></> : <span>Continue</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SUCCESS VIEW
                ════════════════════════════════════════════════════════════════ */}
            {view === 'success' && (
              <div className="view view-center">
                <div className="stagger-1">
                  <div className="success-ring">
                    <div className="success-icon"><IconCheck /></div>
                  </div>
                </div>
                <div className="stagger-2"><h2 className="title-sm">Check your inbox</h2></div>
                <div className="stagger-3">
                  <p className="desc">
                    Magic link sent to<br /><strong>{email}</strong>
                  </p>
                </div>
                <div className="stagger-4"><p className="hint">Click the link to sign in. Expires in 10 min.</p></div>
                <div className="stagger-5">
                  <button className="btn btn-light" onClick={() => navigateTo('email')}>
                    Use different email
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                COMING SOON VIEW
                ════════════════════════════════════════════════════════════════ */}
            {view === 'coming-soon' && (
              <div className="view view-center">
                <div className="stagger-1">
                  <div className="soon-box">
                    {comingSoon === 'apple' ? <IconApple /> : <IconLock />}
                  </div>
                </div>
                <div className="stagger-2"><h2 className="title-sm">Coming Soon</h2></div>
                <div className="stagger-3">
                  <p className="desc">
                    {comingSoon === 'apple' ? 'Apple Sign In' : 'Enterprise SSO'} is coming soon.<br />
                    Use Google or email for now.
                  </p>
                </div>
                <div className="stagger-4">
                  <button className="btn btn-dark" onClick={() => navigateTo('main')}>
                    Back to sign in
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="footer">
          <a href="/privacy">Privacy</a>
          <span>·</span>
          <a href="/terms">Terms</a>
        </div>
      </div>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════════════
           OVERLAY
           ═══════════════════════════════════════════════════════════════════════ */
        
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.35s ease, visibility 0.35s ease;
        }
        
        .overlay.open {
          opacity: 1;
          visibility: visible;
        }

        @media (min-width: 640px) {
          .overlay { align-items: center; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           MODAL
           ═══════════════════════════════════════════════════════════════════════ */
        
        .modal {
          position: relative;
          width: 100%;
          max-width: 100%;
          background: #fff;
          border-radius: 20px 20px 0 0;
          transform: translateY(100%);
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          will-change: transform;
        }

        .modal.open {
          transform: translateY(0);
        }

        @media (min-width: 640px) {
          .modal {
            max-width: 380px;
            border-radius: 20px;
            transform: translateY(20px) scale(0.96);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), 
                        opacity 0.35s ease;
          }

          .modal.open {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @media (prefers-color-scheme: dark) {
          .modal { background: #0a0a0a; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CLOSE
           ═══════════════════════════════════════════════════════════════════════ */
        
        .close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.04);
          border: none;
          border-radius: 50%;
          color: rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close:hover {
          background: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.6);
        }

        .close:active { transform: scale(0.9); }

        @media (prefers-color-scheme: dark) {
          .close {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.35);
          }
          .close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           CONTENT - Smooth Height Morphing
           ═══════════════════════════════════════════════════════════════════════ */
        
        .content {
          overflow: hidden;
        }

        .inner {
          padding: 40px 28px 20px;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .inner.ready {
          opacity: 1;
          transform: translateY(0);
        }

        .view {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .view-center {
          padding-top: 12px;
          padding-bottom: 8px;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           STAGGERED ANIMATIONS — The Magic
           ═══════════════════════════════════════════════════════════════════════ */
        
        .stagger-1, .stagger-2, .stagger-3, .stagger-4, 
        .stagger-5, .stagger-6, .stagger-7 {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .inner.ready .stagger-1 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 0ms;
        }
        .inner.ready .stagger-2 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 40ms;
        }
        .inner.ready .stagger-3 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 80ms;
        }
        .inner.ready .stagger-4 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 120ms;
        }
        .inner.ready .stagger-5 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 160ms;
        }
        .inner.ready .stagger-6 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 200ms;
        }
        .inner.ready .stagger-7 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 240ms;
        }

        /* ═══════════════════════════════════════════════════════════════════════
           TYPOGRAPHY
           ═══════════════════════════════════════════════════════════════════════ */
        
        .logo {
          color: #000;
          margin-bottom: 8px;
          opacity: 0.9;
        }

        .title {
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.04em;
          color: #000;
        }

        .title-sm {
          margin: 8px 0 0;
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: #000;
          text-align: center;
        }

        .desc {
          margin: 6px 0 22px;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.4);
          text-align: center;
          line-height: 1.5;
        }

        .desc strong {
          color: #000;
          font-weight: 500;
        }

        .hint {
          margin: 0 0 18px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.3);
          text-align: center;
        }

        @media (prefers-color-scheme: dark) {
          .logo { color: #fff; }
          .title, .title-sm { color: #fff; }
          .desc { color: rgba(255, 255, 255, 0.45); }
          .desc strong { color: #fff; }
          .hint { color: rgba(255, 255, 255, 0.3); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           BUTTONS
           ═══════════════════════════════════════════════════════════════════════ */
        
        .btns {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 18px;
          border: none;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .btn:active:not(:disabled) { 
          transform: scale(0.97); 
        }

        .btn-dark {
          background: #000;
          color: #fff;
        }

        .btn-dark:hover:not(:disabled) {
          background: #1a1a1a;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-light {
          background: rgba(0, 0, 0, 0.04);
          color: #000;
        }

        .btn-light:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.08);
        }

        @media (prefers-color-scheme: dark) {
          .btn-dark {
            background: #fff;
            color: #000;
          }
          .btn-dark:hover:not(:disabled) {
            background: #f0f0f0;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
          }

          .btn-light {
            background: rgba(255, 255, 255, 0.07);
            color: #fff;
          }
          .btn-light:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.12);
          }
        }

        .badge {
          position: absolute;
          right: 12px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
        }

        @media (prefers-color-scheme: dark) {
          .badge { background: rgba(0, 0, 0, 0.2); }
        }

        .link {
          width: 100%;
          padding: 10px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .link:hover:not(:disabled) { color: rgba(0, 0, 0, 0.6); }
        .link:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (prefers-color-scheme: dark) {
          .link { color: rgba(255, 255, 255, 0.35); }
          .link:hover:not(:disabled) { color: rgba(255, 255, 255, 0.6); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           BACK
           ═══════════════════════════════════════════════════════════════════════ */
        
        .back {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px 0;
          margin-bottom: 4px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: color 0.2s ease, transform 0.2s ease;
        }

        .back:hover { 
          color: #000; 
        }
        
        .back:active {
          transform: translateX(-2px);
        }

        @media (prefers-color-scheme: dark) {
          .back { color: rgba(255, 255, 255, 0.35); }
          .back:hover { color: #fff; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FORM
           ═══════════════════════════════════════════════════════════════════════ */
        
        .form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.03);
          border: 1.5px solid transparent;
          border-radius: 12px;
          font-family: inherit;
          font-size: 15px;
          color: #000;
          outline: none;
          transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          -webkit-appearance: none;
        }

        .input:focus {
          background: #fff;
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.03);
        }

        .input.has-error {
          border-color: rgba(0, 0, 0, 0.25);
        }

        .input::placeholder { color: rgba(0, 0, 0, 0.25); }
        .input:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (prefers-color-scheme: dark) {
          .input {
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
          }
          .input:focus {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.03);
          }
          .input.has-error {
            border-color: rgba(255, 255, 255, 0.35);
          }
          .input::placeholder { color: rgba(255, 255, 255, 0.25); }
        }

        .error {
          margin: 0;
          padding-left: 2px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
        }

        @media (prefers-color-scheme: dark) {
          .error { color: rgba(255, 255, 255, 0.45); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SUCCESS
           ═══════════════════════════════════════════════════════════════════════ */
        
        .success-ring {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          border-radius: 50%;
          margin-bottom: 14px;
        }

        .success-icon {
          color: #fff;
        }

        .inner.ready .success-icon {
          animation: checkDraw 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.15s both;
        }

        @keyframes checkDraw {
          0% { 
            transform: scale(0.5); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.1); 
          }
          100% { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        @media (prefers-color-scheme: dark) {
          .success-ring { background: #fff; }
          .success-icon { color: #000; }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           COMING SOON
           ═══════════════════════════════════════════════════════════════════════ */
        
        .soon-box {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 14px;
          color: rgba(0, 0, 0, 0.35);
          margin-bottom: 14px;
        }

        @media (prefers-color-scheme: dark) {
          .soon-box {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.45);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════════════════════════ */
        
        .footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px 22px;
          border-top: 1px solid rgba(0, 0, 0, 0.04);
        }

        .footer a {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.25);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer a:hover { color: rgba(0, 0, 0, 0.5); }

        .footer span {
          color: rgba(0, 0, 0, 0.12);
          font-size: 10px;
        }

        @media (prefers-color-scheme: dark) {
          .footer { border-top-color: rgba(255, 255, 255, 0.06); }
          .footer a { color: rgba(255, 255, 255, 0.25); }
          .footer a:hover { color: rgba(255, 255, 255, 0.5); }
          .footer span { color: rgba(255, 255, 255, 0.12); }
        }

        @media (max-width: 639px) {
          .footer { padding-bottom: max(22px, env(safe-area-inset-bottom)); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           SPINNER
           ═══════════════════════════════════════════════════════════════════════ */
        
        :global(.spinner) {
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ═══════════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════════ */
        
        @media (prefers-reduced-motion: reduce) {
          .overlay, .modal, .inner, .btn, .input, .close, .back,
          .stagger-1, .stagger-2, .stagger-3, .stagger-4, 
          .stagger-5, .stagger-6, .stagger-7 {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}