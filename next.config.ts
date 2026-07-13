import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for the CloudBase / Docker runner image (`.next/standalone`).
  output: 'standalone',
  images: {
    qualities: [75, 85],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:locale/events/:slug/travel',
        destination: '/:locale/events/:slug/plan?from=event',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
