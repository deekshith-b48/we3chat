import { Router } from 'express';
import { Message, ConversationMember, Conversation } from '../db/schema';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/messages/:conversationId - Get messages for a conversation
router.get('/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is member of this conversation
    const memberCheck = await ConversationMember.findOne({
      conversationId: conversationId,
      userId: req.user.id
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('senderId', '_id address username avatar')
      .populate({
        path: 'replyToId',
        select: '_id content senderId createdAt',
        populate: {
          path: 'senderId',
          select: '_id username'
        }
      })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .skip(Number(offset));

    // Reverse to get chronological order (oldest first)
    const sortedMessages = messages.reverse();

    const formattedMessages = sortedMessages.map(message => ({
      id: (message._id as any).toString(),
      conversationId: message.conversationId,
      sender: {
        id: ((message.senderId as any)._id).toString(),
        address: (message.senderId as any).address,
        username: (message.senderId as any).username,
        avatar: (message.senderId as any).avatar,
      },
      content: message.content,
      type: message.type,
      txHash: message.txHash,
      blockNumber: message.blockNumber,
      cidHash: message.cidHash,
      cid: message.cid,
      status: message.status,
      replyTo: message.replyToId ? {
        id: ((message.replyToId as any)._id).toString(),
        content: (message.replyToId as any).content,
        senderId: ((message.replyToId as any).senderId._id).toString(),
        createdAt: (message.replyToId as any).createdAt,
      } : null,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    }));

    res.json({ messages: formattedMessages });
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
    const memberCheck = await ConversationMember.findOne({
      conversationId: conversationId,
      userId: req.user.id
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Validate reply-to message if specified
    if (replyToId) {
      const replyToMessage = await Message.findOne({
        _id: replyToId,
        conversationId: conversationId
      });

      if (!replyToMessage) {
        return res.status(400).json({ error: 'Reply-to message not found' });
      }
    }

    // Create message
    const message = new Message({
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
    });
    await message.save();

    // Update conversation's last message timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    });

    // Get message with sender info for response
    const messageWithSender = await Message.findById(message._id)
      .populate('senderId', '_id address username avatar')
      .populate({
        path: 'replyToId',
        select: '_id content senderId createdAt',
        populate: {
          path: 'senderId',
          select: '_id username'
        }
      });

    res.status(201).json({ 
      message: {
        id: (messageWithSender!._id as any).toString(),
        conversationId: messageWithSender!.conversationId,
        sender: {
          id: ((messageWithSender!.senderId as any)._id).toString(),
          address: (messageWithSender!.senderId as any).address,
          username: (messageWithSender!.senderId as any).username,
          avatar: (messageWithSender!.senderId as any).avatar,
        },
        content: messageWithSender!.content,
        type: messageWithSender!.type,
        txHash: messageWithSender!.txHash,
        blockNumber: messageWithSender!.blockNumber,
        cidHash: messageWithSender!.cidHash,
        cid: messageWithSender!.cid,
        status: messageWithSender!.status,
        replyTo: messageWithSender!.replyToId ? {
          id: ((messageWithSender!.replyToId as any)._id).toString(),
          content: (messageWithSender!.replyToId as any).content,
          senderId: ((messageWithSender!.replyToId as any).senderId._id).toString(),
          createdAt: (messageWithSender!.replyToId as any).createdAt,
        } : null,
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
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    const isSender = message.senderId.toString() === req.user.id;

    if (!isSender) {
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
    const updatedMessage = await Message.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      message: {
        id: (updatedMessage!._id as any).toString(),
        status: updatedMessage!.status,
        txHash: updatedMessage!.txHash,
        blockNumber: updatedMessage!.blockNumber,
        content: updatedMessage!.content,
        editedAt: updatedMessage!.editedAt,
        updatedAt: updatedMessage!.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
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
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their messages
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Soft delete by setting deletedAt timestamp
    await Message.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
