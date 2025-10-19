import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export interface AuthUser {
  id: string;
  email?: string;
  wallet?: string;
  username?: string;
  sessionType: 'email' | 'wallet' | 'siwe';
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface AuthMethods {
  // Email authentication
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  
  // Wallet authentication
  signInWithWallet: (username?: string) => Promise<boolean>;
  
  // Utility methods
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function useBasicAuth(): AuthState & AuthMethods {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false
  });

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Update wallet address when wallet connection changes
  useEffect(() => {
    if (isConnected && address && state.user?.sessionType === 'siwe') {
      // If user is connected with wallet but session has different address, refresh
      if (state.user.wallet?.toLowerCase() !== address.toLowerCase()) {
        refreshSession();
      }
    }
  }, [address, isConnected, state.user]);

  const loadUserSession = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setState(prev => ({
            ...prev,
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          }));
          return;
        }
      }

      // No valid session found
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to load user session:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to load session'
      }));
    }
  };

  const signUpWithEmail = async (email: string, password: string, username?: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/email/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, username })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // After successful signup, load the user session
        await loadUserSession();
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Signup failed'
        }));
        return false;
      }

    } catch (error) {
      console.error('Email signup error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Signup failed'
      }));
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE_URL}/auth/email/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // After successful login, load the user session
        await loadUserSession();
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Login failed'
        }));
        return false;
      }

    } catch (error) {
      console.error('Email login error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Login failed'
      }));
      return false;
    }
  };

  const signInWithWallet = async (username?: string): Promise<boolean> => {
    try {
      if (!isConnected || !address) {
        setState(prev => ({
          ...prev,
          error: 'Wallet not connected'
        }));
        return false;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Step 1: Get nonce from server
      const nonceResponse = await fetch(`${API_BASE_URL}/auth/siwe/nonce?address=${address}`, {
        method: 'GET',
        credentials: 'include'
      });

      const nonceData = await nonceResponse.json();

      if (!nonceResponse.ok || !nonceData.success) {
        throw new Error(nonceData.message || 'Failed to get nonce');
      }

      // Step 2: Sign the message with wallet
      const signature = await signMessageAsync({
        message: nonceData.message
      });

      // Step 3: Verify signature with server
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/siwe/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address,
          nonce: nonceData.nonce,
          signature,
          username
        })
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok && verifyData.success) {
        // After successful wallet login, load the user session
        await loadUserSession();
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: verifyData.message || 'Wallet authentication failed'
        }));
        return false;
      }

    } catch (error) {
      console.error('Wallet login error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Wallet authentication failed'
      }));
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await fetch(`${API_BASE_URL}/auth/email/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false
      }));

    } catch (error) {
      console.error('Sign out error:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Sign out failed'
      }));
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      await loadUserSession();
      return state.isAuthenticated;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  };

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signUpWithEmail,
    signInWithEmail,
    signInWithWallet,
    signOut,
    refreshSession,
    clearError
  };
}
