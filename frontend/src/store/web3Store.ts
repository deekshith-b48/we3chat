import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
export interface UserProfile {
  username: string;
  bio: string;
  avatarCid: string;
  publicKey: string;
  reputation: number;
  isActive: boolean;
  createdAt: number;
  lastSeen: number;
}

export interface Friend {
  address: string;
  name: string;
  avatarCid: string;
  publicKey: string;
  reputation: number;
  lastSeen: number;
  addedAt: number;
}

export interface GroupChat {
  id: number;
  name: string;
  description: string;
  avatarCid: string;
  creator: string;
  members: string[];
  createdAt: number;
  isActive: boolean;
}

export interface Message {
  sender: string;
  timestamp: number;
  contentCid: string;
  messageType: string;
  replyTo: number;
  isEdited: boolean;
  editTimestamp: number;
  content?: string; // Decrypted content
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupId?: number;
}

export interface FriendRequest {
  from: string;
  to: string;
  timestamp: number;
  isActive: boolean;
}

interface Web3ChatState {
  // Contract state
  userProfile: UserProfile | null;
  friends: Friend[];
  conversations: Conversation[];
  groupChats: GroupChat[];
  messages: Message[];
  friendRequests: FriendRequest[];
  
  // Web3 state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  contractAddress: string | null;
  isRegistered: boolean;
  
  // UI state
  selectedConversation: string | null;
  selectedGroup: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWeb3State: (state: Partial<Pick<Web3ChatState, 'isConnected' | 'account' | 'chainId' | 'contractAddress'>>) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setFriends: (friends: Friend[]) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (address: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setGroupChats: (groups: GroupChat[]) => void;
  addGroupChat: (group: GroupChat) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (from: string) => void;
  
  // UI actions
  setSelectedConversation: (id: string | null) => void;
  setSelectedGroup: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Web3 actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  registerUser: (username: string, bio: string, avatarCid: string, publicKey: string) => Promise<void>;
  updateProfile: (bio: string, avatarCid: string) => Promise<void>;
  sendFriendRequest: (friendAddress: string) => Promise<void>;
  acceptFriendRequest: (friendAddress: string) => Promise<void>;
  removeFriend: (friendAddress: string) => Promise<void>;
  createGroup: (name: string, description: string, avatarCid: string, members: string[]) => Promise<number>;
  joinGroup: (groupId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
  sendMessage: (receiver: string, content: string, type: string) => Promise<void>;
  sendGroupMessage: (groupId: number, content: string, type: string) => Promise<void>;
  rateUser: (userAddress: string, rating: number) => Promise<void>;
  
  // Data loading
  loadUserProfile: () => Promise<void>;
  loadFriends: () => Promise<void>;
  loadConversations: () => Promise<void>;
  loadGroupChats: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadGroupMessages: (groupId: number) => Promise<void>;
  loadFriendRequests: () => Promise<void>;
}

export const useWeb3ChatStore = create<Web3ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    userProfile: null,
    friends: [],
    conversations: [],
    groupChats: [],
    messages: [],
    friendRequests: [],
    isConnected: false,
    account: null,
    chainId: null,
    contractAddress: null,
    isRegistered: false,
    selectedConversation: null,
    selectedGroup: null,
    isLoading: false,
    error: null,

    // State setters
    setWeb3State: (state) => set(state),
    setUserProfile: (profile) => set({ userProfile: profile, isRegistered: !!profile }),
    setFriends: (friends) => set({ friends }),
    addFriend: (friend) => set((state) => ({ friends: [...state.friends, friend] })),
    removeFriend: (address) => set((state) => ({ 
      friends: state.friends.filter(f => f.address !== address) 
    })),
    setConversations: (conversations) => set({ conversations }),
    addConversation: (conversation) => set((state) => ({ 
      conversations: [...state.conversations, conversation] 
    })),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({ 
      messages: [...state.messages, message] 
    })),
    setGroupChats: (groups) => set({ groupChats: groups }),
    addGroupChat: (group) => set((state) => ({ 
      groupChats: [...state.groupChats, group] 
    })),
    setFriendRequests: (requests) => set({ friendRequests: requests }),
    addFriendRequest: (request) => set((state) => ({ 
      friendRequests: [...state.friendRequests, request] 
    })),
    removeFriendRequest: (from) => set((state) => ({ 
      friendRequests: state.friendRequests.filter(r => r.from !== from) 
    })),

