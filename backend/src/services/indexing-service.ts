import { Message, User, Conversation } from '../db/schema';
import { createIndex, searchIndex, deleteFromIndex } from '../lib/search-index';

export interface SearchResult {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  conversationId: string;
  score: number;
}

export interface SearchOptions {
  query: string;
  userId: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface MessageIndex {
  id: string;
  content: string;
  senderId: string;
  senderAddress: string;
  conversationId: string;
  timestamp: number;
  type: string;
  cidHash?: string;
  status: string;
}

export class IndexingService {
  private isIndexing = false;
  private lastIndexTime = 0;
  private indexInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic indexing service
   */
  startAutoIndexing(intervalMinutes = 10): void {
    if (this.indexInterval) {
      console.log('Indexing service already running');
      return;
    }

    console.log(`📚 Starting auto-indexing service (interval: ${intervalMinutes} minutes)`);
    
    this.indexInterval = setInterval(async () => {
      try {
        await this.indexNewMessages();
      } catch (error) {
        console.error('Auto-indexing failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Run initial indexing
    this.indexNewMessages();
  }

  /**
   * Stop automatic indexing service
   */
  stopAutoIndexing(): void {
    if (this.indexInterval) {
      clearInterval(this.indexInterval);
      this.indexInterval = null;
      console.log('🛑 Auto-indexing service stopped');
    }
  }

  /**
   * Index new messages since last run
   */
  async indexNewMessages(): Promise<{ indexed: number; errors: string[] }> {
    if (this.isIndexing) {
      console.log('Indexing already in progress, skipping...');
      return { indexed: 0, errors: ['Indexing already in progress'] };
    }

    this.isIndexing = true;
    const errors: string[] = [];
    let indexed = 0;

    try {
      console.log('📚 Indexing new messages...');

      // Get messages created after last index time
      const messages = await Message.find({
        createdAt: { $gt: new Date(this.lastIndexTime) },
        content: { $exists: true, $ne: null },
        type: 'text'
      })
      .populate('senderId', 'address username')
      .populate('conversationId', 'type')
      .sort({ createdAt: 1 })
      .limit(1000); // Process in batches

      for (const message of messages) {
        try {
          const messageIndex: MessageIndex = {
            id: message._id.toString(),
            content: message.content || '',
            senderId: message.senderId._id.toString(),
            senderAddress: message.senderId.address,
            conversationId: message.conversationId._id.toString(),
            timestamp: message.createdAt.getTime(),
            type: message.type,
            cidHash: message.cidHash,
            status: message.status
          };

          await createIndex('messages', messageIndex);
          indexed++;

        } catch (error) {
          const errorMsg = `Failed to index message ${message._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      this.lastIndexTime = Date.now();
      console.log(`✅ Indexed ${indexed} messages`);

    } catch (error) {
      console.error('❌ Message indexing failed:', error);
      errors.push(`Indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isIndexing = false;
    }

    return { indexed, errors };
  }

  /**
   * Search messages across all conversations
   */
  async searchMessages(options: SearchOptions): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Searching messages: "${options.query}"`);

      // Build search filters
      const filters: any = {
        userId: options.userId
      };

      if (options.conversationId) {
        filters.conversationId = options.conversationId;
      }

      if (options.dateFrom || options.dateTo) {
        filters.timestamp = {};
        if (options.dateFrom) {
          filters.timestamp.$gte = options.dateFrom.getTime();
        }
        if (options.dateTo) {
          filters.timestamp.$lte = options.dateTo.getTime();
        }
      }

      // Perform search
      const results = await searchIndex('messages', {
        query: options.query,
        filters,
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      // Convert to SearchResult format
      const searchResults: SearchResult[] = results.map((result: any) => ({
        id: result.id,
        content: result.content,
        sender: result.senderAddress,
        timestamp: result.timestamp,
        conversationId: result.conversationId,
        score: result.score || 0
      }));

      console.log(`✅ Found ${searchResults.length} search results`);
      return searchResults;

    } catch (error) {
      console.error('❌ Message search failed:', error);
      throw error;
    }
  }

  /**
   * Get message statistics for a user
   */
  async getMessageStats(userId: string): Promise<{
    totalMessages: number;
    messagesByDay: Record<string, number>;
    topConversations: Array<{ conversationId: string; messageCount: number }>;
    averageMessageLength: number;
  }> {
    try {
      // Get all messages for user
      const messages = await Message.find({
        senderId: userId,
        type: 'text',
        content: { $exists: true }
      })
      .populate('conversationId')
      .sort({ createdAt: 1 });

      const totalMessages = messages.length;
      
      // Group by day
      const messagesByDay: Record<string, number> = {};
      messages.forEach(msg => {
        const day = msg.createdAt.toISOString().split('T')[0];
        messagesByDay[day] = (messagesByDay[day] || 0) + 1;
      });

      // Group by conversation
      const conversationCounts: Record<string, number> = {};
      messages.forEach(msg => {
        const convId = msg.conversationId._id.toString();
        conversationCounts[convId] = (conversationCounts[convId] || 0) + 1;
      });

      const topConversations = Object.entries(conversationCounts)
        .map(([conversationId, messageCount]) => ({ conversationId, messageCount }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10);

      // Calculate average message length
      const totalLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
      const averageMessageLength = totalMessages > 0 ? totalLength / totalMessages : 0;

      return {
        totalMessages,
        messagesByDay,
        topConversations,
        averageMessageLength
      };

    } catch (error) {
      console.error('❌ Failed to get message stats:', error);
      throw error;
    }
  }

  /**
   * Remove message from index
   */
  async removeFromIndex(messageId: string): Promise<void> {
    try {
      await deleteFromIndex('messages', messageId);
      console.log(`🗑️ Removed message ${messageId} from index`);
    } catch (error) {
      console.error(`❌ Failed to remove message ${messageId} from index:`, error);
      throw error;
    }
  }

  /**
   * Rebuild entire index
   */
  async rebuildIndex(): Promise<{ indexed: number; errors: string[] }> {
    console.log('🔄 Rebuilding message index...');
    
    // Clear existing index
    // This would need to be implemented in the search-index module
    
    // Reset last index time to index all messages
    this.lastIndexTime = 0;
    
    // Run full indexing
    return await this.indexNewMessages();
  }

  /**
   * Get indexing status
   */
  getIndexingStatus(): {
    isIndexing: boolean;
    lastIndexTime: number;
    nextIndexTime?: number;
  } {
    return {
      isIndexing: this.isIndexing,
      lastIndexTime: this.lastIndexTime,
      nextIndexTime: this.indexInterval ? this.lastIndexTime + (10 * 60 * 1000) : undefined
    };
  }
}

// Export singleton instance
export const indexingService = new IndexingService();
