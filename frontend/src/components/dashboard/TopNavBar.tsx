import React, { useState } from 'react';
import { Bell, Settings, LogOut, Wifi, WifiOff, User } from 'lucide-react';
import Link from 'next/link';

interface TopNavBarProps {
  account?: string | null;
  userProfile?: any;
  onDisconnect?: () => void;
}

export function TopNavBar({ account, userProfile, onDisconnect }: TopNavBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleDisconnect = async () => {
    if (onDisconnect) {
      await onDisconnect();
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/chat" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            We3Chat
          </Link>
          <div className="text-sm text-gray-500">
            Decentralized Chat
          </div>
        </div>

        {/* Center - Web3 Connection Status */}
        <div className="flex items-center space-x-2">
          {account ? (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">
                Connected to Web3
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>

        {/* Right - User Actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Notifications</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-4 text-sm text-gray-500 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p>No new notifications</p>
                    <p className="text-xs mt-1">You&apos;re all caught up!</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {userProfile?.username?.[0]?.toUpperCase() || account?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 hidden md:block">
                {userProfile?.username || account?.slice(0, 6) || 'User'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200">
                  <p className="font-medium text-gray-900">{userProfile?.username || 'User'}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'No wallet connected'}
                  </p>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={handleDisconnect}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showNotifications || showUserMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </nav>
  );
}