/**
 * Supabase Client Configuration
 * 
 * This creates a Supabase client that works with our runtime configuration
 * and is optimized for IPFS deployment.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client with runtime configuration
 */
export async function createSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = await getConfig();
  
  supabaseClient = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        // Optimize for IPFS deployment
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Disable for IPFS compatibility
        flowType: 'pkce'
      },
      realtime: {
        // Enable real-time features for chat functionality
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': `we3chat-${config.app.version}`
        }
      }
    }
  );

  console.log('✅ Supabase client initialized');
  return supabaseClient;
}

/**
 * Get the current Supabase client
 * Throws an error if client hasn't been initialized
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call createSupabaseClient() first.');
  }
  return supabaseClient;
}

/**
 * Database Types (TypeScript definitions for our schema)
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          did: string;
          username: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          did: string;
          username: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          did?: string;
          username?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name: string;
          type: 'direct' | 'group';
          last_activity: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'direct' | 'group';
          last_activity?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'direct' | 'group';
          last_activity?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_participants: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          type: 'message' | 'mention' | 'system';
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          type: 'message' | 'mention' | 'system';
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          type?: 'message' | 'mention' | 'system';
          read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
// export type Enums = Database['public']['Enums'];