    // UI actions
    setSelectedConversation: (id) => set({ selectedConversation: id, selectedGroup: null }),
    setSelectedGroup: (id) => set({ selectedGroup: id, selectedConversation: null }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // Web3 actions (implementations will be added with actual contract calls)
    connectWallet: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with wagmi integration
        console.log('Connecting wallet...');
        set({ isConnected: true });
      } catch (error) {
        set({ error: 'Failed to connect wallet' });
      } finally {
        set({ isLoading: false });
      }
    },

    disconnectWallet: () => {
      set({ 
        isConnected: false, 
        account: null, 
        chainId: null,
        userProfile: null,
        isRegistered: false,
        friends: [],
        conversations: [],
        groupChats: [],
        messages: [],
        friendRequests: []
      });
    },

    registerUser: async (username, bio, avatarCid, publicKey) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Registering user:', { username, bio, avatarCid, publicKey });
        set({ isRegistered: true });
      } catch (error) {
        set({ error: 'Failed to register user' });
      } finally {
        set({ isLoading: false });
      }
    },

    updateProfile: async (bio, avatarCid) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Updating profile:', { bio, avatarCid });
      } catch (error) {
        set({ error: 'Failed to update profile' });
      } finally {
        set({ isLoading: false });
      }
    },

    sendFriendRequest: async (friendAddress) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Sending friend request to:', friendAddress);
      } catch (error) {
        set({ error: 'Failed to send friend request' });
      } finally {
        set({ isLoading: false });
      }
    },

    acceptFriendRequest: async (friendAddress) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Accepting friend request from:', friendAddress);
      } catch (error) {
        set({ error: 'Failed to accept friend request' });
      } finally {
        set({ isLoading: false });
      }
    },

    removeFriend: async (friendAddress) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Removing friend:', friendAddress);
      } catch (error) {
        set({ error: 'Failed to remove friend' });
      } finally {
        set({ isLoading: false });
      }
    },

    createGroup: async (name, description, avatarCid, members) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Creating group:', { name, description, avatarCid, members });
        return 1; // Placeholder group ID
      } catch (error) {
        set({ error: 'Failed to create group' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    joinGroup: async (groupId) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Joining group:', groupId);
      } catch (error) {
        set({ error: 'Failed to join group' });
      } finally {
        set({ isLoading: false });
      }
    },

    leaveGroup: async (groupId) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Leaving group:', groupId);
      } catch (error) {
        set({ error: 'Failed to leave group' });
      } finally {
        set({ isLoading: false });
      }
    },

    sendMessage: async (receiver, content, type) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls and encryption
        console.log('Sending message:', { receiver, content, type });
      } catch (error) {
        set({ error: 'Failed to send message' });
      } finally {
        set({ isLoading: false });
      }
    },

    sendGroupMessage: async (groupId, content, type) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls and encryption
        console.log('Sending group message:', { groupId, content, type });
      } catch (error) {
        set({ error: 'Failed to send group message' });
      } finally {
        set({ isLoading: false });
      }
    },

    rateUser: async (userAddress, rating) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Rating user:', { userAddress, rating });
      } catch (error) {
        set({ error: 'Failed to rate user' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Data loading actions
    loadUserProfile: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading user profile...');
      } catch (error) {
        set({ error: 'Failed to load user profile' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadFriends: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading friends...');
      } catch (error) {
        set({ error: 'Failed to load friends' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadConversations: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading conversations...');
      } catch (error) {
        set({ error: 'Failed to load conversations' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadGroupChats: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading group chats...');
      } catch (error) {
        set({ error: 'Failed to load group chats' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadMessages: async (conversationId) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading messages for conversation:', conversationId);
      } catch (error) {
        set({ error: 'Failed to load messages' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadGroupMessages: async (groupId) => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading group messages for:', groupId);
      } catch (error) {
        set({ error: 'Failed to load group messages' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadFriendRequests: async () => {
      set({ isLoading: true, error: null });
      try {
        // Implementation will be added with contract calls
        console.log('Loading friend requests...');
      } catch (error) {
        set({ error: 'Failed to load friend requests' });
      } finally {
        set({ isLoading: false });
      }
    },
  }))
);
