'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { polygonMumbai, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { RainbowKitProvider, connectorsForWallets, Chain } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';

// Custom Polygon Amoy testnet configuration
const polygonAmoy: Chain = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygonAmoy, polygonMumbai, polygon],
  [
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string })]
      : []),
    publicProvider(),
  ]
);

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const wallets = [
  injectedWallet({ chains }),
  ...(projectId
    ? [
        metaMaskWallet({ projectId, chains }),
        walletConnectWallet({
          projectId,
          chains,
          qrModalOptions: { enableExplorer: false },
        }),
      ]
    : []),
];

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets,
  },
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
  webSocketPublicClient,
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        chains={chains}
        initialChain={polygonAmoy}
        modalSize="compact"
        appInfo={{
          appName: 'we3chat',
          learnMoreUrl: 'https://we3chat.app',
        }}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
