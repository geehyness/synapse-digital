/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Recommended for Next.js 15
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
      // Add other remote image patterns here if you have other external image sources
    ],
  },
  // Other Next.js configurations can go here
  // For example, if you were using Tailwind CSS, you might have:
  // experimental: {
  //   taint: true, // For data fetching security
  // },
  // compiler: {
  //   removeConsole: process.env.NODE_ENV === 'production',
  // },
};

module.exports = nextConfig;
