import { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useChatStore } from '@/store/chat-store';
import { getOrCreateX25519, getPublicKeyHex, clearStoredKeyPair } from '@/lib/crypto';
import { getContract } from '@/lib/ethers-helpers';
import { CHAT_ADDRESS } from '@/lib/contract';

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
  const [isConnecting] = useState(false);
  const { disconnect: wagmiDisconnect } = useDisconnect();
  // Note: useNetwork is deprecated in newer wagmi versions
  // We'll use useAccount to get chain information instead
  const { chain } = useAccount();
  // Note: useSwitchNetwork is deprecated in newer wagmi versions
  // We'll implement a custom switch function
  const switchNetwork = () => {
    // Custom network switching logic
    console.log('Switching network to Polygon Amoy');
  };
  
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
      const { secretKey } = getOrCreateX25519();
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
    // If contract address is a placeholder or missing, treat as unregistered and skip on-chain calls
    const isPlaceholder = /^0x1234567890123456789012345678901234567890$/i.test(CHAT_ADDRESS);
    if (isPlaceholder) {
      setUser({ address: userAddress, username: '', publicKey: '', isRegistered: false });
      return;
    }

    try {
      const contract = getContract();

      // Fetch username safely
      let username: string = '';
      try {
        username = await contract.usernames(userAddress);
      } catch (e) {
        // Ignore CALL_EXCEPTION and treat as empty username
        username = '';
      }

      // Fetch public key safely
      let onChainPublicKey: string = '';
      try {
        if ((contract as any).getEncryptionKey) {
          onChainPublicKey = await (contract as any).getEncryptionKey(userAddress);
        } else {
          onChainPublicKey = await contract.x25519PublicKey(userAddress);
        }
      } catch (e) {
        onChainPublicKey = '0x';
      }

      const zeroKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const isRegistered = !!username && !!onChainPublicKey && onChainPublicKey !== zeroKey;

      setUser({
        address: userAddress,
        username,
        publicKey: onChainPublicKey || '',
        isRegistered,
      });

      if (isRegistered) {
        await fetchFriends(userAddress);
      }
    } catch (err) {
      // Failsafe: don't spam console with contract errors; degrade gracefully
      setUser({ address: userAddress, username: '', publicKey: '', isRegistered: false });
    }
  };

  const fetchFriends = async (_userAddress: string) => {
    try {
      const contract = getContract();
      let friendList: Array<{ friendAddress: string; name: string; addedAt: string | number }>;
      try {
        friendList = await (contract as any).getFriends();
      } catch (e) {
        friendList = [] as any;
      }

      const friends = await Promise.all(
        (friendList || []).map(async (f: any) => {
          const friendAddress: string = f.friendAddress || f[0];
          const name: string = f.name || f[1] || '';
          let publicKey = '';
          try {
            if ((contract as any).getEncryptionKey) {
              publicKey = await (contract as any).getEncryptionKey(friendAddress);
            } else {
              publicKey = await contract.x25519PublicKey(friendAddress);
            }
          } catch {}

          return {
            address: friendAddress,
            username: name || friendAddress.slice(0, 8) + '...',
            publicKey: publicKey || '',
            isOnline: false,
          };
        })
      );

      useChatStore.getState().setFriends(friends);
    } catch {}
  };

  const clearUserData = () => {
    clearKeys();
    setUser(null);
    useChatStore.getState().setFriends([]);
    useChatStore.getState().clearConversations();
  };

  const connect = async () => {
    // Note: Connection is handled by RainbowKit ConnectButton to prevent conflicts
    // This function is kept for interface compatibility but does nothing
    setError(null);
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
        switchNetwork(); // Polygon Amoy
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
