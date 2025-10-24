import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for TypeScript
export interface Profile {
  id: string
  email: string
  username?: string
  wallet_address?: string
  x25519_public_key?: string
  bio?: string
  avatar_url?: string
  phone?: string
  is_online?: boolean
  last_seen?: string
  created_at: string
  updated_at: string
}

export interface Chat {
  chat_id: string
  is_group: boolean
  created_by: string
  group_name?: string
  group_description?: string
  group_avatar_url?: string
  created_at: string
  updated_at: string
  participants?: ChatParticipant[]
  last_message?: Message
}

export interface ChatParticipant {
  chat_id: string
  user_id: string
  joined_at: string
  role: string
  profile?: Profile
}

export interface Message {
  message_id: string
  chat_id: string
  sender_id: string
  content: string
  file_url?: string
  message_type: string
  created_at: string
  sender?: Profile
  status?: MessageStatus[]
}

export interface MessageStatus {
  message_id: string
  user_id: string
  seen_at?: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  content: string
  is_read: boolean
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  theme: string
  show_online_status: boolean
  show_last_seen: boolean
  allow_notifications: boolean
  created_at: string
  updated_at: string
}

export interface ChatUser {
  id: string
  username: string
  wallet_address: string
  email: string
  is_online: boolean
  last_seen: string
}
