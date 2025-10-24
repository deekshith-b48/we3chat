"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';

interface EmailAuthProps {
  onSuccess?: (address: string) => void;
  onError?: (error: string) => void;
}

export default function EmailAuth({ onSuccess, onError }: EmailAuthProps) {
  const { address, isConnected } = useAccount();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'verification' | 'success'>('email');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      // For now, we'll use a simple demonstration
      // In production, you would integrate with your email authentication service
      setStep('verification');
      
      // Simulate email verification process
      setTimeout(() => {
        onSuccess?.(address || '');
        setStep('success');
      }, 2000);
      
    } catch (error) {
      console.error('Email authentication failed:', error);
      onError?.('Failed to authenticate with email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    try {
      // Handle social login - would integrate with actual social auth provider
      console.log(`Social login attempted with ${provider}`);
      // In a real implementation, this would integrate with the social auth provider
      onError?.(`${provider} login is not yet implemented. Please use email authentication.`);
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      onError?.(`Failed to login with ${provider}. Please try again.`);
    }
  };

  const openWalletModal = () => {
    try {
      // Navigate to wallet connection - this would typically trigger wallet connection
      console.log('Wallet connection requested');
      onError?.('Wallet connection is handled through the main dashboard. Please use email authentication for now.');
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
      onError?.('Failed to open wallet selector. Please try again.');
    }
  };

  if (isConnected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-700">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Authentication Form */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📧 Login with Email
        </h3>
        
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>📨</span>
                  <span>Send Magic Link</span>
                </>
              )}
            </button>
          </form>
        )}

        {step === 'verification' && (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
            </div>
            <h4 className="font-medium text-gray-900">Check Your Email</h4>
            <p className="text-sm text-gray-600">
              We&apos;ve sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-gray-500">
              Click the link in your email to complete authentication
            </p>
            <button
              onClick={() => setStep('email')}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Use different email
            </button>
          </div>
        )}
      </div>

      {/* Social Authentication */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔗 Social Login
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleSocialLogin('Google')}
            className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-3"
          >
            <span className="text-xl">🔍</span>
            <span>Continue with Google</span>
          </button>
          
          <button
            onClick={() => handleSocialLogin('Apple')}
            className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-3"
          >
            <span className="text-xl">🍎</span>
            <span>Continue with Apple</span>
          </button>
          
          <button
            onClick={() => handleSocialLogin('GitHub')}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-3"
          >
            <span className="text-xl">🐙</span>
            <span>Continue with GitHub</span>
          </button>
        </div>
      </div>

      {/* Web3 Wallets */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🦊 Web3 Wallets
        </h3>
        
        <button
          onClick={openWalletModal}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-3"
        >
          <span className="text-xl">🌐</span>
          <span>Connect Wallet</span>
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          MetaMask, WalletConnect, Coinbase Wallet & more
        </p>
      </div>

      {/* Benefits */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">✨ Why Email Login?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• No need to install crypto wallets</li>
          <li>• Secure blockchain wallet automatically created</li>
          <li>• Easy access from any device</li>
          <li>• Same security as traditional wallets</li>
        </ul>
      </div>
    </div>
  );
}
