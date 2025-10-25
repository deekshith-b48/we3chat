import { io, Socket } from 'socket.io-client';
import { createPublicClient, http } from 'viem';
import { watchContractEvent } from 'viem/actions';
import { polygonAmoy } from 'viem/chains';
import { ChatAppABI } from './abi/ChatApp.json';

interface MessageEvent {
  sender: string;
  receiver: string;
  contentCid: string;
  timestamp: number;
  messageType: string;
}

interface GroupMessageEvent {
  groupId: number;
  sender: string;
  contentCid: string;
  timestamp: number;
  messageType: string;
}

interface TypingEvent {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

interface MessageStatusEvent {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
  userId: string;
}

class RealtimeService {
  private socket: Socket | null = null;
  private publicClient: any;
  private contractAddress: string;
  private isConnected = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.contractAddress = process.env.NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS!;
    this.publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL!)
    });
  }

  async connect(userAddress: string): Promise<void> {
    try {
      // Connect to WebSocket server
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        auth: { userAddress },
        transports: ['websocket', 'polling']
      });

      this.setupSocketListeners();
      this.watchBlockchainEvents();
      
      this.isConnected = true;
      console.log('✅ Realtime service connected');
    } catch (error) {
      console.error('❌ Failed to connect to realtime service:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    // Message events
    this.socket.on('new_message', (message: MessageEvent) => {
      this.emit('new_message', message);
    });

    this.socket.on('new_group_message', (message: GroupMessageEvent) => {
      this.emit('new_group_message', message);
    });

    // Typing events
    this.socket.on('user_typing', (event: TypingEvent) => {
      this.emit('user_typing', event);
    });

    this.socket.on('user_stopped_typing', (event: TypingEvent) => {
      this.emit('user_stopped_typing', event);
    });

    // Status events
    this.socket.on('message_status_update', (event: MessageStatusEvent) => {
      this.emit('message_status_update', event);
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  private watchBlockchainEvents(): void {
    // Watch for new direct messages
    watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: ChatAppABI,
      eventName: 'MessageSent',
      onLogs: (logs) => {
        logs.forEach(log => {
          const message: MessageEvent = {
            sender: log.args.sender,
            receiver: log.args.receiver,
            contentCid: log.args.contentCid,
            timestamp: Number(log.args.timestamp),
            messageType: 'text' // Default, will be updated from IPFS content
          };
          this.emit('new_message', message);
        });
      }
    });

    // Watch for new group messages
    watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: ChatAppABI,
      eventName: 'GroupMessageSent',
      onLogs: (logs) => {
        logs.forEach(log => {
          const message: GroupMessageEvent = {
            groupId: Number(log.args.groupId),
            sender: log.args.sender,
            contentCid: log.args.contentCid,
            timestamp: Number(log.args.timestamp),
            messageType: 'text' // Default, will be updated from IPFS content
          };
          this.emit('new_group_message', message);
        });
      }
    });

    // Watch for friend events
    watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: ChatAppABI,
      eventName: 'FriendAdded',
      onLogs: (logs) => {
        logs.forEach(log => {
          this.emit('friend_added', {
            user: log.args.user,
            friend: log.args.friend
          });
        });
      }
    });

    // Watch for group events
    watchContractEvent({
      address: this.contractAddress as `0x${string}`,
      abi: ChatAppABI,
      eventName: 'GroupCreated',
      onLogs: (logs) => {
        logs.forEach(log => {
          this.emit('group_created', {
            groupId: Number(log.args.groupId),
            creator: log.args.creator,
            name: log.args.name
          });
        });
      }
    });
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Socket methods
  sendMessage(chatId: string, message: any): void {
    if (this.socket) {
      this.socket.emit('send_message', { chatId, message });
    }
  }

  sendGroupMessage(groupId: number, message: any): void {
    if (this.socket) {
      this.socket.emit('send_group_message', { groupId, message });
    }
  }

  sendTyping(chatId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('typing', { chatId, isTyping });
    }
  }

  updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): void {
    if (this.socket) {
      this.socket.emit('message_status_update', {
        messageId,
        status,
        timestamp: Date.now()
      });
    }
  }

  joinChat(chatId: string): void {
    if (this.socket) {
      this.socket.emit('join_chat', chatId);
    }
  }

  leaveChat(chatId: string): void {
    if (this.socket) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  joinGroup(groupId: number): void {
    if (this.socket) {
      this.socket.emit('join_group', groupId);
    }
  }

  leaveGroup(groupId: number): void {
    if (this.socket) {
      this.socket.emit('leave_group', groupId);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const realtimeService = new RealtimeService();
