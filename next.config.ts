import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",  // Disabled - causes hydration issues with interactive tabs
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
