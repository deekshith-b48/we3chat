// IPFS utilities for backend
import { Web3Storage } from 'web3.storage';

const token = process.env.WEB3STORAGE_TOKEN;

if (!token) {
  console.warn("WEB3STORAGE_TOKEN not set. IPFS functionality will be limited.");
}

export const web3Client = token ? new Web3Storage({ token }) : null;

// Gateway URLs for accessing IPFS content via HTTP
export const IPFS_GATEWAYS = [
  "https://dweb.link",
  "https://ipfs.io",
  "https://gateway.pinata.cloud",
  "https://cloudflare-ipfs.com",
] as const;

export function getIPFSGatewayUrl(cid: string, gateway = "https://dweb.link"): string {
  return `${gateway}/ipfs/${cid}`;
}

export async function fetchWithFallback(cid: string, maxRetries = 3): Promise<any> {
  let lastError: Error | null = null;
  
  // First try Web3.Storage client with retries
  if (web3Client) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        return await fetchJSONFromCID(cid);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Web3.Storage attempt ${retry + 1} failed:`, error);
        
        if (retry < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
        }
      }
    }
  }
  
  // Fallback to HTTP gateways with retries
  for (const gateway of IPFS_GATEWAYS) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(getIPFSGatewayUrl(cid, gateway), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Successfully fetched CID ${cid} from ${gateway}`);
          return data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Gateway ${gateway} attempt ${retry + 1} failed:`, error);
        
        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
        }
      }
    }
  }
  
  throw new Error(`All IPFS access methods failed after ${maxRetries} retries. Last error: ${lastError?.message}`);
}

async function fetchJSONFromCID(cid: string): Promise<any> {
  if (!web3Client) {
    throw new Error("Web3.Storage client not initialized. Please set WEB3STORAGE_TOKEN.");
  }

  try {
    const res = await web3Client.get(cid);
    if (!res) {
      throw new Error("CID not found");
    }
    
    const files = await res.files();
    if (files.length === 0) {
      throw new Error("No files found in CID");
    }
    
    const buf = await files[0].arrayBuffer();
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf)));
    
    return json;
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw new Error(`Failed to fetch CID ${cid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Health check for IPFS gateways
export async function checkIPFSGatewayHealth(): Promise<{gateway: string, status: 'healthy' | 'slow' | 'down', responseTime: number}[]> {
  const testCid = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'; // A known test CID
  const results = [];
  
  for (const gateway of IPFS_GATEWAYS) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(getIPFSGatewayUrl(testCid, gateway), {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;
      
      results.push({
        gateway,
        status: response.ok ? (responseTime < 2000 ? 'healthy' : 'slow') : 'down',
        responseTime
      });
    } catch {
      results.push({
        gateway,
        status: 'down',
        responseTime: Date.now() - start
      });
    }
  }
  
  return results;
}
