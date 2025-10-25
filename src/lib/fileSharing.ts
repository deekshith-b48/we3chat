import { ipfsService } from './ipfs';
import { 
  ImageMessage, 
  FileMessage, 
  VoiceMessage, 
  VideoMessage,
  createImageMessage,
  createFileMessage,
  createVoiceMessage
} from './messageTypes';

export interface FileUploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  checksum?: string;
}

export class FileSharingService {
  private uploadProgress: Map<string, FileUploadProgress> = new Map();
  private progressCallbacks: Map<string, (progress: FileUploadProgress) => void> = new Map();

  async uploadFile(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileMessage> {
    const fileId = this.generateFileId();
    
    try {
      // Initialize progress tracking
      const progress: FileUploadProgress = {
        fileId,
        progress: 0,
        status: 'uploading'
      };
      this.uploadProgress.set(fileId, progress);
      
      if (onProgress) {
        this.progressCallbacks.set(fileId, onProgress);
        onProgress(progress);
      }

      // Create file metadata
      const metadata: FileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };

      // Update progress
      progress.progress = 20;
      progress.status = 'processing';
      this.updateProgress(fileId, progress);

      // Upload file to IPFS
      const cid = await ipfsService.uploadFile(file);
      
      // Update progress
      progress.progress = 80;
      this.updateProgress(fileId, progress);

      // Upload metadata to IPFS
      const metadataCid = await ipfsService.uploadMessage(JSON.stringify(metadata));

      // Update progress
      progress.progress = 100;
      progress.status = 'completed';
      this.updateProgress(fileId, progress);

      // Clean up
      this.uploadProgress.delete(fileId);
      this.progressCallbacks.delete(fileId);

      return createFileMessage(
        cid,
        file.name,
        file.size,
        file.type,
        metadataCid
      );

    } catch (error) {
      const progress = this.uploadProgress.get(fileId);
      if (progress) {
        progress.status = 'error';
        progress.error = error instanceof Error ? error.message : 'Upload failed';
        this.updateProgress(fileId, progress);
      }
      throw error;
    }
  }

  async uploadImage(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<ImageMessage> {
    const fileId = this.generateFileId();
    
    try {
      // Initialize progress tracking
      const progress: FileUploadProgress = {
        fileId,
        progress: 0,
        status: 'uploading'
      };
      this.uploadProgress.set(fileId, progress);
      
      if (onProgress) {
        this.progressCallbacks.set(fileId, onProgress);
        onProgress(progress);
      }

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);
      
      // Update progress
      progress.progress = 20;
      progress.status = 'processing';
      this.updateProgress(fileId, progress);

      // Create image preview
      const preview = await this.createImagePreview(file);
      
      // Update progress
      progress.progress = 40;
      this.updateProgress(fileId, progress);

      // Upload original image to IPFS
      const originalCid = await ipfsService.uploadFile(file);
      
      // Update progress
      progress.progress = 70;
      this.updateProgress(fileId, progress);

      // Upload preview to IPFS
      const previewCid = await ipfsService.uploadFile(preview);

      // Update progress
      progress.progress = 100;
      progress.status = 'completed';
      this.updateProgress(fileId, progress);

      // Clean up
      this.uploadProgress.delete(fileId);
      this.progressCallbacks.delete(fileId);

      return createImageMessage(
        originalCid,
        dimensions.width,
        dimensions.height,
        file.size,
        file.type,
        undefined, // caption
        previewCid
      );

    } catch (error) {
      const progress = this.uploadProgress.get(fileId);
      if (progress) {
        progress.status = 'error';
        progress.error = error instanceof Error ? error.message : 'Upload failed';
        this.updateProgress(fileId, progress);
      }
      throw error;
    }
  }

