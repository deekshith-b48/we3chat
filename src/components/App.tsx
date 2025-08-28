'use client';

import { useEffect } from 'react';
import { useMessageEvents } from '@/hooks/use-messaging';
import Dashboard from '@/components/Dashboard';
import WalletConnect from '@/components/WalletConnect';
import AccountSetup from '@/components/AccountSetup';
import NetworkSwitcher from '@/components/NetworkSwitcher';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TransactionNotifications from '@/components/TransactionNotifications';
import { useWallet, useWalletStatus } from '@/hooks/use-wallet';
import { useChatStore } from '@/store/chat-store';

export default function App() {
  const { isConnected, isCorrectNetwork, isConnecting } = useWallet();
  const { status } = useWalletStatus();
  const user = useChatStore(state => state.user);
  const isLoading = useChatStore(state => state.isLoading);

  // Set up real-time event listening when ready
  useMessageEvents();

  // Show loading spinner during connection
  if (isConnecting || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">
            {isConnecting ? 'Connecting wallet...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show wallet connection if not connected
  if (!isConnected) {
    return <WalletConnect />;
  }

  // Show network switcher if on wrong network
  if (!isCorrectNetwork) {
    return <NetworkSwitcher />;
  }

  // Show account setup if user needs to register or set encryption key
  if (status !== 'ready') {
    return <AccountSetup />;
  }

  // Show main dashboard when everything is ready
  return (
    <>
      <Dashboard />
      <TransactionNotifications />
    </>
  );
}
