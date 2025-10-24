/**
 * Enhanced Smart Contract Integration
 * 
 * Handles interaction with the We3Chat smart contract
 */

import { ethers } from 'ethers';
// import { getConfig } from '../utils/config';

// Enhanced Contract ABI for We3Chat
export const WE3CHAT_ABI = [
  // Events
  "event UserRegistered(address indexed user, string username, string displayName, string avatar, bytes32 publicKey, uint256 timestamp)",
  "event ProfileUpdated(address indexed user, string username, string displayName, string avatar, uint256 timestamp)",
  "event FriendRequestSent(address indexed from, address indexed to, uint256 timestamp)",
  "event FriendRequestAccepted(address indexed from, address indexed to, uint256 timestamp)",
  "event FriendRemoved(address indexed from, address indexed to, uint256 timestamp)",
  "event MessageSent(address indexed from, address indexed to, bytes32 indexed messageId, string messageType, bytes32 contentHash, uint256 timestamp, bool isEncrypted)",
  "event GroupCreated(bytes32 indexed groupId, address indexed creator, string name, string description, uint256 timestamp)",
  "event GroupMemberAdded(bytes32 indexed groupId, address indexed member, address indexed addedBy, uint256 timestamp)",
  "event GroupMemberRemoved(bytes32 indexed groupId, address indexed member, address indexed removedBy, uint256 timestamp)",
  "event GroupMessageSent(bytes32 indexed groupId, address indexed from, bytes32 indexed messageId, string messageType, bytes32 contentHash, uint256 timestamp, bool isEncrypted)",
  "event FileShared(address indexed from, address indexed to, bytes32 indexed fileId, string fileName, uint256 fileSize, string fileType, bytes32 ipfsHash, uint256 timestamp)",

  // User Management
  "function registerUser(string memory _username, string memory _displayName, string memory _avatar, bytes32 _publicKey) external",
  "function updateProfile(string memory _username, string memory _displayName, string memory _avatar) external",
  "function updatePublicKey(bytes32 _publicKey) external",
  "function updateLastSeen() external",
  "function setOffline() external",
  "function getUser(address _user) external view returns (tuple(string username, string displayName, string avatar, bytes32 publicKey, bool isRegistered, uint256 registrationTime, uint256 lastSeen, bool isOnline))",

  // Friend Management
  "function sendFriendRequest(address _friend) external",
  "function acceptFriendRequest(address _friend) external",
  "function removeFriend(address _friend) external",
  "function blockFriend(address _friend) external",
  "function unblockFriend(address _friend) external",
  "function getFriends(address _user) external view returns (tuple(address friendAddress, string username, string displayName, string avatar, uint256 addedAt, bool isBlocked)[])",
  "function getFriendRequests(address _user) external view returns (address[])",
  "function isFriends(address _user1, address _user2) external view returns (bool)",

  // Direct Messaging
  "function sendMessage(address _to, string memory _messageType, bytes32 _contentHash, bool _isEncrypted, bytes32 _replyTo) external",
  "function markMessageAsRead(bytes32 _messageId) external",
  "function getMessages(address _user1, address _user2) external view returns (bytes32[])",
  "function getMessage(bytes32 _messageId) external view returns (tuple(address sender, address receiver, bytes32 messageId, string messageType, bytes32 contentHash, uint256 timestamp, bool isEncrypted, bool isRead, bytes32 replyTo))",

  // Group Management
  "function createGroup(string memory _name, string memory _description, address[] memory _initialMembers) external returns (bytes32)",
  "function addGroupMember(bytes32 _groupId, address _member) external",
  "function removeGroupMember(bytes32 _groupId, address _member) external",
  "function sendGroupMessage(bytes32 _groupId, string memory _messageType, bytes32 _contentHash, bool _isEncrypted, bytes32 _replyTo) external",
  "function getGroup(bytes32 _groupId) external view returns (bytes32 groupId, string memory name, string memory description, address creator, address[] memory members, uint256 createdAt, bool isActive)",
  "function getGroupMessages(bytes32 _groupId) external view returns (bytes32[])",
  "function getGroupMessage(bytes32 _messageId) external view returns (tuple(bytes32 groupId, address sender, bytes32 messageId, string messageType, bytes32 contentHash, uint256 timestamp, bool isEncrypted, bytes32 replyTo))",
  "function isGroupMember(bytes32 _groupId, address _user) external view returns (bool)",
  "function isGroupAdmin(bytes32 _groupId, address _user) external view returns (bool)",

  // File Sharing
  "function shareFile(address _to, string memory _fileName, uint256 _fileSize, string memory _fileType, bytes32 _ipfsHash) external",
  "function getFileShare(bytes32 _fileId) external view returns (tuple(bytes32 fileId, string fileName, uint256 fileSize, string fileType, bytes32 ipfsHash, address uploader, uint256 timestamp))",
  "function getUserFiles(address _user) external view returns (bytes32[])"
];

