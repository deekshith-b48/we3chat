import { Router } from 'express';
import { generateNonce, verifyMessage, logout, authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/auth/nonce - Generate nonce for SIWE
router.get('/nonce', generateNonce);

// POST /api/auth/verify - Verify SIWE message and get JWT
router.post('/verify', verifyMessage);

// POST /api/auth/logout - Logout user
router.post('/logout', authenticateToken, logout);

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // You might want to fetch additional user data from database here
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // In a production app, you might want to implement token refresh logic
    // For now, we'll just return the current user info
    res.json({
      message: 'Token is valid',
      user: req.user
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
