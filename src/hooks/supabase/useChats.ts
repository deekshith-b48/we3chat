import { useState, useEffect, useCallback } from 'react';
import { supabase, Chat, ChatParticipant, Profile } from '@/utils/supabase';
import { useAuth } from './useAuth';

interface ChatWithParticipants extends Chat {
  participants: (ChatParticipant & { profile: Profile })[];
}

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithParticipants[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's chats
  const fetchChats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch chats where user is a participant
      const { data: chatParticipants, error: fetchError } = await supabase
        .from('chat_participants')
        .select(`
          chat:chats(*),
          profile:profiles(*)
        `)
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Group by chat and include all participants
      const chatMap = new Map<string, ChatWithParticipants>();

      for (const cp of chatParticipants || []) {
        const chat = (Array.isArray(cp.chat) ? cp.chat[0] : cp.chat) as Chat;
        if (!chat || !chatMap.has(chat.id)) {
          if (chat) {
            chatMap.set(chat.id, {
              ...chat,
              participants: []
            });
          }
        }

        // Fetch all participants for this chat
        const { data: allParticipants, error: participantsError } = await supabase
          .from('chat_participants')
          .select(`
            *,
            profile:profiles(*)
          `)
          .eq('chat_id', chat.id);

        if (participantsError) throw participantsError;

        chatMap.set(chat.id, {
          ...chatMap.get(chat.id)!,
          participants: allParticipants as (ChatParticipant & { profile: Profile })[]
        });
      }

      const chatsArray = Array.from(chatMap.values())
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

      setChats(chatsArray);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create a new direct message chat
  const createDirectChat = useCallback(async (otherUserId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);

      // Check if chat already exists
      const { data: existingChat, error: checkError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chat:chats(*)
        `)
        .eq('user_id', user.id);

      if (checkError) throw checkError;

      // Find existing direct chat with this user
      for (const cp of existingChat || []) {
        const chat = (Array.isArray(cp.chat) ? cp.chat[0] : cp.chat) as Chat;
        if (chat && chat.type === 'direct') {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
            .eq('user_id', otherUserId)
            .single();

          if (otherParticipant) {
            // Chat already exists
            return chat.id;
          }
        }
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          type: 'direct',
          last_activity: new Date().toISOString()
        }])
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          {
            chat_id: newChat.id,
            user_id: user.id,
            role: 'member'
          },
          {
            chat_id: newChat.id,
            user_id: otherUserId,
            role: 'member'
          }
        ]);

      if (participantsError) throw participantsError;

      // Refresh chats
      await fetchChats();

      return newChat.id;
    } catch (err) {
      console.error('Error creating direct chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to create chat');
      throw err;
    }
  }, [user, fetchChats]);

  // Update chat activity (called when new message is sent)
  const updateChatActivity = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', chatId);

      if (error) throw error;

      // Update local state
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, last_activity: new Date().toISOString() }
          : chat
      ).sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()));
    } catch (err) {
      console.error('Error updating chat activity:', err);
    }
  }, []);

  // Subscribe to real-time chat updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          fetchChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user, fetchChats]);

  return {
    chats,
    loading,
    error,
    fetchChats,
    createDirectChat,
    updateChatActivity
  };
}
