// Test data fixtures for authentication scenarios

import type { R2Credentials, AuthSession, ApiResponse, ApiError } from '../../types';
import { ErrorCode } from '../../utils/error-handler';

// Mock credentials for different test scenarios
export const mockCredentials = {
  valid: {
    accountId: 'test-account-123',
    accessKeyId: 'AKIATEST123456789',
    secretAccessKey: 'test-secret-key-abcdef123456789',
    bucketName: 'test-bucket-valid'
  } as R2Credentials,

  invalid: {
    accountId: 'invalid-account',
    accessKeyId: 'INVALID_KEY',
    secretAccessKey: 'invalid-secret',
    bucketName: 'invalid-bucket'
  } as R2Credentials,

  malformed: {
    accountId: '',
    accessKeyId: 'short',
    secretAccessKey: '',
    bucketName: 'bucket with spaces'
  } as R2Credentials,

  expired: {
    accountId: 'expired-account',
    accessKeyId: 'AKIAEXPIRED123456',
    secretAccessKey: 'expired-secret-key',
    bucketName: 'expired-bucket'
  } as R2Credentials,

  rateLimited: {
    accountId: 'rate-limited-account',
    accessKeyId: 'AKIARATELIMITED123',
    secretAccessKey: 'rate-limited-secret',
    bucketName: 'rate-limited-bucket'
  } as R2Credentials
};

// Mock authentication sessions
export const mockSessions = {
  valid: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJidWNrZXQiOiJ0ZXN0LWJ1Y2tldCIsImV4cCI6OTk5OTk5OTk5OX0.test-signature',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    bucketName: 'test-bucket-valid',
    userId: 'test-user-123'
  } as AuthSession,

  expired: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJidWNrZXQiOiJ0ZXN0LWJ1Y2tldCIsImV4cCI6MTAwMDAwMDAwMH0.expired-signature',
    expiresAt: Date.now() - 3600000, // 1 hour ago
    bucketName: 'test-bucket-expired',
    userId: 'test-user-expired'
  } as AuthSession,

  expiringSoon: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJidWNrZXQiOiJ0ZXN0LWJ1Y2tldCIsImV4cCI6MTAwMDAwMDAwMH0.expiring-signature',
    expiresAt: Date.now() + 240000, // 4 minutes from now (less than 5 minute threshold)
    bucketName: 'test-bucket-expiring',
    userId: 'test-user-expiring'
  } as AuthSession,

  refreshed: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJidWNrZXQiOiJ0ZXN0LWJ1Y2tldCIsImV4cCI6OTk5OTk5OTk5OX0.refreshed-signature',
    expiresAt: Date.now() + 7200000, // 2 hours from now
    bucketName: 'test-bucket-refreshed',
    userId: 'test-user-refreshed'
  } as AuthSession,

  malformed: {
    token: 'invalid.jwt.token',
    expiresAt: Date.now() + 3600000,
    bucketName: 'test-bucket-malformed',
    userId: 'test-user-malformed'
  } as AuthSession
};

// Mock API responses for different scenarios
export const mockApiResponses = {
  login: {
    success: {
      success: true,
      data: mockSessions.valid
    } as ApiResponse<AuthSession>,

    invalidCredentials: {
      success: false,
      error: 'Invalid credentials provided',
      message: 'The provided access key or secret key is incorrect'
    } as ApiResponse<AuthSession>,

    accountNotFound: {
      success: false,
      error: 'Account not found',
      message: 'The specified account ID does not exist'
    } as ApiResponse<AuthSession>,

    bucketNotFound: {
      success: false,
      error: 'Bucket not found',
      message: 'The specified bucket does not exist or is not accessible'
    } as ApiResponse<AuthSession>,

    rateLimited: {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many authentication attempts. Please try again later'
    } as ApiResponse<AuthSession>,

    serverError: {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during authentication'
    } as ApiResponse<AuthSession>
  },

  verify: {
    valid: {
      valid: true,
      bucketName: 'test-bucket-valid',
      userId: 'test-user-123',
      expiresAt: Date.now() + 3600000
    },

    invalid: {
      valid: false
    },

    expired: {
      valid: false,
      error: 'Token has expired'
    },

    malformed: {
      valid: false,
      error: 'Invalid token format'
    }
  },

  refresh: {
    success: {
      token: mockSessions.refreshed.token,
      expiresAt: mockSessions.refreshed.expiresAt
    },

    failed: {
      error: 'Token refresh failed',
      message: 'Unable to refresh the authentication token'
    }
  },

  logout: {
    success: {
      success: true
    },

    failed: {
      success: false,
      error: 'Logout failed'
    }
  }
};

