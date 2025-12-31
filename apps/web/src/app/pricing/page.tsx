'use client';

/**
 * PRICING PAGE — Uses Alfred Design System
 * Mobile: Compact elegant cards that fit ONE screen perfectly
 */

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Explore Alfred',
    features: ['17K tokens/day', 'Basic chat', 'File uploads', 'Artifacts'],
    shortFeature: '17K tokens/day',
    cta: 'Current Plan',
    highlight: false,
    comingSoon: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    period: 'month',
    description: 'Build with power',
    features: ['67K tokens/day', 'Architecture mode', 'Priority support', '4x more usage'],
    shortFeature: '67K tokens/day',
    cta: 'Upgrade',
    highlight: true,
    comingSoon: false,
  },
  {
    id: 'enterprise',
    na: 'Enterprise',
    price: 50,
    period: 'month',
    description: 'Deploy to production',
    features: ['Unlimited tokens', 'Production deploy', 'API access', 'White-glove support'],
    shortFeature: 'Unlimited',
    cta: 'Coming Soon',
    highlight: false,
    comingSoon: true,
  },
];

function PricingContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const canceled = searchParams.get('canceled');
  const currentPlan = (session?.user as any)?.tier || 'free';

  useEffect(() => { setMounted(true); }, []);

  const handleSubscribe = async (planId: string) => {
    if (!session) { router.push('/?auth=true'); return; }
    if (planId === 'free') return;
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pricing-page">
      <nav className="nav">
        <button onClick={() => router.push('/')} className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="back-text">Back</span>
        </button>
      </nav>

      <main className="main">
        <header className={`header ${mounted ? 'visible' : ''}`}>
          <p className="tagline">Start free, upgrade when you're ready</p>
          {canceled && <p className="canceled">Checkout canceled</p>}
        </header>

        <div className={`plans ${mounted ? 'visible' : ''}`}>
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            const isDisabled = plan.comingSoon || isCurrentPlan || isLoading;
            return (
              <article key={plan.id} className={`plan ${plan.highlight ? 'highlight' : ''} ${plan.comingSoon ? 'coming-soon' : ''}`} style={{ animationDelay: `${index * 100}ms` }}>
                {plan.highlight && <div className="highlight-border" />}
                {plan.comingSoon && <div className="coming-soon-badge">Soon</div>}
                <div className="plan-top">
                  <h2 className="plan-name">{plan.name}</h2>
                  <p className="plan-desc">{plan.description}</p>
                </div>
                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="amount">{plan.price}</span>
                  <span className="period">/{plan.period}</span>
                </div>
                {/* Desktop features */}
                <ul className="features desktop-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <svg className="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {/* Mobile: single key feature */}
                <div className="mobile-feature">{plan.shortFeature}</div>
                <button className={`cta ${plan.highlight ? 'primary' : ''} ${isDisabled ? 'disabled' : ''}`} onClick={() => !plan.comingSoon && handleSubscribe(plan.id)} disabled={isDisabled}>
                  {isLoading ? <span className="spinner" /> : isCurrentPlan ? 'Current' : plan.cta}
                </button>
              </article>
            );
          })}
        </div>

        <footer className={`footer ${mounted ? 'visible' : ''}`}>
          <p>Secure payments by Stripe</p>
        </footer>
      </main>

      <style jsx>{`
        /* ═══════════════════════════════════════════════════════════════
           DESKTOP — Unchanged
           ═══════════════════════════════════════════════════════════════ */
        .pricing-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-void, #000000);
          color: var(--text-primary, #fff);
          position: relative;
        }

        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 24px 32px;
          z-index: 100;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
     t-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
        }

        .back-btn:hover {
          border-color: var(--border-default, rgba(255,255,255,0.25));
          color: var(--text-primary, #fff);
        }

        .main {
          max-width: 960px;
          margin: 0 auto;
          padding: 140px 24px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .header {
          text-align: center;
          margin-bottom: 56px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .header.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .tagline {
          font-size: 15px;
          color: var(--text-primary, #fff);
          margin: 0;
        }

        .canceled {
          margin-top: 16px;
          font-size: 13px;
          color: var(--text-muted, rgba(255,255,255,0.6));
        }

        .plans {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          width: 100%;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
        }

        .plans.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .plan {
          position: relative;
          background: var(--bg-surface, #0a0a0a);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }

        .plan:hover {
          background: var(--bg-elevated, #0f0f0f);
          border-color: var(--border-default, rgba(255,255,255,0.1));
        }

        .plan.highlight {
          background: var(--bg-card, #111115);
          border-color: var(--border-default, rgba(255,255,255,0.15));
        }

        .plan.highlight:hover {
          border-color: var(--accent-gold, rgba(201, 185, 154, 0.4));
        }

        .plan.coming-soon {
          opacity: 0.6;
        }

        .plan.coming-soon:hover {
          opacity: 0.7;
        }

        .highlight-border {
          position: absolute;
          top: -1px;
          left: 20%;
          right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-gold, rgba(201, 185, 154, 0.6)), transparent);
        }

        .coming-soon-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          background: var(--bg-elevated, rgba(255,255,255,0.1));
          border-radius: 6px;
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted, rgba(255,255,255,0.6));
          text-transform: uppercase;
        }

        .plan-top {
          margin-bottom: 20px;
        }

        .plan-name {
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 6px;
        }

        .plan-desc {
          font-size: 13px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          margin: 0;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 24px;
        }

        .currency {
          font-size: 18px;
          color: var(--text-muted, rgba(255,255,255,0.5));
          margin-right: 2px;
        }

        .amount {
          font-size: 42px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .period {
          font-size: 13px;
          color: var(--text-muted, rgba(255,255,255,0.35));
          margin-left: 4px;
        }

        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          flex: 1;
        }

        .features li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 13px;
          color: var(--text-secondary, rgba(255,255,255,0.7));
        }

        .features :global(.check-icon) {
          color: var(--accent-gold, rgba(201, 185, 154, 0.5));
          flex-shrink: 0;
        }

        .mobile-feature {
          display: none;
        }

        .cta {
          width: 100%;
          padding: 12px 20px;
          background: var(--bg-elevated, rgba(255,255,255,0.06));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.1));
          border-radius: 10px;
          color: var(--text-secondary, rgba(255,255,255,0.8));
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cta:hover:not(:disabled) {
          background: var(--bg-card, rgba(255,255,255,0.1));
          border-color: var(--border-default, rgba(255,255,255,0.2));
          color: var(--text-primary, #fff);
        }

        .cta.primary {
          background: var(--text-primary, #fff);
          border-color: var(--text-primary, #fff);
          color: var(--bg-void, #000);
        }

        .cta.primary:hover:not(:disabled) {
          background: var(--text-secondary, rgba(255,255,255,0.9));
          transform: translateY(-1px);
        }

        .cta.disabled {
          background: var(--bg-surface, rgba(255,255,255,0.02));
          border-color: var(--border-subtle, rgba(255,255,255,0.05));
          color: var(--text-muted, rgba(255,255,255,0.25));
          cursor: default;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 1.5px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer {
          margin-top: 48px;
          text-align: center;
          opacity: 0;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
        }

        .footer.visible {
          opacity: 1;
        }

        .footer p {
          font-size: 12px;
          color: var(--text-muted, rgba(255,255,255,0.4));
          margin: 0;
        }

        /* ═══════════════════════════════════════════════════════════════
           MOBILE — Fits perfectly on one screen, no scroll
           ═══════════════════════════════════════════════════════════════ */
        @media (max-width: 800px) {
          .pricing-page {
            position: fixed;
            inset: 0;
            overflow: hidden;
          }
          
          .nav {
            position: absolute;
    
          }

          .main {
            position: absolute;
            inset: 0;
            max-width: none;
            padding: 60px 16px 16px;
            justify-content: center;
            box-sizing: border-box;
          }

          .header {
            margin-bottom: 20px;
          }
          
          .tagline {
            font-size: 13px;
            opacity: 0.8;
          }

          .plans {
            grid-template-columns: 1fr;
            gap: 8px;
            width: 100%;
          }

          .plan {
            padding: 12px 14px;
            border-radius: 12px;
            flex-direction: row;
            align-items: center;
          }

          .highlight-border {
            display: none;
          }

          .coming-soon-badge {
            position: static;
            padding: 2px 6px;
            font-size: 8px;
            margin-left: auto;
            margin-right: 8px;
          }

          .plan-top {
            margin-bottom: 0;
            flex-shrink: 0;
          }

          .plan-name {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 0;
          }

          .plan-desc {
            display: none;
          }

          .plan-price {
            margin: 0 0 0 auto;
            padding-right: 12px;
          }

          .currency {
            font-size: 12px;
          }

          .amount {
            font-size: 20px;
          }

          .period {
            font-size: 9px;
          }

          .desktop-features {
            display: none;
          }

          .mobile-feature {
            display: block;
            font-size: 11px;
            color: var(--text-muted, rgba(255,255,255,0.5));
            padding: 0 12px;
            white-space: nowrap;
          }

          .cta {
            width: auto;
            padding: 8px 14px;
            font-size: 11px;
            border-radius: 8px;
            flex-shrink: 0;
          }

          .footer {
            margin-top: 16px;
          }

          .footer p {
            font-size: 10px;
            opacity: 0.6;
          }
        }

        /* iPhone SE and small phones */
        @media (max-width: 380px), (max-height: 670px) {
          .main {
            padding: 50px 12px 12px;
          }
          
          .header {
            margin-bottom: 14px;
          }
          
          .tagline {
            font-size: 12px;
          }

          .plans {
            gap: 6px;
          }

          .plan {
            padding: 10px 12px;
          }

          .plan-name {
            font-size: 13px;
          }

          .amount {
            font-size: 18px;
          }

          .mobile-feature {
            font-size: 10px;
            padding: 0 8px;
          }

          .cta {
            padding: 7px 10px;
            font-size: 10px;
          }

          .footer {
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function PricingLoading() {
  return (
    <div style={{ 
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-void, #000)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid rgba(201, 185, 154, 0.15)',
        borderTopColor: 'rgba(201, 185, 154, 0.7)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  );
}
