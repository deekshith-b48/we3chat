/**
 * Ceramic Client Hook
 * 
 * Manages Ceramic client connection and authentication state
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  createCeramicClient, 
  authenticateWithCeramic, 
  getCurrentDID, 
  isAuthenticated,
  signOutFromCeramic 
} from '../../utils/ceramic';

export interface CeramicState {
  isConnected: boolean;
  isAuthenticated: boolean;
  did: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CeramicActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

export function useCeramic(): CeramicState & CeramicActions {
  const [state, setState] = useState<CeramicState>({
    isConnected: false,
    isAuthenticated: false,
    did: null,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize Ceramic client
   */
  useEffect(() => {
    const initializeCeramic = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Create Ceramic client
        await createCeramicClient();

        // Check if already authenticated
        const authenticated = isAuthenticated();
        const did = getCurrentDID();

        setState(prev => ({
          ...prev,
          isConnected: true,
          isAuthenticated: authenticated,
          did: did,
          isLoading: false,
        }));

        console.log('✅ Ceramic client initialized');
      } catch (error) {
        console.error('Ceramic initialization error:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize Ceramic',
          isLoading: false,
        }));
      }
    };

    initializeCeramic();
  }, []);

  /**
   * Connect to Ceramic (authenticate with wallet)
   */
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Authenticate with Ceramic
      await authenticateWithCeramic();
      const did = getCurrentDID();

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        did: did,
        isLoading: false,
      }));

      console.log('✅ Connected to Ceramic');
    } catch (error) {
      console.error('Ceramic connection error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect to Ceramic',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Disconnect from Ceramic
   */
  const disconnect = useCallback(() => {
    try {
      signOutFromCeramic();
      
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        did: null,
      }));

      console.log('✅ Disconnected from Ceramic');
    } catch (error) {
      console.error('Ceramic disconnection error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect from Ceramic',
      }));
    }
  }, []);

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    clearError,
  };
}
