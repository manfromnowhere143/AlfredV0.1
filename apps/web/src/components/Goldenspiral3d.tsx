'use client';

import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN SPIRAL — Pure CSS/SVG Sacred Geometry (No Three.js Required)
// Floating, slowly rotating, theme-aware
// ═══════════════════════════════════════════════════════════════════════════════

export default function GoldenSpiral3D() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setIsLoaded(true), 100);

    // Theme detection
    const detectTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      setTheme(dataTheme === 'pearl-white' ? 'light' : 'dark');
    };

    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const strokeColor = theme === 'light' ? '#1a1a1a' : '#fafaf8';
  const glowColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  // Golden ratio
  const phi = 1.618033988749;

  return (
    <>
      <div className={`golden-spiral ${isLoaded ? 'loaded' : ''}`}>
        <svg 
          viewBox="0 0 200 200" 
          className="spiral-svg"
        >
          <defs>
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g className="spiral-group" filter="url(#glow)">
            {/* Outer circle */}
            <circle 
              cx="100" 
              cy="100" 
              r="90" 
              fill="none" 
              stroke={strokeColor}
              strokeWidth="0.5"
              opacity="0.3"
            />

            {/* Golden rectangles (nested) */}
            {[0, 1, 2, 3, 4].map((i) => {
              const scale = Math.pow(1/phi, i);
              const size = 140 * scale;
              const offset = 100 - size/2;
              return (
                <rect
                  key={`rect-${i}`}
                  x={offset}
                  y={offset}
                  width={size}
                  height={size / phi}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="0.3"
                  opacity={0.4 - i * 0.06}
                  transform={`rotate(${i * 90}, 100, 100)`}
                />
              );
            })}

            {/* Fibonacci spiral approximation using quarter circles */}
            <path
              d={`
                M 100 30
                A 70 70 0 0 1 170 100
                A 43.3 43.3 0 0 1 126.7 143.3
                A 26.7 26.7 0 0 1 100 116.6
                A 16.5 16.5 0 0 1 116.5 100
                A 10.2 10.2 0 0 1 106.3 89.8
                A 6.3 6.3 0 0 1 100 96.1
              `}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Concentric circles at golden ratio intervals */}
            {[1, 2, 3, 4, 5].map((i) => (
              <circle
                key={`circle-${i}`}
                cx="100"
                cy="100"
                r={70 / Math.pow(phi, i)}
                fill="none"
                stroke={strokeColor}
                strokeWidth="0.3"
                opacity={0.5 - i * 0.08}
              />
            ))}

            {/* Radiating lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={`line-${angle}`}
                x1="100"
                y1="100"
                x2={100 + 85 * Math.cos(angle * Math.PI / 180)}
                y2={100 + 85 * Math.sin(angle * Math.PI / 180)}
                stroke={strokeColor}
                strokeWidth="0.2"
                opacity="0.2"
              />
            ))}

            {/* Center point with glow */}
            <circle
              cx="100"
              cy="100"
              r="3"
              fill={strokeColor}
              opacity="0.8"
            />
            <circle
              cx="100"
              cy="100"
              r="6"
              fill={glowColor}
              className="center-glow"
            />

            {/* Golden dots along spiral */}
            {[0, 1, 2, 3, 4].map((i) => {
              const t = i * 0.2;
              const r = 70 * Math.pow(1/phi, i);
              const angle = i * Math.PI / 2;
              return (
                <circle
                  key={`dot-${i}`}
                  cx={100 + r * Math.cos(angle) * 0.8}
                  cy={100 + r * Math.sin(angle) * 0.8}
                  r={2 - i * 0.3}
                  fill={strokeColor}
                  opacity={0.8 - i * 0.1}
                />
              );
            })}
          </g>
        </svg>
      </div>

      <style jsx>{`
        .golden-spiral {
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .golden-spiral.loaded {
          opacity: 1;
        }
        
        .spiral-svg {
          width: 100%;
          height: 100%;
          animation: float 8s ease-in-out infinite, rotate 30s linear infinite;
        }
        
        .spiral-group {
          transform-origin: center center;
        }
        
        .center-glow {
          animation: pulse 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            r: 6;
          }
          50% {
            opacity: 0.6;
            r: 10;
          }
        }
        
        @media (max-width: 768px) {
          .golden-spiral {
            width: 220px;
            height: 220px;
          }
        }
        
        @media (max-width: 480px) {
          .golden-spiral {
            width: 180px;
            height: 180px;
          }
        }
      `}</style>
    </>
  );
}