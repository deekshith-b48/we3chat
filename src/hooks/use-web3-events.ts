import { useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { useChatStore } from '@/store/chat-store';
import { subscribeToMessageEvents, loadConversation } from '@/lib/chatActions';
import { fetchJSONFromCID } from '@/lib/ipfs';
import { decryptFromSender, getOrCreateX25519, fromHex0x } from '@/lib/crypto';
import { getContract, getProvider } from '@/lib/ethers-helpers';

interface MessageEvent {
  from: string;
  to: string;
  cidHash: string;
  timestamp: number;
  cid: string;
  blockNumber: number;
  transactionHash: string;
}

export function useWeb3Events() {
  const { address, isConnected } = useWallet();
  const { 
    addMessage, 
    updateMessage, 
    selectedFriend,
    // addTransaction,
    // updateTransaction 
  } = useChatStore();

  // Handle new message events from blockchain
  const handleNewMessageEvent = useCallback(async (event: MessageEvent) => {
    if (!address) return;

    try {
      // Determine which friend this message is with
      const friendAddress = event.from.toLowerCase() === address.toLowerCase() 
        ? event.to 
        : event.from;

      // Fetch and decrypt the message
      const encryptedPayload = await fetchJSONFromCID(event.cid);
      const { secretKey } = getOrCreateX25519();
      
      // Get sender's public key
      const contract = getContract(getProvider());
      const senderPubHex = await contract.getEncryptionKey(event.from);
      
      if (!senderPubHex || senderPubHex === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Sender public key not found");
      }

      const senderPub = fromHex0x(senderPubHex);
      
      const plaintext = await decryptFromSender(
        encryptedPayload.ciphertext,
        encryptedPayload.iv,
        encryptedPayload.salt,
        secretKey,
        senderPub
      );

      // Create message object
      const message = {
        id: `${event.from}-${event.timestamp}`,
        sender: event.from,
        receiver: event.to,
        content: plaintext,
        timestamp: event.timestamp,
        cidHash: event.cidHash,
        cid: event.cid,
        txHash: event.transactionHash,
        status: 'confirmed' as const,
        blockNumber: event.blockNumber,
        isEncrypted: true
      };

      // Add to conversation
      addMessage(friendAddress, message);

      // Update any pending message with the same cidHash
      updateMessageByHash(friendAddress, event.cidHash, {
        status: 'confirmed',
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });

      console.log('✅ New Web3 message received and decrypted:', message);

    } catch (error) {
      console.error('Error processing Web3 message event:', error);
      
      // Add message with decryption error
      const friendAddress = event.from.toLowerCase() === address.toLowerCase() 
        ? event.to 
        : event.from;

      addMessage(friendAddress, {
        id: `${event.from}-${event.timestamp}`,
        sender: event.from,
        receiver: event.to,
        content: '[Decryption failed]',
        timestamp: event.timestamp,
        cidHash: event.cidHash,
        cid: event.cid,
        txHash: event.transactionHash,
        status: 'confirmed',
        blockNumber: event.blockNumber,
        isEncrypted: true,
        decryptionError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [address, addMessage, updateMessage]);

  // Helper function to update message by cidHash
  const updateMessageByHash = useCallback((friendAddress: string, cidHash: string, updates: any) => {
    const { conversations } = useChatStore.getState();
    const messages = conversations[friendAddress] || [];
    
    for (const message of messages) {
      if (message.cidHash.toLowerCase() === cidHash.toLowerCase() && message.status === 'pending') {
        updateMessage(friendAddress, message.id, updates);
        break;
      }
    }
  }, [updateMessage]);

  // Subscribe to blockchain events
  useEffect(() => {
    if (!isConnected || !address) return;

    console.log('🔗 Setting up Web3 event subscription for:', address);
    
    const unsubscribe = subscribeToMessageEvents(address, handleNewMessageEvent);

    return () => {
      console.log('🔗 Cleaning up Web3 event subscription');
      unsubscribe();
    };
  }, [isConnected, address, handleNewMessageEvent]);

  // Load conversation history when friend is selected
  const loadConversationHistory = useCallback(async (friendAddress: string) => {
    if (!address || !friendAddress) return;

    try {
      console.log(`📖 Loading Web3 conversation history with ${friendAddress}`);
      const messages = await loadConversation(address, friendAddress);
      
      // Clear existing conversation and set new messages
      const { setConversation } = useChatStore.getState();
      setConversation(friendAddress, messages);
      
      console.log(`✅ Loaded ${messages.length} messages from Web3`);
    } catch (error) {
      console.error('Error loading Web3 conversation:', error);
    }
  }, [address]);

  // Auto-load conversation when friend is selected
  useEffect(() => {
    if (selectedFriend && address) {
      loadConversationHistory(selectedFriend);
    }
  }, [selectedFriend, address, loadConversationHistory]);

  return {
    loadConversationHistory,
    isListening: isConnected && !!address
  };
}

// Hook for transaction status tracking
export function useTransactionTracking() {
  const { addTransaction, updateTransaction } = useChatStore();

  const trackTransaction = useCallback((txHash: string, type: 'message' | 'friend' | 'account') => {
    addTransaction({
      hash: txHash,
      status: 'pending',
      type,
      timestamp: Date.now()
    });

    // Poll for transaction receipt
    const pollForReceipt = async () => {
      try {
        const provider = getProvider();
        const receipt = await provider.waitForTransaction(txHash);
        
        if (receipt) {
          updateTransaction(txHash, {
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString()
          });
        }

        console.log(`✅ Transaction ${txHash} confirmed in block ${receipt?.blockNumber}`);
      } catch (error) {
        console.error(`❌ Transaction ${txHash} failed:`, error);
        updateTransaction(txHash, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    pollForReceipt();
  }, [addTransaction, updateTransaction]);

  return { trackTransaction };
}

// Hook for Web3 connection status
export function useWeb3Status() {
  const { isConnected, isCorrectNetwork } = useWallet();
  const provider = getProvider();

  const getBlockNumber = useCallback(async () => {
    try {
      return await provider.getBlockNumber();
    } catch {
      return null;
    }
  }, [provider]);

  const getNetworkStatus = useCallback(async () => {
    try {
      const network = await provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
        isConnected: true
      };
    } catch {
      return {
        chainId: null,
        name: null,
        isConnected: false
      };
    }
  }, [provider]);

  return {
    isWeb3Ready: isConnected && isCorrectNetwork,
    getBlockNumber,
    getNetworkStatus
  };
}
