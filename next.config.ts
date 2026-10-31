import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let phones on the local network use hot reload. Update when your IP changes.
  allowedDevOrigins: ["172.20.10.7"],
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
