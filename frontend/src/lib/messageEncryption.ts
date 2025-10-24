import { encrypt, decrypt } from 'tweetnacl-util';
import { box, randomBytes } from 'tweetnacl';

export interface EncryptedMessage {
  encrypted: string;
  nonce: string;
  metadata?: {
    timestamp: number;
    version: string;
    messageType?: string;
    replyTo?: number;
  };
}

export interface MessageMetadata {
  timestamp: number;
  version: string;
  messageType: string;
  replyTo?: number;
  sender?: string;
  isEdited?: boolean;
  editTimestamp?: number;
}

export class MessageEncryption {
  private keyPair: { publicKey: Uint8Array; secretKey: Uint8Array } | null = null;
  private readonly STORAGE_KEY = 'x25519_keypair';
  private readonly VERSION = '2.0';

  async generateKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
    this.keyPair = box.keyPair();
    return this.keyPair;
  }

  async getOrCreateKeyPair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
    if (!this.keyPair) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.keyPair = {
            publicKey: new Uint8Array(parsed.publicKey),
            secretKey: new Uint8Array(parsed.secretKey)
          };
        } catch (error) {
          console.warn('Failed to parse stored keypair, generating new one');
          this.keyPair = await this.generateKeyPair();
          this.saveKeyPair();
        }
      } else {
        this.keyPair = await this.generateKeyPair();
        this.saveKeyPair();
      }
    }
    return this.keyPair;
  }

  private saveKeyPair(): void {
    if (this.keyPair) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        publicKey: Array.from(this.keyPair.publicKey),
        secretKey: Array.from(this.keyPair.secretKey),
        version: this.VERSION
      }));
    }
  }

  async getPublicKey(): Promise<string> {
    const { publicKey } = await this.getOrCreateKeyPair();
    return `0x${Buffer.from(publicKey).toString('hex')}`;
  }

  async encryptMessage(
    message: string,
    recipientPublicKey: Uint8Array,
    metadata?: Partial<MessageMetadata>
  ): Promise<EncryptedMessage> {
    const { secretKey } = await this.getOrCreateKeyPair();
    const nonce = randomBytes(24);
    const encrypted = box(encrypt(message), nonce, recipientPublicKey, secretKey);
    
    return {
      encrypted: encrypt(encrypted),
      nonce: encrypt(nonce),
      metadata: {
        timestamp: Date.now(),
        version: this.VERSION,
        ...metadata
      }
    };
  }

  async decryptMessage(
    encryptedData: EncryptedMessage,
    senderPublicKey: Uint8Array
  ): Promise<string> {
    const { secretKey } = await this.getOrCreateKeyPair();
    const decrypted = box.open(
      decrypt(encryptedData.encrypted),
      decrypt(encryptedData.nonce),
      senderPublicKey,
      secretKey
    );
    
    if (!decrypted) {
      throw new Error('Failed to decrypt message');
    }
    
    return decrypt(decrypted);
  }

  async encryptFile(
    file: File,
    recipientPublicKey: Uint8Array,
    metadata?: Partial<MessageMetadata>
  ): Promise<EncryptedMessage> {
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    
    const { secretKey } = await this.getOrCreateKeyPair();
    const nonce = randomBytes(24);
    const encrypted = box(encrypt(fileData), nonce, recipientPublicKey, secretKey);
    
    return {
      encrypted: encrypt(encrypted),
      nonce: encrypt(nonce),
      metadata: {
        timestamp: Date.now(),
        version: this.VERSION,
        messageType: 'file',
        ...metadata
      }
    };
  }

  async decryptFile(
    encryptedData: EncryptedMessage,
    senderPublicKey: Uint8Array
  ): Promise<Uint8Array> {
    const { secretKey } = await this.getOrCreateKeyPair();
    const decrypted = box.open(
      decrypt(encryptedData.encrypted),
      decrypt(encryptedData.nonce),
      senderPublicKey,
      secretKey
    );
    
    if (!decrypted) {
      throw new Error('Failed to decrypt file');
    }
    
    return decrypt(decrypted);
  }

  async encryptAndUploadMessage(
    message: string,
    recipientPublicKey: Uint8Array,
    metadata?: Partial<MessageMetadata>
  ): Promise<string> {
    const encrypted = await this.encryptMessage(message, recipientPublicKey, metadata);
    const messageData = {
      encrypted,
      metadata: {
        ...encrypted.metadata,
        ...metadata
      }
    };
    
    // Import ipfsService dynamically to avoid circular dependencies
    const { ipfsService } = await import('./ipfsService');
    return await ipfsService.uploadMessage(JSON.stringify(messageData), metadata);
  }

  async downloadAndDecryptMessage(
    cid: string,
    senderPublicKey: Uint8Array
  ): Promise<{ content: string; metadata: MessageMetadata }> {
    const { ipfsService } = await import('./ipfsService');
    const messageData = await ipfsService.downloadMessage(cid);
    
    const content = await this.decryptMessage(messageData.encrypted, senderPublicKey);
    return {
      content,
      metadata: messageData.metadata
    };
  }

  async encryptAndUploadFile(
    file: File,
    recipientPublicKey: Uint8Array,
    metadata?: Partial<MessageMetadata>
  ): Promise<string> {
    const encrypted = await this.encryptFile(file, recipientPublicKey, metadata);
    const fileData = {
      encrypted,
      metadata: {
        ...encrypted.metadata,
        ...metadata,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    };
    
    const { ipfsService } = await import('./ipfsService');
    return await ipfsService.uploadFile(file, fileData);
  }

  async downloadAndDecryptFile(
    cid: string,
    senderPublicKey: Uint8Array
  ): Promise<{ file: File; metadata: MessageMetadata }> {
    const { ipfsService } = await import('./ipfsService');
    const fileData = await ipfsService.downloadFile(cid);
    
    const fileContent = await this.decryptFile(fileData.encrypted, senderPublicKey);
    const file = new File([fileContent], fileData.metadata.fileName, {
      type: fileData.metadata.fileType
    });
    
    return {
      file,
      metadata: fileData.metadata
    };
  }

  // Group message encryption (encrypt for multiple recipients)
  async encryptGroupMessage(
    message: string,
    recipientPublicKeys: Uint8Array[],
    metadata?: Partial<MessageMetadata>
  ): Promise<{ [key: string]: EncryptedMessage }> {
    const encryptedMessages: { [key: string]: EncryptedMessage } = {};
    
    for (const publicKey of recipientPublicKeys) {
      const encrypted = await this.encryptMessage(message, publicKey, metadata);
      const keyString = Buffer.from(publicKey).toString('hex');
      encryptedMessages[keyString] = encrypted;
    }
    
    return encryptedMessages;
  }

  // Verify message integrity
  async verifyMessage(
    message: string,
    encryptedData: EncryptedMessage,
    senderPublicKey: Uint8Array
  ): Promise<boolean> {
    try {
      const decrypted = await this.decryptMessage(encryptedData, senderPublicKey);
      return decrypted === message;
    } catch {
      return false;
    }
  }

  // Clear stored keypair (for logout)
  clearKeyPair(): void {
    this.keyPair = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Check if keypair exists
  hasKeyPair(): boolean {
    return this.keyPair !== null || localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

export const messageEncryption = new MessageEncryption();

// Legacy functions for backward compatibility
export interface EncryptedMessageData {
  encrypted: string;
  cid: string;
}

export async function encryptAndUploadMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array
): Promise<EncryptedMessageData> {
  try {
    const cid = await messageEncryption.encryptAndUploadMessage(plaintext, recipientPublicKey);
    return {
      encrypted: '', // Not needed for new implementation
      cid
    };
  } catch (error) {
    console.error('Error encrypting and uploading message:', error);
    throw new Error('Failed to encrypt and upload message');
  }
}

export async function downloadAndDecryptMessage(
  cid: string,
  senderPublicKey: Uint8Array
): Promise<string> {
  try {
    const result = await messageEncryption.downloadAndDecryptMessage(cid, senderPublicKey);
    return result.content;
  } catch (error) {
    console.error('Error downloading and decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
}

export function parsePublicKeyFromProfile(profile: { x25519_public_key?: string }): Uint8Array | null {
  if (!profile.x25519_public_key) return null;

  try {
    const pubKeyArray = JSON.parse(profile.x25519_public_key);
    return new Uint8Array(pubKeyArray);
  } catch (error) {
    console.error('Error parsing public key from profile:', error);
    return null;
  }
}