import { createConfig, http } from 'wagmi';
import { polygonAmoy } from 'viem/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Get environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Configure connectors
const connectors = [
  injected(),
  walletConnect({
    projectId,
    metadata: {
      name: 'We3Chat',
      description: 'Decentralized Chat Application',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://we3chat.vercel.app',
      icons: ['https://we3chat.vercel.app/icon.png']
    }
  }),
  coinbaseWallet({
    appName: 'We3Chat',
    appLogoUrl: 'https://we3chat.vercel.app/icon.png'
  })
];

// Create wagmi config
export const config = createConfig({
  chains: [polygonAmoy],
  connectors,
  transports: {
    [polygonAmoy.id]: http(rpcUrl)
  },
  ssr: true
});

// Export chain configuration
export const chainConfig = {
  chainId: polygonAmoy.id,
  name: polygonAmoy.name,
  rpcUrl,
  blockExplorer: polygonAmoy.blockExplorers.default.url,
  nativeCurrency: polygonAmoy.nativeCurrency
};

// Contract configuration
export const contractConfig = {
  address: process.env.NEXT_PUBLIC_CHAT_CONTRACT_ADDRESS as `0x${string}`,
  abi: [
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
  ] as const
};

// Helper functions
export const isSupportedChain = (chainId: number) => {
  return chainId === polygonAmoy.id;
};

export const getChainName = (chainId: number) => {
  return chainId === polygonAmoy.id ? polygonAmoy.name : 'Unsupported Chain';
};

export const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatBalance = (balance: bigint, decimals: number = 18) => {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  const fractional = Number(remainder) / Number(divisor);
  return `${whole}.${fractional.toString().slice(2, 6)}`;
};