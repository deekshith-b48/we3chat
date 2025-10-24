import React from 'react';
import { MessageCircle, User, Users } from 'lucide-react';
import { Chat } from '../../../utils/supabase';

interface ChatsListProps {
  chats: Chat[];
  loading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export function ChatsList({ chats, loading, selectedChatId, onSelectChat }: ChatsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
        <p className="text-gray-500 text-sm">
          Start a conversation by clicking the + button above
        </p>
      </div>
    );
  }

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    // For direct messages, we'd typically show the other participant's name
    // For now, showing a placeholder
    return 'Direct Message';
  };

  return (
    <div className="divide-y divide-gray-100">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectChat(chat.id)}
          className={`w-full text-left flex items-start space-x-3 p-4 hover:bg-gray-50 transition-colors ${
            selectedChatId === chat.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
          }`}
        >
          {/* Avatar */}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {chat.type === 'group' ? (
              <Users className="w-5 h-5 text-gray-600" />
            ) : (
              <User className="w-5 h-5 text-gray-600" />
            )}
          </div>

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 truncate">
                {getChatName(chat)}
              </p>
              <p className="text-xs text-gray-500">
                {formatLastActivity(chat.last_activity)}
              </p>
            </div>
            <p className="text-sm text-gray-500 truncate mt-1">
              Messages stored on Ceramic
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
