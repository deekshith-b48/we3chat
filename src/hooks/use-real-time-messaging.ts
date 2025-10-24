import { useEffect, useCallback, useState } from 'react';
import { getSocket, type Message, type Conversation } from '@/lib/api';
import { useAuth } from './useAuthMock';
import { useIPFS } from './ipfs/useIPFS';

export interface RealtimeMessagingState {
  isConnected: boolean;
  messages: Message[];
  conversations: Conversation[];
  typingUsers: string[];
  onlineUsers: string[];
}

export interface RealtimeMessagingActions {
  sendMessage: (conversationId: string, content: string, type?: string, replyToId?: string) => Promise<void>;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => void;
}

export function useRealtimeMessaging(): RealtimeMessagingState & RealtimeMessagingActions {
  const { isAuthenticated, user } = useAuth();
  const { uploadMessage: uploadToIPFS, downloadMessage: downloadFromIPFS, availableProviders } = useIPFS();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const socket = getSocket();

  // Handle incoming messages
  const handleNewMessage = useCallback(async (messageData: Message & { tempId?: string; cid?: string; cidHash?: string }) => {
    const { tempId, cid, cidHash, ...message } = messageData;
    
    // If message has IPFS content, try to retrieve it
    let finalContent = message.content;
    if (cid || cidHash) {
      try {
        const ipfsContent = await downloadFromIPFS(cid || cidHash!);
        finalContent = ipfsContent;
        console.log('📥 Retrieved message content from IPFS:', cid || cidHash);
      } catch (ipfsError) {
        console.warn('⚠️ Failed to retrieve IPFS content, using fallback:', ipfsError);
        // Keep the original content as fallback
      }
    }
    
    const finalMessage = { ...message, content: finalContent };
    
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.some(m => m.id === finalMessage.id);
      if (exists) return prev;
      
      return [...prev, finalMessage];
    });

    // Update conversation last message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === finalMessage.conversationId
          ? {
              ...conv,
              lastMessage: {
                id: finalMessage.id,
                content: finalContent,
                sender: finalMessage.sender,
                createdAt: finalMessage.createdAt,
                type: finalMessage.type
              },
              lastMessageAt: finalMessage.createdAt
            }
          : conv
      )
    );
  }, [downloadFromIPFS]);

  // Handle message updates (status changes)
  const handleMessageUpdated = useCallback((updateData: {
    messageId: string;
    status?: string;
    txHash?: string;
    blockNumber?: number;
    updatedAt: string;
  }) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === updateData.messageId
          ? {
              ...msg,
              status: updateData.status as 'pending' | 'confirmed' | 'failed',
              txHash: updateData.txHash,
              blockNumber: updateData.blockNumber,
              updatedAt: updateData.updatedAt
            }
          : msg
      )
    );
  }, []);

  // Handle typing indicators
  const handleUserTyping = useCallback((data: {
    userId: string;
    username: string;
    conversationId: string;
  }) => {
    setTypingUsers(prev => {
      const key = `${data.conversationId}-${data.userId}`;
      if (!prev.includes(key)) {
        return [...prev, key];
      }
      return prev;
    });
  }, []);

  const handleUserStoppedTyping = useCallback((data: {
    userId: string;
    conversationId: string;
  }) => {
    setTypingUsers(prev => {
      const key = `${data.conversationId}-${data.userId}`;
      return prev.filter(user => user !== key);
    });
  }, []);

  // Handle user presence updates
  const handleUserPresenceUpdated = useCallback((data: {
    userId: string;
    status: string;
    timestamp: string;
  }) => {
    const isOnline = data.status === 'online';
    
    setOnlineUsers(prev => {
      if (isOnline) {
        return prev.includes(data.userId) ? prev : [...prev, data.userId];
      } else {
        return prev.filter(id => id !== data.userId);
      }
    });
  }, []);

  // Handle errors
  const handleError = useCallback((error: { message: string }) => {
    console.error('Socket error:', error.message);
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Real-time messaging connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Real-time messaging disconnected');
      setIsConnected(false);
    });

    // Message events
    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_error', handleError);

    // Typing events
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    // Presence events
    socket.on('user_presence_updated', handleUserPresenceUpdated);

    // Error handling
    socket.on('error', handleError);

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_error', handleError);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('user_presence_updated', handleUserPresenceUpdated);
      socket.off('error', handleError);
    };
  }, [
    socket,
    isAuthenticated,
    handleNewMessage,
    handleMessageUpdated,
    handleUserTyping,
    handleUserStoppedTyping,
    handleUserPresenceUpdated,
    handleError
  ]);

  // Action functions
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    type: string = 'text', 
    replyToId?: string
  ) => {
    if (!socket) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Optimistically add message to UI
    const tempMessage: Message = {
      id: tempId,
      conversationId,
      sender: {
        id: user?.id || '',
        address: user?.address || '',
        username: user?.username || '',
        avatar: user?.avatar
      },
      content,
      type,
      status: 'pending',
      replyTo: replyToId ? {
        id: replyToId,
        content: '',
        senderId: '',
        createdAt: new Date().toISOString(),
        sender: {
          id: '',
          username: ''
        }
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      // Upload message content to IPFS for decentralized storage
      let cid: string | undefined;
      let cidHash: string | undefined;
      
      if (availableProviders.length > 0) {
        try {
          const ipfsResult = await uploadToIPFS(content, `message_${tempId}.txt`);
          cid = ipfsResult.cid;
          cidHash = ipfsResult.cid;
          console.log('📤 Message stored on IPFS:', ipfsResult);
        } catch (ipfsError) {
          console.warn('⚠️ IPFS upload failed, sending without IPFS:', ipfsError);
        }
      }

      // Send via socket with IPFS data
      socket.emit('send_message', {
        conversationId,
        content,
        type,
        replyToId,
        tempId,
        cid,
        cidHash
      });
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      // Update message status to failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  }, [socket, user, uploadToIPFS, availableProviders]);

  const joinConversation = useCallback((conversationId: string) => {
    if (!socket) return;
    socket.emit('join_conversation', { conversationId });
  }, [socket]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket) return;
    socket.emit('leave_conversation', { conversationId });
  }, [socket]);

  const startTyping = useCallback((conversationId: string) => {
    if (!socket) return;
    socket.emit('typing_start', { conversationId });
  }, [socket]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!socket) return;
    socket.emit('typing_stop', { conversationId });
  }, [socket]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!socket) return;
    socket.emit('mark_read', { conversationId });
  }, [socket]);

  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!socket) return;
    socket.emit('update_presence', { status });
  }, [socket]);

  return {
    isConnected,
    messages,
    conversations,
    typingUsers,
    onlineUsers,
    sendMessage,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
    updatePresence
  };
}
