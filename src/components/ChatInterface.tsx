import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useWeb3ChatStore } from '@/store/web3Store';
import { web3Api } from '@/lib/web3Api';
import { messageEncryption } from '@/lib/messageEncryption';

interface Message {
  content: string;
  timestamp: number;
  sender: string;
  id: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        <div className="text-sm">{message.content || 'Loading...'}</div>
        <div className={`text-xs mt-1 ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {new Date(message.timestamp * 1000).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export function ChatInterface() {
  const {
    messages,
    userProfile,
    friends,
    sendMessage,
    loadConversations,
    selectedConversation,
    setSelectedConversation,
    account,
    isLoading
  } = useWeb3ChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (account) {
      loadConversations();
    }
  }, [account, loadConversations]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !userProfile) return;

    setIsSending(true);
    try {
      // 1. Get recipient's public key from blockchain
      const recipientProfile = await web3Api.getUserProfile(selectedConversation);
      
      // 2. Encrypt message
      const recipientPublicKey = new Uint8Array(
        Buffer.from(recipientProfile.x25519PublicKey.slice(2), 'hex')
      );
      
      await messageEncryption.encryptAndUploadMessage(
        messageInput,
        recipientPublicKey,
        {
          type: 'text',
          sender: userProfile.username
        }
      );

      // 3. Send to blockchain
      await sendMessage(selectedConversation, messageInput, 'text');
      
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="text-sm">No friends yet</div>
              <div className="text-xs mt-1">Add friends to start chatting</div>
            </div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.address}
                onClick={() => setSelectedConversation(friend.address)}
                className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                  selectedConversation === friend.address ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {friend.avatarCid ? (
                      <Image
                        src={`https://ipfs.io/ipfs/${friend.avatarCid}`}
                        alt={friend.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {friend.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{friend.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {friend.address.slice(0, 6)}...{friend.address.slice(-4)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-gray-400">Online</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {friends.find(f => f.address === selectedConversation)?.name[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {friends.find(f => f.address === selectedConversation)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.slice(0, 6)}...{selectedConversation.slice(-4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">No messages yet</div>
                    <div className="text-sm text-gray-500">Start a conversation!</div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble
                    key={index}
                    message={message}
                    isOwn={message.sender === account}
                  />
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    disabled={isSending || isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || isLoading || !messageInput.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                {isSending && (
                  <div className="flex items-center text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending...
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600">
                Choose a friend from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
