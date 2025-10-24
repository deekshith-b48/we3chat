'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { toast } from 'react-hot-toast';
import { api, connectSocket, disconnectSocket } from '../lib/api';

export interface User {
  id: string;
  address: string;
  username?: string;
  bio?: string;
  avatar?: string;
  publicKey?: string;
  isRegistered: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMethod: 'email' | 'wallet' | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    authMethod: null,
  });

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      handleWalletAuth(address);
    } else if (!isConnected && authState.authMethod === 'wallet') {
      handleLogout();
    }
  }, [isConnected, address]);

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check for existing token
      const token = api.getToken();
      if (token) {
        try {
          const { user } = await api.getCurrentUser();
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
            authMethod: 'wallet', // Assume wallet auth if token exists
          });
          connectSocket(token);
          return;
        } catch (error) {
          console.error('Token validation failed:', error);
          api.setToken(null);
        }
      }

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        authMethod: null,
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        authMethod: null,
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // For now, we'll use wallet authentication as the primary method
      // Email authentication would need to be implemented in the backend
      throw new Error('Email authentication not implemented. Please use wallet authentication.');
    } catch (error: any) {
      console.error('Email sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // For now, we'll use wallet authentication as the primary method
      // Email authentication would need to be implemented in the backend
      throw new Error('Email registration not implemented. Please use wallet authentication.');
    } catch (error: any) {
      console.error('Email sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleWalletAuth = async (walletAddress: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Get nonce from server
      const { nonce } = await api.getNonce();

      // Sign message with wallet
      const message = `Sign this message to authenticate with we3chat.\n\nNonce: ${nonce}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // Verify signature with server
      const { token, user } = await api.verifyMessage(message, signature);

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
        authMethod: 'wallet',
      });

      // Connect to real-time messaging
      connectSocket(token);
      toast.success('Wallet connected successfully!');
    } catch (error: any) {
      console.error('Wallet auth error:', error);
      toast.error(error.message || 'Failed to connect wallet');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signInWithWallet = async () => {
    try {
      if (!connectors[0]) {
        throw new Error('No wallet connectors available');
      }

      await connect({ connector: connectors[0] });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!authState.user) throw new Error('No user logged in');

      const updatedUser = await api.updateProfile(updates);
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      disconnectSocket();
      
      if (authState.authMethod === 'wallet') {
        disconnect();
      }

      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        authMethod: null,
      });

      toast.success('Successfully signed out!');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithWallet,
    updateProfile,
    logout: handleLogout,
    connectWallet: signInWithWallet,
  };
}