// Mock API errors for different scenarios
export const mockApiErrors = {
  networkError: {
    error: 'Network request failed',
    code: ErrorCode.NETWORK_ERROR,
    httpStatus: 0
  } as ApiError,

  unauthorized: {
    error: 'Unauthorized access',
    code: ErrorCode.UNAUTHORIZED,
    httpStatus: 401
  } as ApiError,

  forbidden: {
    error: 'Access forbidden',
    code: ErrorCode.FORBIDDEN,
    httpStatus: 403
  } as ApiError,

  invalidCredentials: {
    error: 'Invalid credentials provided',
    code: ErrorCode.INVALID_CREDENTIALS,
    httpStatus: 401
  } as ApiError,

  rateLimited: {
    error: 'Rate limit exceeded',
    code: ErrorCode.RATE_LIMITED,
    httpStatus: 429
  } as ApiError,

  serverError: {
    error: 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
    httpStatus: 500
  } as ApiError,

  serviceUnavailable: {
    error: 'Service temporarily unavailable',
    code: ErrorCode.SERVICE_UNAVAILABLE,
    httpStatus: 503
  } as ApiError,

  timeout: {
    error: 'Request timeout',
    code: ErrorCode.TIMEOUT,
    httpStatus: 504
  } as ApiError
};

// localStorage data for different scenarios
export const mockLocalStorageData = {
  validSession: {
    'r2_explorer_auth_token': mockSessions.valid.token,
    'r2_explorer_auth_expiry': mockSessions.valid.expiresAt.toString()
  },

  expiredSession: {
    'r2_explorer_auth_token': mockSessions.expired.token,
    'r2_explorer_auth_expiry': mockSessions.expired.expiresAt.toString()
  },

  expiringSoonSession: {
    'r2_explorer_auth_token': mockSessions.expiringSoon.token,
    'r2_explorer_auth_expiry': mockSessions.expiringSoon.expiresAt.toString()
  },

  malformedSession: {
    'r2_explorer_auth_token': mockSessions.malformed.token,
    'r2_explorer_auth_expiry': 'invalid-timestamp'
  },

  partialSession: {
    'r2_explorer_auth_token': mockSessions.valid.token
    // Missing expiry
  },

  empty: {}
};

// Test scenarios for comprehensive testing
export interface AuthTestScenario {
  name: string;
  description: string;
  credentials?: R2Credentials;
  initialStorage?: Record<string, string>;
  apiResponses?: {
    login?: any;
    verify?: any;
    refresh?: any;
    logout?: any;
  };
  networkConditions?: {
    delay?: number;
    failure?: boolean;
    failureCount?: number;
  };
  expectedOutcome: {
    authenticated?: boolean;
    error?: string;
    redirectTo?: string;
    storageCleared?: boolean;
    timerSet?: boolean;
  };
}

