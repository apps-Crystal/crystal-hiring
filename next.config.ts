import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Server actions / API routes need larger body limits for file uploads
  // (CV PDFs, offer letter PDFs, document images). Vercel default is 4.5MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
