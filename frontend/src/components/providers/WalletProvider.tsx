import React, { createContext, useContext, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../../lib/wagmi';

// Query client for react-query
const queryClient = new QueryClient();

// Wallet context for additional state management
interface WalletContextType {
  isInitialized: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType>({
  isInitialized: false,
  error: null
});

export function useWallet() {
  return useContext(WalletContext);
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Initialize wallet connection
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
    }
  }, []);

  const value = {
    isInitialized,
    error
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletContext.Provider value={value}>
          {children}
        </WalletContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
