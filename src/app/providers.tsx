'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { polygonMumbai, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { RainbowKitProvider, getDefaultWallets, Chain } from '@rainbow-me/rainbowkit';
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
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo' }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'we3chat',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: false, // Disable autoConnect to prevent modal conflicts
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
        theme={{
          lightMode: {
            colors: {
              accentColor: '#3b82f6',
              accentColorForeground: 'white',
              actionButtonBorder: 'rgba(0, 0, 0, 0.04)',
              actionButtonBorderMobile: 'rgba(0, 0, 0, 0.06)',
              actionButtonSecondaryBackground: 'rgba(0, 0, 0, 0.06)',
              closeButton: 'rgba(60, 66, 66, 0.8)',
              closeButtonBackground: 'rgba(0, 0, 0, 0.06)',
              connectButtonBackground: '#FFF',
              connectButtonBackgroundError: '#FF494A',
              connectButtonInnerBackground: 'linear-gradient(0deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.06))',
              connectButtonText: '#25292E',
              connectButtonTextError: '#FFF',
              connectionIndicator: '#30E000',
              downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.49%, rgba(171, 171, 171, 0.04) 71.04%), #FFFFFF',
              downloadTopCardBackground: 'linear-gradient(126deg, rgba(171, 171, 171, 0.2) 9.49%, rgba(255, 255, 255, 0) 71.04%), #FFFFFF',
              error: '#FF494A',
              generalBorder: 'rgba(0, 0, 0, 0.06)',
              generalBorderDim: 'rgba(0, 0, 0, 0.03)',
              menuItemBackground: 'rgba(60, 66, 66, 0.1)',
              modalBackdrop: 'rgba(0, 0, 0, 0.3)',
              modalBackground: '#FFF',
              modalBorder: 'rgba(0, 0, 0, 0.06)',
              modalText: '#25292E',
              modalTextDim: 'rgba(60, 66, 66, 0.3)',
              modalTextSecondary: 'rgba(60, 66, 66, 0.6)',
              profileAction: '#FFF',
              profileActionHover: 'rgba(255, 255, 255, 0.5)',
              profileForeground: 'rgba(60, 66, 66, 0.06)',
              selectedOptionBorder: 'rgba(60, 66, 66, 0.1)',
              standby: '#FFD641',
            },
            radii: {
              actionButton: '12px',
              connectButton: '12px',
              menuButton: '12px',
              modal: '24px',
              modalMobile: '28px',
            },
            fonts: {
              body: 'Inter, system-ui, sans-serif',
            },
          },
          darkMode: {
            colors: {
              accentColor: '#3b82f6',
              accentColorForeground: 'white',
              actionButtonBorder: 'rgba(255, 255, 255, 0.04)',
              actionButtonBorderMobile: 'rgba(255, 255, 255, 0.06)',
              actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.06)',
              closeButton: 'rgba(224, 232, 255, 0.8)',
              closeButtonBackground: 'rgba(255, 255, 255, 0.06)',
              connectButtonBackground: '#1A1B1F',
              connectButtonBackgroundError: '#FF494A',
              connectButtonInnerBackground: 'linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.06))',
              connectButtonText: '#FFF',
              connectButtonTextError: '#FFF',
              connectionIndicator: '#30E000',
              downloadBottomCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0) 9.49%, rgba(255, 255, 255, 0.05) 71.04%), #1A1B1F',
              downloadTopCardBackground: 'linear-gradient(126deg, rgba(255, 255, 255, 0.15) 9.49%, rgba(255, 255, 255, 0) 71.04%), #1A1B1F',
              error: '#FF494A',
              generalBorder: 'rgba(255, 255, 255, 0.06)',
              generalBorderDim: 'rgba(255, 255, 255, 0.03)',
              menuItemBackground: 'rgba(224, 232, 255, 0.1)',
              modalBackdrop: 'rgba(0, 0, 0, 0.5)',
              modalBackground: '#1A1B1F',
              modalBorder: 'rgba(255, 255, 255, 0.06)',
              modalText: '#FFF',
              modalTextDim: 'rgba(224, 232, 255, 0.3)',
              modalTextSecondary: 'rgba(255, 255, 255, 0.6)',
              profileAction: '#1A1B1F',
              profileActionHover: 'rgba(255, 255, 255, 0.1)',
              profileForeground: 'rgba(224, 232, 255, 0.06)',
              selectedOptionBorder: 'rgba(224, 232, 255, 0.1)',
              standby: '#FFD641',
            },
            radii: {
              actionButton: '12px',
              connectButton: '12px',
              menuButton: '12px',
              modal: '24px',
              modalMobile: '28px',
            },
            fonts: {
              body: 'Inter, system-ui, sans-serif',
            },
          },
        }}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
