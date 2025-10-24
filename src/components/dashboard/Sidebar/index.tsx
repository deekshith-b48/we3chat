/**
 * Sidebar Component
 * 
 * Main sidebar containing new chat button and chats list
 */

import React from 'react';
import NewChatButton from './NewChatButton';
import ChatsList from './ChatsList';

interface SidebarProps {
  onChatSelect: (chatId: string) => void;
  activeChatId?: string;
}

export default function Sidebar({ onChatSelect, activeChatId }: SidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <NewChatButton onChatCreated={onChatSelect} />
      </div>

      {/* Chats List */}
      <ChatsList onChatSelect={onChatSelect} activeChatId={activeChatId} />
    </div>
  );
}
