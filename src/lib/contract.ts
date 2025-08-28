import ChatABI from "@/lib/abi/ChatApp.json";

export const CHAT_ADDRESS = (process.env.NEXT_PUBLIC_CHAT_ADDRESS || "0xd9145CCE52D386f254917e481eB44e9943F39138") as `0x${string}`;
export const CHAT_ABI = ChatABI;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_NETWORK_ID || "80002"),
  name: process.env.NEXT_PUBLIC_NETWORK_NAME || "polygon-amoy",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology",
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://amoy.polygonscan.com",
};

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  80002: "0xd9145CCE52D386f254917e481eB44e9943F39138", // Polygon Amoy
  137: "0xd9145CCE52D386f254917e481eB44e9943F39138",   // Polygon Mainnet (placeholder same)
  80001: "0xd9145CCE52D386f254917e481eB44e9943F39138", // Polygon Mumbai (deprecated)
} as const;

export function getContractAddress(chainId: number): `0x${string}` {
  return (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CHAT_ADDRESS) as `0x${string}`;
}

export function getExplorerUrl(txHash: string, chainId?: number): string {
  const baseUrl = chainId === 137 
    ? "https://polygonscan.com"
    : "https://amoy.polygonscan.com";
  return `${baseUrl}/tx/${txHash}`;
}

export function getAddressUrl(address: string, chainId?: number): string {
  const baseUrl = chainId === 137 
    ? "https://polygonscan.com"
    : "https://amoy.polygonscan.com";
  return `${baseUrl}/address/${address}`;
}