// Enhanced Contract interface types
export interface User {
  username: string;
  displayName: string;
  avatar: string;
  publicKey: string;
  isRegistered: boolean;
  registrationTime: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface Message {
  sender: string;
  receiver: string;
  messageId: string;
  messageType: string;
  contentHash: string;
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  replyTo: string;
}

export interface Friend {
  friendAddress: string;
  username: string;
  displayName: string;
  avatar: string;
  addedAt: number;
  isBlocked: boolean;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  creator: string;
  members: string[];
  createdAt: number;
  isActive: boolean;
}

export interface GroupMessage {
  groupId: string;
  sender: string;
  messageId: string;
  messageType: string;
  contentHash: string;
  timestamp: number;
  isEncrypted: boolean;
  replyTo: string;
}

export interface FileShare {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  ipfsHash: string;
  uploader: string;
  timestamp: number;
}

export interface ContractConfig {
  address: string;
  chainId: number;
  rpcUrl: string;
}

// import { getConfig } from '../utils/config';

// Get contract configuration from config
export function getContractConfig(): ContractConfig {
  // const config = getConfig();
  return {
    address: process.env.NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    chainId: 80002, // Polygon Amoy
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'
  };
}

// Create contract instance
export function createContractInstance(provider: ethers.Provider, contractAddress: string) {
  return new ethers.Contract(contractAddress, WE3CHAT_ABI, provider);
}

// Enhanced Contract interaction functions
export class We3ChatContract {
  private contract: ethers.Contract;
  // private signer: ethers.Signer;

  constructor(contract: ethers.Contract, _signer: ethers.Signer) {
    this.contract = contract;
    // this.signer = signer;
  }

  // User Management
  async registerUser(username: string, displayName: string, avatar: string, publicKey: string): Promise<void> {
    const tx = await this.contract.registerUser(username, displayName, avatar, publicKey);
    await tx.wait();
  }

  async updateProfile(username: string, displayName: string, avatar: string): Promise<void> {
    const tx = await this.contract.updateProfile(username, displayName, avatar);
    await tx.wait();
  }

  async updatePublicKey(publicKey: string): Promise<void> {
    const tx = await this.contract.updatePublicKey(publicKey);
    await tx.wait();
  }

  async updateLastSeen(): Promise<void> {
    const tx = await this.contract.updateLastSeen();
    await tx.wait();
  }

  async setOffline(): Promise<void> {
    const tx = await this.contract.setOffline();
    await tx.wait();
  }

  async getUser(userAddress: string): Promise<User> {
    const user = await this.contract.getUser(userAddress);
    return {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      publicKey: user.publicKey,
      isRegistered: user.isRegistered,
      registrationTime: Number(user.registrationTime),
      lastSeen: Number(user.lastSeen),
      isOnline: user.isOnline
    };
  }

  // Friend Management
  async sendFriendRequest(friendAddress: string): Promise<void> {
    const tx = await this.contract.sendFriendRequest(friendAddress);
    await tx.wait();
  }

