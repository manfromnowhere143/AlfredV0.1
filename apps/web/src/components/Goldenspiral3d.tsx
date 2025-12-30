'use client';

import { useEffect, useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN SPIRAL — Ethereal Flowing Particles
// Perplexity-inspired elegance with golden ratio mathematics
// ═══════════════════════════════════════════════════════════════════════════════

const PHI = 1.618033988749;
const TAU = Math.PI * 2;

interface FlowParticle {
  t: number;
  arm: number;
  speed: number;
  size: number;
  tailLength: number;
  opacity: number;
  phase: number;
  trail: { x: number; y: number }[];
}

let audioLevelCallbacks: ((level: number) => void)[] = [];

export const setGlobalAudioLevel = (level: number) => {
  audioLevelCallbacks.forEach(cb => cb(level));
};

export const subscribeToAudioLevel = (callback: (level: number) => void) => {
  audioLevelCallbacks.push(callback);
  return () => {
    audioLevelCallbacks = audioLevelCallbacks.filter(cb => cb !== callback);
  };
};

// Logarithmic golden spiral
const getSpiral = (t: number, arm: number, center: number, scale: number = 1): { x: number; y: number } => {
  const armOffset = (arm / 4) * TAU;
  const theta = t * TAU * 2.5 + armOffset;
  const r = 3 * Math.exp(0.17 * theta) * scale;
  return {
    x: center + r * Math.cos(theta),
    y: center + r * Math.sin(theta),
  };
};

export default function GoldenSpiral3D() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<FlowParticle[]>([]);
  const animationRef = useRef<number>(0);
  const audioLevelRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 150);

    const detectTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      setTheme(dataTheme === 'light' || dataTheme === 'pearl-white' ? 'light' : 'dark');
    };

    detectTheme();
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const unsubscribe = subscribeToAudioLevel((level) => {
      audioLevelRef.current = level;
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;

    // Create particles across 4 spiral arms
    particlesRef.current = [];
    const particlesPerArm = 18;
    for (let arm = 0; arm < 4; arm++) {
      for (let i = 0; i < particlesPerArm; i++) {
        particlesRef.current.push({
          t: i / particlesPerArm,
          arm,
          speed: 0.0008 + Math.random() * 0.0015,
          size: 0.3 + Math.random() * 0.5,
          tailLength: 12 + Math.random() * 20,
          opacity: 0.15 + Math.random() * 0.35,
          phase: Math.random() * TAU,
          trail: [],
        });
      }
    }

    const animate = () => {
      timeRef.current += 0.012;
      const time = timeRef.current;
      
      // Clear canvas completely for transparent bg
      ctx.clearRect(0, 0, size, size);
      
      const isDark = theme === 'dark';
      const primaryRGB = isDark ? '255, 255, 253' : '20, 20, 20';
      const accentRGB = isDark ? '201, 185, 154' : '160, 140, 100';
      
      const audio = audioLevelRef.current;
      const isActive = audio > 0.05;
      const expansion = 1 + (isActive ? audio * 0.25 : 0);
      const speedMult = 1 + (isActive ? audio * 2.5 : 0);

      // Ultra-subtle spiral guides
      ctx.globalAlpha = 0.025;
      ctx.strokeStyle = `rgb(${primaryRGB})`;
      ctx.lineWidth = 0.4;
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.008) {
          const p = getSpiral(t, arm, center, 1);
          t === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw particles
      particlesRef.current.forEach((particle, idx) => {
        particle.t += particle.speed * speedMult;
        if (particle.t > 1) {
          particle.t = 0;
          particle.opacity = 0.15 + Math.random() * 0.35;
        }

        const pos = getSpiral(particle.t, particle.arm, center, expansion);
        
        particle.trail.unshift({ x: pos.x, y: pos.y });
        
        const maxTrail = Math.floor(particle.tailLength * (isActive ? 1.4 : 1));
        while (particle.trail.length > maxTrail) particle.trail.pop();

        if (particle.trail.length < 2) return;

        // Smooth breathing
        const breathe = Math.sin(time * 1.2 + particle.phase) * 0.12;
        const audioPulse = isActive ? Math.sin(time * 8 + idx * 0.5) * audio * 0.25 : 0;
        const finalOpacity = Math.max(0.08, particle.opacity + breathe + audioPulse);

        const useAccent = isActive ? idx % 3 === 0 : idx % 6 === 0;
        const colorRGB = useAccent ? accentRGB : primaryRGB;

        // Draw smooth curved trail
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
        
        for (let i = 1; i < particle.trail.length - 1; i++) {
          const curr = particle.trail[i];
          const next = particle.trail[i + 1];
          ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
        }
        
        // Gradient trail
        const last = particle.trail[particle.trail.length - 1];
        const gradient = ctx.createLinearGradient(
          particle.trail[0].x, particle.trail[0].y, last.x, last.y
        );
        gradient.addColorStop(0, `rgba(${colorRGB}, ${finalOpacity})`);
        gradient.addColorStop(0.6, `rgba(${colorRGB}, ${finalOpacity * 0.25})`);
        gradient.addColorStop(1, `rgba(${colorRGB}, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = particle.size * (isActive ? 1.2 : 1);
        ctx.lineCap = 'round';
        ctx.stroke();

        // Soft head glow
        const glowSize = particle.size * 3;
        const headGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
        headGlow.addColorStop(0, `rgba(${colorRGB}, ${finalOpacity * 0.6})`);
        headGlow.addColorStop(1, `rgba(${colorRGB}, 0)`);
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowSize, 0, TAU);
        ctx.fillStyle = headGlow;
        ctx.fill();

        // Sharp particle head
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, particle.size * 0.7, 0, TAU);
        ctx.fillStyle = `rgba(${colorRGB}, ${Math.min(1, finalOpacity * 1.3)})`;
        ctx.fill();
      });

      // Center focal point
      const pulse = 1 + Math.sin(time * 1.5) * 0.12 + (isActive ? audio * 0.35 : 0);
      
      // Soft glow rings
      [12, 8, 5].forEach((r, i) => {
        const ringGlow = ctx.createRadialGradient(center, center, 0, center, center, r * pulse);
        ringGlow.addColorStop(0, `rgba(${accentRGB}, ${(0.12 - i * 0.03) * (isActive ? 1.4 : 1)})`);
        ringGlow.addColorStop(1, `rgba(${accentRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(center, center, r * pulse, 0, TAU);
        ctx.fillStyle = ringGlow;
        ctx.fill();
      });

      // Core dot
      ctx.beginPath();
      ctx.arc(center, center, 2 * pulse, 0, TAU);
      ctx.fillStyle = `rgba(${primaryRGB}, 0.85)`;
      ctx.fill();

      // Accent ring
      ctx.beginPath();
      ctx.arc(center, center, 4.5 * pulse, 0, TAU);
      ctx.strokeStyle = `rgba(${accentRGB}, ${isActive ? 0.45 : 0.2})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [theme]);

  return (
    <>
      <div className={`golden-spiral ${isLoaded ? 'loaded' : ''}`}>
        <canvas ref={canvasRef} className="spiral-canvas" />
      </div>

      <style jsx>{`
        .golden-spiral {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.92);
          transition: 
            opacity 1.8s cubic-bezier(0.4, 0, 0.2, 1),
            transform 1.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .golden-spiral.loaded {
          opacity: 1;
          transform: scale(1);
        }
        
        .spiral-canvas {
          width: 200px;
          height: 200px;
        }
        
        @media (max-width: 768px) {
          .golden-spiral {
            width: 160px;
            height: 160px;
          }
          .spiral-canvas {
            width: 160px;
            height: 160px;
          }
        }
      `}</style>
    </>
  );
}