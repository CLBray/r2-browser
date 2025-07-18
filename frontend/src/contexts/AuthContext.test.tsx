import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { AuthContext } from './auth';
import { apiClient } from '../services/api';
import { performanceMonitor } from '../utils/performance-monitor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(),
    login: vi.fn(),
    verify: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn()
  }
}));

// Mock the performance monitor
vi.mock('../utils/performance-monitor', () => ({
  performanceMonitor: {
    init: vi.fn(),
    destroy: vi.fn(),
    setUserInfo: vi.fn(),
    trackPageLoad: vi.fn(),
    trackUserInteraction: vi.fn(),
    trackFileOperation: vi.fn(),
    trackApiRequest: vi.fn(),
    trackError: vi.fn()
  }
}));

// Test component that consumes the auth context
const TestComponent = () => {
  const auth = React.useContext(AuthContext);
  
  if (!auth) {
    return <div>No auth context</div>;
  }
  
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="loading-status">
        {auth.isLoading ? 'Loading' : 'Not loading'}
      </div>
      <div data-testid="bucket-name">
        {auth.bucketName || 'No bucket'}
      </div>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('provides initial unauthenticated state', async () => {
    (apiClient.verify as any).mockResolvedValue({ valid: false });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Skip checking loading state since it might be too fast
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
    });
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    expect(screen.getByTestId('bucket-name')).toHaveTextContent('No bucket');
  });
  
  it('restores session from localStorage', async () => {
    // Setup localStorage with token
    localStorage.setItem('r2_explorer_auth_token', 'test-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() + 3600000).toString());
    
    // Mock verify to return valid session
    (apiClient.verify as any).mockResolvedValue({
      valid: true,
      bucketName: 'test-bucket',
      userId: 'test-user',
      expiresAt: Date.now() + 3600000
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should set token in API client
    expect(apiClient.setToken).toHaveBeenCalledWith('test-token');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
    });
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('bucket-name')).toHaveTextContent('test-bucket');
  });
  
  it('handles expired token in localStorage', async () => {
    // Setup localStorage with expired token
    localStorage.setItem('r2_explorer_auth_token', 'expired-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() - 3600000).toString());
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
    });
    
    // Should clear token and show unauthenticated state
    expect(apiClient.clearToken).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });
  
  it('handles invalid token verification', async () => {
    // Setup localStorage with token
    localStorage.setItem('r2_explorer_auth_token', 'invalid-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() + 3600000).toString());
    
    // Mock verify to return invalid session
    (apiClient.verify as any).mockResolvedValue({ valid: false });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
    });
    
    // Should clear token and show unauthenticated state
    expect(apiClient.clearToken).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });
  
  it('handles verification error', async () => {
    // Setup localStorage with token
    localStorage.setItem('r2_explorer_auth_token', 'error-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() + 3600000).toString());
    
    // Mock verify to throw error
    (apiClient.verify as any).mockRejectedValue(new Error('Verification failed'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-status')).toHaveTextContent('Not loading');
    });
    
    // Should clear token and show unauthenticated state
    expect(apiClient.clearToken).toHaveBeenCalled();
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });
  
  it('handles logout', async () => {
    // Setup authenticated state
    localStorage.setItem('r2_explorer_auth_token', 'test-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() + 3600000).toString());
    
    (apiClient.verify as any).mockResolvedValue({
      valid: true,
      bucketName: 'test-bucket'
    });
    
    (apiClient.logout as any).mockResolvedValue({ success: true });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    
    // Trigger logout
    screen.getByText('Logout').click();
    
    await waitFor(() => {
      expect(apiClient.logout).toHaveBeenCalled();
      expect(apiClient.clearToken).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });
  
  it('handles logout error gracefully', async () => {
    // Setup authenticated state
    localStorage.setItem('r2_explorer_auth_token', 'test-token');
    localStorage.setItem('r2_explorer_auth_expiry', (Date.now() + 3600000).toString());
    
    (apiClient.verify as any).mockResolvedValue({
      valid: true,
      bucketName: 'test-bucket'
    });
    
    // Mock logout to throw error
    (apiClient.logout as any).mockRejectedValue(new Error('Logout failed'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    
    // Trigger logout
    screen.getByText('Logout').click();
    
    await waitFor(() => {
      // Should still clear local state even if API call fails
      expect(apiClient.clearToken).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });
  
  it('sets up token refresh timer', async () => {
    // Setup authenticated state with token that expires in 10 minutes
    const expiryTime = Date.now() + 10 * 60 * 1000;
    localStorage.setItem('r2_explorer_auth_token', 'test-token');
    localStorage.setItem('r2_explorer_auth_expiry', expiryTime.toString());
    
    (apiClient.verify as any).mockResolvedValue({
      valid: true,
      bucketName: 'test-bucket',
      expiresAt: expiryTime
    });
    
    (apiClient.refreshToken as any).mockResolvedValue({
      token: 'new-token',
      expiresAt: expiryTime + 3600000
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });
    
    // Fast-forward time to just before refresh (5 minutes before expiry)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    
    // Token refresh should be triggered
    await waitFor(() => {
      expect(apiClient.refreshToken).toHaveBeenCalled();
      expect(apiClient.setToken).toHaveBeenCalledWith('new-token');
    });
  });
});