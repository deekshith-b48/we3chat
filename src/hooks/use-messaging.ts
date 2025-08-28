import { useState, useEffect } from 'react';
import { api, type Message as ApiMessage } from '@/lib/api';
import { useChatStore, generateMessageId, Message } from '@/store/chat-store';
import { useAuth } from '@/hooks/use-auth';
import { useRealTimeMessaging } from '@/hooks/use-real-time';

export interface SendMessageState {
  isLoading: boolean;
  error: string | null;
  progress: 'idle' | 'encrypting' | 'uploading' | 'sending' | 'confirming' | 'complete';
}

// Hook for sending messages via API
export function useSendMessage() {
  const [state, setState] = useState<SendMessageState>({
    isLoading: false,
    error: null,
    progress: 'idle'
  });

  const { user } = useAuth();
  const { addMessage, updateMessage } = useChatStore();
  const { sendMessageViaSocket } = useRealTimeMessaging();

  const sendMessage = async (
    friendAddress: string, 
    friendPublicKey: string, 
    plaintext: string,
    useBlockchain = false // Option to use blockchain + IPFS or just API
  ): Promise<boolean> => {
    setState({ isLoading: true, error: null, progress: 'sending' });

    try {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const timestamp = Date.now();
      const messageId = generateMessageId(user.address, friendAddress, timestamp);

      if (useBlockchain) {
        // Use the existing blockchain + IPFS flow
        setState(prev => ({ ...prev, progress: 'encrypting' }));
        
        // Import the original crypto functions
        const { encryptForRecipient, getOrCreateX25519, fromHex0x } = await import('@/lib/crypto');
        const { uploadJSON } = await import('@/lib/ipfs');
        const { ethers } = await import('ethers');
        
        // 1) Get local keypair
        const { publicKey: myPub, secretKey: mySec } = getOrCreateX25519();
        
        // 2) Convert friend's public key from hex to Uint8Array
        const recipPub = fromHex0x(friendPublicKey);
        
        // 3) Encrypt the message
        const encrypted = await encryptForRecipient(plaintext, mySec, recipPub);
        
        const payload = {
          v: 1,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          sender: user.address,
          receiver: friendAddress,
          timestamp,
        };

        setState(prev => ({ ...prev, progress: 'uploading' }));
        
        // 4) Upload to IPFS
        const cid = await uploadJSON(payload);
        
        // 5) Compute cidHash for the contract
        const cidHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid));
        
        // 6) Create optimistic message
        const optimisticMessage: Message = {
          id: messageId,
          sender: user.address,
          receiver: friendAddress,
          content: plaintext,
          timestamp,
          cidHash,
          cid,
          status: 'pending'
        };
        
        addMessage(friendAddress, optimisticMessage);
        
        setState(prev => ({ ...prev, progress: 'confirming' }));
        
        // 7) Send transaction
        const { getContract, getSigner } = await import('@/lib/ethers-helpers');
        const contract = getContract(getSigner());
        const tx = await contract.sendMessage(friendAddress, cidHash, cid);
        
        // Update message with transaction hash
        updateMessage(friendAddress, messageId, { txHash: tx.hash });
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          updateMessage(friendAddress, messageId, {
            status: 'confirmed',
            blockNumber: receipt.blockNumber
          });
          setState({ isLoading: false, error: null, progress: 'complete' });
          return true;
        } else {
          throw new Error('Transaction failed');
        }
        
      } else {
        // Use API-only flow (faster, simpler)
        
        // Find or create conversation
        const conversations = await api.getConversations();
        let conversationId = conversations.conversations.find(conv => 
          conv.type === 'direct' && 
          conv.otherParticipant?.address === friendAddress
        )?.id;

        if (!conversationId) {
          // Create new conversation
          const newConv = await api.createConversation({
            type: 'direct',
            participantAddress: friendAddress
          });
          conversationId = newConv.conversation.id;
        }

        // Create optimistic message first
        const optimisticMessage: Message = {
          id: messageId,
          sender: user.address,
          receiver: friendAddress,
          content: plaintext,
          timestamp,
          cidHash: '',
          cid: '',
          status: 'pending'
        };
        
        addMessage(friendAddress, optimisticMessage);

        // Send via socket for real-time delivery
        const tempId = `temp_${Date.now()}`;
        sendMessageViaSocket({
          conversationId,
          content: plaintext,
          type: 'text',
          tempId
        });

        setState({ isLoading: false, error: null, progress: 'complete' });
        return true;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setState({ isLoading: false, error: errorMessage, progress: 'idle' });
      
      // Update optimistic message to failed status if it exists
      if (user) {
        const messageId = generateMessageId(user.address, friendAddress, Date.now());
        updateMessage(friendAddress, messageId, { status: 'failed' });
      }
      
      return false;
    }
  };

  return { ...state, sendMessage };
}

// Hook for loading conversation messages
export function useLoadConversation(friendAddress: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setConversation } = useChatStore();
  const { user } = useAuth();

  const loadConversation = async () => {
    if (!friendAddress || !user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get conversations to find the conversation ID
      const conversations = await api.getConversations();
      const conversation = conversations.conversations.find(conv => 
        conv.type === 'direct' && 
        conv.otherParticipant?.address === friendAddress
      );

      if (!conversation) {
        // No conversation exists yet
        setConversation(friendAddress, []);
        return;
      }

      // Get messages for this conversation
      const { messages } = await api.getMessages(conversation.id);
      
      // Convert API messages to store format
      const storeMessages: Message[] = messages.map(msg => ({
        id: msg.id,
        sender: msg.sender.address,
        receiver: msg.sender.address === user.address ? friendAddress : user.address,
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        cidHash: msg.cidHash || '',
        cid: msg.cid || '',
        txHash: msg.txHash,
        status: msg.status as 'pending' | 'confirmed' | 'failed',
        blockNumber: msg.blockNumber,
        decryptionError: undefined
      }));
      
      setConversation(friendAddress, storeMessages);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversation when friendAddress changes
  useEffect(() => {
    if (friendAddress) {
      loadConversation();
    }
  }, [friendAddress, user?.address]);

  return { isLoading, error, loadConversation };
}

// Hook for loading friends from API
export function useLoadFriends() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setFriends } = useChatStore();
  const { user } = useAuth();

  const loadFriends = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { friends } = await api.getFriends();
      
      // Convert API friends to store format
      const storeFriends = friends.map(friend => ({
        address: friend.address,
        username: friend.username || friend.address.slice(0, 8) + '...',
        publicKey: friend.publicKey || '',
        isOnline: false, // Will be updated by presence system
        lastSeen: friend.lastSeen ? new Date(friend.lastSeen).getTime() : undefined
      }));
      
      setFriends(storeFriends);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load friends';
      setError(errorMessage);
      console.error('Error loading friends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load friends when user changes
  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user?.address]);

  return { isLoading, error, loadFriends };
}

// Hook for adding friends
export function useAddFriend() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { loadFriends } = useLoadFriends();

  const addFriend = async (address: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.sendFriendRequest(address);
      
      // Reload friends list
      await loadFriends();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add friend';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, addFriend };
}

// Initialize real-time messaging when component mounts
export function useMessageEvents() {
  const { isAuthenticated } = useAuth();
  const realTime = useRealTimeMessaging();
  const { loadFriends } = useLoadFriends();

  useEffect(() => {
    if (isAuthenticated) {
      // Load initial data
      loadFriends();
    }
  }, [isAuthenticated]);

  // Return real-time messaging utilities
  return realTime;
}
