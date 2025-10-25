import { useState, useEffect } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { web3Api } from '@/lib/web3Api';

interface FriendRequest {
  from: string;
  to: string;
  timestamp: number;
  isActive: boolean;
  username?: string;
  avatarCid?: string;
}

interface FriendRequestsProps {
  onClose: () => void;
}

export function FriendRequests({ onClose }: FriendRequestsProps) {
  const { account, loadFriends } = useWeb3ChatStore();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFriendRequests();
  }, [account]);

  const loadFriendRequests = async () => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      const friendRequests = await web3Api.getFriendRequests(account);
      
      // Load user profiles for each request
      const requestsWithProfiles = await Promise.all(
        friendRequests.map(async (req) => {
          try {
            const profile = await web3Api.getUserProfile(req.from);
            return {
              ...req,
              username: profile.username,
              avatarCid: profile.avatarCid
            };
          } catch {
            return req;
          }
        })
      );
      
      setRequests(requestsWithProfiles.filter(r => r.isActive));
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (fromAddress: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(fromAddress));
      await web3Api.acceptFriendRequest(fromAddress);
      
      // Remove from list
      setRequests(prev => prev.filter(r => r.from !== fromAddress));
      
      // Reload friends list
      await loadFriends();
      
      alert('Friend request accepted!');
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      alert('Failed to accept friend request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(fromAddress);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async (fromAddress: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(fromAddress));
      await web3Api.rejectFriendRequest(fromAddress);
      
      // Remove from list
      setRequests(prev => prev.filter(r => r.from !== fromAddress));
      
      alert('Friend request rejected.');
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      alert('Failed to reject friend request. Please try again.');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(fromAddress);
        return newSet;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Friend Requests</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Requests List */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading friend requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-5xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Friend Requests</h3>
              <p className="text-gray-500">You don't have any pending friend requests.</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request.from} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {request.username ? request.username[0].toUpperCase() : '?'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {request.username || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.from.slice(0, 6)}...{request.from.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(request.timestamp * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request.from)}
                        disabled={processingRequests.has(request.from)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                      >
                        {processingRequests.has(request.from) ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.from)}
                        disabled={processingRequests.has(request.from)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
