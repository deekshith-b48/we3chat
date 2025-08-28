import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ethers } from 'ethers';

export interface Friend {
  address: string;
  username: string;
  publicKey: string;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: number;
  cidHash: string;
  cid: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  isEncrypted?: boolean;
  decryptionError?: string;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
  errorMessage?: string;
}

export interface User {
  address: string;
  username: string;
  publicKey: string;
  isRegistered: boolean;
}

interface ChatState {
  // Wallet & User State
  isConnected: boolean;
  address: string | null;
  user: User | null;
  isCorrectNetwork: boolean;
  
  // Encryption Keys
  myPublicKeyHex: string | null;
  myPrivateKey: Uint8Array | null;
  
  // Friends & Conversations
  friends: Friend[];
  conversations: Record<string, Message[]>; // friendAddress -> messages
  
  // UI State
  selectedFriend: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Transaction Tracking
  transactions: Record<string, TransactionStatus>;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setAddress: (address: string | null) => void;
  setUser: (user: User | null) => void;
  setCorrectNetwork: (correct: boolean) => void;
  setKeys: (publicKey: string, privateKey: Uint8Array) => void;
  clearKeys: () => void;
  
  // Friends
  setFriends: (friends: Friend[]) => void;
  addFriend: (friend: Friend) => void;
  updateFriend: (address: string, updates: Partial<Friend>) => void;
  
  // Messages
  addMessage: (friendAddress: string, message: Message) => void;
  updateMessage: (friendAddress: string, messageId: string, updates: Partial<Message>) => void;
  setConversation: (friendAddress: string, messages: Message[]) => void;
  clearConversations: () => void;
  
  // UI
  setSelectedFriend: (address: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Transactions
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (hash: string, updates: Partial<TransactionStatus>) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  isConnected: false,
  address: null,
  user: null,
  isCorrectNetwork: false,
  myPublicKeyHex: null,
  myPrivateKey: null,
  friends: [],
  conversations: {},
  selectedFriend: null,
  isLoading: false,
  error: null,
  transactions: {},
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Wallet & User Actions
      setConnected: (connected) => set({ isConnected: connected }),
      setAddress: (address) => set({ address }),
      setUser: (user) => set({ user }),
      setCorrectNetwork: (correct) => set({ isCorrectNetwork: correct }),
      
      // Key Management
      setKeys: (publicKey, privateKey) => set({ 
        myPublicKeyHex: publicKey, 
        myPrivateKey: privateKey 
      }),
      clearKeys: () => set({ 
        myPublicKeyHex: null, 
        myPrivateKey: null 
      }),
      
      // Friends Management
      setFriends: (friends) => set({ friends }),
      addFriend: (friend) => set((state) => ({
        friends: [...state.friends.filter(f => f.address !== friend.address), friend]
      })),
      updateFriend: (address, updates) => set((state) => ({
        friends: state.friends.map(f => 
          f.address === address ? { ...f, ...updates } : f
        )
      })),
      
      // Message Management
      addMessage: (friendAddress, message) => set((state) => ({
        conversations: {
          ...state.conversations,
          [friendAddress]: [
            ...(state.conversations[friendAddress] || []),
            message
          ].sort((a, b) => a.timestamp - b.timestamp)
        }
      })),
      
      updateMessage: (friendAddress, messageId, updates) => set((state) => ({
        conversations: {
          ...state.conversations,
          [friendAddress]: (state.conversations[friendAddress] || []).map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }
      })),
      
      setConversation: (friendAddress, messages) => set((state) => ({
        conversations: {
          ...state.conversations,
          [friendAddress]: messages.sort((a, b) => a.timestamp - b.timestamp)
        }
      })),
      
      clearConversations: () => set({ conversations: {} }),
      
      // UI Actions
      setSelectedFriend: (address) => set({ selectedFriend: address }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // Transaction Management
      addTransaction: (tx) => set((state) => ({
        transactions: {
          ...state.transactions,
          [tx.hash]: tx
        }
      })),
      
      updateTransaction: (hash, updates) => set((state) => ({
        transactions: {
          ...state.transactions,
          [hash]: state.transactions[hash] ? 
            { ...state.transactions[hash], ...updates } : 
            { hash, status: 'pending', timestamp: Date.now(), ...updates }
        }
      })),
      
      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'we3chat-store',
      partialize: (state) => ({
        // Persist only specific fields
        friends: state.friends,
        conversations: state.conversations,
        transactions: state.transactions,
        // Don't persist sensitive data like private keys
      }),
      version: 1,
    }
  )
);

// Selectors for computed values
export const useCurrentConversation = () => {
  const selectedFriend = useChatStore(state => state.selectedFriend);
  const conversations = useChatStore(state => state.conversations);
  return selectedFriend ? conversations[selectedFriend] || [] : [];
};

export const useUnreadCounts = () => {
  const conversations = useChatStore(state => state.conversations);
  const friends = useChatStore(state => state.friends);
  
  return friends.reduce((counts, friend) => {
    const messages = conversations[friend.address] || [];
    const unreadCount = messages.filter(msg => 
      msg.sender !== useChatStore.getState().address && 
      msg.status === 'confirmed'
    ).length;
    
    return {
      ...counts,
      [friend.address]: unreadCount
    };
  }, {} as Record<string, number>);
};

export const usePendingTransactions = () => {
  const transactions = useChatStore(state => state.transactions);
  return Object.values(transactions).filter(tx => tx.status === 'pending');
};

export const useSelectedFriend = () => {
  const selectedFriend = useChatStore(state => state.selectedFriend);
  const friends = useChatStore(state => state.friends);
  return friends.find(f => f.address === selectedFriend) || null;
};

// Helper function to generate message ID
export function generateMessageId(sender: string, receiver: string, timestamp: number): string {
  return `${sender}-${receiver}-${timestamp}`;
}

// Helper function to sort messages by timestamp
export function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}