  async acceptFriendRequest(friendAddress: string): Promise<void> {
    const tx = await this.contract.acceptFriendRequest(friendAddress);
    await tx.wait();
  }

  async removeFriend(friendAddress: string): Promise<void> {
    const tx = await this.contract.removeFriend(friendAddress);
    await tx.wait();
  }

  async blockFriend(friendAddress: string): Promise<void> {
    const tx = await this.contract.blockFriend(friendAddress);
    await tx.wait();
  }

  async unblockFriend(friendAddress: string): Promise<void> {
    const tx = await this.contract.unblockFriend(friendAddress);
    await tx.wait();
  }

  async getFriends(userAddress: string): Promise<Friend[]> {
    const friends = await this.contract.getFriends(userAddress);
    return friends.map((friend: any) => ({
      friendAddress: friend.friendAddress,
      username: friend.username,
      displayName: friend.displayName,
      avatar: friend.avatar,
      addedAt: Number(friend.addedAt),
      isBlocked: friend.isBlocked
    }));
  }

  async getFriendRequests(userAddress: string): Promise<string[]> {
    return await this.contract.getFriendRequests(userAddress);
  }

  async isFriends(user1: string, user2: string): Promise<boolean> {
    return await this.contract.isFriends(user1, user2);
  }

  // Direct Messaging
  async sendMessage(
    to: string, 
    messageType: string, 
    contentHash: string, 
    isEncrypted: boolean, 
    replyTo: string = ethers.ZeroHash
  ): Promise<void> {
    const tx = await this.contract.sendMessage(to, messageType, contentHash, isEncrypted, replyTo);
    await tx.wait();
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const tx = await this.contract.markMessageAsRead(messageId);
    await tx.wait();
  }

  async getMessages(user1: string, user2: string): Promise<string[]> {
    return await this.contract.getMessages(user1, user2);
  }

  async getMessage(messageId: string): Promise<Message> {
    const message = await this.contract.getMessage(messageId);
    return {
      sender: message.sender,
      receiver: message.receiver,
      messageId: message.messageId,
      messageType: message.messageType,
      contentHash: message.contentHash,
      timestamp: Number(message.timestamp),
      isEncrypted: message.isEncrypted,
      isRead: message.isRead,
      replyTo: message.replyTo
    };
  }

  // Group Management
  async createGroup(name: string, description: string, initialMembers: string[]): Promise<string> {
    const tx = await this.contract.createGroup(name, description, initialMembers);
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'GroupCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      return parsed?.args.groupId;
    }
    
    throw new Error('Group creation event not found');
  }

  async addGroupMember(groupId: string, member: string): Promise<void> {
    const tx = await this.contract.addGroupMember(groupId, member);
    await tx.wait();
  }

  async removeGroupMember(groupId: string, member: string): Promise<void> {
    const tx = await this.contract.removeGroupMember(groupId, member);
    await tx.wait();
  }

  async sendGroupMessage(
    groupId: string, 
    messageType: string, 
    contentHash: string, 
    isEncrypted: boolean, 
    replyTo: string = ethers.ZeroHash
  ): Promise<void> {
    const tx = await this.contract.sendGroupMessage(groupId, messageType, contentHash, isEncrypted, replyTo);
    await tx.wait();
  }

  async getGroup(groupId: string): Promise<Group> {
    const group = await this.contract.getGroup(groupId);
    return {
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      creator: group.creator,
      members: group.members,
      createdAt: Number(group.createdAt),
      isActive: group.isActive
    };
  }

  async getGroupMessages(groupId: string): Promise<string[]> {
    return await this.contract.getGroupMessages(groupId);
  }

  async getGroupMessage(messageId: string): Promise<GroupMessage> {
    const message = await this.contract.getGroupMessage(messageId);
    return {
      groupId: message.groupId,
      sender: message.sender,
      messageId: message.messageId,
      messageType: message.messageType,
      contentHash: message.contentHash,
      timestamp: Number(message.timestamp),
      isEncrypted: message.isEncrypted,
      replyTo: message.replyTo
    };
  }

