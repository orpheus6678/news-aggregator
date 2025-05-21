import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://cdn.bd-pratidin.com/public/news_images/**"),
    ],
  },
}

export default nextConfig
