/**
 * Enhanced Web3 Authentication System
 * 
 * Handles wallet connection, SIWE authentication, and user management
 */

import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { mainnet, polygon, polygonAmoy, sepolia } from 'viem/chains';
import { getConfig } from '../utils/config';
import { createWe3ChatContract, User } from './contract';
import React from 'react';

export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  ensName?: string;
  avatar?: string;
}

export interface AuthState {
  isConnected: boolean;
  isAuthenticated: boolean;
  user: User | null;
  wallet: WalletInfo | null;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  contract: any | null;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export class Web3AuthManager {
  private authState: AuthState = {
    isConnected: false,
    isAuthenticated: false,
    user: null,
    wallet: null,
    provider: null,
    signer: null,
    contract: null
  };

  private listeners: ((state: AuthState) => void)[] = [];
  private config = getConfig();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize providers for different networks
    const providers = {
      mainnet: createPublicClient({
        chain: mainnet,
        transport: http(this.config.blockchain.rpcUrl)
      }),
      polygon: createPublicClient({
        chain: polygon,
        transport: http(this.config.blockchain.rpcUrl)
      }),
      polygonAmoy: createPublicClient({
        chain: polygonAmoy,
        transport: http(this.config.blockchain.rpcUrl)
      }),
      sepolia: createPublicClient({
        chain: sepolia,
        transport: http(this.config.blockchain.rpcUrl)
      })
    };
  }

  // Wallet Connection
  async connectWallet(): Promise<WalletInfo> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      // Get wallet balance
      const balance = await provider.getBalance(address);
      const balanceFormatted = ethers.formatEther(balance);

      // Get ENS name if available
      let ensName: string | undefined;
      let avatar: string | undefined;
      
