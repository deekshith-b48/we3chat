import React, { createContext, useContext } from 'react';
import { useAuth as useSupabaseAuth } from '../hooks/supabase/useAuth';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  did: string;
  username: string;
  created_at: string;
  updated_at: string;
}

const AuthContext = createContext<{
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCeramicConnected: boolean;
  ceramicDID: string | null;
  error: string | null;
  authenticateWithCeramic: () => Promise<string>;
  signOut: () => Promise<void>;
}>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isCeramicConnected: false,
  ceramicDID: null,
  error: null,
  authenticateWithCeramic: async () => '',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSupabaseAuth();

  return (
    <AuthContext.Provider value={{
      user: auth.user,
      profile: auth.profile,
      isLoading: auth.loading,
      isAuthenticated: auth.isAuthenticated,
      isCeramicConnected: auth.isCeramicConnected,
      ceramicDID: auth.ceramicDID,
      error: auth.error,
      authenticateWithCeramic: auth.authenticateWithCeramic,
      signOut: auth.signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
