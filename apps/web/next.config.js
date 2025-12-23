/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@alfred/core', '@alfred/llm'],
};

module.exports = nextConfig;
