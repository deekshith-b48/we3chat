import { ethers } from 'ethers';
import { Server as SocketIOServer } from 'socket.io';
import { addMessageProcessingJob, addBlockchainUpdateJob } from '../queue';

// Contract ABI for WebSocket subscriptions
const CHAT_APP_ABI = [
  "event MessageSent(address indexed from, address indexed to, bytes32 indexed cidHash, uint256 timestamp)",
  "event FriendAdded(address indexed user, address indexed friend, string friendName)",
  "event AccountCreated(address indexed user, string name, bytes32 x25519PublicKey)",
  "event EncryptionKeySet(address indexed user, bytes32 x25519PublicKey)"
];

export interface WebSocketSubscriptionConfig {
  rpcUrl: string;
  contractAddress: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketSubscriptionService {
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private io: SocketIOServer;
  private config: WebSocketSubscriptionConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ethers.ContractEvent> = new Map();

  constructor(io: SocketIOServer, config: WebSocketSubscriptionConfig) {
    this.io = io;
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config
    };
  }

  /**
   * Start WebSocket subscription service
   */
  async start(): Promise<void> {
    try {
      console.log('🔌 Starting WebSocket subscription service...');
      
      await this.connect();
      this.setupEventListeners();
      
      console.log('✅ WebSocket subscription service started');
    } catch (error) {
      console.error('❌ Failed to start WebSocket subscription service:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Stop WebSocket subscription service
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping WebSocket subscription service...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.removeEventListeners();
    
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }

    this.isConnected = false;
    console.log('✅ WebSocket subscription service stopped');
  }

  /**
   * Connect to WebSocket provider
   */
  private async connect(): Promise<void> {
    try {
      // Create WebSocket provider
      this.provider = new ethers.WebSocketProvider(this.config.rpcUrl);
      
      // Create contract instance
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        CHAT_APP_ABI,
        this.provider
      );

      // Set up connection event handlers
      this.provider.on('connect', () => {
        console.log('🔌 WebSocket connected to blockchain');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.provider.on('disconnect', (code: number, reason: string) => {
        console.log(`🔌 WebSocket disconnected: ${code} - ${reason}`);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.provider.on('error', (error: Error) => {
        console.error('🔌 WebSocket error:', error);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Wait for connection
      await this.provider._start();
      
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Set up blockchain event listeners
   */
  private setupEventListeners(): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    console.log('👂 Setting up blockchain event listeners...');

    // MessageSent event
    const messageSentListener = this.contract.on('MessageSent', async (
      from: string,
      to: string,
      cidHash: string,
      timestamp: number
    ) => {
      console.log(`📨 MessageSent event: ${from} -> ${to}`, { cidHash, timestamp });
      
      try {
        // Emit to connected clients
        this.io.emit('blockchain_message_sent', {
          from,
          to,
          cidHash,
          timestamp: Number(timestamp)
        });

        // Add to processing queue
        await addMessageProcessingJob({
          messageId: `temp_${Date.now()}`, // Temporary ID
          cidHash,
          senderAddress: from,
          recipientAddress: to,
          timestamp: Number(timestamp)
        });

      } catch (error) {
        console.error('Error handling MessageSent event:', error);
      }
    });

    this.eventListeners.set('MessageSent', messageSentListener);

    // FriendAdded event
    const friendAddedListener = this.contract.on('FriendAdded', async (
      user: string,
      friend: string,
      friendName: string
    ) => {
      console.log(`👥 FriendAdded event: ${user} added ${friend} (${friendName})`);
      
      try {
        // Emit to connected clients
        this.io.emit('blockchain_friend_added', {
          user,
          friend,
          friendName
        });

      } catch (error) {
        console.error('Error handling FriendAdded event:', error);
      }
    });

    this.eventListeners.set('FriendAdded', friendAddedListener);

    // AccountCreated event
    const accountCreatedListener = this.contract.on('AccountCreated', async (
      user: string,
      name: string,
      publicKey: string
    ) => {
      console.log(`👤 AccountCreated event: ${user} (${name})`);
      
      try {
        // Emit to connected clients
        this.io.emit('blockchain_account_created', {
          user,
          name,
          publicKey
        });

      } catch (error) {
        console.error('Error handling AccountCreated event:', error);
      }
    });

    this.eventListeners.set('AccountCreated', accountCreatedListener);

    // EncryptionKeySet event
    const encryptionKeySetListener = this.contract.on('EncryptionKeySet', async (
      user: string,
      publicKey: string
    ) => {
      console.log(`🔑 EncryptionKeySet event: ${user}`);
      
      try {
        // Emit to connected clients
        this.io.emit('blockchain_encryption_key_set', {
          user,
          publicKey
        });

      } catch (error) {
        console.error('Error handling EncryptionKeySet event:', error);
      }
    });

    this.eventListeners.set('EncryptionKeySet', encryptionKeySetListener);

    console.log('✅ Blockchain event listeners set up');
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    console.log('🧹 Removing blockchain event listeners...');
    
    for (const [eventName, listener] of this.eventListeners) {
      try {
        if (this.contract) {
          this.contract.off(eventName, listener);
        }
      } catch (error) {
        console.error(`Error removing ${eventName} listener:`, error);
      }
    }
    
    this.eventListeners.clear();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('❌ Max reconnection attempts reached, giving up');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.setupEventListeners();
        console.log('✅ Reconnected to WebSocket');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    eventListeners: string[];
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      eventListeners: Array.from(this.eventListeners.keys())
    };
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    console.log('🔄 Manual reconnection triggered');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.reconnectAttempts = 0;
    
    try {
      await this.stop();
      await this.start();
    } catch (error) {
      console.error('❌ Manual reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get recent events (for debugging)
   */
  async getRecentEvents(limit = 10): Promise<any[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Get recent MessageSent events
      const messageSentFilter = this.contract.filters.MessageSent();
      const messageSentEvents = await this.contract.queryFilter(messageSentFilter, -1000); // Last 1000 blocks
      
      // Get recent FriendAdded events
      const friendAddedFilter = this.contract.filters.FriendAdded();
      const friendAddedEvents = await this.contract.queryFilter(friendAddedFilter, -1000);
      
      // Combine and sort by block number
      const allEvents = [
        ...messageSentEvents.map(e => ({ ...e, type: 'MessageSent' })),
        ...friendAddedEvents.map(e => ({ ...e, type: 'FriendAdded' }))
      ].sort((a, b) => b.blockNumber - a.blockNumber);
      
      return allEvents.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Failed to get recent events:', error);
      throw error;
    }
  }
}

// Export singleton instance
let webSocketSubscriptionService: WebSocketSubscriptionService | null = null;

export function createWebSocketSubscriptionService(
  io: SocketIOServer,
  config: WebSocketSubscriptionConfig
): WebSocketSubscriptionService {
  if (webSocketSubscriptionService) {
    return webSocketSubscriptionService;
  }
  
  webSocketSubscriptionService = new WebSocketSubscriptionService(io, config);
  return webSocketSubscriptionService;
}

export function getWebSocketSubscriptionService(): WebSocketSubscriptionService | null {
  return webSocketSubscriptionService;
}
