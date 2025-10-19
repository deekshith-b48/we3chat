import { ethers } from 'ethers';
import { Server } from 'socket.io';
import { User, Message, Conversation, ConversationMember } from '../db/schema';
import { fetchWithFallback } from '../../lib/ipfs';

// Contract ABI for listening to events
const CHAT_APP_ABI = [
  "event MessageSent(address indexed from, address indexed to, bytes32 indexed cidHash, uint256 timestamp)",
  "event FriendAdded(address indexed user, address indexed friend, string friendName)",
  "event AccountCreated(address indexed user, string name, bytes32 x25519PublicKey)"
];

interface BlockchainEventData {
  sender: string;
  recipient: string;
  cidHash: string;
  timestamp: number;
}

// Store for tracking processed events to avoid duplicates
const processedEvents = new Set<string>();

export function setupBlockchainEventListeners(io: Server) {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const contractAddress = process.env.CHAT_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.warn('⚠️ CHAT_CONTRACT_ADDRESS not set, blockchain event listeners disabled');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, CHAT_APP_ABI, provider);

    console.log(`🔗 Setting up blockchain event listeners for contract: ${contractAddress}`);

    // Listen for MessageSent events
    contract.on('MessageSent', async (from: string, to: string, cidHash: string, timestamp: number) => {
      const eventId = `${from}-${to}-${cidHash}-${timestamp}`;
      
      // Avoid processing duplicate events
      if (processedEvents.has(eventId)) {
        return;
      }
      processedEvents.add(eventId);

      console.log(`📨 Blockchain MessageSent event: ${from} -> ${to}`, { cidHash, timestamp });

      try {
        await handleMessageSentEvent(io, {
          sender: from,
          recipient: to,
          cidHash,
          timestamp: Number(timestamp)
        });
      } catch (error) {
        console.error('Error handling MessageSent event:', error);
      }
    });

    // Listen for FriendAdded events
    contract.on('FriendAdded', async (user: string, friend: string, friendName: string) => {
      console.log(`👥 Blockchain FriendAdded event: ${user} added ${friend} (${friendName})`);
      
      try {
        await handleFriendAddedEvent(io, user, friend, friendName);
      } catch (error) {
        console.error('Error handling FriendAdded event:', error);
      }
    });

    // Listen for AccountCreated events
    contract.on('AccountCreated', async (user: string, name: string, publicKey: string) => {
      console.log(`👤 Blockchain AccountCreated event: ${user} (${name})`);
      
      try {
        await handleAccountCreatedEvent(io, user, name, publicKey);
      } catch (error) {
        console.error('Error handling AccountCreated event:', error);
      }
    });

    // Clean up old processed events periodically (keep last 1000)
    setInterval(() => {
      if (processedEvents.size > 1000) {
        const eventsArray = Array.from(processedEvents);
        const toKeep = eventsArray.slice(-500); // Keep last 500
        processedEvents.clear();
        toKeep.forEach(event => processedEvents.add(event));
      }
    }, 300000); // Every 5 minutes

    console.log('✅ Blockchain event listeners set up successfully');

  } catch (error) {
    console.error('❌ Failed to set up blockchain event listeners:', error);
  }
}

