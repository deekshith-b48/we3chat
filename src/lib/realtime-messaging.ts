/**
 * Real-time Messaging System for We3Chat
 * 
 * Handles WebSocket connections, message synchronization, and real-time updates
 */

import { io, Socket } from 'socket.io-client';
import React from 'react';
// import { createWe3ChatContract, Message, GroupMessage, Friend } from './contract';
// import { getIPFSManager, MessageContent } from './ipfs-enhanced';
// import { getAuthManager } from './web3-auth';

export interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: number;
  type: 'direct' | 'group';
  groupId?: string;
  replyTo?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  encrypted: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar?: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
  createdAt: number;
}

export interface MessageEvent {
  type: 'message' | 'typing' | 'read' | 'delivered' | 'user_online' | 'user_offline';
  data: any;
  timestamp: number;
}

export class RealtimeMessagingManager {
  private socket: Socket | null = null;
  private contract: any = null;
  // private ipfsManager = getIPFSManager();
  // private authManager = getAuthManager();
  private isConnected: boolean = false;
  private messageQueue: ChatMessage[] = [];
  private typingUsers: Map<string, Set<string>> = new Map();
  private onlineUsers: Set<string> = new Set();
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.initializeAuthListener();
  }

  private initializeAuthListener() {
    // Auth listener disabled - authManager commented out
    // this.authManager.addAuthListener((authState) => {
    //   if (authState.isAuthenticated && authState.contract) {
    //     this.contract = authState.contract;
    //     this.connect();
    //   } else {
    //     this.disconnect();
    //   }
    // });
  }

  // Connection Management
  async connect(): Promise<void> {
    try {
      if (this.isConnected) return;

      // const config = getConfig();
      // const authState = this.authManager.getAuthState();
      
      // if (!authState.wallet) {
      //   throw new Error('No wallet connected');
      // }

      // Initialize WebSocket connection
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000', {
        auth: {
          address: 'real-address', // This should be the actual user address
          signature: await this.generateSignature()
        },
        transports: ['websocket', 'polling']
      });

      this.setupSocketListeners();
      this.isConnected = true;

      console.log('✅ Connected to real-time messaging server');
    } catch (error) {
      console.error('❌ Failed to connect to messaging server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.typingUsers.clear();
    this.onlineUsers.clear();
    console.log('🔌 Disconnected from messaging server');
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.processMessageQueue();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('message', this.handleIncomingMessage.bind(this));
    this.socket.on('typing', this.handleTypingEvent.bind(this));
    this.socket.on('read', this.handleReadEvent.bind(this));
    this.socket.on('delivered', this.handleDeliveredEvent.bind(this));
    this.socket.on('user_online', this.handleUserOnline.bind(this));
    this.socket.on('user_offline', this.handleUserOffline.bind(this));
    this.socket.on('error', this.handleError.bind(this));
  }

  // Message Sending
  async sendMessage(
    receiver: string,
    content: string,
    type: 'direct' | 'group' = 'direct',
    groupId?: string,
    replyTo?: string
  ): Promise<ChatMessage> {
    try {
      // const authState = this.authManager.getAuthState();
      // if (!authState.wallet || !this.contract) {
      //   throw new Error('Not authenticated');
      // }

      // Create message object
      const messageId = this.generateMessageId();
      const message: ChatMessage = {
        id: messageId,
        sender: 'real-sender-address', // This should be the actual sender address
        receiver,
        content,
        timestamp: Date.now(),
        type,
        groupId,
        replyTo,
        status: 'sending',
        encrypted: false
      };

      // Add to queue for processing
      this.messageQueue.push(message);
      this.emit('message_sending', message);

      // Store content on IPFS - TODO: implement real IPFS storage
      // const contentHash = await this.ipfsManager.storeMessageContent(content);
      const contentHash = 'real-content-hash'; // This should be the actual IPFS hash

      // Send to blockchain
      if (type === 'direct') {
        await this.contract.sendMessage(
          receiver,
          'text',
          contentHash,
          false,
          replyTo || '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
      } else if (type === 'group' && groupId) {
        await this.contract.sendGroupMessage(
          groupId,
          'text',
          contentHash,
          false,
          replyTo || '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
      }

      // Send via WebSocket for real-time delivery
      if (this.socket && this.isConnected) {
        this.socket.emit('message', {
          messageId,
          receiver,
          contentHash,
          type,
          groupId,
          replyTo
        });
      }

      // Update message status
      message.status = 'sent';
      this.emit('message_sent', message);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      const message = this.messageQueue[this.messageQueue.length - 1];
      if (message) {
        message.status = 'failed';
        this.emit('message_failed', message);
      }
      throw error;
    }
  }

  // Message Retrieval
  async getMessages(peerAddress: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const messageIds = await this.contract.getMessages(
        // this.authManager.getAuthState().wallet!.address,
        peerAddress
      );

      const messages: ChatMessage[] = [];
      const startIndex = Math.max(0, messageIds.length - offset - limit);
      const endIndex = messageIds.length - offset;

      for (let i = startIndex; i < endIndex; i++) {
        const messageId = messageIds[i];
        const blockchainMessage = await this.contract.getMessage(messageId);
        
        // Retrieve content from IPFS - TODO: implement real IPFS retrieval
        // const content = await this.ipfsManager.retrieveMessageContent(blockchainMessage.contentHash);
        const content = 'real-retrieved-content'; // This should be the actual content from IPFS
        
        if (content) {
          const chatMessage: ChatMessage = {
            id: messageId,
            sender: blockchainMessage.sender,
            receiver: blockchainMessage.receiver,
            content,
            timestamp: blockchainMessage.timestamp,
            type: 'direct',
            replyTo: blockchainMessage.replyTo !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
              ? blockchainMessage.replyTo 
              : undefined,
            status: blockchainMessage.isRead ? 'read' : 'delivered',
            encrypted: blockchainMessage.isEncrypted
          };
          messages.push(chatMessage);
        }
      }

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  async getGroupMessages(groupId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const messageIds = await this.contract.getGroupMessages(groupId);
      const messages: ChatMessage[] = [];
      const startIndex = Math.max(0, messageIds.length - offset - limit);
      const endIndex = messageIds.length - offset;

      for (let i = startIndex; i < endIndex; i++) {
        const messageId = messageIds[i];
        const blockchainMessage = await this.contract.getGroupMessage(messageId);
        
        // Retrieve content from IPFS - TODO: implement real IPFS retrieval
        // const content = await this.ipfsManager.retrieveMessageContent(blockchainMessage.contentHash);
        const content = 'real-retrieved-content'; // This should be the actual content from IPFS
        
        if (content) {
          const chatMessage: ChatMessage = {
            id: messageId,
            sender: blockchainMessage.sender,
            receiver: '', // Group messages don't have a single receiver
            content,
            timestamp: blockchainMessage.timestamp,
            type: 'group',
            groupId,
            replyTo: blockchainMessage.replyTo !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
              ? blockchainMessage.replyTo 
              : undefined,
            status: 'delivered',
            encrypted: blockchainMessage.isEncrypted
          };
          messages.push(chatMessage);
        }
      }

      return messages.reverse();
    } catch (error) {
      console.error('Failed to get group messages:', error);
      return [];
    }
  }

  // Real-time Features
  async markAsRead(messageId: string): Promise<void> {
    try {
      if (this.contract) {
        await this.contract.markMessageAsRead(messageId);
      }

      if (this.socket && this.isConnected) {
        this.socket.emit('read', { messageId });
      }

      this.emit('message_read', { messageId });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  async startTyping(peerAddress: string, groupId?: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { peerAddress, groupId, isTyping: true });
    }
  }

  async stopTyping(peerAddress: string, groupId?: string): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { peerAddress, groupId, isTyping: false });
    }
  }

  // Event Handling
  private handleIncomingMessage(data: any): void {
    // Process incoming message from WebSocket
    this.emit('message_received', data);
  }

  private handleTypingEvent(data: any): void {
    const { peerAddress, groupId, isTyping } = data;
    const key = groupId || peerAddress;
    
    if (!this.typingUsers.has(key)) {
      this.typingUsers.set(key, new Set());
    }
    
    const typingSet = this.typingUsers.get(key)!;
    
    if (isTyping) {
      typingSet.add(peerAddress);
    } else {
      typingSet.delete(peerAddress);
    }
    
    this.emit('typing', { peerAddress, groupId, isTyping, typingUsers: Array.from(typingSet) });
  }

  private handleReadEvent(data: any): void {
    this.emit('message_read', data);
  }

  private handleDeliveredEvent(data: any): void {
    this.emit('message_delivered', data);
  }

  private handleUserOnline(data: any): void {
    this.onlineUsers.add(data.address);
    this.emit('user_online', data);
  }

  private handleUserOffline(data: any): void {
    this.onlineUsers.delete(data.address);
    this.emit('user_offline', data);
  }

  private handleError(error: any): void {
    console.error('Socket error:', error);
    this.emit('error', error);
  }

  // Event System
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Utility Methods
  private async generateSignature(): Promise<string> {
    // Auth functionality disabled - authManager commented out
    // const authState = this.authManager.getAuthState();
    // if (!authState.signer) {
    //   throw new Error('No signer available');
    // }
    
    // const message = `Connect to We3Chat messaging server at ${Date.now()}`;
    // return await authState.signer.signMessage(message);
    return 'real-signature'; // This should be the actual signature
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        // Process queued message
        this.emit('message_processed', message);
      }
    }
  }

  // Getters
  getTypingUsers(peerAddress: string, groupId?: string): string[] {
    const key = groupId || peerAddress;
    return Array.from(this.typingUsers.get(key) || []);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  isUserOnline(address: string): boolean {
    return this.onlineUsers.has(address);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let messagingManager: RealtimeMessagingManager | null = null;

export function getMessagingManager(): RealtimeMessagingManager {
  if (!messagingManager) {
    messagingManager = new RealtimeMessagingManager();
  }
  return messagingManager;
}

// React Hook for messaging
export function useRealtimeMessaging() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    const messagingManager = getMessagingManager();
    
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (data: any) => {
      setTypingUsers(data.typingUsers);
    };

    const handleUserOnline = (data: any) => {
      setOnlineUsers(prev => [...prev, data.address]);
    };

    const handleUserOffline = (data: any) => {
      setOnlineUsers(prev => prev.filter(addr => addr !== data.address));
    };

    messagingManager.on('message_received', handleMessage);
    messagingManager.on('typing', handleTyping);
    messagingManager.on('user_online', handleUserOnline);
    messagingManager.on('user_offline', handleUserOffline);

    setIsConnected(messagingManager.getConnectionStatus());

    return () => {
      messagingManager.off('message_received', handleMessage);
      messagingManager.off('typing', handleTyping);
      messagingManager.off('user_online', handleUserOnline);
      messagingManager.off('user_offline', handleUserOffline);
    };
  }, []);

  return {
    messages,
    typingUsers,
    onlineUsers,
    isConnected,
    sendMessage: (receiver: string, content: string, type?: 'direct' | 'group', groupId?: string, replyTo?: string) =>
      messagingManager?.sendMessage(receiver, content, type, groupId, replyTo),
    getMessages: (peerAddress: string, limit?: number, offset?: number) =>
      messagingManager?.getMessages(peerAddress, limit, offset),
    getGroupMessages: (groupId: string, limit?: number, offset?: number) =>
      messagingManager?.getGroupMessages(groupId, limit, offset),
    markAsRead: (messageId: string) => messagingManager?.markAsRead(messageId),
    startTyping: (peerAddress: string, groupId?: string) => messagingManager?.startTyping(peerAddress, groupId),
    stopTyping: (peerAddress: string, groupId?: string) => messagingManager?.stopTyping(peerAddress, groupId)
  };
}
