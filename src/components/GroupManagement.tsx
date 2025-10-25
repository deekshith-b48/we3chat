import { useState, useEffect } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { web3Api } from '@/lib/web3Api';
import { ipfsService } from '@/lib/ipfs';
import { fileSharingService } from '@/lib/fileSharing';

interface GroupManagementProps {
  groupId: number;
  onClose: () => void;
}

export function GroupManagement({ groupId, onClose }: GroupManagementProps) {
  const { groupChats, userProfile, account, updateGroupChat } = useWeb3ChatStore();
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'settings'>('info');
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    loadGroupInfo();
  }, [groupId]);

  const loadGroupInfo = async () => {
    try {
      setIsLoading(true);
      const groupInfo = await web3Api.getGroupInfo(groupId);
      setGroup(groupInfo);
      setGroupName(groupInfo.name);
      setGroupDescription(groupInfo.description || '');
    } catch (error) {
      console.error('Failed to load group info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!groupName.trim()) return;
    
    try {
      await web3Api.updateGroupName(groupId, groupName);
      setGroup(prev => ({ ...prev, name: groupName }));
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to update group name:', error);
      // TODO: Show error notification
    }
  };

  const handleUpdateGroupDescription = async () => {
    try {
      await web3Api.updateGroupDescription(groupId, groupDescription);
      setGroup(prev => ({ ...prev, description: groupDescription }));
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to update group description:', error);
      // TODO: Show error notification
    }
  };

  const handleUpdateGroupAvatar = async () => {
    if (!avatarFile) return;
    
    try {
      setIsUploadingAvatar(true);
      const avatarCid = await fileSharingService.uploadFile(avatarFile);
      await web3Api.updateGroupAvatar(groupId, avatarCid);
      setGroup(prev => ({ ...prev, avatarCid }));
      setAvatarFile(null);
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to update group avatar:', error);
      // TODO: Show error notification
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberAddress.trim()) return;
    
    try {
      setIsAddingMember(true);
      await web3Api.addGroupMember(groupId, newMemberAddress);
      setNewMemberAddress('');
      await loadGroupInfo(); // Reload to get updated member list
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to add member:', error);
      // TODO: Show error notification
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberAddress: string) => {
    if (memberAddress === account) return; // Can't remove yourself
    
    try {
      await web3Api.removeGroupMember(groupId, memberAddress);
      await loadGroupInfo(); // Reload to get updated member list
      // TODO: Show success notification
    } catch (error) {
      console.error('Failed to remove member:', error);
      // TODO: Show error notification
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await web3Api.leaveGroup(groupId);
        onClose();
        // TODO: Show success notification and redirect
      } catch (error) {
        console.error('Failed to leave group:', error);
        // TODO: Show error notification
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await web3Api.deleteGroup(groupId);
        onClose();
        // TODO: Show success notification and redirect
      } catch (error) {
        console.error('Failed to delete group:', error);
        // TODO: Show error notification
      }
    }
  };

  const isAdmin = group?.creator === account;
  const isMember = group?.members?.includes(account);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Group not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Group Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Group Info */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          {group.avatarCid ? (
            <img
              src={`https://ipfs.io/ipfs/${group.avatarCid}`}
              alt={group.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {group.name[0].toUpperCase()}
              </span>
            </div>
          )}
          
          {isAdmin && (
            <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600">
              📷
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
                className="hidden"
              />
            </label>
          )}
        </div>
        
        <h3 className="text-xl font-bold mt-4">{group.name}</h3>
        <p className="text-gray-600">{group.description || 'No description'}</p>
        <p className="text-sm text-gray-500">{group.members.length} members</p>
        
        {avatarFile && (
          <div className="mt-4">
            <button
              onClick={handleUpdateGroupAvatar}
              disabled={isUploadingAvatar}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Update Avatar'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'info' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Group Info
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'members' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Members ({group.members.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'settings' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isAdmin}
              />
              {isAdmin && (
                <button
                  onClick={handleUpdateGroupName}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Update
                </button>
              )}
            </div>
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="flex space-x-2">
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isAdmin}
                placeholder="Describe your group..."
              />
              {isAdmin && (
                <button
                  onClick={handleUpdateGroupDescription}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Update
                </button>
              )}
            </div>
          </div>

          {/* Group Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Created</div>
              <div className="font-medium">
                {new Date(group.createdAt * 1000).toLocaleDateString()}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Members</div>
              <div className="font-medium">{group.members.length}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Add Member */}
          {isAdmin && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Add Member</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="Enter wallet address"
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddMember}
                  disabled={isAddingMember || !newMemberAddress.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isAddingMember ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {group.members.map((member: string) => (
              <div key={member} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {member === group.creator ? `${member.slice(0, 6)}...${member.slice(-4)} (Admin)` : `${member.slice(0, 6)}...${member.slice(-4)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member === account ? 'You' : 'Member'}
                    </div>
                  </div>
                </div>
                {isAdmin && member !== account && member !== group.creator && (
                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Danger Zone */}
          <div className="border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-4">Danger Zone</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Leave Group</div>
                  <div className="text-sm text-gray-500">
                    You will no longer receive messages from this group
                  </div>
                </div>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Leave Group
                </button>
              </div>
              
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Delete Group</div>
                    <div className="text-sm text-gray-500">
                      Permanently delete this group and all its messages
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteGroup}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Group
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
