import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { WalletProvider } from './components/providers/WalletProvider';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={<Navigate to="/chat" replace />} 
              />
              <Route 
                path="/" 
                element={<Navigate to="/chat" replace />} 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </WalletProvider>
  );
}

export default App;
