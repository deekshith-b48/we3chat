import { Web3Storage } from 'web3.storage';

class IPFSService {
  private web3Storage: Web3Storage | null = null;

  constructor() {
    // Initialize Web3.Storage
    if (process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN) {
      this.web3Storage = new Web3Storage({
        token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN
      });
    }
  }

  async uploadMessage(content: string, metadata: any): Promise<string> {
    const messageData = {
      content,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        version: '1.0'
      }
    };

    const jsonString = JSON.stringify(messageData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], 'message.json');

    try {
      if (this.web3Storage) {
        const cid = await this.web3Storage.put([file], {
          name: `message-${Date.now()}`,
          maxRetries: 3
        });
        return cid;
      } else {
        throw new Error('Web3.Storage not configured. Please set NEXT_PUBLIC_WEB3_STORAGE_TOKEN');
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
      } else {
        throw new Error('Web3.Storage not configured');
      }
    } catch (error) {
      console.error('IPFS download failed:', error);
      throw new Error('Failed to download from IPFS');
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      if (this.web3Storage) {
        const cid = await this.web3Storage.put([file], {
          name: file.name,
          maxRetries: 3
        });
        return cid;
      } else {
        throw new Error('Web3.Storage not configured');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async downloadFile(cid: string): Promise<File> {
    try {
      if (this.web3Storage) {
        const files = await this.web3Storage.get(cid);
        if (files) {
          return await files.files()[0];
        }
      } else {
        throw new Error('Web3.Storage not configured');
      }
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error('Failed to download file from IPFS');
    }
  }
}

export const ipfsService = new IPFSService();