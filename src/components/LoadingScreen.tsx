'use client';

import React from 'react';
// import { motion } from 'framer-motion';
import { MessageCircle, Zap, Shield, Globe } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function LoadingScreen({ 
  message = 'Initializing We3Chat...', 
  showProgress = false,
  progress = 0 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo Animation */}
        <div
          className="relative mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          
          {/* Floating Icons */}
          <div
            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
          >
            <Zap className="w-3 h-3 text-white" />
          </div>
          
          <div
            className="absolute -bottom-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
          >
            <Shield className="w-3 h-3 text-white" />
          </div>
          
          <div
            className="absolute top-1/2 -right-8 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center"
          >
            <Globe className="w-2 h-2 text-white" />
          </div>
        </div>

        {/* App Name */}
        <h1
          className="text-3xl font-bold gradient-text mb-2"
        >
          We3Chat
        </h1>

        <p
          className="text-slate-600 dark:text-slate-400 mb-8"
        >
          Decentralized Messaging Platform
        </p>

        {/* Loading Message */}
        <div
          className="mb-8"
        >
          <p className="text-slate-700 dark:text-slate-300 font-medium mb-4">
            {message}
          </p>

          {/* Progress Bar */}
          {showProgress && (
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Loading Spinner */}
          <div className="flex justify-center">
            <div
              className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"
            />
          </div>
        </div>

        {/* Feature Highlights */}
        <div
          className="grid grid-cols-2 gap-4 text-sm"
        >
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
            <Shield className="w-4 h-4 text-green-500" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Decentralized</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Real-time</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            <span>Web3 Native</span>
          </div>
        </div>

        {/* Loading Steps */}
        <div
          className="mt-8 space-y-2 text-xs text-slate-500 dark:text-slate-500"
        >
          <div className="flex items-center justify-between">
            <span>Connecting to blockchain...</span>
            <div
              className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Initializing IPFS...</span>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Setting up messaging...</span>
            <div
              className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
            />
          </div>
        </div>
      </div>
    </div>
  );
}