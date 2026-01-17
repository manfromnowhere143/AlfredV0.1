'use client';

/**
 * Domain Search Component
 *
 * Premium domain search and purchase interface.
 * Allows users to:
 * 1. Search for available domains
 * 2. See real-time pricing from Vercel
 * 3. Purchase domains (when Vercel payment is configured)
 * 4. Use their own existing domain (BYOD)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DomainSearchProps {
  onDomainSelect: (domain: string, isPurchased: boolean) => void;
  projectId?: string;
  className?: string;
}

interface DomainCheckResult {
  available: boolean;
  domain: string;
  price?: number;
  period?: number;
  error?: string;
}

type SearchState = 'idle' | 'searching' | 'found' | 'unavailable' | 'error';

// Premium TLDs to suggest
const SUGGESTED_TLDS = ['.com', '.io', '.dev', '.app', '.co', '.ai'];

export function DomainSearch({ onDomainSelect, projectId, className = '' }: DomainSearchProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [result, setResult] = useState<DomainCheckResult | null>(null);
  const [suggestions, setSuggestions] = useState<DomainCheckResult[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [mode, setMode] = useState<'search' | 'byod'>('search');
  const [byodDomain, setByodDomain] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Debounced search
  const searchDomain = useCallback(async (domain: string) => {
    if (!domain || domain.length < 3) {
      setState('idle');
      setResult(null);
      setSuggestions([]);
      return;
    }

    // Clean up domain input
    let cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // If no TLD, add .com
    if (!cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.com`;
    }

    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState('searching');
    setResult(null);
    setSuggestions([]);

    try {
      // Check the main domain
      const res = await fetch(`/api/domains/check?domain=${encodeURIComponent(cleanDomain)}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to check domain');
      }

      const data: DomainCheckResult = await res.json();
      setResult(data);
      setState(data.available ? 'found' : 'unavailable');

      // If unavailable, check alternative TLDs
      if (!data.available) {
        const baseName = cleanDomain.split('.')[0];
        const altChecks = SUGGESTED_TLDS
          .filter(tld => !cleanDomain.endsWith(tld))
          .slice(0, 4)
          .map(async (tld) => {
            try {
              const altRes = await fetch(`/api/domains/check?domain=${encodeURIComponent(baseName + tld)}`);
              if (altRes.ok) {
                return await altRes.json();
              }
            } catch {
              return null;
            }
            return null;
          });

        const altResults = await Promise.all(altChecks);
        setSuggestions(altResults.filter((r): r is DomainCheckResult => r !== null && r.available));
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[DomainSearch] Error:', error);
        setState('error');
      }
    }
  }, []);

  // Debounce search input
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchDomain(value), 500);
  }, [searchDomain]);

  // Purchase domain
  const handlePurchase = useCallback(async (domain: string) => {
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/domains/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, projectId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to purchase');
      }

      onDomainSelect(domain, true);
    } catch (error) {
      alert(`Purchase failed: ${(error as Error).message}`);
    } finally {
      setIsPurchasing(false);
    }
  }, [onDomainSelect, projectId]);

  // Use BYOD
  const handleUseBYOD = useCallback(() => {
    if (byodDomain && byodDomain.includes('.')) {
      onDomainSelect(byodDomain.toLowerCase().trim(), false);
    }
  }, [byodDomain, onDomainSelect]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimeout(searchTimeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className={`domain-search ${className}`}>
      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'search' ? 'active' : ''}`}
          onClick={() => setMode('search')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Buy New Domain
        </button>
        <button
          className={`mode-btn ${mode === 'byod' ? 'active' : ''}`}
          onClick={() => setMode('byod')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          I Own a Domain
        </button>
      </div>

      {mode === 'search' ? (
        <>
          {/* Search Input */}
          <div className="search-input-wrapper">
            <div className="search-icon">
              {state === 'searching' ? (
                <div className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search domains to buy..."
              className="search-input"
            />
            {query && (
              <button className="clear-btn" onClick={() => { setQuery(''); setState('idle'); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Result Display */}
          {state === 'found' && result && (
            <div className="result available">
              <div className="result-icon success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="result-info">
                <span className="domain-name">{result.domain}</span>
                <span className="status available">Available for purchase!</span>
              </div>
              <div className="result-action">
                <button
                  className="purchase-btn"
                  onClick={() => {
                    // Show purchase info - full purchase flow requires Vercel payment setup
                    alert(`To use ${result.domain}, you need to purchase it.\n\nPrice: ${result.price ? `$${result.price}/yr` : 'Check Vercel'}\n\nPurchase domains at: vercel.com/domains\n\nOr use "Use My Domain" tab if you already own a domain.`);
                  }}
                >
                  <span className="price">{result.price ? `$${result.price}/yr` : 'Check price'}</span>
                  <span className="buy-text">Buy</span>
                </button>
              </div>
            </div>
          )}

          {state === 'unavailable' && result && (
            <div className="result unavailable">
              <div className="result-icon error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <div className="result-info">
                <span className="domain-name">{result.domain}</span>
                <span className="status unavailable">Not available</span>
              </div>
            </div>
          )}

          {/* Alternative Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions">
              <span className="suggestions-title">Try these instead:</span>
              {suggestions.map((s) => (
                <div key={s.domain} className="suggestion-item">
                  <span className="suggestion-domain">{s.domain}</span>
                  {/* Available domains show price - clicking shows purchase info */}
                  <button
                    type="button"
                    className="suggestion-btn purchase"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Show info that purchase is required
                      alert(`To use ${s.domain}, you need to purchase it.\n\nPrice: ${s.price ? `$${s.price}/yr` : 'Check Vercel'}\n\nPurchase domains at: vercel.com/domains`);
                    }}
                  >
                    {s.price ? `$${s.price}/yr` : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {state === 'error' && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Failed to check domain. Please try again.
            </div>
          )}
        </>
      ) : (
        /* BYOD Mode */
        <div className="byod-section">
          <div className="byod-input-wrapper">
            <input
              type="text"
              value={byodDomain}
              onChange={(e) => setByodDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
              placeholder="mysite.com"
              className="byod-input"
            />
            <button
              className="byod-use-btn"
              onClick={handleUseBYOD}
              disabled={!byodDomain.includes('.')}
            >
              Use Domain
            </button>
          </div>
          <div className="dns-instructions">
            <div className="dns-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>DNS Configuration Required</span>
            </div>
            <div className="dns-steps">
              <p>After deployment, add this CNAME record at your domain provider:</p>
              <code>CNAME → cname.vercel-dns.com</code>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .domain-search {
          --bg: rgba(255,255,255,0.03);
          --border: rgba(255,255,255,0.08);
          --text: rgba(255,255,255,0.9);
          --text-secondary: rgba(255,255,255,0.5);
          --text-muted: rgba(255,255,255,0.25);
          --success: #10b981;
          --error: #ef4444;
          --purple: #8b5cf6;
        }

        .mode-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn:hover {
          border-color: var(--purple);
          color: var(--text);
        }

        .mode-btn.active {
          background: rgba(139,92,246,0.1);
          border-color: var(--purple);
          color: var(--text);
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .search-input-wrapper:focus-within {
          border-color: var(--purple);
        }

        .search-icon {
          padding: 0 12px 0 14px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 14px 12px 14px 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-size: 15px;
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .clear-btn {
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.15s;
        }

        .clear-btn:hover {
          color: var(--text);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(139,92,246,0.3);
          border-top-color: var(--purple);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner.small {
          width: 14px;
          height: 14px;
          border-width: 2px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .result {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          margin-top: 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result.available {
          border-color: rgba(16,185,129,0.3);
          background: rgba(16,185,129,0.05);
        }

        .result.unavailable {
          border-color: rgba(239,68,68,0.3);
          background: rgba(239,68,68,0.05);
        }

        .result-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-icon.success {
          background: rgba(16,185,129,0.15);
          color: var(--success);
        }

        .result-icon.error {
          background: rgba(239,68,68,0.15);
          color: var(--error);
        }

        .result-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .domain-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .status {
          font-size: 12px;
          font-weight: 500;
        }

        .status.available {
          color: var(--success);
        }

        .status.unavailable {
          color: var(--error);
        }

        .purchase-btn, .use-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, var(--purple), #6366f1);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .purchase-btn:hover:not(:disabled), .use-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.4);
        }

        .purchase-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .price {
          padding: 2px 8px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .suggestions {
          margin-top: 16px;
          padding: 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .suggestions-title {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-top: 1px solid var(--border);
        }

        .suggestion-item:first-of-type {
          border-top: none;
        }

        .suggestion-domain {
          font-size: 14px;
          color: var(--text);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .suggestion-btn {
          padding: 6px 12px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 6px;
          color: var(--success);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }

        .suggestion-btn:hover {
          background: rgba(16,185,129,0.2);
          transform: scale(1.02);
        }

        .suggestion-btn:active {
          transform: scale(0.98);
        }

        .suggestion-btn.purchase {
          background: rgba(139,92,246,0.1);
          border-color: rgba(139,92,246,0.3);
          color: var(--purple);
        }

        .suggestion-btn.purchase:hover {
          background: rgba(139,92,246,0.2);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          font-size: 13px;
          color: var(--error);
        }

        /* BYOD Section */
        .byod-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .byod-input-wrapper {
          display: flex;
          gap: 12px;
        }

        .byod-input {
          flex: 1;
          padding: 14px 16px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          font-size: 15px;
          font-family: 'SF Mono', Monaco, monospace;
          outline: none;
          transition: border-color 0.2s;
        }

        .byod-input:focus {
          border-color: var(--purple);
        }

        .byod-input::placeholder {
          color: var(--text-muted);
          font-family: inherit;
        }

        .byod-use-btn {
          padding: 14px 24px;
          background: linear-gradient(135deg, var(--purple), #6366f1);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .byod-use-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139,92,246,0.4);
        }

        .byod-use-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dns-instructions {
          padding: 16px;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px;
        }

        .dns-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(245,158,11,0.9);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .dns-steps {
          color: rgba(245,158,11,0.8);
          font-size: 12px;
          line-height: 1.5;
        }

        .dns-steps p {
          margin: 0 0 8px;
        }

        .dns-steps code {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

export default DomainSearch;
