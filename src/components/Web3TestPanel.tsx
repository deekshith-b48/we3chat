'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { useWeb3Status, useTransactionTracking } from '@/hooks/use-web3-events';
import { testCrypto, getOrCreateX25519, getPublicKeyHex } from '@/lib/crypto';
import { uploadJSON, fetchJSONFromCID, web3Client } from '@/lib/ipfs';
import { getContract, getSigner, getProvider } from '@/lib/ethers-helpers';
import { CHAT_ADDRESS } from '@/lib/contract';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Web3TestPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  
  const { address, isConnected, isCorrectNetwork } = useWallet();
  const { isWeb3Ready } = useWeb3Status();
  const { trackTransaction } = useTransactionTracking();

  // Test crypto functions
  const testCryptoFunctions = async () => {
    setTestResults(prev => ({ ...prev, crypto: 'Testing...' }));
    
    try {
      const result = await testCrypto();
      setTestResults(prev => ({ 
        ...prev, 
        crypto: result ? '✅ Crypto test passed' : '❌ Crypto test failed' 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        crypto: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }));
    }
  };

  // Test IPFS connectivity
  const testIPFS = async () => {
    setTestResults(prev => ({ ...prev, ipfs: 'Testing...' }));
    
    try {
      if (!web3Client) {
        throw new Error('Web3.Storage client not initialized');
      }

      const testData = { message: 'Hello Web3!', timestamp: Date.now() };
      const cid = await uploadJSON(testData);
      const retrieved = await fetchJSONFromCID(cid);
      
      if (retrieved.message === testData.message) {
        setTestResults(prev => ({ 
          ...prev, 
          ipfs: `✅ IPFS test passed (CID: ${cid.slice(0, 20)}...)` 
        }));
      } else {
        throw new Error('Data mismatch');
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        ipfs: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }));
    }
  };

  // Test contract connectivity
  const testContract = async () => {
    setTestResults(prev => ({ ...prev, contract: 'Testing...' }));
    
    try {
      const provider = getProvider();
      const contract = getContract(provider);
      
      // Test reading contract (should not fail even if account doesn't exist)
      const username = await contract.username(address || '0x0000000000000000000000000000000000000000');
      
      setTestResults(prev => ({ 
        ...prev, 
        contract: `✅ Contract accessible (Username: ${username || 'Not set'})` 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        contract: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }));
    }
  };

  // Test wallet signing
  const testSigning = async () => {
    setTestResults(prev => ({ ...prev, signing: 'Testing...' }));
    
    try {
      const signer = await getSigner();
      const message = 'Test signature for We3Chat';
      const signature = await signer.signMessage(message);
      
      setTestResults(prev => ({ 
        ...prev, 
        signing: `✅ Signing works (${signature.slice(0, 20)}...)` 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        signing: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }));
    }
  };

  // Test account creation
  const testAccountCreation = async () => {
    setTestResults(prev => ({ ...prev, account: 'Testing...' }));
    
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      
      // Check if account already exists
      const existingUsername = await contract.username(address);
      if (existingUsername) {
        setTestResults(prev => ({ 
          ...prev, 
          account: `✅ Account exists: ${existingUsername}` 
        }));
        return;
      }

      // Create test account
      getOrCreateX25519();
      const publicKeyHex = getPublicKeyHex();
      const testUsername = `TestUser_${Date.now().toString().slice(-6)}`;
      
      const tx = await contract.createAccount(testUsername, publicKeyHex);
      trackTransaction(tx.hash, 'account');
      
      setTestResults(prev => ({ 
        ...prev, 
        account: `⏳ Creating account... (TX: ${tx.hash.slice(0, 20)}...)` 
      }));
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTestResults(prev => ({ 
          ...prev, 
          account: `✅ Account created: ${testUsername}` 
        }));
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        account: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }));
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    try {
      await testCryptoFunctions();
      await testIPFS();
      await testContract();
      
      if (isConnected) {
        await testSigning();
        await testAccountCreation();
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run basic tests when panel opens
  useEffect(() => {
    if (isVisible && Object.keys(testResults).length === 0) {
      runAllTests();
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-colors"
      >
        🧪 Test Web3
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Web3 Test Panel</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* System Status */}
        <div className="mb-4 space-y-2">
          <h4 className="font-medium text-gray-700">System Status</h4>
          <div className="space-y-1 text-sm">
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <span>{isConnected ? '✅' : '❌'}</span>
              <span>Wallet Connected: {address?.slice(0, 10)}...</span>
            </div>
            <div className={`flex items-center space-x-2 ${isCorrectNetwork ? 'text-green-600' : 'text-orange-600'}`}>
              <span>{isCorrectNetwork ? '✅' : '⚠️'}</span>
              <span>Correct Network</span>
            </div>
            <div className={`flex items-center space-x-2 ${web3Client ? 'text-green-600' : 'text-red-600'}`}>
              <span>{web3Client ? '✅' : '❌'}</span>
              <span>IPFS Client</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <span>📄</span>
              <span>Contract: {CHAT_ADDRESS.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">Test Results</h4>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? <LoadingSpinner size="small" color="white" /> : 'Run Tests'}
            </button>
          </div>
          
          <div className="space-y-1 text-sm">
            {Object.entries(testResults).map(([test, result]) => (
              <div key={test} className="flex items-start space-x-2">
                <span className="capitalize font-medium text-gray-600 w-20">{test}:</span>
                <span className="flex-1">{result}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={testCryptoFunctions}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Test Crypto
            </button>
            <button
              onClick={testIPFS}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Test IPFS
            </button>
            <button
              onClick={testContract}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Test Contract
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getPublicKeyHex());
                alert('Public key copied to clipboard!');
              }}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Copy PubKey
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <details>
            <summary className="text-sm font-medium text-gray-600 cursor-pointer">Debug Info</summary>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div>Public Key: {getPublicKeyHex().slice(0, 20)}...</div>
              <div>Web3 Ready: {isWeb3Ready ? 'Yes' : 'No'}</div>
              <div>Environment: {process.env.NODE_ENV}</div>
              <div>Network: {process.env.NEXT_PUBLIC_NETWORK_NAME}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
