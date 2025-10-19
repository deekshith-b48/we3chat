'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export interface User {
  username: string;
  displayName: string;
  avatar: string;
  publicKey: string;
  isRegistered: boolean;
  registrationTime: number;
  lastSeen: number;
  isOnline: boolean;
  address: string;
}

export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  ensName?: string;
  avatar?: string;
}

export function useWeb3Auth() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  // const { signMessageAsync } = useSignMessage();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock wallet info
  const wallet: WalletInfo = {
    address: address || '',
    chainId: 80002, // Polygon Amoy
    balance: '0.0',
    ensName: undefined,
    avatar: undefined,
  };

  const connectWallet = async (): Promise<WalletInfo> => {
    try {
      setIsLoading(true);
      if (connectors[0]) {
        await connect({ connector: connectors[0] });
        toast.success('Wallet connected successfully!');
        return wallet;
      }
      throw new Error('No connector available');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithSIWE = async () => {
    try {
      setIsLoading(true);
      
      if (!address) {
        throw new Error('No wallet connected');
      }

      // Mock authentication - in a real app, you'd implement SIWE here
      const mockUser: User = {
        username: `user_${address.slice(0, 6)}`,
        displayName: `User ${address.slice(0, 6)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
        publicKey: '',
        isRegistered: false,
        registrationTime: Date.now(),
        lastSeen: Date.now(),
        isOnline: true,
        address: address,
      };

      setUser(mockUser);
      setIsAuthenticated(true);
      toast.success('Authentication successful!');
      
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      toast.error('Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      disconnect();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Sign out failed');
    }
  };

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated) {
      authenticateWithSIWE();
    }
  }, [isConnected, address, isAuthenticated]);

  return {
    // State
    isConnected,
    isAuthenticated,
    isLoading,
    user,
    wallet,
    
    // Actions
    connectWallet,
    authenticateWithSIWE,
    signOut,
    disconnect,
  };
}
