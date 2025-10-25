import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { User, Session, ConversationMember, Message, Conversation, Friendship } from '../db/schema';
import { setupBlockchainEventListeners } from './blockchain-events';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    address: string;
    username?: string;
  };
}

// Store user connections for presence and real-time features
const userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketUsers = new Map<string, string>(); // socketId -> userId

export function setupSocketHandlers(io: Server) {
  // Set up blockchain event listeners
  setupBlockchainEventListeners(io);

  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Support both JWT token and wallet address authentication
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      const userAddress = socket.handshake.auth.userAddress || socket.handshake.auth.address;
      
      let user = null;

      // Try JWT authentication first
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          // Check if session exists and get user
          const session = await Session.findOne({
            token: token,
            userId: decoded.userId,
            expiresAt: { $gt: new Date() }
          }).populate('userId');

          if (session) {
            user = await User.findById(session.userId);
          }
        } catch (jwtError) {
          console.log('JWT verification failed, trying wallet address auth');
        }
      }

      // Fall back to wallet address authentication
      if (!user && userAddress) {
        // Normalize address to lowercase
        const normalizedAddress = userAddress.toLowerCase();
        
        // Find or create user by wallet address
        user = await User.findOne({ address: normalizedAddress });
        
        if (!user) {
          // Auto-create user for wallet-based auth
          user = await User.create({
            address: normalizedAddress,
            isRegistered: false,
            lastSeen: new Date()
          });
          console.log(`✨ Auto-created user for address ${normalizedAddress}`);
        }
      }

      if (!user) {
        return next(new Error('Authentication required: provide either token or userAddress'));
      }

      // Update last seen
      await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });

      // Add user info to socket
      socket.user = {
        id: user._id.toString(),
        address: user.address,
        username: user.username || undefined,
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.user?.address} connected (${socket.id})`);

    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const userId = socket.user.id;

    // Track user connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socket.id);
    socketUsers.set(socket.id, userId);

    // Update user's last seen and online status
    updateUserPresence(userId, true);

    // Join user to their personal room for direct notifications
    socket.join(`user:${userId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;

        if (!conversationId) {
          socket.emit('error', { message: 'Conversation ID required' });
          return;
        }

        // Verify user is member of this conversation
        const member = await ConversationMember.findOne({
          conversationId: conversationId,
          userId: userId
        });

        if (!member) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }

        // Join conversation room
        socket.join(`conversation:${conversationId}`);
        console.log(`📱 User ${socket.user!.address} joined conversation ${conversationId}`);

        // Emit confirmation
        socket.emit('conversation_joined', { conversationId });

      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`📱 User ${socket.user!.address} left conversation ${conversationId}`);
        socket.emit('conversation_left', { conversationId });
      }
    });

    // Handle new message events
    socket.on('send_message', async (data) => {
      try {
        const {
          conversationId,
          content,
          type = 'text',
          replyToId,
          tempId // Client-side temporary ID for optimistic updates
        } = data;

        if (!conversationId || !content) {
          socket.emit('message_error', { 
            tempId, 
            error: 'Conversation ID and content required' 
          });
          return;
        }

        // Verify user is member of conversation
        const member = await ConversationMember.findOne({
          conversationId: conversationId,
          userId: userId
        });

        if (!member) {
          socket.emit('message_error', { 
            tempId, 
            error: 'Access denied to conversation' 
          });
          return;
        }

        // Create message in database
        const message = new Message({
          conversationId,
          senderId: userId,
          content,
          type,
          replyToId,
          status: 'confirmed', // API messages are immediately confirmed
        });

        await message.save();

        // Update conversation's last message timestamp
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        });

        // Get message with sender info
        const messageWithSender = await Message.findById(message._id)
          .populate('senderId', 'id address username avatar')
          .populate({
            path: 'replyToId',
            select: 'id content senderId createdAt',
            populate: {
              path: 'senderId',
              select: 'id username'
            }
          });

        const messageData = {
          id: messageWithSender!._id,
          conversationId: messageWithSender!.conversationId,
          sender: messageWithSender!.senderId,
          content: messageWithSender!.content,
          type: messageWithSender!.type,
          status: messageWithSender!.status,
          replyTo: messageWithSender!.replyToId,
          createdAt: messageWithSender!.createdAt,
          tempId, // Include temp ID for client-side matching
        };

        // Broadcast to all users in the conversation
        io.to(`conversation:${conversationId}`).emit('new_message', messageData);

        console.log(`💬 Message sent in conversation ${conversationId} by ${socket.user!.address}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { 
          tempId: data.tempId, 
          error: 'Failed to send message' 
        });
      }
    });

    // Handle message status updates (blockchain confirmations)
    socket.on('update_message_status', async (data) => {
      try {
        const { messageId, status, txHash, blockNumber } = data;

        if (!messageId || !status) {
          socket.emit('error', { message: 'Message ID and status required' });
          return;
        }

        // Find message and verify ownership
        const message = await Message.findById(messageId);

        if (!message || message.senderId.toString() !== userId) {
          socket.emit('error', { message: 'Message not found or access denied' });
          return;
        }

        // Update message status
        const updatedMessage = await Message.findByIdAndUpdate(messageId, {
          status,
          txHash: txHash || undefined,
          blockNumber: blockNumber || undefined,
          updatedAt: new Date(),
        }, { new: true });

        // Broadcast update to conversation members
        io.to(`conversation:${message.conversationId}`).emit('message_updated', {
          messageId: updatedMessage!._id,
          status: updatedMessage!.status,
          txHash: updatedMessage!.txHash,
          blockNumber: updatedMessage!.blockNumber,
          updatedAt: updatedMessage!.updatedAt,
        });

      } catch (error) {
        console.error('Update message status error:', error);
        socket.emit('error', { message: 'Failed to update message status' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId,
          username: socket.user!.username,
          conversationId,
        });
      }
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
          userId,
          conversationId,
        });
      }
    });

    // Handle presence updates
    socket.on('update_presence', async (data) => {
      const { status } = data; // 'online', 'away', 'busy', 'offline'
      
      // Update user presence in database if needed
      await updateUserPresence(userId, status === 'online');
      
      // Broadcast to friends
      await broadcastPresenceToFriends(userId, status);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.user?.address} disconnected (${socket.id})`);
      
      // Remove from tracking
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
          // User is fully offline
          updateUserPresence(userId, false);
          broadcastPresenceToFriends(userId, 'offline');
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  // Helper function to update user presence
  async function updateUserPresence(userId: string, isOnline: boolean) {
    try {
      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('Update presence error:', error);
    }
  }

  // Helper function to broadcast presence to friends
  async function broadcastPresenceToFriends(userId: string, status: string) {
    try {
      // Get user's friends
      const friendships = await Friendship.find({
        $or: [
          { requesterId: userId },
          { addresseeId: userId }
        ],
        status: 'accepted'
      });

      // Broadcast to each friend who is online
      for (const friendship of friendships) {
        const friendId = friendship.requesterId.toString() === userId 
          ? friendship.addresseeId.toString() 
          : friendship.requesterId.toString();

        io.to(`user:${friendId}`).emit('friend_presence_updated', {
          userId,
          status,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Broadcast presence error:', error);
    }
  }

  console.log('🔌 Socket.io handlers configured');
}

// Export utility functions for use in other parts of the app
export function getUserConnections() {
  return userConnections;
}

export function isUserOnline(userId: string): boolean {
  return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
}

export function getOnlineUsersCount(): number {
  return userConnections.size;
}
