import { useEffect, useCallback } from 'react';
import { getSocket, type Message } from '@/lib/api';
import { useChatStore } from '@/store/chat-store';
import { useAuth } from './supabase/useAuth';

export function useRealTimeMessaging() {
  const { isAuthenticated, user } = useAuth();
  const { 
    addMessage, 
    updateMessage, 
    selectedFriend, 
    conversations,
    updateFriend,
    setLoading 
  } = useChatStore();

  const socket = getSocket();

  // Handle incoming messages
  const handleNewMessage = useCallback((messageData: Message & { tempId?: string }) => {
    const { tempId, ...message } = messageData;
    
    // Find conversation participant
    let friendAddress: string;
    if (message.sender.id === user?.id) {
      // Message sent by current user
      const conversation = Object.entries(conversations).find(([_, msgs]) => 
        msgs.some(m => m.id === message.id)
      );
      friendAddress = conversation?.[0] || '';
    } else {
      // Message received from friend
      friendAddress = message.sender.address;
    }

    if (friendAddress) {
      // Convert API message to store format
      const storeMessage = {
        id: message.id,
        sender: message.sender.address,
        receiver: message.sender.id === user?.id ? friendAddress : user?.id || '',
        content: message.content,
        timestamp: new Date(message.createdAt).getTime(),
        cidHash: message.cidHash || '',
        cid: message.cid || '',
        txHash: message.txHash,
        status: message.status as 'pending' | 'confirmed' | 'failed',
        blockNumber: message.blockNumber,
      };

      addMessage(friendAddress, storeMessage);
    }
  }, [addMessage, conversations, user]);

  // Handle message updates (status changes)
  const handleMessageUpdated = useCallback((updateData: {
    messageId: string;
    status?: string;
    txHash?: string;
    blockNumber?: number;
    updatedAt: string;
  }) => {
    // Find which conversation this message belongs to
    for (const [friendAddress, messages] of Object.entries(conversations)) {
      const messageIndex = messages.findIndex(m => m.id === updateData.messageId);
      if (messageIndex !== -1) {
        updateMessage(friendAddress, updateData.messageId, {
          status: updateData.status as 'pending' | 'confirmed' | 'failed',
          txHash: updateData.txHash,
          blockNumber: updateData.blockNumber,
        });
        break;
      }
    }
  }, [conversations, updateMessage]);

  // Handle typing indicators
  const handleUserTyping = useCallback((data: {
    userId: string;
    username: string;
    conversationId: string;
  }) => {
    // You can implement typing indicators in the UI here
    console.log(`${data.username} is typing...`);
  }, []);

  const handleUserStoppedTyping = useCallback((_data: {
    userId: string;
    conversationId: string;
  }) => {
    // Handle stop typing
    console.log('User stopped typing');
  }, []);

  // Handle friend presence updates
  const handleFriendPresenceUpdated = useCallback((data: {
    userId: string;
    status: string;
    timestamp: string;
  }) => {
    // Find friend by user ID and update their online status
    const isOnline = data.status === 'online';
    
    // You might need to map userId to address - this is a simplified version
    // In a real implementation, you'd maintain a userId -> address mapping
    updateFriend(data.userId, { 
      isOnline,
      lastSeen: new Date(data.timestamp).getTime()
    });
  }, [updateFriend]);

  // Handle errors
  const handleError = useCallback((error: { message: string }) => {
    console.error('Socket error:', error.message);
    setLoading(false);
  }, [setLoading]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    // Message events
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_error', handleError);

    // Typing events
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    // Presence events
    socket.on('friend_presence_updated', handleFriendPresenceUpdated);

    // Error handling
    socket.on('error', handleError);

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Real-time messaging connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Real-time messaging disconnected');
    });

    // Cleanup
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_error', handleError);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('friend_presence_updated', handleFriendPresenceUpdated);
      socket.off('error', handleError);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [
    socket,
    isAuthenticated,
    handleNewMessage,
    handleMessageUpdated,
    handleUserTyping,
    handleUserStoppedTyping,
    handleFriendPresenceUpdated,
    handleError
  ]);

  // Join/leave conversation rooms when selected friend changes
  useEffect(() => {
    if (!socket || !selectedFriend) return;

    // This would need to be adapted based on how you determine conversation IDs
    // For now, we'll use a simple approach
    const conversationId = `direct_${[user?.id, selectedFriend].sort().join('_')}`;
    
    socket.emit('join_conversation', { conversationId });

    return () => {
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, selectedFriend, user?.id]);

  // Utility functions for real-time actions
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socket) return;
    
    if (isTyping) {
      socket.emit('typing_start', { conversationId });
    } else {
      socket.emit('typing_stop', { conversationId });
    }
  }, [socket]);

  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!socket) return;
    socket.emit('update_presence', { status });
  }, [socket]);

  const sendMessageViaSocket = useCallback((data: {
    conversationId: string;
    content: string;
    type?: string;
    replyToId?: string;
    tempId?: string;
  }) => {
    if (!socket) return;
    socket.emit('send_message', data);
  }, [socket]);

  const updateMessageStatus = useCallback((data: {
    messageId: string;
    status: string;
    txHash?: string;
    blockNumber?: number;
  }) => {
    if (!socket) return;
    socket.emit('update_message_status', data);
  }, [socket]);

  return {
    isConnected: socket?.connected || false,
    sendTypingIndicator,
    updatePresence,
    sendMessageViaSocket,
    updateMessageStatus,
  };
}

// Hook for joining/leaving specific conversations
export function useConversationRoom(conversationId: string | null) {
  const socket = getSocket();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', { conversationId });

    return () => {
      socket.emit('leave_conversation', { conversationId });
    };
  }, [socket, conversationId]);
}

// Hook for typing indicators
export function useTypingIndicator(conversationId: string | null) {
  const { sendTypingIndicator } = useRealTimeMessaging();
  let typingTimeout: NodeJS.Timeout;

  const startTyping = useCallback(() => {
    if (!conversationId) return;
    
    sendTypingIndicator(conversationId, true);
    
    // Auto-stop typing after 3 seconds of inactivity
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTypingIndicator(conversationId, false);
    }, 3000);
  }, [conversationId, sendTypingIndicator]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    
    clearTimeout(typingTimeout);
    sendTypingIndicator(conversationId, false);
  }, [conversationId, sendTypingIndicator]);

  return { startTyping, stopTyping };
}
