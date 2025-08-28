import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db';

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
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if session exists
      const session = await db.query.sessions.findFirst({
        where: and(
          eq(schema.sessions.token, token),
          eq(schema.sessions.userId, decoded.userId)
        ),
        with: {
          user: true
        }
      });

      if (!session || session.expiresAt < new Date()) {
        return next(new Error('Invalid or expired token'));
      }

      // Add user info to socket
      socket.user = {
        id: session.user.id,
        address: session.user.address,
        username: session.user.username || undefined,
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
        const member = await db.query.conversationMembers.findFirst({
          where: and(
            eq(schema.conversationMembers.conversationId, conversationId),
            eq(schema.conversationMembers.userId, userId)
          )
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
        const member = await db.query.conversationMembers.findFirst({
          where: and(
            eq(schema.conversationMembers.conversationId, conversationId),
            eq(schema.conversationMembers.userId, userId)
          )
        });

        if (!member) {
          socket.emit('message_error', { 
            tempId, 
            error: 'Access denied to conversation' 
          });
          return;
        }

        // Create message in database
        const [message] = await db.insert(schema.messages)
          .values({
            conversationId,
            senderId: userId,
            content,
            type,
            replyToId,
            status: 'confirmed', // API messages are immediately confirmed
          })
          .returning();

        // Update conversation's last message timestamp
        await db.update(schema.conversations)
          .set({
            lastMessageAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.conversations.id, conversationId));

        // Get message with sender info
        const messageWithSender = await db.query.messages.findFirst({
          where: eq(schema.messages.id, message.id),
          with: {
            sender: {
              columns: {
                id: true,
                address: true,
                username: true,
                avatar: true,
              }
            },
            replyTo: {
              columns: {
                id: true,
                content: true,
                senderId: true,
                createdAt: true,
              },
              with: {
                sender: {
                  columns: {
                    id: true,
                    username: true,
                  }
                }
              }
            }
          }
        });

        const messageData = {
          id: messageWithSender!.id,
          conversationId: messageWithSender!.conversationId,
          sender: messageWithSender!.sender,
          content: messageWithSender!.content,
          type: messageWithSender!.type,
          status: messageWithSender!.status,
          replyTo: messageWithSender!.replyTo,
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
        const message = await db.query.messages.findFirst({
          where: eq(schema.messages.id, messageId)
        });

        if (!message || message.senderId !== userId) {
          socket.emit('error', { message: 'Message not found or access denied' });
          return;
        }

        // Update message status
        const [updatedMessage] = await db.update(schema.messages)
          .set({
            status,
            txHash: txHash || undefined,
            blockNumber: blockNumber || undefined,
            updatedAt: new Date(),
          })
          .where(eq(schema.messages.id, messageId))
          .returning();

        // Broadcast update to conversation members
        io.to(`conversation:${message.conversationId}`).emit('message_updated', {
          messageId: updatedMessage.id,
          status: updatedMessage.status,
          txHash: updatedMessage.txHash,
          blockNumber: updatedMessage.blockNumber,
          updatedAt: updatedMessage.updatedAt,
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
      await db.update(schema.users)
        .set({
          lastSeen: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } catch (error) {
      console.error('Update presence error:', error);
    }
  }

  // Helper function to broadcast presence to friends
  async function broadcastPresenceToFriends(userId: string, status: string) {
    try {
      // Get user's friends
      const friendships = await db.query.friendships.findMany({
        where: and(
          or(
            eq(schema.friendships.requesterId, userId),
            eq(schema.friendships.addresseeId, userId)
          ),
          eq(schema.friendships.status, 'accepted')
        )
      });

      // Broadcast to each friend who is online
      for (const friendship of friendships) {
        const friendId = friendship.requesterId === userId 
          ? friendship.addresseeId 
          : friendship.requesterId;

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
