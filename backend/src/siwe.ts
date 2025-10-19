import { randomBytes } from 'crypto';
import { verifyMessage, getAddress } from 'ethers';

type NonceRecord = { nonce: string; createdAt: number };
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const nonces = new Map<string, NonceRecord>(); // key: checksum address

export function createNonce(address: string): string {
  const checksum = getAddress(address);
  const nonce = randomBytes(16).toString('hex');
  nonces.set(checksum, { nonce, createdAt: Date.now() });
  
  // Clean up expired nonces
  cleanupExpiredNonces();
  
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const checksum = getAddress(address);
  const rec = nonces.get(checksum);
  
  if (!rec) {
    return false;
  }
  
  const isValid = rec.nonce === nonce && Date.now() - rec.createdAt < NONCE_TTL_MS;
  
  if (isValid) {
    nonces.delete(checksum);
  }
  
  return isValid;
}

export async function verifySiweSignature(
  address: string, 
  nonce: string, 
  signature: string
): Promise<boolean> {
  try {
    const checksum = getAddress(address);
    const message = `we3chat wants you to sign in.\n\nAddress: ${checksum}\nNonce: ${nonce}`;
    const recovered = await verifyMessage(message, signature);
    return getAddress(recovered) === checksum;
  } catch (error) {
    console.error('SIWE signature verification failed:', error);
    return false;
  }
}

export function getSiweMessage(address: string, nonce: string): string {
  const checksum = getAddress(address);
  return `we3chat wants you to sign in.\n\nAddress: ${checksum}\nNonce: ${nonce}`;
}

function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [address, record] of nonces.entries()) {
    if (now - record.createdAt > NONCE_TTL_MS) {
      nonces.delete(address);
    }
  }
}

// Clean up expired nonces every minute
setInterval(cleanupExpiredNonces, 60 * 1000);

export function getNonceStats(): { total: number; expired: number } {
  const now = Date.now();
  let expired = 0;
  
  for (const record of nonces.values()) {
    if (now - record.createdAt > NONCE_TTL_MS) {
      expired++;
    }
  }
  
  return {
    total: nonces.size,
    expired
  };
}
