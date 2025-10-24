import { ethers } from "ethers";
import { WE3CHAT_ABI, CHAT_ADDRESS } from "@/lib/contract";

// Get provider from window.ethereum
export function getProvider(): ethers.BrowserProvider {
  if (typeof window === 'undefined') {
    throw new Error("Provider can only be accessed in the browser");
  }
  
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found. Please install MetaMask or another wallet.");
  }
  
  return new ethers.BrowserProvider(window.ethereum);
}

// Get signer from provider
export async function getSigner(): Promise<ethers.JsonRpcSigner> {
  const provider = getProvider();
  return await provider.getSigner();
}

// Get contract instance
export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(CHAT_ADDRESS, WE3CHAT_ABI, provider);
}

// Connect to wallet
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

// Get current account
export async function getCurrentAccount(): Promise<string | null> {
  try {
    const provider = getProvider();
    const accounts = await provider.listAccounts();
    return accounts[0]?.address || null;
  } catch {
    return null;
  }
}

// Get network information
export async function getNetwork(): Promise<ethers.Network> {
  const provider = getProvider();
  return provider.getNetwork();
}

// Wait for transaction confirmation with progress callback
export async function waitForTransaction(
  txHash: string, 
  confirmations = 1,
  onUpdate?: (receipt: ethers.TransactionReceipt | null) => void
): Promise<ethers.TransactionReceipt> {
  const provider = getProvider();
  
  // First, wait for the transaction to be mined
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  
  if (onUpdate) {
    onUpdate(receipt);
  }
  
  return receipt!;
}

// Get transaction status
export async function getTransactionStatus(txHash: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  receipt?: ethers.TransactionReceipt;
  confirmations?: number;
}> {
  try {
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return { status: 'pending' };
    }
    
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;
    
    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      receipt,
      confirmations
    };
  } catch (error) {
    console.error("Error getting transaction status:", error);
    return { status: 'pending' };
  }
}

// Format error messages from contract calls
export function formatContractError(error: any): string {
  if (error?.data?.message) {
    return error.data.message;
  }
  
  if (error?.message) {
    // Extract readable error from common error patterns
    if (error.message.includes("user rejected")) {
      return "Transaction was rejected by user";
    }
    if (error.message.includes("insufficient funds")) {
      return "Insufficient funds for transaction";
    }
    if (error.message.includes("gas")) {
      return "Gas estimation failed. Transaction may fail.";
    }
    return error.message;
  }
  
  return "Unknown error occurred";
}

// Check if user is connected and on the correct network
export async function checkNetworkAndConnection(): Promise<{
  isConnected: boolean;
  isCorrectNetwork: boolean;
  currentNetwork?: ethers.Network;
  currentAccount?: string;
}> {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const accounts = await provider.listAccounts();
    
    const isConnected = accounts.length > 0;
    const isCorrectNetwork = network.chainId === 80002n; // Polygon Amoy
    
    return {
      isConnected,
      isCorrectNetwork,
      currentNetwork: network,
      currentAccount: accounts[0]?.address || undefined
    };
  } catch (error) {
    return {
      isConnected: false,
      isCorrectNetwork: false
    };
  }
}

// Switch to the correct network
export async function switchToPolygonAmoy(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error("No Ethereum provider found");
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13882' }], // 80002 in hex
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x13882',
          chainName: 'Polygon Amoy',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
          },
          rpcUrls: ['https://rpc-amoy.polygon.technology'],
          blockExplorerUrls: ['https://amoy.polygonscan.com/'],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}