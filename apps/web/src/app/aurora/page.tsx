"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Persona {
  id: string;
  name: string;
  imageUrl?: string;
}

export default function AuroraPage() {
  const [scrollX, setScrollX] = useState(0);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fetch personas (only those with images)
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        // Filter to only personas with images
        const withImages = (d.personas || []).filter((p: Persona) => p.imageUrl && p.imageUrl.length > 0);
        setPersonas(withImages);
        setTimeout(() => setIsLoaded(true), 100);
        setTimeout(() => setIsVisible(true), 300);
      })
      .catch(() => {
        setIsLoaded(true);
        setIsVisible(true);
      });

    // Scroll animation
    const interval = setInterval(() => {
      setScrollX((p) => (p + 0.4) % 2000);
    }, 16);

    // Mouse tracking
    const onMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 12,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(145deg, #f8f9fa 0%, #ffffff 50%, #f5f5f7 100%)",
        overflow: "hidden",
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BACK BUTTON                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Link href="/">
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 100,
            backdropFilter: "blur(20px)",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateX(0) scale(1)" : "translateX(-20px) scale(0.9)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
      </Link>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATE OF THE ART LOADING                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Orbital loader */}
          <div style={{ position: "relative", width: 60, height: 60 }}>
            {/* Outer ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid rgba(102,126,234,0.1)",
              }}
            />
            {/* Spinning gradient arc */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "#667eea",
                borderRightColor: "#764ba2",
                animation: "spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite",
              }}
            />
            {/* Inner pulse */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
          {/* Loading text */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 4,
              color: "#999",
              textTransform: "uppercase",
              animation: "fadeInOut 1.5s ease-in-out infinite",
            }}
          >
            Loading
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO - Aurora Logo, Centered                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: `translate(-50%, -50%) translate(${mousePos.x}px, ${mousePos.y}px) rotateY(${mousePos.x * 0.2}deg) rotateX(${mousePos.y * -0.2}deg)`,
          transition: "transform 0.12s ease-out",
          perspective: 1000,
          opacity: isVisible ? 1 : 0,
          transitionProperty: "transform, opacity",
          transitionDuration: "0.12s, 1s",
        }}
      >
        {/* Logo container */}
        <div
          style={{
            width: 220,
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isVisible ? "scale(1)" : "scale(0.85)",
            transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <img
            src="/aurora-logo.png"
            alt="Aurora"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 20px 40px rgba(102,126,234,0.2)) drop-shadow(0 8px 16px rgba(0,0,0,0.08))",
            }}
          />
        </div>

        {/* Shadow underneath */}
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 140,
            height: 30,
            background: "radial-gradient(ellipse, rgba(102,126,234,0.15) 0%, transparent 70%)",
            filter: "blur(12px)",
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1.2s ease 0.3s",
          }}
        />

        {/* AURORA text */}
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 18,
            fontWeight: 200,
            letterSpacing: 12,
            color: "#444",
            textTransform: "uppercase",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(15px)",
            transition: "opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s",
          }}
        >
          AURORA
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LAUNCH BUTTON - State of the Art, Steve Jobs Level                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 1s ease 0.7s, transform 1s ease 0.7s",
          }}
        >
          {/* The Button */}
          <div
            style={{
              position: "relative",
              width: 64,
              height: 64,
              cursor: "not-allowed",
            }}
          >
            {/* Outer glow ring */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)",
                animation: "breathe 3s ease-in-out infinite",
              }}
            />

            {/* Button body */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.9) 100%)",
                boxShadow: `
                  0 10px 40px rgba(102,126,234,0.2),
                  0 4px 12px rgba(0,0,0,0.08),
                  inset 0 1px 0 rgba(255,255,255,1),
                  inset 0 -1px 0 rgba(0,0,0,0.02)
                `,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7,
                transition: "all 0.4s ease",
              }}
            >
              {/* Inner icon - simple play/launch shape */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                style={{ marginLeft: 2 }}
              >
                <path
                  d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z"
                  fill="url(#playGradient)"
                />
                <defs>
                  <linearGradient id="playGradient" x1="8" y1="5" x2="20" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#667eea" />
                    <stop offset="1" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Subtle ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(102,126,234,0.2)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Coming Soon */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: 3,
              color: "#aaa",
              textTransform: "uppercase",
              opacity: isVisible ? 1 : 0,
              transition: "opacity 1s ease 1s",
            }}
          >
            coming soon
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PERSONAS BAR - Bottom                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {personas.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            overflow: "hidden",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.9s ease 0.4s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}
        >
          {/* Scrolling container */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              paddingLeft: 24,
              paddingBottom: 20,
              transform: `translateX(-${scrollX}px)`,
              willChange: "transform",
            }}
          >
            {[...personas, ...personas, ...personas, ...personas].map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                style={{
                  flexShrink: 0,
                  marginRight: 20,
                  cursor: "pointer",
                  transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12) translateY(-10px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) translateY(0)")}
              >
                {/* Card */}
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 22,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)",
                    padding: 5,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 17,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                </div>

                {/* Name */}
                <div
                  style={{
                    marginTop: 10,
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                  }}
                >
                  {p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name}
                </div>
              </div>
            ))}
          </div>

          {/* Edge fades */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(90deg, #f8f9fa 0%, transparent 8%, transparent 92%, #f5f5f7 100%)",
            }}
          />
        </div>
      )}

      {/* Ambient elements */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "15%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.3))",
          opacity: isVisible ? 0.6 : 0,
          transition: "opacity 1.2s ease 0.8s",
          animation: isVisible ? "float 4s ease-in-out infinite" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "65%",
          left: "12%",
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "rgba(102,126,234,0.3)",
          opacity: isVisible ? 0.5 : 0,
          transition: "opacity 1.2s ease 1s",
          animation: isVisible ? "float 5s ease-in-out infinite 1s" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "35%",
          right: "25%",
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: "rgba(118,75,162,0.25)",
          opacity: isVisible ? 0.4 : 0,
          transition: "opacity 1.2s ease 1.2s",
          animation: isVisible ? "float 6s ease-in-out infinite 2s" : "none",
        }}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
