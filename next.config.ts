import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin: string | null = null;

if (supabaseUrl) {
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = null;
  }
}

const supabaseWebsocketOrigin = supabaseOrigin
  ? supabaseOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:")
  : null;

const imgSrc = [
  "'self'",
  "blob:",
  "data:",
  "https:",
  supabaseOrigin,
]
  .filter(Boolean)
  .join(" ");

const connectSrc = [
  "'self'",
  "https://ipapi.co",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  supabaseOrigin,
  supabaseWebsocketOrigin,
  "https://accounts.google.com",
  "https://upstore.one",
  "https://www.upstore.one",
  "https://*.vercel.app",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self' https:",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com/gsi/client https://*.vercel.app",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  `img-src ${imgSrc}`,
  "font-src 'self' https://fonts.gstatic.com data:",
  `connect-src ${connectSrc}`,
  "frame-src 'self' https://accounts.google.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Security and Caching headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|webp|avif|woff|woff2|ttf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },

  // Experimental
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "zustand",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
