/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/lib"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@repo/db", "drizzle-orm", "@neondatabase/serverless"],
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
