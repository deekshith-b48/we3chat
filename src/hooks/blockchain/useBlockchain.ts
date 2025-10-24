/**
 * Blockchain Hook
 * 
 * Manages blockchain interactions for the chat application
 */

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { We3ChatContract, Message, Friend, createWe3ChatContract } from '../../lib/contract';
import { useAuth } from '../supabase/useAuth';

export interface BlockchainState {
  contract: We3ChatContract | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  userAddress: string | null;
  isRegistered: boolean;
  friends: Friend[];
  messages: { [friendAddress: string]: Message[] };
}

export interface BlockchainActions {
  connectWallet: () => Promise<void>;
  createAccount: (name: string, publicKey: string) => Promise<void>;
  addFriend: (friendAddress: string, friendName: string) => Promise<void>;
  sendMessage: (friendAddress: string, cidHash: string) => Promise<void>;
  loadFriends: () => Promise<void>;
  loadMessages: (friendAddress: string) => Promise<void>;
  updateUsername: (newName: string) => Promise<void>;
  setEncryptionKey: (publicKey: string) => Promise<void>;
  clearError: () => void;
}

export function useBlockchain(): BlockchainState & BlockchainActions {
  const { user, did } = useAuth();
  const [state, setState] = useState<BlockchainState>({
    contract: null,
    isConnected: false,
    isLoading: false,
    error: null,
    userAddress: null,
    isRegistered: false,
    friends: [],
    messages: {}
  });

  /**
   * Connect to wallet and initialize contract
   */
  const connectWallet = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const userAddress = accounts[0];
      console.log('🔗 Wallet connected:', userAddress);

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const contract = await createWe3ChatContract(signer);
      console.log('📄 Contract instance created');

      // Check if user is registered
      const user = await contract.getUser(userAddress);
      const isRegistered = user.isRegistered;
      console.log('👤 User registered:', isRegistered);

      setState(prev => ({
        ...prev,
        contract,
        isConnected: true,
        userAddress,
        isRegistered,
        isLoading: false,
        error: null
      }));

      // Load friends if registered
      if (isRegistered) {
        await loadFriends();
      }

    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Wallet connection failed',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Create account on blockchain
   */
  const createAccount = useCallback(async (name: string, publicKey: string) => {
    if (!state.contract) {
      throw new Error('Contract not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.contract.registerUser(name, name, '', publicKey);
      console.log('✅ Account created on blockchain');

      setState(prev => ({
        ...prev,
        isRegistered: true,
        isLoading: false
      }));

    } catch (error) {
      console.error('❌ Account creation failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Account creation failed',
        isLoading: false
      }));
      throw error;
    }
  }, [state.contract]);

  /**
   * Add friend
   */
  const addFriend = useCallback(async (friendAddress: string, friendName: string) => {
    if (!state.contract) {
      throw new Error('Contract not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.contract.sendFriendRequest(friendAddress);
      console.log('✅ Friend added:', friendName);

      // Reload friends list
      await loadFriends();

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('❌ Add friend failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Add friend failed',
        isLoading: false
      }));
      throw error;
    }
  }, [state.contract]);

  /**
   * Send message (store CID hash on blockchain)
   */
  const sendMessage = useCallback(async (friendAddress: string, cidHash: string) => {
    if (!state.contract) {
      throw new Error('Contract not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.contract.sendMessage(friendAddress, 'text', cidHash, false);
      console.log('✅ Message sent to blockchain');

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('❌ Send message failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Send message failed',
        isLoading: false
      }));
      throw error;
    }
  }, [state.contract]);

  /**
   * Load friends from blockchain
   */
  const loadFriends = useCallback(async () => {
    if (!state.contract) {
      return;
    }

    try {
      const friends = await state.contract.getFriends(state.userAddress!);
      console.log('👥 Friends loaded:', friends.length);

      setState(prev => ({
        ...prev,
        friends
      }));

    } catch (error) {
      console.error('❌ Load friends failed:', error);
    }
  }, [state.contract]);

  /**
   * Load messages for a specific friend
   */
  const loadMessages = useCallback(async (friendAddress: string) => {
    if (!state.contract) {
      return;
    }

    try {
      const messages = await state.contract.getMessages(state.userAddress!, friendAddress);
      console.log('💬 Messages loaded for', friendAddress, ':', messages.length);

      // Convert message IDs to Message objects
      const messageObjects: Message[] = [];
      for (const messageId of messages) {
        try {
          const message = await state.contract.getMessage(messageId);
          messageObjects.push(message);
        } catch (error) {
          console.error('Failed to load message:', messageId, error);
        }
      }

      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [friendAddress]: messageObjects
        }
      }));

    } catch (error) {
      console.error('❌ Load messages failed:', error);
    }
  }, [state.contract]);

  /**
   * Update username
   */
  const updateUsername = useCallback(async (newName: string) => {
    if (!state.contract) {
      throw new Error('Contract not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.contract.updateProfile(newName, newName, '');
      console.log('✅ Username updated');

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('❌ Update username failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update username failed',
        isLoading: false
      }));
      throw error;
    }
  }, [state.contract]);

  /**
   * Set encryption key
   */
  const setEncryptionKey = useCallback(async (publicKey: string) => {
    if (!state.contract) {
      throw new Error('Contract not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await state.contract.updatePublicKey(publicKey);
      console.log('✅ Encryption key set');

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('❌ Set encryption key failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Set encryption key failed',
        isLoading: false
      }));
      throw error;
    }
  }, [state.contract]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-connect wallet when user is authenticated
  useEffect(() => {
    if (user && did && !state.isConnected) {
      connectWallet();
    }
  }, [user, did, state.isConnected, connectWallet]);

  return {
    ...state,
    connectWallet,
    createAccount,
    addFriend,
    sendMessage,
    loadFriends,
    loadMessages,
    updateUsername,
    setEncryptionKey,
    clearError
  };
}
