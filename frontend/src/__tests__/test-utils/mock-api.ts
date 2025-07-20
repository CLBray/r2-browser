// Mock API client implementation for testing

import { vi } from 'vitest';
import type { 
  R2Credentials, 
  AuthSession, 
  ApiResponse, 
  DirectoryListing,
  ApiError 
} from '../../types';
import { ErrorCode } from '../../utils/error-handler';

export interface MockApiClientConfig {
  // Authentication responses
  loginResponse?: ApiResponse<AuthSession> | Error;
  verifyResponse?: { valid: boolean; bucketName?: string; userId?: string; expiresAt?: number } | Error;
  refreshResponse?: { token: string; expiresAt: number } | Error;
  logoutResponse?: { success: boolean } | Error;
  
  // File operation responses
  listFilesResponse?: DirectoryListing | Error;
  uploadFilesResponse?: { uploaded: string[]; errors: string[] } | Error;
  downloadFileResponse?: Blob | Error;
  deleteFileResponse?: { success: boolean; message: string } | Error;
  renameFileResponse?: { success: boolean; message: string } | Error;
  createFolderResponse?: { success: boolean; message: string } | Error;
  
  // Network simulation
  networkDelay?: number;
  networkFailure?: boolean;
  networkFailureCount?: number;
  
  // Request tracking
  trackRequests?: boolean;
}

export class MockApiClient {
  private config: MockApiClientConfig;
  private token: string | null = null;
  private requestCount = 0;
  private networkFailureAttempts = 0;
  
  // Request tracking
  public requests: Array<{
    method: string;
    endpoint: string;
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
  }> = [];

  constructor(config: MockApiClientConfig = {}) {
    this.config = config;
  }

  // Update configuration
  updateConfig(newConfig: Partial<MockApiClientConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset mock state
  reset() {
    this.token = null;
    this.requestCount = 0;
    this.networkFailureAttempts = 0;
    this.requests = [];
  }

  // Token management
  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  // Private helper to simulate network conditions
  private async simulateNetwork<T>(response: T | Error): Promise<T> {
    this.requestCount++;
    
    // Simulate network delay
    if (this.config.networkDelay && this.config.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.networkDelay));
    }
    
    // Simulate network failures
    if (this.config.networkFailure) {
      const maxFailures = this.config.networkFailureCount || 1;
      if (this.networkFailureAttempts < maxFailures) {
        this.networkFailureAttempts++;
        throw new Error('Network error: Connection failed');
      }
    }
    
    // Return error if configured
    if (response instanceof Error) {
      throw response;
    }
    
    return response;
  }

  // Private helper to track requests
  private trackRequest(method: string, endpoint: string, body?: any, headers?: Record<string, string>) {
    if (this.config.trackRequests) {
      this.requests.push({
        method,
        endpoint,
        body,
        headers,
        timestamp: Date.now()
      });
    }
  }

  // Authentication methods
  async login(credentials: R2Credentials): Promise<ApiResponse<AuthSession>> {
    this.trackRequest('POST', '/api/auth/login', credentials);
    
    const defaultResponse: ApiResponse<AuthSession> = {
      success: true,
      data: {
        token: 'mock-jwt-token-' + Date.now(),
        expiresAt: Date.now() + 3600000,
        bucketName: credentials.bucketName,
        userId: 'mock-user-' + credentials.accountId
      }
    };
    
    return this.simulateNetwork(this.config.loginResponse || defaultResponse);
  }

  async verify(): Promise<{ valid: boolean; bucketName?: string; userId?: string; expiresAt?: number }> {
    this.trackRequest('POST', '/api/auth/verify');
    
    const defaultResponse = {
      valid: !!this.token,
      bucketName: this.token ? 'test-bucket' : undefined,
      userId: this.token ? 'test-user' : undefined,
      expiresAt: this.token ? Date.now() + 3600000 : undefined
    };
    
    return this.simulateNetwork(this.config.verifyResponse || defaultResponse);
  }

  async refreshToken(): Promise<{ token: string; expiresAt: number }> {
    this.trackRequest('POST', '/api/auth/refresh');
    
    const defaultResponse = {
      token: 'refreshed-token-' + Date.now(),
      expiresAt: Date.now() + 3600000
    };
    
    return this.simulateNetwork(this.config.refreshResponse || defaultResponse);
  }

  async logout(): Promise<{ success: boolean }> {
    this.trackRequest('POST', '/api/auth/logout');
    
    const defaultResponse = { success: true };
    
    return this.simulateNetwork(this.config.logoutResponse || defaultResponse);
  }

  // File operation methods (basic implementations for completeness)
  async listFiles(path: string = '', prefix: string = ''): Promise<DirectoryListing> {
    this.trackRequest('GET', `/api/files?path=${path}&prefix=${prefix}`);
    
    const defaultResponse: DirectoryListing = {
      objects: [],
      folders: [],
      currentPath: path,
      hasMore: false
    };
    
    return this.simulateNetwork(this.config.listFilesResponse || defaultResponse);
  }

  async uploadFiles(files: File[], path: string = ''): Promise<{ uploaded: string[]; errors: string[] }> {
    this.trackRequest('POST', '/api/files/upload', { fileCount: files.length, path });
    
    const defaultResponse = {
      uploaded: files.map(f => f.name),
      errors: []
    };
    
    return this.simulateNetwork(this.config.uploadFilesResponse || defaultResponse);
  }

  async downloadFile(key: string, onProgress?: (loaded: number, total: number) => void): Promise<Blob> {
    this.trackRequest('GET', `/api/files/${key}`);
    
    const defaultResponse = new Blob(['mock file content'], { type: 'text/plain' });
    
    // Simulate progress if callback provided
    if (onProgress) {
      setTimeout(() => onProgress(50, 100), 10);
      setTimeout(() => onProgress(100, 100), 20);
    }
    
    return this.simulateNetwork(this.config.downloadFileResponse || defaultResponse);
  }

  async downloadFileWithRange(key: string, start: number, end?: number): Promise<{ blob: Blob; contentRange: string | null }> {
    this.trackRequest('GET', `/api/files/${key}`, { range: `${start}-${end || ''}` });
    
    const defaultResponse = {
      blob: new Blob(['partial content'], { type: 'text/plain' }),
      contentRange: `bytes ${start}-${end || start + 100}/1000`
    };
    
    return this.simulateNetwork(defaultResponse);
  }

  async deleteFile(key: string): Promise<{ success: boolean; message: string }> {
    this.trackRequest('DELETE', `/api/files?key=${key}`);
    
    const defaultResponse = {
      success: true,
      message: 'File deleted successfully'
    };
    
    return this.simulateNetwork(this.config.deleteFileResponse || defaultResponse);
  }

  async renameFile(oldKey: string, newKey: string): Promise<{ success: boolean; message: string }> {
    this.trackRequest('PUT', '/api/files/rename', { oldKey, newKey });
    
    const defaultResponse = {
      success: true,
      message: 'File renamed successfully'
    };
    
    return this.simulateNetwork(this.config.renameFileResponse || defaultResponse);
  }

  async createFolder(path: string, name: string): Promise<{ success: boolean; message: string }> {
    this.trackRequest('POST', '/api/files/folder', { path, name });
    
    const defaultResponse = {
      success: true,
      message: 'Folder created successfully'
    };
    
    return this.simulateNetwork(this.config.createFolderResponse || defaultResponse);
  }

  // Helper methods for testing
  getRequestCount(): number {
    return this.requestCount;
  }

  getRequests(): typeof this.requests {
    return [...this.requests];
  }

  getLastRequest() {
    return this.requests[this.requests.length - 1];
  }

  hasBeenCalledWith(method: string, endpoint: string): boolean {
    return this.requests.some(req => req.method === method && req.endpoint === endpoint);
  }
}

