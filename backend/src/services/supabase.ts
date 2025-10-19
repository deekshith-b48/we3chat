import { createClient } from '@supabase/supabase-js';
import { ENV } from '../env.js';

// Admin client with service role key (server-side only)
export const supabaseAdmin = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE,
  {
    auth: { persistSession: false },
    global: { fetch: fetch as any }
  }
);

// Client for user operations (uses anon key)
export const supabaseClient = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: true },
    global: { fetch: fetch as any }
  }
);

export interface Profile {
  id: string;
  email: string | null;
  wallet_address: string | null;
  ceramic_did: string | null;
  username: string | null;
  avatar_url: string | null;
  public_key: string | null;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  created_by: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: 'text' | 'image' | 'file' | 'system';
  tx_hash: string | null;
  block_number: number | null;
  cid_hash: string | null;
  cid: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_type: 'email' | 'wallet' | 'siwe';
  session_data: any;
  expires_at: string;
  created_at: string;
  last_activity: string;
}
