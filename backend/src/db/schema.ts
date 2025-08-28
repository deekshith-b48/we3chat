import { pgTable, uuid, varchar, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - tracks wallet addresses and profile info
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: varchar('address', { length: 42 }).notNull().unique(),
  username: varchar('username', { length: 50 }),
  bio: text('bio'),
  avatar: text('avatar'), // IPFS hash or URL
  publicKey: text('public_key'), // X25519 public key for encryption
  nonce: varchar('nonce', { length: 32 }), // For SIWE authentication
  isRegistered: boolean('is_registered').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  addressIdx: index('users_address_idx').on(table.address),
  usernameIdx: index('users_username_idx').on(table.username),
}));

// User settings table
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  theme: varchar('theme', { length: 20 }).default('light'),
  notifications: boolean('notifications').default(true),
  soundEnabled: boolean('sound_enabled').default(true),
  autoConnect: boolean('auto_connect').default(false),
  language: varchar('language', { length: 10 }).default('en'),
  privacy: varchar('privacy', { length: 20 }).default('friends'), // 'public', 'friends', 'private'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('user_settings_user_idx').on(table.userId),
}));

// Friendships table - tracks mutual connections
export const friendships = pgTable('friendships', {
  id: uuid('id').defaultRandom().primaryKey(),
  requesterId: uuid('requester_id').references(() => users.id).notNull(),
  addresseeId: uuid('addressee_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'blocked'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  requesterIdx: index('friendships_requester_idx').on(table.requesterId),
  addresseeIdx: index('friendships_addressee_idx').on(table.addresseeId),
  statusIdx: index('friendships_status_idx').on(table.status),
}));

// Conversations table - tracks chat sessions
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 20 }).default('direct'), // 'direct', 'group'
  name: varchar('name', { length: 100 }), // For group chats
  description: text('description'),
  createdBy: uuid('created_by').references(() => users.id),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  typeIdx: index('conversations_type_idx').on(table.type),
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt),
}));

// Conversation members table - tracks who's in each conversation
export const conversationMembers = pgTable('conversation_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
  lastReadAt: timestamp('last_read_at'),
}, (table) => ({
  conversationIdx: index('conv_members_conversation_idx').on(table.conversationId),
  userIdx: index('conv_members_user_idx').on(table.userId),
}));

// Messages table - stores encrypted message metadata and blockchain info
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content'), // Encrypted content or reference to IPFS
  type: varchar('type', { length: 20 }).default('text'), // 'text', 'file', 'image', 'system'
  
  // Blockchain/IPFS data
  txHash: varchar('tx_hash', { length: 66 }), // Ethereum transaction hash
  blockNumber: integer('block_number'),
  cidHash: varchar('cid_hash', { length: 66 }), // keccak256 hash of IPFS CID
  cid: text('cid'), // Full IPFS CID
  
  // Message status
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'confirmed', 'failed'
  
  // Metadata
  replyToId: uuid('reply_to_id').references(() => messages.id),
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
  senderIdx: index('messages_sender_idx').on(table.senderId),
  statusIdx: index('messages_status_idx').on(table.status),
  txHashIdx: index('messages_tx_hash_idx').on(table.txHash),
  cidHashIdx: index('messages_cid_hash_idx').on(table.cidHash),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

// Message reactions table
export const messageReactions = pgTable('message_reactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').references(() => messages.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageIdx: index('reactions_message_idx').on(table.messageId),
  userIdx: index('reactions_user_idx').on(table.userId),
}));

// Sessions table for JWT management
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  tokenIdx: index('sessions_token_idx').on(table.token),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings),
  sentFriendRequests: many(friendships, { relationName: 'requester' }),
  receivedFriendRequests: many(friendships, { relationName: 'addressee' }),
  conversationMemberships: many(conversationMembers),
  sentMessages: many(messages),
  messageReactions: many(messageReactions),
  sessions: many(sessions),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  creator: one(users, {
    fields: [conversations.createdBy],
    references: [users.id],
  }),
  members: many(conversationMembers),
  messages: many(messages),
}));

export const conversationMembersRelations = relations(conversationMembers, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMembers.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationMember = typeof conversationMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type Session = typeof sessions.$inferSelect;
