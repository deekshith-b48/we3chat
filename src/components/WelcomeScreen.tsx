'use client';

import { useChatStore } from '@/store/chat-store';

interface WelcomeScreenProps {
  onAddFriend: () => void;
}

export default function WelcomeScreen({ onAddFriend }: WelcomeScreenProps) {
  const user = useChatStore(state => state.user);
  const friends = useChatStore(state => state.friends);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to we3chat, {user?.username || 'User'}!
        </h2>
        
        <p className="text-gray-600 mb-8">
          {friends.length === 0 
            ? "You haven't added any friends yet. Start by adding someone to begin secure, encrypted conversations."
            : "Select a conversation from the sidebar to start chatting, or add new friends to expand your network."
          }
        </p>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">End-to-End Encrypted</h3>
            <p className="text-sm text-gray-600">Your messages are encrypted locally before being stored on IPFS.</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Blockchain Verified</h3>
            <p className="text-sm text-gray-600">All messages are verified and stored on the blockchain.</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Fully Decentralized</h3>
            <p className="text-sm text-gray-600">No central servers. Your data is owned by you.</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Friend Network</h3>
            <p className="text-sm text-gray-600">Connect with friends through mutual verification.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={onAddFriend}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>{friends.length === 0 ? 'Add Your First Friend' : 'Add Friend'}</span>
          </button>

          {friends.length > 0 && (
            <p className="text-sm text-gray-500">
              Or select a friend from the sidebar to continue an existing conversation
            </p>
          )}
        </div>

        {/* Stats */}
        {friends.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 text-center">
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-lg font-bold text-gray-900">{friends.length}</div>
              <div className="text-sm text-gray-500">Friends</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-lg font-bold text-gray-900">
                {Object.values(useChatStore.getState().conversations).reduce((acc, conv) => acc + conv.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Messages</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
