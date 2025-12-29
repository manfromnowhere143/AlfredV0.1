'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN SPIRAL — Sacred Geometry with Magnetic Particle Explosion
// SVG elegance + Canvas particles, theme-aware, interactive
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = 1.618033988749;

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function GoldenSpiral3D() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExploded, setIsExploded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const isExplodedRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0, isOver: false });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);

    const detectTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      setTheme(dataTheme === 'light' || dataTheme === 'pearl-white' ? 'light' : 'dark');
    };

    detectTheme();

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

  // Initialize particles along the spiral path
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 180;
    const center = size / 2;
    const particles: Particle[] = [];

    // Generate particles along golden spiral
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * 4 * Math.PI;
      const r = 8 * Math.pow(PHI, t / (Math.PI * 2));
      const x = center + r * Math.cos(t);
      const y = center + r * Math.sin(t);
      
      if (r < 70) {
        particles.push({
          x, y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
          size: 1.5 + Math.random() * 1,
          opacity: 0.6 + Math.random() * 0.4,
        });
      }
    }

    // Add particles for golden rectangles
    const rectSizes = [56, 34.6, 21.4, 13.2, 8.2];
    rectSizes.forEach((rectSize, ri) => {
      const h = rectSize / PHI;
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        const side = Math.floor(t * 4);
        const pos = (t * 4) % 1;
        let x = center, y = center;
        
        if (side === 0) { x = center - rectSize/2 + pos * rectSize; y = center - h/2; }
        else if (side === 1) { x = center + rectSize/2; y = center - h/2 + pos * h; }
        else if (side === 2) { x = center + rectSize/2 - pos * rectSize; y = center + h/2; }
        else { x = center - rectSize/2; y = center + h/2 - pos * h; }
        
        // Rotate based on rectangle index
        const angle = ri * Math.PI / 2;
        const dx = x - center;
        const dy = y - center;
        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
        
        particles.push({
          x: center + rx,
          y: center + ry,
          originX: center + rx,
          originY: center + ry,
          vx: 0,
          vy: 0,
          size: 1 + Math.random() * 0.5,
          opacity: 0.3 + Math.random() * 0.2,
        });
      }
    });

    // Add center particles
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const r = 3 + Math.random() * 5;
      particles.push({
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        originX: center + r * Math.cos(angle),
        originY: center + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: 1.5 + Math.random() * 1,
        opacity: 0.8,
      });
    }

    particlesRef.current = particles;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      
      const color = theme === 'light' ? '26, 26, 26' : '250, 250, 248';
      
      particlesRef.current.forEach(p => {
        if (isExplodedRef.current) {
          // Apply velocity
          p.x += p.vx;
          p.y += p.vy;
          
          // Friction
          p.vx *= 0.98;
          p.vy *= 0.98;
          
          // Slight gravity toward center for orbital feel
          const dx = center - p.x;
          const dy = center - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            p.vx += dx * 0.0001;
            p.vy += dy * 0.0001;
          }
          
          // Mouse magnetic repulsion
          if (mouseRef.current.isOver) {
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const mdx = p.x - mx;
            const mdy = p.y - my;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 50 && mDist > 0) {
              const force = (50 - mDist) / 50 * 0.8;
              p.vx += (mdx / mDist) * force;
              p.vy += (mdy / mDist) * force;
            }
          }
          
          // Keep in bounds with bounce
          if (p.x < 5 || p.x > size - 5) p.vx *= -0.5;
          if (p.y < 5 || p.y > size - 5) p.vy *= -0.5;
          p.x = Math.max(5, Math.min(size - 5, p.x));
          p.y = Math.max(5, Math.min(size - 5, p.y));
        } else {
          // Magnetic attraction back to origin
          const dx = p.originX - p.x;
          const dy = p.originY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0.1) {
            p.vx += dx * 0.08;
            p.vy += dy * 0.08;
            p.vx *= 0.85;
            p.vy *= 0.85;
            p.x += p.vx;
            p.y += p.vy;
          } else {
            p.x = p.originX;
            p.y = p.originY;
            p.vx = 0;
            p.vy = 0;
          }
        }
        
        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.fill();
        
        // Subtle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity * 0.15})`;
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [theme]);

  const handleClick = useCallback(() => {
    const newState = !isExplodedRef.current;
    isExplodedRef.current = newState;
    setIsExploded(newState);
    
    if (newState) {
      // Explode particles
      const center = 90;
      particlesRef.current.forEach(p => {
        const angle = Math.atan2(p.y - center, p.x - center) + (Math.random() - 0.5) * 2;
        const force = 2 + Math.random() * 4;
        p.vx = Math.cos(angle) * force;
        p.vy = Math.sin(angle) * force;
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = (e.clientX - rect.left) * (180 / rect.width);
    mouseRef.current.y = (e.clientY - rect.top) * (180 / rect.height);
  }, []);

  const strokeColor = theme === 'light' ? '#1a1a1a' : '#fafaf8';
  const glowColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  return (
    <>
      <div 
        className={`golden-spiral ${isLoaded ? 'loaded' : ''} ${isExploded ? 'exploded' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => { mouseRef.current.isOver = true; }}
        onMouseLeave={() => { mouseRef.current.isOver = false; }}
      >
        {/* SVG Base Layer */}
        <svg 
          viewBox="0 0 200 200" 
          className="spiral-svg"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
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
              r="80" 
              fill="none" 
              stroke={strokeColor}
              strokeWidth="0.3"
              opacity="0.2"
              className="outer-ring"
            />

            {/* Golden rectangles */}
            {[0, 1, 2, 3, 4].map((i) => {
              const scale = Math.pow(1/PHI, i);
              const size = 112 * scale;
              const offset = 100 - size/2;
              return (
                <rect
                  key={`rect-${i}`}
                  x={offset}
                  y={offset}
                  width={size}
                  height={size / PHI}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="0.25"
                  opacity={0.25 - i * 0.04}
                  transform={`rotate(${i * 90}, 100, 100)`}
                  className="golden-rect"
                />
              );
            })}

            {/* Fibonacci spiral */}
            <path
              d={`
                M 100 37
                A 63 63 0 0 1 163 100
                A 39 39 0 0 1 124 139
                A 24 24 0 0 1 100 115
                A 14.8 14.8 0 0 1 114.8 100
                A 9.2 9.2 0 0 1 105.6 90.8
                A 5.7 5.7 0 0 1 100 96.5
              `}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.7"
              className="main-spiral"
            />

            {/* Concentric circles */}
            {[1, 2, 3, 4].map((i) => (
              <circle
                key={`circle-${i}`}
                cx="100"
                cy="100"
                r={63 / Math.pow(PHI, i)}
                fill="none"
                stroke={strokeColor}
                strokeWidth="0.2"
                opacity={0.3 - i * 0.06}
              />
            ))}

            {/* Radiating lines */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={`line-${angle}`}
                x1="100"
                y1="100"
                x2={100 + 75 * Math.cos(angle * Math.PI / 180)}
                y2={100 + 75 * Math.sin(angle * Math.PI / 180)}
                stroke={strokeColor}
                strokeWidth="0.15"
                opacity="0.15"
              />
            ))}

            {/* Center point */}
            <circle
              cx="100"
              cy="100"
              r="2.5"
              fill={strokeColor}
              opacity="0.9"
              className="center-dot"
            />
            <circle
              cx="100"
              cy="100"
              r="5"
              fill={glowColor}
              className="center-glow"
            />
          </g>
        </svg>

        {/* Canvas Particle Layer */}
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="particle-canvas"
        />

        {/* Hint */}
        <p className="spiral-hint">
          {isExploded ? 'click to reform' : 'click to interact'}
        </p>
      </div>

      <style jsx>{`
        .golden-spiral {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 180px;
          height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          z-index: 1;
        }
        
        .golden-spiral.loaded {
          opacity: 1;
        }
        
        .spiral-svg {
          position: absolute;
          width: 180px;
          height: 180px;
          transition: opacity 0.5s ease;
        }
        
        .golden-spiral.exploded .spiral-svg {
          opacity: 0.15;
        }
        
        .spiral-group {
          transform-origin: center center;
          animation: rotate 60s linear infinite;
        }
        
        .golden-spiral.exploded .spiral-group {
          animation: rotate 20s linear infinite;
        }
        
        .center-glow {
          animation: pulse 4s ease-in-out infinite;
        }
        
        .golden-spiral.exploded .center-glow {
          animation: pulse-fast 1s ease-in-out infinite;
        }
        
        .outer-ring {
          animation: breathe 8s ease-in-out infinite;
        }
        
        .particle-canvas {
          position: absolute;
          width: 180px;
          height: 180px;
          pointer-events: none;
        }
        
        .spiral-hint {
          position: absolute;
          bottom: 0;
          font-size: 9px;
          font-family: 'JetBrains Mono', 'SF Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted, rgba(255,255,255,0.2));
          opacity: 0;
          transition: opacity 0.3s ease, color 0.3s ease;
          margin: 0;
        }
        
        .golden-spiral:hover .spiral-hint {
          opacity: 1;
          color: var(--text-secondary, rgba(255,255,255,0.35));
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.02); opacity: 0.3; }
        }
        
        @media (max-width: 768px) {
          .golden-spiral {
            width: 150px;
            height: 170px;
          }
          .spiral-svg, .particle-canvas {
            width: 150px;
            height: 150px;
          }
        }
      `}</style>
    </>
  );
}