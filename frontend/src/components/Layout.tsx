// Main layout component that wraps the entire application

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ErrorBoundary } from './ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
}

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Alert: React.FC<AlertProps> = ({ type, message, onClose, action }) => {
  const bgColors = {
    success: 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200',
    error: 'bg-gradient-to-r from-red-50 to-red-100 border-red-200',
    warning: 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200',
    info: 'bg-gradient-to-r from-sky-50 to-sky-100 border-sky-200'
  };
  
  const textColors = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-sky-800'
  };
  
  const buttonColors = {
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
    error: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white',
    info: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white'
  };
  
  return (
    <div className={`p-4 ${bgColors[type]} border rounded-xl mb-4 flex justify-between items-center shadow-sm`}>
      <div className="flex-grow">
        <p className={`text-sm font-medium ${textColors[type]}`}>{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-3 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm ${buttonColors[type]}`}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className={`ml-4 ${textColors[type]} hover:opacity-75 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 transition-all duration-200`}
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, bucketName, logout, sessionExpiry, isSessionExpiring } = useAuth();
  const [alerts, setAlerts] = useState<Array<{ 
    id: string; 
    type: 'success' | 'error' | 'warning' | 'info'; 
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>>([]);
  
  // Function to add an alert
  const addAlert = (
    type: 'success' | 'error' | 'warning' | 'info', 
    message: string,
    action?: { label: string; onClick: () => void },
    timeout: number = 5000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAlerts(prev => [...prev, { id, type, message, action }]);
    
    // Auto-dismiss after timeout (if timeout > 0)
    if (timeout > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, timeout);
    }
    
    return id;
  };
  
  // Function to remove an alert
  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };
  
  // Check for session expiry and show warning
  const checkSessionExpiry = useCallback(() => {
    if (isAuthenticated && isSessionExpiring && sessionExpiry) {
      const expiryTime = sessionExpiry.getTime();
      const now = Date.now();
      const minutesRemaining = Math.floor((expiryTime - now) / (60 * 1000));
      
      if (minutesRemaining <= 5) {
        // Check if we already have a session expiry alert
        const hasExpiryAlert = alerts.some(alert => 
          alert.message.includes('Your session will expire')
        );
        
        if (!hasExpiryAlert) {
          addAlert(
            'warning',
            `Your session will expire in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Would you like to stay logged in?`,
            {
              label: 'Stay Logged In',
              onClick: () => {
                // This will trigger a token refresh in the AuthContext
                window.location.reload();
              }
            },
            0 // Don't auto-dismiss this alert
          );
        }
      }
    }
  }, [isAuthenticated, isSessionExpiring, sessionExpiry, alerts]);
  
  // Check session expiry every minute
  useEffect(() => {
    if (isAuthenticated) {
      checkSessionExpiry();
      const interval = setInterval(checkSessionExpiry, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, checkSessionExpiry]);
  
  // Error boundary fallback
  const errorFallback = (error: Error, resetError: () => void) => (
    <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl shadow-sm">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
      <p className="text-sm text-red-700 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
      >
        Try again
      </button>
    </div>
  );

  // Handle logout with confirmation
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Main card container with rounded corners and shadows */}
      <div className="flex-grow bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm overflow-hidden flex flex-col">
        {isAuthenticated && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                    R2 File Explorer
                  </h1>
                  {bucketName && (
                    <span className="ml-4 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Bucket: {bucketName}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {sessionExpiry && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                      Session expires: {sessionExpiry.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        
        <main className="flex-grow overflow-hidden">
          <div className="max-w-7xl mx-auto h-full px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            {/* Alerts container */}
            {alerts.length > 0 && (
              <div className="mb-6">
                {alerts.map(alert => (
                  <Alert
                    key={alert.id}
                    type={alert.type}
                    message={alert.message}
                    action={alert.action}
                    onClose={() => removeAlert(alert.id)}
                  />
                ))}
              </div>
            )}
            
            {/* Main content with error boundary */}
            <ErrorBoundary fallback={errorFallback}>
              {React.Children.map(children, child => {
                // Pass alert functions to children if they accept them
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, { addAlert, removeAlert } as any);
                }
                return child;
              })}
            </ErrorBoundary>
          </div>
        </main>
        
        <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-100 mt-auto">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-4">
            <p className="text-sm text-gray-500 text-center">
              R2 File Explorer - Powered by Cloudflare Workers
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};