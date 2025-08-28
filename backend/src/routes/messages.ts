import { Router } from 'express';
import { eq, and, desc, asc } from 'drizzle-orm';
import { db, schema } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/messages/:conversationId - Get messages for a conversation
router.get('/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { conversationId } = req.params;
    const { limit = 50, offset = 0, before } = req.query;

    // Check if user is member of this conversation
    const memberCheck = await db.query.conversationMembers.findFirst({
      where: and(
        eq(schema.conversationMembers.conversationId, conversationId),
        eq(schema.conversationMembers.userId, req.user.id)
      )
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Build query conditions
    const conditions = [eq(schema.messages.conversationId, conversationId)];
    
    // Add before timestamp filter for pagination
    if (before) {
      const beforeDate = new Date(before as string);
      if (!isNaN(beforeDate.getTime())) {
        conditions.push(eq(schema.messages.createdAt, beforeDate));
      }
    }

    // Get messages
    const messages = await db.query.messages.findMany({
      where: and(...conditions),
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
        },
        reactions: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
              }
            }
          }
        }
      },
      orderBy: [desc(schema.messages.createdAt)],
      limit: Math.min(Number(limit), 100),
      offset: Number(offset),
    });

    // Reverse to get chronological order (oldest first)
    const sortedMessages = messages.reverse();

    res.json({ 
      messages: sortedMessages.map(message => ({
        id: message.id,
        conversationId: message.conversationId,
        sender: message.sender,
        content: message.content,
        type: message.type,
        txHash: message.txHash,
        blockNumber: message.blockNumber,
        cidHash: message.cidHash,
        cid: message.cid,
        status: message.status,
        replyTo: message.replyTo,
        reactions: message.reactions.map(reaction => ({
          id: reaction.id,
          emoji: reaction.emoji,
          user: reaction.user,
          createdAt: reaction.createdAt,
        })),
        editedAt: message.editedAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/messages - Send a new message
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      conversationId,
      content,
      type = 'text',
      txHash,
      blockNumber,
      cidHash,
      cid,
      replyToId
    } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    if (!content && type === 'text') {
      return res.status(400).json({ error: 'Message content required' });
    }

    // Check if user is member of this conversation
    const memberCheck = await db.query.conversationMembers.findFirst({
      where: and(
        eq(schema.conversationMembers.conversationId, conversationId),
        eq(schema.conversationMembers.userId, req.user.id)
      )
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Validate reply-to message if specified
    if (replyToId) {
      const replyToMessage = await db.query.messages.findFirst({
        where: and(
          eq(schema.messages.id, replyToId),
          eq(schema.messages.conversationId, conversationId)
        )
      });

      if (!replyToMessage) {
        return res.status(400).json({ error: 'Reply-to message not found' });
      }
    }

    // Create message
    const [message] = await db.insert(schema.messages)
      .values({
        conversationId,
        senderId: req.user.id,
        content,
        type,
        txHash,
        blockNumber,
        cidHash,
        cid,
        status: txHash ? 'pending' : 'confirmed', // If txHash provided, mark as pending
        replyToId,
      })
      .returning();

    // Update conversation's last message timestamp
    await db.update(schema.conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.conversations.id, conversationId));

    // Get message with sender info for response
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

    res.status(201).json({ 
      message: {
        id: messageWithSender!.id,
        conversationId: messageWithSender!.conversationId,
        sender: messageWithSender!.sender,
        content: messageWithSender!.content,
        type: messageWithSender!.type,
        txHash: messageWithSender!.txHash,
        blockNumber: messageWithSender!.blockNumber,
        cidHash: messageWithSender!.cidHash,
        cid: messageWithSender!.cid,
        status: messageWithSender!.status,
        replyTo: messageWithSender!.replyTo,
        createdAt: messageWithSender!.createdAt,
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/messages/:id - Update message (for blockchain confirmation)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { status, txHash, blockNumber, content } = req.body;

    // Find message and verify ownership
    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, id),
      with: {
        conversation: {
          with: {
            members: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender or a member of the conversation
    const isSender = message.senderId === req.user.id;
    const isMember = message.conversation.members.some(m => m.userId === req.user.id);

    if (!isSender && !isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status && ['pending', 'confirmed', 'failed'].includes(status)) {
      updateData.status = status;
    }

    if (txHash) {
      updateData.txHash = txHash;
    }

    if (blockNumber) {
      updateData.blockNumber = blockNumber;
    }

    // Only sender can edit content
    if (content && isSender) {
      updateData.content = content;
      updateData.editedAt = new Date();
    }

    // Update message
    const [updatedMessage] = await db.update(schema.messages)
      .set(updateData)
      .where(eq(schema.messages.id, id))
      .returning();

    res.json({
      message: {
        id: updatedMessage.id,
        status: updatedMessage.status,
        txHash: updatedMessage.txHash,
        blockNumber: updatedMessage.blockNumber,
        content: updatedMessage.content,
        editedAt: updatedMessage.editedAt,
        updatedAt: updatedMessage.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// POST /api/messages/:id/reactions - Add/remove reaction to message
router.post('/:id/reactions', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji || emoji.length > 10) {
      return res.status(400).json({ error: 'Valid emoji required' });
    }

    // Check if message exists and user has access
    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, id),
      with: {
        conversation: {
          with: {
            members: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isMember = message.conversation.members.some(m => m.userId === req.user!.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = await db.query.messageReactions.findFirst({
      where: and(
        eq(schema.messageReactions.messageId, id),
        eq(schema.messageReactions.userId, req.user.id),
        eq(schema.messageReactions.emoji, emoji)
      )
    });

    if (existingReaction) {
      // Remove existing reaction
      await db.delete(schema.messageReactions)
        .where(eq(schema.messageReactions.id, existingReaction.id));

      res.json({ message: 'Reaction removed' });
    } else {
      // Add new reaction
      const [reaction] = await db.insert(schema.messageReactions)
        .values({
          messageId: id,
          userId: req.user.id,
          emoji,
        })
        .returning();

      res.json({ 
        message: 'Reaction added',
        reaction: {
          id: reaction.id,
          emoji: reaction.emoji,
          createdAt: reaction.createdAt,
        }
      });
    }
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Find message and verify ownership
    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, id)
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their messages
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Soft delete by setting deletedAt timestamp
    await db.update(schema.messages)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.messages.id, id));

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
