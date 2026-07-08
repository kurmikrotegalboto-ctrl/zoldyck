import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable source maps in production to prevent code exposure via F12 Sources
  productionBrowserSourceMaps: false,
};

export default nextConfig;
