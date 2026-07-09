import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // turbopack: removed hardcoded root — let Next.js auto-detect
};

export default nextConfig;
