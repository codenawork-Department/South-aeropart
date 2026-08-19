/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/lib"],
};

export default nextConfig;
