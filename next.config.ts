import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic rendering everywhere (pages read the session cookie); Cache Components deliberately off in v1.
  serverExternalPackages: ["pg"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
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
