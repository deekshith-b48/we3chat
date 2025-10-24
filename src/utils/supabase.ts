import { createClient } from '@supabase/supabase-js';
import { loadConfig } from './ceramic';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  const config = await loadConfig();
  supabaseClient = createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );
  
  return supabaseClient;
}

// Export for immediate use (will be initialized on first import)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Database types for TypeScript
export interface Profile {
  id: string;
  did: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  ceramic_stream_id?: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
