import { ethers } from 'ethers';
import { User, Message, Conversation, ConversationMember } from '../db/schema';
import { fetchWithFallback, checkIPFSGatewayHealth } from '../lib/ipfs';
import { addMessageProcessingJob, addIPFSCachingJob } from '../queue';

// Contract ABI for reading blockchain state
const CHAT_APP_ABI = [
  "function getMessages(address friendAddr) external view returns (tuple(address sender, address receiver, uint256 timestamp, bytes32 cidHash)[])",
  "function getFriends() external view returns (tuple(address friendAddress, string name, uint256 addedAt)[])",
  "function usernames(address) external view returns (string)",
  "function x25519PublicKey(address) external view returns (bytes32)"
];

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
  warnings: string[];
}

export interface SyncOptions {
  forceResync?: boolean;
  maxMessages?: number;
  skipIPFSValidation?: boolean;
  dryRun?: boolean;
}

export class DataSyncService {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private isRunning = false;
  private lastSyncTime = 0;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://rpc-amoy.polygon.technology';
    const contractAddress = process.env.CHAT_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      throw new Error('CHAT_CONTRACT_ADDRESS not configured');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, CHAT_APP_ABI, this.provider);
  }

  /**
   * Start automatic sync service
   */
  startAutoSync(intervalMinutes = 5): void {
    if (this.syncInterval) {
      console.log('Sync service already running');
      return;
    }

    console.log(`🔄 Starting auto-sync service (interval: ${intervalMinutes} minutes)`);
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAllData();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Run initial sync
    this.syncAllData();
  }

  /**
   * Stop automatic sync service
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync service stopped');
    }
  }

  /**
   * Sync all data between blockchain, IPFS, and database
   */
  async syncAllData(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning && !options.forceResync) {
      console.log('Sync already in progress, skipping...');
      return { success: false, processed: 0, errors: ['Sync already in progress'], warnings: [] };
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    console.log('🔄 Starting data synchronization...');
    
    const result: SyncResult = {
      success: true,
      processed: 0,
      errors: [],
      warnings: []
    };

    try {
      // 1. Sync user data
      const userSyncResult = await this.syncUserData(options);
      result.processed += userSyncResult.processed;
      result.errors.push(...userSyncResult.errors);
      result.warnings.push(...userSyncResult.warnings);

      // 2. Sync message data
      const messageSyncResult = await this.syncMessageData(options);
      result.processed += messageSyncResult.processed;
      result.errors.push(...messageSyncResult.errors);
      result.warnings.push(...messageSyncResult.warnings);

      // 3. Validate IPFS content
      if (!options.skipIPFSValidation) {
        const ipfsValidationResult = await this.validateIPFSContent(options);
        result.processed += ipfsValidationResult.processed;
        result.errors.push(...ipfsValidationResult.errors);
        result.warnings.push(...ipfsValidationResult.warnings);
      }

      // 4. Clean up orphaned data
      const cleanupResult = await this.cleanupOrphanedData(options);
      result.processed += cleanupResult.processed;
      result.errors.push(...cleanupResult.errors);
      result.warnings.push(...cleanupResult.warnings);

      this.lastSyncTime = Date.now();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Data sync completed in ${duration}ms. Processed: ${result.processed}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
      
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Sync user data between blockchain and database
   */
  private async syncUserData(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = { success: true, processed: 0, errors: [], warnings: [] };
    
    try {
      console.log('👤 Syncing user data...');
      
      // Get all users from database
      const dbUsers = await User.find({});
      
      for (const dbUser of dbUsers) {
        try {
          // Check if user exists on blockchain
          const username = await this.contract.usernames(dbUser.address);
          const publicKey = await this.contract.x25519PublicKey(dbUser.address);
          
          const isRegistered = !!username && username.length > 0;
          const hasPublicKey = !!publicKey && publicKey !== '0x0000000000000000000000000000000000000000000000000000000000000000';
          
          // Update database if blockchain data differs
          const needsUpdate = 
            dbUser.username !== username ||
            dbUser.publicKey !== publicKey ||
            dbUser.isRegistered !== isRegistered;
          
          if (needsUpdate) {
            if (!options.dryRun) {
              await User.findByIdAndUpdate(dbUser._id, {
                username: username || dbUser.username,
                publicKey: publicKey || dbUser.publicKey,
                isRegistered,
                updatedAt: new Date()
              });
            }
            
            result.processed++;
            console.log(`📝 Updated user ${dbUser.address}: registered=${isRegistered}, hasKey=${hasPublicKey}`);
          }
          
        } catch (error) {
          const errorMsg = `Failed to sync user ${dbUser.address}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`User sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }

  /**
   * Sync message data between blockchain and database
   */
  private async syncMessageData(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = { success: true, processed: 0, errors: [], warnings: [] };
    
    try {
      console.log('💬 Syncing message data...');
      
      // Get all users to sync their messages
      const users = await User.find({ isRegistered: true });
      
      for (const user of users) {
        try {
          // Get friends from blockchain
          const friends = await this.contract.getFriends();
          
          for (const friend of friends) {
            const friendAddress = friend.friendAddress || friend[0];
            
            // Get messages from blockchain
            const blockchainMessages = await this.contract.getMessages(friendAddress);
            
            for (const bm of blockchainMessages) {
              const sender = bm.sender;
              const receiver = bm.receiver;
              const timestamp = Number(bm.timestamp);
              const cidHash = bm.cidHash;
              
              // Check if message exists in database
              const existingMessage = await Message.findOne({
                cidHash,
                $or: [
                  { senderId: user._id },
                  { senderId: await User.findOne({ address: sender }) }
                ]
              });
              
              if (!existingMessage) {
                // Create new message record
                if (!options.dryRun) {
                  const senderUser = await User.findOne({ address: sender });
                  const receiverUser = await User.findOne({ address: receiver });
                  
                  if (senderUser && receiverUser) {
                    // Find or create conversation
                    let conversation = await Conversation.findOne({
                      type: 'direct',
                      $or: [
                        { createdBy: senderUser._id },
                        { createdBy: receiverUser._id }
                      ]
                    });
                    
                    if (!conversation) {
                      conversation = new Conversation({
                        type: 'direct',
                        createdBy: senderUser._id,
                        lastMessageAt: new Date(timestamp * 1000)
                      });
                      await conversation.save();
                      
                      // Add members
                      await ConversationMember.create([
                        { conversationId: conversation._id, userId: senderUser._id, role: 'member' },
                        { conversationId: conversation._id, userId: receiverUser._id, role: 'member' }
                      ]);
                    }
                    
                    // Create message
                    const message = new Message({
                      conversationId: conversation._id,
                      senderId: senderUser._id,
                      type: 'text',
                      cidHash,
                      cid: cidHash,
                      status: 'confirmed',
                      createdAt: new Date(timestamp * 1000)
                    });
                    
                    await message.save();
                    
                    // Add to processing queue
                    await addMessageProcessingJob({
                      messageId: message._id.toString(),
                      cidHash,
                      senderAddress: sender,
                      recipientAddress: receiver,
                      timestamp
                    });
                  }
                }
                
                result.processed++;
                console.log(`📨 Created message record for ${sender} -> ${receiver}`);
              }
            }
          }
          
        } catch (error) {
          const errorMsg = `Failed to sync messages for user ${user.address}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Message sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }

  /**
   * Validate IPFS content accessibility
   */
  private async validateIPFSContent(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = { success: true, processed: 0, errors: [], warnings: [] };
    
    try {
      console.log('🔍 Validating IPFS content...');
      
      // Get all messages with CIDs
      const messages = await Message.find({ 
        cidHash: { $exists: true, $ne: null },
        status: 'confirmed'
      }).limit(options.maxMessages || 100);
      
      for (const message of messages) {
        try {
          // Try to fetch content from IPFS
          const content = await fetchWithFallback(message.cidHash!);
          
          if (!content) {
            result.warnings.push(`IPFS content not accessible for message ${message._id} (CID: ${message.cidHash})`);
            
            // Mark message as failed
            if (!options.dryRun) {
              await Message.findByIdAndUpdate(message._id, {
                status: 'failed',
                updatedAt: new Date()
              });
            }
          } else {
            // Add to caching queue
            await addIPFSCachingJob({
              cidHash: message.cidHash!,
              messageId: message._id.toString()
            });
          }
          
          result.processed++;
          
        } catch (error) {
          const errorMsg = `Failed to validate IPFS content for message ${message._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
        }
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`IPFS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = { success: true, processed: 0, errors: [], warnings: [] };
    
    try {
      console.log('🧹 Cleaning up orphaned data...');
      
      // Find messages without valid conversations
      const orphanedMessages = await Message.aggregate([
        {
          $lookup: {
            from: 'conversations',
            localField: 'conversationId',
            foreignField: '_id',
            as: 'conversation'
          }
        },
        {
          $match: {
            conversation: { $size: 0 }
          }
        }
      ]);
      
      if (orphanedMessages.length > 0) {
        result.warnings.push(`Found ${orphanedMessages.length} orphaned messages`);
        
        if (!options.dryRun) {
          await Message.deleteMany({
            _id: { $in: orphanedMessages.map(m => m._id) }
          });
        }
        
        result.processed += orphanedMessages.length;
      }
      
      // Find conversation members without valid conversations
      const orphanedMembers = await ConversationMember.aggregate([
        {
          $lookup: {
            from: 'conversations',
            localField: 'conversationId',
            foreignField: '_id',
            as: 'conversation'
          }
        },
        {
          $match: {
            conversation: { $size: 0 }
          }
        }
      ]);
      
      if (orphanedMembers.length > 0) {
        result.warnings.push(`Found ${orphanedMembers.length} orphaned conversation members`);
        
        if (!options.dryRun) {
          await ConversationMember.deleteMany({
            _id: { $in: orphanedMembers.map(m => m._id) }
          });
        }
        
        result.processed += orphanedMembers.length;
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSyncTime: number;
    nextSyncTime?: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime: this.syncInterval ? this.lastSyncTime + (5 * 60 * 1000) : undefined
    };
  }

  /**
   * Health check for sync service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      blockchain: boolean;
      ipfs: boolean;
      database: boolean;
      queue: boolean;
    };
  }> {
    const details = {
      blockchain: false,
      ipfs: false,
      database: false,
      queue: false
    };

    try {
      // Check blockchain connection
      await this.contract.getFriends();
      details.blockchain = true;
    } catch (error) {
      console.error('Blockchain health check failed:', error);
    }

    try {
      // Check IPFS gateways
      const ipfsHealth = await checkIPFSGatewayHealth();
      details.ipfs = ipfsHealth.some(g => g.status === 'healthy');
    } catch (error) {
      console.error('IPFS health check failed:', error);
    }

    try {
      // Check database connection
      await User.findOne();
      details.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check queue (simplified)
    details.queue = true; // Assume queue is healthy if no errors

    const healthyCount = Object.values(details).filter(Boolean).length;
    const status = healthyCount === 4 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'unhealthy';

    return { status, details };
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService();
