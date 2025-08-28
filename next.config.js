/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  allowedDevOrigins: [
    '0b46fa6de6db4547a21f77d0286aaede-7046564e85f548218a385f804.fly.dev',
    '0b46fa6de6db4547a21f77d0286aaede-7046564e85f548218a385f804.projects.builder.codes',
    'acd44e080f384077aea6cad4660c96dd-170c344c-670f-4845-a666-3609cc.fly.dev',
    'acd44e080f384077aea6cad4660c96dd-170c344c-670f-4845-a666-3609cc.projects.builder.codes'
  ],
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
