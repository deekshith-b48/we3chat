"use client";

import { useState } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

interface SimpleEmailAuthProps {
  onSuccess?: (address: string, privateKey: string) => void;
  onError?: (error: string) => void;
}

export default function SimpleEmailAuth({ onSuccess, onError }: SimpleEmailAuthProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'verification' | 'success'>('email');
  const [generatedWallet, setGeneratedWallet] = useState<{ address: string; privateKey: string } | null>(null);

  const generateWalletFromEmail = (emailAddress: string) => {
    // Generate a private key for the wallet
    // In production, this should be done securely with proper key derivation
    console.log('Generating wallet for:', emailAddress.toLowerCase().trim());
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    return {
      address: account.address,
      privateKey: privateKey
    };
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      // Generate wallet from email
      const wallet = generateWalletFromEmail(email);
      setGeneratedWallet(wallet);
      setStep('verification');
      
      // Simulate email verification
      setTimeout(() => {
        setStep('success');
        onSuccess?.(wallet.address, wallet.privateKey);
      }, 2000);
      
    } catch (error) {
      console.error('Email authentication failed:', error);
      onError?.('Failed to authenticate with email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (step === 'success' && generatedWallet) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-green-900">
            Wallet Created Successfully!
          </h3>
          <p className="text-sm text-green-700">
            Your blockchain wallet has been created for <strong>{email}</strong>
          </p>
          
          <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Wallet Address
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-gray-100 p-2 rounded font-mono">
                  {generatedWallet.address}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedWallet.address)}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Private Key (Keep Secret!)
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-red-50 p-2 rounded font-mono border border-red-200">
                  {generatedWallet.privateKey.slice(0, 20)}...
                </code>
                <button
                  onClick={() => copyToClipboard(generatedWallet.privateKey)}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              ⚠️ <strong>Important:</strong> Save your private key securely. You&apos;ll need it to access your wallet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Wallet Creation */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📧 Create Wallet with Email
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
                  <span>Creating Wallet...</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>Create Blockchain Wallet</span>
                </>
              )}
            </button>
          </form>
        )}

        {step === 'verification' && (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
            </div>
            <h4 className="font-medium text-gray-900">Creating Your Wallet...</h4>
            <p className="text-sm text-gray-600">
              Generating secure blockchain wallet for <strong>{email}</strong>
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">✨ Email Wallet Benefits</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• No browser extension required</li>
          <li>• Secure blockchain wallet automatically created</li>
          <li>• Easy to use - just like regular apps</li>
          <li>• Full control over your crypto assets</li>
          <li>• Works on any device with email access</li>
        </ul>
      </div>

      {/* Security Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">🔒 Security Notes</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Your private key is generated locally in your browser</li>
          <li>• Never share your private key with anyone</li>
          <li>• Store your private key in a secure location</li>
          <li>• We cannot recover lost private keys</li>
        </ul>
      </div>
    </div>
  );
}
