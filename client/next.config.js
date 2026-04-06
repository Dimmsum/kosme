/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Explicitly allowlist remote image domains (mitigates GHSA-9g9p-9gw9-jx7f).
    // Add Supabase storage URL so service-photos load via next/image if needed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yleivvghmafwkcfqwirw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Cap image cache to prevent unbounded disk growth (mitigates GHSA-3x4c-7xq6-9pq8).
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
