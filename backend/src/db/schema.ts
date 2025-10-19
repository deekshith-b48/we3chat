import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  address: string;
  username?: string;
  bio?: string;
  avatar?: string;
  publicKey?: string;
  nonce?: string;
  isRegistered: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  address: { type: String, required: true, unique: true, index: true },
  username: { type: String, maxlength: 50, index: true },
  bio: String,
  avatar: String,
  publicKey: String,
  nonce: { type: String, maxlength: 32 },
  isRegistered: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Settings Schema
export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  theme: string;
  notifications: boolean;
  soundEnabled: boolean;
  autoConnect: boolean;
  language: string;
  privacy: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  theme: { type: String, default: 'light' },
  notifications: { type: Boolean, default: true },
  soundEnabled: { type: Boolean, default: true },
  autoConnect: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  privacy: { type: String, default: 'friends' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Friendship Schema
export interface IFriendship extends Document {
  requesterId: mongoose.Types.ObjectId;
  addresseeId: mongoose.Types.ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>({
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  addresseeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Conversation Schema
export interface IConversation extends Document {
  type: string;
  name?: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  type: { type: String, default: 'direct', index: true },
  name: { type: String, maxlength: 100 },
  description: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastMessageAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Conversation Member Schema
export interface IConversationMember extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: string;
  joinedAt: Date;
  lastReadAt?: Date;
}

const conversationMemberSchema = new Schema<IConversationMember>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  lastReadAt: Date
});

// Message Schema
export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content?: string;
  type: string;
  txHash?: string;
  blockNumber?: number;
  cidHash?: string;
  cid?: string;
  status: string;
  replyToId?: mongoose.Types.ObjectId;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: String,
  type: { type: String, default: 'text' },
  txHash: { type: String, maxlength: 66, index: true },
  blockNumber: Number,
  cidHash: { type: String, maxlength: 66, index: true },
  cid: String,
  status: { type: String, default: 'pending', index: true },
  replyToId: { type: Schema.Types.ObjectId, ref: 'Message' },
  editedAt: Date,
  deletedAt: Date,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Message Reaction Schema
export interface IMessageReaction extends Document {
  messageId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

const messageReactionSchema = new Schema<IMessageReaction>({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  emoji: { type: String, required: true, maxlength: 10 },
  createdAt: { type: Date, default: Date.now }
});

// Session Schema
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
userSchema.index({ address: 1 });
userSchema.index({ username: 1 });
friendshipSchema.index({ requesterId: 1, addresseeId: 1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Create and export models
export const User = mongoose.model<IUser>('User', userSchema);
export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);
export const Friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
export const ConversationMember = mongoose.model<IConversationMember>('ConversationMember', conversationMemberSchema);
export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const MessageReaction = mongoose.model<IMessageReaction>('MessageReaction', messageReactionSchema);
export const Session = mongoose.model<ISession>('Session', sessionSchema);

// Export types for compatibility
export type NewUser = Partial<IUser>;
export type NewMessage = Partial<IMessage>;
