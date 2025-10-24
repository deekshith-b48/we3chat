import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useState, useCallback } from 'react';
import { CHAT_ABI, CHAT_CONTRACT_ADDRESS } from '../../lib/chatContract';
import { polygonAmoyChain, config } from '../../lib/wagmi';
import { getOrCreateX25519, pubkeyToBytes32, encryptMessage } from '../../lib/crypto';
import { uploadEncryptedMessage, createCIDHash } from '../../lib/ipfs';

// Hook for blockchain chat operations
export function useBlockchainChat() {
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create user account on blockchain
  const createAccount = useCallback(async (username: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const keyPair = getOrCreateX25519();
      const publicKeyBytes32 = pubkeyToBytes32(keyPair.publicKey);

      await writeContract({
        address: CHAT_CONTRACT_ADDRESS,
        abi: CHAT_ABI,
        functionName: 'createAccount',
        args: [username, publicKeyBytes32],
        chainId: polygonAmoyChain.id
      });

      console.log('Account created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContract]);

  // Add a friend
  const addFriend = useCallback(async (friendAddress: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContract({
        address: CHAT_CONTRACT_ADDRESS,
        abi: CHAT_ABI,
        functionName: 'addFriend',
        args: [friendAddress],
        chainId: polygonAmoyChain.id
      });

      console.log('Friend added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add friend';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContract]);

  // Send encrypted message
  const sendMessage = useCallback(async (friendAddress: string, message: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get friend's public key from contract
      const friendPublicKey = await readContract(config, {
        address: CHAT_CONTRACT_ADDRESS,
        abi: CHAT_ABI,
        functionName: 'x25519PublicKey',
        args: [friendAddress],
        chainId: polygonAmoyChain.id
      }) as string;

      if (!friendPublicKey || friendPublicKey === '0x' + '0'.repeat(64)) {
        throw new Error('Friend not found or has no public key');
      }

      // Encrypt message
      const keyPair = getOrCreateX25519();
      // Convert bytes32 to Uint8Array
      const friendPubKeyBytes = new Uint8Array(Buffer.from(friendPublicKey.slice(2), 'hex'));
      const encryptedData = await encryptMessage(message, keyPair.secretKey, friendPubKeyBytes);

      // Upload to IPFS
      const cid = await uploadEncryptedMessage(encryptedData);
      const cidHash = createCIDHash(cid);

      // Store on blockchain
      await writeContract({
        address: CHAT_CONTRACT_ADDRESS,
        abi: CHAT_ABI,
        functionName: 'sendMessage',
        args: [friendAddress, cidHash, cid],
        chainId: polygonAmoyChain.id
      });

      console.log('Message sent successfully:', { cid, cidHash });
      return { cid, cidHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContract]);

  return {
    address,
    isConnected,
    isLoading,
    error,
    createAccount,
    addFriend,
    sendMessage
  };
}

// Hook to read user data from blockchain
export function useUserProfile(userAddress?: string) {
  const targetAddress = userAddress;

  const { data: username } = useReadContract({
    address: CHAT_CONTRACT_ADDRESS,
    abi: CHAT_ABI,
    functionName: 'username',
    args: targetAddress ? [targetAddress] : undefined,
    chainId: polygonAmoyChain.id,
    query: {
      enabled: !!targetAddress
    }
  });

  const { data: publicKey } = useReadContract({
    address: CHAT_CONTRACT_ADDRESS,
    abi: CHAT_ABI,
    functionName: 'x25519PublicKey',
    args: targetAddress ? [targetAddress] : undefined,
    chainId: polygonAmoyChain.id,
    query: {
      enabled: !!targetAddress
    }
  });

  return {
    username: username as string,
    publicKey: publicKey as string,
    hasProfile: !!(username && publicKey && publicKey !== '0x' + '0'.repeat(64))
  };
}

// Hook to get user's friends list
export function useFriendsList(userAddress?: string) {
  const { data: friends, isLoading, error } = useReadContract({
    address: CHAT_CONTRACT_ADDRESS,
    abi: CHAT_ABI,
    functionName: 'getFriends',
    args: userAddress ? [userAddress] : undefined,
    chainId: polygonAmoyChain.id,
    query: {
      enabled: !!userAddress
    }
  });

  return {
    friends: (friends as string[]) || [],
    isLoading,
    error
  };
}

// Hook to read messages with a specific user
export function useMessages(otherUserAddress?: string) {
  const { data: messages, isLoading, error } = useReadContract({
    address: CHAT_CONTRACT_ADDRESS,
    abi: CHAT_ABI,
    functionName: 'readMessage',
    args: otherUserAddress ? [otherUserAddress] : undefined,
    chainId: polygonAmoyChain.id,
    query: {
      enabled: !!otherUserAddress
    }
  });

  return {
    messages: (messages as Array<{ sender: string; receiver: string; timestamp: bigint; cidHash: string }>) || [],
    isLoading,
    error
  };
}

// Helper hook for transaction status
export function useTransactionStatus(hash?: string) {
  const { data, isLoading, error } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}` | undefined,
    chainId: polygonAmoyChain.id,
    query: {
      enabled: !!hash
    }
  });

  return {
    receipt: data,
    isLoading,
    error,
    isSuccess: !!data && data.status === 'success'
  };
}
