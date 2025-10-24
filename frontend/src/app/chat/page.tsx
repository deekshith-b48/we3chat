"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, Chat, Message } from "@/lib/supabase";
import { Send, Search, Users, MoreVertical, Phone, Video, Smile, Paperclip, Plus } from "lucide-react";
import Image from "next/image";
import CreateChatModal from "@/components/CreateChatModal";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's chats
  const fetchChats = useCallback(async () => {
    if (!user) return;

    try {
      const { data: chatParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      if (chatParticipants && chatParticipants.length > 0) {
        const chatIds = chatParticipants.map(cp => cp.chat_id);

        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select(`
            *,
            participants:chat_participants(
              user_id,
              profile:profiles(id, username, email, avatar_url, is_online, last_seen)
            )
          `)
          .in('chat_id', chatIds)
          .order('updated_at', { ascending: false });

        if (chatsError) throw chatsError;
        setChats(chatsData || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, [user]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, username, email, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.chat_id,
          sender_id: user.id,
          content: newMessage,
          message_type: 'text'
        })
        .select(`
          *,
          sender:profiles(id, username, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage("");

      // Update chat's updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('chat_id', selectedChat.chat_id);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.chat_id);

      const channel = supabase
        .channel(`messages:${selectedChat.chat_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${selectedChat.chat_id}`
          },
          (payload) => {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(msg => msg.message_id === newMessage.message_id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, fetchMessages]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatCreated = () => {
    fetchChats(); // Refresh the chats list
  };

  const getChatName = (chat: Chat) => {
    if (chat.is_group && chat.group_name) {
      return chat.group_name;
    } else if (chat.participants) {
      const otherParticipants = chat.participants.filter(p => p.user_id !== user?.id);
      if (otherParticipants.length === 1) {
        return otherParticipants[0].profile?.username || 'Unknown User';
      } else {
        return `${otherParticipants.length} participants`;
      }
    }
    return 'Unknown Chat';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.is_group && chat.group_avatar_url) {
      return chat.group_avatar_url;
    } else if (chat.participants) {
      const otherParticipants = chat.participants.filter(p => p.user_id !== user?.id);
      if (otherParticipants.length === 1) {
        return otherParticipants[0].profile?.avatar_url;
      }
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredChats = chats.filter(chat =>
    searchQuery === '' ||
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No chats yet</h3>
              <p className="text-gray-600 text-sm">Start a conversation to see your chats here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredChats.map((chat) => (
                <button
                  key={chat.chat_id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedChat?.chat_id === chat.chat_id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      {getChatAvatar(chat) ? (
                        <Image
                          src={getChatAvatar(chat)!}
                          alt="Avatar"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : chat.is_group ? (
                        <Users className="w-6 h-6 text-gray-600" />
                      ) : (
                        <Users className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {getChatName(chat)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {chat.updated_at ? formatTime(chat.updated_at) : ''}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {chat.is_group ? 'Group chat' : 'Direct message'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    {getChatAvatar(selectedChat) ? (
                      <Image
                        src={getChatAvatar(selectedChat)!}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : selectedChat.is_group ? (
                      <Users className="w-5 h-5 text-gray-600" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{getChatName(selectedChat)}</h2>
                    <p className="text-sm text-gray-600">
                      {selectedChat.is_group
                        ? `${selectedChat.participants?.length || 0} members`
                        : 'Direct message'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-600">Start the conversation by sending the first message!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender_id === user.id
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-200 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {message.sender_id !== user.id && (
                        <p className="text-xs opacity-75 mb-1">
                          {message.sender?.username || 'Unknown'}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 opacity-75`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 flex items-center space-x-3 bg-gray-100 rounded-full px-4 py-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
                    disabled={isLoading}
                  />

                  <button className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={isLoading || !newMessage.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition duration-200"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Select a chat to start messaging
              </h2>
              <p className="text-gray-600">
                Choose a conversation from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat Modal */}
      <CreateChatModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}
