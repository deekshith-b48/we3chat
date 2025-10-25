import { realtimeService } from './realtimeService';
import { web3Api } from './web3Api';

export interface MessageStatus {
  messageId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  userId: string;
  chatId: string;
}

export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus['status'];
  timestamp: number;
  userId: string;
}

export interface ReadReceipt {
  messageId: string;
  readBy: string[];
  readAt: { [userId: string]: number };
  totalParticipants: number;
}

export interface DeliveryReceipt {
  messageId: string;
  deliveredTo: string[];
  deliveredAt: { [userId: string]: number };
  totalParticipants: number;
}

class MessageStatusService {
  private statusCache: Map<string, MessageStatus> = new Map();
  private readReceipts: Map<string, ReadReceipt> = new Map();
  private deliveryReceipts: Map<string, DeliveryReceipt> = new Map();
  private statusCallbacks: Map<string, (status: MessageStatus) => void> = new Map();

  constructor() {
    this.setupRealtimeListeners();
  }

  private setupRealtimeListeners(): void {
    // Listen for status updates from other users
    realtimeService.on('message_status_update', (update: MessageStatusUpdate) => {
      this.handleStatusUpdate(update);
    });

    // Listen for read receipts
    realtimeService.on('read_receipt', (receipt: ReadReceipt) => {
      this.handleReadReceipt(receipt);
    });

    // Listen for delivery receipts
    realtimeService.on('delivery_receipt', (receipt: DeliveryReceipt) => {
      this.handleDeliveryReceipt(receipt);
    });
  }

