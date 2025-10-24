import React, { useState } from 'react';
import { useBasicAuth } from '../hooks/use-basic-auth';
import { useAccount, useConnect } from 'wagmi';
import { Dashboard } from './Dashboard';

export function ModernLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet'>('email');

  const { 
    user, 
    isLoading: authLoading, 
    error, 
    isAuthenticated,
    signUpWithEmail,
    signInWithEmail,
    signInWithWallet,
    clearError
  } = useBasicAuth();

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      let success = false;
      if (isSignUp) {
        success = await signUpWithEmail(email, password, username);
      } else {
        success = await signInWithEmail(email, password);
      }

      if (success) {
        setEmail('');
        setPassword('');
        setUsername('');
      }
    } catch (error) {
      console.error('Email auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletAuth = async () => {
    setIsLoading(true);
    clearError();

    try {
      if (!isConnected) {
        await connect({ connector: connectors[0] });
        return;
      }

      const success = await signInWithWallet(username);
      if (success) {
        setUsername('');
      }
    } catch (error) {
      console.error('Wallet auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">We3Chat</h1>
          <p className="text-purple-100">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex border-b border-white/20">
          <button
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
              authMethod === 'email'
                ? 'bg-white/20 text-white border-b-2 border-purple-400'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            📧 Email
          </button>
          <button
            onClick={() => setAuthMethod('wallet')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
              authMethod === 'wallet'
                ? 'bg-white/20 text-white border-b-2 border-purple-400'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🦊 Wallet
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠️</span>
                {error}
              </div>
            </div>
          )}

          {authMethod === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    Username (optional)
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Choose a username"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-purple-300 hover:text-white text-sm transition-colors duration-200"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!isConnected ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🦊</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-300 mb-6">
                    Connect your MetaMask wallet to sign in securely
                  </p>
                  <button
                    onClick={() => connect({ connector: connectors[0] })}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Connecting...
                      </div>
                    ) : (
                      'Connect MetaMask'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-green-400 mr-2">✅</span>
                      <div>
                        <p className="text-green-200 font-medium">Wallet Connected</p>
                        <p className="text-green-300 text-sm">{address}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="wallet-username" className="block text-sm font-medium text-gray-300 mb-2">
                      Username (optional)
                    </label>
                    <input
                      type="text"
                      id="wallet-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Choose a username for your profile"
                    />
                  </div>

                  <button
                    onClick={handleWalletAuth}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Signing Message...
                      </div>
                    ) : (
                      'Sign In with Wallet'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
