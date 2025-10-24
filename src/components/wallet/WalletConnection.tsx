import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

export default function WalletConnection() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">{formatAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect a wallet to start chatting on the blockchain
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      <div className="grid gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isConnecting}
            className="flex items-center gap-3 w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">{connector.name}</div>
              <div className="text-sm text-gray-500">
                {connector.name === 'MetaMask' && 'Connect with MetaMask browser extension'}
                {connector.name === 'WalletConnect' && 'Scan QR code with your mobile wallet'}
                {connector.name === 'Coinbase Wallet' && 'Connect with Coinbase Wallet'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {isConnecting && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Connecting wallet...</p>
        </div>
      )}
    </div>
  );
}
