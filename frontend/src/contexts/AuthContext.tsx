"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { getOrCreateX25519 } from '@/lib/crypto'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const profileFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Small delay to prevent rapid successive calls
        setTimeout(() => {
          if (!profileFetchedRef.current.has(session.user.id)) {
            fetchProfile(session.user.id)
          } else {
            setLoading(false)
          }
        }, 100)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Reset profile fetch tracking for new user
          if (!profileFetchedRef.current.has(session.user.id)) {
            await fetchProfile(session.user.id)
          }
        } else {
          setProfile(null)
          setLoading(false)
          // Clear profile fetch tracking on logout
          profileFetchedRef.current.clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    // Prevent duplicate fetches
    if (profileFetchedRef.current.has(userId)) {
      return;
    }
    
    try {
      setLoading(true)
      profileFetchedRef.current.add(userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const user = await supabase.auth.getUser()
        if (user.data.user) {
          // Generate wallet for new user
          const privateKey = generatePrivateKey()
          const account = privateKeyToAccount(privateKey)
          
          // Generate X25519 keypair for encryption
          const { publicKey: x25519PublicKey } = getOrCreateX25519()
          
          const newProfile = {
            id: userId,
            email: user.data.user.email || '',
            username: `user_${userId.slice(0, 8)}`,
            wallet_address: account.address,
            x25519_public_key: JSON.stringify(Array.from(x25519PublicKey)),
          }
          
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single()

          if (createError) {
            console.error('Error creating profile:', createError)
            // If table doesn't exist, provide helpful message
            if (createError.message?.includes('relation "profiles" does not exist')) {
              console.error('❌ Profiles table does not exist in Supabase database.')
              console.error('📋 Please run the SQL commands from supabase_schema.sql in your Supabase project.')
              console.error('🔗 Go to your Supabase project > SQL Editor > Run the schema')
              
              // Create a temporary profile for testing
              const tempProfile: Profile = {
                id: userId,
                email: user.data.user.email || '',
                username: `user_${userId.slice(0, 8)}`,
                wallet_address: account.address,
                x25519_public_key: JSON.stringify(Array.from(x25519PublicKey)),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              console.log('🔧 Using temporary profile for testing:', tempProfile)
              setProfile(tempProfile)
              return
            }
            setProfile(null)
          } else {
            setProfile(createdProfile)
          }
        }
      } else if (error) {
        console.error('Error fetching profile:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        // Check if it's a table not found error
        if (error.message?.includes('relation "profiles" does not exist') || 
            error.message?.includes('table') || 
            error.code === '42P01') {
          console.error('❌ Profiles table does not exist in Supabase database.')
          console.error('📋 Please run the SQL commands from supabase_schema.sql in your Supabase project.')
          console.error('🔗 Go to your Supabase project > SQL Editor > Run the schema')
          
          // Create a temporary profile for testing without database
          const user = await supabase.auth.getUser()
          if (user.data.user) {
            const privateKey = generatePrivateKey()
            const account = privateKeyToAccount(privateKey)
            const { publicKey: x25519PublicKey } = getOrCreateX25519()
            
            const tempProfile: Profile = {
              id: userId,
              email: user.data.user.email || '',
              username: `temp_user_${userId.slice(0, 8)}`,
              wallet_address: account.address,
              x25519_public_key: JSON.stringify(Array.from(x25519PublicKey)),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            console.log('🔧 Using temporary profile for testing (no database):', tempProfile)
            setProfile(tempProfile)
            return
          }
        }
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      })

      if (error) throw error

      // Profile will be created automatically when auth state changes
      console.log('Sign up successful:', data.user?.email)
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      console.log('Sign in successful:', data.user?.email)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }, [user])

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }), [user, session, profile, loading, signUp, signIn, signOut, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
