import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { useChatStore } from '@/store/chat-store';
import { getOrCreateX25519, getPublicKeyHex, clearStoredKeyPair } from '@/lib/crypto';
import { getContract, getSigner } from '@/lib/ethers-helpers';

export interface WalletState {
  isConnected: boolean;
  address: string | undefined;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  chainId: number | undefined;
  connect: () => void;
  disconnect: () => void;
  switchNetwork: () => void;
  error: string | null;
}

export function useWallet(): WalletState {
  const { address, isConnected: wagmiConnected } = useAccount();
  const { connect: wagmiConnect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  
  const [error, setError] = useState<string | null>(null);
  
  const {
    setConnected,
    setAddress,
    setCorrectNetwork,
    setKeys,
    clearKeys,
    setUser,
    reset
  } = useChatStore();

  const isCorrectNetwork = chain?.id === 80002; // Polygon Amoy

  // Update store when wallet state changes
  useEffect(() => {
    setConnected(wagmiConnected);
    setAddress(address || null);
    setCorrectNetwork(isCorrectNetwork);
    
    if (wagmiConnected && address) {
      initializeUser();
    } else {
      clearUserData();
    }
  }, [wagmiConnected, address, isCorrectNetwork]);

  const initializeUser = async () => {
    if (!address) return;

    try {
      setError(null);
      
      // Initialize or retrieve encryption keys
      const { publicKey, secretKey } = getOrCreateX25519();
      const publicKeyHex = getPublicKeyHex();
      setKeys(publicKeyHex, secretKey);
      
      // Fetch user data from contract
      await fetchUserData(address);
      
    } catch (err) {
      console.error('Error initializing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user');
    }
  };

  const fetchUserData = async (userAddress: string) => {
    try {
      const contract = getContract();
      
      // Fetch username and public key from contract
      const [username, onChainPublicKey] = await Promise.all([
        contract.usernames(userAddress),
        contract.x25519PublicKey(userAddress)
      ]);
      
      const isRegistered = username && onChainPublicKey !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      setUser({
        address: userAddress,
        username: username || '',
        publicKey: onChainPublicKey || '',
        isRegistered
      });
      
      // If user is registered, fetch friends
      if (isRegistered) {
        await fetchFriends(userAddress);
      }
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      // User might not be registered yet, which is fine
      setUser({
        address: userAddress,
        username: '',
        publicKey: '',
        isRegistered: false
      });
    }
  };

  const fetchFriends = async (userAddress: string) => {
    try {
      const contract = getContract();
      const friendAddresses = await contract.getFriends(userAddress);
      
      // Fetch details for each friend
      const friends = await Promise.all(
        friendAddresses.map(async (friendAddress: string) => {
          const [username, publicKey] = await Promise.all([
            contract.usernames(friendAddress),
            contract.x25519PublicKey(friendAddress)
          ]);
          
          return {
            address: friendAddress,
            username: username || friendAddress.slice(0, 8) + '...',
            publicKey: publicKey || '',
            isOnline: false // We'll implement presence later
          };
        })
      );
      
      useChatStore.getState().setFriends(friends);
      
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const clearUserData = () => {
    clearKeys();
    setUser(null);
    useChatStore.getState().setFriends([]);
    useChatStore.getState().clearConversations();
  };

  const connect = async () => {
    try {
      setError(null);
      const connector = connectors[0]; // Use first available connector (MetaMask, etc.)
      if (connector) {
        wagmiConnect({ connector });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const disconnect = async () => {
    try {
      wagmiDisconnect();
      clearStoredKeyPair();
      reset();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      setError(null);
      if (switchNetwork) {
        switchNetwork(80002); // Polygon Amoy
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch network');
    }
  };

  return {
    isConnected: wagmiConnected,
    address,
    isConnecting,
    isCorrectNetwork,
    chainId: chain?.id,
    connect,
    disconnect,
    switchNetwork: handleSwitchNetwork,
    error
  };
}

// Hook for checking if user needs to complete onboarding
export function useUserOnboarding() {
  const user = useChatStore(state => state.user);
  const isConnected = useChatStore(state => state.isConnected);
  
  const needsRegistration = isConnected && user && !user.isRegistered;
  const needsPublicKey = isConnected && user && user.isRegistered && !user.publicKey;
  
  return {
    needsRegistration,
    needsPublicKey,
    isComplete: isConnected && user?.isRegistered && !!user.publicKey
  };
}

// Hook for wallet connection status
export function useWalletStatus() {
  const { isConnected, isCorrectNetwork } = useWallet();
  const user = useChatStore(state => state.user);
  
  if (!isConnected) {
    return { status: 'disconnected', message: 'Connect your wallet to continue' };
  }
  
  if (!isCorrectNetwork) {
    return { status: 'wrong-network', message: 'Switch to Polygon Amoy network' };
  }
  
  if (!user?.isRegistered) {
    return { status: 'not-registered', message: 'Complete account setup' };
  }
  
  if (!user.publicKey) {
    return { status: 'no-key', message: 'Set up encryption key' };
  }
  
  return { status: 'ready', message: 'Ready to chat' };
}
