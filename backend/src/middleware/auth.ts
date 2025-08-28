import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SiweMessage } from 'siwe';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    address: string;
    username?: string;
  };
}

// Generate nonce for SIWE authentication
export async function generateNonce(req: Request, res: Response) {
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Store nonce temporarily (you might want to use Redis for this in production)
  req.session = { ...req.session, nonce };
  
  res.json({ nonce });
}

// Verify SIWE message and issue JWT
export async function verifyMessage(req: Request, res: Response) {
  try {
    const { message, signature } = req.body;
    
    if (!message || !signature) {
      return res.status(400).json({ error: 'Missing message or signature' });
    }

    // Parse SIWE message
    const siweMessage = new SiweMessage(message);
    
    // Verify the signature
    const result = await siweMessage.verify({ signature });
    
    if (!result.success) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if nonce matches (if using session-based nonce)
    if (req.session?.nonce && siweMessage.nonce !== req.session.nonce) {
      return res.status(401).json({ error: 'Invalid nonce' });
    }

    const address = siweMessage.address.toLowerCase();

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.address, address)
    });

    if (!user) {
      // Create new user
      const [newUser] = await db.insert(schema.users)
        .values({
          address,
          nonce: siweMessage.nonce,
          lastSeen: new Date(),
        })
        .returning();
      user = newUser;
    } else {
      // Update last seen
      await db.update(schema.users)
        .set({ 
          lastSeen: new Date(),
          nonce: siweMessage.nonce 
        })
        .where(eq(schema.users.id, user.id));
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        address: user.address,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(schema.sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Clear session nonce
    if (req.session) {
      delete req.session.nonce;
    }

    res.json({
      token,
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        isRegistered: user.isRegistered,
        publicKey: user.publicKey,
      }
    });

  } catch (error) {
    console.error('SIWE verification error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// JWT verification middleware
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if session exists and is valid
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
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user to request
    req.user = {
      id: session.user.id,
      address: session.user.address,
      username: session.user.username || undefined,
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(schema.sessions.token, token),
        eq(schema.sessions.userId, decoded.userId)
      ),
      with: {
        user: true
      }
    });

    if (session && session.expiresAt >= new Date()) {
      req.user = {
        id: session.user.id,
        address: session.user.address,
        username: session.user.username || undefined,
      };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
}

// Logout endpoint
export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Remove session from database
      await db.delete(schema.sessions)
        .where(eq(schema.sessions.token, token));
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

// Middleware to check if user is registered on-chain
export async function requireRegistration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, req.user.id)
  });

  if (!user?.isRegistered) {
    return res.status(403).json({ 
      error: 'User not registered on-chain',
      requiresRegistration: true 
    });
  }

  next();
}
