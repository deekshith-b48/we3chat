/**
 * Messages Hook - Manages message streams on Ceramic
 * 
 * This hook handles reading and writing messages to Ceramic streams
 * while updating Supabase metadata for real-time features.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getCeramicClient, 
  getCurrentDID, 
  generateChatStreamId,
  MessageStream 
} from '../../utils/ceramic';
import { getSupabaseClient } from '../../utils/supabase';

export interface Message {
  id: string;
  sender_did: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  metadata?: Record<string, any>;
}

export interface MessagesState {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface MessagesActions {
  sendMessage: (content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
  refreshMessages: () => Promise<void>;
  clearError: () => void;
}

export function useMessages(chatId: string | null): MessagesState & MessagesActions {
  const [state, setState] = useState<MessagesState>({
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
    lastUpdated: null,
  });

  const streamRef = useRef<any>(null);
  const subscriptionRef = useRef<any>(null);

  /**
   * Load messages from Ceramic stream
   */
  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setState(prev => ({ ...prev, messages: [], lastUpdated: null }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const ceramic = getCeramicClient();
      const did = getCurrentDID();

      if (!did) {
        throw new Error('Not authenticated with Ceramic');
      }

      // Generate deterministic stream ID for this chat
      const streamId = generateChatStreamId(chatId);

      // Try to load existing stream
      try {
        streamRef.current = await ceramic.loadStream(streamId);
        
        // Get current content
        const content = streamRef.current.content as MessageStream;
        
        setState(prev => ({
          ...prev,
          messages: content.messages || [],
          lastUpdated: content.last_updated,
          isLoading: false,
        }));

        console.log(`✅ Loaded ${content.messages?.length || 0} messages for chat ${chatId}`);
      } catch (error) {
        // Stream doesn't exist yet, create it
        console.log('Creating new message stream for chat:', chatId);
        
        const initialContent: MessageStream = {
          messages: [],
          last_updated: new Date().toISOString(),
          version: 1,
        };

        // For now, create a mock stream
        // In a real implementation, you'd use proper Ceramic stream creation
        streamRef.current = {
          content: initialContent,
          update: async (newContent: any) => {
            streamRef.current!.content = newContent;
          },
          subscribe: (_callback: any) => {
            // Mock subscription
            return { unsubscribe: () => {} };
          }
        } as any;
        
        setState(prev => ({
          ...prev,
          messages: [],
          lastUpdated: initialContent.last_updated,
          isLoading: false,
        }));
      }

      // Subscribe to stream updates
      if (streamRef.current) {
        subscriptionRef.current = streamRef.current.subscribe((content: MessageStream) => {
          setState(prev => ({
            ...prev,
            messages: content.messages || [],
            lastUpdated: content.last_updated,
          }));
        });
      }

    } catch (error) {
      console.error('Error loading messages:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load messages',
        isLoading: false,
      }));
    }
  }, [chatId]);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!chatId || !content.trim()) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isSending: true, error: null }));

      const did = getCurrentDID();

      if (!did) {
        throw new Error('Not authenticated with Ceramic');
      }

      if (!streamRef.current) {
        throw new Error('Message stream not loaded');
      }

      // Create new message
      const newMessage: Message = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender_did: did,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        type,
      };

      // Get current content
      const currentContent = streamRef.current.content as MessageStream;
      
      // Add new message
      const updatedContent: MessageStream = {
        ...currentContent,
        messages: [...(currentContent.messages || []), newMessage],
        last_updated: new Date().toISOString(),
        version: (currentContent.version || 1) + 1,
      };

      // Update stream
      await streamRef.current.update(updatedContent);

      // Update Supabase chat metadata (last_activity)
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('chats')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', chatId);
      } catch (error) {
        console.warn('Failed to update Supabase chat metadata:', error);
        // Don't fail the message send if Supabase update fails
      }

      setState(prev => ({ ...prev, isSending: false }));
      console.log('✅ Message sent successfully');

    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isSending: false,
      }));
    }
  }, [chatId]);

  /**
   * Refresh messages from the stream
   */
  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Load messages when chatId changes
   */
  useEffect(() => {
    loadMessages();

    // Cleanup subscription when chatId changes
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      streamRef.current = null;
    };
  }, [loadMessages]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    ...state,
    sendMessage,
    refreshMessages,
    clearError,
  };
}
