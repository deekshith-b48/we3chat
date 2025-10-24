'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  public_key?: string;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
  last_seen: string;
  is_online: boolean;
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

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated via email
        await loadUserProfile(session.user.id, 'email');
      } else {
        // Check for wallet connection
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', address?.toLowerCase())
          .single();

        if (profiles) {
          setAuthState({
            user: profiles,
            isLoading: false,
            isAuthenticated: true,
            authMethod: 'wallet',
          });
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            authMethod: null,
          });
        }
      }
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

  const loadUserProfile = async (userId: string, method: 'email' | 'wallet') => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setAuthState({
        user: profile,
        isLoading: false,
        isAuthenticated: true,
        authMethod: method,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id, 'email');
        toast.success('Successfully signed in!');
      }
    } catch (error: any) {
      console.error('Email sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username,
            display_name: username,
            is_registered: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            is_online: true,
          });

        if (profileError) throw profileError;

        await loadUserProfile(data.user.id, 'email');
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      console.error('Email sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleWalletAuth = async (walletAddress: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

      if (existingProfile) {
        // User exists, sign them in
        setAuthState({
          user: existingProfile,
          isLoading: false,
          isAuthenticated: true,
          authMethod: 'wallet',
        });
        toast.success('Wallet connected successfully!');
      } else {
        // New user, create profile
        const username = `user_${walletAddress.slice(0, 6)}`;
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            username,
            display_name: username,
            is_registered: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            is_online: true,
          })
          .select()
          .single();

        if (error) throw error;

        setAuthState({
          user: newProfile,
          isLoading: false,
          isAuthenticated: true,
          authMethod: 'wallet',
        });
        toast.success('Wallet connected and profile created!');
      }
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

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authState.user.id)
        .select()
        .single();

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        user: data,
      }));

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      if (authState.authMethod === 'email') {
        await supabase.auth.signOut();
      } else if (authState.authMethod === 'wallet') {
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

