/**
 * Blockchain Chat Component
 * 
 * Handles blockchain-based chat functionality with encrypted messages
 */

import { useState, useEffect, useCallback } from 'react';
import { useBlockchain } from '../../hooks/blockchain/useBlockchain';
import { useIPFS } from '../../hooks/ipfs/useIPFS';
import { useAuth } from '../../hooks/supabase/useAuth';
import { ethers } from 'ethers';

interface BlockchainChatProps {
  friendAddress: string;
  friendName: string;
}

export default function BlockchainChat({ friendAddress, friendName }: BlockchainChatProps) {
  const { user } = useAuth();
  const { 
    contract, 
    isConnected, 
    sendMessage: sendBlockchainMessage, 
    loadMessages, 
    messages,
    isLoading: blockchainLoading,
  } = useBlockchain();
  const { uploadMessage, downloadMessage, isLoading: ipfsLoading } = useIPFS();
  
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages when component mounts or friend changes
  useEffect(() => {
    if (isConnected && friendAddress) {
      loadMessages(friendAddress);
    }
  }, [isConnected, friendAddress, loadMessages]);

  // Update chat messages when blockchain messages change
  useEffect(() => {
    if (messages[friendAddress]) {
      loadDecryptedMessages(messages[friendAddress]);
    }
  }, [messages, friendAddress]);

  /**
   * Load and decrypt messages from IPFS
   */
  const loadDecryptedMessages = useCallback(async (blockchainMessages: any[]) => {
    try {
      const decryptedMessages = await Promise.all(
        blockchainMessages.map(async (msg) => {
          try {
            // Download encrypted message from IPFS
            const encryptedMessage = await downloadMessage(msg.cidHash);
            
            // For demo purposes, we'll just display the encrypted message
            // In a real implementation, you would decrypt it here
            return {
              id: msg.cidHash,
              sender: msg.sender,
              receiver: msg.receiver,
              content: `[Encrypted] ${encryptedMessage.substring(0, 50)}...`,
              timestamp: new Date(msg.timestamp * 1000),
              isFromMe: msg.sender.toLowerCase() === user?.id?.toLowerCase()
            };
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return {
              id: msg.cidHash,
              sender: msg.sender,
              receiver: msg.receiver,
              content: '[Failed to decrypt message]',
              timestamp: new Date(msg.timestamp * 1000),
              isFromMe: msg.sender.toLowerCase() === user?.id?.toLowerCase()
            };
          }
        })
      );

      setChatMessages(decryptedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  }, [downloadMessage, user]);

  /**
   * Send a message
   */
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !contract || !isConnected) {
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      // For demo purposes, we'll encrypt the message (in real implementation, use proper encryption)
      const encryptedMessage = `ENCRYPTED: ${messageText}`;
      
      // Upload encrypted message to IPFS
      const cid = await uploadMessage(encryptedMessage);
      
      // Generate CID hash for blockchain storage
      const cidHash = ethers.keccak256(ethers.toUtf8Bytes(cid));
      
      // Send message to blockchain
      await sendBlockchainMessage(friendAddress, cidHash);
      
      // Clear input
      setMessageText('');
      
      // Reload messages
      await loadMessages(friendAddress);
      
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [messageText, contract, isConnected, friendAddress, uploadMessage, sendBlockchainMessage, loadMessages]);

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet</h3>
          <p className="text-gray-600">Please connect your wallet to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {friendName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{friendName}</h3>
            <p className="text-sm text-gray-500">{friendAddress}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isFromMe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.isFromMe ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending || blockchainLoading || ipfsLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending || blockchainLoading || ipfsLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
