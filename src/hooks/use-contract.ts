import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getSigner, waitForTransaction, formatContractError } from '@/lib/ethers-helpers';
import { useChatStore } from '@/store/chat-store';
import { getPublicKeyHex } from '@/lib/crypto';

export interface ContractState {
  isLoading: boolean;
  error: string | null;
}

// Hook for creating user account
export function useCreateAccount() {
  const [state, setState] = useState<ContractState>({ isLoading: false, error: null });
  const { addTransaction, updateTransaction, setUser } = useChatStore();

  const createAccount = async (username: string): Promise<boolean> => {
    setState({ isLoading: true, error: null });

    try {
      const signer = getSigner();
      const contract = getContract(signer);
      const userAddress = await signer.getAddress();
      
      // Get or create encryption key
      const publicKeyHex = getPublicKeyHex();
      
      // Convert hex public key to bytes32
      const publicKeyBytes32 = publicKeyHex;
      
      // Estimate gas
      const gasEstimate = await contract.estimateGas.createAccount(username, publicKeyBytes32);
      const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
      
      // Send transaction
      const tx = await contract.createAccount(username, publicKeyBytes32, { gasLimit });
      
      // Track transaction
      addTransaction({
        hash: tx.hash,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Wait for confirmation
      const receipt = await waitForTransaction(tx.hash);
      
      // Update transaction status
      updateTransaction(tx.hash, {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });
      
      if (receipt.status === 1) {
        // Update user state
        setUser({
          address: userAddress,
          username,
          publicKey: publicKeyHex,
          isRegistered: true
        });
        
        setState({ isLoading: false, error: null });
        return true;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (err) {
      const errorMessage = formatContractError(err);
      setState({ isLoading: false, error: errorMessage });
      return false;
    }
  };

  return { ...state, createAccount };
}

// Hook for adding friends
export function useAddFriend() {
  const [state, setState] = useState<ContractState>({ isLoading: false, error: null });
  const { addTransaction, updateTransaction, addFriend } = useChatStore();

  const addFriendToContract = async (friendAddress: string): Promise<boolean> => {
    setState({ isLoading: true, error: null });

    try {
      // Validate address
      if (!ethers.utils.isAddress(friendAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      const signer = getSigner();
      const contract = getContract(signer);
      
      // Check if friend exists and has a username
      const friendUsername = await contract.usernames(friendAddress);
      if (!friendUsername) {
        throw new Error('User not found or not registered');
      }
      
      // Check if already friends
      const userAddress = await signer.getAddress();
      const isFriend = (contract as any).areFriends
        ? await (contract as any).areFriends(userAddress, friendAddress)
        : await (contract as any).isMutualFriend(userAddress, friendAddress);
      if (isFriend) {
        throw new Error('Already friends with this user');
      }
      
      const nameParam = friendUsername || `${friendAddress.slice(0, 6)}...`;
      // Send transaction (new ABI requires name)
      const tx = await (contract as any).addFriend(friendAddress, nameParam);
      
      // Track transaction
      addTransaction({
        hash: tx.hash,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Wait for confirmation
      const receipt = await waitForTransaction(tx.hash);
      
      // Update transaction status
      updateTransaction(tx.hash, {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });
      
      if (receipt.status === 1) {
        // Get friend's public key
        const friendPublicKey = (contract as any).getEncryptionKey
          ? await (contract as any).getEncryptionKey(friendAddress)
          : await contract.x25519PublicKey(friendAddress);
        
        // Add to friends list
        addFriend({
          address: friendAddress,
          username: friendUsername,
          publicKey: friendPublicKey,
          isOnline: false
        });
        
        setState({ isLoading: false, error: null });
        return true;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (err) {
      const errorMessage = formatContractError(err);
      setState({ isLoading: false, error: errorMessage });
      return false;
    }
  };

  return { ...state, addFriend: addFriendToContract };
}

// Hook for setting encryption key
export function useSetEncryptionKey() {
  const [state, setState] = useState<ContractState>({ isLoading: false, error: null });
  const { addTransaction, updateTransaction, setUser } = useChatStore();

  const setEncryptionKey = async (): Promise<boolean> => {
    setState({ isLoading: true, error: null });

    try {
      const signer = getSigner();
      const contract = getContract(signer);
      const userAddress = await signer.getAddress();
      
      // Get current encryption key
      const publicKeyHex = getPublicKeyHex();
      
      // Send transaction
      const tx = await contract.setEncryptionKey(publicKeyHex);
      
      // Track transaction
      addTransaction({
        hash: tx.hash,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Wait for confirmation
      const receipt = await waitForTransaction(tx.hash);
      
      // Update transaction status
      updateTransaction(tx.hash, {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });
      
      if (receipt.status === 1) {
        // Update user state
        const currentUser = useChatStore.getState().user;
        if (currentUser) {
          setUser({
            ...currentUser,
            publicKey: publicKeyHex
          });
        }
        
        setState({ isLoading: false, error: null });
        return true;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (err) {
      const errorMessage = formatContractError(err);
      setState({ isLoading: false, error: errorMessage });
      return false;
    }
  };

  return { ...state, setEncryptionKey };
}

// Hook for reading user info
export function useUserInfo(address: string | null) {
  const [userInfo, setUserInfo] = useState<{
    username: string;
    publicKey: string;
    isRegistered: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setUserInfo(null);
      return;
    }

    const fetchUserInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = getContract();
        
        const [username, publicKey] = await Promise.all([
          contract.usernames(address),
          (contract as any).getEncryptionKey
            ? (contract as any).getEncryptionKey(address)
            : contract.x25519PublicKey(address)
        ]);
        
        const isRegistered = username && publicKey !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        setUserInfo({
          username: username || '',
          publicKey: publicKey || '',
          isRegistered
        });
        
      } catch (err) {
        setError(formatContractError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [address]);

  return { userInfo, isLoading, error };
}

// Hook for checking mutual friendship
export function useMutualFriendship(address1: string | null, address2: string | null) {
  const [isMutualFriend, setIsMutualFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address1 || !address2) {
      setIsMutualFriend(false);
      return;
    }

    const checkMutualFriendship = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = getContract();
        const result = (contract as any).areFriends
          ? await (contract as any).areFriends(address1, address2)
          : await (contract as any).isMutualFriend(address1, address2);
        setIsMutualFriend(result);
      } catch (err) {
        setError(formatContractError(err));
        setIsMutualFriend(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMutualFriendship();
  }, [address1, address2]);

  return { isMutualFriend, isLoading, error };
}
