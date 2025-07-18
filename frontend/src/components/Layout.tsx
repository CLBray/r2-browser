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
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };
  
  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  };
  
  const buttonColors = {
    success: 'bg-green-100 hover:bg-green-200 text-green-800',
    error: 'bg-red-100 hover:bg-red-200 text-red-800',
    warning: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
    info: 'bg-blue-100 hover:bg-blue-200 text-blue-800'
  };
  
  return (
    <div className={`p-4 ${bgColors[type]} border rounded-md mb-4 flex justify-between items-center`}>
      <div className="flex-grow">
        <p className={`text-sm ${textColors[type]}`}>{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-2 px-3 py-1 text-xs font-medium rounded-md ${buttonColors[type]}`}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className={`ml-4 ${textColors[type]} hover:opacity-75`}
        aria-label="Close"
      >
        &times;
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
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-lg font-medium text-red-800">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-700">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetError}
        className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-md"
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isAuthenticated && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  R2 File Explorer
                </h1>
                {bucketName && (
                  <span className="ml-4 text-sm text-gray-500">
                    Bucket: {bucketName}
                  </span>
                )}
              </div>
              <div className="flex items-center">
                {sessionExpiry && (
                  <span className="text-xs text-gray-500 mr-4">
                    Session expires: {sessionExpiry.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Alerts container */}
          {alerts.length > 0 && (
            <div className="mb-4">
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
      
      <footer className="bg-white shadow-inner mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-500 text-center">
            R2 File Explorer - Powered by Cloudflare Workers
          </p>
        </div>
      </footer>
    </div>
  );
};