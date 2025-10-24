'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Shield, 
  Zap, 
  Globe, 
  MessageCircle, 
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { WalletInfo } from '@/lib/web3-auth';

interface WelcomeScreenProps {
  onConnect: () => Promise<WalletInfo>;
  onAuthenticate: () => Promise<boolean>;
  wallet: WalletInfo | null;
}

export function WelcomeScreen({ 
  onConnect, 
  onAuthenticate, 
  wallet 
}: WelcomeScreenProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [step, setStep] = useState<'welcome' | 'connect' | 'authenticate' | 'complete'>('welcome');

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await onConnect();
      setStep('authenticate');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setIsAuthenticating(true);
      const success = await onAuthenticate();
      if (success) {
        setStep('complete');
      }
    } catch (error) {
      console.error('Failed to authenticate:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'End-to-End Encryption',
      description: 'Your messages are encrypted and only you and the recipient can read them.',
      color: 'text-green-500'
    },
    {
      icon: Globe,
      title: 'Decentralized',
      description: 'No central server controls your data. Everything is stored on the blockchain.',
      color: 'text-blue-500'
    },
    {
      icon: Zap,
      title: 'Real-time',
      description: 'Instant messaging with WebSocket connections for lightning-fast communication.',
      color: 'text-yellow-500'
    },
    {
      icon: MessageCircle,
      title: 'Web3 Native',
      description: 'Built for the decentralized web with full blockchain integration.',
      color: 'text-purple-500'
    }
  ];

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-5xl font-bold gradient-text mb-4">
              Welcome to We3Chat
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              The future of messaging is here. Connect your wallet and experience 
              truly decentralized, encrypted, and secure communication.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className={`w-12 h-12 ${feature.color} bg-opacity-10 rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-center"
          >
            <button
              onClick={() => setStep('connect')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 mx-auto"
            >
              <Wallet className="w-5 h-5" />
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
              Connect your wallet to start messaging
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 'connect') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Connect your Web3 wallet to access We3Chat
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                MetaMask, WalletConnect, Coinbase Wallet supported
              </span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Your private keys never leave your device
              </span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                No personal information required
              </span>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => setStep('welcome')}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← Back to Welcome
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'authenticate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Authenticate with SIWE
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Sign a message to prove you own this wallet
            </p>
          </div>

          {wallet && (
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {wallet.ensName || `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {wallet.balance} ETH
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                This signature proves you own the wallet
              </span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                No transaction fees required
              </span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Your data remains private and secure
              </span>
            </div>
          </div>

          <button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {isAuthenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Sign Message</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => setStep('connect')}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← Back to Connect
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
            className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4"
          >
            Welcome to We3Chat!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-slate-600 dark:text-slate-400 mb-8"
          >
            You're all set! Your wallet is connected and authenticated. 
            You can now start messaging with the decentralized web.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Wallet Connected</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Authentication Complete</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Ready to Chat</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8"
          >
            <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
}