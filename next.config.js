/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/reminders", destination: "/messaging", permanent: false },
      { source: "/reminders/new", destination: "/messaging/new", permanent: false },
      { source: "/advisor/reminders", destination: "/advisor/messaging", permanent: false },
      { source: "/advisor/reminders/new", destination: "/advisor/messaging/new", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-image-domain.com',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
