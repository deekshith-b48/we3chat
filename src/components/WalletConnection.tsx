import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWeb3ChatStore } from '@/store/web3Store';
import { useState } from 'react';

export function WalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { connectWallet, disconnectWallet, userProfile, isRegistered } = useWeb3ChatStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (connector: any) => {
    try {
      setIsConnecting(true);
      await connect({ connector });
      await connectWallet();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      await disconnectWallet();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {address?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <div className="text-xs text-gray-500">
              {isRegistered ? userProfile?.username || 'Registered' : 'Not registered'}
            </div>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-gray-600">
          Connect your wallet to start using the decentralized chat application
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => handleConnect(connector)}
            disabled={isPending || isConnecting}
            className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt={connector.name}
                  className="w-6 h-6"
                />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">{connector.name}</div>
              <div className="text-sm text-gray-500">
                {connector.type === 'injected' ? 'Browser Extension' : 'Mobile Wallet'}
              </div>
            </div>
            {(isPending || isConnecting) && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        ))}
      </div>
      
      {connectors.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No wallet connectors available</div>
          <div className="text-sm text-gray-400">
            Please install a Web3 wallet like MetaMask or WalletConnect
          </div>
        </div>
      )}
    </div>
  );
}
