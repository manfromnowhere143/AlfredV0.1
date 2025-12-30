'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRICING PAGE — State-of-the-Art Minimal Design
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Explore Alfred',
    features: [
      '10 messages per day',
      'Basic chat interface',
      'File uploads',
      'Conversation history',
    ],
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
    features: [
      '50 messages per day',
      'Artifact generation',
      'Architecture mode',
      'Priority support',
    ],
    cta: 'Upgrade',
    highlight: true,
    comingSoon: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 50,
    period: 'month',
    description: 'Deploy to production',
    features: [
      'Unlimited messages',
      'Production deployment',
      'API access',
      'White-glove support',
    ],
    cta: 'Coming Soon',
    highlight: false,
    comingSoon: true,
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const canceled = searchParams.get('canceled');
  const currentPlan = (session?.user as any)?.tier || 'free';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      router.push('/?auth=true');
      return;
    }
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
      <div className="bg-gradient" />
      
      <nav className="nav">
        <button onClick={() => router.push('/')} className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </nav>

      <main className="main">
        <header className={`header ${mounted ? 'visible' : ''}`}>
          <p className="tagline">Start free, upgrade when you're ready</p>
          {canceled && (
            <p className="canceled">Checkout canceled — no charges made</p>
          )}
        </header>

        <div className={`plans ${mounted ? 'visible' : ''}`}>
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            const isDisabled = plan.comingSoon || isCurrentPlan || isLoading;

            return (
              <article 
                key={plan.id}
                className={`plan ${plan.highlight ? 'highlight' : ''} ${isCurrentPlan ? 'current' : ''} ${plan.comingSoon ? 'coming-soon' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.highlight && <div className="highlight-border" />}
                {plan.comingSoon && <div className="coming-soon-badge">Coming Soon</div>}
                
                <div className="plan-top">
                  <h2 className="plan-name">{plan.name}</h2>
                  <p className="plan-desc">{plan.description}</p>
                </div>

                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="amount">{plan.price}</span>
                  <span className="period">/{plan.period}</span>
                </div>

                <ul className="features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`cta ${plan.highlight ? 'primary' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !plan.comingSoon && handleSubscribe(plan.id)}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <span className="spinner" />
                  ) : isCurrentPlan ? (
                    'Current'
                  ) : (
                    plan.cta
                  )}
                </button>
              </article>
            );
          })}
        </div>

        <footer className={`footer ${mounted ? 'visible' : ''}`}>
          <p>Secure payments by Stripe · Cancel anytime</p>
        </footer>
      </main>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: #000;
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }

        .bg-gradient {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 100% 100% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 50%);
          pointer-events: none;
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
          gap: 8px;
          padding: 8px 14px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
        }

        .back-btn:hover {
          border-color: rgba(255,255,255,0.25);
          color: #fff;
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
          font-weight: 400;
          color: #fff;
          letter-spacing: 0.02em;
          margin: 0;
        }

        .canceled {
          margin-top: 16px;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
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

        @media (max-width: 800px) {
          .plans {
            grid-template-columns: 1fr;
            max-width: 340px;
          }
        }

        .plan {
          position: relative;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
        }

        .plan:hover {
          background: rgba(255,255,255,0.035);
          border-color: rgba(255,255,255,0.1);
        }

        .plan.highlight {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.15);
        }

        .plan.highlight:hover {
          border-color: rgba(255,255,255,0.25);
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        }

        .coming-soon-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .plan-top {
          margin-bottom: 20px;
        }

        .plan-name {
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }

        .plan-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          font-weight: 400;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 24px;
        }

        .currency {
          font-size: 18px;
          font-weight: 400;
          color: rgba(255,255,255,0.5);
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
          color: rgba(255,255,255,0.35);
          margin-left: 4px;
          font-weight: 400;
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
          color: rgba(255,255,255,0.7);
          font-weight: 400;
        }

        .features svg {
          color: rgba(255,255,255,0.35);
          flex-shrink: 0;
        }

        .cta {
          width: 100%;
          padding: 12px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.01em;
        }

        .cta:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: #fff;
        }

        .cta.primary {
          background: #fff;
          border-color: #fff;
          color: #000;
        }

        .cta.primary:hover:not(:disabled) {
          background: rgba(255,255,255,0.9);
          transform: translateY(-1px);
        }

        .cta.disabled {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.25);
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
          color: rgba(255,255,255,0.8);
          margin: 0;
          letter-spacing: 0.02em;
        }

        @media (max-width: 640px) {
          .main {
            padding: 120px 20px 60px;
          }

          .nav {
            padding: 20px;
          }

          .plan {
            padding: 24px 20px;
          }

          .amount {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
}