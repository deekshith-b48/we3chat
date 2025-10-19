'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Database, 
  Key, 
  Wifi, 
  Moon,
  Sun,
  Monitor as MonitorIcon,
  Volume2,
  Camera,
  Lock,
  Eye,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdateUser: (updates: any) => void;
}

export function SettingsPanel({ isOpen, onClose, user, onUpdateUser }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'storage' | 'advanced'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ];

  const handleSave = () => {
    onUpdateUser(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      username: user?.username || '',
      bio: user?.bio || '',
      avatar: user?.avatar || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Profile Information
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.displayName}&background=3b82f6&color=fff`}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            {isEditing && (
              <button className="absolute -bottom-1 -right-1 p-1 bg-blue-500 text-white rounded-full">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200">
              {formData.displayName}
            </h4>
            <p className="text-slate-500 dark:text-slate-400">@{formData.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            placeholder="Tell us about yourself..."
          />
        </div>

        {isEditing && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Privacy Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Online Status
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show when you're online
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Read Receipts
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Let others know when you've read their messages
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Last Seen
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show when you were last active
              </p>
            </div>
          </div>
          <select className="px-3 py-1 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm">
            <option>Everyone</option>
            <option>Contacts Only</option>
            <option>Nobody</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Profile Photo
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Who can see your profile photo
              </p>
            </div>
          </div>
          <select className="px-3 py-1 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg text-sm">
            <option>Everyone</option>
            <option>Contacts Only</option>
            <option>Nobody</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Notification Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Push Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive notifications on your device
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Message Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Get notified about new messages
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Call Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Get notified about incoming calls
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Sound Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Play sound for notifications
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Appearance Settings
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'
              }`}
            >
              <Sun className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'
              }`}
            >
              <Moon className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'
              }`}
            >
              <MonitorIcon className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Font Size
          </label>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500">Small</span>
            <input
              type="range"
              min="12"
              max="18"
              defaultValue="14"
              className="flex-1"
            />
            <span className="text-sm text-slate-500">Large</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Language
          </label>
          <select className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
            <option>Chinese</option>
            <option>Japanese</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Security Settings
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Two-Factor Authentication
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add an extra layer of security
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              Enable
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Session Management
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage active sessions
              </p>
            </div>
            <button className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors">
              Manage
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Data Export
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download your data
              </p>
            </div>
            <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
              Export
            </button>
          </div>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Delete Account
              </h4>
              <p className="text-xs text-red-600 dark:text-red-400">
                Permanently delete your account
              </p>
            </div>
            <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorageTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Storage Management
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Messages
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              2.3 GB
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }} />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Media Files
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              1.8 GB
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }} />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Documents
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              512 MB
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }} />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
            Clear Cache
          </button>
          <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
            Free Up Space
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Advanced Settings
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Wifi className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Auto-sync
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically sync messages
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Offline Mode
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Work without internet connection
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Key className="w-5 h-5 text-slate-500" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Developer Mode
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enable developer features
              </p>
            </div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 dark:bg-slate-600">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
          </button>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Reset Settings
              </h4>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                This will reset all settings to default values. This action cannot be undone.
              </p>
              <button className="mt-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm transition-colors">
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'security':
        return renderSecurityTab();
      case 'storage':
        return renderStorageTab();
      case 'advanced':
        return renderAdvancedTab();
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex h-full">
              {/* Sidebar */}
              <div className="w-64 border-r border-slate-200 dark:border-slate-700 p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderTabContent()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