  async isGroupMember(groupId: string, user: string): Promise<boolean> {
    return await this.contract.isGroupMember(groupId, user);
  }

  async isGroupAdmin(groupId: string, user: string): Promise<boolean> {
    return await this.contract.isGroupAdmin(groupId, user);
  }

  // File Sharing
  async shareFile(
    to: string, 
    fileName: string, 
    fileSize: number, 
    fileType: string, 
    ipfsHash: string
  ): Promise<void> {
    const tx = await this.contract.shareFile(to, fileName, fileSize, fileType, ipfsHash);
    await tx.wait();
  }

  async getFileShare(fileId: string): Promise<FileShare> {
    const fileShare = await this.contract.getFileShare(fileId);
    return {
      fileId: fileShare.fileId,
      fileName: fileShare.fileName,
      fileSize: Number(fileShare.fileSize),
      fileType: fileShare.fileType,
      ipfsHash: fileShare.ipfsHash,
      uploader: fileShare.uploader,
      timestamp: Number(fileShare.timestamp)
    };
  }

  async getUserFiles(userAddress: string): Promise<string[]> {
    return await this.contract.getUserFiles(userAddress);
  }

  // Event Listeners
  onUserRegistered(callback: (user: string, username: string, displayName: string, avatar: string, publicKey: string, timestamp: number) => void) {
    this.contract.on('UserRegistered', callback);
  }

  onProfileUpdated(callback: (user: string, username: string, displayName: string, avatar: string, timestamp: number) => void) {
    this.contract.on('ProfileUpdated', callback);
  }

  onFriendRequestSent(callback: (from: string, to: string, timestamp: number) => void) {
    this.contract.on('FriendRequestSent', callback);
  }

  onFriendRequestAccepted(callback: (from: string, to: string, timestamp: number) => void) {
    this.contract.on('FriendRequestAccepted', callback);
  }

  onFriendRemoved(callback: (from: string, to: string, timestamp: number) => void) {
    this.contract.on('FriendRemoved', callback);
  }

  onMessageSent(callback: (from: string, to: string, messageId: string, messageType: string, contentHash: string, timestamp: number, isEncrypted: boolean) => void) {
    this.contract.on('MessageSent', callback);
  }

  onGroupCreated(callback: (groupId: string, creator: string, name: string, description: string, timestamp: number) => void) {
    this.contract.on('GroupCreated', callback);
  }

  onGroupMemberAdded(callback: (groupId: string, member: string, addedBy: string, timestamp: number) => void) {
    this.contract.on('GroupMemberAdded', callback);
  }

  onGroupMemberRemoved(callback: (groupId: string, member: string, removedBy: string, timestamp: number) => void) {
    this.contract.on('GroupMemberRemoved', callback);
  }

  onGroupMessageSent(callback: (groupId: string, from: string, messageId: string, messageType: string, contentHash: string, timestamp: number, isEncrypted: boolean) => void) {
    this.contract.on('GroupMessageSent', callback);
  }

  onFileShared(callback: (from: string, to: string, fileId: string, fileName: string, fileSize: number, fileType: string, ipfsHash: string, timestamp: number) => void) {
    this.contract.on('FileShared', callback);
  }

  // Remove event listeners
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}

// Utility function to create contract instance with signer
export async function createWe3ChatContract(signer: ethers.Signer): Promise<We3ChatContract> {
  const config = getContractConfig();
  const provider = signer.provider!;
  const contract = createContractInstance(provider, config.address);
  return new We3ChatContract(contract, signer);
}

// Legacy function for backward compatibility
export async function createChatContract(signer: ethers.Signer): Promise<We3ChatContract> {
  return createWe3ChatContract(signer);
}

export function getExplorerUrl(txHash: string): string {
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

export function getAddressUrl(address: string): string {
  return `https://amoy.polygonscan.com/address/${address}`;
}

export const CHAT_ADDRESS = process.env.NEXT_PUBLIC_CHAT_ADDRESS || '';