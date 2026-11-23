import type { NextConfig } from "next";

// Sent with every response. The Content Security Policy (with a fresh nonce) and HSTS are added to pages by
// src/proxy.ts, because they depend on the request.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Chromium (PDFs), Excel parsing and PostgreSQL's parser (Ask AI — it loads a .wasm file) stay plain Node modules.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium", "exceljs", "libpg-query"],
  // Files read at run time that the bundler cannot see: the fonts embedded in PDFs and the serverless Chromium.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/libpg-query/wasm/**/*",
      "./node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      "./node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-*-normal.woff2",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
