import { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { useWeb3ChatStore } from '@/store/web3Store';

// Contract ABI - will be generated from the enhanced ChatApp.sol
export const ChatAppABI = [
  // User management
  "function registerUser(string calldata username, string calldata bio, string calldata avatarCid, bytes32 publicKey) external",
  "function updateProfile(string calldata bio, string calldata avatarCid) external",
  "function updatePublicKey(bytes32 publicKey) external",
  "function getUserProfile(address user) external view returns (tuple(string username, string bio, string avatarCid, bytes32 x25519PublicKey, uint256 reputation, bool isActive, uint256 createdAt, uint256 lastSeen))",
  
  // Friend management
  "function sendFriendRequest(address friend) external",
  "function acceptFriendRequest(address friend) external",
  "function removeFriend(address friend) external",
  "function getFriends(address user) external view returns (address[])",
  "function getFriendRequests(address user) external view returns (tuple(address from, address to, uint256 timestamp, bool isActive)[])",
  
  // Group management
  "function createGroup(string calldata name, string calldata description, string calldata avatarCid, address[] calldata initialMembers) external returns (uint256)",
  "function joinGroup(uint256 groupId) external",
  "function leaveGroup(uint256 groupId) external",
  "function getUserGroups(address user) external view returns (uint256[])",
  "function getGroupInfo(uint256 groupId) external view returns (tuple(string name, string description, string avatarCid, address creator, address[] members, uint256 createdAt, bool isActive))",
  
  // Messaging
  "function sendMessage(address receiver, string calldata contentCid, string calldata messageType) external",
  "function sendGroupMessage(uint256 groupId, string calldata contentCid, string calldata messageType) external",
  "function getConversation(address user1, address user2) external view returns (tuple(address sender, uint256 timestamp, string contentCid, string messageType, uint256 replyTo, bool isEdited, uint256 editTimestamp)[])",
  "function getGroupMessages(uint256 groupId) external view returns (tuple(address sender, uint256 timestamp, string contentCid, string messageType, uint256 replyTo, bool isEdited, uint256 editTimestamp)[])",
  
  // Reputation
  "function rateUser(address user, uint256 rating) external",
  
  // Events
  "event UserRegistered(address indexed user, string username, bytes32 publicKey)",
  "event ProfileUpdated(address indexed user, string bio, string avatarCid)",
  "event FriendRequestSent(address indexed from, address indexed to)",
  "event FriendRequestAccepted(address indexed from, address indexed to)",
  "event FriendAdded(address indexed user, address indexed friend)",
  "event FriendRemoved(address indexed user, address indexed friend)",
  "event GroupCreated(uint256 indexed groupId, address indexed creator, string name)",
  "event GroupJoined(uint256 indexed groupId, address indexed user)",
  "event GroupLeft(uint256 indexed groupId, address indexed user)",
  "event MessageSent(address indexed sender, address indexed receiver, bytes32 indexed conversationKey, string contentCid, uint256 timestamp)",
  "event GroupMessageSent(uint256 indexed groupId, address indexed sender, string contentCid, uint256 timestamp)",
  "event ReputationUpdated(address indexed user, uint256 newReputation)"
] as const;

export interface UserProfile {
  username: string;
  bio: string;
  avatarCid: string;
  x25519PublicKey: string;
  reputation: number;
  isActive: boolean;
  createdAt: number;
  lastSeen: number;
}

export interface GroupChat {
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
}

export interface FriendRequest {
  from: string;
  to: string;
  timestamp: number;
  isActive: boolean;
}

class Web3Api {
  private publicClient: any;
  private walletClient: any;
  private contractAddress: string;
  private contract: any;

  constructor() {
    this.contractAddress = process.env.NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS!;
    
    // Initialize public client for read operations
    this.publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology')
    });

    // Initialize wallet client for write operations
    this.walletClient = createWalletClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology')
    });

    // Initialize contract instance
    this.contract = getContract({
      address: this.contractAddress as `0x${string}`,
      abi: ChatAppABI,
      client: this.publicClient
    });
  }

  // Read operations (no gas fees)
  async getUserProfile(address: string): Promise<UserProfile> {
    try {
      const data = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getUserProfile',
        args: [address as `0x${string}`]
      });
      
      return this.parseUserProfile(data);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async getFriends(address: string): Promise<string[]> {
    try {
      const friends = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getFriends',
        args: [address as `0x${string}`]
      });
      
      return friends;
    } catch (error) {
      console.error('Failed to get friends:', error);
      throw new Error('Failed to fetch friends');
    }
  }

  async getConversation(user1: string, user2: string): Promise<Message[]> {
    try {
      const messages = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getConversation',
        args: [user1 as `0x${string}`, user2 as `0x${string}`]
      });
      
      return messages.map(this.parseMessage);
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
  }

  async getGroupMessages(groupId: number): Promise<Message[]> {
    try {
      const messages = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getGroupMessages',
        args: [BigInt(groupId)]
      });
      
      return messages.map(this.parseMessage);
    } catch (error) {
      console.error('Failed to get group messages:', error);
      throw new Error('Failed to fetch group messages');
    }
  }

  async getUserGroups(address: string): Promise<number[]> {
    try {
      const groups = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getUserGroups',
        args: [address as `0x${string}`]
      });
      
      return groups.map(Number);
    } catch (error) {
      console.error('Failed to get user groups:', error);
      throw new Error('Failed to fetch user groups');
    }
  }

  async getGroupInfo(groupId: number): Promise<GroupChat> {
    try {
      const data = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getGroupInfo',
        args: [BigInt(groupId)]
      });
      
      return this.parseGroupChat(data);
    } catch (error) {
      console.error('Failed to get group info:', error);
      throw new Error('Failed to fetch group info');
    }
  }

  async getFriendRequests(address: string): Promise<FriendRequest[]> {
    try {
      const requests = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'getFriendRequests',
        args: [address as `0x${string}`]
      });
      
      return requests.map(this.parseFriendRequest);
    } catch (error) {
      console.error('Failed to get friend requests:', error);
      throw new Error('Failed to fetch friend requests');
    }
  }

  // Write operations (require gas fees)
  async registerUser(
    username: string,
    bio: string,
    avatarCid: string,
    publicKey: string
  ): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'registerUser',
        args: [username, bio, avatarCid, publicKey as `0x${string}`]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to register user:', error);
      throw new Error('Failed to register user');
    }
  }

  async updateProfile(bio: string, avatarCid: string): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'updateProfile',
        args: [bio, avatarCid]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  async sendFriendRequest(friendAddress: string): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'sendFriendRequest',
        args: [friendAddress as `0x${string}`]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      throw new Error('Failed to send friend request');
    }
  }

  async acceptFriendRequest(friendAddress: string): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'acceptFriendRequest',
        args: [friendAddress as `0x${string}`]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      throw new Error('Failed to accept friend request');
    }
  }

  async removeFriend(friendAddress: string): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'removeFriend',
        args: [friendAddress as `0x${string}`]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to remove friend:', error);
      throw new Error('Failed to remove friend');
    }
  }

  async createGroup(
    name: string,
    description: string,
    avatarCid: string,
    initialMembers: string[]
  ): Promise<number> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'createGroup',
        args: [name, description, avatarCid, initialMembers.map(addr => addr as `0x${string}`)]
      });
      
      // Wait for transaction to be mined and get the group ID from events
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const logs = receipt.logs;
      
      // Find the GroupCreated event
      for (const log of logs) {
        if (log.topics[0] === '0x...') { // GroupCreated event signature
          // Parse the group ID from the event
          const groupId = parseInt(log.topics[1], 16);
          return groupId;
        }
      }
      
      throw new Error('Group creation event not found');
    } catch (error) {
      console.error('Failed to create group:', error);
      throw new Error('Failed to create group');
    }
  }

  async joinGroup(groupId: number): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'joinGroup',
        args: [BigInt(groupId)]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to join group:', error);
      throw new Error('Failed to join group');
    }
  }

  async leaveGroup(groupId: number): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'leaveGroup',
        args: [BigInt(groupId)]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw new Error('Failed to leave group');
    }
  }

  async sendMessage(
    receiver: string,
    contentCid: string,
    messageType: string
  ): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'sendMessage',
        args: [receiver as `0x${string}`, contentCid, messageType]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }

  async sendGroupMessage(
    groupId: number,
    contentCid: string,
    messageType: string
  ): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'sendGroupMessage',
        args: [BigInt(groupId), contentCid, messageType]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to send group message:', error);
      throw new Error('Failed to send group message');
    }
  }

  async rateUser(userAddress: string, rating: number): Promise<string> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        functionName: 'rateUser',
        args: [userAddress as `0x${string}`, BigInt(rating)]
      });
      
      return hash;
    } catch (error) {
      console.error('Failed to rate user:', error);
      throw new Error('Failed to rate user');
    }
  }

  // Event listening for real-time updates
  async watchEvents(callback: (event: any) => void) {
    try {
      this.publicClient.watchContractEvent({
        address: this.contractAddress as `0x${string}`,
        abi: ChatAppABI,
        eventName: 'MessageSent',
        onLogs: (logs) => {
          logs.forEach(log => callback(log));
        }
      });
    } catch (error) {
      console.error('Failed to watch events:', error);
    }
  }

  // Helper methods for parsing contract data
  private parseUserProfile(data: any): UserProfile {
    return {
      username: data.username,
      bio: data.bio,
      avatarCid: data.avatarCid,
      x25519PublicKey: data.x25519PublicKey,
      reputation: Number(data.reputation),
      isActive: data.isActive,
      createdAt: Number(data.createdAt),
      lastSeen: Number(data.lastSeen)
    };
  }

  private parseMessage(data: any): Message {
    return {
      sender: data.sender,
      timestamp: Number(data.timestamp),
      contentCid: data.contentCid,
      messageType: data.messageType,
      replyTo: Number(data.replyTo),
      isEdited: data.isEdited,
      editTimestamp: Number(data.editTimestamp)
    };
  }

  private parseGroupChat(data: any): GroupChat {
    return {
      name: data.name,
      description: data.description,
      avatarCid: data.avatarCid,
      creator: data.creator,
      members: data.members,
      createdAt: Number(data.createdAt),
      isActive: data.isActive
    };
  }

  private parseFriendRequest(data: any): FriendRequest {
    return {
      from: data.from,
      to: data.to,
      timestamp: Number(data.timestamp),
      isActive: data.isActive
    };
  }

  // Get all registered users (for user discovery)
  async getAllUsers(): Promise<Array<UserProfile & { address: string }>> {
    try {
      // Call backend API for user discovery
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/users/discover`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Failed to get all users:', error);
      return []; // Return empty array instead of throwing to prevent UI crashes
    }
  }

  // Search users by username or address
  async searchUsers(query: string): Promise<Array<UserProfile & { address: string }>> {
    try {
      // Use backend search API for better performance
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/users/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Failed to search users:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Reject friend request
  async rejectFriendRequest(fromAddress: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: The current smart contract doesn't have a reject function
      // You would need to add this to the smart contract
      // For now, we'll simulate it by not accepting
      console.warn('rejectFriendRequest: This requires smart contract modification');
      
      // In a real implementation, you would call:
      // await walletClient.writeContract({
      //   address: this.contractAddress,
      //   abi: ChatAppABI,
      //   functionName: 'rejectFriendRequest',
      //   args: [fromAddress],
      //   account
      // });
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      throw error;
    }
  }

  // Update group name
  async updateGroupName(groupId: number, newName: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('updateGroupName: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to update group name:', error);
      throw error;
    }
  }

  // Update group description
  async updateGroupDescription(groupId: number, newDescription: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('updateGroupDescription: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to update group description:', error);
      throw error;
    }
  }

  // Update group avatar
  async updateGroupAvatar(groupId: number, avatarCid: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('updateGroupAvatar: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to update group avatar:', error);
      throw error;
    }
  }

  // Add member to group
  async addGroupMember(groupId: number, memberAddress: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('addGroupMember: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to add group member:', error);
      throw error;
    }
  }

  // Remove member from group
  async removeGroupMember(groupId: number, memberAddress: string): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('removeGroupMember: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to remove group member:', error);
      throw error;
    }
  }

  // Delete group
  async deleteGroup(groupId: number): Promise<void> {
    try {
      const walletClient = this.getWalletClient();
      const account = this.getAccount();

      // Note: Add this function to your smart contract
      console.warn('deleteGroup: This requires smart contract modification');
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }
}

export const web3Api = new Web3Api();
