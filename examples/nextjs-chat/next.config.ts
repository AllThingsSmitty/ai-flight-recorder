import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-flight-recorder/core", "@ai-flight-recorder/sdk"],
};

export default nextConfig;
