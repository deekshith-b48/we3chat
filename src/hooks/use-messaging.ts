import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useChatStore, generateMessageId, Message } from '@/store/chat-store';
import { useAuth } from './supabase/useAuth';
import { useRealTimeMessaging } from '@/hooks/use-real-time';
import { useWallet } from '@/hooks/use-wallet';
import { useTransactionTracking } from '@/hooks/use-web3-events';
import { sendMessageFlow, loadConversation, loadFriendsFromContract } from '@/lib/chatActions';
import { getSigner, getContract } from '@/lib/ethers-helpers';
import { fetchWithFallback } from '@/lib/ipfs';
import { decryptFromSender } from '@/lib/crypto';

export interface SendMessageState {
  isLoading: boolean;
  error: string | null;
  progress: 'idle' | 'encrypting' | 'uploading' | 'sending' | 'confirming' | 'complete';
}

// Hook for sending messages via Web3 + IPFS or API
export function useSendMessage() {
  const [state, setState] = useState<SendMessageState>({
    isLoading: false,
    error: null,
    progress: 'idle'
  });

  const { user } = useAuth();
  const { address, isConnected } = useWallet();
  const { addMessage, updateMessage } = useChatStore();
  const { sendMessageViaSocket } = useRealTimeMessaging();
  const { trackTransaction } = useTransactionTracking();

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
      const messageId = generateMessageId(user.id, friendAddress, timestamp);

      if (useBlockchain && isConnected && address) {
        // Use Web3 + IPFS flow
        if (!friendPublicKey) {
          throw new Error('Friend public key is required for encrypted messaging');
        }

        // Create optimistic message first
        const optimisticMessage: Message = {
          id: messageId,
          sender: user.id,
          receiver: friendAddress,
          content: plaintext,
          timestamp,
          cidHash: '',
          cid: '',
          status: 'pending'
        };
        
        addMessage(friendAddress, optimisticMessage);

        // Use the sendMessageFlow function with progress callbacks
        await sendMessageFlow(
          getSigner(),
          user.id,
          friendAddress,
          friendPublicKey,
          plaintext,
          (update) => {
            console.log('Message flow update:', update);
            
            if (update.status === 'pending') {
              setState(prev => ({ ...prev, progress: 'confirming' }));
              updateMessage(friendAddress, messageId, {
                txHash: update.txHash,
                cidHash: update.cidHash,
                cid: update.cid
              });
              // Track transaction
              trackTransaction(update.txHash, 'message');
            } else if (update.status === 'confirmed') {
              updateMessage(friendAddress, messageId, {
                status: 'confirmed',
                txHash: update.txHash,
                blockNumber: update.blockNumber
              });
            }
          }
        );

        setState({ isLoading: false, error: null, progress: 'complete' });
        return true;
        
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
          sender: user.id,
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
        const messageId = generateMessageId(user.id, friendAddress, Date.now());
        updateMessage(friendAddress, messageId, { status: 'failed' });
      }
      
      return false;
    }
  };

  return { ...state, sendMessage };
}

// Hook for loading conversation messages
export function useLoadConversation(friendAddress: string | null, useWeb3 = true) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setConversation } = useChatStore();
  const { user } = useAuth();
  const { address, isConnected } = useWallet();

  const loadConversationData = async () => {
    if (!friendAddress || !user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (useWeb3 && isConnected && address) {
        // Load from Web3 + IPFS
        console.log(`🔗 Loading Web3 conversation with ${friendAddress}`);
        const messages = await loadConversation(address, friendAddress);
        setConversation(friendAddress, messages);
        console.log(`✅ Loaded ${messages.length} Web3 messages`);
      } else {
        // Load from API
        console.log(`📡 Loading API conversation with ${friendAddress}`);
        
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
          receiver: msg.sender.address === user.id ? friendAddress : user.id,
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
        console.log(`✅ Loaded ${storeMessages.length} API messages`);
      }
      
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
      loadConversationData();
    }
  }, [friendAddress, user?.id, useWeb3, isConnected]);

  return { isLoading, error, loadConversation: loadConversationData };
}

