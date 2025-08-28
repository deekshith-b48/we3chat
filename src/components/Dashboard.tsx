'use client';

import { useState, useEffect } from 'react';
import { useChatStore, useCurrentConversation, useSelectedFriend } from '@/store/chat-store';
import { useWallet } from '@/hooks/use-wallet';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import WelcomeScreen from '@/components/WelcomeScreen';
import AddFriendModal from '@/components/AddFriendModal';
import UserProfileModal from '@/components/UserProfileModal';

export default function Dashboard() {
  const { address, disconnect } = useWallet();
  const selectedFriend = useChatStore(state => state.selectedFriend);
  const user = useChatStore(state => state.user);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <Sidebar 
          onAddFriend={() => setShowAddFriend(true)}
          onShowProfile={() => setShowProfile(true)}
          onDisconnect={disconnect}
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
