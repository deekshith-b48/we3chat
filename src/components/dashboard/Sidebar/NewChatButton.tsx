import React, { useState } from 'react';
import { Plus, User, Users, Search } from 'lucide-react';
import { useChats } from '../../../hooks/supabase/useChats';

interface NewChatButtonProps {
  onChatCreated?: (chatId: string) => void;
}

export function NewChatButton({ onChatCreated }: NewChatButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDirectMessageForm, setShowDirectMessageForm] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { createDirectChat } = useChats();

  const handleCreateDirectMessage = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const chatId = await createDirectChat(username.trim());
      setShowModal(false);
      setShowDirectMessageForm(false);
      setUsername('');
      if (onChatCreated) {
        onChatCreated(chatId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setShowDirectMessageForm(false);
    setUsername('');
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        title="New Chat"
      >
        <Plus className="w-5 h-5" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            {!showDirectMessageForm ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Start New Chat</h3>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowDirectMessageForm(true)}
                    className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-gray-600" />
                    <span>Direct Message</span>
                  </button>
                  
                  <button 
                    className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Users className="w-5 h-5 text-gray-600" />
                    <span>Group Chat (Coming Soon)</span>
                  </button>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={resetModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">New Direct Message</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter username or email
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateDirectMessage()}
                        placeholder="username or email@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setShowDirectMessageForm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateDirectMessage}
                    disabled={loading || !username.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Chat'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
