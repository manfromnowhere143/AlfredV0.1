/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@alfred/core',
    '@alfred/llm',
    '@alfred/memory',
    '@alfred/database',
    '@alfred/rag',
    '@alfred/api',
  ],
};

export default nextConfig;
