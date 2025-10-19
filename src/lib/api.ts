import { io, Socket } from 'socket.io-client';

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '') // same-origin when empty
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

// Types for API responses
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  address: string;
  username?: string;
  bio?: string;
  avatar?: string;
  publicKey?: string;
  isRegistered: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  autoConnect: boolean;
  language: string;
  privacy: 'public' | 'friends' | 'private';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  otherParticipant?: User;
  members: User[];
  lastMessage?: {
    id: string;
    content: string;
    sender: User;
    createdAt: string;
    type: string;
  };
  lastMessageAt?: string;
  memberInfo: {
    joinedAt: string;
    lastReadAt?: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  txHash?: string;
  blockNumber?: number;
  cidHash?: string;
  cid?: string;
  status: 'pending' | 'confirmed' | 'failed';
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
      id: string;
      username: string;
    };
  };
  reactions: Array<{
    id: string;
    emoji: string;
    user: {
      id: string;
      username: string;
    };
    createdAt: string;
  }>;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API client class
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    
    // Try to get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (e) {
      const hint = this.baseUrl
        ? `Cannot reach API at ${this.baseUrl}. Set NEXT_PUBLIC_API_URL or ensure backend is reachable.`
        : `Cannot reach same-origin /api. Set NEXT_PUBLIC_API_URL to your backend URL.`;
      throw new Error(`Network error: ${hint}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.error || errorMsg;
      } catch {
        if (text) errorMsg = `${errorMsg}: ${text}`;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Authentication endpoints
  async getNonce(): Promise<{ nonce: string }> {
    return this.request('/api/auth/nonce');
  }

  async verifyMessage(message: string, signature: string): Promise<{ token: string; user: User }> {
    const response = await this.request<{ token: string; user: User }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout(): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
    
    this.setToken(null);
    return response;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/api/auth/me');
  }

  // User endpoints
  async getUserProfile(address: string): Promise<User> {
    return this.request(`/api/users/profile/${address}`);
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserSettings(): Promise<UserSettings> {
    return this.request('/api/users/settings');
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request('/api/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async searchUsers(query: string, limit = 10): Promise<{ users: User[] }> {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getFriends(): Promise<{ friends: User[] }> {
    return this.request('/api/users/friends');
  }

  async sendFriendRequest(address: string): Promise<{ message: string; friendship: any }> {
    return this.request('/api/users/friends/request', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  async respondToFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<{ message: string }> {
    return this.request(`/api/users/friends/${friendshipId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  // Conversation endpoints
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    return this.request('/api/conversations');
  }

  async createConversation(data: {
    type?: 'direct' | 'group';
    participantAddress?: string;
    name?: string;
    description?: string;
  }): Promise<{ conversation: Conversation }> {
    return this.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversation(id: string): Promise<{ conversation: Conversation }> {
    return this.request(`/api/conversations/${id}`);
  }

  async markConversationAsRead(id: string): Promise<{ message: string }> {
    return this.request(`/api/conversations/${id}/read`, {
      method: 'PUT',
    });
  }

  async leaveConversation(id: string): Promise<{ message: string }> {
    return this.request(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async getMessages(conversationId: string, options?: {
    limit?: number;
    offset?: number;
    before?: string;
  }): Promise<{ messages: Message[] }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.before) params.append('before', options.before);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/messages/${conversationId}${query}`);
  }

  async sendMessage(data: {
    conversationId: string;
    content: string;
    type?: string;
    txHash?: string;
    blockNumber?: number;
    cidHash?: string;
    cid?: string;
    replyToId?: string;
  }): Promise<{ message: Message }> {
    return this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMessage(id: string, data: {
    status?: string;
    txHash?: string;
    blockNumber?: number;
    content?: string;
  }): Promise<{ message: Partial<Message> }> {
    return this.request(`/api/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addReaction(messageId: string, emoji: string): Promise<{ message: string; reaction?: any }> {
    return this.request(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async deleteMessage(id: string): Promise<{ message: string }> {
    return this.request(`/api/messages/${id}`, {
      method: 'DELETE',
    });
  }
}

// Socket.io client
class SocketClient {
  private socket: Socket | null = null;
  // private token: string | null = null;

  connect(token: string) {
    // this.token = token;
    
    if (this.socket) {
      this.disconnect();
    }

    const base = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    this.socket = io(base, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Convenience methods for common socket events
  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leave_conversation', { conversationId });
  }

  sendMessage(data: {
    conversationId: string;
    content: string;
    type?: string;
    replyToId?: string;
    tempId?: string;
  }) {
    this.socket?.emit('send_message', data);
  }

  updateMessageStatus(data: {
    messageId: string;
    status: string;
    txHash?: string;
    blockNumber?: number;
  }) {
    this.socket?.emit('update_message_status', data);
  }

  startTyping(conversationId: string) {
    this.socket?.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string) {
    this.socket?.emit('typing_stop', { conversationId });
  }

  updatePresence(status: 'online' | 'away' | 'busy' | 'offline') {
    this.socket?.emit('update_presence', { status });
  }
}

// Create singleton instances
export const api = new ApiClient();
export const socketClient = new SocketClient();

// Export convenience functions
export const connectSocket = (token: string) => socketClient.connect(token);
export const disconnectSocket = () => socketClient.disconnect();
export const getSocket = () => socketClient.getSocket();
