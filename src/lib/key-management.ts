import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { uploadJSONWithMetadata, fetchWithFallback } from './ipfs';
import { encryptForRecipient, decryptFromSender, generateKeyPair, getPublicKeyHex } from './crypto';

export interface KeyBackup {
  encryptedPrivateKey: string;
  publicKey: string;
  backupId: string;
  createdAt: string;
  version: string;
  signature: string;
}

export interface KeyRotation {
  oldPublicKey: string;
  newPublicKey: string;
  rotationId: string;
  timestamp: number;
  signature: string;
}

export class KeyManager {
  private currentKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;
  private keyHistory: KeyRotation[] = [];
  // private backupCid: string | null = null;

  /**
   * Generate a new key pair
   */
  generateNewKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
    const keyPair = generateKeyPair();
    this.currentKeyPair = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.secretKey
    };
    return this.currentKeyPair;
  }

  /**
   * Get current key pair
   */
  getCurrentKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } | null {
    return this.currentKeyPair;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(
    signer: ethers.Signer,
    contract: ethers.Contract,
    backupToIPFS = true
  ): Promise<KeyRotation> {
    if (!this.currentKeyPair) {
      throw new Error('No current key pair to rotate from');
    }

    const oldPublicKey = getPublicKeyHex();
    
    // Generate new key pair
    this.generateNewKeyPair();
    const newPublicKey = getPublicKeyHex();

    // Create rotation record
    const rotation: KeyRotation = {
      oldPublicKey,
      newPublicKey,
      rotationId: `rotation_${Date.now()}`,
      timestamp: Date.now(),
      signature: '', // Will be filled after signing
    };

    // Sign the rotation with wallet
    const message = ethers.solidityPackedKeccak256(
      ['string', 'string', 'string', 'uint256'],
      [rotation.oldPublicKey, rotation.newPublicKey, rotation.rotationId, rotation.timestamp]
    );
    
    const signature = await signer.signMessage(ethers.getBytes(message));
    rotation.signature = signature;

    // Update contract with new public key
    try {
      const tx = await contract.setEncryptionKey(newPublicKey);
      await tx.wait();
      console.log('✅ New encryption key set on contract');
    } catch (error) {
      console.error('❌ Failed to update contract with new key:', error);
      throw error;
    }

    // Backup old key if requested
    if (backupToIPFS) {
      await this.backupKeyToIPFS(signer, oldPublicKey, this.currentKeyPair.privateKey);
    }

    // Add to rotation history
    this.keyHistory.push(rotation);

    // Store rotation history
    await this.storeKeyHistory();

    console.log('✅ Key rotation completed:', rotation.rotationId);
    return rotation;
  }

  /**
   * Backup key to IPFS
   */
  async backupKeyToIPFS(
    signer: ethers.Signer,
    publicKey: string,
    privateKey: Uint8Array
  ): Promise<string> {
    try {
      const address = await signer.getAddress();
      
      // Create backup data
      const backupData: KeyBackup = {
        encryptedPrivateKey: '', // Will be encrypted
        publicKey,
        backupId: `backup_${Date.now()}`,
        createdAt: new Date().toISOString(),
        version: '1.0',
        signature: '', // Will be signed
      };

      // Encrypt private key with wallet signature (for recovery)
      const message = `Backup key for ${address} at ${backupData.createdAt}`;
      const messageHash = ethers.solidityPackedKeccak256(['string'], [message]);
      const signature = await signer.signMessage(ethers.getBytes(messageHash));
      
      // Use signature as encryption key (simplified - in production use proper key derivation)
      const encryptionKey = ethers.keccak256(signature);
      const encryptedPrivateKey = await encryptForRecipient(
        Buffer.from(privateKey).toString('hex'),
        Buffer.from(encryptionKey.slice(2), 'hex').slice(0, 32), // Use first 32 bytes
        Buffer.from(encryptionKey.slice(2), 'hex').slice(0, 32) // Use first 32 bytes as recipient key
      );

      backupData.encryptedPrivateKey = encryptedPrivateKey.ciphertext;
      backupData.signature = signature;

      // Upload to IPFS
      const cid = await uploadJSONWithMetadata(backupData, {
        name: `key-backup-${address}`,
        description: `Encryption key backup for ${address}`,
        tags: ['key-backup', 'encryption', address]
      });

      // this.backupCid = cid;
      console.log('✅ Key backup uploaded to IPFS:', cid);
      
      return cid;
    } catch (error) {
      console.error('❌ Failed to backup key to IPFS:', error);
      throw error;
    }
  }

  /**
   * Restore key from IPFS backup
   */
  async restoreKeyFromBackup(
    signer: ethers.Signer,
    backupCid: string
  ): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    try {
      // Fetch backup from IPFS
      const backupData = await fetchWithFallback(backupCid) as KeyBackup;
      
      // Verify backup signature
      const address = await signer.getAddress();
      const message = `Backup key for ${address} at ${backupData.createdAt}`;
      const messageHash = ethers.solidityPackedKeccak256(['string'], [message]);
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        backupData.signature
      );

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Invalid backup signature');
      }

      // Decrypt private key
      const encryptionKey = ethers.keccak256(backupData.signature);
      const decryptedPrivateKeyHex = await decryptFromSender(
        backupData.encryptedPrivateKey,
        '', // No nonce in this simplified version
        '', // No salt in this simplified version
        Buffer.from(encryptionKey.slice(2), 'hex').slice(0, 32), // Use first 32 bytes
        Buffer.from(encryptionKey.slice(2), 'hex').slice(0, 32) // Use first 32 bytes as sender key
      );

      const privateKey = new Uint8Array(Buffer.from(decryptedPrivateKeyHex, 'hex'));
      const publicKey = new Uint8Array(Buffer.from(backupData.publicKey.slice(2), 'hex'));

      // Set as current key pair
      this.currentKeyPair = { publicKey, privateKey };

      console.log('✅ Key restored from backup');
      return { publicKey, privateKey };
    } catch (error) {
      console.error('❌ Failed to restore key from backup:', error);
      throw error;
    }
  }

  /**
   * Store key rotation history
   */
  private async storeKeyHistory(): Promise<void> {
    try {
      const historyData = {
        rotations: this.keyHistory,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      // Store in localStorage for now (in production, use secure storage)
      localStorage.setItem('key_rotation_history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to store key history:', error);
    }
  }

  /**
   * Load key rotation history
   */
  loadKeyHistory(): KeyRotation[] {
    try {
      const historyData = localStorage.getItem('key_rotation_history');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        this.keyHistory = parsed.rotations || [];
        return this.keyHistory;
      }
    } catch (error) {
      console.error('Failed to load key history:', error);
    }
    return [];
  }

  /**
   * Get key rotation history
   */
  getKeyHistory(): KeyRotation[] {
    return this.keyHistory;
  }

  /**
   * Schedule automatic key rotation
   */
  scheduleKeyRotation(
    signer: ethers.Signer,
    contract: ethers.Contract,
    intervalDays = 30
  ): NodeJS.Timeout {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    
    return setInterval(async () => {
      try {
        console.log('🔄 Performing scheduled key rotation...');
        await this.rotateKeys(signer, contract);
        console.log('✅ Scheduled key rotation completed');
      } catch (error) {
        console.error('❌ Scheduled key rotation failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Validate key pair integrity
   */
  validateKeyPair(keyPair: { publicKey: Uint8Array; privateKey: Uint8Array }): boolean {
    try {
      // Test encryption/decryption with the key pair
      // const testMessage = 'test message';
      // const testData = {
      //   content: testMessage,
      //   nonce: crypto.getRandomValues(new Uint8Array(24)),
      //   senderPublicKey: getPublicKeyHex(keyPair.publicKey)
      // };

      // This would need proper encryption/decryption implementation
      // For now, just check that the key pair exists and has correct length
      return keyPair.publicKey.length === 32 && keyPair.privateKey.length === 32;
    } catch (error) {
      console.error('Key pair validation failed:', error);
      return false;
    }
  }

  /**
   * Clear all key data
   */
  clearAllKeys(): void {
    this.currentKeyPair = null;
    this.keyHistory = [];
    // this.backupCid = null;
    localStorage.removeItem('key_rotation_history');
    console.log('🧹 All key data cleared');
  }
}

// Export singleton instance
export const keyManager = new KeyManager();

// Utility functions
export async function rotateEncryptionKeys(
  signer: ethers.Signer,
  contract: ethers.Contract
): Promise<KeyRotation> {
  return await keyManager.rotateKeys(signer, contract);
}

export async function backupCurrentKey(
  signer: ethers.Signer
): Promise<string> {
  const keyPair = keyManager.getCurrentKeyPair();
  if (!keyPair) {
    throw new Error('No current key pair to backup');
  }
  
  const publicKey = getPublicKeyHex();
  return await keyManager.backupKeyToIPFS(signer, publicKey, keyPair.privateKey);
}

export function getKeyRotationHistory(): KeyRotation[] {
  return keyManager.getKeyHistory();
}

// Hook for key management
export function useKeyManagement() {
  const [isRotating, setIsRotating] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyHistory, setKeyHistory] = useState<KeyRotation[]>([]);

  useEffect(() => {
    const history = keyManager.loadKeyHistory();
    setKeyHistory(history);
  }, []);

  const rotateKeys = async (signer: ethers.Signer, contract: ethers.Contract) => {
    setIsRotating(true);
    setError(null);

    try {
      const rotation = await keyManager.rotateKeys(signer, contract);
      setKeyHistory(keyManager.getKeyHistory());
      return rotation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Key rotation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRotating(false);
    }
  };

  const backupKey = async (signer: ethers.Signer) => {
    setIsBackingUp(true);
    setError(null);

    try {
      const cid = await backupCurrentKey(signer);
      return cid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Key backup failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreKey = async (signer: ethers.Signer, backupCid: string) => {
    setError(null);

    try {
      const keyPair = await keyManager.restoreKeyFromBackup(signer, backupCid);
      return keyPair;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Key restore failed';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    keyHistory,
    isRotating,
    isBackingUp,
    error,
    rotateKeys,
    backupKey,
    restoreKey,
    clearError: () => setError(null)
  };
}
