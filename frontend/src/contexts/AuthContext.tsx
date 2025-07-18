// Authentication provider component for managing user session state

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { R2Credentials, AuthSession } from '../types';
import { apiClient } from '../services/api';
import { AuthContext, type AuthContextType } from './auth';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const checkExistingSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
        try {
          const result = await apiClient.verify();
          if (result.valid) {
            setIsAuthenticated(true);
            setBucketName(result.bucketName || null);
          } else {
            localStorage.removeItem('auth_token');
            apiClient.clearToken();
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          localStorage.removeItem('auth_token');
          apiClient.clearToken();
        }
      }
      setIsLoading(false);
    };

    checkExistingSession();
  }, []);

  const login = async (credentials: R2Credentials) => {
    const session: AuthSession = await apiClient.login(credentials);
    localStorage.setItem('auth_token', session.token);
    apiClient.setToken(session.token);
    setIsAuthenticated(true);
    setBucketName(session.bucketName);
  };

  const logout = async () => {
    // Attempt to logout from server, but always clear local state
    apiClient.logout().catch((error) => {
      console.error('Logout error:', error);
    });
    
    localStorage.removeItem('auth_token');
    apiClient.clearToken();
    setIsAuthenticated(false);
    setBucketName(null);
  };

  const value: AuthContextType = {
    isAuthenticated,
    bucketName,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};