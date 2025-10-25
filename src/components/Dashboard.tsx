import { useEffect, useState } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { WalletConnection } from './WalletConnection';
import { UserRegistration } from './UserRegistration';
import { AdvancedChatInterface } from './AdvancedChatInterface';
import { TopNavBar } from './dashboard/TopNavBar';

export function Dashboard() {
  const {
    isConnected,
    account,
    isRegistered,
    userProfile,
    conversations,
    groupChats,
    loadUserProfile,
    loadFriends,
    loadConversations,
    loadGroupChats,
    disconnectWallet
  } = useWeb3ChatStore();

  const [selectedChat, setSelectedChat] = useState<{
    id: string;
    name: string;
    type: 'direct' | 'group';
  } | null>(null);

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
        
        {selectedChat ? (
          <AdvancedChatInterface
            chatId={selectedChat.id}
            chatName={selectedChat.name}
            chatType={selectedChat.type}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to We3Chat</h2>
              <p className="text-gray-600 mb-6">Select a conversation to start chatting</p>
              
              {/* Direct Messages */}
              {conversations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Direct Messages</h3>
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedChat({
                          id: conv.id,
                          name: conv.name,
                          type: 'direct'
                        })}
                        className="w-full p-3 text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium">{conv.name}</div>
                        <div className="text-sm text-gray-500">{conv.lastMessage}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Group Chats */}
              {groupChats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Group Chats</h3>
                  <div className="space-y-2">
                    {groupChats.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedChat({
                          id: group.id.toString(),
                          name: group.name,
                          type: 'group'
                        })}
                        className="w-full p-3 text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-gray-500">{group.members.length} members</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {conversations.length === 0 && groupChats.length === 0 && (
                <div className="text-gray-500">
                  <p>No conversations yet. Start by adding friends or creating a group!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}