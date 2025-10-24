-- Updated We3Chat Supabase Database Schema
-- Run this in your Supabase SQL editor to update the existing schema

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Update profiles table to match the expected structure
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN display_name SET NOT NULL;

-- Create chats table (renamed from conversations for consistency)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  avatar_url TEXT,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_participants table (renamed from conversation_members)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(chat_id, user_id)
);

-- Update messages table to match expected structure
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for the new tables
CREATE INDEX IF NOT EXISTS chats_created_by_idx ON public.chats (created_by);
CREATE INDEX IF NOT EXISTS chats_last_message_at_idx ON public.chats (last_message_at DESC);
CREATE INDEX IF NOT EXISTS chat_participants_chat_id_idx ON public.chat_participants (chat_id);
CREATE INDEX IF NOT EXISTS chat_participants_user_id_idx ON public.chat_participants (user_id);
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages (chat_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages (created_at DESC);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for new tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Users can view chats they're participants in" ON public.chats
  FOR SELECT USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create chats" ON public.chats
  FOR INSERT WITH CHECK (created_by::text = auth.uid()::text);

-- Create RLS policies for chat_participants
CREATE POLICY "Users can view participants of their chats" ON public.chat_participants
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can add participants to their chats" ON public.chat_participants
  FOR INSERT WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chats 
      WHERE created_by::text = auth.uid()::text
    )
  );

-- Update messages policies to work with chat_id
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages in their chats" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id::text = auth.uid()::text AND
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- Create a function to create a direct chat between two users
CREATE OR REPLACE FUNCTION create_direct_chat(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  existing_chat_id UUID;
BEGIN
  -- Check if direct chat already exists
  SELECT c.id INTO existing_chat_id
  FROM public.chats c
  JOIN public.chat_participants cp1 ON c.id = cp1.chat_id
  JOIN public.chat_participants cp2 ON c.id = cp2.chat_id
  WHERE c.type = 'direct'
    AND cp1.user_id = user1_id
    AND cp2.user_id = user2_id;
  
  IF existing_chat_id IS NOT NULL THEN
    RETURN existing_chat_id;
  END IF;
  
  -- Create new direct chat
  INSERT INTO public.chats (name, type, created_by)
  VALUES ('Direct Chat', 'direct', user1_id)
  RETURNING id INTO chat_id;
  
  -- Add both users as participants
  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES (chat_id, user1_id), (chat_id, user2_id);
  
  RETURN chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_direct_chat(UUID, UUID) TO authenticated;
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chat_participants TO authenticated;

