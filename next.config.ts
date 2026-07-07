import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Cache halaman Next.js
        urlPattern: /^https:\/\/.*\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // Cache API arsip kinerja (Google Sheets) — stale-while-revalidate
        urlPattern: /^https:\/\/.*\/api\/google-sheets\/arsip/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "arsip-api",
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001", "localhost:3000"],
    },
  },
};

export default withPWA(nextConfig);
