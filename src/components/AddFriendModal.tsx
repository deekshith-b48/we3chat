'use client';

import { useState, useEffect } from 'react';
import { useAddFriend } from '@/hooks/use-contract';
import { useUserInfo } from '@/hooks/use-contract';
import { ethers } from 'ethers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [address, setAddress] = useState('');
  const [searchStep, setSearchStep] = useState<'input' | 'searching' | 'found' | 'adding'>('input');
  
  const { addFriend, isLoading: isAdding, error: addError } = useAddFriend();
  const { userInfo, isLoading: isSearching, error: searchError } = useUserInfo(
    searchStep === 'searching' && ethers.utils.isAddress(address) ? address : null
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) return;
    
    if (!ethers.utils.isAddress(address)) {
      return;
    }
    
    setSearchStep('searching');
  };

  const handleAddFriend = async () => {
    if (!userInfo?.isRegistered) return;
    
    setSearchStep('adding');
    const success = await addFriend(address);
    
    if (success) {
      onClose();
      setAddress('');
      setSearchStep('input');
    } else {
      setSearchStep('found');
    }
  };

  const handleClose = () => {
    onClose();
    setAddress('');
    setSearchStep('input');
  };

  // Update search step when user info is loaded
  useEffect(() => {
    if (searchStep === 'searching' && !isSearching) {
      if (userInfo?.isRegistered) {
        setSearchStep('found');
      } else {
        setSearchStep('input');
      }
    }
  }, [searchStep, isSearching, userInfo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Friend</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {searchStep === 'input' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Enter the Ethereum address of the person you want to add as a friend.
              </p>
              
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Ethereum Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  {address && !ethers.utils.isAddress(address) && (
                    <p className="mt-1 text-sm text-red-600">Please enter a valid Ethereum address</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!ethers.utils.isAddress(address)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search User
                </button>
              </form>
            </div>
          )}

          {searchStep === 'searching' && (
            <div className="text-center py-8">
              <LoadingSpinner size="large" />
              <p className="mt-4 text-gray-600">Searching for user...</p>
            </div>
          )}

          {searchStep === 'found' && userInfo && (
            <div className="space-y-4">
              {userInfo.isRegistered ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-semibold text-lg">
                        {userInfo.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{userInfo.username}</h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div>
                        <h4 className="font-medium text-blue-900">About Friend Requests</h4>
                        <p className="text-sm text-blue-800 mt-1">
                          Adding someone as a friend will allow them to send you encrypted messages. 
                          Both parties need to add each other for full mutual friendship.
                        </p>
                      </div>
                    </div>
                  </div>

                  {addError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{addError}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFriend}
                      disabled={isAdding}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isAdding ? (
                        <>
                          <LoadingSpinner size="small" color="white" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <span>Add Friend</span>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">User Not Found</h3>
                    <p className="text-gray-600">
                      This address doesn't have a we3chat account yet.
                    </p>
                    <p className="text-sm text-gray-500 mt-2 font-mono">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      <div>
                        <h4 className="font-medium text-yellow-900">User needs to register</h4>
                        <p className="text-sm text-yellow-800 mt-1">
                          The person at this address needs to create a we3chat account first. 
                          Ask them to visit we3chat and complete the registration process.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSearchStep('input')}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Search Another Address
                  </button>
                </>
              )}
            </div>
          )}

          {searchError && searchStep === 'input' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">Error searching for user: {searchError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
