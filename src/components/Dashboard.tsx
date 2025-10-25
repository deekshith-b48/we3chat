import { useEffect, useState } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { WalletConnection } from './WalletConnection';
import { UserRegistration } from './UserRegistration';
import { AdvancedChatInterface } from './AdvancedChatInterface';
import { TopNavBar } from './dashboard/TopNavBar';
import { UserDiscovery } from './UserDiscovery';
import { FriendRequests } from './FriendRequests';
import { CreateGroupModal } from './CreateGroupModal';

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

  const [showUserDiscovery, setShowUserDiscovery] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

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
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">We3Chat</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowUserDiscovery(true)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center justify-center"
                title="Discover Users"
              >
                🔍
              </button>
              <button
                onClick={() => setShowFriendRequests(true)}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center justify-center"
                title="Friend Requests"
              >
                👥
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center justify-center"
                title="Create Group"
              >
                ➕
              </button>
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto">
            {/* Direct Messages Section */}
            {friends.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Friends ({friends.length})
                </div>
                <div className="space-y-1">
                  {friends.map((friend) => (
                    <button
                      key={friend.address}
                      onClick={() => setSelectedChat({
                        id: friend.address,
                        name: friend.name,
                        type: 'direct'
                      })}
                      className={`w-full p-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                        selectedChat?.id === friend.address ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {friend.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{friend.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {friend.address.slice(0, 6)}...{friend.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group Chats Section */}
            {groupChats.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Groups ({groupChats.length})
                </div>
                <div className="space-y-1">
                  {groupChats.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedChat({
                        id: group.id.toString(),
                        name: group.name,
                        type: 'group'
                      })}
                      className={`w-full p-3 rounded-lg text-left hover:bg-gray-100 transition-colors ${
                        selectedChat?.id === group.id.toString() ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {group.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{group.name}</div>
                          <div className="text-xs text-gray-500">
                            {group.members.length} members
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {friends.length === 0 && groupChats.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-sm mb-4">No conversations yet!</p>
                <button
                  onClick={() => setShowUserDiscovery(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Find Friends
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {userProfile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{userProfile?.username || 'User'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-red-500 hover:text-red-700"
                title="Disconnect"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
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
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to We3Chat</h2>
              <p className="text-gray-600 mb-6">
                Select a conversation to start chatting or discover new users to connect with.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowUserDiscovery(true)}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  🔍 Discover Users
                </button>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
                >
                  ➕ Create Group
                </button>
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    ☰ Show Sidebar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUserDiscovery && (
        <UserDiscovery onClose={() => setShowUserDiscovery(false)} />
      )}
      
      {showFriendRequests && (
        <FriendRequests onClose={() => setShowFriendRequests(false)} />
      )}
      
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(groupId) => {
            setShowCreateGroup(false);
            loadGroupChats();
          }}
        />
      )}
    </div>
  );
}