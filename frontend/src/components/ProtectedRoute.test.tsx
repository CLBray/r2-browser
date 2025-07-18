import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('shows loading state while checking authentication', () => {
    // Mock loading state
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isSessionExpiring: () => false,
      sessionExpiry: null
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    // Should show loading indicator
    expect(screen.getByText('Verifying your session...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('redirects to login if not authenticated', () => {
    // Mock unauthenticated state
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isSessionExpiring: () => false,
      sessionExpiry: null
    });
    
    // Use memory router with a route configuration to test navigation
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to login page
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('renders children if authenticated', () => {
    // Mock authenticated state
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSessionExpiring: () => false,
      sessionExpiry: new Date(Date.now() + 3600000)
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    // Should render protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
  
  it('uses custom redirect path if provided', () => {
    // Mock unauthenticated state
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isSessionExpiring: () => false,
      sessionExpiry: null
    });
    
    // Use memory router with a route configuration to test navigation
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/custom-login" element={<div>Custom Login Page</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute redirectPath="/custom-login">
                <div>Protected Content</div>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
    
    // Should redirect to custom login page
    expect(screen.getByText('Custom Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});