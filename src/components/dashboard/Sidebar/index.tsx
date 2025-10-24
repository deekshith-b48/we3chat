import React, { useState, useMemo } from 'react';
import { SearchBar } from './SearchBar';
import { NewChatButton } from './NewChatButton';
import { ChatsList } from './ChatsList';
import { Chat } from '../../../utils/supabase';

interface SidebarProps {
  chats: Chat[];
  loading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

export function Sidebar({ chats, loading, selectedChatId, onSelectChat }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleChatCreated = (chatId: string) => {
    // Auto-select the newly created chat
    onSelectChat(chatId);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.name?.toLowerCase().includes(query) ||
      chat.id.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <NewChatButton onChatCreated={handleChatCreated} />
        </div>
        <SearchBar onSearchChange={handleSearchChange} />
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        <ChatsList 
          chats={filteredChats}
          loading={loading}
          selectedChatId={selectedChatId}
          onSelectChat={onSelectChat}
        />
        
        {searchQuery && filteredChats.length === 0 && !loading && (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No chats found for &quot;{searchQuery}&quot;</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
