'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { useWallet } from '@/hooks/use-wallet';
import { clearStoredKeyPair, getPublicKeyHex, testCrypto } from '@/lib/crypto';
import { getAddressUrl } from '@/lib/contract';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'settings'>('profile');
  const [isTestingCrypto, setIsTestingCrypto] = useState(false);
  const [cryptoTestResult, setCryptoTestResult] = useState<string | null>(null);
  
  const user = useChatStore(state => state.user);
  const friends = useChatStore(state => state.friends);
  const conversations = useChatStore(state => state.conversations);
  const { address, disconnect } = useWallet();

  const totalMessages = Object.values(conversations).reduce((acc, conv) => acc + conv.length, 0);

  const handleTestCrypto = async () => {
    setIsTestingCrypto(true);
    setCryptoTestResult(null);
    
    try {
      const result = await testCrypto();
      setCryptoTestResult(result ? 'Encryption test passed ✅' : 'Encryption test failed ❌');
    } catch (error) {
      setCryptoTestResult(`Encryption test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingCrypto(false);
    }
  };

  const handleResetKeys = () => {
    if (confirm('Are you sure you want to reset your encryption keys? This will make previous messages unreadable.')) {
      clearStoredKeyPair();
      window.location.reload();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'security', label: 'Security', icon: '🔒' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{user.username}</h3>
                <p className="text-gray-500 font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{friends.length}</div>
                  <div className="text-sm text-gray-500">Friends</div>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
                  <div className="text-sm text-gray-500">Messages</div>
                </div>
                <div className="text-center bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">{Object.keys(conversations).length}</div>
                  <div className="text-sm text-gray-500">Conversations</div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Account Details</h4>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ethereum Address:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                      <button
                        onClick={() => copyToClipboard(address || '')}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Copy address"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                      <a
                        href={getAddressUrl(address || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-200 rounded"
                        title="View on explorer"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Registration Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isRegistered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isRegistered ? 'Registered' : 'Not Registered'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Encryption Key:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.publicKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.publicKey ? 'Set Up' : 'Not Set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">Security & Encryption</h4>
              
              {/* Encryption Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  <div>
                    <h5 className="font-medium text-blue-900">End-to-End Encryption</h5>
                    <p className="text-sm text-blue-800 mt-1">
                      Your messages are encrypted using X25519 key exchange and AES-GCM encryption. 
                      Only you and the recipient can read your messages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Public Key Info */}
              {user.publicKey && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Your Public Encryption Key (On-Chain):
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-mono text-gray-600 break-all">
                        {user.publicKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(user.publicKey)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded flex-shrink-0"
                        title="Copy public key"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This key is stored on the blockchain and allows others to send you encrypted messages.
                  </p>
                </div>
              )}

              {/* Local Key Info */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Local Private Key:
                </label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      🔑 Stored securely in your browser (never shared)
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Protected
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Your private key never leaves this device and is used to decrypt messages sent to you.
                </p>
              </div>

              {/* Crypto Test */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Test Encryption:
                  </label>
                  <button
                    onClick={handleTestCrypto}
                    disabled={isTestingCrypto}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isTestingCrypto ? 'Testing...' : 'Run Test'}
                  </button>
                </div>
                {cryptoTestResult && (
                  <div className={`p-3 rounded-lg text-sm ${
                    cryptoTestResult.includes('passed') 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {cryptoTestResult}
                  </div>
                )}
              </div>

              {/* Reset Keys */}
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <div className="flex-1">
                      <h5 className="font-medium text-red-900">Danger Zone</h5>
                      <p className="text-sm text-red-800 mt-1 mb-3">
                        Resetting your encryption keys will make all previous messages unreadable. 
                        This action cannot be undone.
                      </p>
                      <button
                        onClick={handleResetKeys}
                        className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Reset Encryption Keys
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h4 className="font-medium text-gray-900">App Settings</h4>
              
              {/* Network Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Network Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-medium">Polygon Amoy Testnet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chain ID:</span>
                    <span className="font-medium">80002</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-600 font-medium">Connected</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Data Storage</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Messages:</span>
                    <span className="font-medium">IPFS + Blockchain</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Encryption Keys:</span>
                    <span className="font-medium">Local Browser Storage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Friends List:</span>
                    <span className="font-medium">Smart Contract</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => window.open('https://github.com/we3chat', '_blank')}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  <span>View on GitHub</span>
                </button>
                
                <button
                  onClick={disconnect}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  <span>Disconnect Wallet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
