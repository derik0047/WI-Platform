import type { NextConfig } from "next";

// Validate environment at build/boot so misconfiguration fails fast.
import "./src/lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
