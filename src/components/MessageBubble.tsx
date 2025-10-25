import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/messageTypes';
import { messageStatusService } from '@/lib/messageStatus';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onStatusChange?: (status: any) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  onStatusChange,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReaction,
  showAvatar = false,
  showTimestamp = true,
  showStatus = true
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState<{[emoji: string]: string[]}>(message.reactions || {});
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const reactionEmojis = ['😀', '❤️', '👍', '👎', '😂', '😮', '😢', '😡'];

  useEffect(() => {
    // Set up status change listener
    if (onStatusChange) {
      messageStatusService.onStatusChange(message.id, onStatusChange);
    }

    // Cleanup
    return () => {
      messageStatusService.offStatusChange(message.id);
    };
  }, [message.id, onStatusChange]);

  // Handle reaction
  const handleReaction = async (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    
    // Update local state
    setReactions(prev => ({
      ...prev,
      [emoji]: [...(prev[emoji] || []), 'current-user']
    }));
    
    setShowReactions(false);
  };

  // Handle reply
  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    setShowMenu(false);
  };

  // Handle forward
  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
    setShowMenu(false);
  };

  // Handle edit
  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content.type === 'text' ? message.content.content : '');
    setShowMenu(false);
  };

  // Handle save edit
  const handleSaveEdit = () => {
    // TODO: Implement edit message logic
    setIsEditing(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(message);
    }
    setShowMenu(false);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '❌';
      default: return '';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sending': return 'text-gray-400';
      case 'sent': return 'text-gray-500';
      case 'delivered': return 'text-blue-500';
      case 'read': return 'text-blue-600';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  // Render message content based on type
  const renderMessageContent = () => {
    if (isEditing && message.content.type === 'text') {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    switch (message.content.type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content.content}
          </div>
        );

      case 'image':
        return (
          <div>
            <img
              src={`https://ipfs.io/ipfs/${message.content.imageCid}`}
              alt="Image"
              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                // TODO: Open image in full screen
              }}
            />
            {message.content.caption && (
              <div className="mt-2 text-sm opacity-90">
                {message.content.caption}
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <div className="text-2xl">
              {getFileIcon(message.content.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {message.content.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(message.content.fileSize)} • {message.content.mimeType}
              </div>
            </div>
            <button className="text-blue-500 hover:text-blue-700">
              ⬇️
            </button>
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <button className="text-2xl hover:scale-110 transition-transform">
              ▶️
            </button>
            <div className="flex-1">
              <div className="text-sm font-medium">Voice message</div>
              <div className="text-xs text-gray-500">
                {Math.round(message.content.duration)}s
              </div>
            </div>
            {message.content.waveform && (
              <div className="flex space-x-1">
                {message.content.waveform.slice(0, 20).map((bar, index) => (
                  <div
                    key={index}
                    className="w-1 bg-gray-400 rounded"
                    style={{ height: `${bar * 20}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div>
            <video
              src={`https://ipfs.io/ipfs/${message.content.videoCid}`}
              poster={`https://ipfs.io/ipfs/${message.content.thumbnailCid}`}
              controls
              className="max-w-full h-auto rounded-lg"
            />
            {message.content.caption && (
              <div className="mt-2 text-sm opacity-90">
                {message.content.caption}
              </div>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📍</span>
              <div>
                <div className="font-medium text-sm">Location</div>
                {message.content.address && (
                  <div className="text-xs text-gray-500">
                    {message.content.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                {message.content.contactAvatar ? (
                  <img
                    src={message.content.contactAvatar}
                    alt={message.content.contactName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg">
                    {message.content.contactName[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {message.content.contactName}
                </div>
                <div className="text-xs text-gray-500">
                  {message.content.contactAddress}
                </div>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="text-center text-sm text-gray-500 italic">
            {message.content.content}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Unsupported message type
          </div>
        );
    }
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel')) return '📊';
    if (mimeType.includes('powerpoint')) return '📈';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-xs lg:max-w-md relative ${
        isOwn ? 'order-2' : 'order-1'
      }`}>
        
        {/* Message Content */}
        <div className={`px-4 py-2 rounded-lg relative ${
          isOwn 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-900'
        } ${message.isDeleted ? 'opacity-50' : ''}`}>
          
          {/* Reply indicator */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded border-l-4 ${
              isOwn ? 'border-blue-300 bg-blue-100' : 'border-gray-300 bg-gray-100'
            }`}>
              <div className="text-xs opacity-75">Replying to</div>
              <div className="text-sm truncate">
                {/* TODO: Show replied message preview */}
                Message preview...
              </div>
            </div>
          )}

          {/* Message content */}
          <div className="text-sm">
            {renderMessageContent()}
          </div>

          {/* Edited indicator */}
          {message.isEdited && (
            <div className="text-xs opacity-75 mt-1">
              (edited)
            </div>
          )}

          {/* Reactions */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactions).map(([emoji, users]) => (
                <div
                  key={emoji}
                  className="bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs flex items-center space-x-1"
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message actions */}
        <div className={`absolute top-0 ${
          isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
        } opacity-0 group-hover:opacity-100 transition-opacity`}>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="React"
            >
              😀
            </button>
            <button
              onClick={handleReply}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Reply"
            >
              ↩️
            </button>
            <button
              onClick={handleForward}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Forward"
            >
              ↗️
            </button>
            {isOwn && (
              <>
                <button
                  onClick={handleEdit}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reactions popup */}
        {showReactions && (
          <div className={`absolute top-0 ${
            isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
          } bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10`}>
            <div className="flex space-x-1">
              {reactionEmojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-lg hover:scale-110 transition-transform p-1 hover:bg-gray-100 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp and status */}
        <div className={`flex items-center space-x-1 mt-1 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          {showTimestamp && (
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          )}
          {isOwn && showStatus && (
            <span className={`text-xs ${getStatusColor(message.status)}`}>
              {getStatusIcon(message.status)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
