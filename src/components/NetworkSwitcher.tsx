'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/use-wallet';
// Network configuration for Polygon Amoy
const NETWORK_CONFIG = {
  name: 'Polygon Amoy',
  chainId: 80002,
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  explorerUrl: 'https://amoy.polygonscan.com'
};

export default function NetworkSwitcher() {
  const { switchNetwork, error, chainId } = useWallet();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    try {
      await switchNetwork();
    } finally {
      setIsSwitching(false);
    }
  };

  const getCurrentNetworkName = () => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet';
      case 137: return 'Polygon Mainnet';
      case 80001: return 'Polygon Mumbai';
      case 80002: return 'Polygon Amoy';
      default: return `Unknown Network (${chainId})`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Warning Icon */}
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Wrong Network</h2>
          
          <p className="text-gray-600 mb-6">
            we3chat requires Polygon Amoy testnet to function properly. 
            You're currently connected to <strong>{getCurrentNetworkName()}</strong>.
          </p>

          {/* Current vs Required Network */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Current Network:</span>
              <span className="font-medium text-red-600">{getCurrentNetworkName()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Required Network:</span>
              <span className="font-medium text-green-600">{NETWORK_CONFIG.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Chain ID:</span>
              <span className="font-medium text-blue-600">{NETWORK_CONFIG.chainId}</span>
            </div>
          </div>

          {/* Switch Network Button */}
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSwitching ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Switching...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                <span>Switch to Polygon Amoy</span>
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Manual Instructions */}
          <div className="mt-6 text-left">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Manual Setup Instructions
              </summary>
              <div className="mt-3 text-sm text-gray-600 space-y-2">
                <p>If automatic switching doesn't work, add the network manually:</p>
                <div className="bg-gray-100 rounded p-3 font-mono text-xs">
                  <div>Network Name: Polygon Amoy</div>
                  <div>RPC URL: {NETWORK_CONFIG.rpcUrl}</div>
                  <div>Chain ID: {NETWORK_CONFIG.chainId}</div>
                  <div>Currency: MATIC</div>
                  <div>Explorer: {NETWORK_CONFIG.explorerUrl}</div>
                </div>
              </div>
            </details>
          </div>

          {/* Why Polygon Amoy */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Why Polygon Amoy?</h3>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• Fast and low-cost transactions</li>
              <li>• Ethereum-compatible smart contracts</li>
              <li>• Reliable testnet for development</li>
              <li>• Free testnet MATIC for transactions</li>
            </ul>
          </div>

          {/* Get Testnet MATIC */}
          <div className="mt-4">
            <a
              href="https://faucet.polygon.technology/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              Get free testnet MATIC
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
