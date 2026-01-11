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
};
module.exports = nextConfig;
