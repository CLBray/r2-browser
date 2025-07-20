// Shared test utilities for authentication testing

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthContext, type AuthContextType } from '../../contexts/auth';
import type { R2Credentials, AuthSession, ApiResponse } from '../../types';

// Mock AuthContext Provider for testing
interface AuthTestProviderProps {
  children: React.ReactNode;
  initialState?: Partial<AuthContextType>;
  mockApiResponses?: MockApiResponses;
}

export interface MockApiResponses {
  login?: { success: boolean; data?: AuthSession; error?: string; message?: string };
  verify?: { valid: boolean; bucketName?: string; userId?: string; expiresAt?: number };
  logout?: { success: boolean };
  refresh?: { token: string; expiresAt: number };
}

// Create a mock AuthContext provider for testing
export const AuthTestProvider: React.FC<AuthTestProviderProps> = ({ 
  children, 
  initialState = {},
  mockApiResponses = {}
}) => {
  const defaultAuthState: AuthContextType = {
    isAuthenticated: false,
    bucketName: null,
    userId: null,
    login: vi.fn().mockResolvedValue({
      token: 'mock-token',
      expiresAt: Date.now() + 3600000,
      bucketName: 'test-bucket',
      userId: 'test-user'
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    sessionExpiry: null,
    isSessionExpiring: vi.fn().mockReturnValue(false),
    ...initialState
  };

  return (
    <AuthContext.Provider value={defaultAuthState}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom render function that includes AuthProvider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: Partial<AuthContextType>;
  mockApiResponses?: MockApiResponses;
  withAuthProvider?: boolean;
}

export const renderWithAuth = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { 
    authState, 
    mockApiResponses, 
    withAuthProvider = true,
    ...renderOptions 
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (withAuthProvider) {
      return (
        <AuthTestProvider 
          initialState={authState} 
          mockApiResponses={mockApiResponses}
        >
          {children}
        </AuthTestProvider>
      );
    }
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper function to create mock credentials
export const createMockCredentials = (overrides: Partial<R2Credentials> = {}): R2Credentials => ({
  accountId: 'test-account-id',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  bucketName: 'test-bucket',
  ...overrides
});

// Helper function to create mock auth session
export const createMockAuthSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  token: 'mock-jwt-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  bucketName: 'test-bucket',
  userId: 'test-user-id',
  ...overrides
});

// Helper function to create mock API response
export const createMockApiResponse = <T,>(
  data?: T, 
  success: boolean = true, 
  error?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message: error
});

// Helper to wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to advance timers and flush promises
export const advanceTimersAndFlush = async (ms: number = 0) => {
  if (ms > 0) {
    vi.advanceTimersByTime(ms);
  }
  await waitForAsync();
};

// Helper to create a mock timer
export const createMockTimer = () => {
  const timer = {
    id: Math.random(),
    callback: vi.fn(),
    delay: 0,
    cleared: false
  };
  
  return {
    ...timer,
    clear: () => { timer.cleared = true; }
  };
};

// Helper to verify auth state transitions
export const verifyAuthStateTransition = (
  mockFn: any,
  expectedCalls: Array<{ args?: any[]; returnValue?: any }>
) => {
  expectedCalls.forEach((call, index) => {
    if (call.args) {
      expect(mockFn).toHaveBeenNthCalledWith(index + 1, ...call.args);
    }
    if (call.returnValue !== undefined) {
      expect(mockFn).toHaveNthReturnedWith(index + 1, call.returnValue);
    }
  });
};

// Helper to create authentication test scenarios
export interface AuthTestScenario {
  name: string;
  description: string;
  setup: () => void | Promise<void>;
  execute: () => void | Promise<void>;
  verify: () => void | Promise<void>;
  cleanup: () => void | Promise<void>;
}

export const createAuthTestScenario = (scenario: AuthTestScenario): AuthTestScenario => scenario;

// Helper to mock console methods for testing
export const mockConsole = () => {
  const originalConsole = { ...console };
  const mocks = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  };

  beforeEach(() => {
    Object.assign(console, mocks);
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    Object.values(mocks).forEach(mock => mock.mockClear());
  });

  return mocks;
};

// Helper to create performance monitoring mocks
export const createPerformanceMocks = () => {
  const originalPerformance = global.performance;
  let mockTime = 0;

  const mockPerformance = {
    now: vi.fn(() => mockTime),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  };

  beforeEach(() => {
    global.performance = mockPerformance as any;
    mockTime = 0;
  });

  afterEach(() => {
    global.performance = originalPerformance;
    Object.values(mockPerformance).forEach(mock => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear();
      }
    });
  });

  return {
    ...mockPerformance,
    advanceTime: (ms: number) => { mockTime += ms; }
  };
};