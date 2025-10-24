import { Web3Storage } from 'web3.storage';
import { create } from 'ipfs-http-client';

export interface IPFSUploadOptions {
  name?: string;
  maxRetries?: number;
  wrapWithDirectory?: boolean;
}

export interface IPFSFile {
  name: string;
  content: Uint8Array;
  size: number;
  type?: string;
}

class IPFSService {
  private web3Storage: Web3Storage | null = null;
  private ipfsClient: any = null;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 30000; // 30 seconds

  constructor() {
    // Initialize Web3.Storage
    if (process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN) {
      this.web3Storage = new Web3Storage({
        token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN
      });
    }

    // Initialize IPFS client as fallback
    try {
      this.ipfsClient = create({
        url: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.infura.io:5001/api/v0',
        timeout: this.TIMEOUT
      });
    } catch (error) {
      console.warn('Failed to initialize IPFS client:', error);
    }
  }

  async uploadMessage(content: string, metadata: any = {}): Promise<string> {
    const messageData = {
      content,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        version: '2.0',
        type: 'message'
      }
    };

    const jsonString = JSON.stringify(messageData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], 'message.json');

    try {
      if (this.web3Storage) {
        const cid = await this.web3Storage.put([file], {
          name: `message-${Date.now()}`,
          maxRetries: this.MAX_RETRIES
        });
        return cid;
      } else if (this.ipfsClient) {
        // Fallback to direct IPFS
        const result = await this.ipfsClient.add(file, {
          pin: true,
          wrapWithDirectory: false
        });
        return result.path;
      } else {
        throw new Error('No IPFS service available');
      }
  } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  async downloadMessage(cid: string): Promise<any> {
    try {
      if (this.web3Storage) {
        const files = await this.web3Storage.get(cid);
        if (files) {
          const file = await files.files()[0];
          const content = await file.text();
          return JSON.parse(content);
        }
      } else if (this.ipfsClient) {
        // Fallback to direct IPFS
        const chunks = [];
        for await (const chunk of this.ipfsClient.cat(cid)) {
          chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString();
        return JSON.parse(content);
      } else {
        throw new Error('No IPFS service available');
      }
    } catch (error) {
      console.error('IPFS download failed:', error);
      throw new Error('Failed to download from IPFS');
    }
  }

  async uploadFile(file: File, metadata: any = {}): Promise<string> {
    try {
      if (this.web3Storage) {
        const cid = await this.web3Storage.put([file], {
          name: file.name,
          maxRetries: this.MAX_RETRIES
        });
    return cid;
      } else if (this.ipfsClient) {
        const result = await this.ipfsClient.add(file, {
          pin: true,
          wrapWithDirectory: false
        });
        return result.path;
      } else {
        throw new Error('No IPFS service available');
      }
  } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async downloadFile(cid: string): Promise<any> {
    try {
      if (this.web3Storage) {
        const files = await this.web3Storage.get(cid);
        if (files) {
          const file = await files.files()[0];
          const content = await file.arrayBuffer();
          return {
            content: new Uint8Array(content),
            metadata: {
              name: file.name,
              size: file.size,
              type: file.type
            }
          };
        }
      } else if (this.ipfsClient) {
        const chunks = [];
        for await (const chunk of this.ipfsClient.cat(cid)) {
          chunks.push(chunk);
        }
        const content = Buffer.concat(chunks);
        return {
          content: new Uint8Array(content),
          metadata: {
            name: 'downloaded-file',
            size: content.length,
            type: 'application/octet-stream'
          }
        };
      } else {
        throw new Error('No IPFS service available');
      }
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error('Failed to download file from IPFS');
    }
  }

  async uploadMultipleFiles(files: File[], options: IPFSUploadOptions = {}): Promise<string> {
    try {
      if (this.web3Storage) {
        const cid = await this.web3Storage.put(files, {
          name: options.name || `files-${Date.now()}`,
          maxRetries: options.maxRetries || this.MAX_RETRIES,
          wrapWithDirectory: options.wrapWithDirectory || true
        });
        return cid;
      } else if (this.ipfsClient) {
        const results = [];
        for (const file of files) {
          const result = await this.ipfsClient.add(file, {
            pin: true,
            wrapWithDirectory: options.wrapWithDirectory || true
          });
          results.push(result);
        }
        return results[0].path; // Return the first result's path
      } else {
        throw new Error('No IPFS service available');
      }
    } catch (error) {
      console.error('Multiple files upload failed:', error);
      throw new Error('Failed to upload multiple files to IPFS');
    }
  }

  async uploadJSON(data: any, filename: string = 'data.json'): Promise<string> {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], filename);

    return await this.uploadFile(file);
  }

  async downloadJSON(cid: string): Promise<any> {
    const result = await this.downloadFile(cid);
    const jsonString = new TextDecoder().decode(result.content);
    return JSON.parse(jsonString);
  }

  async uploadImage(imageFile: File): Promise<string> {
    // Validate image file
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    // Compress image if it's too large
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      const compressedFile = await this.compressImage(imageFile);
      return await this.uploadFile(compressedFile);
    }

    return await this.uploadFile(imageFile);
  }

  private async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async getFileInfo(cid: string): Promise<{ size: number; type: string; name: string }> {
    try {
      if (this.web3Storage) {
        const files = await this.web3Storage.get(cid);
        if (files) {
          const file = await files.files()[0];
          return {
            size: file.size,
            type: file.type,
            name: file.name
          };
        }
      } else if (this.ipfsClient) {
        const stats = await this.ipfsClient.files.stat(cid);
        return {
          size: stats.size,
          type: 'unknown',
          name: 'file'
        };
      }
      throw new Error('No IPFS service available');
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw new Error('Failed to get file information');
    }
  }

  async pinFile(cid: string): Promise<boolean> {
    try {
      if (this.ipfsClient) {
        await this.ipfsClient.pin.add(cid);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to pin file:', error);
      return false;
    }
  }

  async unpinFile(cid: string): Promise<boolean> {
    try {
      if (this.ipfsClient) {
        await this.ipfsClient.pin.rm(cid);
        return true;
      }
      return false;
  } catch (error) {
      console.error('Failed to unpin file:', error);
      return false;
    }
  }

  // Get IPFS gateway URL for a CID
  getGatewayURL(cid: string): string {
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${gateway}${cid}`;
  }

  // Check if IPFS service is available
  isAvailable(): boolean {
    return !!(this.web3Storage || this.ipfsClient);
  }
}

export const ipfsService = new IPFSService();

// Legacy functions for backward compatibility
export async function uploadToIPFS(data: string): Promise<string> {
  return await ipfsService.uploadMessage(data);
}

export async function fetchFromIPFS(cid: string): Promise<string> {
  const result = await ipfsService.downloadMessage(cid);
  return result.content;
}

// Additional legacy functions
export async function uploadJSON(data: any): Promise<string> {
  return await ipfsService.uploadJSON(data);
}

export async function fetchJSONFromCID(cid: string): Promise<any> {
  return await ipfsService.downloadJSON(cid);
}

export async function uploadEncryptedMessage(encryptedMessage: unknown): Promise<string> {
  return await ipfsService.uploadJSON({
    type: 'encrypted_message',
    timestamp: Date.now(),
    data: encryptedMessage
  });
}

export async function fetchEncryptedMessage(cid: string): Promise<unknown> {
  const data = await ipfsService.downloadJSON(cid);
  if (data.type !== 'encrypted_message') {
    throw new Error('Invalid message type');
  }
  return data.data;
}

export function isIPFSConfigured(): boolean {
  return ipfsService.isAvailable();
}

export function createCIDHash(cid: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);
  return '0x' + Array.from(data.slice(0, 32))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0');
}

export function isCID(content: string): boolean {
  return content.startsWith('bafy') || content.startsWith('Qm') || content.length === 46;
}