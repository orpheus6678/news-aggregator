import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: process.env.VERCEL_ENV === "preview",
  },
}

export default nextConfig
