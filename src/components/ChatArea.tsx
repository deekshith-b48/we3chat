'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, useCurrentConversation, useSelectedFriend } from '@/store/chat-store';
import { useSendMessage, useLoadConversation } from '@/hooks/use-messaging';
import { useWallet } from '@/hooks/use-wallet';
import { getExplorerUrl } from '@/lib/contract';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ChatArea() {
  const [messageText, setMessageText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { address } = useWallet();
  const selectedFriend = useSelectedFriend();
  const messages = useCurrentConversation();
  const { sendMessage, isLoading: isSending, progress, error: sendError } = useSendMessage();
  const { isLoading: isLoadingMessages, error: loadError } = useLoadConversation(selectedFriend?.address || null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when friend is selected
  useEffect(() => {
    if (selectedFriend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedFriend]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedFriend || isSending) return;
    
    const success = await sendMessage(
      selectedFriend.address,
      selectedFriend.publicKey,
      messageText.trim()
    );
    
    if (success) {
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!selectedFriend) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a friend to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center relative">
              <span className="text-white font-semibold">
                {getInitials(selectedFriend.username)}
              </span>
              {selectedFriend.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{selectedFriend.username}</h2>
              <p className="text-sm text-gray-500">
                {selectedFriend.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Voice Call (Coming Soon)"
              disabled
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
            </button>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Video Call (Coming Soon)"
              disabled
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner size="medium" />
          </div>
        ) : loadError ? (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Failed to load messages: {loadError}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation by sending the first message!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.sender === address;
            const showAvatar = index === 0 || messages[index - 1].sender !== message.sender;
            
            return (
              <div 
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} message-enter`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isMe && showAvatar && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {getInitials(selectedFriend.username)}
                      </span>
                    </div>
                  )}
                  {!isMe && !showAvatar && (
                    <div className="w-8 h-8 flex-shrink-0"></div>
                  )}
                  
                  {/* Message Bubble */}
                  <div className="group">
                    <div 
                      className={`px-4 py-2 rounded-lg ${
                        isMe 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                      } ${
                        message.status === 'pending' ? 'opacity-70' :
                        message.status === 'failed' ? 'border-red-300 bg-red-50' : ''
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Message Status & Time */}
                      <div className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
                        isMe ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{formatMessageTime(message.timestamp)}</span>
                        
                        {isMe && (
                          <>
                            {message.status === 'pending' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {message.status === 'confirmed' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                            {message.status === 'failed' && (
                              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Transaction Link */}
                      {message.txHash && (
                        <div className="mt-1">
                          <a
                            href={getExplorerUrl(message.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs ${isMe ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-500'}`}
                          >
                            View on Explorer
                          </a>
                        </div>
                      )}
                      
                      {/* Decryption Error */}
                      {message.decryptionError && (
                        <div className="mt-1 text-xs text-red-500">
                          Decryption failed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Sending Status */}
        {isSending && (
          <div className="flex justify-end">
            <div className="bg-blue-100 border border-blue-200 rounded-lg px-4 py-2 max-w-xs">
              <div className="flex items-center space-x-2 text-blue-700">
                <LoadingSpinner size="small" color="blue" />
                <span className="text-sm">
                  {progress === 'encrypting' && 'Encrypting...'}
                  {progress === 'uploading' && 'Uploading to IPFS...'}
                  {progress === 'sending' && 'Sending transaction...'}
                  {progress === 'confirming' && 'Confirming...'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {sendError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            Failed to send message: {sendError}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <button 
            type="button"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Attach File (Coming Soon)"
            disabled
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={1}
              disabled={isSending}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                height: Math.min(120, Math.max(40, messageText.split('\n').length * 20))
              }}
            />
            <button 
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Emoji (Coming Soon)"
              disabled
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
