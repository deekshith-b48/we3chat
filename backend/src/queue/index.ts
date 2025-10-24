import Queue from 'bull';
import { Message } from '../db/schema';
import { fetchWithFallback } from '../lib/ipfs';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
};

// Create job queues
export const messageQueue = new Queue('message processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,         // Start with 2s delay, then 4s, 8s, etc.
    }
  }
});

export const ipfsQueue = new Queue('ipfs processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 5,           // More attempts for IPFS operations
    backoff: {
      type: 'exponential',
      delay: 1000,
    }
  }
});

export const blockchainQueue = new Queue('blockchain processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    }
  }
});

// Job types
export interface MessageProcessingJob {
  messageId: string;
  cidHash: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
}

export interface IPFSProcessingJob {
  cidHash: string;
  messageId?: string;
  retryCount?: number;
}

export interface BlockchainProcessingJob {
  txHash: string;
  messageId: string;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'failed';
}

// Message processing job handler
messageQueue.process('process-message', async (job) => {
  const { messageId, cidHash, senderAddress, recipientAddress, timestamp } = job.data as MessageProcessingJob;
  
  console.log(`🔄 Processing message job: ${messageId}`);
  
  try {
    // Fetch message content from IPFS
    const messageData = await fetchWithFallback(cidHash);
    
    // Update message in database with content
    await Message.findByIdAndUpdate(messageId, {
      content: messageData.content || '[Encrypted message]',
      status: 'confirmed',
      updatedAt: new Date()
    });
    
    console.log(`✅ Message processed successfully: ${messageId}`);
    
    // Add to IPFS queue for caching/backup
    await ipfsQueue.add('cache-ipfs-content', {
      cidHash,
      messageId,
      content: messageData
    });
    
  } catch (error) {
    console.error(`❌ Failed to process message ${messageId}:`, error);
    
    // Update message status to failed
    await Message.findByIdAndUpdate(messageId, {
      status: 'failed',
      updatedAt: new Date()
    });
    
    throw error;
  }
});

// IPFS processing job handler
ipfsQueue.process('cache-ipfs-content', async (job) => {
  const { cidHash, messageId, content } = job.data as IPFSProcessingJob;
  
  console.log(`🔄 Caching IPFS content: ${cidHash}`);
  
  try {
    // Here you could implement local caching, backup to other IPFS nodes, etc.
    // For now, we'll just validate the content is accessible
    
    const fetchedContent = await fetchWithFallback(cidHash);
    
    if (!fetchedContent) {
      throw new Error('Content not accessible');
    }
    
    console.log(`✅ IPFS content cached successfully: ${cidHash}`);
    
  } catch (error) {
    console.error(`❌ Failed to cache IPFS content ${cidHash}:`, error);
    throw error;
  }
});

// Blockchain processing job handler
blockchainQueue.process('update-transaction-status', async (job) => {
  const { txHash, messageId, blockNumber, status } = job.data as BlockchainProcessingJob;
  
  console.log(`🔄 Updating transaction status: ${txHash}`);
  
  try {
    // Update message with transaction details
    const updateData: any = {
      txHash,
      status,
      updatedAt: new Date()
    };
    
    if (blockNumber) {
      updateData.blockNumber = blockNumber;
    }
    
    await Message.findByIdAndUpdate(messageId, updateData);
    
    console.log(`✅ Transaction status updated: ${txHash} -> ${status}`);
    
  } catch (error) {
    console.error(`❌ Failed to update transaction status ${txHash}:`, error);
    throw error;
  }
});

// Queue event handlers
messageQueue.on('completed', (job) => {
  console.log(`✅ Message job completed: ${job.id}`);
});

messageQueue.on('failed', (job, err) => {
  console.error(`❌ Message job failed: ${job.id}`, err.message);
});

ipfsQueue.on('completed', (job) => {
  console.log(`✅ IPFS job completed: ${job.id}`);
});

ipfsQueue.on('failed', (job, err) => {
  console.error(`❌ IPFS job failed: ${job.id}`, err.message);
});

blockchainQueue.on('completed', (job) => {
  console.log(`✅ Blockchain job completed: ${job.id}`);
});

blockchainQueue.on('failed', (job, err) => {
  console.error(`❌ Blockchain job failed: ${job.id}`, err.message);
});

// Utility functions for adding jobs
export async function addMessageProcessingJob(data: MessageProcessingJob) {
  return await messageQueue.add('process-message', data, {
    priority: 1, // High priority for message processing
    delay: 0
  });
}

export async function addIPFSCachingJob(data: IPFSProcessingJob) {
  return await ipfsQueue.add('cache-ipfs-content', data, {
    priority: 2, // Medium priority for caching
    delay: 5000 // Delay 5 seconds to let message processing complete first
  });
}

export async function addBlockchainUpdateJob(data: BlockchainProcessingJob) {
  return await blockchainQueue.add('update-transaction-status', data, {
    priority: 1, // High priority for transaction updates
    delay: 0
  });
}

// Health check function
export async function getQueueHealth() {
  const messageStats = await messageQueue.getJobCounts();
  const ipfsStats = await ipfsQueue.getJobCounts();
  const blockchainStats = await blockchainQueue.getJobCounts();
  
  return {
    messageQueue: messageStats,
    ipfsQueue: ipfsStats,
    blockchainQueue: blockchainStats,
    timestamp: new Date().toISOString()
  };
}

// Cleanup function
export async function closeQueues() {
  await messageQueue.close();
  await ipfsQueue.close();
  await blockchainQueue.close();
  console.log('🔌 Job queues closed');
}

console.log('📋 Job queues initialized');
