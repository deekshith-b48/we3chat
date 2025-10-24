import { Router } from 'express';
import { z } from 'zod';
import { createNonce, consumeNonce, verifySiweSignature, getSiweMessage } from '../siwe.js';
import { signAppJWT } from '../jwt.js';

export const basicAuthRouter = Router();

// In-memory storage for demo purposes
const users = new Map<string, any>();
const sessions = new Map<string, any>();

// Validation schemas
const emailSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(1, 'Username is required').optional()
});

const emailLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const siweVerifySchema = z.object({
  address: z.string().min(42, 'Invalid wallet address'),
  nonce: z.string().min(8, 'Invalid nonce'),
  signature: z.string().min(10, 'Invalid signature'),
  username: z.string().min(1, 'Username is required').optional()
});

/**
 * Email signup
 * POST /auth/email/signup
 */
basicAuthRouter.post('/email/signup', async (req, res) => {
  try {
    const body = emailSignupSchema.parse(req.body);
    
    // Check if user already exists
    if (users.has(body.email)) {
      return res.status(400).json({ 
        error: 'User already exists', 
        message: 'A user with this email already exists'
      });
    }
    
    // Create user
    const user = {
      id: `user_${Date.now()}`,
      email: body.email,
      password: body.password, // In production, hash this!
      username: body.username || body.email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    
    users.set(body.email, user);
    
    console.log(`✅ User signed up with email: ${body.email}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
    
  } catch (error) {
    console.error('Email signup error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: 'Signup failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Email login
 * POST /auth/email/login
 */
basicAuthRouter.post('/email/login', async (req, res) => {
  try {
    const body = emailLoginSchema.parse(req.body);
    
    // Find user
    const user = users.get(body.email);
    if (!user || user.password !== body.password) {
      return res.status(401).json({ 
        error: 'Login failed', 
        message: 'Invalid email or password'
      });
    }
    
    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      sessionType: 'email',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    sessions.set(sessionId, session);
    
    // Set HTTP-only cookie
    res.cookie('we3_session', sessionId, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    console.log(`✅ User logged in with email: ${body.email}`);
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id,
        email: user.email,
        username: user.username,
        sessionType: 'email'
      }
    });
    
  } catch (error) {
    console.error('Email login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: 'Login failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Email logout
 * POST /auth/email/logout
 */
basicAuthRouter.post('/email/logout', async (req, res) => {
  try {
    const sessionId = req.cookies['we3_session'];
    
    if (sessionId) {
      sessions.delete(sessionId);
    }
    
    // Clear cookie
    res.clearCookie('we3_session', { path: '/' });
    
    console.log('✅ User logged out');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * SIWE nonce generation
 * GET /auth/siwe/nonce?address=0x...
 */
basicAuthRouter.get('/siwe/nonce', async (req, res) => {
  try {
    const address = req.query.address as string;
    
    if (!address) {
      return res.status(400).json({ 
        error: 'Address required',
        message: 'Wallet address is required as query parameter'
      });
    }
    
    const nonce = createNonce(address);
    const message = getSiweMessage(address, nonce);
    
    console.log(`✅ Generated SIWE nonce for address: ${address}`);
    
    res.json({ 
      success: true,
      nonce, 
      message,
      address 
    });
    
  } catch (error) {
    console.error('SIWE nonce generation error:', error);
    res.status(500).json({ 
      error: 'Nonce generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * SIWE signature verification
 * POST /auth/siwe/verify
 */
basicAuthRouter.post('/siwe/verify', async (req, res) => {
  try {
    const body = siweVerifySchema.parse(req.body);
    
    // Verify nonce
    if (!consumeNonce(body.address, body.nonce)) {
      return res.status(400).json({ 
        error: 'Invalid nonce',
        message: 'Nonce is invalid or expired'
      });
    }
    
    // Verify signature
    const isValidSignature = await verifySiweSignature(
      body.address, 
      body.nonce, 
      body.signature
    );
    
    if (!isValidSignature) {
      return res.status(401).json({ 
        error: 'Invalid signature',
        message: 'Signature verification failed'
      });
    }
    
    // Create or find user
    let user = users.get(body.address);
    if (!user) {
      user = {
        id: `wallet_${Date.now()}`,
        wallet: body.address,
        username: body.username || `${body.address.slice(0, 6)}...${body.address.slice(-4)}`,
        createdAt: new Date().toISOString()
      };
      users.set(body.address, user);
    }
    
    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      userId: user.id,
      wallet: body.address,
      sessionType: 'siwe',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    sessions.set(sessionId, session);
    
    // Set HTTP-only cookie
    res.cookie('we3_session', sessionId, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    console.log(`✅ User authenticated with wallet: ${body.address}`);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        wallet: body.address,
        username: user.username,
        sessionType: 'siwe'
      }
    });
    
  } catch (error) {
    console.error('SIWE verification error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: 'Verification failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current user info
 * GET /auth/me
 */
basicAuthRouter.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies['we3_session'];
    
    if (!sessionId) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'No valid session found'
      });
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ 
        error: 'Invalid session',
        message: 'Session not found or expired'
      });
    }
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      sessions.delete(sessionId);
      res.clearCookie('we3_session', { path: '/' });
      return res.status(401).json({ 
        error: 'Session expired',
        message: 'Please log in again'
      });
    }
    
    // Find user
    let user;
    if (session.email) {
      user = users.get(session.email);
    } else if (session.wallet) {
      user = users.get(session.wallet);
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User associated with session not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || null,
        wallet: user.wallet || null,
        username: user.username,
        sessionType: session.sessionType
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check
 * GET /auth/health
 */
basicAuthRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Basic auth service is running',
    timestamp: new Date().toISOString(),
    users: users.size,
    sessions: sessions.size
  });
});
