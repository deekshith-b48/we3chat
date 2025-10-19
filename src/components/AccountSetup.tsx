'use client';

import { useState } from 'react';
import { useCreateAccount, useSetEncryptionKey } from '@/hooks/use-contract';
import { useUserOnboarding } from '@/hooks/use-wallet';
import { useChatStore } from '@/store/chat-store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AccountSetup() {
  const { needsRegistration, needsPublicKey } = useUserOnboarding();
  const { createAccount, isLoading: isCreatingAccount, error: createError } = useCreateAccount();
  const { setEncryptionKey, isLoading: isSettingKey, error: keyError } = useSetEncryptionKey();
  const user = useChatStore(state => state.user);
  
  const [username, setUsername] = useState('');
  const [, setStep] = useState<'username' | 'encryption' | 'complete'>('username');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      return;
    }

    const success = await createAccount(username.trim());
    if (success) {
      if (needsPublicKey) {
        setStep('encryption');
      } else {
        setStep('complete');
      }
    }
  };

  const handleSetEncryptionKey = async () => {
    const success = await setEncryptionKey();
    if (success) {
      setStep('complete');
    }
  };

  if (!needsRegistration && !needsPublicKey) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Complete Your Setup</h2>
          <p className="mt-2 text-gray-600">
            {needsRegistration ? 'Create your we3chat account' : 'Set up encryption for secure messaging'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center space-x-2 ${needsRegistration ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              needsRegistration ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              {needsRegistration ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium">Account</span>
          </div>
          
          <div className="flex-1 h-px bg-gray-300"></div>
          
          <div className={`flex items-center space-x-2 ${
            needsPublicKey ? 'text-blue-600' : needsRegistration ? 'text-gray-400' : 'text-green-600'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              needsPublicKey ? 'bg-blue-100 text-blue-600' : 
              needsRegistration ? 'bg-gray-100 text-gray-400' : 
              'bg-green-100 text-green-600'
            }`}>
              {needsPublicKey ? '2' : needsRegistration ? '2' : '✓'}
            </div>
            <span className="text-sm font-medium">Encryption</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {needsRegistration && (
            <form onSubmit={handleCreateAccount} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Your Account</h3>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={isCreatingAccount}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This will be your public username that others can find you by.
                  </p>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingAccount || !username.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isCreatingAccount ? (
                  <>
                    <LoadingSpinner size="small" color="white" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>
          )}

          {needsPublicKey && !needsRegistration && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Set Up Encryption</h3>
                <p className="text-gray-600 mb-4">
                  Your encryption key enables secure, end-to-end encrypted messaging. 
                  This key is generated locally and stored securely on your device.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900">Security Notice</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Your private key never leaves your device. Only the public key is stored on the blockchain for others to send you encrypted messages.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {keyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{keyError}</p>
                </div>
              )}

              <button
                onClick={handleSetEncryptionKey}
                disabled={isSettingKey}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSettingKey ? (
                  <>
                    <LoadingSpinner size="small" color="white" />
                    <span>Setting Up Encryption...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <span>Set Up Encryption</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Your account will be stored on the blockchain</li>
            <li>• You can add friends and start secure conversations</li>
            <li>• All messages are encrypted end-to-end</li>
            <li>• Your data remains under your control</li>
          </ul>
        </div>

        {/* User Info */}
        {user && (
          <div className="text-center text-sm text-gray-500">
            Connected as: {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}
