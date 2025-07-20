// Authentication provider component for managing user session state

import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { R2Credentials, AuthSession } from '../types';
import { apiClient } from '../services/api';
import { AuthContext, type AuthContextType } from './auth';
import { ErrorHandler, ErrorCode } from '../utils/error-handler';
import { performanceMonitor } from '../utils/performance-monitor';

interface AuthProviderProps {
  children: ReactNode;
}

// Constants for auth storage
const AUTH_TOKEN_KEY = 'r2_explorer_auth_token';
const AUTH_EXPIRY_KEY = 'r2_explorer_auth_expiry';
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to clear auth state
  const clearAuthState = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    apiClient.clearToken();
    setIsAuthenticated(false);
    setBucketName(null);
    setUserId(null);
    setSessionExpiry(null);
    
    // Clear any existing refresh timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
  }, [refreshTimer]);

  // Function to set up token refresh timer
  const setupRefreshTimer = useCallback((expiryDate: Date) => {
    // Clear any existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    const expiryTime = expiryDate.getTime();
    const now = Date.now();
    const timeUntilRefresh = expiryTime - now - TOKEN_REFRESH_THRESHOLD_MS;

    // Only set up refresh if the token isn't already expired or too close to expiry
    if (timeUntilRefresh > 0) {
      const timer = setTimeout(async () => {
        try {
          // Attempt to refresh the token
          const token = localStorage.getItem(AUTH_TOKEN_KEY);
          if (token) {
            apiClient.setToken(token);
            const refreshResult = await apiClient.refreshToken();
            
            if (refreshResult.token) {
              // Update token and expiry
              localStorage.setItem(AUTH_TOKEN_KEY, refreshResult.token);
              localStorage.setItem(AUTH_EXPIRY_KEY, refreshResult.expiresAt.toString());
              apiClient.setToken(refreshResult.token);
              setSessionExpiry(new Date(refreshResult.expiresAt));
              
              // Set up next refresh
              setupRefreshTimer(new Date(refreshResult.expiresAt));
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, we'll let the session expire naturally
          // The user will be prompted to log in again when they make their next request
        }
      }, timeUntilRefresh);
      
      setRefreshTimer(timer);
    }
  }, [refreshTimer]);

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const expiryStr = localStorage.getItem(AUTH_EXPIRY_KEY);
      
      if (token && expiryStr) {
        const expiry = new Date(parseInt(expiryStr));
        
        // Check if token is expired
        if (expiry.getTime() <= Date.now()) {
          clearAuthState();
          setIsLoading(false);
          return;
        }
        
        apiClient.setToken(token);
        try {
          const result = await apiClient.verify();
          if (result.valid) {
            setIsAuthenticated(true);
            setBucketName(result.bucketName || null);
            setUserId(result.userId || null);
            setSessionExpiry(result.expiresAt ? new Date(result.expiresAt) : expiry);
            
            // Set up token refresh
            setupRefreshTimer(result.expiresAt ? new Date(result.expiresAt) : expiry);
          } else {
            clearAuthState();
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          clearAuthState();
        }
      }
      
      setIsLoading(false);
    };

    checkExistingSession();
    
    // Clean up timer on unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, []); // Only run once on mount

  // Login function
  const login = async (credentials: R2Credentials) => {
    const startTime = performance.now();
    
    try {
      const response = await apiClient.login(credentials);
      
      if (response.success && response.data) {
        const { token, expiresAt, bucketName: bucket, userId: user } = response.data;
        
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_EXPIRY_KEY, expiresAt.toString());
        
        apiClient.setToken(token);
        setIsAuthenticated(true);
        setBucketName(bucket);
        setUserId(user || null);
        setSessionExpiry(new Date(expiresAt));
        
        // Set up token refresh
        setupRefreshTimer(new Date(expiresAt));
        
        // Track successful login in performance monitoring
        performanceMonitor.trackUserInteraction(
          'login_success',
          performance.now() - startTime,
          true,
          { bucketName: bucket }
        );
        
        // Update user info in performance monitor
        performanceMonitor.setUserInfo(user || undefined, bucket);
        
        return response.data;
      } else {
        // Track failed login
        performanceMonitor.trackUserInteraction(
          'login_failure',
          performance.now() - startTime,
          false,
          { reason: response.message || 'Unknown error' }
        );
        
        throw {
          error: response.message || 'Authentication failed',
          code: ErrorCode.INVALID_CREDENTIALS
        };
      }
    } catch (error) {
      // Track login error
      performanceMonitor.trackError(
        'login_error',
        error instanceof Error ? error.message : 'Authentication failed',
        'auth_context',
        error instanceof Error ? error.stack : undefined
      );
      
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    const startTime = performance.now();
    
    try {
      // Attempt to logout from server, but always clear local state
      if (isAuthenticated) {
        await apiClient.logout();
        
        // Track successful logout
        performanceMonitor.trackUserInteraction(
          'logout_success',
          performance.now() - startTime,
          true,
          { bucketName }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      ErrorHandler.logError(error, { action: 'logout' });
      
      // Track logout error
      performanceMonitor.trackError(
        'logout_error',
        error instanceof Error ? error.message : 'Logout failed',
        'auth_context',
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      // Clear user info in performance monitor
      performanceMonitor.setUserInfo(undefined, undefined);
      clearAuthState();
    }
  };

  // Check if session is about to expire
  const isSessionExpiring = useCallback(() => {
    if (!sessionExpiry) return false;
    
    const expiryTime = sessionExpiry.getTime();
    const now = Date.now();
    
    // Return true if less than 5 minutes until expiry
    return expiryTime - now < TOKEN_REFRESH_THRESHOLD_MS;
  }, [sessionExpiry]);

  // Value object for context
  const value: AuthContextType = {
    isAuthenticated,
    bucketName,
    userId,
    login,
    logout,
    isLoading,
    sessionExpiry,
    isSessionExpiring,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};