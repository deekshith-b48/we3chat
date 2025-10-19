-- We3Chat Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for unified user identity
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  wallet_address TEXT UNIQUE,
  ceramic_did TEXT,
  username TEXT,
  avatar_url TEXT,
  public_key TEXT,
  is_registered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_wallet_address_idx ON public.profiles (LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS profiles_ceramic_did_idx ON public.profiles (ceramic_did);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation members table
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
  tx_hash TEXT,
  block_number BIGINT,
  cid_hash TEXT,
  cid TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  reply_to_id UUID REFERENCES public.messages(id),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Create sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type TEXT CHECK (session_type IN ('email', 'wallet', 'siwe')),
  session_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages (created_at DESC);
CREATE INDEX IF NOT EXISTS messages_cid_hash_idx ON public.messages (cid_hash);
CREATE INDEX IF NOT EXISTS messages_tx_hash_idx ON public.messages (tx_hash);
CREATE INDEX IF NOT EXISTS messages_status_idx ON public.messages (status);

CREATE INDEX IF NOT EXISTS conversation_members_conversation_id_idx ON public.conversation_members (conversation_id);
CREATE INDEX IF NOT EXISTS conversation_members_user_id_idx ON public.conversation_members (user_id);

CREATE INDEX IF NOT EXISTS friendships_requester_id_idx ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_id_idx ON public.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON public.friendships (status);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON public.user_sessions (expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Conversations policies
CREATE POLICY "Users can view conversations they're members of" ON public.conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.conversation_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Conversation members policies
CREATE POLICY "Users can view members of their conversations" ON public.conversation_members
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id::text = auth.uid()::text AND
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (
    requester_id::text = auth.uid()::text OR 
    addressee_id::text = auth.uid()::text
  );

CREATE POLICY "Users can create friendship requests" ON public.friendships
  FOR INSERT WITH CHECK (requester_id::text = auth.uid()::text);

CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE USING (
    requester_id::text = auth.uid()::text OR 
    addressee_id::text = auth.uid()::text
  );

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Create a function to get user profile by auth.uid()
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  wallet_address TEXT,
  ceramic_did TEXT,
  username TEXT,
  avatar_url TEXT,
  public_key TEXT,
  is_registered BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.wallet_address,
    p.ceramic_did,
    p.username,
    p.avatar_url,
    p.public_key,
    p.is_registered,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile() TO authenticated;

-- Create a view for easy profile access
CREATE OR REPLACE VIEW user_profile AS
SELECT * FROM get_user_profile();

-- Grant access to the view
GRANT SELECT ON user_profile TO authenticated;
