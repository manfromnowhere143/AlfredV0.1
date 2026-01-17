const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@alfred/core', '@alfred/llm', '@alfred/database', '@alfred/persona'],

  // Enable instrumentation for Sentry
  experimental: {
    instrumentationHook: true,
  },

  // Enable WASM support for ESBuild
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },

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
              // Scripts: self + trusted CDNs for preview iframe + inline for Next.js + wasm-unsafe-eval for ESBuild WASM
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://esm.sh https://cdn.tailwindcss.com https://www.googletagmanager.com",
              // Workers: allow blob URLs for ESBuild/Monaco workers
              "worker-src 'self' blob:",
              // Styles: self + inline (required for styled-jsx and Tailwind) + Monaco Editor CSS
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              // Images: self + data URIs + blob + common image hosts
              "img-src 'self' data: blob: https: http:",
              // Fonts: self + Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Connect: API calls, WebSocket, Sentry, and CDNs for ESBuild WASM
              "connect-src 'self' https://*.anthropic.com https://*.openai.com https://api.elevenlabs.io https://*.supabase.com https://*.vercel-storage.com wss://*.vercel.app https://*.sentry.io https://*.ingest.sentry.io https://unpkg.com https://cdn.jsdelivr.net https://esm.sh",
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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project from Sentry
  org: process.env.SENTRY_ORG || 'alfred',
  project: process.env.SENTRY_PROJECT || 'alfred-web',

  // Upload source maps for better error tracking
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through Next.js (hides DSN)
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Wrap with Sentry only if DSN is configured
module.exports = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
