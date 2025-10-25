import { useState, useEffect } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { web3Api } from '@/lib/web3Api';

interface User {
  address: string;
  username: string;
  bio: string;
  avatarCid: string;
  reputation: number;
  isActive: boolean;
}

interface UserDiscoveryProps {
  onClose: () => void;
}

export function UserDiscovery({ onClose }: UserDiscoveryProps) {
  const { account, friends } = useWeb3ChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      // Get all registered users from the smart contract
      const users = await web3Api.getAllUsers();
      setAllUsers(users.filter(u => u.address !== account && u.isActive));
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = allUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.address.toLowerCase().includes(query.toLowerCase()) ||
      user.bio.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(filtered);
  };

  const handleSendFriendRequest = async (userAddress: string) => {
    try {
      setPendingRequests(prev => new Set(prev).add(userAddress));
      await web3Api.sendFriendRequest(userAddress);
      // Show success message
      alert('Friend request sent successfully!');
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert('Failed to send friend request. Please try again.');
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userAddress);
        return newSet;
      });
    }
  };

  const isFriend = (address: string) => {
    return friends.some(f => f.address === address);
  };

  const displayUsers = searchQuery ? searchResults : allUsers.slice(0, 20);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Discover We3Chat Users</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username, address, or bio..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Users List */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No users found' : 'No users available'}
            </div>
          ) : (
            <div className="divide-y">
              {displayUsers.map((user) => (
                <div key={user.address} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-500">
                        {user.address.slice(0, 6)}...{user.address.slice(-4)}
                      </div>
                      {user.bio && (
                        <div className="text-sm text-gray-600 mt-1">{user.bio}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Reputation: {user.reputation}
                        </span>
                        {user.isActive && (
                          <span className="text-xs text-green-500">● Online</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {isFriend(user.address) ? (
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                          Friend
                        </span>
                      ) : pendingRequests.has(user.address) ? (
                        <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(user.address)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            {allUsers.length} registered users on We3Chat
          </p>
        </div>
      </div>
    </div>
  );
}
