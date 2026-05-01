import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@market-narrative/api-client"]
};

export default nextConfig;
