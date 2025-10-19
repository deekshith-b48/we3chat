import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { siweManager, SIWESession } from './siwe';

export interface SessionData {
  address: string;
  username?: string;
  publicKey?: string;
  isRegistered: boolean;
  lastActivity: number;
  sessionId: string;
  expiresAt: number;
}

export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  refreshThreshold: number; // refresh when this much time is left
  maxSessions: number; // maximum concurrent sessions per user
}

const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 2 * 60 * 60 * 1000, // 2 hours
  maxSessions: 3
};

export class SessionManager {
  private config: SessionConfig;
  private sessions: Map<string, SessionData> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // address -> sessionIds
  private refreshTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   */
  async createSession(
    address: string,
    username?: string,
    publicKey?: string,
    isRegistered = false
  ): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    // Clean up old sessions for this user
    await this.cleanupUserSessions(address);
    
    const sessionData: SessionData = {
      address: address.toLowerCase(),
      username,
      publicKey,
      isRegistered,
      lastActivity: now,
      sessionId,
      expiresAt: now + this.config.sessionTimeout
    };

    // Store session
    this.sessions.set(sessionId, sessionData);
    
    // Track user sessions
    if (!this.userSessions.has(address.toLowerCase())) {
      this.userSessions.set(address.toLowerCase(), new Set());
    }
    this.userSessions.get(address.toLowerCase())!.add(sessionId);

    // Set up auto-refresh
    this.scheduleRefresh(sessionId);

    // Store in localStorage for persistence
    this.persistSession(sessionData);

    console.log(`✅ Created session for ${address}: ${sessionId}`);
    return sessionData;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.persistSession(session);

