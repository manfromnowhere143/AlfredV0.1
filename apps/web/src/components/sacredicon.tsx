'use client';

// ═══════════════════════════════════════════════════════════════════════════════
// SACRED GEOMETRY ICON — Elegant mini symbol
// Used in sign-in button and other UI elements
// ═══════════════════════════════════════════════════════════════════════════════

interface SacredIconProps {
  size?: number;
  className?: string;
}

export default function SacredIcon({ size = 20, className = '' }: SacredIconProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`sacred-icon ${className}`}
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="sacredGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <g filter="url(#sacredGlow)" className="sacred-icon-group">
        {/* Outer circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Inner flower of life - 6 petals */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * Math.PI * 2) / 6;
          const px = cx + Math.cos(angle) * (r * 0.5);
          const py = cy + Math.sin(angle) * (r * 0.5);
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={r * 0.5}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.4"
              opacity="0.5"
            />
          );
        })}
        
        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.5}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.7"
        />
        
        {/* Center dot */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.04}
          fill="currentColor"
          opacity="0.9"
        />
        
        {/* 6 vertex dots */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          return (
            <circle
              key={`dot-${i}`}
              cx={px}
              cy={py}
              r={size * 0.025}
              fill="currentColor"
              opacity="0.6"
            />
          );
        })}
      </g>
      
      <style jsx>{`
        .sacred-icon {
          color: var(--text-primary);
          transition: color 0.4s ease, transform 0.3s ease;
        }
        
        .sacred-icon:hover {
          transform: rotate(30deg);
        }
        
        .sacred-icon-group {
          transition: opacity 0.4s ease;
        }
      `}</style>
    </svg>
  );
}