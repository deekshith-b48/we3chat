"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { UserPlus, X } from "lucide-react";

interface UserProfile {
  id: string;
  username: string | null;
  email: string;
}

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: () => void;
}

export default function CreateChatModal({ isOpen, onClose, onChatCreated }: CreateChatModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [chatName, setChatName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addUser = (userToAdd: UserProfile) => {
    if (!selectedUsers.find(u => u.id === userToAdd.id)) {
      setSelectedUsers([...selectedUsers, userToAdd]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const createChat = async () => {
    if (!user || selectedUsers.length === 0) return;

    setIsLoading(true);
    try {
      // Create the chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: isGroup,
          group_name: isGroup ? chatName : null,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants
      const participants = [
        { chat_id: chatData.chat_id, user_id: user.id },
        ...selectedUsers.map(u => ({ chat_id: chatData.chat_id, user_id: u.id }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      onChatCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setChatName("");
    setIsGroup(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isGroup ? 'Create Group Chat' : 'Start New Chat'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isGroup"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isGroup" className="text-sm text-gray-700">
              Create group chat
            </label>
          </div>

          {/* Group Name */}
          {isGroup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                  >
                    <span>{user.username || user.email}</span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by username or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => addUser(result)}
                  className="w-full text-left p-2 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {result.username || 'No username'}
                    </p>
                    <p className="text-xs text-gray-500">{result.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={createChat}
            disabled={selectedUsers.length === 0 || isLoading || (isGroup && !chatName.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
