import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; worker-src 'self' blob:",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
