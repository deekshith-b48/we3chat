import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getSigner, waitForTransaction, formatContractError } from '@/lib/ethers-helpers';
import { uploadJSON, fetchJSONFromCID } from '@/lib/ipfs';
import { encryptForRecipient, decryptFromSender, getOrCreateX25519, fromHex0x } from '@/lib/crypto';
import { useChatStore, generateMessageId, Message } from '@/store/chat-store';

export interface SendMessageState {
  isLoading: boolean;
  error: string | null;
  progress: 'idle' | 'encrypting' | 'uploading' | 'sending' | 'confirming' | 'complete';
}

// Hook for sending encrypted messages
export function useSendMessage() {
  const [state, setState] = useState<SendMessageState>({
    isLoading: false,
    error: null,
    progress: 'idle'
  });

  const { addMessage, updateMessage, addTransaction, updateTransaction } = useChatStore();

  const sendMessage = async (friendAddress: string, friendPublicKey: string, plaintext: string): Promise<boolean> => {
    setState({ isLoading: true, error: null, progress: 'encrypting' });

    try {
      const signer = getSigner();
      const myAddress = await signer.getAddress();
      
      // 1) Get local keypair
      const { publicKey: myPub, secretKey: mySec } = getOrCreateX25519();
      
      // 2) Convert friend's public key from hex to Uint8Array
      const recipPub = fromHex0x(friendPublicKey);
      
      // 3) Encrypt the message
      const encrypted = await encryptForRecipient(plaintext, mySec, recipPub);
      const timestamp = Date.now();
      
      const payload = {
        v: 1,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        sender: myAddress,
        receiver: friendAddress,
        timestamp,
        message: plaintext // This will help with debugging, but we should remove in production
      };

      setState(prev => ({ ...prev, progress: 'uploading' }));
      
      // 4) Upload to IPFS
      const cid = await uploadJSON(payload);
      
      setState(prev => ({ ...prev, progress: 'sending' }));
      
      // 5) Compute cidHash for the contract
      const cidHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid));
      
      // 6) Create optimistic message
      const messageId = generateMessageId(myAddress, friendAddress, timestamp);
      const optimisticMessage: Message = {
        id: messageId,
        sender: myAddress,
        receiver: friendAddress,
        content: plaintext,
        timestamp,
        cidHash,
        cid,
        status: 'pending'
      };
      
      addMessage(friendAddress, optimisticMessage);
      
      // 7) Send transaction
      const contract = getContract(signer);
      const tx = await contract.sendMessage(friendAddress, cidHash, cid);
      
      // Track transaction
      addTransaction({
        hash: tx.hash,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Update message with transaction hash
      updateMessage(friendAddress, messageId, { txHash: tx.hash });
      
      setState(prev => ({ ...prev, progress: 'confirming' }));
      
      // 8) Wait for confirmation
      const receipt = await waitForTransaction(tx.hash, 1, (receipt) => {
        if (receipt && receipt.status === 1) {
          updateMessage(friendAddress, messageId, {
            status: 'confirmed',
            blockNumber: receipt.blockNumber
          });
          
          updateTransaction(tx.hash, {
            status: 'confirmed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString()
          });
        }
      });
      
      if (receipt.status === 1) {
        setState({ isLoading: false, error: null, progress: 'complete' });
        return true;
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (err) {
      const errorMessage = formatContractError(err);
      setState({ isLoading: false, error: errorMessage, progress: 'idle' });
      
      // Update any optimistic message to failed status
      const messageId = generateMessageId(
        await getSigner().getAddress(), 
        friendAddress, 
        Date.now()
      );
      updateMessage(friendAddress, messageId, { status: 'failed' });
      
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

  const loadConversation = async () => {
    if (!friendAddress) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const signer = getSigner();
      const myAddress = await signer.getAddress();
      const contract = getContract();
      
      // 1) Call contract to get message hashes
      const messages = await contract.readMessage(friendAddress);
      
      // 2) Get event logs to map cidHash -> cid
      const provider = signer.provider!;
      const iface = new ethers.utils.Interface(contract.interface.format());
      
      const filter = {
        address: contract.address,
        topics: [ethers.utils.id("MessageSent(address,address,bytes32,uint256,string)")]
      };
      
      const logs = await provider.getLogs({ ...filter, fromBlock: 0, toBlock: "latest" });
      
      // Parse logs and create cidHash -> cid mapping
      const cidMap = new Map<string, string>();
      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          // parsed.args = [from, to, cidHash, timestamp, cid]
          const cidHash = (parsed.args[2] as string).toLowerCase();
          const cid = parsed.args[4] as string;
          cidMap.set(cidHash, cid);
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // 3) For each message, fetch from IPFS and decrypt
      const { secretKey } = getOrCreateX25519();
      const decryptedMessages: Message[] = [];
      
      for (const msg of messages) {
        const hash = (msg.cidHash as string).toLowerCase();
        const cid = cidMap.get(hash);
        
        if (!cid) continue;
        
        try {
          // Fetch encrypted payload from IPFS
          const encPayload = await fetchJSONFromCID(cid);
          
          // Get sender's public key from contract
          const senderPubHex = await contract.x25519PublicKey(msg.sender);
          const senderPub = fromHex0x(senderPubHex);
          
          // Decrypt the message
          const plaintext = await decryptFromSender(
            encPayload.ciphertext,
            encPayload.iv,
            encPayload.salt,
            secretKey,
            senderPub
          );
          
          const messageId = generateMessageId(
            msg.sender,
            msg.receiver,
            msg.timestamp.toNumber ? msg.timestamp.toNumber() : msg.timestamp
          );
          
          decryptedMessages.push({
            id: messageId,
            sender: msg.sender,
            receiver: msg.receiver,
            content: plaintext,
            timestamp: msg.timestamp.toNumber ? msg.timestamp.toNumber() : msg.timestamp,
            cidHash: msg.cidHash,
            cid,
            status: 'confirmed'
          });
          
        } catch (decryptError) {
          console.error('Failed to decrypt message:', decryptError);
          
          // Add message with decryption error
          const messageId = generateMessageId(
            msg.sender,
            msg.receiver,
            msg.timestamp.toNumber ? msg.timestamp.toNumber() : msg.timestamp
          );
          
          decryptedMessages.push({
            id: messageId,
            sender: msg.sender,
            receiver: msg.receiver,
            content: '[Failed to decrypt message]',
            timestamp: msg.timestamp.toNumber ? msg.timestamp.toNumber() : msg.timestamp,
            cidHash: msg.cidHash,
            cid: cid || '',
            status: 'confirmed',
            decryptionError: 'Failed to decrypt'
          });
        }
      }
      
      // Sort by timestamp and update store
      const sortedMessages = decryptedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setConversation(friendAddress, sortedMessages);
      
    } catch (err) {
      const errorMessage = formatContractError(err);
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
  }, [friendAddress]);

  return { isLoading, error, loadConversation };
}

// Hook for real-time message updates
export function useMessageEvents() {
  const { addMessage, updateMessage } = useChatStore();
  
  useEffect(() => {
    let provider: ethers.providers.Web3Provider;
    let contract: ethers.Contract;
    
    const setupEventListener = async () => {
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        contract = getContract(provider);
        
        const filter = contract.filters.MessageSent();
        
        const handleMessageSent = async (
          from: string,
          to: string,
          cidHash: string,
          timestamp: ethers.BigNumber,
          cid: string,
          event: ethers.Event
        ) => {
          try {
            const myAddress = await getSigner().getAddress();
            
            // Only process messages involving current user
            if (from !== myAddress && to !== myAddress) return;
            
            const friendAddress = from === myAddress ? to : from;
            
            // Fetch and decrypt the message
            const encPayload = await fetchJSONFromCID(cid);
            const { secretKey } = getOrCreateX25519();
            
            // Get sender's public key
            const senderPubHex = await contract.x25519PublicKey(from);
            const senderPub = fromHex0x(senderPubHex);
            
            const plaintext = await decryptFromSender(
              encPayload.ciphertext,
              encPayload.iv,
              encPayload.salt,
              secretKey,
              senderPub
            );
            
            const messageId = generateMessageId(from, to, timestamp.toNumber());
            
            const message: Message = {
              id: messageId,
              sender: from,
              receiver: to,
              content: plaintext,
              timestamp: timestamp.toNumber(),
              cidHash,
              cid,
              status: 'confirmed',
              txHash: event.transactionHash,
              blockNumber: event.blockNumber
            };
            
            addMessage(friendAddress, message);
            
          } catch (error) {
            console.error('Error processing MessageSent event:', error);
          }
        };
        
        contract.on(filter, handleMessageSent);
        
        return () => {
          if (contract) {
            contract.removeAllListeners();
          }
        };
        
      } catch (error) {
        console.error('Error setting up message event listener:', error);
      }
    };
    
    if (typeof window !== 'undefined' && window.ethereum) {
      setupEventListener();
    }
    
    return () => {
      if (contract) {
        contract.removeAllListeners();
      }
    };
  }, []);
}
