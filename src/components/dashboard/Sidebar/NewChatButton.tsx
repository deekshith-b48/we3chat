/**
 * New Chat Button Component
 * 
 * Opens a modal to start a new chat with another user
 */

import React, { useState } from 'react';
import UserSearch from '../../UserSearch';
import { getSupabaseClient } from '../../../utils/supabase';
import { useAuth } from '../../../hooks/supabase/useAuth';

interface NewChatButtonProps {
  onChatCreated: (chatId: string) => void;
}

export default function NewChatButton({ onChatCreated }: NewChatButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const handleUserSelect = async (selectedUser: any) => {
    if (!user) return;

    try {
      setIsCreating(true);

      const supabase = getSupabaseClient();

      // Check if a direct chat already exists between these users
      const { data: existingChats, error: checkError } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner(
            id,
            type,
            chat_participants!inner(user_id)
          )
        `)
        .eq('user_id', user.id)
        .eq('chats.type', 'direct');

      if (checkError) {
        throw checkError;
      }

      // Find existing direct chat with the selected user
      const existingChat = existingChats?.find((chat: any) => 
        chat.chats.chat_participants.some((p: any) => p.user_id === selectedUser.id)
      );

      if (existingChat) {
        // Chat already exists, just open it
        onChatCreated(existingChat.chat_id);
        setShowModal(false);
        return;
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: `Chat with ${selectedUser.username}`,
          type: 'direct',
          last_activity: new Date().toISOString(),
        })
        .select()
        .single();

      if (chatError) {
        throw chatError;
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          {
            chat_id: newChat.id,
            user_id: user.id,
            role: 'member',
          },
          {
            chat_id: newChat.id,
            user_id: selectedUser.id,
            role: 'member',
          },
        ]);

      if (participantsError) {
        throw participantsError;
      }

      // Create notification for the other user
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedUser.id,
          message: `${user.email} started a chat with you`,
          type: 'message',
        });

      onChatCreated(newChat.id);
      setShowModal(false);

    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>New Chat</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Start New Chat</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <UserSearch
              onUserSelect={handleUserSelect}
              onClose={() => setShowModal(false)}
            />

            {isCreating && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating chat...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
