'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuthMock';
import { AuthModal } from './AuthModal';
import { LoadingScreen } from './LoadingScreen';
import { api, Conversation, Message } from '../lib/api';
import { useRealtimeMessaging } from '../hooks/use-real-time-messaging';
import IPFSStatus from './IPFSStatus';
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Plus, 
  Search,
  Bell,
  User,
  LogOut,
  Wallet,
  Mail
} from 'lucide-react';


export function Dashboard() {
  const { user, isAuthenticated, isLoading, logout, authMethod } = useAuth();
  const { 
    isConnected, 
    messages, 
    conversations, 
    sendMessage: sendRealtimeMessage,
    joinConversation,
    leaveConversation,
    markAsRead
  } = useRealtimeMessaging();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [chats, setChats] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats();
    }
  }, [isAuthenticated, user?.id]);

  // Update chats from real-time messaging
  useEffect(() => {
    if (conversations.length > 0) {
      setChats(conversations);
    }
  }, [conversations]);

  // Join/leave conversation when active chat changes
  useEffect(() => {
    if (activeChat) {
      joinConversation(activeChat.id);
      loadMessages(activeChat.id);
      
      return () => {
        leaveConversation(activeChat.id);
      };
    }
  }, [activeChat, joinConversation, leaveConversation]);

  const loadChats = async () => {
    try {
      setIsLoadingChats(true);
      
      if (!user) return;

      const { conversations } = await api.getConversations();
      setChats(conversations);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      
      const { messages: conversationMessages } = await api.getMessages(conversationId);
      // Messages will be managed by the real-time messaging hook
      // This is just for initial load
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Filter messages for the active chat
  const activeChatMessages = activeChat 
    ? messages.filter(msg => msg.conversationId === activeChat.id)
    : [];

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !user) return;

    try {
      // Send via real-time messaging
      await sendRealtimeMessage(activeChat.id, newMessage.trim(), 'text');
      setNewMessage('');
      
      // Mark conversation as read
      await markAsRead(activeChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createNewChat = async () => {
    try {
      // For now, create a direct conversation with a placeholder
      // In a real implementation, you'd have a UI to select a user
      const { conversation } = await api.createConversation({
        type: 'direct',
        participantAddress: '0x0000000000000000000000000000000000000000' // Placeholder
      });
      
      setChats(prev => [conversation, ...prev]);
      setActiveChat(conversation);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setChats([]);
      setActiveChat(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading We3Chat..." />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg mb-8">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              We3Chat
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Decentralized Messaging Platform
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              We3Chat
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={createNewChat}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.address?.slice(0, 6)}...{user?.address?.slice(-4)}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                {authMethod === 'email' ? (
                  <Mail className="w-3 h-3 text-slate-400" />
                ) : (
                  <Wallet className="w-3 h-3 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {user?.address?.slice(0, 6)}...{user?.address?.slice(-4)}
                </span>
              </div>
              <div className="mt-2">
                <IPFSStatus />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No chats yet</p>
              <button
                onClick={createNewChat}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium mt-1"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <div className="p-2">
              {chats
                .filter(chat => 
                  (chat.name || chat.otherParticipant?.username || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeChat?.id === chat.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        {chat.otherParticipant?.avatar ? (
                          <img 
                            src={chat.otherParticipant.avatar} 
                            alt={chat.otherParticipant.username || 'User'}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <MessageCircle className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {chat.name || chat.otherParticipant?.username || 'Unknown'}
                          </p>
                          {isConnected && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-xs text-green-600 dark:text-green-400">Online</span>
                            </div>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {chat.lastMessage.sender.username}: {chat.lastMessage.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {chat.type === 'direct' ? 'Direct' : 'Group'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {activeChat.otherParticipant?.avatar ? (
                    <img 
                      src={activeChat.otherParticipant.avatar} 
                      alt={activeChat.otherParticipant.username || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {activeChat.name || activeChat.otherParticipant?.username || 'Unknown'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {activeChat.type === 'direct' ? 'Direct Message' : 'Group Chat'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400">No messages yet</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Start the conversation!</p>
                </div>
              ) : (
                activeChatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.sender.id === user?.id ? 'order-2' : 'order-1'}`}>
                      <div className={`p-3 rounded-2xl ${
                        message.sender.id === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        {message.status === 'pending' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span className="text-xs opacity-75">Sending...</span>
                          </div>
                        )}
                        {message.status === 'failed' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-xs opacity-75">Failed</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Select a chat
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}