// Hook for loading friends from API or Web3
export function useLoadFriends(useWeb3 = true) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setFriends } = useChatStore();
  const { user } = useAuth();
  const { address, isConnected } = useWallet();

  const loadFriendsData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (useWeb3 && isConnected && address) {
        // Load from Web3
        console.log('🔗 Loading friends from Web3 contract');
        const friends = await loadFriendsFromContract(address);
        setFriends(friends);
        console.log(`✅ Loaded ${friends.length} friends from Web3`);
      } else {
        // Load from API
        console.log('📡 Loading friends from API');
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
        console.log(`✅ Loaded ${storeFriends.length} friends from API`);
      }
      
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
      loadFriendsData();
    }
  }, [user?.id, useWeb3, isConnected]);

  return { isLoading, error, loadFriends: loadFriendsData };
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

// Hook for listening to blockchain message events
export function useBlockchainMessageEvents() {
  const { user } = useAuth();
  const { address, isConnected } = useWallet();
  const { addMessage, myPrivateKey } = useChatStore();
  const contractRef = useRef<any>(null);
  const eventListenersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected || !address || !user || !myPrivateKey) {
      return;
    }

    const setupEventListeners = async () => {
      try {
        const contract = getContract();
        contractRef.current = contract;

        // Listen for MessageSent events
        const handleMessageSent = async (
          sender: string,
          recipient: string,
          cidHash: string,
          timestamp: number
        ) => {
          // Only process messages where current user is the recipient
          if (recipient.toLowerCase() !== address.toLowerCase()) {
            return;
          }

          console.log(`📨 Received blockchain message from ${sender}`, { cidHash, timestamp });

          try {
            // Fetch message content from IPFS
            const messageData = await fetchWithFallback(cidHash);
            
            // Decrypt the message
            const decryptedContent = await decryptFromSender(
              messageData.content,
              messageData.nonce,
              messageData.salt,
              myPrivateKey,
              messageData.senderPublicKey
            );

            // Create message object
            const message: Message = {
              id: generateMessageId(sender, recipient, timestamp),
              sender,
              receiver: recipient,
              content: decryptedContent,
              timestamp: timestamp * 1000, // Convert to milliseconds
              cidHash,
              cid: cidHash, // Using cidHash as cid for now
              status: 'confirmed',
              isEncrypted: true
            };

            // Add to store
            addMessage(sender, message);
            console.log(`✅ Successfully processed blockchain message from ${sender}`);

          } catch (error) {
            console.error('Error processing blockchain message:', error);
            
            // Add failed message to store
            const failedMessage: Message = {
              id: generateMessageId(sender, recipient, timestamp),
              sender,
              receiver: recipient,
              content: '[Failed to decrypt message]',
              timestamp: timestamp * 1000,
              cidHash,
              cid: cidHash,
              status: 'failed',
              isEncrypted: true,
              decryptionError: error instanceof Error ? error.message : 'Unknown error'
            };
            
            addMessage(sender, failedMessage);
          }
        };

        // Set up event listener
        contract.on('MessageSent', handleMessageSent);
        eventListenersRef.current.add('MessageSent');

        console.log('🔗 Blockchain message event listeners set up');

      } catch (error) {
        console.error('Error setting up blockchain event listeners:', error);
      }
    };

    setupEventListeners();

    // Cleanup function
    return () => {
      if (contractRef.current && eventListenersRef.current.size > 0) {
        contractRef.current.removeAllListeners('MessageSent');
        eventListenersRef.current.clear();
        console.log('🧹 Blockchain event listeners cleaned up');
      }
    };
  }, [isConnected, address, user, myPrivateKey]);

  return {
    isListening: eventListenersRef.current.size > 0
  };
}

// Initialize real-time messaging when component mounts
export function useMessageEvents() {
  const { isAuthenticated } = useAuth();
  const realTime = useRealTimeMessaging();
  const { loadFriends } = useLoadFriends();
  const blockchainEvents = useBlockchainMessageEvents();

  useEffect(() => {
    if (isAuthenticated) {
      // Load initial data
      loadFriends();
    }
  }, [isAuthenticated]);

  // Return real-time messaging utilities
  return {
    ...realTime,
    blockchainEvents
  };
}
