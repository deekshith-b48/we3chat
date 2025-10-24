/**
 * IPFS Status Component
 * 
 * Shows the status of IPFS providers and storage information
 */

import React from 'react';
import { useIPFS } from '../hooks/ipfs/useIPFS';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface IPFSStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function IPFSStatus({ className = '', showDetails = false }: IPFSStatusProps) {
  const { 
    availableProviders, 
    providerStatus, 
    isLoading, 
    error, 
    refreshProviders 
  } = useIPFS();

  const getStatusIcon = (provider: string) => {
    const isAvailable = providerStatus[provider];
    if (isAvailable) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (provider: string) => {
    const isAvailable = providerStatus[provider];
    return isAvailable ? 'Connected' : 'Not Available';
  };

  const getStatusColor = (provider: string) => {
    const isAvailable = providerStatus[provider];
    return isAvailable ? 'text-green-600' : 'text-red-600';
  };

  if (showDetails) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">IPFS Storage Status</h3>
          <button
            onClick={refreshProviders}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          {Object.keys(providerStatus).map((provider) => (
            <div key={provider} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {getStatusIcon(provider)}
                <span className="font-medium text-gray-700">{provider}</span>
              </div>
              <span className={getStatusColor(provider)}>
                {getStatusText(provider)}
              </span>
            </div>
          ))}
        </div>

        {availableProviders.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <span className="font-medium">{availableProviders.length}</span> provider(s) available
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact view
  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      {availableProviders.length > 0 ? (
        <>
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-green-600">IPFS Ready</span>
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-600">IPFS Offline</span>
        </>
      )}
    </div>
  );
}

export default IPFSStatus;