    return session;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(address: string): SessionData[] {
    const sessionIds = this.userSessions.get(address.toLowerCase());
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.getSession(id))
      .filter((session): session is SessionData => session !== null);
  }

  /**
   * Refresh session (extend expiration)
   */
  async refreshSession(sessionId: string, signer?: ethers.Signer): Promise<SessionData | null> {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    // If signer is provided, re-authenticate with SIWE
    if (signer) {
      try {
        const siweSession = await siweManager.authenticate(signer);
        console.log('✅ Session refreshed with SIWE authentication');
      } catch (error) {
        console.error('❌ SIWE refresh failed:', error);
        // Continue with regular refresh even if SIWE fails
      }
    }

    // Extend session
    const now = Date.now();
    session.expiresAt = now + this.config.sessionTimeout;
    session.lastActivity = now;

    this.sessions.set(sessionId, session);
    this.persistSession(session);
    this.scheduleRefresh(sessionId);

    console.log(`🔄 Refreshed session: ${sessionId}`);
    return session;
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Remove from memory
    this.sessions.delete(sessionId);
    
    // Remove from user sessions
    const userSessions = this.userSessions.get(session.address);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.address);
      }
    }

    // Clear refresh timeout
    const timeout = this.refreshTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.refreshTimeouts.delete(sessionId);
    }

    // Remove from localStorage
    this.removePersistedSession(sessionId);

    console.log(`🗑️ Destroyed session: ${sessionId}`);
  }

  /**
   * Destroy all sessions for a user
   */
  destroyUserSessions(address: string): void {
    const sessionIds = this.userSessions.get(address.toLowerCase());
    if (!sessionIds) {
      return;
    }

    const ids = Array.from(sessionIds);
    ids.forEach(id => this.destroySession(id));

    console.log(`🗑️ Destroyed ${ids.length} sessions for ${address}`);
  }

  /**
   * Check if session needs refresh
   */
  needsRefresh(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const timeUntilExpiry = session.expiresAt - Date.now();
    return timeUntilExpiry <= this.config.refreshThreshold;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeUsers: number;
    sessionsByUser: Record<string, number>;
  } {
    const sessionsByUser: Record<string, number> = {};
    
    for (const [address, sessionIds] of this.userSessions) {
      sessionsByUser[address] = sessionIds.size;
    }

    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      sessionsByUser
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => this.destroySession(sessionId));

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private async cleanupUserSessions(address: string): Promise<void> {
    const sessionIds = this.userSessions.get(address.toLowerCase());
    if (!sessionIds || sessionIds.size < this.config.maxSessions) {
      return;
    }

    // Get sessions sorted by last activity
    const sessions = Array.from(sessionIds)
      .map(id => ({ id, session: this.sessions.get(id) }))
      .filter(({ session }) => session !== null)
      .sort((a, b) => b.session!.lastActivity - a.session!.lastActivity);

    // Remove oldest sessions
    const toRemove = sessions.slice(this.config.maxSessions);
    toRemove.forEach(({ id }) => this.destroySession(id));

    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} old sessions for ${address}`);
    }
  }

  /**
   * Schedule automatic session refresh
   */
  private scheduleRefresh(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.refreshTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate refresh time (refresh when 2 hours left)
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const refreshTime = session.expiresAt - this.config.refreshThreshold;
    const delay = Math.max(0, refreshTime - Date.now());

    const timeout = setTimeout(async () => {
      try {
        await this.refreshSession(sessionId);
        console.log(`🔄 Auto-refreshed session: ${sessionId}`);
      } catch (error) {
        console.error(`❌ Auto-refresh failed for session ${sessionId}:`, error);
        this.destroySession(sessionId);
      }
    }, delay);

    this.refreshTimeouts.set(sessionId, timeout);
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Persist session to localStorage
   */
  private persistSession(session: SessionData): void {
    try {
      const key = `session_${session.sessionId}`;
      localStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Remove persisted session from localStorage
   */
  private removePersistedSession(sessionId: string): void {
    try {
      const key = `session_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove persisted session:', error);
    }
  }

  /**
   * Load sessions from localStorage on startup
   */
  loadPersistedSessions(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('session_'));
      
      for (const key of keys) {
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          
          // Check if session is still valid
          if (Date.now() < session.expiresAt) {
            this.sessions.set(session.sessionId, session);
            
            // Add to user sessions
            if (!this.userSessions.has(session.address)) {
              this.userSessions.set(session.address, new Set());
            }
            this.userSessions.get(session.address)!.add(session.sessionId);
            
            // Schedule refresh
            this.scheduleRefresh(session.sessionId);
          } else {
            // Remove expired session
            localStorage.removeItem(key);
          }
        }
      }
      
      console.log(`📂 Loaded ${this.sessions.size} persisted sessions`);
    } catch (error) {
      console.error('Failed to load persisted sessions:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Utility functions
export function getCurrentSession(): SessionData | null {
  // Try to get session from localStorage
  const keys = Object.keys(localStorage).filter(key => key.startsWith('session_'));
  
  for (const key of keys) {
    const sessionData = localStorage.getItem(key);
    if (sessionData) {
      const session: SessionData = JSON.parse(sessionData);
      if (Date.now() < session.expiresAt) {
        return session;
      }
    }
  }
  
  return null;
}

export function clearAllSessions(): void {
  sessionManager.destroyUserSessions('all'); // This would need to be implemented
  localStorage.clear();
}

// Hook for session management
export function useSessionManager() {
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted sessions on mount
    sessionManager.loadPersistedSessions();
    
    // Get current session
    const session = getCurrentSession();
    setCurrentSession(session);
    setIsLoading(false);
  }, []);

  const createSession = async (
    address: string,
    username?: string,
    publicKey?: string,
    isRegistered = false
  ) => {
    const session = await sessionManager.createSession(address, username, publicKey, isRegistered);
    setCurrentSession(session);
    return session;
  };

  const refreshSession = async (sessionId: string, signer?: ethers.Signer) => {
    const session = await sessionManager.refreshSession(sessionId, signer);
    if (session) {
      setCurrentSession(session);
    }
    return session;
  };

  const destroySession = (sessionId: string) => {
    sessionManager.destroySession(sessionId);
    setCurrentSession(null);
  };

  return {
    currentSession,
    isLoading,
    createSession,
    refreshSession,
    destroySession,
    needsRefresh: (sessionId: string) => sessionManager.needsRefresh(sessionId),
    getStats: () => sessionManager.getStats()
  };
}
