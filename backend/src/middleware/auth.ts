import { Request, Response, NextFunction } from 'express';
import { verifyAppJWT, type JWTPayload } from '../jwt.js';
import { supabaseAdmin } from '../services/supabase.js';
import { getProfileByWallet, getProfileByEmail } from '../services/profiles.js';

export interface AuthenticatedUser {
  id?: string;
  email?: string;
  wallet?: string;
  profileId?: string;
  sessionType?: 'email' | 'wallet' | 'siwe';
  profile?: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Optional authentication middleware
 * Sets req.user if valid token is found, but doesn't require authentication
 */
export async function authOptional(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    req.user = user;
  } catch (error) {
    // Silently ignore auth errors in optional middleware
    console.debug('Auth optional failed:', error);
  }
  next();
}

/**
 * Required authentication middleware
 * Returns 401 if no valid authentication is found
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    
    if (!user || (!user.email && !user.wallet)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Valid authentication required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth required failed:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
  }
}

/**
 * Require wallet authentication specifically
 */
export async function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    
    if (!user || !user.wallet) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Wallet authentication required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Wallet auth required failed:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid wallet authentication required'
    });
  }
}

/**
 * Require email authentication specifically
 */
export async function requireEmailAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await extractUserFromRequest(req);
    
    if (!user || !user.email) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Email authentication required'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Email auth required failed:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid email authentication required'
    });
  }
}

/**
 * Extract user information from request headers and cookies
 */
async function extractUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  // Try to get token from Authorization header or cookies
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const cookieToken = (req.cookies['we3_session'] as string) || '';
  const supabaseToken = (req.cookies['sb-access-token'] as string) || '';
  
  const token = bearer || cookieToken;
  
  // Try our app JWT first (SIWE/wallet auth)
  if (token) {
    try {
      const payload = await verifyAppJWT(token);
      
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }
      
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        wallet: payload.wallet,
        profileId: payload.profileId,
        sessionType: payload.sessionType
      };
      
      // Load profile if we have an ID
      if (payload.profileId) {
        try {
          if (payload.wallet) {
            user.profile = await getProfileByWallet(payload.wallet);
          } else if (payload.email) {
            user.profile = await getProfileByEmail(payload.email);
          }
        } catch (error) {
          console.warn('Failed to load user profile:', error);
        }
      }
      
      return user;
    } catch (error) {
      console.debug('App JWT verification failed:', error);
    }
  }
  
  // Try Supabase token (email auth)
  if (supabaseToken) {
    try {
      // Verify Supabase token by making a request to Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);
      
      if (error || !user) {
        throw new Error('Invalid Supabase token');
      }
      
      const userProfile: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        sessionType: 'email'
      };
      
      // Load profile
      if (user.email) {
        try {
          userProfile.profile = await getProfileByEmail(user.email);
        } catch (error) {
          console.warn('Failed to load user profile:', error);
        }
      }
      
      return userProfile;
    } catch (error) {
      console.debug('Supabase token verification failed:', error);
    }
  }
  
  return null;
}

/**
 * Middleware to log authentication attempts
 */
export function authLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user;
    const authType = user?.sessionType || 'none';
    const userId = user?.id || user?.wallet || user?.email || 'anonymous';
    
    console.log(`[AUTH] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${authType}:${userId}`);
  });
  
  next();
}