  async uploadVoice(
    audioBlob: Blob,
    duration: number,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<VoiceMessage> {
    const fileId = this.generateFileId();
    
    try {
      // Initialize progress tracking
      const progress: FileUploadProgress = {
        fileId,
        progress: 0,
        status: 'uploading'
      };
      this.uploadProgress.set(fileId, progress);
      
      if (onProgress) {
        this.progressCallbacks.set(fileId, onProgress);
        onProgress(progress);
      }

      const file = new File([audioBlob], 'voice.ogg', { type: 'audio/ogg' });
      
      // Update progress
      progress.progress = 50;
      progress.status = 'processing';
      this.updateProgress(fileId, progress);

      // Upload to IPFS
      const cid = await ipfsService.uploadFile(file);

      // Generate waveform (optional)
      const waveform = await this.generateWaveform(audioBlob);

      // Update progress
      progress.progress = 100;
      progress.status = 'completed';
      this.updateProgress(fileId, progress);

      // Clean up
      this.uploadProgress.delete(fileId);
      this.progressCallbacks.delete(fileId);

      return createVoiceMessage(cid, duration, waveform);

    } catch (error) {
      const progress = this.uploadProgress.get(fileId);
      if (progress) {
        progress.status = 'error';
        progress.error = error instanceof Error ? error.message : 'Upload failed';
        this.updateProgress(fileId, progress);
      }
      throw error;
    }
  }

  async uploadVideo(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<VideoMessage> {
    const fileId = this.generateFileId();
    
    try {
      // Initialize progress tracking
      const progress: FileUploadProgress = {
        fileId,
        progress: 0,
        status: 'uploading'
      };
      this.uploadProgress.set(fileId, progress);
      
      if (onProgress) {
        this.progressCallbacks.set(fileId, onProgress);
        onProgress(progress);
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(file);
      
      // Update progress
      progress.progress = 20;
      progress.status = 'processing';
      this.updateProgress(fileId, progress);

      // Create video thumbnail
      const thumbnail = await this.createVideoThumbnail(file);
      
      // Update progress
      progress.progress = 40;
      this.updateProgress(fileId, progress);

      // Upload video to IPFS
      const videoCid = await ipfsService.uploadFile(file);
      
      // Update progress
      progress.progress = 70;
      this.updateProgress(fileId, progress);

      // Upload thumbnail to IPFS
      const thumbnailCid = await ipfsService.uploadFile(thumbnail);

      // Update progress
      progress.progress = 100;
      progress.status = 'completed';
      this.updateProgress(fileId, progress);

      // Clean up
      this.uploadProgress.delete(fileId);
      this.progressCallbacks.delete(fileId);

      return {
        type: 'video',
        videoCid,
        thumbnailCid,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fileSize: file.size
      };

    } catch (error) {
      const progress = this.uploadProgress.get(fileId);
      if (progress) {
        progress.status = 'error';
        progress.error = error instanceof Error ? error.message : 'Upload failed';
        this.updateProgress(fileId, progress);
      }
      throw error;
    }
  }

  async downloadFile(cid: string): Promise<File> {
    try {
      return await ipfsService.downloadFile(cid);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error('Failed to download file from IPFS');
    }
  }

  async getFileUrl(cid: string): Promise<string> {
    return `https://ipfs.io/ipfs/${cid}`;
  }

  // Helper methods
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateProgress(fileId: string, progress: FileUploadProgress): void {
    this.uploadProgress.set(fileId, progress);
    const callback = this.progressCallbacks.get(fileId);
    if (callback) {
      callback(progress);
    }
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async createImagePreview(file: File, maxSize = 300): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], 'preview.jpg', { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to create preview'));
          }
        }, 'image/jpeg', 0.8);
        
        URL.revokeObjectURL(img.src);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateWaveform(audioBlob: Blob): Promise<number[]> {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioBuffer.getChannelData(0);
          
          // Generate waveform data (simplified)
          const samples = 100;
          const blockSize = Math.floor(channelData.length / samples);
          const waveform: number[] = [];
          
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channelData[i * blockSize + j]);
            }
            waveform.push(sum / blockSize);
          }
          
          resolve(waveform);
        } catch (error) {
          console.warn('Failed to generate waveform:', error);
          resolve([]);
        }
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  private async getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  private async createVideoThumbnail(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      video.onloadedmetadata = () => {
        // Set canvas dimensions
        canvas.width = 300;
        canvas.height = (300 * video.videoHeight) / video.videoWidth;
        
        // Seek to 1 second or 10% of duration
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        }, 'image/jpeg', 0.8);
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  // Progress tracking
  getUploadProgress(fileId: string): FileUploadProgress | undefined {
    return this.uploadProgress.get(fileId);
  }

  cancelUpload(fileId: string): void {
    this.uploadProgress.delete(fileId);
    this.progressCallbacks.delete(fileId);
  }
}

export const fileSharingService = new FileSharingService();
