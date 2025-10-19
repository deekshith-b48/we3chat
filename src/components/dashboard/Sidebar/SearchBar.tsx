/**
 * Search Bar Component
 * 
 * Allows users to search for other users to start new chats
 */

import React, { useState, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase';

export interface SearchResult {
  id: string;
  username: string;
  did: string;
  avatar_url?: string;
}

interface SearchBarProps {
  onUserSelect: (user: SearchResult) => void;
  onClose: () => void;
}

export default function SearchBar({ onUserSelect, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, did, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        throw error;
      }

      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchUsers(value);
  };

  const handleUserClick = (user: SearchResult) => {
    onUserSelect(user);
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="relative">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{user.username}</p>
                <p className="text-sm text-gray-500 truncate">
                  DID: {user.did.slice(0, 20)}...
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && !isLoading && (
        <div className="mt-2 p-3 text-center text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}
