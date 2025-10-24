'use client';

import React, { useState, useEffect, useRef } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical, 
  Search, 
  Paperclip, 
  Smile, 
  Send,
  Mic,
  MicOff,
  File,
  X,
  Download,
  Reply,
  Forward,
  Copy,
  Trash2,
  Shield,
  Lock,
  Unlock,
} from 'lucide-react';
import { User } from '@/lib/contract';
import { ChatMessage } from '@/lib/realtime-messaging';

interface ChatAreaProps {
  chatId: string;
  user: User | null;
  onBack: () => void;
}

export function ChatArea({ chatId, user, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages when chatId changes
  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  const loadMessages = async () => {
    try {
      // This would be implemented to load messages from the API
      // For now, we'll leave it empty as messages will be passed as props
      console.log('Loading messages for chat:', chatId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: user?.username || '0x123...',
      receiver: '0x456...',
      content: newMessage,
      timestamp: Date.now(),
      type: 'direct',
      status: 'sending',
      encrypted: isEncrypted,
      replyTo: replyTo?.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyTo(null);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate file upload
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: user?.username || '0x123...',
      receiver: '0x456...',
      content: `File: ${file.name}`,
      timestamp: Date.now(),
      type: 'direct',
      status: 'sending',
      encrypted: false
    };

    setMessages(prev => [...prev, message]);
  };

  const handleMessageAction = (action: string, messageId: string) => {
    switch (action) {
      case 'reply':
        const message = messages.find(m => m.id === messageId);
        if (message) setReplyTo(message);
        break;
      case 'forward':
        // Implement forward functionality
        break;
      case 'copy':
        const msg = messages.find(m => m.id === messageId);
        if (msg?.content) {
          navigator.clipboard.writeText(msg.content);
        }
        break;
      case 'delete':
        setMessages(prev => prev.filter(m => m.id !== messageId));
        break;
    }
    setSelectedMessage(null);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <img
              src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
              alt="Contact"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Alice Johnson
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Online
                </span>
                {isEncrypted && (
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Encrypted
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Video className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div className="p-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Replying to: {replyTo.content?.substring(0, 50)}...
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender === user?.username;
          const isFile = message.content?.startsWith('File:');
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                {!isOwn && (
                  <div className="flex items-center space-x-2 mb-1">
                    <img
                      src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
                      alt="Sender"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Alice
                    </span>
                  </div>
                )}
                
                <div
                  className={`relative group ${
                    isOwn 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  } rounded-2xl px-4 py-2`}
                >
                  {isFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {message.content?.replace('File: ', '')}
                        </span>
                      </div>
                      <div className="text-xs opacity-75">
                        File size unknown
                      </div>
                      <button className="flex items-center space-x-1 text-xs hover:underline">
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm">{message.content}</p>
                      {message.encrypted && (
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 opacity-75" />
                          <span className="text-xs opacity-75">Encrypted</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-75">
                      {formatTime(message.timestamp)}
                    </span>
                    <div className="flex items-center space-x-1">
                      {message.status === 'sending' && (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {message.status === 'delivered' && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                      {message.status === 'read' && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message Actions */}
              <div className={`${isOwn ? 'order-1' : 'order-2'} flex items-center`}>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedMessage(message.id)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-2">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-slate-600 dark:text-slate-400">Alice is typing</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-end space-x-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Smile className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            
            <button
              onClick={() => setIsEncrypted(!isEncrypted)}
              className={`p-2 rounded-lg transition-colors ${
                isEncrypted 
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isEncrypted ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                setIsTyping(e.target.value.length > 0);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {isEncrypted && (
              <div className="absolute top-2 right-2">
                <Shield className="w-4 h-4 text-green-500" />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onMouseDown={() => setIsRecording(true)}
              onMouseUp={() => setIsRecording(false)}
              onMouseLeave={() => setIsRecording(false)}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {isEncrypted && (
          <div className="mt-2 flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
            <Shield className="w-3 h-3" />
            <span>Messages are end-to-end encrypted</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />

      {/* Message Actions Menu */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedMessage(null)}
        >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-xl">
              <div className="space-y-2">
                <button
                  onClick={() => handleMessageAction('reply', selectedMessage)}
                  className="flex items-center space-x-2 w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </button>
                <button
                  onClick={() => handleMessageAction('forward', selectedMessage)}
                  className="flex items-center space-x-2 w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <Forward className="w-4 h-4" />
                  <span>Forward</span>
                </button>
                <button
                  onClick={() => handleMessageAction('copy', selectedMessage)}
                  className="flex items-center space-x-2 w-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => handleMessageAction('delete', selectedMessage)}
                  className="flex items-center space-x-2 w-full p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}