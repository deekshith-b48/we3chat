import { useState } from 'react';
import { useWeb3ChatStore } from '@/store/web3Store';
import { web3Api } from '@/lib/web3Api';
import { fileSharingService } from '@/lib/fileSharing';

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated?: (groupId: number) => void;
}

export function CreateGroupModal({ onClose, onGroupCreated }: CreateGroupModalProps) {
  const { friends, loadGroupChats } = useWeb3ChatStore();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleMember = (address: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedMembers.size === 0) {
      alert('Please select at least one member');
      return;
    }

    setIsCreating(true);
    try {
      let avatarCid = '';
      
      // Upload avatar if provided
      if (avatarFile) {
        const result = await fileSharingService.uploadFile(avatarFile);
        if (result.type === 'file') {
          avatarCid = result.fileCid;
        }
      }

      // Create group on smart contract
      const groupId = await web3Api.createGroup(
        groupName,
        groupDescription,
        avatarCid,
        Array.from(selectedMembers)
      );

      // Reload group chats
      await loadGroupChats();

      alert('Group created successfully!');
      
      if (onGroupCreated) {
        onGroupCreated(groupId);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Group Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Group Avatar */}
          <div className="mb-4 text-center">
            <div className="relative inline-block">
              {avatarFile ? (
                <img
                  src={URL.createObjectURL(avatarFile)}
                  alt="Group avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {groupName ? groupName[0].toUpperCase() : '?'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 cursor-pointer hover:bg-blue-600">
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Group Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
          </div>

          {/* Group Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={200}
            />
          </div>

          {/* Member Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members * ({selectedMembers.size} selected)
            </label>
            {friends.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                No friends to add. Add friends first to create a group.
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                {friends.map((friend) => (
                  <div
                    key={friend.address}
                    onClick={() => handleToggleMember(friend.address)}
                    className={`p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 ${
                      selectedMembers.has(friend.address) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(friend.address)}
                      onChange={() => handleToggleMember(friend.address)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {friend.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{friend.name}</div>
                      <div className="text-xs text-gray-500">
                        {friend.address.slice(0, 6)}...{friend.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim() || selectedMembers.size === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
