/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@alfred/core', '@alfred/llm', '@alfred/database'],
};
module.exports = nextConfig;
