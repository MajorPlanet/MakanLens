import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Never trace local env files (secrets) into deployed server bundles.
  outputFileTracingExcludes: { "*": [".env", ".env.*"] },
  // Dev only: let phones on the local network use hot reload. Update when your IP changes.
  allowedDevOrigins: ["172.20.10.7", "172.31.117.49"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
