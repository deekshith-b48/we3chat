import { useEffect, useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWeb3ChatStore } from '@/store/web3Store';
import { realtimeService } from '@/lib/realtimeService';
import { fileSharingService } from '@/lib/fileSharing';
import { notificationService } from '@/lib/notificationService';
import { messageStatusService } from '@/lib/messageStatus';
import { searchService } from '@/lib/searchService';
import { MessageBubble } from './MessageBubble';
import { Message, MessageContent, createTextMessage } from '@/lib/messageTypes';
import debounce from 'lodash.debounce';

interface AdvancedChatInterfaceProps {
  chatId: string;
  chatName: string;
  chatType: 'direct' | 'group';
}

export function AdvancedChatInterface({ 
  chatId, 
  chatName, 
  chatType 
}: AdvancedChatInterfaceProps) {
  const {
    messages,
    userProfile,
    account,
    sendMessage,
    addMessage,
    updateMessage
  } = useWeb3ChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter messages for current chat
  const chatMessages = messages.filter(msg => msg.chatId === chatId);

  // Initialize real-time services
  useEffect(() => {
    if (account) {
      // Connect to real-time service
      realtimeService.connect(account);
      
      // Set up event listeners
      realtimeService.on('new_message', handleNewMessage);
      realtimeService.on('new_group_message', handleNewGroupMessage);
      realtimeService.on('user_typing', handleUserTyping);
      realtimeService.on('user_stopped_typing', handleUserStoppedTyping);
      realtimeService.on('message_status_update', handleStatusUpdate);
      
      // Join chat room
      realtimeService.joinChat(chatId);
      
      // Request notification permission
      notificationService.requestPermission();
    }

    return () => {
      realtimeService.leaveChat(chatId);
      realtimeService.disconnect();
    };
  }, [account, chatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Handle new messages
  const handleNewMessage = useCallback((message: any) => {
    if (message.chatId === chatId) {
      addMessage(message);
      
      // Mark as delivered
      messageStatusService.handleMessageReceived(message.id, chatId, account!);
      
      // Show notification if not in current chat
      if (document.visibilityState === 'hidden') {
        notificationService.showMessageNotification(
          message.sender,
          message,
          { id: chatId, name: chatName, type: chatType }
        );
      }
    }
  }, [chatId, chatName, chatType, account, addMessage]);

  // Handle new group messages
  const handleNewGroupMessage = useCallback((message: any) => {
    if (message.groupId.toString() === chatId) {
      addMessage(message);
      
      // Show group notification
      notificationService.showGroupNotification(
        chatName,
        message.sender,
        message
      );
    }
  }, [chatId, chatName, addMessage]);

  // Handle typing indicators
  const handleUserTyping = useCallback((event: any) => {
    if (event.userId !== account && event.chatId === chatId) {
      setTypingUsers(prev => {
        const filtered = prev.filter(id => id !== event.userId);
        return [...filtered, event.userId];
      });
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== event.userId));
      }, 3000);
    }
  }, [account, chatId]);

  const handleUserStoppedTyping = useCallback((event: any) => {
    if (event.chatId === chatId) {
      setTypingUsers(prev => prev.filter(id => id !== event.userId));
    }
  }, [chatId]);

  // Handle message status updates
  const handleStatusUpdate = useCallback((update: any) => {
    updateMessage(update.messageId, { status: update.status });
  }, [updateMessage]);

  // Send message with real-time features
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !account) return;

    const tempId = `temp-${Date.now()}`;
    const messageContent = createTextMessage(messageInput, replyTo?.id);
    
    const message: Message = {
      id: tempId,
      chatId,
      sender: account,
      content: messageContent,
      timestamp: Date.now(),
      status: 'sending'
    };

    // Optimistic update
    addMessage(message);

    try {
      // Send via real-time service
      if (chatType === 'group') {
        realtimeService.sendGroupMessage(parseInt(chatId), {
          content: messageInput,
          type: 'text',
          tempId,
          replyTo: replyTo?.id
        });
      } else {
        realtimeService.sendMessage(chatId, {
          content: messageInput,
          type: 'text',
          tempId,
          replyTo: replyTo?.id
        });
      }

      // Update status to sent
      await messageStatusService.markAsSent(tempId, chatId, account);
      
      setMessageInput('');
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      await messageStatusService.markAsFailed(tempId, chatId, account);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const tempId = `temp-${Date.now()}`;
    
    try {
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));
      
      let messageContent: MessageContent;
      
      if (file.type.startsWith('image/')) {
        messageContent = await fileSharingService.uploadImage(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [tempId]: progress.progress }));
        });
      } else if (file.type.startsWith('video/')) {
        messageContent = await fileSharingService.uploadVideo(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [tempId]: progress.progress }));
        });
      } else {
        messageContent = await fileSharingService.uploadFile(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [tempId]: progress.progress }));
        });
      }

      const message: Message = {
        id: tempId,
        chatId,
        sender: account!,
        content: messageContent,
        timestamp: Date.now(),
        status: 'sending'
      };

      addMessage(message);
      
      // Send via real-time service
      if (chatType === 'group') {
        realtimeService.sendGroupMessage(parseInt(chatId), {
          content: messageContent,
          type: messageContent.type,
          tempId
        });
      } else {
        realtimeService.sendMessage(chatId, {
          content: messageContent,
          type: messageContent.type,
          tempId
        });
      }

      await messageStatusService.markAsSent(tempId, chatId, account!);
      
    } catch (error) {
      console.error('File upload failed:', error);
      await messageStatusService.markAsFailed(tempId, chatId, account!);
    } finally {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[tempId];
        return newProgress;
      });
    }
  };

  // Handle voice recording
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    // TODO: Implement voice recording logic
    console.log('Voice recording stopped:', recordingDuration);
  };

  // Handle typing
  const handleTyping = useCallback(
    debounce(() => {
      if (chatId && !isTyping) {
        setIsTyping(true);
        realtimeService.sendTyping(chatId, true);
        
        setTimeout(() => {
          setIsTyping(false);
          realtimeService.sendTyping(chatId, false);
        }, 1000);
      }
    }, 300),
    [chatId, isTyping]
  );

  // Handle search
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim()) {
        const results = await searchService.search(query, {
          chatTypes: [chatType]
        });
        setSearchResults(results);
        setShowSearchResults(true);
        searchService.addToRecentSearches(query);
      } else {
        setShowSearchResults(false);
        setSearchResults([]);
      }
    }, 500),
    [chatType]
  );

  // Handle message actions
  const handleReply = (message: Message) => {
    setReplyTo(message);
    inputRef.current?.focus();
  };

  const handleForward = (message: Message) => {
    // TODO: Implement forward logic
    console.log('Forward message:', message);
  };

  const handleEdit = (message: Message) => {
    // TODO: Implement edit logic
    console.log('Edit message:', message);
  };

  const handleDelete = (message: Message) => {
    // TODO: Implement delete logic
    console.log('Delete message:', message);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    // TODO: Implement reaction logic
    console.log('React to message:', messageId, emoji);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // File dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      acceptedFiles.forEach(file => handleFileUpload(file));
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{chatName}</h2>
            <p className="text-sm text-gray-500">
              {chatType === 'group' ? 'Group chat' : 'Direct message'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              📞
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              📹
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              ⋮
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {showSearchResults && searchResults.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
            {searchResults.map((result, index) => (
              <div key={index} className="p-2 hover:bg-gray-100 cursor-pointer">
                <div className="font-medium text-sm">{result.title}</div>
                <div className="text-xs text-gray-500">{result.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        {...getRootProps()}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          isDragActive ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
        }`}
      >
        <input {...getInputProps()} />
        
        {chatMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender === account}
            onReply={handleReply}
            onForward={handleForward}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReaction={handleReaction}
            showAvatar={chatType === 'group'}
            showTimestamp={true}
            showStatus={message.sender === account}
          />
        ))}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-t">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-900">Replying to</div>
              <div className="text-sm text-blue-700 truncate">
                {replyTo.content.type === 'text' ? replyTo.content.content : 'Message'}
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          
          {/* File Upload Button */}
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            title="Attach file"
          >
            📎
          </button>
          
          {/* Voice Recording Button */}
          <button
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onMouseLeave={handleStopRecording}
            className={`p-2 rounded-full ${
              isRecording 
                ? 'bg-red-500 text-white' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={isRecording ? `Recording... ${recordingDuration}s` : 'Hold to record'}
          >
            🎤
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
