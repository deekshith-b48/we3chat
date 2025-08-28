'use client';

import { useState, useEffect } from 'react';
import { useChatStore, useCurrentConversation, useSelectedFriend } from '@/store/chat-store';
import { useAuth } from '@/hooks/use-auth';
import { useMessageEvents } from '@/hooks/use-messaging';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import WelcomeScreen from '@/components/WelcomeScreen';
import AddFriendModal from '@/components/AddFriendModal';
import UserProfileModal from '@/components/UserProfileModal';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const selectedFriend = useChatStore(state => state.selectedFriend);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Initialize real-time messaging and data loading
  const realTimeMessaging = useMessageEvents();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <Sidebar 
          onAddFriend={() => setShowAddFriend(true)}
          onShowProfile={() => setShowProfile(true)}
          onDisconnect={signOut}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <ChatArea />
        ) : (
          <WelcomeScreen onAddFriend={() => setShowAddFriend(true)} />
        )}
      </div>

      {/* Connection Status Indicator */}
      {realTimeMessaging.isConnected && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddFriend && (
        <AddFriendModal 
          isOpen={showAddFriend}
          onClose={() => setShowAddFriend(false)}
        />
      )}

      {showProfile && (
        <UserProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
