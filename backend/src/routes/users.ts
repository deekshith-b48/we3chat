import { Router } from 'express';
import { eq, and, or, ilike } from 'drizzle-orm';
import { db, schema } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/profile/:address - Get user profile
router.get('/profile/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.address, address.toLowerCase()),
      with: {
        settings: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return public profile info only
    res.json({
      id: user.id,
      address: user.address,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      publicKey: user.publicKey,
      isRegistered: user.isRegistered,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { username, bio, avatar, publicKey } = req.body;

    // Validate username if provided
    if (username) {
      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'Username must be 3-50 characters' });
      }

      // Check if username is already taken
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(schema.users.username, username),
          eq(schema.users.id, req.user.id) // Exclude current user
        )
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user profile
    const [updatedUser] = await db.update(schema.users)
      .set({
        username: username || undefined,
        bio: bio || undefined,
        avatar: avatar || undefined,
        publicKey: publicKey || undefined,
        isRegistered: publicKey ? true : undefined, // Mark as registered if public key is set
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, req.user.id))
      .returning();

    res.json({
      id: updatedUser.id,
      address: updatedUser.address,
      username: updatedUser.username,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      publicKey: updatedUser.publicKey,
      isRegistered: updatedUser.isRegistered,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/settings - Get user settings
router.get('/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, req.user.id)
    });

    // Create default settings if they don't exist
    if (!settings) {
      const [newSettings] = await db.insert(schema.userSettings)
        .values({
          userId: req.user.id,
        })
        .returning();
      settings = newSettings;
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/users/settings - Update user settings
router.put('/settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      theme,
      notifications,
      soundEnabled,
      autoConnect,
      language,
      privacy
    } = req.body;

    // Validate settings
    const validThemes = ['light', 'dark', 'system'];
    const validPrivacy = ['public', 'friends', 'private'];

    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme value' });
    }

    if (privacy && !validPrivacy.includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy value' });
    }

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, req.user.id)
    });

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      [updatedSettings] = await db.update(schema.userSettings)
        .set({
          theme: theme || undefined,
          notifications: notifications !== undefined ? notifications : undefined,
          soundEnabled: soundEnabled !== undefined ? soundEnabled : undefined,
          autoConnect: autoConnect !== undefined ? autoConnect : undefined,
          language: language || undefined,
          privacy: privacy || undefined,
          updatedAt: new Date(),
        })
        .where(eq(schema.userSettings.userId, req.user.id))
        .returning();
    } else {
      // Create new settings
      [updatedSettings] = await db.insert(schema.userSettings)
        .values({
          userId: req.user.id,
          theme,
          notifications,
          soundEnabled,
          autoConnect,
          language,
          privacy,
        })
        .returning();
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/users/search - Search users
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = q.trim().toLowerCase();
    
    if (searchTerm.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await db.query.users.findMany({
      where: or(
        ilike(schema.users.username, `%${searchTerm}%`),
        ilike(schema.users.address, `%${searchTerm}%`)
      ),
      limit: Math.min(Number(limit), 50),
      columns: {
        id: true,
        address: true,
        username: true,
        bio: true,
        avatar: true,
        isRegistered: true,
        lastSeen: true,
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/friends - Get user's friends
router.get('/friends', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get accepted friendships where user is either requester or addressee
    const friendships = await db.query.friendships.findMany({
      where: and(
        or(
          eq(schema.friendships.requesterId, req.user.id),
          eq(schema.friendships.addresseeId, req.user.id)
        ),
        eq(schema.friendships.status, 'accepted')
      ),
      with: {
        requester: {
          columns: {
            id: true,
            address: true,
            username: true,
            bio: true,
            avatar: true,
            publicKey: true,
            isRegistered: true,
            lastSeen: true,
          }
        },
        addressee: {
          columns: {
            id: true,
            address: true,
            username: true,
            bio: true,
            avatar: true,
            publicKey: true,
            isRegistered: true,
            lastSeen: true,
          }
        }
      }
    });

    // Extract friend data (the user who is not the current user)
    const friends = friendships.map(friendship => {
      return friendship.requesterId === req.user!.id 
        ? friendship.addressee 
        : friendship.requester;
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// POST /api/users/friends/request - Send friend request
router.post('/friends/request', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    // Find the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.address, address.toLowerCase())
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    // Check if friendship already exists
    const existingFriendship = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(schema.friendships.requesterId, req.user.id),
          eq(schema.friendships.addresseeId, targetUser.id)
        ),
        and(
          eq(schema.friendships.requesterId, targetUser.id),
          eq(schema.friendships.addresseeId, req.user.id)
        )
      )
    });

    if (existingFriendship) {
      return res.status(400).json({ 
        error: existingFriendship.status === 'accepted' 
          ? 'Already friends' 
          : 'Friend request already sent' 
      });
    }

    // Create friend request
    const [friendship] = await db.insert(schema.friendships)
      .values({
        requesterId: req.user.id,
        addresseeId: targetUser.id,
        status: 'pending',
      })
      .returning();

    res.json({ 
      message: 'Friend request sent',
      friendship: {
        id: friendship.id,
        status: friendship.status,
        createdAt: friendship.createdAt,
      }
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/users/friends/:friendshipId - Accept/reject friend request
router.put('/friends/:friendshipId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }

    // Find the friendship request
    const friendship = await db.query.friendships.findFirst({
      where: and(
        eq(schema.friendships.id, friendshipId),
        eq(schema.friendships.addresseeId, req.user.id), // Only addressee can accept/reject
        eq(schema.friendships.status, 'pending')
      )
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    const [updatedFriendship] = await db.update(schema.friendships)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.friendships.id, friendshipId))
      .returning();

    res.json({
      message: `Friend request ${action}ed`,
      friendship: {
        id: updatedFriendship.id,
        status: updatedFriendship.status,
        updatedAt: updatedFriendship.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    res.status(500).json({ error: 'Failed to update friend request' });
  }
});

export default router;