async function handleMessageSentEvent(io: Server, eventData: BlockchainEventData) {
  const { sender, recipient, cidHash, timestamp } = eventData;

  try {
    // Find users in database
    const senderUser = await User.findOne({ address: sender.toLowerCase() });
    const recipientUser = await User.findOne({ address: recipient.toLowerCase() });

    if (!senderUser || !recipientUser) {
      console.log(`⚠️ Users not found in database: sender=${!!senderUser}, recipient=${!!recipientUser}`);
      return;
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      type: 'direct',
      $or: [
        { createdBy: senderUser._id },
        { createdBy: recipientUser._id }
      ]
    }).populate('createdBy');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        type: 'direct',
        createdBy: senderUser._id,
        lastMessageAt: new Date(timestamp * 1000)
      });
      await conversation.save();

      // Add both users as members
      await ConversationMember.create([
        {
          conversationId: conversation._id,
          userId: senderUser._id,
          role: 'member',
          joinedAt: new Date()
        },
        {
          conversationId: conversation._id,
          userId: recipientUser._id,
          role: 'member',
          joinedAt: new Date()
        }
      ]);
    }

    // Create message record in database
    const message = new Message({
      conversationId: conversation._id,
      senderId: senderUser._id,
      type: 'text',
      cidHash,
      cid: cidHash, // Using cidHash as cid for now
      status: 'confirmed',
      createdAt: new Date(timestamp * 1000)
    });

    await message.save();

    // Update conversation's last message timestamp
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessageAt: new Date(timestamp * 1000),
      updatedAt: new Date()
    });

    // Get message with sender info for broadcasting
    const messageWithSender = await Message.findById(message._id)
      .populate('senderId', 'id address username avatar');

    const messageData = {
      id: messageWithSender!._id,
      conversationId: messageWithSender!.conversationId,
      sender: messageWithSender!.senderId,
      content: '[Encrypted message from blockchain]', // Content will be decrypted on client
      type: messageWithSender!.type,
      status: messageWithSender!.status,
      cidHash: messageWithSender!.cidHash,
      cid: messageWithSender!.cid,
      createdAt: messageWithSender!.createdAt,
      isBlockchainMessage: true
    };

    // Broadcast to conversation members
    io.to(`conversation:${conversation._id}`).emit('blockchain_message_received', messageData);

    // Also send to individual user rooms for real-time notifications
    io.to(`user:${recipientUser._id}`).emit('new_message_notification', {
      conversationId: conversation._id,
      sender: senderUser.address,
      senderUsername: senderUser.username,
      messageType: 'blockchain',
      timestamp: timestamp * 1000
    });

    console.log(`✅ Processed blockchain message: ${sender} -> ${recipient}`);

  } catch (error) {
    console.error('Error processing MessageSent event:', error);
  }
}

async function handleFriendAddedEvent(io: Server, user: string, friend: string, friendName: string) {
  try {
    // Find users in database
    const userDoc = await User.findOne({ address: user.toLowerCase() });
    const friendDoc = await User.findOne({ address: friend.toLowerCase() });

    if (!userDoc || !friendDoc) {
      console.log(`⚠️ Users not found for friend addition: user=${!!userDoc}, friend=${!!friendDoc}`);
      return;
    }

    // Broadcast friend addition to both users
    io.to(`user:${userDoc._id}`).emit('friend_added_blockchain', {
      friendAddress: friend,
      friendName,
      timestamp: Date.now()
    });

    io.to(`user:${friendDoc._id}`).emit('friend_added_blockchain', {
      friendAddress: user,
      friendName: userDoc.username || user.slice(0, 8) + '...',
      timestamp: Date.now()
    });

    console.log(`✅ Processed friend addition: ${user} -> ${friend}`);

  } catch (error) {
    console.error('Error processing FriendAdded event:', error);
  }
}

async function handleAccountCreatedEvent(io: Server, user: string, name: string, publicKey: string) {
  try {
    // Find user in database
    const userDoc = await User.findOne({ address: user.toLowerCase() });

    if (!userDoc) {
      console.log(`⚠️ User not found for account creation: ${user}`);
      return;
    }

    // Update user with blockchain data
    await User.findByIdAndUpdate(userDoc._id, {
      username: name,
      publicKey,
      isRegistered: true,
      updatedAt: new Date()
    });

    // Broadcast account creation to user
    io.to(`user:${userDoc._id}`).emit('account_created_blockchain', {
      username: name,
      publicKey,
      timestamp: Date.now()
    });

    console.log(`✅ Processed account creation: ${user} (${name})`);

  } catch (error) {
    console.error('Error processing AccountCreated event:', error);
  }
}

// Utility function to fetch message content from IPFS
async function fetchMessageContent(cidHash: string): Promise<any> {
  try {
    return await fetchWithFallback(cidHash);
  } catch (error) {
    console.error(`Failed to fetch message content from IPFS: ${cidHash}`, error);
    throw error;
  }
}

// Export for use in other parts of the application
export { handleMessageSentEvent, handleFriendAddedEvent, handleAccountCreatedEvent };
