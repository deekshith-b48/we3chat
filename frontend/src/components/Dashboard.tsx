import { useEffect } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { WalletConnection } from './WalletConnection';
import { UserRegistration } from './UserRegistration';
import { ChatInterface } from './ChatInterface';
import { TopNavBar } from './dashboard/TopNavBar';

export function Dashboard() {
  const {
    isConnected,
    account,
    isRegistered,
    userProfile,
    friends,
    loadUserProfile,
    loadFriends,
    loadConversations,
    loadGroupChats,
    connectWallet,
    disconnectWallet
  } = useWeb3ChatStore();

  useEffect(() => {
    if (isConnected && account) {
      // Load user data when connected
      loadUserProfile();
      loadFriends();
      loadConversations();
      loadGroupChats();
    }
  }, [isConnected, account, loadUserProfile, loadFriends, loadConversations, loadGroupChats]);

  // Show wallet connection if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">We3Chat</h1>
            <p className="text-gray-600">
              Decentralized chat application built on blockchain
            </p>
          </div>
          <WalletConnection />
        </div>
      </div>
    );
  }

  // Show user registration if connected but not registered
  if (isConnected && !isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to We3Chat</h1>
            <p className="text-gray-600">
              Complete your profile to start chatting
            </p>
          </div>
          <UserRegistration />
        </div>
      </div>
    );
  }

  // Show main chat interface if connected and registered
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <TopNavBar 
          account={account}
          userProfile={userProfile}
          onDisconnect={disconnectWallet}
        />
        <ChatInterface />
      </div>
    </div>
  );
}