/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
  },
  env: {
    NEXT_PUBLIC_CHAT_ADDRESS: process.env.NEXT_PUBLIC_CHAT_ADDRESS,
    NEXT_PUBLIC_WEB3STORAGE_TOKEN: process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
};

module.exports = nextConfig;
