import { Router } from 'express';
import { eq, and, or, desc } from 'drizzle-orm';
import { db, schema } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/conversations - Get user's conversations
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get conversations where user is a member
    const conversationMembers = await db.query.conversationMembers.findMany({
      where: eq(schema.conversationMembers.userId, req.user.id),
      with: {
        conversation: {
          with: {
            members: {
              with: {
                user: {
                  columns: {
                    id: true,
                    address: true,
                    username: true,
                    avatar: true,
                    isRegistered: true,
                    lastSeen: true,
                  }
                }
              }
            },
            messages: {
              limit: 1,
              orderBy: [desc(schema.messages.createdAt)],
              with: {
                sender: {
                  columns: {
                    id: true,
                    address: true,
                    username: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [desc(schema.conversationMembers.conversationId)] // Order by most recent activity
    });

    // Transform the data for frontend
    const conversations = conversationMembers.map(member => {
      const conversation = member.conversation;
      const lastMessage = conversation.messages[0] || null;
      
      // For direct conversations, find the other participant
      let otherParticipant = null;
      if (conversation.type === 'direct') {
        otherParticipant = conversation.members.find(
          m => m.userId !== req.user!.id
        )?.user || null;
      }

      return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        otherParticipant,
        members: conversation.members.map(m => m.user),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sender: lastMessage.sender,
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
      };
    });

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
      const otherUser = await db.query.users.findFirst({
        where: eq(schema.users.address, participantAddress.toLowerCase())
      });

      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (otherUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      // Check if direct conversation already exists
      const existingConversation = await db.query.conversations.findFirst({
        where: eq(schema.conversations.type, 'direct'),
        with: {
          members: true
        }
      });

      // Find existing direct conversation between these two users
      if (existingConversation) {
        const memberIds = existingConversation.members.map(m => m.userId);
        if (memberIds.includes(req.user.id) && memberIds.includes(otherUser.id)) {
          return res.status(400).json({ 
            error: 'Conversation already exists',
            conversationId: existingConversation.id 
          });
        }
      }

      // Create new direct conversation
      const [conversation] = await db.insert(schema.conversations)
        .values({
          type: 'direct',
          createdBy: req.user.id,
        })
        .returning();

      // Add both users as members
      await db.insert(schema.conversationMembers)
        .values([
          {
            conversationId: conversation.id,
            userId: req.user.id,
            role: 'member',
          },
          {
            conversationId: conversation.id,
            userId: otherUser.id,
            role: 'member',
          },
        ]);

      res.json({
        conversation: {
          id: conversation.id,
          type: conversation.type,
          otherParticipant: {
            id: otherUser.id,
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
      const [conversation] = await db.insert(schema.conversations)
        .values({
          type: 'group',
          name: name.trim(),
          description: description?.trim(),
          createdBy: req.user.id,
        })
        .returning();

      // Add creator as admin
      await db.insert(schema.conversationMembers)
        .values({
          conversationId: conversation.id,
          userId: req.user.id,
          role: 'admin',
        });

      res.json({
        conversation: {
          id: conversation.id,
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
    const memberCheck = await db.query.conversationMembers.findFirst({
      where: and(
        eq(schema.conversationMembers.conversationId, id),
        eq(schema.conversationMembers.userId, req.user.id)
      )
    });

    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get conversation details
    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, id),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                address: true,
                username: true,
                avatar: true,
                publicKey: true,
                isRegistered: true,
                lastSeen: true,
              }
            }
          }
        },
        creator: {
          columns: {
            id: true,
            address: true,
            username: true,
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find other participant for direct conversations
    let otherParticipant = null;
    if (conversation.type === 'direct') {
      otherParticipant = conversation.members.find(
        m => m.userId !== req.user!.id
      )?.user || null;
    }

    res.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        otherParticipant,
        members: conversation.members.map(m => ({
          ...m.user,
          role: m.role,
          joinedAt: m.joinedAt,
          lastReadAt: m.lastReadAt,
        })),
        creator: conversation.creator,
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
    await db.update(schema.conversationMembers)
      .set({
        lastReadAt: new Date(),
      })
      .where(and(
        eq(schema.conversationMembers.conversationId, id),
        eq(schema.conversationMembers.userId, req.user.id)
      ));

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
    const member = await db.query.conversationMembers.findFirst({
      where: and(
        eq(schema.conversationMembers.conversationId, id),
        eq(schema.conversationMembers.userId, req.user.id)
      )
    });

    if (!member) {
      return res.status(404).json({ error: 'Not a member of this conversation' });
    }

    // Remove user from conversation
    await db.delete(schema.conversationMembers)
      .where(and(
        eq(schema.conversationMembers.conversationId, id),
        eq(schema.conversationMembers.userId, req.user.id)
      ));

    res.json({ message: 'Left conversation successfully' });
  } catch (error) {
    console.error('Leave conversation error:', error);
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
});

export default router;
