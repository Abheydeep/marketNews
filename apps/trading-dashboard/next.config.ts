import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@market-narrative/api-client"]
};

export default nextConfig;
