'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Users, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  User,
  Phone,
  Filter,
  SortAsc,
  SortDesc,
  Archive,
  Shield,
  MoreVertical,
} from 'lucide-react';
import { User as UserType } from '@/lib/contract';
import { WalletInfo } from '@/lib/web3-auth';
import { ChatRoom } from '@/lib/realtime-messaging';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: UserType | null;
  wallet: WalletInfo | null;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  selectedChat,
  onSelectChat,
  searchQuery,
  onSearchChange,
  user,
  wallet
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'contacts' | 'calls'>('chats');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'unread'>('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatRoom[]>([]);

  // Load chats when component mounts
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      // This would be implemented to load chats from the API
      // For now, we'll leave it empty as chats will be passed as props
      console.log('Loading chats...');
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  // Filter and sort chats
  useEffect(() => {
    let filtered = chats.filter(chat => {
      const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTab === 'chats' || 
        (activeTab === 'groups' && chat.type === 'group') ||
        (activeTab === 'contacts' && chat.type === 'direct') ||
        (activeTab === 'calls' && chat.type === 'direct');
      const matchesArchive = showArchived || !chat.name.includes('Archived');
      
      return matchesSearch && matchesType && matchesArchive;
    });

    // Sort chats
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'unread':
          return b.unreadCount - a.unreadCount;
        default:
          return 0;
      }
    });

    setFilteredChats(filtered);
  }, [chats, searchQuery, activeTab, sortBy, showArchived]);

  const tabs = [
    { id: 'chats', label: 'Chats', icon: MessageCircle, count: chats.filter(c => c.type === 'direct').length },
    { id: 'groups', label: 'Groups', icon: Users, count: chats.filter(c => c.type === 'group').length },
    { id: 'contacts', label: 'Contacts', icon: User, count: chats.filter(c => c.type === 'direct').length },
    { id: 'calls', label: 'Calls', icon: Phone, count: 0 }
  ];

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 ${collapsed ? 'w-20' : 'w-80'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  We3Chat
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Search Bar */}
        {!collapsed && (
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      {!collapsed && (
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      {!collapsed && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button 
                onClick={() => setSortBy(sortBy === 'recent' ? 'alphabetical' : 'recent')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {sortBy === 'recent' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`p-2 rounded-lg transition-colors ${
                  showArchived 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filteredChats.map((chat) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectChat(chat.id)}
              className={`p-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 ${
                selectedChat === chat.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {chat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {chat.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {chat.lastMessage?.timestamp && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        {chat.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {chat.lastMessage?.content || 'No messages yet'}
                      </p>
                      <div className="flex items-center space-x-1">
                        {chat.type === 'group' && <Users className="w-3 h-3 text-slate-400" />}
                        {chat.lastMessage?.encrypted && <Shield className="w-3 h-3 text-green-500" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredChats.length === 0 && !collapsed && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              No {activeTab} found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {searchQuery ? 'Try a different search term' : `Start a new ${activeTab === 'chats' ? 'chat' : activeTab.slice(0, -1)}`}
            </p>
          </div>
        )}
      </div>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
              alt={user.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {user.displayName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{user.username}
              </p>
            </div>
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}