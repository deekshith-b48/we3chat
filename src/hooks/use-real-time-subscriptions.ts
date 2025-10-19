import { useEffect, useRef, useState } from 'react';
import { useAuth } from './supabase/useAuth';
import { useChatStore } from '@/store/chat-store';
import { io, Socket } from 'socket.io-client';

interface RealTimeSubscriptionState {
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
}

export function useRealTimeSubscriptions() {
  const { user, isAuthenticated } = useAuth();
  const {
    setOnlineStatus,
    updateLastSeen,
    setTypingUsers,
    updateUnreadCount,
    markAsRead,
    addMessage,
    updateMessage,
    updateFriend
  } = useChatStore();
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<RealTimeSubscriptionState>({
    isConnected: false,
    connectionError: null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const connectToSocket = () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      
      // Get auth token from localStorage or session
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        console.warn('No auth token found for socket connection');
        return;
      }

      socketRef.current = io(backendUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('🔌 Connected to real-time server');
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          reconnectAttempts: 0
        }));
        
        setOnlineStatus(true);
        updateLastSeen();
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from real-time server:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionError: reason
        }));
        
        setOnlineStatus(false);
        
        // Attempt to reconnect if not a manual disconnect
        if (reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
        setState(prev => ({
          ...prev,
          connectionError: error.message,
          reconnectAttempts: prev.reconnectAttempts + 1
        }));
        
        setOnlineStatus(false);
        scheduleReconnect();
      });

      // Message events
      socketRef.current.on('new_message', (messageData) => {
        console.log('📨 New message received:', messageData);
        
        // Convert API message to store format
        const message = {
          id: messageData.id,
          sender: messageData.sender.address,
          receiver: user.id,
          content: messageData.content,
          timestamp: new Date(messageData.createdAt).getTime(),
          cidHash: messageData.cidHash || '',
          cid: messageData.cid || '',
          status: messageData.status as 'pending' | 'confirmed' | 'failed',
          txHash: messageData.txHash,
          blockNumber: messageData.blockNumber
        };
        
        addMessage(message.sender, message);
        
        // Update unread count if not from current conversation
        const currentFriend = useChatStore.getState().selectedFriend;
        if (currentFriend !== message.sender) {
          const currentCount = useChatStore.getState().unreadCounts[message.sender] || 0;
          updateUnreadCount(message.sender, currentCount + 1);
        }
      });

      socketRef.current.on('blockchain_message_received', (messageData) => {
        console.log('🔗 Blockchain message received:', messageData);
        
        // Handle blockchain message (content will be decrypted on client)
        const message = {
          id: messageData.id,
          sender: messageData.sender.address,
          receiver: user.id,
          content: messageData.content,
          timestamp: new Date(messageData.createdAt).getTime(),
          cidHash: messageData.cidHash || '',
          cid: messageData.cid || '',
          status: 'confirmed' as const,
          isEncrypted: true
        };
        
        addMessage(message.sender, message);
        
        // Update unread count
        const currentFriend = useChatStore.getState().selectedFriend;
        if (currentFriend !== message.sender) {
          const currentCount = useChatStore.getState().unreadCounts[message.sender] || 0;
          updateUnreadCount(message.sender, currentCount + 1);
        }
      });

      socketRef.current.on('message_updated', (updateData) => {
        console.log('📝 Message updated:', updateData);
        
        // Find the message and update it
        const conversations = useChatStore.getState().conversations;
        for (const [friendAddress, messages] of Object.entries(conversations)) {
          const messageIndex = messages.findIndex(msg => msg.id === updateData.messageId);
          if (messageIndex !== -1) {
            updateMessage(friendAddress, updateData.messageId, {
              status: updateData.status,
              txHash: updateData.txHash,
              blockNumber: updateData.blockNumber
            });
            break;
          }
        }
      });

      // Typing indicators
      socketRef.current.on('user_typing', (data) => {
        const currentConversation = useChatStore.getState().selectedFriend;
        if (currentConversation && data.conversationId) {
          const currentTyping = useChatStore.getState().typingUsers[data.conversationId] || [];
          if (!currentTyping.includes(data.userId)) {
            setTypingUsers(data.conversationId, [...currentTyping, data.userId]);
          }
        }
      });

      socketRef.current.on('user_stopped_typing', (data) => {
        const currentTyping = useChatStore.getState().typingUsers[data.conversationId] || [];
        setTypingUsers(data.conversationId, currentTyping.filter(id => id !== data.userId));
      });

      // Friend presence updates
      socketRef.current.on('friend_presence_updated', (data) => {
        console.log('👥 Friend presence updated:', data);
        
        updateFriend(data.userId, {
          isOnline: data.status === 'online',
          lastSeen: data.timestamp
        });
      });

      // Friend addition events
      socketRef.current.on('friend_added_blockchain', (data) => {
        console.log('👥 Friend added via blockchain:', data);
        
        // Add friend to store
        const newFriend = {
          address: data.friendAddress,
          username: data.friendName,
          publicKey: '',
          isOnline: false
        };
        
        useChatStore.getState().addFriend(newFriend);
      });

      // Account creation events
      socketRef.current.on('account_created_blockchain', (data) => {
        console.log('👤 Account created via blockchain:', data);
        
        // Update current user if it's their account
        if (user.id.toLowerCase() === data.userAddress?.toLowerCase()) {
          useChatStore.getState().setUser({
            address: user.id,
            username: data.username,
            publicKey: data.publicKey,
            isRegistered: true
          });
        }
      });
    };

    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      const maxAttempts = 5;
      const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000); // Max 30s
      
      if (state.reconnectAttempts < maxAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Attempting to reconnect (attempt ${state.reconnectAttempts + 1})`);
          connectToSocket();
        }, delay);
      } else {
        console.error('❌ Max reconnection attempts reached');
        setState(prev => ({
          ...prev,
          connectionError: 'Failed to reconnect after multiple attempts'
        }));
      }
    };

    connectToSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setOnlineStatus(false);
    };
  }, [isAuthenticated, user?.id]);

  // Join conversation room when selected friend changes
  useEffect(() => {
    if (socketRef.current?.connected && user) {
      const selectedFriend = useChatStore.getState().selectedFriend;
      
      if (selectedFriend) {
        // Find conversation ID (this would need to be implemented based on your API)
        // For now, we'll use a placeholder
        const conversationId = `direct_${user.id}_${selectedFriend}`;
        
        socketRef.current.emit('join_conversation', { conversationId });
        
        // Mark messages as read when joining conversation
        markAsRead(selectedFriend);
      }
    }
  }, [user?.id, useChatStore.getState().selectedFriend]);

  // Send typing indicators
  const sendTypingStart = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversationId });
    }
  };

  const sendTypingStop = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversationId });
    }
  };

  // Update presence
  const updatePresence = (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_presence', { status });
    }
  };

  return {
    ...state,
    sendTypingStart,
    sendTypingStop,
    updatePresence,
    socket: socketRef.current
  };
}
