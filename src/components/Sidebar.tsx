'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/store/chat-store';
import { useWallet } from '@/hooks/use-wallet';

interface SidebarProps {
  onAddFriend: () => void;
  onShowProfile: () => void;
  onDisconnect: () => void;
}

export default function Sidebar({ onAddFriend, onShowProfile, onDisconnect }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const {
    friends,
    selectedFriend,
    setSelectedFriend,
    conversations,
    user
  } = useChatStore();

  const { address } = useWallet();

  const chatTabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'online', label: 'Online' }
  ];

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'online') {
      return friend.isOnline;
    }
    
    if (activeTab === 'unread') {
      const conversation = conversations[friend.address] || [];
      return conversation.some(msg => 
        msg.sender === friend.address && msg.status === 'confirmed'
      );
    }
    
    return true;
  });

  const getLastMessage = (friendAddress: string) => {
    const conversation = conversations[friendAddress] || [];
    const lastMessage = conversation[conversation.length - 1];
    if (!lastMessage) return "No messages yet";
    
    const isMe = lastMessage.sender === address;
    const preview = lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + "..."
      : lastMessage.content;
    
    return isMe ? `You: ${preview}` : preview;
  };

  const getLastMessageTime = (friendAddress: string) => {
    const conversation = conversations[friendAddress] || [];
    const lastMessage = conversation[conversation.length - 1];
    if (!lastMessage) return "";
    
    const now = Date.now();
    const diff = now - lastMessage.timestamp;
    
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return new Date(lastMessage.timestamp).toLocaleDateString();
  };

  const getUnreadCount = (friendAddress: string) => {
    const conversation = conversations[friendAddress] || [];
    return conversation.filter(msg => 
      msg.sender === friendAddress && msg.status === 'confirmed'
    ).length;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">we3chat</h1>
              <p className="text-sm text-gray-500">{user?.username || 'Loading...'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onAddFriend}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add Friend">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
            <button 
              onClick={onShowProfile}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Profile">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </button>
            <button 
              onClick={onDisconnect}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Disconnect">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat Categories */}
      <div className="px-4 pb-2">
        <div className="flex space-x-1">
          {chatTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Friends/Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-1 p-2">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {friends.length === 0 ? 'No friends yet' : 'No conversations match your search'}
              </p>
              {friends.length === 0 && (
                <button 
                  onClick={onAddFriend}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Add your first friend
                </button>
              )}
            </div>
          ) : (
            filteredFriends.map(friend => {
              const unreadCount = getUnreadCount(friend.address);
              const isSelected = selectedFriend === friend.address;
              
              return (
                <div 
                  key={friend.address}
                  className={`flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedFriend(friend.address)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {getInitials(friend.username)}
                      </span>
                    </div>
                    {friend.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  {/* Friend Info */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {friend.username}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {getLastMessageTime(friend.address)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {getLastMessage(friend.address)}
                      </p>
                      {unreadCount > 0 && (
                        <div className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Online Status Indicator */}
                  {isSelected && (
                    <div className="ml-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Connected to Polygon Amoy</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      </div>
    </>
  );
}
