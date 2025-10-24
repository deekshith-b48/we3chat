import React from 'react';
import { MessageSquare, Zap, Shield } from 'lucide-react';

export function EmptyChatState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        {/* Logo */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome to we3chat
        </h2>
        <p className="text-gray-600 mb-8">
          Select a chat from the sidebar to start messaging, or create a new conversation.
        </p>

        {/* Features */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Decentralized Storage</p>
              <p className="text-sm text-gray-600">Your messages are stored on Ceramic Network</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Real-time Updates</p>
              <p className="text-sm text-gray-600">Powered by Supabase for instant messaging</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-left">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">IPFS Ready</p>
              <p className="text-sm text-gray-600">Built for the decentralized web</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
