/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@alfred/core', '@alfred/llm', '@alfred/database', '@alfred/persona'],
  typescript: {
    // TODO: Remove once persona database schema is merged
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECURITY HEADERS
  // ═══════════════════════════════════════════════════════════════════════════════
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS filter (legacy but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Prevent DNS prefetching
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Permissions Policy (formerly Feature-Policy)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only same origin
              "default-src 'self'",
              // Scripts: self + trusted CDNs for preview iframe + inline for Next.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://www.googletagmanager.com",
              // Styles: self + inline (required for styled-jsx and Tailwind)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self + data URIs + blob + common image hosts
              "img-src 'self' data: blob: https: http:",
              // Fonts: self + Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Connect: API calls and WebSocket
              "connect-src 'self' https://*.anthropic.com https://*.openai.com https://api.elevenlabs.io https://*.supabase.com https://*.vercel-storage.com wss://*.vercel.app",
              // Media: self + blob + Vercel Blob storage
              "media-src 'self' blob: https://*.vercel-storage.com https://*.blob.vercel-storage.com",
              // Frame: allow iframes for preview
              "frame-src 'self' blob: data:",
              // Frame ancestors: prevent embedding
              "frame-ancestors 'self'",
              // Form actions: only same origin
              "form-action 'self'",
              // Base URI: prevent base tag hijacking
              "base-uri 'self'",
              // Object: disable plugins
              "object-src 'none'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
            ].filter(Boolean).join('; '),
          },
        ],
      },
      {
        // Stricter headers for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
