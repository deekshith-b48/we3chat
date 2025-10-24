'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import Dashboard from '@/components/Dashboard';
import WalletConnect from '@/components/WalletConnect';
import AccountSetup from '@/components/AccountSetup';
import NetworkSwitcher from '@/components/NetworkSwitcher';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TransactionNotifications from '@/components/TransactionNotifications';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
  const { isConnected, isCorrectNetwork } = useWallet();
  const { isAuthenticated, isLoading, user, error } = useAuth();

  // Show loading spinner during initial authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading...</p>
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

  // Show wallet connection with sign-in if not authenticated
  if (!isAuthenticated) {
    return <WalletConnect />;
  }

  // Show account setup if user needs to complete registration
  if (user && !user.isRegistered) {
    return <AccountSetup />;
  }

  // Show main dashboard when everything is ready
  return (
    <ErrorBoundary>
      <Dashboard />
      <TransactionNotifications />
    </ErrorBoundary>
  );
}
