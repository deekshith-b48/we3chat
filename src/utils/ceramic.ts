/**
 * Ceramic Client Configuration
 * 
 * This creates a Ceramic client that works with our runtime configuration
 * and handles DID authentication for decentralized data storage.
 */

import { CeramicClient } from '@ceramicnetwork/http-client';
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking';
import { DIDSession } from 'did-session';
import { getConfig } from './config';

let ceramicClient: CeramicClient | null = null;
let currentSession: DIDSession | null = null;

/**
 * Initialize Ceramic client with runtime configuration
 */
export async function createCeramicClient(): Promise<CeramicClient> {
  if (ceramicClient) {
    return ceramicClient;
  }

  const config = await getConfig();
  
  ceramicClient = new CeramicClient(config.ceramic.nodeUrl, {
    syncInterval: 10000, // Sync every 10 seconds
  });

  console.log('✅ Ceramic client initialized');
  return ceramicClient;
}

/**
 * Get the current Ceramic client
 * Throws an error if client hasn't been initialized
 */
export function getCeramicClient(): CeramicClient {
  if (!ceramicClient) {
    throw new Error('Ceramic client not initialized. Call createCeramicClient() first.');
  }
  return ceramicClient;
}

/**
 * Authenticate with Ceramic using Ethereum wallet
 */
export async function authenticateWithCeramic(): Promise<DIDSession> {
  if (currentSession && currentSession.isExpired === false) {
    return currentSession;
  }

  // Check if MetaMask is available
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    // Ensure Ceramic client is initialized before authentication
    if (!ceramicClient) {
      await createCeramicClient();
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please connect your wallet.');
    }

    const account = accounts[0];
    
    // For now, create a simple mock session
    // In a real implementation, you'd use proper Ceramic authentication
    const mockSession = {
      did: { id: `did:ethr:${account}` },
      isExpired: false
    } as any;

    // Set the session on the Ceramic client
    const client = getCeramicClient();
    client.did = mockSession.did;

    currentSession = mockSession;
    
    console.log('✅ Authenticated with Ceramic:', mockSession.did.id);
    return mockSession;
  } catch (error) {
    console.error('❌ Failed to authenticate with Ceramic:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current DID session
 */
export function getCurrentSession(): DIDSession | null {
  return currentSession;
}

/**
 * Check if user is authenticated with Ceramic
 */
export function isAuthenticated(): boolean {
  return currentSession !== null && currentSession.isExpired === false;
}

/**
 * Sign out from Ceramic
 */
export function signOutFromCeramic(): void {
  currentSession = null;
  if (ceramicClient) {
    (ceramicClient as any).did = undefined;
  }
  console.log('✅ Signed out from Ceramic');
}

/**
 * Get the current user's DID
 */
export function getCurrentDID(): string | null {
  if (currentSession && !currentSession.isExpired) {
    return currentSession.did.id;
  }
  return null;
}

/**
 * Message Stream Schema Definition
 * This defines the structure of message streams stored on Ceramic
 */
export interface MessageStream {
  messages: Array<{
    id: string;
    sender_did: string;
    content: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    metadata?: Record<string, any>;
  }>;
  last_updated: string;
  version: number;
}

/**
 * User Profile Schema Definition
 * This defines the structure of user profile streams stored on Ceramic
 */
export interface UserProfile {
  username: string;
  avatar?: string;
  bio?: string;
  social_links?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  last_updated: string;
  version: number;
}

/**
 * Generate a deterministic stream ID for a chat
 * This ensures all participants can find the same stream for a given chat
 */
export function generateChatStreamId(chatId: string): string {
  // Use a deterministic approach to generate stream ID from chat ID
  // This ensures all participants can find the same stream
  return `chat-${chatId}`;
}

/**
 * Generate a deterministic stream ID for a user profile
 */
export function generateProfileStreamId(did: string): string {
  return `profile-${did}`;
}
