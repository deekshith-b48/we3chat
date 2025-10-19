/**
 * Local IPFS Integration for We3Chat (FREE Setup)
 * 
 * Uses local IPFS node instead of paid Web3.Storage
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client';

export interface IPFSFile {
  cid: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content?: Uint8Array;
}

export interface MessageContent {
  text?: string;
  file?: IPFSFile;
  image?: IPFSFile;
  audio?: IPFSFile;
  video?: IPFSFile;
  timestamp: number;
  encrypted: boolean;
}

class LocalIPFSManager {
  private ipfs: IPFSHTTPClient | null = null;
  // private isConnected: boolean = false;
  private nodeInfo: any = null;

  constructor() {
    this.initializeIPFS();
  }

  private async initializeIPFS() {
    try {
      // Connect to local IPFS node (FREE)
      this.ipfs = create({
        url: 'http://localhost:5001/api/v0'
      });
      
      // Test connection
      this.nodeInfo = await this.ipfs.version();
      console.log('✅ Local IPFS node connected:', this.nodeInfo);
      
      // this.isConnected = true;
      console.log('✅ Local IPFS initialized successfully (FREE)');
    } catch (error) {
      console.error('❌ Failed to initialize local IPFS:', error);
      console.log('💡 Make sure IPFS is running: ipfs daemon');
      // this.isConnected = false;
    }
  }

  async isIPFSConnected(): Promise<boolean> {
    if (!this.ipfs) return false;
    
    try {
      await this.ipfs.version();
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(file: File): Promise<IPFSFile> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      console.log(`📤 Uploading file to local IPFS: ${file.name}`);
      
      // Convert File to IPFS format
      const fileData = {
        path: file.name,
        content: await file.arrayBuffer()
      };

      // Add to IPFS
      const result = await this.ipfs.add(fileData, {
        pin: true,
        progress: (bytes) => {
          console.log(`📊 Upload progress: ${bytes} bytes`);
        }
      });

      const ipfsFile: IPFSFile = {
        cid: result.cid.toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };

      console.log(`✅ File uploaded successfully: ${ipfsFile.cid}`);
      return ipfsFile;
    } catch (error) {
      console.error('❌ Failed to upload file to IPFS:', error);
      throw error;
    }
  }

  async uploadText(text: string, filename: string = 'message.txt'): Promise<IPFSFile> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      console.log(`📤 Uploading text to local IPFS: ${filename}`);
      
      const fileData = {
        path: filename,
        content: new TextEncoder().encode(text)
      };

      const result = await this.ipfs.add(fileData, {
        pin: true
      });

      const ipfsFile: IPFSFile = {
        cid: result.cid.toString(),
        name: filename,
        size: text.length,
        type: 'text/plain',
        lastModified: Date.now()
      };

      console.log(`✅ Text uploaded successfully: ${ipfsFile.cid}`);
      return ipfsFile;
    } catch (error) {
      console.error('❌ Failed to upload text to IPFS:', error);
      throw error;
    }
  }

  async downloadFile(cid: string): Promise<Uint8Array> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      console.log(`📥 Downloading file from IPFS: ${cid}`);
      
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      
      const content = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`✅ File downloaded successfully: ${cid}`);
      return content;
    } catch (error) {
      console.error('❌ Failed to download file from IPFS:', error);
      throw error;
    }
  }

  async downloadText(cid: string): Promise<string> {
    const content = await this.downloadFile(cid);
    return new TextDecoder().decode(content);
  }

  async getFileInfo(cid: string): Promise<any> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      const stats = await this.ipfs.files.stat(`/ipfs/${cid}`);
      return stats;
    } catch (error) {
      console.error('❌ Failed to get file info from IPFS:', error);
      throw error;
    }
  }

  async pinFile(cid: string): Promise<void> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      await this.ipfs.pin.add(cid);
      console.log(`📌 File pinned: ${cid}`);
    } catch (error) {
      console.error('❌ Failed to pin file:', error);
      throw error;
    }
  }

  async unpinFile(cid: string): Promise<void> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      await this.ipfs.pin.rm(cid);
      console.log(`📌 File unpinned: ${cid}`);
    } catch (error) {
      console.error('❌ Failed to unpin file:', error);
      throw error;
    }
  }

  getGatewayUrl(cid: string): string {
    return `http://localhost:8080/ipfs/${cid}`;
  }

  getPublicGatewayUrl(cid: string): string {
    return `https://ipfs.io/ipfs/${cid}`;
  }

  async getNodeInfo(): Promise<any> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      return await this.ipfs.version();
    } catch (error) {
      console.error('❌ Failed to get node info:', error);
      throw error;
    }
  }

  async getConnectedPeers(): Promise<any[]> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      const peers = [];
      const peersList = await this.ipfs.swarm.peers();
      for (const peer of peersList) {
        peers.push(peer);
      }
      return peers;
    } catch (error) {
      console.error('❌ Failed to get connected peers:', error);
      return [];
    }
  }

  async getStorageStats(): Promise<any> {
    if (!this.ipfs) {
      throw new Error('IPFS not connected. Please start IPFS daemon: ipfs daemon');
    }

    try {
      const stats = await this.ipfs.repo.stat();
      return {
        repoSize: stats.repoSize,
        storageMax: stats.storageMax,
        numObjects: stats.numObjects,
        repoPath: stats.repoPath
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      throw error;
    }
  }
}

// Singleton instance
let ipfsManager: LocalIPFSManager | null = null;

export function getLocalIPFSManager(): LocalIPFSManager {
  if (!ipfsManager) {
    ipfsManager = new LocalIPFSManager();
  }
  return ipfsManager;
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileTypeFromMime(mimeType: string): string {
  const typeMap: { [key: string]: string } = {
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'video/mp4': 'MP4 Video',
    'video/webm': 'WebM Video',
    'audio/mp3': 'MP3 Audio',
    'audio/wav': 'WAV Audio',
    'application/pdf': 'PDF Document',
    'text/plain': 'Text File',
    'application/json': 'JSON File'
  };
  return typeMap[mimeType] || 'Unknown File';
}

export function isValidCID(cid: string): boolean {
  // Basic CID validation (starts with Qm for v0 or bafy for v1)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{52})$/.test(cid);
}

export default LocalIPFSManager;
