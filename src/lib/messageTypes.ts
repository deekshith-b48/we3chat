export interface TextMessage {
  type: 'text';
  content: string;
  replyTo?: string;
  mentions?: string[];
}

export interface ImageMessage {
  type: 'image';
  imageCid: string;
  previewCid?: string;
  caption?: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

export interface FileMessage {
  type: 'file';
  fileCid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailCid?: string;
}

export interface VoiceMessage {
  type: 'voice';
  audioCid: string;
  duration: number;
  waveform?: number[];
  transcript?: string;
}

export interface VideoMessage {
  type: 'video';
  videoCid: string;
  thumbnailCid: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  caption?: string;
}

export interface LocationMessage {
  type: 'location';
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
  accuracy?: number;
}

export interface ContactMessage {
  type: 'contact';
  contactName: string;
  contactAddress: string;
  contactAvatar?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface StickerMessage {
  type: 'sticker';
  stickerCid: string;
  stickerPack: string;
  emoji?: string;
}

export interface PollMessage {
  type: 'poll';
  question: string;
  options: string[];
  allowMultiple: boolean;
  pollId: string;
  votes?: { [option: string]: string[] };
  totalVotes: number;
}

export interface SystemMessage {
  type: 'system';
  content: string;
  systemType: 'user_joined' | 'user_left' | 'group_created' | 'group_updated' | 'message_deleted';
  metadata?: any;
}

export type MessageContent = 
  | TextMessage 
  | ImageMessage 
  | FileMessage 
  | VoiceMessage 
  | VideoMessage
  | LocationMessage 
  | ContactMessage
  | StickerMessage
  | PollMessage
  | SystemMessage;

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  content: MessageContent;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  editedAt?: number;
  reactions?: { [emoji: string]: string[] };
  replyTo?: string;
  forwardedFrom?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  encryptionKey?: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    description?: string;
    admins?: string[];
    settings?: {
      allowInvites: boolean;
      allowFileSharing: boolean;
      allowVoiceMessages: boolean;
    };
  };
}

export interface MessageReaction {
  messageId: string;
  emoji: string;
  userId: string;
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  chatId: string;
  timestamp: number;
}

export interface MessageStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
  userId: string;
}

// Helper functions for message handling
export const createTextMessage = (
  content: string,
  replyTo?: string,
  mentions?: string[]
): TextMessage => ({
  type: 'text',
  content,
  replyTo,
  mentions
});

export const createImageMessage = (
  imageCid: string,
  width: number,
  height: number,
  fileSize: number,
  mimeType: string,
  caption?: string,
  previewCid?: string
): ImageMessage => ({
  type: 'image',
  imageCid,
  previewCid,
  caption,
  width,
  height,
  fileSize,
  mimeType
});

export const createFileMessage = (
  fileCid: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  thumbnailCid?: string
): FileMessage => ({
  type: 'file',
  fileCid,
  fileName,
  fileSize,
  mimeType,
  thumbnailCid
});

export const createVoiceMessage = (
  audioCid: string,
  duration: number,
  waveform?: number[],
  transcript?: string
): VoiceMessage => ({
  type: 'voice',
  audioCid,
  duration,
  waveform,
  transcript
});

export const createLocationMessage = (
  latitude: number,
  longitude: number,
  address?: string,
  placeName?: string,
  accuracy?: number
): LocationMessage => ({
  type: 'location',
  latitude,
  longitude,
  address,
  placeName,
  accuracy
});

export const createContactMessage = (
  contactName: string,
  contactAddress: string,
  contactAvatar?: string,
  contactPhone?: string,
  contactEmail?: string
): ContactMessage => ({
  type: 'contact',
  contactName,
  contactAddress,
  contactAvatar,
  contactPhone,
  contactEmail
});

export const createSystemMessage = (
  content: string,
  systemType: SystemMessage['systemType'],
  metadata?: any
): SystemMessage => ({
  type: 'system',
  content,
  systemType,
  metadata
});

// Message validation
export const isValidMessage = (message: any): message is Message => {
  return (
    message &&
    typeof message.id === 'string' &&
    typeof message.chatId === 'string' &&
    typeof message.sender === 'string' &&
    typeof message.timestamp === 'number' &&
    typeof message.status === 'string' &&
    message.content &&
    typeof message.content.type === 'string'
  );
};

// Message content validation
export const isValidMessageContent = (content: any): content is MessageContent => {
  if (!content || typeof content.type !== 'string') return false;
  
  switch (content.type) {
    case 'text':
      return typeof content.content === 'string';
    case 'image':
      return (
        typeof content.imageCid === 'string' &&
        typeof content.width === 'number' &&
        typeof content.height === 'number'
      );
    case 'file':
      return (
        typeof content.fileCid === 'string' &&
        typeof content.fileName === 'string' &&
        typeof content.fileSize === 'number'
      );
    case 'voice':
      return (
        typeof content.audioCid === 'string' &&
        typeof content.duration === 'number'
      );
    case 'location':
      return (
        typeof content.latitude === 'number' &&
        typeof content.longitude === 'number'
      );
    case 'contact':
      return (
        typeof content.contactName === 'string' &&
        typeof content.contactAddress === 'string'
      );
    case 'system':
      return (
        typeof content.content === 'string' &&
        typeof content.systemType === 'string'
      );
    default:
      return false;
  }
};

// Message formatting helpers
export const getMessagePreview = (message: Message): string => {
  switch (message.content.type) {
    case 'text':
      return message.content.content;
    case 'image':
      return message.content.caption || '📷 Image';
    case 'file':
      return `📎 ${message.content.fileName}`;
    case 'voice':
      return `🎤 Voice message (${Math.round(message.content.duration)}s)`;
    case 'video':
      return `🎥 Video (${Math.round(message.content.duration)}s)`;
    case 'location':
      return '📍 Location';
    case 'contact':
      return `👤 ${message.content.contactName}`;
    case 'sticker':
      return '😀 Sticker';
    case 'poll':
      return `📊 Poll: ${message.content.question}`;
    case 'system':
      return message.content.content;
    default:
      return 'Message';
  }
};

export const getMessageIcon = (message: Message): string => {
  switch (message.content.type) {
    case 'text':
      return '💬';
    case 'image':
      return '📷';
    case 'file':
      return '📎';
    case 'voice':
      return '🎤';
    case 'video':
      return '🎥';
    case 'location':
      return '📍';
    case 'contact':
      return '👤';
    case 'sticker':
      return '😀';
    case 'poll':
      return '📊';
    case 'system':
      return 'ℹ️';
    default:
      return '💬';
  }
};
