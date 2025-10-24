/**
 * Chats List Component
 * 
 * Displays the list of user's chats from Supabase
 */

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../utils/supabase';
import { useAuth } from '../../../hooks/supabase/useAuth';

export interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group';
  last_activity: string;
  participants: Array<{
    id: string;
    username: string;
    avatar_url?: string;
  }>;
}

interface ChatsListProps {
  onChatSelect: (chatId: string) => void;
  activeChatId?: string;
}

export default function ChatsList({ onChatSelect, activeChatId }: ChatsListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  /**
   * Load user's chats from Supabase
   */
  const loadChats = async () => {
    if (!user) {
      setChats([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner(
            id,
            name,
            type,
            last_activity,
            chat_participants!inner(
              user_id,
              profiles!inner(
                id,
                username,
                avatar_url
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false, referencedTable: 'chats' });

      if (error) {
        throw error;
      }

      const formattedChats: Chat[] = (data || []).map((item: any) => ({
        id: item.chats.id,
        name: item.chats.name,
        type: item.chats.type,
        last_activity: item.chats.last_activity,
        participants: item.chats.chat_participants.map((p: any) => ({
          id: p.profiles.id,
          username: p.profiles.username,
          avatar_url: p.profiles.avatar_url,
        })),
      }));

      setChats(formattedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format last activity time
   */
  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  /**
   * Get chat display name
   */
  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name;
    }

    // For direct chats, show the other participant's name
    const otherParticipant = chat.participants.find(p => p.id !== user?.id);
    return otherParticipant?.username || chat.name;
  };

  /**
   * Get chat avatar
   */
  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return (
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">G</span>
        </div>
      );
    }

    const otherParticipant = chat.participants.find(p => p.id !== user?.id);
    const username = otherParticipant?.username || 'U';
    
    return (
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-sm">
          {username.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  /**
   * Load chats when user changes
   */
  useEffect(() => {
    loadChats();
  }, [user]);

  /**
   * Set up real-time subscription for chat updates
   */
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    
    const subscription = supabase
      .channel('chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          // Reload chats when any chat is updated
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload chats when user's participation changes
          loadChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={loadChats}
            className="mt-2 text-blue-600 text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No chats yet</p>
          <p className="text-gray-400 text-xs mt-1">Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-1 p-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onChatSelect(chat.id)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              activeChatId === chat.id
                ? 'bg-blue-100 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {getChatAvatar(chat)}
            
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium truncate">
                {getChatDisplayName(chat)}
              </p>
              <p className="text-xs text-gray-500">
                {formatLastActivity(chat.last_activity)}
              </p>
            </div>

            {chat.type === 'group' && (
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
