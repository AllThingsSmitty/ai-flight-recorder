import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flight-recorder/core", "@flight-recorder/sdk"],
};

export default nextConfig;