  // Update message status
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus['status'],
    chatId: string,
    userId: string
  ): Promise<void> {
    try {
      const messageStatus: MessageStatus = {
        messageId,
        status,
        timestamp: Date.now(),
        userId,
        chatId
      };

      // Update local cache
      this.statusCache.set(messageId, messageStatus);

      // Update on blockchain (for persistent status)
      if (status === 'sent' || status === 'delivered' || status === 'read') {
        await web3Api.updateMessageStatus(messageId, status);
      }

      // Emit to other participants via WebSocket
      realtimeService.updateMessageStatus(messageId, status);

      // Notify local callbacks
      const callback = this.statusCallbacks.get(messageId);
      if (callback) {
        callback(messageStatus);
      }

      console.log(`Message ${messageId} status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update message status:', error);
      throw error;
    }
  }

  // Mark message as sent
  async markAsSent(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'sent', chatId, userId);
  }

  // Mark message as delivered
  async markAsDelivered(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'delivered', chatId, userId);
  }

  // Mark message as read
  async markAsRead(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'read', chatId, userId);
    
    // Update read receipt
    await this.updateReadReceipt(messageId, userId);
  }

  // Mark message as failed
  async markAsFailed(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'failed', chatId, userId);
  }

  // Get message status
  getMessageStatus(messageId: string): MessageStatus | undefined {
    return this.statusCache.get(messageId);
  }

  // Get all statuses for a chat
  getChatMessageStatuses(chatId: string): MessageStatus[] {
    return Array.from(this.statusCache.values())
      .filter(status => status.chatId === chatId);
  }

  // Read receipts
  async updateReadReceipt(messageId: string, userId: string): Promise<void> {
    try {
      const existingReceipt = this.readReceipts.get(messageId);
      
      if (existingReceipt) {
        if (!existingReceipt.readBy.includes(userId)) {
          existingReceipt.readBy.push(userId);
          existingReceipt.readAt[userId] = Date.now();
        }
      } else {
        const newReceipt: ReadReceipt = {
          messageId,
          readBy: [userId],
          readAt: { [userId]: Date.now() },
          totalParticipants: 1 // This should be fetched from chat participants
        };
        this.readReceipts.set(messageId, newReceipt);
      }

      // Emit read receipt to other participants
      realtimeService.updateMessageStatus(messageId, 'read');

      console.log(`Read receipt updated for message ${messageId} by ${userId}`);
    } catch (error) {
      console.error('Failed to update read receipt:', error);
      throw error;
    }
  }

  // Delivery receipts
  async updateDeliveryReceipt(messageId: string, userId: string): Promise<void> {
    try {
      const existingReceipt = this.deliveryReceipts.get(messageId);
      
      if (existingReceipt) {
        if (!existingReceipt.deliveredTo.includes(userId)) {
          existingReceipt.deliveredTo.push(userId);
          existingReceipt.deliveredAt[userId] = Date.now();
        }
      } else {
        const newReceipt: DeliveryReceipt = {
          messageId,
          deliveredTo: [userId],
          deliveredAt: { [userId]: Date.now() },
          totalParticipants: 1 // This should be fetched from chat participants
        };
        this.deliveryReceipts.set(messageId, newReceipt);
      }

      // Emit delivery receipt to other participants
      realtimeService.updateMessageStatus(messageId, 'delivered');

      console.log(`Delivery receipt updated for message ${messageId} to ${userId}`);
    } catch (error) {
      console.error('Failed to update delivery receipt:', error);
      throw error;
    }
  }

  // Get read receipt
  getReadReceipt(messageId: string): ReadReceipt | undefined {
    return this.readReceipts.get(messageId);
  }

  // Get delivery receipt
  getDeliveryReceipt(messageId: string): DeliveryReceipt | undefined {
    return this.deliveryReceipts.get(messageId);
  }

  // Check if message is read by all participants
  isMessageReadByAll(messageId: string, totalParticipants: number): boolean {
    const receipt = this.readReceipts.get(messageId);
    return receipt ? receipt.readBy.length >= totalParticipants : false;
  }

  // Check if message is delivered to all participants
  isMessageDeliveredToAll(messageId: string, totalParticipants: number): boolean {
    const receipt = this.deliveryReceipts.get(messageId);
    return receipt ? receipt.deliveredTo.length >= totalParticipants : false;
  }

  // Status change listeners
  onStatusChange(messageId: string, callback: (status: MessageStatus) => void): void {
    this.statusCallbacks.set(messageId, callback);
  }

  offStatusChange(messageId: string): void {
    this.statusCallbacks.delete(messageId);
  }

  // Handle incoming status updates
  private handleStatusUpdate(update: MessageStatusUpdate): void {
    const messageStatus: MessageStatus = {
      messageId: update.messageId,
      status: update.status,
      timestamp: update.timestamp,
      userId: update.userId,
      chatId: '' // This should be determined from the message
    };

    this.statusCache.set(update.messageId, messageStatus);

    // Notify local callbacks
    const callback = this.statusCallbacks.get(update.messageId);
    if (callback) {
      callback(messageStatus);
    }
  }

  // Handle incoming read receipts
  private handleReadReceipt(receipt: ReadReceipt): void {
    this.readReceipts.set(receipt.messageId, receipt);
    console.log(`Read receipt received for message ${receipt.messageId}`);
  }

  // Handle incoming delivery receipts
  private handleDeliveryReceipt(receipt: DeliveryReceipt): void {
    this.deliveryReceipts.set(receipt.messageId, receipt);
    console.log(`Delivery receipt received for message ${receipt.messageId}`);
  }

  // Batch operations
  async markMultipleAsRead(messageIds: string[], chatId: string, userId: string): Promise<void> {
    const promises = messageIds.map(messageId => 
      this.markAsRead(messageId, chatId, userId)
    );
    await Promise.all(promises);
  }

  async markMultipleAsDelivered(messageIds: string[], chatId: string, userId: string): Promise<void> {
    const promises = messageIds.map(messageId => 
      this.markAsDelivered(messageId, chatId, userId)
    );
    await Promise.all(promises);
  }

  // Cleanup
  clearStatusCache(): void {
    this.statusCache.clear();
    this.readReceipts.clear();
    this.deliveryReceipts.clear();
    this.statusCallbacks.clear();
  }

  // Get status statistics
  getStatusStatistics(chatId: string): {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  } {
    const statuses = this.getChatMessageStatuses(chatId);
    
    return {
      total: statuses.length,
      sent: statuses.filter(s => s.status === 'sent').length,
      delivered: statuses.filter(s => s.status === 'delivered').length,
      read: statuses.filter(s => s.status === 'read').length,
      failed: statuses.filter(s => s.status === 'failed').length
    };
  }

  // Auto-mark as delivered when message is received
  async handleMessageReceived(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.markAsDelivered(messageId, chatId, userId);
  }

  // Auto-mark as read when message is viewed
  async handleMessageViewed(messageId: string, chatId: string, userId: string): Promise<void> {
    await this.markAsRead(messageId, chatId, userId);
  }
}

export const messageStatusService = new MessageStatusService();