// Factory function to create mock API client
export const createMockApiClient = (config: MockApiClientConfig = {}): MockApiClient => {
  return new MockApiClient(config);
};

// Helper to create common error responses
export const createApiError = (
  message: string, 
  code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  httpStatus: number = 500
): ApiError => ({
  error: message,
  code,
  httpStatus
});

// Helper to create authentication errors
export const createAuthError = (type: 'invalid_credentials' | 'expired_token' | 'unauthorized' = 'unauthorized'): ApiError => {
  switch (type) {
    case 'invalid_credentials':
      return createApiError('Invalid credentials provided', ErrorCode.INVALID_CREDENTIALS, 401);
    case 'expired_token':
      return createApiError('Token has expired', ErrorCode.UNAUTHORIZED, 401);
    case 'unauthorized':
    default:
      return createApiError('Unauthorized access', ErrorCode.UNAUTHORIZED, 401);
  }
};

// Helper to create network errors
export const createNetworkError = (message: string = 'Network request failed'): Error => {
  const error = new Error(message);
  error.name = 'NetworkError';
  return error;
};

// Vitest mock factory for apiClient
export const createApiClientMock = (config: MockApiClientConfig = {}) => {
  const mockClient = createMockApiClient(config);
  
  const mockApi = {
    setToken: vi.fn().mockImplementation((token: string) => mockClient.setToken(token)),
    clearToken: vi.fn().mockImplementation(() => mockClient.clearToken()),
    getToken: vi.fn().mockImplementation(() => mockClient.getToken()),
    login: vi.fn().mockImplementation((creds: R2Credentials) => mockClient.login(creds)),
    verify: vi.fn().mockImplementation(() => mockClient.verify()),
    refreshToken: vi.fn().mockImplementation(() => mockClient.refreshToken()),
    logout: vi.fn().mockImplementation(() => mockClient.logout()),
    listFiles: vi.fn().mockImplementation((path?: string, prefix?: string) => mockClient.listFiles(path, prefix)),
    uploadFiles: vi.fn().mockImplementation((files: File[], path?: string) => mockClient.uploadFiles(files, path)),
    downloadFile: vi.fn().mockImplementation((key: string, onProgress?: any) => mockClient.downloadFile(key, onProgress)),
    downloadFileWithRange: vi.fn().mockImplementation((key: string, start: number, end?: number) => mockClient.downloadFileWithRange(key, start, end)),
    deleteFile: vi.fn().mockImplementation((key: string) => mockClient.deleteFile(key)),
    renameFile: vi.fn().mockImplementation((oldKey: string, newKey: string) => mockClient.renameFile(oldKey, newKey)),
    createFolder: vi.fn().mockImplementation((path: string, name: string) => mockClient.createFolder(path, name)),
    
    // Test helpers
    _mockClient: mockClient,
    _reset: () => mockClient.reset(),
    _updateConfig: (newConfig: Partial<MockApiClientConfig>) => mockClient.updateConfig(newConfig),
    _getRequestCount: () => mockClient.getRequestCount(),
    _getRequests: () => mockClient.getRequests(),
    _getLastRequest: () => mockClient.getLastRequest()
  };

  return mockApi;
};