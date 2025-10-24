// Chat contract ABI - simplified version for demo
export const CHAT_ABI = [
  "function createAccount(string memory username, bytes32 x25519PublicKey) external",
  "function addFriend(address friend) external",
  "function sendMessage(address friend, bytes32 cidHash, string memory cid) external",
  "function readMessage(address other) external view returns (tuple(address sender, address receiver, uint256 timestamp, bytes32 cidHash)[])",
  "function getFriends(address user) external view returns (address[])",
  "function username(address user) external view returns (string)",
  "function x25519PublicKey(address user) external view returns (bytes32)",
  "event MessageSent(address indexed from, address indexed to, bytes32 indexed cidHash, uint256 timestamp, string cid)",
  "event FriendAdded(address indexed user, address indexed friend)"
];

// Contract address on Polygon Amoy testnet
export const CHAT_CONTRACT_ADDRESS = ('0x' + '0'.repeat(40)) as `0x${string}`; // Placeholder - replace with actual deployed contract

// Polygon Amoy chain configuration
export const CHAIN_CONFIG = {
  chainId: 80002,
  name: 'Polygon Amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology/'
};

export type ChatContract = {
  address: typeof CHAT_CONTRACT_ADDRESS;
  abi: typeof CHAT_ABI;
};

// Contract address - will be set from environment
export const CHAT_ADDRESS = (process.env.NEXT_PUBLIC_CHAT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Chain configuration
export const POLYGON_AMOY = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
};
