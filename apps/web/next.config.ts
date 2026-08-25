import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' ? '/corvus' : undefined,
};

export default nextConfig;
