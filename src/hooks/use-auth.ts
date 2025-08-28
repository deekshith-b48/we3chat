import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { api, connectSocket, disconnectSocket, type User } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, reset } = useChatStore();

  // Check existing authentication on mount
  useEffect(() => {
    checkExistingAuth();
  }, []);

  // Handle wallet connection changes
  useEffect(() => {
    if (!isConnected || !address) {
      handleLogout();
    }
  }, [isConnected, address]);

  const checkExistingAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = api.getToken();
      
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Verify token with backend
      const { user } = await api.getCurrentUser();
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });

      setUser({
        address: user.address,
        username: user.username || '',
        publicKey: user.publicKey || '',
        isRegistered: user.isRegistered,
      });

      // Connect socket
      connectSocket(token);

    } catch (error) {
      console.error('Auth check failed:', error);
      api.setToken(null);
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    }
  }, [setUser]);

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get nonce from backend
      const { nonce } = await api.getNonce();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to we3chat with your Ethereum account.',
        uri: window.location.origin,
        version: '1',
        chainId: 80002, // Polygon Amoy
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageString = message.prepareMessage();

      // Sign message with wallet
      const signature = await signMessageAsync({
        message: messageString,
      });

      // Verify with backend
      const { token, user } = await api.verifyMessage(messageString, signature);

      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });

      setUser({
        address: user.address,
        username: user.username || '',
        publicKey: user.publicKey || '',
        isRegistered: user.isRegistered,
      });

      // Connect socket
      connectSocket(token);

      return user;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [address, isConnected, signMessageAsync, setUser]);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLogout();
    }
  }, []);

  const handleLogout = useCallback(() => {
    api.setToken(null);
    disconnectSocket();
    reset();
    
    setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, [reset]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      const updatedUser = await api.updateProfile(data);
      
      setState(prev => ({ 
        ...prev, 
        user: updatedUser 
      }));

      setUser({
        address: updatedUser.address,
        username: updatedUser.username || '',
        publicKey: updatedUser.publicKey || '',
        isRegistered: updatedUser.isRegistered,
      });

      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, [state.isAuthenticated, setUser]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    updateProfile,
    clearError,
    refreshAuth: checkExistingAuth,
  };
}

// Hook for authentication status only
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuth();
  return { isAuthenticated, isLoading, user };
}

// Hook that requires authentication
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Could redirect to login or show auth modal
      console.warn('Authentication required');
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  return auth;
}
