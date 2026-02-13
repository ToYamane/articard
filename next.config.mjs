/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker deployment optimization
  output: 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    // Disable image optimization in production if using external CDN
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // Experimental features
  experimental: {
    // Server Actions (stable in Next.js 14)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Security headers are now handled by src/middleware.ts
};

export default nextConfig;
