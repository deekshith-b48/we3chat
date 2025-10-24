import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { authenticateCeramic } from '@/utils/ceramic';

interface Profile {
  id: string;
  did: string;
  username: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  ceramicDID: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    ceramicDID: null,
    loading: true,
    error: null
  });

  // Load user profile and link to Ceramic DID
  const loadUserProfile = useCallback(async (user: User) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check if profile exists in Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          did: '', // Will be filled after Ceramic auth
          username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;
        
        setState(prev => ({ 
          ...prev, 
          user, 
          profile: createdProfile,
          loading: false 
        }));
      } else if (profileError) {
        throw profileError;
      } else {
        setState(prev => ({ 
          ...prev, 
          user, 
          profile,
          ceramicDID: profile.did || null,
          loading: false 
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load profile',
        loading: false 
      }));
    }
  }, []);

  // Authenticate with Ceramic and update profile with DID
  const authenticateWithCeramic = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask to continue.');
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No Ethereum accounts found');
      }

      const address = accounts[0];
      
      // Authenticate with Ceramic
      const did = await authenticateCeramic(address, window.ethereum);
      
      // Update profile with DID
      if (state.profile && !state.profile.did) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ did })
          .eq('id', state.profile.id);

        if (updateError) throw updateError;

        setState(prev => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, did } : null,
          ceramicDID: did,
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, ceramicDID: did, loading: false }));
      }

      return did;
    } catch (error) {
      console.error('Ceramic authentication failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Ceramic authentication failed',
        loading: false 
      }));
      throw error;
    }
  }, [state.profile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Reset state
      setState({
        user: null,
        profile: null,
        ceramicDID: null,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sign out failed',
        loading: false 
      }));
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setState({
            user: null,
            profile: null,
            ceramicDID: null,
            loading: false,
            error: null
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  return {
    ...state,
    authenticateWithCeramic,
    signOut,
    isAuthenticated: !!(state.user && state.profile),
    isCeramicConnected: !!state.ceramicDID
  };
}
