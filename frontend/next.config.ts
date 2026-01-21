import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};

export default nextConfig;