      try {
        if (network.chainId === 1n) { // Mainnet
          ensName = await provider.lookupAddress(address) || undefined;
          if (ensName) {
            const resolver = await provider.getResolver(ensName);
            if (resolver) {
              avatar = await resolver.getText('avatar') || undefined;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to get ENS name:', error);
      }

      const walletInfo: WalletInfo = {
        address,
        chainId: Number(network.chainId),
        balance: balanceFormatted,
        ensName,
        avatar
      };

      this.authState = {
        ...this.authState,
        isConnected: true,
        wallet: walletInfo,
        provider,
        signer
      };

      this.notifyListeners();
      return walletInfo;

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw this.createAuthError('WALLET_CONNECTION_FAILED', 'Failed to connect wallet', error);
    }
  }

  async switchNetwork(chainId: number): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });

      // Update auth state
      this.authState = {
        ...this.authState,
        wallet: this.authState.wallet ? {
          ...this.authState.wallet,
          chainId
        } : null
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw this.createAuthError('NETWORK_SWITCH_FAILED', 'Failed to switch network', error);
    }
  }

  // SIWE Authentication
  async authenticateWithSIWE(): Promise<boolean> {
    try {
      if (!this.authState.signer) {
        throw new Error('No signer available');
      }

      const address = await this.authState.signer.getAddress();
      const chainId = Number((await this.authState.signer.provider?.getNetwork())?.chainId || 1);

      // Create SIWE message
      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to We3Chat',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: this.generateNonce()
      });

      const message = siweMessage.prepareMessage();
      
      // Sign the message
      const signature = await this.authState.signer.signMessage(message);
      
      // Verify the signature
      const siweMessageParsed = new SiweMessage(message);
      const fields = await siweMessageParsed.verify({ signature });

      if (fields.data.nonce !== siweMessage.nonce) {
        throw new Error('Invalid nonce');
      }

      // Store authentication state
      this.authState = {
        ...this.authState,
        isAuthenticated: true
      };

      // Initialize contract
      await this.initializeContract();

      this.notifyListeners();
      return true;

    } catch (error) {
      console.error('SIWE authentication failed:', error);
      throw this.createAuthError('SIWE_AUTH_FAILED', 'Authentication failed', error);
    }
  }

  // User Registration and Management
  async registerUser(username: string, displayName: string, avatar: string): Promise<void> {
    try {
      if (!this.authState.contract || !this.authState.signer) {
        throw new Error('Not authenticated');
      }

      // Generate encryption key pair
      const keyPair = await this.generateKeyPair();
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes(keyPair.publicKey));

      // Register user on blockchain
      await this.authState.contract.registerUser(username, displayName, avatar, publicKey);

      // Update local state
      const user: User = {
        username,
        displayName,
        avatar,
        publicKey: keyPair.publicKey,
        isRegistered: true,
        registrationTime: Date.now(),
        lastSeen: Date.now(),
        isOnline: true
      };

      this.authState = {
        ...this.authState,
        user
      };

      this.notifyListeners();
    } catch (error) {
      console.error('User registration failed:', error);
      throw this.createAuthError('USER_REGISTRATION_FAILED', 'Failed to register user', error);
    }
  }

  async updateProfile(username: string, displayName: string, avatar: string): Promise<void> {
    try {
      if (!this.authState.contract) {
        throw new Error('Not authenticated');
      }

      await this.authState.contract.updateProfile(username, displayName, avatar);

      // Update local state
      if (this.authState.user) {
        this.authState.user = {
          ...this.authState.user,
          username,
          displayName,
          avatar
        };
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Profile update failed:', error);
      throw this.createAuthError('PROFILE_UPDATE_FAILED', 'Failed to update profile', error);
    }
  }

  async loadUserProfile(): Promise<User | null> {
    try {
      if (!this.authState.contract || !this.authState.wallet) {
        return null;
      }

      const user = await this.authState.contract.getUser(this.authState.wallet.address);
      
      this.authState = {
        ...this.authState,
        user,
        isAuthenticated: user.isRegistered
      };

      this.notifyListeners();
      return user;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  // Contract Initialization
  private async initializeContract(): Promise<void> {
    try {
      if (!this.authState.signer) {
        throw new Error('No signer available');
      }

      const contract = await createWe3ChatContract(this.authState.signer);
      
      this.authState = {
        ...this.authState,
        contract
      };

      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      throw error;
    }
  }

  // Event Listeners
  addAuthListener(listener: (state: AuthState) => void): void {
    this.listeners.push(listener);
  }

  removeAuthListener(listener: (state: AuthState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Utility Methods
  async disconnect(): Promise<void> {
    this.authState = {
      isConnected: false,
      isAuthenticated: false,
      user: null,
      wallet: null,
      provider: null,
      signer: null,
      contract: null
    };

    this.notifyListeners();
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  isConnected(): boolean {
    return this.authState.isConnected;
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getUser(): User | null {
    return this.authState.user;
  }

  getWallet(): WalletInfo | null {
    return this.authState.wallet;
  }

  getContract(): any | null {
    return this.authState.contract;
  }

  // Private Helper Methods
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // This would integrate with your encryption library
    // For now, generate a simple key pair
    const privateKey = ethers.randomBytes(32);
    const publicKey = ethers.keccak256(privateKey);
    
    return {
      publicKey: ethers.hexlify(publicKey),
      privateKey: ethers.hexlify(privateKey)
    };
  }

  private createAuthError(code: string, message: string, details?: any): AuthError {
    return {
      code,
      message,
      details
    };
  }
}

// Singleton instance
let authManager: Web3AuthManager | null = null;

export function getAuthManager(): Web3AuthManager {
  if (!authManager) {
    authManager = new Web3AuthManager();
  }
  return authManager;
}

// React Hook for authentication
export function useWeb3Auth() {
  const [authState, setAuthState] = React.useState<AuthState>({
    isConnected: false,
    isAuthenticated: false,
    user: null,
    wallet: null,
    provider: null,
    signer: null,
    contract: null
  });

  React.useEffect(() => {
    const authManager = getAuthManager();
    
    const handleAuthChange = (state: AuthState) => {
      setAuthState(state);
    };

    authManager.addAuthListener(handleAuthChange);

    return () => {
      authManager.removeAuthListener(handleAuthChange);
    };
  }, []);

  return {
    ...authState,
    connectWallet: () => authManager?.connectWallet(),
    authenticateWithSIWE: () => authManager?.authenticateWithSIWE(),
    registerUser: (username: string, displayName: string, avatar: string) => 
      authManager?.registerUser(username, displayName, avatar),
    updateProfile: (username: string, displayName: string, avatar: string) => 
      authManager?.updateProfile(username, displayName, avatar),
    loadUserProfile: () => authManager?.loadUserProfile(),
    disconnect: () => authManager?.disconnect(),
    switchNetwork: (chainId: number) => authManager?.switchNetwork(chainId)
  };
}
