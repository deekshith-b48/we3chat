/**
 * Authentication Hook - Bridges Supabase Auth with Ceramic DID
 * 
 * This hook manages the dual authentication system:
 * 1. Supabase for user management and real-time features
 * 2. Ceramic for decentralized identity and data ownership
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createSupabaseClient, getSupabaseClient } from '../../utils/supabase';
import { 
  authenticateWithCeramic, 
  getCurrentDID, 
  signOutFromCeramic, 
  isAuthenticated as isCeramicAuthenticated 
} from '../../utils/ceramic';

export interface AuthState {
  user: User | null;
  session: Session | null;
  did: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  error: string | null;
}

export interface AuthActions {
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  completeProfile: () => void;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    did: null,
    isLoading: true,
    isAuthenticated: false,
    hasProfile: false,
    error: null,
  });

  /**
   * Initialize Supabase client and set up auth state listener
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Initialize Supabase client
        await createSupabaseClient();
        const supabase = getSupabaseClient();

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setState(prev => ({ ...prev, error: error.message, isLoading: false }));
          }
          return;
        }

        if (mounted) {
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
            isLoading: false,
          }));
        }

        // If user is authenticated, try to authenticate with Ceramic
        if (session?.user) {
          await authenticateWithCeramic();
          const did = getCurrentDID();
          
          if (mounted) {
            setState(prev => ({ ...prev, did }));
          }

          // Ensure user profile exists in Supabase
          await ensureUserProfile(session.user.id, did);
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            
            if (!mounted) return;

            setState(prev => ({
              ...prev,
              session,
              user: session?.user ?? null,
              isAuthenticated: !!session,
            }));

            if (event === 'SIGNED_IN' && session?.user) {
              try {
                // Authenticate with Ceramic when user signs in
                await authenticateWithCeramic();
                const did = getCurrentDID();
                
                setState(prev => ({ ...prev, did }));
                
                // Ensure user profile exists
                await ensureUserProfile(session.user.id, did);
              } catch (error) {
                console.error('Failed to authenticate with Ceramic:', error);
                setState(prev => ({ 
                  ...prev, 
                  error: `Ceramic authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }));
              }
            } else if (event === 'SIGNED_OUT') {
              // Sign out from Ceramic when user signs out
              signOutFromCeramic();
              setState(prev => ({ ...prev, did: null }));
            }
          }
        );

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            error: error instanceof Error ? error.message : 'Authentication initialization failed',
            isLoading: false 
          }));
        }
      }
    };

    initializeAuth();
  }, []);

  /**
   * Ensure user profile exists in Supabase
   * This creates the bridge between Supabase user ID and Ceramic DID
   */
  const ensureUserProfile = async (userId: string, did: string | null) => {
    if (!did) return;

    try {
      const supabase = getSupabaseClient();
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            did: did,
            username: `user_${userId.slice(0, 8)}`, // Default username
          });

        if (error) {
          console.error('Error creating profile:', error);
        } else {
          console.log('✅ User profile created');
        }
      } else if (existingProfile.did !== did) {
        // Update DID if it changed
        const { error } = await supabase
          .from('profiles')
          .update({ did: did })
          .eq('id', userId);

        if (error) {
          console.error('Error updating profile DID:', error);
        } else {
          console.log('✅ User profile DID updated');
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  /**
   * Sign in with wallet (MetaMask)
   */
  const signIn = useCallback(async () => {
    try {
      console.log('🔗 Starting wallet authentication...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      console.log('✅ MetaMask detected');

      // Request account access
      console.log('🔐 Requesting account access...');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const account = accounts[0];
      console.log('✅ Account connected:', account);

      // Authenticate with Ceramic first to get DID
      console.log('🔑 Authenticating with Ceramic...');
      await authenticateWithCeramic();
      const did = getCurrentDID();

      if (!did) {
        throw new Error('Failed to get decentralized identity');
      }

      console.log('✅ Ceramic DID obtained:', did);

      // Create a message to sign
      const message = `Sign this message to authenticate with we3chat.\n\nDID: ${did}\nTimestamp: ${Date.now()}`;

      // Sign message with wallet
      console.log('✍️ Requesting message signature...');
      await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });

      console.log('✅ Message signed successfully');

      // Check if user has a profile (in a real app, this would check Ceramic/Supabase)
      const hasProfile = localStorage.getItem(`profile_${did}`) !== null;
      console.log('🔍 Profile check:', { did, hasProfile });

      // Set authentication state
      setState(prev => ({
        ...prev,
        user: { id: account, email: null } as any, // Mock user object
        session: { access_token: 'mock_token' } as any, // Mock session
        did,
        isAuthenticated: true,
        hasProfile,
        isLoading: false,
        error: null
      }));

      console.log('✅ Wallet authentication successful');
    } catch (error) {
      console.error('❌ Wallet sign in error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Wallet sign in failed',
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Sign out from both Supabase and Ceramic
   */
  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Sign out from Supabase
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Sign out from Ceramic
      signOutFromCeramic();

      setState(prev => ({
        ...prev,
        user: null,
        session: null,
        did: null,
        isAuthenticated: false,
        isLoading: false,
      }));

      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sign out failed',
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Refresh the current session
   */
  const refreshSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      }));

      // Refresh Ceramic authentication if needed
      if (session?.user && !isCeramicAuthenticated()) {
        await authenticateWithCeramic();
        const did = getCurrentDID();
        setState(prev => ({ ...prev, did }));
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Session refresh failed',
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Authenticate with Ceramic to get DID
        await authenticateWithCeramic();
        const did = getCurrentDID();

        // Check if user has a profile
        const hasProfile = localStorage.getItem(`profile_${did}`) !== null;

        setState(prev => ({
          ...prev,
          user: data.user,
          session: data.session,
          did,
          isAuthenticated: true,
          hasProfile,
          isLoading: false,
          error: null
        }));

        console.log('✅ Email authentication successful');
      }
    } catch (error) {
      console.error('❌ Email sign in failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Email sign in failed',
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Sign up with email, password, and username
   */
  const signUpWithEmail = useCallback(async (email: string, password: string, username: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Authenticate with Ceramic to get DID
        await authenticateWithCeramic();
        const did = getCurrentDID();

        // New users don't have a profile yet
        setState(prev => ({
          ...prev,
          user: data.user,
          session: data.session,
          did,
          isAuthenticated: true,
          hasProfile: false, // New users need to create profile
          isLoading: false,
          error: null
        }));

        console.log('✅ Email registration successful');
      }
    } catch (error) {
      console.error('❌ Email sign up failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Email sign up failed',
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Mark profile as completed
   */
  const completeProfile = useCallback(() => {
    const did = getCurrentDID();
    if (did) {
      localStorage.setItem(`profile_${did}`, 'true');
      setState(prev => ({ ...prev, hasProfile: true }));
    }
  }, []);

  return {
    ...state,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshSession,
    clearError,
    completeProfile,
  };
}
