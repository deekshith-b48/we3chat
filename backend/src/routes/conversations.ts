import { Router } from 'express';
import { Conversation, ConversationMember, Message, User } from '../db/schema';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/conversations - Get user's conversations
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get conversations where user is a member
    const conversationMembers = await ConversationMember.find({ userId: req.user.id })
      .populate({
        path: 'conversationId',
        populate: [
          {
            path: 'members',
            populate: {
              path: 'userId',
              select: '_id address username avatar isRegistered lastSeen'
            }
          }
        ]
      })
      .sort({ conversationId: -1 }); // Order by most recent activity

    const conversations = [];
    
    for (const member of conversationMembers) {
      const conversation = member.conversationId as any;
      
      // Get last message for this conversation
      const lastMessage = await Message.findOne({ conversationId: conversation._id })
        .populate('senderId', '_id address username')
        .sort({ createdAt: -1 });

      // For direct conversations, find the other participant
      let otherParticipant = null;
      if (conversation.type === 'direct') {
        const otherMember = await ConversationMember.findOne({
          conversationId: conversation._id,
          userId: { $ne: req.user.id }
        }).populate('userId', '_id address username avatar isRegistered lastSeen');
        
        otherParticipant = otherMember ? otherMember.userId : null;
      }

      conversations.push({
        id: conversation._id.toString(),
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        otherParticipant: otherParticipant ? {
          id: (otherParticipant as any)._id.toString(),
          address: (otherParticipant as any).address,
          username: (otherParticipant as any).username,
          avatar: (otherParticipant as any).avatar,
          isRegistered: (otherParticipant as any).isRegistered,
          lastSeen: (otherParticipant as any).lastSeen,
        } : null,
        lastMessage: lastMessage ? {
          id: (lastMessage._id as any).toString(),
          content: lastMessage.content,
          sender: {
            id: ((lastMessage.senderId as any)._id).toString(),
            address: (lastMessage.senderId as any).address,
            username: (lastMessage.senderId as any).username,
          },
          createdAt: lastMessage.createdAt,
          type: lastMessage.type,
        } : null,
        lastMessageAt: conversation.lastMessageAt,
        memberInfo: {
          joinedAt: member.joinedAt,
          lastReadAt: member.lastReadAt,
          role: member.role,
        },
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      });
    }

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// POST /api/conversations - Create new conversation
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { type = 'direct', participantAddress, name, description } = req.body;

    if (type === 'direct') {
      if (!participantAddress) {
        return res.status(400).json({ error: 'Participant address required for direct conversation' });
      }

      // Find the other participant
      const otherUser = await User.findOne({ address: participantAddress.toLowerCase() });

      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if ((otherUser._id as any).toString() === req.user.id) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      // Check if direct conversation already exists
      const existingMembers = await ConversationMember.find({
        userId: { $in: [req.user.id, (otherUser._id as any).toString()] }
      }).populate('conversationId');

      // Find a conversation where both users are members
      for (const member of existingMembers) {
        const conversation = member.conversationId as any;
        if (conversation.type === 'direct') {
          const allMembers = await ConversationMember.find({ conversationId: conversation._id });
          const memberIds = allMembers.map(m => m.userId.toString());
          
          if (memberIds.includes(req.user.id) && memberIds.includes((otherUser._id as any).toString())) {
            return res.status(400).json({ 
              error: 'Conversation already exists',
              conversationId: conversation._id.toString()
            });
          }
        }
      }

      // Create new direct conversation
      const conversation = new Conversation({
        type: 'direct',
        createdBy: req.user.id,
      });
      await conversation.save();

      // Add both users as members
      await ConversationMember.insertMany([
        {
          conversationId: conversation._id,
          userId: req.user.id,
          role: 'member',
        },
        {
          conversationId: conversation._id,
          userId: (otherUser._id as any).toString(),
          role: 'member',
        },
      ]);

      res.json({
        conversation: {
          id: (conversation._id as any).toString(),
          type: conversation.type,
          otherParticipant: {
            id: (otherUser._id as any).toString(),
            address: otherUser.address,
            username: otherUser.username,
            avatar: otherUser.avatar,
          },
          createdAt: conversation.createdAt,
        }
      });

    } else if (type === 'group') {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Group name required' });
      }

      // Create group conversation
      const conversation = new Conversation({
        type: 'group',
        name: name.trim(),
        description: description?.trim(),
        createdBy: req.user.id,
      });
      await conversation.save();

      // Add creator as admin
      const member = new ConversationMember({
        conversationId: conversation._id,
        userId: req.user.id,
        role: 'admin',
      });
      await member.save();

      res.json({
        conversation: {
          id: (conversation._id as any).toString(),
          type: conversation.type,
          name: conversation.name,
          description: conversation.description,
          createdAt: conversation.createdAt,
        }
      });

    } else {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations/:id - Get specific conversation
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Check if user is member of this conversation
    const memberCheck = await ConversationMember.findOne({
      conversationId: id,
      userId: req.user.id
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get conversation details
    const conversation = await Conversation.findById(id)
      .populate('createdBy', '_id address username');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get all members
    const members = await ConversationMember.find({ conversationId: id })
      .populate('userId', '_id address username avatar publicKey isRegistered lastSeen');

    // Find other participant for direct conversations
    let otherParticipant = null;
    if (conversation.type === 'direct') {
      const otherMember = members.find(m => (m.userId as any)._id.toString() !== req.user!.id);
      otherParticipant = otherMember ? otherMember.userId : null;
    }

    const formattedMembers = members.map(m => ({
      id: ((m.userId as any)._id).toString(),
      address: (m.userId as any).address,
      username: (m.userId as any).username,
      avatar: (m.userId as any).avatar,
      publicKey: (m.userId as any).publicKey,
      isRegistered: (m.userId as any).isRegistered,
      lastSeen: (m.userId as any).lastSeen,
      role: m.role,
      joinedAt: m.joinedAt,
      lastReadAt: m.lastReadAt,
    }));

    res.json({
      conversation: {
        id: (conversation._id as any).toString(),
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        otherParticipant: otherParticipant ? {
          id: ((otherParticipant as any)._id).toString(),
          address: (otherParticipant as any).address,
          username: (otherParticipant as any).username,
          avatar: (otherParticipant as any).avatar,
          publicKey: (otherParticipant as any).publicKey,
          isRegistered: (otherParticipant as any).isRegistered,
          lastSeen: (otherParticipant as any).lastSeen,
        } : null,
        members: formattedMembers,
        creator: conversation.createdBy ? {
          id: ((conversation.createdBy as any)._id).toString(),
          address: (conversation.createdBy as any).address,
          username: (conversation.createdBy as any).username,
        } : null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// PUT /api/conversations/:id/read - Mark conversation as read
router.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Update last read timestamp
    await ConversationMember.findOneAndUpdate(
      {
        conversationId: id,
        userId: req.user.id
      },
      {
        lastReadAt: new Date(),
      }
    );

    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

// DELETE /api/conversations/:id - Leave conversation
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Check if user is member
    const member = await ConversationMember.findOne({
      conversationId: id,
      userId: req.user.id
    });

    if (!member) {
      return res.status(404).json({ error: 'Not a member of this conversation' });
    }

    // Remove user from conversation
    await ConversationMember.deleteOne({
      conversationId: id,
      userId: req.user.id
    });

    res.json({ message: 'Left conversation successfully' });
  } catch (error) {
    console.error('Leave conversation error:', error);
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
});

export default router;
