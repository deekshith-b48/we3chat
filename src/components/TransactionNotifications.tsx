'use client';

import { useState, useEffect } from 'react';
import { useChatStore, usePendingTransactions } from '@/store/chat-store';
import { getExplorerUrl } from '@/lib/contract';
import { getTransactionStatus } from '@/lib/ethers-helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function TransactionNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    txHash?: string;
    timestamp: number;
  }>>([]);

  const pendingTransactions = usePendingTransactions();
  const { updateTransaction } = useChatStore();

  // Monitor pending transactions
  useEffect(() => {
    const monitorTransactions = async () => {
      for (const tx of pendingTransactions) {
        try {
          const status = await getTransactionStatus(tx.hash);
          
          if (status.status !== 'pending') {
            updateTransaction(tx.hash, {
              status: status.status,
              blockNumber: status.receipt?.blockNumber,
              gasUsed: status.receipt?.gasUsed?.toString()
            });

            // Add notification
            const notification = {
              id: tx.hash,
              message: status.status === 'confirmed' 
                ? 'Transaction confirmed!' 
                : 'Transaction failed',
              type: status.status === 'confirmed' ? 'success' as const : 'error' as const,
              txHash: tx.hash,
              timestamp: Date.now()
            };

            setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
          }
        } catch (error) {
          console.error('Error monitoring transaction:', error);
        }
      }
    };

    if (pendingTransactions.length > 0) {
      const interval = setInterval(monitorTransactions, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [pendingTransactions, updateTransaction]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {/* Pending Transaction Indicator */}
      {pendingTransactions.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
            <LoadingSpinner size="small" color="white" />
            <span className="text-sm font-medium">
              {pendingTransactions.length} transaction{pendingTransactions.length > 1 ? 's' : ''} pending...
            </span>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`max-w-sm bg-white rounded-lg shadow-lg border-l-4 p-4 ${
              notification.type === 'success' ? 'border-green-500' :
              notification.type === 'error' ? 'border-red-500' :
              notification.type === 'warning' ? 'border-yellow-500' :
              'border-blue-500'
            } animate-slide-up`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`mt-0.5 ${
                  notification.type === 'success' ? 'text-green-500' :
                  notification.type === 'error' ? 'text-red-500' :
                  notification.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`}>
                  {notification.type === 'success' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                  {notification.type === 'error' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  )}
                  {notification.type === 'warning' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  )}
                  {notification.type === 'info' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.message}
                  </p>
                  {notification.txHash && (
                    <a
                      href={getExplorerUrl(notification.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-500 mt-1 inline-flex items-center space-x-1"
                    >
                      <span>View transaction</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
