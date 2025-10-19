/**
 * IPFS Hook
 * 
 * Handles IPFS operations for storing encrypted messages using free IPFS services
 */

import { useState, useCallback, useEffect } from 'react';
import { getIPFSService, IPFSUploadResult } from '../../lib/ipfs-service';

export interface IPFSState {
  isLoading: boolean;
  error: string | null;
  availableProviders: string[];
  providerStatus: Record<string, boolean>;
}

export interface IPFSActions {
  uploadMessage: (encryptedMessage: string, filename?: string) => Promise<IPFSUploadResult>;
  downloadMessage: (cid: string) => Promise<string>;
  clearError: () => void;
  refreshProviders: () => void;
}

export function useIPFS(): IPFSState & IPFSActions {
  const [state, setState] = useState<IPFSState>({
    isLoading: false,
    error: null,
    availableProviders: [],
    providerStatus: {}
  });

  const ipfsService = getIPFSService();

  // Initialize providers on mount
  useEffect(() => {
    refreshProviders();
  }, []);

  const refreshProviders = useCallback(() => {
    const availableProviders = ipfsService.getAvailableProviders();
    const providerStatus = ipfsService.getProviderStatus();
    
    setState(prev => ({
      ...prev,
      availableProviders,
      providerStatus
    }));

    console.log('🔧 IPFS Providers:', {
      available: availableProviders,
      status: providerStatus
    });
  }, [ipfsService]);

  /**
   * Upload encrypted message to IPFS using free services
   * Returns the upload result with CID and provider info
   */
  const uploadMessage = useCallback(async (
    encryptedMessage: string, 
    filename = 'message.txt'
  ): Promise<IPFSUploadResult> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('📤 Uploading message to IPFS...');
      const result = await ipfsService.upload(encryptedMessage, filename);

      setState(prev => ({ ...prev, isLoading: false }));

      console.log('✅ Message uploaded successfully:', {
        cid: result.cid,
        provider: result.provider,
        size: result.size,
        url: result.url
      });

      return result;

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'IPFS upload failed',
        isLoading: false
      }));
      throw error;
    }
  }, [ipfsService]);

  /**
   * Download message from IPFS using CID
   */
  const downloadMessage = useCallback(async (cid: string): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('📥 Downloading message from IPFS:', cid);
      const content = await ipfsService.download(cid);

      setState(prev => ({ ...prev, isLoading: false }));

      console.log('✅ Message downloaded successfully');
      return content;

    } catch (error) {
      console.error('❌ IPFS download failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'IPFS download failed',
        isLoading: false
      }));
      throw error;
    }
  }, [ipfsService]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    uploadMessage,
    downloadMessage,
    clearError,
    refreshProviders
  };
}

// Real IPFS implementation using Web3.Storage (commented out for demo)
/*
import { Web3Storage } from 'web3.storage';

const WEB3_STORAGE_TOKEN = import.meta.env.VITE_WEB3_STORAGE_TOKEN;

export function useIPFS(): IPFSState & IPFSActions {
  const [state, setState] = useState<IPFSState>({
    isLoading: false,
    error: null
  });

  const uploadMessage = useCallback(async (encryptedMessage: string): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!WEB3_STORAGE_TOKEN) {
        throw new Error('Web3.Storage token not configured');
      }

      const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });
      
      const file = new File([encryptedMessage], 'message.txt', {
        type: 'text/plain',
      });

      const cid = await client.put([file]);
      console.log('📤 Message uploaded to IPFS:', cid);

      setState(prev => ({ ...prev, isLoading: false }));
      return cid;

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'IPFS upload failed',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const downloadMessage = useCallback(async (cid: string): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!WEB3_STORAGE_TOKEN) {
        throw new Error('Web3.Storage token not configured');
      }

      const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });
      const res = await client.get(cid);
      
      if (!res) {
        throw new Error('Message not found on IPFS');
      }

      const files = await res.files();
      const file = files[0];
      const content = await file.text();

      console.log('📥 Message downloaded from IPFS:', cid);

      setState(prev => ({ ...prev, isLoading: false }));
      return content;

    } catch (error) {
      console.error('❌ IPFS download failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'IPFS download failed',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    uploadMessage,
    downloadMessage,
    clearError
  };
}
*/
