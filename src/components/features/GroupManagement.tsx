'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Settings, 
  Crown, 
  Shield, 
  UserPlus, 
  UserMinus,
  MoreVertical,
  MessageCircle,
  Lock,
  Phone,
  Video,
  Trash2,
} from 'lucide-react';

interface GroupMember {
  id: string;
  address: string;
  name: string;
  avatar: string;
  role: 'admin' | 'member';
  joinedAt: number;
  isOnline: boolean;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: GroupMember[];
  createdAt: number;
  isPrivate: boolean;
  isEncrypted: boolean;
  settings: {
    allowInvites: boolean;
    allowFileSharing: boolean;
    allowVoiceCalls: boolean;
    allowVideoCalls: boolean;
  };
}

interface GroupManagementProps {
  group: GroupInfo;
  currentUser: string;
  onUpdateGroup: (updates: Partial<GroupInfo>) => void;
  onAddMember: (address: string) => void;
  onRemoveMember: (address: string) => void;
  onUpdateMemberRole: (address: string, role: 'admin' | 'member') => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
}

export function GroupManagement({
  group,
  currentUser,
  onUpdateGroup,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  onLeaveGroup,
  onDeleteGroup
}: GroupManagementProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'media'>('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);

  const isAdmin = group.members.find(m => m.address === currentUser)?.role === 'admin';

  const filteredMembers = group.members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = () => {
    if (newMemberAddress.trim()) {
      onAddMember(newMemberAddress.trim());
      setNewMemberAddress('');
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = (address: string) => {
    if (address !== currentUser) {
      onRemoveMember(address);
    }
  };

  const handleUpdateMemberRole = (address: string, role: 'admin' | 'member') => {
    if (address !== currentUser) {
      onUpdateMemberRole(address, role);
    }
  };

  const handleUpdateSettings = (key: string, value: boolean) => {
    onUpdateGroup({
      settings: {
        ...group.settings,
        [key]: value
      }
    });
  };

  const tabs = [
    { id: 'members', label: 'Members', icon: Users, count: group.members.length },
    { id: 'settings', label: 'Settings', icon: Settings, count: 0 },
    { id: 'media', label: 'Media', icon: MessageCircle, count: 0 }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <img
            src={group.avatar}
            alt={group.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {group.name}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {group.description}
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {group.members.length} members
                </span>
              </div>
              {group.isEncrypted && (
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Encrypted
                  </span>
                </div>
              )}
              {group.isPrivate && (
                <div className="flex items-center space-x-1">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Private
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'members' && (
          <div className="p-6 space-y-6">
            {/* Search and Add Member */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Add Member Modal */}
            <AnimatePresence>
              {showAddMember && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Enter wallet address..."
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddMember(false)}
                      className="px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Members List */}
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {member.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {member.name}
                        </h4>
                        {member.role === 'admin' && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        {member.address === currentUser && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.address}
                      </p>
                    </div>
                  </div>
                  
                  {isAdmin && member.address !== currentUser && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMemberMenu(showMemberMenu === member.id ? null : member.id)}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      
                      {showMemberMenu === member.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                handleUpdateMemberRole(member.address, member.role === 'admin' ? 'member' : 'admin');
                                setShowMemberMenu(null);
                              }}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              {member.role === 'admin' ? (
                                <>
                                  <UserMinus className="w-4 h-4" />
                                  <span>Remove Admin</span>
                                </>
                              ) : (
                                <>
                                  <Crown className="w-4 h-4" />
                                  <span>Make Admin</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                handleRemoveMember(member.address);
                                setShowMemberMenu(null);
                              }}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <UserMinus className="w-4 h-4" />
                              <span>Remove Member</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-6 space-y-6">
            {/* Group Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Group Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Private Group
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Only members can see this group
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateGroup({ isPrivate: !group.isPrivate })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.isPrivate ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.isPrivate ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        End-to-End Encryption
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Messages are encrypted and secure
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateGroup({ isEncrypted: !group.isEncrypted })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.isEncrypted ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.isEncrypted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Allow Invites
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Members can invite others
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings('allowInvites', !group.settings.allowInvites)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.settings.allowInvites ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.settings.allowInvites ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Allow File Sharing
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Members can share files
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings('allowFileSharing', !group.settings.allowFileSharing)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.settings.allowFileSharing ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.settings.allowFileSharing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Allow Voice Calls
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Members can make voice calls
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings('allowVoiceCalls', !group.settings.allowVoiceCalls)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.settings.allowVoiceCalls ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.settings.allowVoiceCalls ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Video className="w-5 h-5 text-slate-500" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Allow Video Calls
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Members can make video calls
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings('allowVideoCalls', !group.settings.allowVideoCalls)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      group.settings.allowVideoCalls ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        group.settings.allowVideoCalls ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Danger Zone
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={onLeaveGroup}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>Leave Group</span>
                </button>
                
                {isAdmin && (
                  <button
                    onClick={onDeleteGroup}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Group</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-6">
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                Media Gallery
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Shared media will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
