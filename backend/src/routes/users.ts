import { Router } from 'express';
import { User, UserSettings, Friendship } from '../db/schema';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/profile/:address - Get user profile
router.get('/profile/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const user = await User.findOne({ address: address.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return public profile info only
    res.json({
      id: (user._id as any).toString(),
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
      const existingUser = await User.findOne({
        username: username,
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(username && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(publicKey !== undefined && { publicKey }),
        ...(publicKey && { isRegistered: true }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: (updatedUser._id as any).toString(),
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

    let settings = await UserSettings.findOne({ userId: req.user.id });

    // Create default settings if they don't exist
    if (!settings) {
      settings = new UserSettings({
        userId: req.user.id,
      });
      await settings.save();
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

    // Update or create settings
    const updatedSettings = await UserSettings.findOneAndUpdate(
      { userId: req.user.id },
      {
        ...(theme && { theme }),
        ...(notifications !== undefined && { notifications }),
        ...(soundEnabled !== undefined && { soundEnabled }),
        ...(autoConnect !== undefined && { autoConnect }),
        ...(language && { language }),
        ...(privacy && { privacy }),
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

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

    const users = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { address: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .select('_id address username bio avatar isRegistered lastSeen')
    .limit(Math.min(Number(limit), 50));

    const formattedUsers = users.map(user => ({
      id: (user._id as any).toString(),
      address: user.address,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      isRegistered: user.isRegistered,
      lastSeen: user.lastSeen,
    }));

    res.json({ users: formattedUsers });
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
    const friendships = await Friendship.find({
      $and: [
        {
          $or: [
            { requesterId: req.user.id },
            { addresseeId: req.user.id }
          ]
        },
        { status: 'accepted' }
      ]
    })
    .populate('requesterId', '_id address username bio avatar publicKey isRegistered lastSeen')
    .populate('addresseeId', '_id address username bio avatar publicKey isRegistered lastSeen');

    // Extract friend data (the user who is not the current user)
    const friends = friendships.map(friendship => {
      const requester = friendship.requesterId as any;
      const addressee = friendship.addresseeId as any;
      
      const friend = requester._id.toString() === req.user!.id ? addressee : requester;
      
      return {
        id: friend._id.toString(),
        address: friend.address,
        username: friend.username,
        bio: friend.bio,
        avatar: friend.avatar,
        publicKey: friend.publicKey,
        isRegistered: friend.isRegistered,
        lastSeen: friend.lastSeen,
      };
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
    const targetUser = await User.findOne({ address: address.toLowerCase() });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((targetUser._id as any).toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        {
          requesterId: req.user.id,
          addresseeId: (targetUser._id as any).toString()
        },
        {
          requesterId: (targetUser._id as any).toString(),
          addresseeId: req.user.id
        }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({ 
        error: existingFriendship.status === 'accepted' 
          ? 'Already friends' 
          : 'Friend request already sent' 
      });
    }

    // Create friend request
    const friendship = new Friendship({
      requesterId: req.user.id,
      addresseeId: (targetUser._id as any).toString(),
      status: 'pending',
    });
    await friendship.save();

    res.json({ 
      message: 'Friend request sent',
      friendship: {
        id: (friendship._id as any).toString(),
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
    const friendship = await Friendship.findOne({
      _id: friendshipId,
      addresseeId: req.user.id, // Only addressee can accept/reject
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    friendship.status = newStatus;
    friendship.updatedAt = new Date();
    await friendship.save();

    res.json({
      message: `Friend request ${action}ed`,
      friendship: {
        id: (friendship._id as any).toString(),
        status: friendship.status,
        updatedAt: friendship.updatedAt,
      }
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    res.status(500).json({ error: 'Failed to update friend request' });
  }
});

export default router;
