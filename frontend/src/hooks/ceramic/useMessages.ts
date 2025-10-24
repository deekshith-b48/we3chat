import { useState, useEffect, useCallback } from 'react';
import { CeramicMessage, addMessageToStream, getMessagesFromStream, createMessageStream } from '@/utils/ceramic';
import { useAuth } from '../supabase/useAuth';
import { useChats } from '../supabase/useChats';

export function useMessages(activeChatId: string | null) {
  const { ceramicDID, profile } = useAuth();
  const { updateChatActivity } = useChats();
  const [messages, setMessages] = useState<CeramicMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);

  // Load messages from Ceramic stream
  const loadMessages = useCallback(async (chatId: string) => {
    if (!ceramicDID) return;

    try {
      setLoading(true);
      setError(null);

      // For demo purposes, we'll create a deterministic stream ID based on chat ID
      // In production, this should be stored in the chat record in Supabase
      const deterministicStreamId = `we3chat-messages-${chatId}`;
      setStreamId(deterministicStreamId);

      // Try to load existing messages
      const existingMessages = await getMessagesFromStream(deterministicStreamId);
      setMessages(existingMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      
      // If stream doesn't exist, create it
      if (activeChatId) {
        try {
          const newStreamId = await createMessageStream(activeChatId);
          setStreamId(newStreamId);
          setMessages([]);
        } catch (createErr) {
          console.error('Error creating message stream:', createErr);
          setError('Failed to initialize message stream');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [ceramicDID, activeChatId]);

  // Send a new message
  const sendMessage = useCallback(async (content: string) => {
    if (!streamId || !ceramicDID || !activeChatId || !profile) {
      throw new Error('Cannot send message: missing required data');
    }

    try {
      setError(null);

      const message: Omit<CeramicMessage, 'id'> = {
        sender_did: ceramicDID,
        content,
        timestamp: new Date().toISOString()
      };

      // Optimistic update
      const optimisticMessage: CeramicMessage = {
        ...message,
        id: `temp-${Date.now()}`
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Add to Ceramic stream
      await addMessageToStream(streamId, message);

      // Update chat activity in Supabase (hot layer)
      await updateChatActivity(activeChatId);

      // Reload messages to get the actual committed version
      await loadMessages(activeChatId);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      throw err;
    }
  }, [streamId, ceramicDID, activeChatId, profile, updateChatActivity, loadMessages]);

  // Subscribe to real-time updates (mock implementation)
  const subscribeToUpdates = useCallback(() => {
    // In a real implementation, this would subscribe to Ceramic stream updates
    // For now, we'll poll periodically
    const interval = setInterval(async () => {
      if (streamId) {
        try {
          const updatedMessages = await getMessagesFromStream(streamId);
          setMessages(prev => {
            // Only update if there are new messages
            if (updatedMessages.length > prev.length) {
              return updatedMessages;
            }
            return prev;
          });
        } catch (err) {
          console.error('Error checking for message updates:', err);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [streamId]);

  // Load messages when chat changes
  useEffect(() => {
    if (activeChatId && ceramicDID) {
      loadMessages(activeChatId);
    } else {
      setMessages([]);
      setStreamId(null);
    }
  }, [activeChatId, ceramicDID, loadMessages]);

  // Subscribe to updates when stream is available
  useEffect(() => {
    if (activeChatId && streamId) {
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [activeChatId, streamId, subscribeToUpdates]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    reloadMessages: () => activeChatId ? loadMessages(activeChatId) : Promise.resolve()
  };
}
