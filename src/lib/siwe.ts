import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';

export interface SIWEConfig {
  domain: string;
  origin: string;
  statement?: string;
  version?: string;
  chainId?: number;
}

export interface SIWESession {
  message: string;
  signature: string;
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

// Default SIWE configuration
const DEFAULT_CONFIG: SIWEConfig = {
  domain: typeof window !== 'undefined' ? window.location.host : 'localhost',
  origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  statement: 'Sign in with Ethereum to We3Chat',
  version: '1',
  chainId: 80002, // Polygon Amoy
};

export class SIWEManager {
  private config: SIWEConfig;
  private nonce: string | null = null;

  constructor(config: Partial<SIWEConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a new nonce for SIWE authentication
   */
  async generateNonce(): Promise<string> {
    try {
      // In production, this should be fetched from your backend
      // For now, we'll generate a random nonce
      const response = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.nonce = data.nonce;
        return data.nonce;
      } else {
        // Fallback to local nonce generation
        this.nonce = this.generateRandomNonce();
        return this.nonce;
      }
    } catch (error) {
      console.warn('Failed to fetch nonce from backend, using local generation:', error);
      this.nonce = this.generateRandomNonce();
      return this.nonce;
    }
  }

  /**
   * Create a SIWE message for signing
   */
  async createMessage(address: string): Promise<SiweMessage> {
    if (!this.nonce) {
      await this.generateNonce();
    }

    const message = new SiweMessage({
      domain: this.config.domain,
      address,
      statement: this.config.statement,
      uri: this.config.origin,
      version: this.config.version,
      chainId: this.config.chainId,
      nonce: this.nonce!,
      issuedAt: new Date().toISOString(),
    });

    return message;
  }

  /**
   * Sign a SIWE message with the user's wallet
   */
  async signMessage(message: SiweMessage, signer: ethers.Signer): Promise<string> {
    try {
      const messageToSign = message.prepareMessage();
      const signature = await signer.signMessage(messageToSign);
      return signature;
    } catch (error) {
      console.error('Error signing SIWE message:', error);
      throw new Error('Failed to sign message');
    }
  }

  /**
   * Verify a SIWE message and signature
   */
  async verifyMessage(message: string, signature: string): Promise<SiweMessage> {
    try {
      const siweMessage = new SiweMessage(message);
      
      // Verify the message
      const result = await siweMessage.verify({
        signature,
        domain: this.config.domain,
        nonce: this.nonce || undefined,
      });

      if (!result.success) {
        throw new Error(`SIWE verification failed: ${result.error?.type}`);
      }

      return siweMessage;
    } catch (error) {
      console.error('Error verifying SIWE message:', error);
      throw new Error('Failed to verify message');
    }
  }

  /**
   * Complete SIWE authentication flow
   */
  async authenticate(signer: ethers.Signer): Promise<SIWESession> {
    try {
      const address = await signer.getAddress();
      
      // Create message
      const message = await this.createMessage(address);
      
      // Sign message
      const signature = await this.signMessage(message, signer);
      
      // Verify message
      const verifiedMessage = await this.verifyMessage(message.prepareMessage(), signature);
      
      // Create session
      const session: SIWESession = {
        message: message.prepareMessage(),
        signature,
        address: verifiedMessage.address,
        nonce: verifiedMessage.nonce,
        issuedAt: verifiedMessage.issuedAt || new Date().toISOString(),
        expirationTime: verifiedMessage.expirationTime,
      };

      // Store session securely
      await this.storeSession(session);
      
      return session;
    } catch (error) {
      console.error('SIWE authentication failed:', error);
      throw error;
    }
  }

  /**
   * Store SIWE session securely
   */
  private async storeSession(session: SIWESession): Promise<void> {
    try {
      // Store in sessionStorage (cleared when tab closes)
      sessionStorage.setItem('siwe_session', JSON.stringify(session));
      
      // Also send to backend for server-side verification
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        throw new Error('Failed to verify session with backend');
      }

      const { token } = await response.json();
      
      // Store auth token
      sessionStorage.setItem('auth_token', token);
      
    } catch (error) {
      console.error('Error storing SIWE session:', error);
      throw error;
    }
  }

  /**
   * Get current SIWE session
   */
  getSession(): SIWESession | null {
    try {
      const sessionData = sessionStorage.getItem('siwe_session');
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData) as SIWESession;
      
      // Check if session is expired
      if (session.expirationTime && new Date(session.expirationTime) < new Date()) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error getting SIWE session:', error);
      return null;
    }
  }

  /**
   * Clear SIWE session
   */
  clearSession(): void {
    sessionStorage.removeItem('siwe_session');
    sessionStorage.removeItem('auth_token');
    this.nonce = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const session = this.getSession();
    return session !== null;
  }

  /**
   * Generate a random nonce (fallback)
   */
  private generateRandomNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Refresh session (generate new nonce and re-authenticate)
   */
  async refreshSession(signer: ethers.Signer): Promise<SIWESession> {
    this.clearSession();
    this.nonce = null;
    return await this.authenticate(signer);
  }
}

// Export singleton instance
export const siweManager = new SIWEManager();

// Utility functions
export async function signInWithEthereum(signer: ethers.Signer): Promise<SIWESession> {
  return await siweManager.authenticate(signer);
}

export function getCurrentSession(): SIWESession | null {
  return siweManager.getSession();
}

export function isSIWEAuthenticated(): boolean {
  return siweManager.isAuthenticated();
}

export function signOut(): void {
  siweManager.clearSession();
}

// Hook for SIWE authentication
export function useSIWE() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SIWESession | null>(null);

  useEffect(() => {
    const currentSession = getCurrentSession();
    setSession(currentSession);
  }, []);

  const authenticate = async (signer: ethers.Signer) => {
    setIsLoading(true);
    setError(null);

    try {
      const newSession = await signInWithEthereum(signer);
      setSession(newSession);
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    signOut();
    setSession(null);
    setError(null);
  };

  return {
    session,
    isAuthenticated: !!session,
    isLoading,
    error,
    authenticate,
    logout,
  };
}