export const authTestScenarios: AuthTestScenario[] = [
  {
    name: 'successful_login',
    description: 'User logs in with valid credentials',
    credentials: mockCredentials.valid,
    apiResponses: {
      login: mockApiResponses.login.success
    },
    expectedOutcome: {
      authenticated: true,
      timerSet: true
    }
  },
  {
    name: 'invalid_credentials_login',
    description: 'User attempts login with invalid credentials',
    credentials: mockCredentials.invalid,
    apiResponses: {
      login: mockApiResponses.login.invalidCredentials
    },
    expectedOutcome: {
      authenticated: false,
      error: 'Invalid credentials provided'
    }
  },
  {
    name: 'existing_valid_session',
    description: 'User has existing valid session in localStorage',
    initialStorage: mockLocalStorageData.validSession,
    apiResponses: {
      verify: mockApiResponses.verify.valid
    },
    expectedOutcome: {
      authenticated: true,
      timerSet: true
    }
  },
  {
    name: 'existing_expired_session',
    description: 'User has existing expired session in localStorage',
    initialStorage: mockLocalStorageData.expiredSession,
    expectedOutcome: {
      authenticated: false,
      storageCleared: true
    }
  },
  {
    name: 'session_verification_fails',
    description: 'Existing session fails server verification',
    initialStorage: mockLocalStorageData.validSession,
    apiResponses: {
      verify: mockApiResponses.verify.invalid
    },
    expectedOutcome: {
      authenticated: false,
      storageCleared: true
    }
  },
  {
    name: 'network_error_during_login',
    description: 'Network error occurs during login attempt',
    credentials: mockCredentials.valid,
    networkConditions: {
      failure: true,
      failureCount: 3
    },
    expectedOutcome: {
      authenticated: false,
      error: 'Network request failed'
    }
  },
  {
    name: 'successful_logout',
    description: 'User successfully logs out',
    initialStorage: mockLocalStorageData.validSession,
    apiResponses: {
      logout: mockApiResponses.logout.success
    },
    expectedOutcome: {
      authenticated: false,
      storageCleared: true
    }
  },
  {
    name: 'token_refresh_success',
    description: 'Token is successfully refreshed before expiry',
    initialStorage: mockLocalStorageData.expiringSoonSession,
    apiResponses: {
      verify: mockApiResponses.verify.valid,
      refresh: mockApiResponses.refresh.success
    },
    expectedOutcome: {
      authenticated: true,
      timerSet: true
    }
  },
  {
    name: 'token_refresh_failure',
    description: 'Token refresh fails and user is logged out',
    initialStorage: mockLocalStorageData.expiringSoonSession,
    apiResponses: {
      verify: mockApiResponses.verify.valid,
      refresh: mockApiErrors.unauthorized
    },
    expectedOutcome: {
      authenticated: false,
      storageCleared: true
    }
  },
  {
    name: 'malformed_storage_data',
    description: 'localStorage contains malformed authentication data',
    initialStorage: mockLocalStorageData.malformedSession,
    expectedOutcome: {
      authenticated: false,
      storageCleared: true
    }
  },
  {
    name: 'storage_unavailable',
    description: 'localStorage is unavailable or throws errors',
    credentials: mockCredentials.valid,
    apiResponses: {
      login: mockApiResponses.login.success
    },
    expectedOutcome: {
      authenticated: true // Should still work without storage
    }
  },
  {
    name: 'concurrent_auth_requests',
    description: 'Multiple authentication requests are made simultaneously',
    credentials: mockCredentials.valid,
    apiResponses: {
      login: mockApiResponses.login.success
    },
    expectedOutcome: {
      authenticated: true
    }
  },
  {
    name: 'component_unmount_during_auth',
    description: 'Component unmounts while authentication is in progress',
    credentials: mockCredentials.valid,
    networkConditions: {
      delay: 1000 // Slow response to allow unmount
    },
    apiResponses: {
      login: mockApiResponses.login.success
    },
    expectedOutcome: {
      authenticated: false // Component unmounted before completion
    }
  }
];

// Helper functions to create test data
export const createTestCredentials = (overrides: Partial<R2Credentials> = {}): R2Credentials => ({
  ...mockCredentials.valid,
  ...overrides
});

export const createTestSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  ...mockSessions.valid,
  ...overrides
});

export const createTestApiResponse = <T>(
  data?: T,
  success: boolean = true,
  error?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message: error
});

export const createTestApiError = (
  message: string,
  code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  httpStatus: number = 500
): ApiError => ({
  error: message,
  code,
  httpStatus
});

// Time-related test utilities
export const timeConstants = {
  HOUR_MS: 3600000,
  MINUTE_MS: 60000,
  SECOND_MS: 1000,
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes
  
  // Common time scenarios
  now: () => Date.now(),
  oneHourFromNow: () => Date.now() + 3600000,
  oneHourAgo: () => Date.now() - 3600000,
  fiveMinutesFromNow: () => Date.now() + 300000,
  fourMinutesFromNow: () => Date.now() + 240000, // Less than refresh threshold
  oneMinuteFromNow: () => Date.now() + 60000
};

// Performance test data
export const performanceThresholds = {
  AUTH_CONTEXT_INIT_MS: 100,
  SESSION_VERIFICATION_MS: 500,
  LOGIN_OPERATION_MS: 2000,
  LOGOUT_OPERATION_MS: 1000,
  TOKEN_REFRESH_MS: 1000
};